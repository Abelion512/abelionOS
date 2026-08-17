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
  organizer: string | null;
  attendees: string[];
  location: string | null;
  description: string | null;
  meetingUrl: string | null;
  htmlLink: string | null;
};

export type InboxBriefingMessage = {
  id: string;
  sender: string | null;
  subject: string | null;
  receivedAt: string | null;
};

export type WorkspaceBriefing = {
  calendarEvents: CalendarBriefingEvent[] | null;
  unreadInboxCount: number | null;
  inboxMessages: InboxBriefingMessage[] | null;
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
type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { displayName?: string; email?: string };
  attendees?: Array<{ displayName?: string; email?: string }>;
  location?: string;
  description?: string;
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
};
type GmailMessageResource = { id?: string; internalDate?: string; payload?: { headers?: Array<{ name?: string; value?: string }> } };

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

function filterDailyFocusActivity(events: AuditEvent[]) {
  return events.filter((event) => !event.action.startsWith("gmail.draft."));
}

function normalizeCalendarEvents(items: GoogleCalendarEvent[], window: { from: Date; until: Date }): CalendarBriefingEvent[] {
  return items.flatMap((event) => {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    if (!event.id || !start || !end) return [];
    const startAt = Date.parse(start);
    const endAt = Date.parse(end);
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= window.from.getTime() || startAt >= window.until.getTime()) return [];
    const organizer = event.organizer?.displayName || event.organizer?.email || null;
    const attendees = (event.attendees ?? []).map((attendee) => attendee.displayName || attendee.email).filter((value): value is string => Boolean(value));
    const meetingUrl = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video" && entry.uri)?.uri || event.hangoutLink || null;
    return [{ id: event.id, summary: event.summary || "Untitled event", start, end, organizer, attendees, location: event.location || null, description: event.description || null, meetingUrl, htmlLink: event.htmlLink || null }];
  });
}

function normalizeInboxMessage(message: GmailMessageResource): InboxBriefingMessage | null {
  if (!message.id) return null;
  const headers = new Map((message.payload?.headers ?? []).map((header) => [header.name?.toLowerCase(), header.value]));
  const receivedAt = message.internalDate && Number.isFinite(Number(message.internalDate)) ? new Date(Number(message.internalDate)).toISOString() : null;
  return { id: message.id, sender: headers.get("from") || null, subject: headers.get("subject") || null, receivedAt };
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
    return { calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "unavailable", detail: "Required Calendar or Gmail scope was not granted." } };
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
    calendarUrl.searchParams.set("conferenceDataVersion", "1");

    const inboxUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    inboxUrl.searchParams.set("labelIds", "INBOX");
    inboxUrl.searchParams.set("q", "is:unread");
    inboxUrl.searchParams.set("maxResults", "1");

    const [calendarResult, inboxResult] = await Promise.allSettled([
      fetch(calendarUrl, { headers: auth }).then(async (response) => {
        if (!response.ok) throw new Error(`Calendar request failed (${response.status})`);
        return response.json() as Promise<{ items?: GoogleCalendarEvent[] }>;
      }),
      fetch(inboxUrl, { headers: auth }).then(async (response) => {
        if (!response.ok) throw new Error(`Gmail request failed (${response.status})`);
        const payload = await response.json() as { resultSizeEstimate?: number; messages?: Array<{ id?: string }> };
        const detailResults = await Promise.allSettled((payload.messages ?? []).slice(0, 3).flatMap((message) => message.id ? [fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, { headers: auth }).then(async (detailResponse) => {
          if (!detailResponse.ok) throw new Error(`Gmail message metadata request failed (${detailResponse.status})`);
          return detailResponse.json() as Promise<GmailMessageResource>;
        })] : []));
        return { unreadInboxCount: payload.resultSizeEstimate ?? 0, inboxMessages: detailResults.flatMap((result) => result.status === "fulfilled" ? [normalizeInboxMessage(result.value)].filter((message): message is InboxBriefingMessage => Boolean(message)) : []) };
      }),
    ]);

    const calendarEvents = calendarResult.status === "fulfilled"
      ? normalizeCalendarEvents(calendarResult.value.items ?? [], window)
      : null;
    const unreadInboxCount = inboxResult.status === "fulfilled" ? inboxResult.value.unreadInboxCount : null;
    const inboxMessages = inboxResult.status === "fulfilled" ? inboxResult.value.inboxMessages : null;

    if (calendarEvents === null && unreadInboxCount === null) throw new Error("Calendar and Gmail were both unavailable");
    if (calendarEvents === null || unreadInboxCount === null) {
      return { calendarEvents, unreadInboxCount, inboxMessages, source: { status: "partial", detail: "One Google Workspace source could not be refreshed." } };
    }
    return { calendarEvents, unreadInboxCount, inboxMessages, source: { status: "ready", detail: "Calendar and Gmail metadata refreshed." } };
  } catch (error) {
    return { calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "error", detail: providerFailureMessage(error) } };
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

  const activityEvents = activityResult.status === "fulfilled" ? filterDailyFocusActivity(activityResult.value) : [];
  const activity = activityResult.status === "fulfilled"
    ? { events: activityEvents, source: { status: "ready" as const, detail: activityEvents.length ? "Recent supported application activity is available." : "No supported application activity has been recorded yet." } }
    : { events: [], source: { status: "error" as const, detail: "Application activity could not be loaded." } };
  const files = fileResult.status === "fulfilled"
    ? { recent: fileResult.value, source: { status: "ready" as const, detail: fileResult.value.length ? "Recent file metadata is available." : "No file metadata has been recorded yet." } }
    : { recent: [], source: { status: "error" as const, detail: "File metadata could not be loaded." } };

  let workspace: WorkspaceBriefing;
  if (connectionResult.status !== "fulfilled") {
    workspace = { calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "error", detail: "Google Workspace connection status could not be loaded." } };
  } else if (!connectionResult.value) {
    workspace = { calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "unavailable", detail: "Google Workspace is not connected." } };
  } else {
    workspace = await readWorkspace(connectionResult.value, window);
  }

  return { generatedAt: now, window, workspace, activity, files };
}

export const __morningBriefingInternals = { normalizeCalendarEvents, normalizeInboxMessage, filterDailyFocusActivity };
