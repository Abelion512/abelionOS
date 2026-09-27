// Logika murni endpoint read produk klien (tanpa ctx Convex) — pola productLogic.
// Kontrak F3 (docs/PRODUCT-CONNECTION-DESIGN.md §4–5): allowlist deny-by-default,
// keluaran read dibatasi (window maks 7 hari, jumlah item terbatas), rate limit
// sederhana per produk mencegah loop klien bocor.
export const PRODUCT_READ_CAPABILITIES = [
  "calendar.read.list",
  "calendar.read.events",
] as const;

export type ProductReadCapability = (typeof PRODUCT_READ_CAPABILITIES)[number];

// Batas keluaran — bukan mirror penuh data Google (design doc §5 aturan 4).
export const MAX_EVENTS_WINDOW_DAYS = 7;
export const MAX_EVENTS_ITEMS = 25;

// Rate limit: jeda minimum antar-request read per produk.
export const READ_MIN_INTERVAL_MS = 2_000;

// Scope OAuth Google minimum yang harus dipegang koneksi aktif agar capability
// ini bisa dieksekusi (guard tambahan di atas allowlist produk).
export function requiredGoogleScope(capability: ProductReadCapability): string {
  switch (capability) {
    case "calendar.read.list":
      return "https://www.googleapis.com/auth/calendar.calendarlist.readonly";
    case "calendar.read.events":
      return "https://www.googleapis.com/auth/calendar.events.readonly";
  }
}

// deny-by-default: hanya capability yang eksplisit ada di allowlist produk.
export function requireCapability(
  allowlist: string[],
  requested: string
): asserts requested is ProductReadCapability {
  if (!PRODUCT_READ_CAPABILITIES.includes(requested as ProductReadCapability)) {
    throw new Error("Capability tidak dikenal: " + requested);
  }
  if (!allowlist.includes(requested)) {
    throw new Error("Capability tidak diizinkan untuk produk ini");
  }
}

export type EventsBounds = { timeMin: string; timeMax: string; maxResults: number };

// Normalisasi window events: clamp durasi maks 7 hari, batas item 25.
// timeMin/timeMax ISO 8601; bila timeMax lebih awal dari timeMin, window
// dibalik agar selalu menghasilkan rentang valid.
export function boundsForEvents(
  now: number,
  raw: { timeMin?: string; timeMax?: string }
): EventsBounds {
  const tMin = raw.timeMin ? Date.parse(raw.timeMin) : now;
  const tMax = raw.timeMax ? Date.parse(raw.timeMax) : now + MAX_EVENTS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (Number.isNaN(tMin) || Number.isNaN(tMax)) {
    throw new Error("timeMin/timeMax harus ISO 8601 valid");
  }
  const [lo, hi] = tMin <= tMax ? [tMin, tMax] : [tMax, tMin];
  const clampedHi = Math.min(hi, lo + MAX_EVENTS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { timeMin: new Date(lo).toISOString(), timeMax: new Date(clampedHi).toISOString(), maxResults: MAX_EVENTS_ITEMS };
}

// Validasi allowlist yang di-set owner (UI Settings): hanya capability
// terdaftar F3, dedupe, urutan input dipertahankan. Menolak wildcard/string lain
// — allowlist tidak pernah bisa melebar ke luar capability registry.
export function normalizeAllowlist(raw: string[]): string[] {
  const out: string[] = [];
  for (const c of raw) {
    if (!PRODUCT_READ_CAPABILITIES.includes(c as ProductReadCapability)) {
      throw new Error("Capability tidak dikenal: " + c);
    }
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

// Murni + testable: true bila request read harus ditolak sementara.
export function isRateLimited(lastReadAt: number | undefined, now: number): boolean {
  return lastReadAt !== undefined && now - lastReadAt < READ_MIN_INTERVAL_MS;
}

// ISO 8601 valid (dipakai http.ts untuk menolak window rusak dengan 400,
// sebelum action melempar). Date.parse menerima ISO date & datetime.
export function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

// Multi-account: kegagalan satu akun tidak boleh memblokir akun lain —
// pilih koneksi aktif pertama dari baris yang sudah dibaca (bounded),
// bukan baris pertama apa pun statusnya.
export function firstActiveAccount<T extends { status: string }>(rows: T[]): T | null {
  return rows.find((r) => r.status === "active") ?? null;
}
