// Logika murni companion + pairing (tanpa ctx Convex) — pola productLogic.
// Kontrak: docs/COMPANION-PAIRING-DESIGN.md (disetujui pemilik 2026-09-27).
// Capability companion TIDAK diperluas: health, workdir metadata agregat,
// audit-local count — tanpa nama file, proses, network, atau env vars.
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_TTL_MS = 10 * 60 * 1000;
// Batas code aktif per user (design §3): mencegah menumpuk code tak terpakai.
export const MAX_ACTIVE_PAIRING_CODES = 3;
// Workdir canonical — satu-satunya path yang boleh dilaporkan (AGENTS.md).
export const WORKDIR_CANONICAL = "/media/abelion/Isaf/ican/project";
// Heartbeat paling sering tiap 20 detik (polling outbound, bukan streaming).
export const HEARTBEAT_MIN_INTERVAL_MS = 20_000;

export type CompanionDeviceType = "laptop" | "server";

// Code 8 karakter tanpa karakter ambigu (0/O, 1/I/L) — diketik manual.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function isValidPairingCode(raw: string): boolean {
  return (
    raw.length === PAIRING_CODE_LENGTH &&
    /^[A-HJ-KM-NP-Z2-9]{8}$/.test(raw)
  );
}

export function generatePairingCode(): string {
  const bytes = new Uint8Array(PAIRING_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

// Device secret plaintext, prefix kbd_ (kembali sekali di claim, disimpan hash).
export function generateDeviceSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return "kbd_" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Nama device: 1–40 karakter setelah trim; deviceId diambil dari type saja
// karena satu device aktif per tipe (design §2).
export function validateDeviceInput(rawName: string, type: string): { name: string; type: CompanionDeviceType } {
  const name = rawName.trim();
  if (name.length < 1 || name.length > 40) {
    throw new Error("Nama device 1–40 karakter.");
  }
  if (type !== "laptop" && type !== "server") {
    throw new Error("Tipe device harus laptop atau server.");
  }
  return { name, type };
}

// Guard claim (murni, tanpa ctx). `pairingCodes.deviceId` diisi SAAT REGISTER
// (browser, Langkah 1), jadi field itu TIDAK menandai "code sudah dipakai" —
// regresi 2026-09-27: guard lama menolaknya dan membuat claim SELALU
// 401 invalid_code pada alur 2 langkah. Sumber kebenaran claim = device pending
// yang terikat ke code; yang menandai code terpakai adalah status device
// (pending → active), bukan field code.
export type ClaimGuardInput = {
  codeFound: boolean;
  codeExpiresAt: number;
  now: number;
  device: { status: string; type: string } | null;
  requestedType: string;
};

export type ClaimGuard =
  | { ok: true }
  | { ok: false; code: "invalid_code" | "no_pending_device"; error: string };

export function evaluateClaim(input: ClaimGuardInput): ClaimGuard {
  if (!input.codeFound || input.codeExpiresAt < input.now) {
    return {
      ok: false,
      code: "invalid_code",
      error: "Pairing code tidak valid atau kadaluarsa (TTL 10 menit)",
    };
  }
  if (!input.device) {
    return {
      ok: false,
      code: "no_pending_device",
      error:
        "Belum ada device terdaftar untuk code ini — daftarkan dulu di Settings → Companion (Langkah 1), lalu jalankan perintah ini",
    };
  }
  if (input.device.status !== "pending") {
    return { ok: false, code: "invalid_code", error: "Pairing code ini sudah dipakai device tersebut" };
  }
  if (input.device.type !== input.requestedType) {
    return {
      ok: false,
      code: "no_pending_device",
      error: `Device terdaftar bertipe ${input.device.type}, bukan ${input.requestedType}`,
    };
  }
  return { ok: true };
}

export type HeartbeatPayload = {
  uptimeS: number;
  load1: number;
  load5: number;
  load15: number;
  workdir: { entries: number; totalBytes: number };
  auditLocalCount: number;
};

// Allowlist payload heartbeat (design §4): hanya field agregat yang terdaftar.
// Nilai di-clamp ke rentang masuk akal; field di luar daftar ditolak (bukan
// diabaikan) agar companion bocor tidak lolos diam-diam.
export function parseHeartbeatPayload(raw: unknown): HeartbeatPayload {
  if (typeof raw !== "object" || raw === null) throw new Error("Payload heartbeat harus objek");
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number): number => {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Field numerik tidak valid");
    return Math.min(max, Math.max(min, v));
  };
  const wd = r.workdir;
  if (typeof wd !== "object" || wd === null) throw new Error("workdir wajib");
  const w = wd as Record<string, unknown>;
  return {
    uptimeS: num(r.uptimeS, 0, 10 * 365 * 24 * 3600),
    load1: num(r.load1, 0, 1000),
    load5: num(r.load5, 0, 1000),
    load15: num(r.load15, 0, 1000),
    workdir: {
      entries: num(w.entries, 0, 10_000_000),
      totalBytes: num(w.totalBytes, 0, 1e15),
    },
    auditLocalCount: num(r.auditLocalCount, 0, 1_000_000),
  };
}

// Ringkasan heartbeat → baris detail observasi (metadata saja, tanpa path
// selain workdir canonical).
export function describeHeartbeat(h: HeartbeatPayload): string {
  return (
    `uptime ${Math.round(h.uptimeS / 60)}m · load ${h.load1.toFixed(2)}/${h.load5.toFixed(2)}/${h.load15.toFixed(2)}` +
    ` · workdir ${h.workdir.entries} entri (${(h.workdir.totalBytes / 1024 / 1024).toFixed(1)} MB)` +
    ` · audit lokal ${h.auditLocalCount}`
  );
}
