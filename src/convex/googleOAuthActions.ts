"use node";
// OAuth Google actions — signed state + PKCE + token exchange (AES-GCM).
// ponytail: file "use node" berisi actions saja; state disimpan via googleOAuthState.
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { GOOGLE_TOKEN_ENDPOINT, OAUTH_SCOPES, googleClientConfig } from "./googleOAuthConfig";
import { createPkcePair, encryptToken } from "./crypto";
import {
  createAuthState,
  consumeAuthState,
  upsertGoogleAccount,
  signGoogleState,
  verifyGoogleState,
} from "./googleOAuthState";
import { requireUserId } from "./mintdeskHelpers";

// Publik: dipanggil dari UI Connections via useAction — client Convex
// melampirkan token auth dan menerima {url} sebagai JSON tanpa CORS.
export const googleStartAction = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const { clientId, redirectUri } = googleClientConfig();
    const { verifier, challenge } = createPkcePair();
    const nonce = await ctx.runMutation(internal.googleOAuthState.createAuthState, {
      userId,
      verifier,
    });
    const state = await signGoogleState(String(userId), nonce);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return { url: url.toString() };
  },
});

// Internal: dipanggil dari http route /api/google/callback.
export const googleCallbackAction = internalAction({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, { code, state }): Promise<{ accountId: unknown; email: string }> => {
    const payload = await verifyGoogleState(state);
    const userId = payload.sub;
    const st = await ctx.runMutation(internal.googleOAuthState.consumeAuthState, {
      nonce: payload.nonce,
    });
    if (!st) throw new Error("state expired atau sudah dipakai");
    if (String(st.userId) !== String(userId)) throw new Error("state milik user lain");

    const cfg = googleClientConfig();
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
        code_verifier: st.verifier,
      }),
    });
    const tokens: any = await res.json();
    if (!res.ok || !tokens.access_token) {
      throw new Error("Token exchange gagal: " + (tokens.error ?? res.status));
    }

    // Identitas akun dari userinfo — sumber kebenaran untuk multi-account.
    const ures = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + tokens.access_token },
    });
    const userinfo: any = await ures.json();
    if (!ures.ok || !userinfo.email) throw new Error("Gagal mengambil identitas akun Google");

    const tokenCipher = encryptToken(
      JSON.stringify({
        refresh: tokens.refresh_token ?? "",
        access: tokens.access_token,
        expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      })
    );
    const scopes: string[] = tokens.scope ? tokens.scope.split(" ") : OAUTH_SCOPES;

    const accountId = await ctx.runMutation(internal.googleOAuthState.upsertGoogleAccount, {
      userId: userId as any,
      email: userinfo.email,
      label: userinfo.name ?? userinfo.email,
      scopes,
      tokenCipher,
    });

    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId: userId as any,
      action: "google.connect",
      status: "accepted",
      detail: "akun " + userinfo.email + " terhubung",
    });
    await ctx.runMutation(internal.mintdeskInternals.notifyFromAction, {
      userId: userId as any,
      category: "googleWorkspace",
      title: "Google terhubung",
      body: "Akun " + userinfo.email + " siap dipakai Daily Focus.",
    });
    return { accountId, email: userinfo.email as string };
  },
});
