import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { createAuditEvent, upsertGoogleConnection } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const GOOGLE_STATE_COOKIE = "mintdesk_google_oauth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
];

type GoogleState = { state: string; userId: number; verifier: string; expiresAt: number };

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for Google OAuth state encryption");
  return crypto.createHash("sha256").update(ENV.cookieSecret).digest();
}

function signState(payload: GoogleState) {
  const encoded = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secretKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function parseState(value: string | undefined): GoogleState | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", secretKey()).update(encoded).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GoogleState;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptSecret(value: string) {
  const [ivText, tagText, cipherText] = value.split(".");
  if (!ivText || !tagText || !cipherText) throw new Error("Encrypted token payload is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(cipherText, "base64url")), decipher.final()]).toString("utf8");
}

export function decryptGoogleRefreshToken(value: string) {
  return decryptSecret(value);
}

function callbackUrl(req: Request) {
  const forwardedProtocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0]?.trim();
  const forwardedHost = req.headers["x-forwarded-host"]?.toString().split(",")[0]?.trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = forwardedHost || req.get("host");
  const isLocal = host === "localhost" || host?.startsWith("localhost:") || host === "127.0.0.1" || host?.startsWith("127.0.0.1:");
  if (!isLocal && ENV.googleOAuthRedirectUri) return ENV.googleOAuthRedirectUri;
  return `${protocol}://${host}/api/google/callback`;
}

function redirectHome(res: Response, status: string) {
  res.redirect(302, `/?google=${encodeURIComponent(status)}`);
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get("/api/google/start", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!ENV.googleOAuthClientId || !ENV.googleOAuthClientSecret) {
        redirectHome(res, "configuration_required");
        return;
      }

      const state = crypto.randomUUID();
      const verifier = crypto.randomBytes(48).toString("base64url");
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      const payload: GoogleState = { state, userId: user.id, verifier, expiresAt: Date.now() + 10 * 60_000 };
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(GOOGLE_STATE_COOKIE, signState(payload), { ...cookieOptions, httpOnly: true, maxAge: 10 * 60_000, sameSite: "lax" });

      const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizationUrl.searchParams.set("client_id", ENV.googleOAuthClientId);
      authorizationUrl.searchParams.set("redirect_uri", callbackUrl(req));
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("access_type", "offline");
      authorizationUrl.searchParams.set("prompt", "consent");
      authorizationUrl.searchParams.set("include_granted_scopes", "true");
      authorizationUrl.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("code_challenge", challenge);
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      res.redirect(302, authorizationUrl.toString());
    } catch (error) {
      console.error("[Google OAuth] Start failed", error);
      redirectHome(res, "login_required");
    }
  });

  app.get("/api/google/callback", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(GOOGLE_STATE_COOKIE, { ...cookieOptions, sameSite: "lax" });
    try {
      const code = typeof req.query.code === "string" ? req.query.code : undefined;
      const state = typeof req.query.state === "string" ? req.query.state : undefined;
      const providerError = typeof req.query.error === "string" ? req.query.error : undefined;
      if (providerError || !code || !state) {
        redirectHome(res, providerError === "access_denied" ? "access_denied" : "callback_invalid");
        return;
      }

      const storedState = parseState(parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE]);
      const user = await sdk.authenticateRequest(req);
      if (!storedState || storedState.state !== state || storedState.userId !== user.id) {
        redirectHome(res, "state_invalid");
        return;
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: ENV.googleOAuthClientId,
          client_secret: ENV.googleOAuthClientSecret,
          code,
          code_verifier: storedState.verifier,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl(req),
        }),
      });
      const token = await tokenResponse.json() as { refresh_token?: string; expires_in?: number; scope?: string; error?: string };
      if (!tokenResponse.ok || !token.refresh_token) {
        console.error("[Google OAuth] Token exchange failed", token.error || "missing refresh token");
        redirectHome(res, token.refresh_token ? "token_exchange_failed" : "refresh_token_missing");
        return;
      }

      const scopes = token.scope || GOOGLE_SCOPES.join(" ");
      const tokenExpiry = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
      await upsertGoogleConnection({ userId: user.id, encryptedRefreshToken: encryptSecret(token.refresh_token), grantedScopes: scopes, tokenExpiry });
      await createAuditEvent({ userId: user.id, action: "google.oauth.connected", resourceType: "google_connection", status: "accepted", details: JSON.stringify({ scopes: scopes.split(" ") }) });
      redirectHome(res, "connected");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      redirectHome(res, "callback_failed");
    }
  });
}

export const __googleOAuthInternals = { signState, parseState, encryptSecret, decryptSecret, callbackUrl };
