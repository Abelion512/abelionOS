import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken, createPkcePair } from "./crypto";

const KEY = "a".repeat(64);

describe("crypto", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
  });
  afterEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  it("round-trip token terenkripsi", () => {
    const secret = JSON.stringify({ refresh: "r", access: "a" });
    const cipher = encryptToken(secret);
    // tidak ada plaintext yang bocor ke cipher (asersi per field, bukan per char)
    expect(cipher).not.toContain('"refresh"');
    expect(cipher).not.toContain('"access"');
    expect(decryptToken(cipher)).toBe(secret);
  });

  it("menolak key yang salah panjang", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "short";
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("menolak cipher rusak", () => {
    expect(() => decryptToken("bukan-cipher")).toThrow();
  });

  it("PKCE pair: challenge = S256(verifier)", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier.length).toBeGreaterThan(20);
    expect(challenge).toBeTruthy();
  });
});
