import crypto from "node:crypto";
import { ENV } from "./_core/env";

function key() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for Daily Focus action encryption");
  return crypto.createHash("sha256").update(`${ENV.cookieSecret}:daily-focus-actions`).digest();
}

export function hashDeviceSecret(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function safeDeviceSecretEquals(expectedHash: string, candidate: string) {
  const candidateHash = hashDeviceSecret(candidate);
  return expectedHash.length === candidateHash.length && crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(candidateHash));
}

export function encryptActionInput(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptActionInput(value: string) {
  const [iv, authTag, encrypted] = value.split(".");
  if (!iv || !authTag || !encrypted) throw new Error("Action payload is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
