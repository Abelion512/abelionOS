import { describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "./passwordCrypto";

describe("passwordCrypto", () => {
  it("hash memakai format pbkdf2 dan tidak pernah menyimpan plaintext", async () => {
    const hashed = await hashSecret("rahasia-ku-12345");
    const parts = hashed.split(":");
    expect(parts[0]).toBe("pbkdf2-sha256");
    expect(Number(parts[1])).toBeGreaterThanOrEqual(100_000);
    expect(parts[2]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[3]).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toContain("rahasia-ku-12345");
  });

  it("menerima password benar dan menolak password salah", async () => {
    const hashed = await hashSecret("password-uji-2026");
    await expect(verifySecret("password-uji-2026", hashed)).resolves.toBe(true);
    await expect(verifySecret("password-uji-2027", hashed)).resolves.toBe(false);
    await expect(verifySecret("", hashed)).resolves.toBe(false);
  });

  it("memberi salt berbeda untuk password yang sama", async () => {
    const a = await hashSecret("password-uji-2026");
    const b = await hashSecret("password-uji-2026");
    expect(a).not.toBe(b);
    await expect(verifySecret("password-uji-2026", a)).resolves.toBe(true);
    await expect(verifySecret("password-uji-2026", b)).resolves.toBe(true);
  });

  it("menolak hash rusak, format asing, dan hash Scrypt lama tanpa melempar", async () => {
    await expect(verifySecret("apa saja", "")).resolves.toBe(false);
    await expect(verifySecret("apa saja", "pbkdf2-sha256:abc:zz:zz")).resolves.toBe(false);
    await expect(verifySecret("apa saja", "pbkdf2-sha256:210000:00:00")).resolves.toBe(false);
    await expect(verifySecret("apa saja", "scrypt-legacy:hash")).resolves.toBe(false);
    await expect(
      verifySecret("apa saja", `pbkdf2-sha256:210000:${"aa".repeat(16)}:${"bb".repeat(31)}`),
    ).resolves.toBe(false);
  });
});
