import { afterEach, describe, expect, it, vi } from "vitest";
import { __googleDailyFocusActionInternals } from "./googleDailyFocusActions";

describe("Daily Focus Google provider executor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects Calendar deletion when the event is not owned by the authenticated user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ organizer: { self: false } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(__googleDailyFocusActionInternals.executeProposal("token", {
      kind: "calendar.delete", calendarId: "primary", eventId: "shared-event", title: "Shared event", start: "2026-08-18T10:00:00.000Z", organizerSelf: true,
    })).rejects.toThrow("not owned");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves selected Gmail metadata to Trash rather than using a permanent-delete endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await __googleDailyFocusActionInternals.executeProposal("token", {
      kind: "gmail.trash", messages: [{ id: "mail-1", sender: "sender@example.com", subject: "Subject", receivedAt: "2026-08-18T10:00:00.000Z" }],
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/messages/mail-1/trash");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("delete");
  });
});
