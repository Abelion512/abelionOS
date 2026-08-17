import { describe, expect, it } from "vitest";

describe("Google OAuth configuration", () => {
  it("recognizes the configured client credentials at Google's token endpoint", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: "mintdesk-health-check-invalid-code",
        grant_type: "authorization_code",
        redirect_uri: "https://mintdash-khcj34hp.manus.space/api/google/callback",
      }),
    });
    const payload = await response.json() as { error?: string; error_description?: string };

    expect(response.status).toBe(400);
    expect(payload.error).not.toBe("invalid_client");
  });
});
