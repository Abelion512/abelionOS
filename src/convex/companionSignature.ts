"use node";
// Helper signature Ed25519 companion — dipanggil dari companionActions.ts.
// Laptop memegang private key; server hanya memverifikasi.
// ponytail: node:crypto verify sinkron — tanpa dependency.
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

// Hash identik dengan sha256Hex auditChain/products — code & secret companion
// disimpan hashed dengan algoritma yang sama.
export function sha256HexNode(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// Base64 (standar) dari DER SPKI public key — bentuk yang ditulis companion.
export function isValidPublicKeyBase64(raw: string): boolean {
  if (raw.length < 32 || raw.length > 800) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return false;
  try {
    return Buffer.from(raw, "base64").length >= 32;
  } catch {
    return false;
  }
}

// Verifikasi signature base64 atas pesan (pairing code atau nonce). Kunci
// publik berformat DER SPKI base64 seperti yang dihasilkan generateKeyPairSync
// ("der", { type: "spki" }) di sisi companion.
export function verifyPairingSignature(
  publicKeyB64: string,
  message: string,
  signatureB64: string
): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.from(publicKeyB64, "base64"),
      format: "der",
      type: "spki",
    });
    return cryptoVerify(
      null,
      Buffer.from(message, "utf8"),
      key,
      Buffer.from(signatureB64, "base64")
    );
  } catch {
    return false;
  }
}
