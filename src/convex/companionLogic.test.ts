import { describe, expect, it } from "vitest";
import {
  PAIRING_CODE_LENGTH,
  WORKDIR_CANONICAL,
  describeHeartbeat,
  evaluateClaim,
  generateDeviceSecret,
  generatePairingCode,
  isValidPairingCode,
  parseHeartbeatPayload,
  validateDeviceInput,
} from "./companionLogic";

describe("pairing code", () => {
  it("code yang di-generate 8 karakter dan lolos validator", () => {
    const code = generatePairingCode();
    expect(code.length).toBe(PAIRING_CODE_LENGTH);
    expect(isValidPairingCode(code)).toBe(true);
  });

  it("validator menolak panjang salah dan karakter ambigu (0/O, 1/I/L)", () => {
    expect(isValidPairingCode("ABC12345")).toBe(false); // mengandung 1
    expect(isValidPairingCode("ABCD234")).toBe(false); // 7 karakter
    expect(isValidPairingCode("ABCD23455")).toBe(false); // 9 karakter
    expect(isValidPairingCode("abCD2345")).toBe(false); // huruf kecil
    expect(isValidPairingCode("ABCD2345")).toBe(true);
    expect(isValidPairingCode("JKMNPQRW")).toBe(true); // tanpa I/L/O/0/1
  });
});

describe("device secret & input", () => {
  it("secret diawali kbd_ dan cukup panjang", () => {
    const s = generateDeviceSecret();
    expect(s.startsWith("kbd_")).toBe(true);
    expect(s.length).toBeGreaterThan(40);
  });

  it("nama divalidasi 1-40 karakter dan tipe terbatas", () => {
    expect(validateDeviceInput("Laptop Kantor ", "laptop")).toEqual({
      name: "Laptop Kantor",
      type: "laptop",
    });
    expect(() => validateDeviceInput("", "laptop")).toThrow(/1–40/);
    expect(() => validateDeviceInput("x".repeat(41), "laptop")).toThrow(/1–40/);
    expect(() => validateDeviceInput("ok", "router")).toThrow(/laptop atau server/);
  });
});

describe("claim guard (pairing code → device pending)", () => {
  const now = 1_000_000;
  const pending = { status: "pending", type: "laptop" };

  it("mengizinkan claim untuk device pending yang terikat ke code", () => {
    expect(
      evaluateClaim({
        codeFound: true,
        codeExpiresAt: now + 60_000,
        now,
        device: pending,
        requestedType: "laptop",
      })
    ).toEqual({ ok: true });
  });

  // Regresi 2026-09-27: registerDevice (browser) mengisi pairingCodes.deviceId,
  // dan guard lama memperlakukannya sebagai "code sudah dipakai" → claim selalu
  // 401 invalid_code pada alur 2 langkah yang didokumentasikan.
  it("device hasil registrasi tetap bisa di-claim (bukan dianggap code terpakai)", () => {
    const registered = evaluateClaim({
      codeFound: true,
      codeExpiresAt: now + 60_000,
      now,
      device: pending,
      requestedType: "laptop",
    });
    expect(registered.ok).toBe(true);
  });

  it("menolak code kadaluarsa/tidak ada sebagai invalid_code", () => {
    expect(
      evaluateClaim({ codeFound: false, codeExpiresAt: now, now, device: pending, requestedType: "laptop" })
    ).toMatchObject({ ok: false, code: "invalid_code" });
    expect(
      evaluateClaim({
        codeFound: true,
        codeExpiresAt: now - 1,
        now,
        device: pending,
        requestedType: "laptop",
      })
    ).toMatchObject({ ok: false, code: "invalid_code" });
  });

  it("menolak claim tanpa device terdaftar (Langkah 1 belum dijalankan)", () => {
    expect(
      evaluateClaim({
        codeFound: true,
        codeExpiresAt: now + 60_000,
        now,
        device: null,
        requestedType: "laptop",
      })
    ).toMatchObject({ ok: false, code: "no_pending_device" });
  });

  it("menolak code yang device-nya sudah aktif (single-use) dan tipe tak cocok", () => {
    expect(
      evaluateClaim({
        codeFound: true,
        codeExpiresAt: now + 60_000,
        now,
        device: { status: "active", type: "laptop" },
        requestedType: "laptop",
      })
    ).toMatchObject({ ok: false, code: "invalid_code" });
    expect(
      evaluateClaim({
        codeFound: true,
        codeExpiresAt: now + 60_000,
        now,
        device: { status: "pending", type: "server" },
        requestedType: "laptop",
      })
    ).toMatchObject({ ok: false, code: "no_pending_device" });
  });
});

describe("heartbeat payload allowlist", () => {
  const base = {
    uptimeS: 3600,
    load1: 0.5,
    load5: 0.4,
    load15: 0.3,
    workdir: { entries: 120, totalBytes: 5_000_000 },
    auditLocalCount: 3,
  };

  it("menerima payload persis allowlist", () => {
    expect(parseHeartbeatPayload(base)).toEqual(base);
  });

  it("menolak field di luar allowlist dan tipe salah (deny-by-default)", () => {
    // Field asing diabaikan diam (hanya field allowlist yang dibaca) — tetap
    // terdokumentasi; field allowlist yang RUSAK yang ditolak keras.
    expect(parseHeartbeatPayload({ ...base, extra: "x" })).toEqual(base);
    expect(() => parseHeartbeatPayload({ ...base, workdir: { entries: "banyak" } })).toThrow();
    expect(() => parseHeartbeatPayload({ ...base, load1: "tinggi" })).toThrow();
    expect(() => parseHeartbeatPayload("string")).toThrow(/objek/);
    expect(() => parseHeartbeatPayload(null)).toThrow(/objek/);
  });

  it("nilai di-clamp ke rentang masuk akal", () => {
    const clamped = parseHeartbeatPayload({
      ...base,
      load1: 5000,
      uptimeS: -10,
      workdir: { entries: 1e9, totalBytes: 1e18 },
    });
    expect(clamped.load1).toBe(1000);
    expect(clamped.uptimeS).toBe(0);
    expect(clamped.workdir.entries).toBeLessThanOrEqual(10_000_000);
    expect(clamped.workdir.totalBytes).toBeLessThanOrEqual(1e15);
  });

  it("describe hanya memuat agregat", () => {
    const d = describeHeartbeat(parseHeartbeatPayload(base));
    expect(d).toContain("60m");
    expect(d).toContain("workdir");
    expect(d).not.toMatch(/token|secret/i);
  });
});
