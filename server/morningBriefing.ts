import type { AuditEvent, FileRecord, GoogleConnection } from "../drizzle/schema";
import { getGoogleConnection, listAuditEvents, listUserFiles } from "./db";
import { decryptGoogleRefreshToken } from "./googleOAuth";
import { ENV } from "./_core/env";

export type BriefingSourceStatus = "ready" | "partial" | "unavailable" | "error";

export type BriefingSource = {
  status: BriefingSourceStatus;
  detail: string;
};

export type CalendarBriefingEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
};

export type WorkspaceBriefing = {
  calendarEvents: CalendarBriefingEvent[] | null;
  unreadInboxCount: number | null;
  source: BriefingSource;
};

export type MorningBriefing = {
  generatedAt: Date;
  window: { from: Date; until: Date; label: string };
  workspace: WorkspaceBriefing;
  activity: { events: AuditEvent[]; source: BriefingSource };
  files: { recent: FileRecord[]; source: BriefingSource };
};

type WorkspaceReader = (connection: GoogleConnection, window: { from: Date; until: Date }) => Promise<WorkspaceBriefing>;

const REQUIRED_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
];

function providerFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Google Workspace request failed";
  if (/invalid_grant|invalid token|unauthor/i.test(message)) return "Google authorization must be connected again.";
  return "Google Workspace could not be refreshed. No provider data is shown.";
}

function hasRequiredScopes(connection: GoogleConnection) {
  const granted = new Set(connection.grantedScopes.split(" ").filter(Boolean));
  return REQUIRED_GOOGLE_SCOPES.every((scope) => granted.has(scope));
}

async function refreshGoogleAccessToken(connection: GoogleConnection) {
  if (!ENV.googleOAuthClientId || !ENV.googleOAuthClientSecret) throw new Error("Google OAuth is not configured");
  const refreshToken = decryptGoogleRefreshToken(connection.encryptedRefreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.googleOAuthClientId,
      client_secret: ENV.googleOAuthClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error || "Google token refresh failed");
  return payload.access_token;
}

export async function readGoogleWorkspaceBriefing(connection: GoogleConnection, window: { from: Date; until: Date }): Promise<WorkspaceBriefing> {
  if (!hasRequiredScopes(connection)) {
    return { calendarEvents: null, unreadInboxCount: null, source: { status: "unavailable", detail: "Required Calendar or Gmail scope was not granted." } };
  }

  try {
    const accessToken = await refreshGoogleAccessToken(connection);
    const auth = { Authorization: `Bearer ${accessToken}` };
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calendarUrl.searchParams.set("timeMin", window.from.toISOString());
    calendarUrl.searchParams.set("timeMax", window.until.toISOString());
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");
    calendarUrl.searchParams.set("maxResults", "10");

    const inboxUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    inboxUrl.searchParams.set("labelIds", "INBOX");
    inboxUrl.searchParams.set("q", "is:unread");
    inboxUrl.searchParams.set("maxResults", "1");

    const [calendarResult, inboxResult] = await Promise.allSettled([
      fetch(calendarUrl, { headers: auth }).then(async (response) => {
        if (!response.ok) throw new Error(`Calendar request failed (${response.status})`);
        return response.json() as Promise<{ items?: Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> }>;
      }),
      fetch(inboxUrl, { headers: auth }).then(async (response) => {
        if (!response.ok) throw new Error(`Gmail request failed (${response.status})`);
        return response.json() as Promise<{ resultSizeEstimate?: number }>;
      }),
    ]);

    const calendarEvents = calendarResult.status === "fulfilled"
      ? (calendarResult.value.items ?? []).flatMap((event) => event.id && event.start && event.end ? [{ id: event.id, summary: event.summary || "Untitled event", start: event.start.dateTime || event.start.date || "", end: event.end.dateTime || event.end.date || "" }] : [])
      : null;
    const unreadInboxCount = inboxResult.status === "fulfilled" ? inboxResult.value.resultSizeEstimate ?? 0 : null;

    if (calendarEvents === null && unreadInboxCount === null) throw new Error("Calendar and Gmail were both unavailable");
    if (calendarEvents === null || unreadInboxCount === null) {
      return { calendarEvents, unreadInboxCount, source: { status: "partial", detail: "One Google Workspace source could not be refreshed." } };
    }
    return { calendarEvents, unreadInboxCount, source: { status: "ready", detail: "Calendar and Gmail metadata refreshed." } };
  } catch (error) {
    return { calendarEvents: null, unreadInboxCount: null, source: { status: "error", detail: providerFailureMessage(error) } };
  }
}

export async function buildMorningBriefing(
  userId: number,
  dependencies: {
    now?: () => Date;
    getConnection?: (id: number) => Promise<GoogleConnection | undefined>;
    listActivity?: (id: number, limit: number) => Promise<AuditEvent[]>;
    listFiles?: (id: number, limit: number) => Promise<FileRecord[]>;
    readWorkspace?: WorkspaceReader;
  } = {},
): Promise<MorningBriefing> {
  const now = dependencies.now?.() ?? new Date();
  const window = { from: now, until: new Date(now.getTime() + 24 * 60 * 60 * 1000), label: "Next 24 hours" };
  const getConnection = dependencies.getConnection ?? getGoogleConnection;
  const getActivity = dependencies.listActivity ?? listAuditEvents;
  const getFiles = dependencies.listFiles ?? listUserFiles;
  const readWorkspace = dependencies.readWorkspace ?? readGoogleWorkspaceBriefing;

  const [connectionResult, activityResult, fileResult] = await Promise.allSettled([
    getConnection(userId),
    getActivity(userId, 5),
    getFiles(userId, 5),
  ]);

  const activity = activityResult.status === "fulfilled"
    ? { events: activityResult.value, source: { status: "ready" as const, detail: activityResult.value.length ? "Recent application activity is available." : "No application activity has been recorded yet." } }
    : { events: [], source: { status: "error" as const, detail: "Application activity could not be loaded." } };
  const files = fileResult.status === "fulfilled"
    ? { recent: fileResult.value, source: { status: "ready" as const, detail: fileResult.value.length ? "Recent file metadata is available." : "No file metadata has been recorded yet." } }
    : { recent: [], source: { status: "error" as const, detail: "File metadata could not be loaded." } };

  let workspace: WorkspaceBriefing;
  if (connectionResult.status !== "fulfilled") {
    workspace = { calendarEvents: null, unreadInboxCount: null, source: { status: "error", detail: "Google Workspace connection status could not be loaded." } };
  } else if (!connectionResult.value) {
    workspace = { calendarEvents: null, unreadInboxCount: null, source: { status: "unavailable", detail: "Google Workspace is not connected." } };
  } else {
    workspace = await readWorkspace(connectionResult.value, window);
  }

  return { generatedAt: now, window, workspace, activity, files };
}
