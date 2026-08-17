import { describe, expect, it } from "vitest";
import { toDailyFocusEvidence } from "./dailyFocusEvidence";

describe("toDailyFocusEvidence", () => {
  it("passes only Daily Focus source fields and excludes file storage metadata", () => {
    const output = toDailyFocusEvidence({
      generatedAt: new Date("2026-08-18T00:00:00.000Z"),
      window: { from: new Date("2026-08-18T00:00:00.000Z"), until: new Date("2026-08-19T00:00:00.000Z"), label: "Next 24 hours" },
      workspace: { calendarEvents: [], unreadInboxCount: 2, inboxMessages: [], source: { status: "ready", detail: "ok" } },
      activity: { events: [{ id: 4, userId: 1, action: "google.oauth.connected", metadataJson: null, createdAt: new Date("2026-08-17T00:00:00.000Z") }], source: { status: "ready", detail: "ok" } },
      files: { recent: [{ id: 9, userId: 1, fileName: "private.pdf", mimeType: "application/pdf", sizeBytes: 1, objectKey: "x", objectUrl: "x", createdAt: new Date() }], source: { status: "ready", detail: "ok" } },
    });
    expect(output).not.toHaveProperty("files");
    expect(output.activity.events).toEqual([{ id: 4, action: "google.oauth.connected", createdAt: "2026-08-17T00:00:00.000Z" }]);
  });
});
