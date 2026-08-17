import { describe, expect, it } from "vitest";
import { parseActionProposal } from "./actionProposalPolicy.mjs";

describe("Bun companion action proposal policy", () => {
  it("accepts a bounded task proposal without a due date", () => {
    expect(parseActionProposal({ kind: "task.create", taskListId: "@default", title: "Review architecture", notes: null, due: null }, "task.create")).toMatchObject({ title: "Review architecture", due: null });
  });

  it("rejects a Calendar proposal with an invalid time range", () => {
    expect(() => parseActionProposal({ kind: "calendar.create", calendarId: "primary", title: "Review", description: null, start: "2026-08-18T11:00:00.000Z", end: "2026-08-18T10:00:00.000Z", timeZone: "Asia/Jakarta", attendees: [], reminderMinutes: [] }, "calendar.create")).toThrow("invalid time range");
  });

  it("rejects action kinds the companion is not allowed to propose", () => {
    expect(() => parseActionProposal({ kind: "gmail.trash", messages: [] }, "gmail.trash")).toThrow("only propose");
  });
});
