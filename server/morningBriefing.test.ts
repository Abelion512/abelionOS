import { describe, expect, it, vi } from "vitest";
import type { GoogleConnection } from "../drizzle/schema";
import { __morningBriefingInternals, buildMorningBriefing } from "./morningBriefing";

const now = new Date("2026-08-17T01:00:00.000Z");

describe("Morning Briefing aggregation", () => {
  it("keeps Workspace unavailable without inventing Calendar or Gmail values", async () => {
    const readWorkspace = vi.fn();
    const briefing = await buildMorningBriefing(9, {
      now: () => now,
      getConnection: async () => undefined,
      listActivity: async () => [],
      listFiles: async () => [],
      readWorkspace,
    });

    expect(readWorkspace).not.toHaveBeenCalled();
    expect(briefing.window).toEqual({ from: now, until: new Date("2026-08-18T01:00:00.000Z"), label: "Next 24 hours" });
    expect(briefing.workspace).toEqual({ calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "unavailable", detail: "Google Workspace is not connected." } });
    expect(briefing.activity).toMatchObject({ events: [], source: { status: "ready" } });
    expect(briefing.files).toMatchObject({ recent: [], source: { status: "ready" } });
  });

  it("preserves a partial Google response instead of substituting missing data", async () => {
    const connection = { id: 1, userId: 9, encryptedRefreshToken: "encrypted", grantedScopes: "calendar gmail", tokenExpiry: null, createdAt: now, updatedAt: now } as GoogleConnection;
    const briefing = await buildMorningBriefing(9, {
      now: () => now,
      getConnection: async () => connection,
      listActivity: async () => [],
      listFiles: async () => [],
      readWorkspace: async () => ({
        calendarEvents: [{ id: "event-1", summary: "Review", start: "2026-08-17T02:00:00.000Z", end: "2026-08-17T02:30:00.000Z", organizer: null, attendees: [], location: null, description: null, meetingUrl: null, htmlLink: null }],
        unreadInboxCount: null,
        inboxMessages: null,
        source: { status: "partial", detail: "One Google Workspace source could not be refreshed." },
      }),
    });

    expect(briefing.workspace.calendarEvents).toHaveLength(1);
    expect(briefing.workspace.unreadInboxCount).toBeNull();
    expect(briefing.workspace.source.status).toBe("partial");
  });

  it("reports an invalid Workspace refresh as an error without exposing or substituting provider data", async () => {
    const connection = { id: 1, userId: 9, encryptedRefreshToken: "encrypted", grantedScopes: "calendar gmail", tokenExpiry: null, createdAt: now, updatedAt: now } as GoogleConnection;
    const briefing = await buildMorningBriefing(9, {
      now: () => now,
      getConnection: async () => connection,
      listActivity: async () => [],
      listFiles: async () => [],
      readWorkspace: async () => ({ calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "error", detail: "Google authorization must be connected again." } }),
    });

    expect(briefing.workspace).toEqual({ calendarEvents: null, unreadInboxCount: null, inboxMessages: null, source: { status: "error", detail: "Google authorization must be connected again." } });
  });

  it("keeps simultaneous briefing refreshes user-scoped", async () => {
    const briefings = await Promise.all([1, 2, 3, 4, 5].map((userId) => buildMorningBriefing(userId, {
      now: () => now,
      getConnection: async () => undefined,
      listActivity: async (id) => [{ id, userId: id, action: `user.${id}.refresh`, resourceType: "briefing", resourceId: null, status: "accepted", details: null, createdAt: now }],
      listFiles: async () => [],
    })));

    expect(briefings.map((briefing) => briefing.activity.events[0]?.action)).toEqual(["user.1.refresh", "user.2.refresh", "user.3.refresh", "user.4.refresh", "user.5.refresh"]);
    expect(briefings.every((briefing) => briefing.workspace.source.status === "unavailable")).toBe(true);
  });

  it("excludes historical Gmail Draft actions from Daily Focus evidence while preserving other audit actions", () => {
    const events = __morningBriefingInternals.filterDailyFocusActivity([
      { id: 1, userId: 9, action: "gmail.draft.created", resourceType: "draft", resourceId: null, status: "accepted", details: null, createdAt: now },
      { id: 2, userId: 9, action: "google.oauth.connected", resourceType: "google_connection", resourceId: null, status: "accepted", details: null, createdAt: now },
    ]);
    expect(events.map((event) => event.action)).toEqual(["google.oauth.connected"]);
  });

  it("filters provider Calendar events outside the briefing window", () => {
    const events = __morningBriefingInternals.normalizeCalendarEvents([
      { id: "past", summary: "Past event", start: { dateTime: "2026-07-13T10:00:00.000Z" }, end: { dateTime: "2026-07-13T11:00:00.000Z" } },
      { id: "current", summary: "Current event", start: { dateTime: "2026-08-17T02:00:00.000Z" }, end: { dateTime: "2026-08-17T02:30:00.000Z" } },
      { id: "overlap", summary: "Overlapping event", start: { dateTime: "2026-08-17T00:30:00.000Z" }, end: { dateTime: "2026-08-17T01:30:00.000Z" } },
      { id: "future", summary: "Future event", start: { dateTime: "2026-08-18T01:00:00.000Z" }, end: { dateTime: "2026-08-18T02:00:00.000Z" } },
    ], { from: now, until: new Date("2026-08-18T01:00:00.000Z") });

    expect(events.map((event) => event.id)).toEqual(["current", "overlap"]);
  });

  it("maps only Calendar and Gmail metadata that can support 5W1H without email body access", () => {
    const [event] = __morningBriefingInternals.normalizeCalendarEvents([{ id: "event-1", summary: "Planning", start: { dateTime: "2026-08-17T02:00:00.000Z" }, end: { dateTime: "2026-08-17T02:30:00.000Z" }, organizer: { displayName: "Abelion" }, attendees: [{ displayName: "Team" }], location: "Studio", description: "Review launch plan", conferenceData: { entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }] } }], { from: now, until: new Date("2026-08-18T01:00:00.000Z") });
    const message = __morningBriefingInternals.normalizeInboxMessage({ id: "mail-1", internalDate: "1786928400000", payload: { headers: [{ name: "From", value: "Project <project@example.com>" }, { name: "Subject", value: "Launch checklist" }] } });

    expect(event).toMatchObject({ organizer: "Abelion", attendees: ["Team"], location: "Studio", description: "Review launch plan", meetingUrl: "https://meet.google.com/abc-defg-hij" });
    expect(message).toMatchObject({ sender: "Project <project@example.com>", subject: "Launch checklist" });
  });
});
