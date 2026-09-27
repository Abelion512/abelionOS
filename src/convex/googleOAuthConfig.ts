// Konfigurasi OAuth Google AbelionOS.
// ponytail: scope allowlist persis sesuai AGENTS.md + openid/email untuk
// identifikasi akun multi-account. Jangan menambah scope tanpa amendment.
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const OAUTH_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/gmail.metadata",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/tasks",
];

export function googleClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum diisi di Settings → Environment");
  }
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "http://localhost:5173/api/google/callback";
  return { clientId, clientSecret, redirectUri };
}

export function signingKey() {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("OAUTH_STATE_SECRET belum diisi (min 32 karakter)");
  }
  return new TextEncoder().encode(secret);
}
