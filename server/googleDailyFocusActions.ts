import { createAuditEvent, getGoogleConnection } from "./db";
import { hasActionScope, type DailyFocusProposal } from "./dailyFocusActionPolicy";
import { refreshGoogleAccessToken } from "./morningBriefing";

type GoogleActionResult = { providerResourceId: string; auditDetails: Record<string, unknown> };

async function request(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Google provider request failed (${response.status})`);
  return response;
}

async function executeProposal(accessToken: string, proposal: DailyFocusProposal): Promise<GoogleActionResult> {
  if (proposal.kind === "task.create") {
    const taskListId = encodeURIComponent(proposal.taskListId);
    const response = await request(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, accessToken, {
      method: "POST",
      body: JSON.stringify({ title: proposal.title, notes: proposal.notes ?? undefined, due: proposal.due ?? undefined }),
    });
    const payload = await response.json() as { id?: string };
    if (!payload.id) throw new Error("Google Tasks did not return an ID");
    return { providerResourceId: payload.id, auditDetails: { kind: proposal.kind, taskId: payload.id } };
  }

  if (proposal.kind === "calendar.create") {
    const response = await request(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(proposal.calendarId)}/events`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        summary: proposal.title,
        description: proposal.description ?? undefined,
        start: { dateTime: proposal.start, timeZone: proposal.timeZone },
        end: { dateTime: proposal.end, timeZone: proposal.timeZone },
        attendees: proposal.attendees.map((email) => ({ email })),
        reminders: proposal.reminderMinutes.length ? { useDefault: false, overrides: proposal.reminderMinutes.map((minutes) => ({ method: "popup", minutes })) } : undefined,
      }),
    });
    const payload = await response.json() as { id?: string };
    if (!payload.id) throw new Error("Google Calendar did not return an event ID");
    return { providerResourceId: payload.id, auditDetails: { kind: proposal.kind, eventId: payload.id } };
  }

  if (proposal.kind === "calendar.delete") {
    const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(proposal.calendarId)}/events/${encodeURIComponent(proposal.eventId)}`;
    const existing = await request(eventUrl, accessToken);
    const event = await existing.json() as { organizer?: { self?: boolean } };
    if (!event.organizer?.self) throw new Error("Calendar event is not owned by the authenticated user");
    await request(eventUrl, accessToken, { method: "DELETE", body: undefined });
    return { providerResourceId: proposal.eventId, auditDetails: { kind: proposal.kind, eventId: proposal.eventId } };
  }

  const outcomes = await Promise.allSettled(proposal.messages.map(async (message) => {
    await request(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}/trash`, accessToken, { method: "POST", body: undefined });
    return message.id;
  }));
  const moved = outcomes.flatMap((outcome) => outcome.status === "fulfilled" ? [outcome.value] : []);
  if (moved.length !== proposal.messages.length) throw new Error(`Gmail trash partially completed (${moved.length}/${proposal.messages.length})`);
  return { providerResourceId: moved.join(","), auditDetails: { kind: proposal.kind, messageCount: moved.length, permanentDelete: false } };
}

export async function executeDailyFocusGoogleAction(userId: number, actionId: number, proposal: DailyFocusProposal) {
  const connection = await getGoogleConnection(userId);
  if (!connection) throw new Error("Google Workspace is not connected");
  if (!hasActionScope(connection.grantedScopes, proposal.kind)) throw new Error("Google action scope must be granted again");
  const accessToken = await refreshGoogleAccessToken(connection);
  const result = await executeProposal(accessToken, proposal);
  await createAuditEvent({ userId, action: "daily_focus.action.executed", resourceType: proposal.kind, resourceId: result.providerResourceId, status: "accepted", details: JSON.stringify({ actionId, ...result.auditDetails }) });
  return result;
}

export const __googleDailyFocusActionInternals = { executeProposal };
