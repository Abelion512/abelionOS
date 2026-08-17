import { describe, expect, it } from "vitest";
import { __googleOAuthInternals } from "./googleOAuth";

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
});
