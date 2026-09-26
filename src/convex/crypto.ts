"use node";
// Crypto helpers — hanya boleh diimpor oleh file "use node" (actions).
// ponytail: standar library — PKCE S256 + AES-256-GCM sesuai kontrak AGENTS.md.
import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY belum diisi (hex 64 karakter / 32 byte)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64url")).join(".");
}

export function decryptToken(cipher: string): string {
  const [ivB64, tagB64, dataB64] = cipher.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Format cipher tidak valid");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
