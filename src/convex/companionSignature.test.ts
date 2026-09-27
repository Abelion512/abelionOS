// Round-trip kontrak skrip laptop ↔ server: kunci publik yang dikirim
// companion/pair.ts harus lolos verifyPairingSignature. Regresi 2026-09-27:
// pair.ts menurunkan public key dengan `priv.export({ type: "spki" })` dari
// private KeyObject — Node & Bun melempar ERR_INVALID_ARG_VALUE, jadi pairing
// ulang (file kunci sudah ada) selalu gagal sebelum request dikirim.
import { describe, expect, it } from "vitest";
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { isValidPublicKeyBase64, verifyPairingSignature } from "./companionSignature";

const CODE = "ABCD2345";
const MESSAGE = "companion-claim:" + CODE;

/** Persis alur pair.ts: private key dipakai ulang dari file PEM lokal. */
function companionKeys() {
  const { privateKey } = generateKeyPairSync("ed25519");
  const priv = createPrivateKey(privateKey.export({ type: "pkcs8", format: "pem" }).toString());
  const pub = createPublicKey(priv).export({ type: "spki", format: "der" }).toString("base64");
  return { priv, pub };
}

describe("signature pairing companion", () => {
  it("kunci publik turunan createPublicKey lolos verifikasi server", () => {
    const { priv, pub } = companionKeys();
    expect(isValidPublicKeyBase64(pub)).toBe(true);
    const signature = sign(null, Buffer.from(MESSAGE, "utf8"), priv).toString("base64");
    expect(verifyPairingSignature(pub, MESSAGE, signature)).toBe(true);
  });

  it("jalur lama (export spki dari private KeyObject) ditolak platform", () => {
    const { priv } = companionKeys();
    expect(() => (priv as unknown as { export: (o: unknown) => Buffer }).export({
      type: "spki",
      format: "der",
    })).toThrow();
  });

  it("menolak code lain, signature kunci lain, dan kunci sampah", () => {
    const { priv, pub } = companionKeys();
    const other = companionKeys();
    const signature = sign(null, Buffer.from(MESSAGE, "utf8"), priv).toString("base64");
    const otherSignature = sign(null, Buffer.from(MESSAGE, "utf8"), other.priv).toString("base64");
    expect(verifyPairingSignature(pub, "companion-claim:ZZZZ9999", signature)).toBe(false);
    expect(verifyPairingSignature(pub, MESSAGE, otherSignature)).toBe(false);
    expect(verifyPairingSignature("bukan-base64!@#", MESSAGE, signature)).toBe(false);
  });
});
