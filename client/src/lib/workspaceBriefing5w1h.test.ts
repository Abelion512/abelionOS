import { describe, expect, it } from "vitest";
import { getCalendarFiveWOneH, getInboxFiveWOneH } from "./workspaceBriefing5w1h";

describe("Workspace briefing 5W1H presentation", () => {
  it("keeps missing Calendar fields explicit instead of inferring them", () => {
    const facts = getCalendarFiveWOneH({ summary: "Planning", start: "2026-08-17T02:00:00.000Z", end: "2026-08-17T02:30:00.000Z", organizer: null, attendees: [], location: null, description: null, meetingUrl: null, htmlLink: null });
    expect(facts).toEqual(expect.arrayContaining([{ label: "Who", value: null }, { label: "Where", value: null }, { label: "Why / How", value: null, href: null }]));
  });

  it("uses the bounded Gmail preview when it is returned by the provider", () => {
    expect(getInboxFiveWOneH({ sender: "Project <project@example.com>", subject: "Launch checklist", receivedAt: "2026-08-17T02:00:00.000Z", bodyExcerpt: "Review the launch checklist before noon." })).toEqual([
      { label: "What", value: "Launch checklist" }, { label: "When", value: "2026-08-17T02:00:00.000Z" }, { label: "Who", value: "Project <project@example.com>" }, { label: "Where", value: "Gmail Inbox" }, { label: "Why / How", value: "Review the launch checklist before noon." },
    ]);
  });
});
