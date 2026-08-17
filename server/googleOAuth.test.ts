import { describe, expect, it } from "vitest";
import { __googleOAuthInternals } from "./googleOAuth";
import { ENV } from "./_core/env";

describe("Google OAuth security helpers", () => {
  it("accepts a signed state before expiry and rejects a changed signature", () => {
    const signed = __googleOAuthInternals.signState({ state: "nonce", userId: 42, verifier: "verifier", expiresAt: Date.now() + 60_000 });
    expect(__googleOAuthInternals.parseState(signed)).toMatchObject({ state: "nonce", userId: 42 });
    expect(__googleOAuthInternals.parseState(`${signed}x`)).toBeNull();
  });

  it("rejects state that has expired", () => {
    const signed = __googleOAuthInternals.signState({ state: "nonce", userId: 42, verifier: "verifier", expiresAt: Date.now() - 1 });
    expect(__googleOAuthInternals.parseState(signed)).toBeNull();
  });

  it("encrypts refresh tokens so plaintext is not persisted", () => {
    const encrypted = __googleOAuthInternals.encryptSecret("refresh-token-value");
    expect(encrypted).not.toContain("refresh-token-value");
    expect(__googleOAuthInternals.decryptSecret(encrypted)).toBe("refresh-token-value");
  });

  it("keeps Gmail access limited to metadata for Morning Briefing", () => {
    expect(__googleOAuthInternals.googleScopes).toContain("https://www.googleapis.com/auth/gmail.metadata");
    expect(__googleOAuthInternals.googleScopes).not.toContain("https://www.googleapis.com/auth/gmail.compose");
  });

  it("uses the public forwarded host for the callback when running behind the deployment gateway", () => {
    const request = {
      protocol: "http",
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "mintdash-khcj34hp.manus.space" },
      get: () => "ydhstprd65-aco4kte4cq-ue.a.run.app",
    } as any;

    expect(__googleOAuthInternals.callbackUrl(request)).toBe("https://mintdash-khcj34hp.manus.space/api/google/callback");
  });

  it("uses a configured public callback for production but preserves localhost during local development", () => {
    const previous = ENV.googleOAuthRedirectUri;
    ENV.googleOAuthRedirectUri = "https://mintdash-khcj34hp.manus.space/api/google/callback";
    const productionRequest = { protocol: "http", headers: {}, get: () => "ydhstprd65-aco4kte4cq-ue.a.run.app" } as any;
    const localRequest = { protocol: "http", headers: { host: "localhost:3000" }, get: () => "localhost:3000" } as any;

    expect(__googleOAuthInternals.callbackUrl(productionRequest)).toBe("https://mintdash-khcj34hp.manus.space/api/google/callback");
    expect(__googleOAuthInternals.callbackUrl(localRequest)).toBe("http://localhost:3000/api/google/callback");
    ENV.googleOAuthRedirectUri = previous;
  });

  it("uses a reachable HTTPS callback endpoint from the configured production URI", async () => {
    expect(ENV.googleOAuthRedirectUri).toBe("https://mintdash-khcj34hp.manus.space/api/google/callback");
    const response = await fetch(ENV.googleOAuthRedirectUri, { redirect: "manual" });
    expect([301, 302, 303, 307, 308]).toContain(response.status);
  });
});
