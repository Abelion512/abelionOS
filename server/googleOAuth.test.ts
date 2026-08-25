import { describe, expect, it, vi } from "vitest";
import { disconnectGoogleWorkspace, __googleOAuthInternals } from "./googleOAuth";
import { ENV } from "./_core/env";
import type { GoogleConnection } from "../drizzle/schema";

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

  it("requests only the declared Daily Focus scopes and never restores Gmail Drafts", () => {
    expect(__googleOAuthInternals.googleScopes).toContain("https://www.googleapis.com/auth/gmail.metadata");
    expect(__googleOAuthInternals.googleScopes).toContain("https://www.googleapis.com/auth/gmail.modify");
    expect(__googleOAuthInternals.googleScopes).toContain("https://www.googleapis.com/auth/tasks");
    expect(__googleOAuthInternals.googleScopes).toContain("https://www.googleapis.com/auth/calendar.events.owned");
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

  // Integrasi smoke-test yang hanya berlaku bila callback publik produksi dikonfigurasi dan dapat dijangkau.
  it.skipIf(!ENV.googleOAuthRedirectUri)("uses a reachable HTTPS callback endpoint from the configured production URI", async () => {
    expect(ENV.googleOAuthRedirectUri).toBe("https://mintdash-khcj34hp.manus.space/api/google/callback");
    const response = await fetch(ENV.googleOAuthRedirectUri, { redirect: "manual" });
    expect([301, 302, 303, 307, 308]).toContain(response.status);
  }, 15_000);

  it("removes only the current user connection and records a token-free audit even when provider revoke fails", async () => {
    const encryptedRefreshToken = __googleOAuthInternals.encryptSecret("refresh-token-value");
    const connection = { id: 1, userId: 9, encryptedRefreshToken, grantedScopes: "https://www.googleapis.com/auth/gmail.compose", tokenExpiry: null, createdAt: new Date(), updatedAt: new Date() } as GoogleConnection;
    const revoke = vi.fn().mockRejectedValue(new Error("Google unavailable"));
    const deleteConnection = vi.fn().mockResolvedValue(true);
    const createAudit = vi.fn().mockResolvedValue(undefined);
    const publishNotification = vi.fn().mockResolvedValue(null);

    const result = await disconnectGoogleWorkspace(9, { getConnection: async () => connection, revoke, deleteConnection, createAudit, publishNotification });

    expect(result).toEqual({ disconnected: true, providerRevoke: "failed" });
    expect(deleteConnection).toHaveBeenCalledWith(9);
    expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ userId: 9, action: "google.oauth.disconnected", status: "accepted" }));
    expect(publishNotification).toHaveBeenCalledWith({ userId: 9, event: "google.disconnected", resourceType: "google_connection" });
    expect(JSON.stringify(createAudit.mock.calls)).not.toContain("refresh-token-value");
  });
});
