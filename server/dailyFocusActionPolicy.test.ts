import { describe, expect, it } from "vitest";
import { hasActionScope, parseDailyFocusProposal, parseExplicitCalendarDraft, proposalSummary } from "./dailyFocusActionPolicy";

describe("Daily Focus action policy", () => {
  it("accepts a bounded Calendar proposal with an explicit timezone", () => {
    const proposal = parseDailyFocusProposal({
      kind: "calendar.create",
      calendarId: "primary",
      title: "Architecture review",
      description: null,
      start: "2026-08-18T10:00:00.000Z",
      end: "2026-08-18T10:30:00.000Z",
      timeZone: "Asia/Jakarta",
      attendees: [],
      reminderMinutes: [30],
    });
    expect(proposalSummary(proposal)).toBe("Create event: Architecture review");
  });

  it("rejects Calendar deletion unless the user is the organizer", () => {
    expect(() => parseDailyFocusProposal({
      kind: "calendar.delete",
      calendarId: "primary",
      eventId: "event-1",
      title: "Shared meeting",
      start: "2026-08-18T10:00:00.000Z",
      organizerSelf: false,
    })).toThrow();
  });

  it("limits Gmail trash proposals and checks action-specific scope", () => {
    expect(() => parseDailyFocusProposal({
      kind: "gmail.trash",
      messages: Array.from({ length: 26 }, (_, index) => ({ id: String(index), sender: null, subject: null, receivedAt: null })),
    })).toThrow();
    expect(hasActionScope("https://www.googleapis.com/auth/gmail.metadata https://www.googleapis.com/auth/gmail.modify", "gmail.trash")).toBe(true);
    expect(hasActionScope("https://www.googleapis.com/auth/gmail.metadata", "gmail.trash")).toBe(false);
  });

  it("builds a Calendar proposal from an explicit structured draft without a reasoner", () => {
    expect(parseExplicitCalendarDraft([
      "Title: Mintdesk verification event",
      "Start: 2026-08-19T07:00:00.000Z",
      "End: 2026-08-19T07:10:00.000Z",
      "Timezone: Asia/Jakarta",
      "Description: Controlled provider verification",
    ].join("\n"))).toMatchObject({ kind: "calendar.create", title: "Mintdesk verification event", attendees: [] });
  });

  it("keeps ambiguous Calendar prose on the companion path", () => {
    expect(parseExplicitCalendarDraft("Tomorrow afternoon, schedule a review meeting.")).toBeNull();
    expect(parseExplicitCalendarDraft("Title: Missing end\nStart: 2026-08-19T07:00:00.000Z\nTimezone: Asia/Jakarta")).toBeNull();
  });
});
