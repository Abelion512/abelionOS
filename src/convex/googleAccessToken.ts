"use node";
// Access token Google dari cipher tersimpan (AES-256-GCM), dengan refresh.
// ponytail: diekstrak agar googleTasks dan googleExecutor memakai satu jalur
// yang sama — tidak ada implementasi refresh kedua.
import { decryptToken } from "./crypto";
import { GOOGLE_TOKEN_ENDPOINT, googleClientConfig } from "./googleOAuthConfig";

export async function accessTokenFor(cipher: string): Promise<string> {
  const store = JSON.parse(decryptToken(cipher)) as { refresh: string; access: string; expiresAt: number };
  if (store.expiresAt && store.expiresAt > Date.now() + 30_000 && store.access) return store.access;
  if (!store.refresh) throw new Error("Tidak ada refresh token untuk akun ini");
  const cfg = googleClientConfig();
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: store.refresh,
      grant_type: "refresh_token",
    }),
  });
  const tokens: any = await res.json();
  if (!res.ok || !tokens.access_token) throw new Error("Refresh token Google gagal");
  return tokens.access_token;
}
