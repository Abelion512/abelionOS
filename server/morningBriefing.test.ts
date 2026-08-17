import { describe, expect, it, vi } from "vitest";
import type { GoogleConnection } from "../drizzle/schema";
import { buildMorningBriefing } from "./morningBriefing";

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
    expect(briefing.workspace).toEqual({ calendarEvents: null, unreadInboxCount: null, source: { status: "unavailable", detail: "Google Workspace is not connected." } });
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
        calendarEvents: [{ id: "event-1", summary: "Review", start: "2026-08-17T02:00:00.000Z", end: "2026-08-17T02:30:00.000Z" }],
        unreadInboxCount: null,
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
      readWorkspace: async () => ({ calendarEvents: null, unreadInboxCount: null, source: { status: "error", detail: "Google authorization must be connected again." } }),
    });

    expect(briefing.workspace).toEqual({ calendarEvents: null, unreadInboxCount: null, source: { status: "error", detail: "Google authorization must be connected again." } });
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
});
