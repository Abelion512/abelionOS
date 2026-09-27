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
// terdaftar (read F3 + proposal F4), dedupe, urutan input dipertahankan.
// Menolak wildcard/string lain — allowlist tidak pernah bisa melebar ke luar
// capability registry.
export function normalizeAllowlist(raw: string[]): string[] {
  const known = [...PRODUCT_READ_CAPABILITIES, ...PRODUCT_PROPOSAL_CAPABILITIES] as readonly string[];
  const out: string[] = [];
  for (const c of raw) {
    if (!known.includes(c)) {
      throw new Error("Capability tidak dikenal: " + c);
    }
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

// Murni + testable: true bila request harus ditolak sementara. Interval
// opsional: default jeda read (2s); touchProposal memakai PROPOSAL_MIN_INTERVAL_MS.
export function isRateLimited(
  lastReadAt: number | undefined,
  now: number,
  minIntervalMs: number = READ_MIN_INTERVAL_MS
): boolean {
  return lastReadAt !== undefined && now - lastReadAt < minIntervalMs;
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

// ===== F4: capability proposal (write via antrean preview + confirm) =====
// Registry terpisah dari read (F3): produk hanya bisa MENGAJUKAN proposal —
// eksekusi tetap butuh konfirmasi manusia di Daily Focus (AGENTS.md human
// confirmation). gmail.trash sengaja tidak ditawarkan ke produk (destructive).
export const PRODUCT_PROPOSAL_CAPABILITIES = [
  "calendar.create.proposal",
  "task.create.proposal",
] as const;

export type ProductProposalCapability = (typeof PRODUCT_PROPOSAL_CAPABILITIES)[number];

// Jeda minimum antar pengajuan proposal per produk — write path lebih ketat
// daripada read (2s): satu proposal layak review per maksimal 5 detik.
export const PROPOSAL_MIN_INTERVAL_MS = 5_000;

export function proposalKindForCapability(
  capability: ProductProposalCapability
): "calendar.create" | "task.create" {
  switch (capability) {
    case "calendar.create.proposal":
      return "calendar.create";
    case "task.create.proposal":
      return "task.create";
  }
}

// Scope OAuth minimum yang harus dipegang koneksi aktif agar proposal ini
// bisa dieksekusi — harus persis REQUIRED_SCOPES di googleProposalSchema.
export function requiredGoogleScopeForProposal(capability: ProductProposalCapability): string {
  switch (capability) {
    case "calendar.create.proposal":
      return "https://www.googleapis.com/auth/calendar.events.owned";
    case "task.create.proposal":
      return "https://www.googleapis.com/auth/tasks";
  }
}

// deny-by-default untuk proposal: hanya capability registry F4 yang eksplisit
// ada di allowlist produk.
export function requireProposalCapability(
  allowlist: string[],
  requested: string
): asserts requested is ProductProposalCapability {
  if (!PRODUCT_PROPOSAL_CAPABILITIES.includes(requested as ProductProposalCapability)) {
    throw new Error("Capability tidak dikenal: " + requested);
  }
  if (!allowlist.includes(requested)) {
    throw new Error("Capability tidak diizinkan untuk produk ini");
  }
}
