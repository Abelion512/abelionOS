import { describe, expect, it } from "vitest";
import {
  PAIRING_CODE_LENGTH,
  WORKDIR_CANONICAL,
  describeHeartbeat,
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
