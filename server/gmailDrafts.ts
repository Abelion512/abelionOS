import { createAuditEvent, getGoogleConnection } from "./db";
import { decryptGoogleRefreshToken } from "./googleOAuth";
import { ENV } from "./_core/env";

export const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export type DraftContent = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
};

export type GmailDraftSummary = { id: string; messageId: string | null; threadId: string | null; to: string[]; cc: string[]; bcc: string[]; subject: string | null };
export type GmailDraftDetail = GmailDraftSummary & { body: string | null; bodyAvailable: boolean };

type GmailHeader = { name?: string; value?: string };
type GmailPayload = { headers?: GmailHeader[]; body?: { data?: string }; parts?: GmailPayload[] };
type GmailDraftResource = { id?: string; message?: { id?: string; threadId?: string; payload?: GmailPayload } };

function hasComposeScope(grantedScopes: string) {
  return grantedScopes.split(" ").includes(GMAIL_COMPOSE_SCOPE);
}

function cleanHeader(value: string) {
  if (/[\r\n]/.test(value)) throw new Error("Email headers cannot contain line breaks");
  return value.trim();
}

function headerLines(name: string, values: string[]) {
  return values.length ? `${name}: ${values.map(cleanHeader).join(", ")}` : null;
}

export function encodeDraftRaw(content: DraftContent) {
  const headers = [
    headerLines("To", content.to),
    headerLines("Cc", content.cc),
    headerLines("Bcc", content.bcc),
    `Subject: ${cleanHeader(content.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ].filter((value): value is string => Boolean(value));
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${content.body.replace(/\r?\n/g, "\r\n")}`, "utf8").toString("base64url");
}

function headerValue(headers: GmailHeader[], name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || null;
}

function recipients(headers: GmailHeader[], name: string) {
  const value = headerValue(headers, name);
  return value ? normalizeRecipientHeader(value) : [];
}

export function normalizeRecipientHeader(value: string) {
  const matches: string[] = [];
  const expression = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(value)) !== null) {
    if (matches.indexOf(match[0]) === -1) matches.push(match[0]);
  }
  return matches;
}

function findBody(payload: GmailPayload | undefined): string | null {
  if (!payload) return null;
  if (payload.body?.data) return Buffer.from(payload.body.data, "base64url").toString("utf8");
  for (const part of payload.parts ?? []) {
    const body = findBody(part);
    if (body !== null) return body;
  }
  return null;
}

export function normalizeDraft(resource: GmailDraftResource, includeBody: boolean): GmailDraftDetail | null {
  if (!resource.id) return null;
  const message = resource.message;
  const headers = message?.payload?.headers ?? [];
  const body = includeBody ? findBody(message?.payload) : null;
  return {
    id: resource.id,
    messageId: message?.id ?? null,
    threadId: message?.threadId ?? null,
    to: recipients(headers, "to"),
    cc: recipients(headers, "cc"),
    bcc: recipients(headers, "bcc"),
    subject: headerValue(headers, "subject"),
    body,
    bodyAvailable: includeBody && body !== null,
  };
}

async function getAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: ENV.googleOAuthClientId, client_secret: ENV.googleOAuthClientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const payload = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error || "Google token refresh failed");
  return payload.access_token;
}

async function draftRequest(userId: number, path: string, options: RequestInit = {}) {
  const connection = await getGoogleConnection(userId);
  if (!connection) throw new Error("Google Workspace is not connected");
  if (!hasComposeScope(connection.grantedScopes)) throw new Error("Google Workspace requires Gmail Draft permission. Reconnect Google Workspace to continue.");
  const accessToken = await getAccessToken(decryptGoogleRefreshToken(connection.encryptedRefreshToken));
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  if (!response.ok) throw new Error(`Gmail Drafts request failed (${response.status})`);
  return response;
}

async function auditDraft(userId: number, action: string, draftId: string) {
  try {
    await createAuditEvent({ userId, action, resourceType: "gmail_draft", resourceId: draftId, status: "accepted", details: JSON.stringify({ provider: "gmail", contentPersisted: false }) });
  } catch (error) {
    console.error("[Gmail Drafts] Audit event could not be written", error);
  }
}

export async function listGmailDrafts(userId: number, limit = 20): Promise<GmailDraftSummary[]> {
  const response = await draftRequest(userId, `?maxResults=${limit}`);
  const payload = await response.json() as { drafts?: GmailDraftResource[] };
  const details = await Promise.all((payload.drafts ?? []).map(async (draft) => {
    if (!draft.id) return null;
    const detailResponse = await draftRequest(userId, `/${encodeURIComponent(draft.id)}?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Bcc&metadataHeaders=Subject`);
    return normalizeDraft(await detailResponse.json() as GmailDraftResource, false);
  }));
  return details.flatMap((draft) => draft ? [{ id: draft.id, messageId: draft.messageId, threadId: draft.threadId, to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject }] : []);
}

export async function getGmailDraft(userId: number, draftId: string): Promise<GmailDraftDetail> {
  const response = await draftRequest(userId, `/${encodeURIComponent(draftId)}?format=full`);
  const draft = normalizeDraft(await response.json() as GmailDraftResource, true);
  if (!draft) throw new Error("Gmail returned an invalid draft");
  return draft;
}

export async function createGmailDraft(userId: number, content: DraftContent) {
  const response = await draftRequest(userId, "", { method: "POST", body: JSON.stringify({ message: { raw: encodeDraftRaw(content) } }) });
  const draft = normalizeDraft(await response.json() as GmailDraftResource, false);
  if (!draft) throw new Error("Gmail did not return a draft id");
  await auditDraft(userId, "gmail.draft.created", draft.id);
  return { id: draft.id, messageId: draft.messageId, threadId: draft.threadId };
}

export async function updateGmailDraft(userId: number, draftId: string, content: DraftContent) {
  const response = await draftRequest(userId, `/${encodeURIComponent(draftId)}`, { method: "PUT", body: JSON.stringify({ id: draftId, message: { raw: encodeDraftRaw(content) } }) });
  const draft = normalizeDraft(await response.json() as GmailDraftResource, false);
  if (!draft) throw new Error("Gmail did not return the updated draft");
  await auditDraft(userId, "gmail.draft.updated", draft.id);
  return { id: draft.id, messageId: draft.messageId, threadId: draft.threadId };
}

export async function deleteGmailDraft(userId: number, draftId: string) {
  await draftRequest(userId, `/${encodeURIComponent(draftId)}`, { method: "DELETE" });
  await auditDraft(userId, "gmail.draft.deleted", draftId);
  return { id: draftId, deleted: true as const };
}

export const __gmailDraftInternals = { hasComposeScope, encodeDraftRaw, normalizeDraft, cleanHeader, normalizeRecipientHeader };
