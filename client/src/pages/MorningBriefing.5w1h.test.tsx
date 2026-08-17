// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getBridgeConfig: vi.fn(), health: vi.fn() }));

vi.mock("@/lib/bridge", () => ({ bridgeApi: { health: mocks.health }, getBridgeConfig: mocks.getBridgeConfig }));
vi.mock("@/lib/trpc", () => ({ trpc: { briefing: { get: { useQuery: () => ({ data: {
  generatedAt: new Date("2026-08-17T01:00:00.000Z"),
  window: { from: new Date("2026-08-17T01:00:00.000Z"), until: new Date("2026-08-18T01:00:00.000Z"), label: "Next 24 hours" },
  workspace: { calendarEvents: [{ id: "event-1", summary: "Launch review", start: "2026-08-17T02:00:00.000Z", end: "2026-08-17T02:30:00.000Z", organizer: "Abelion", attendees: ["Team"], location: "Studio", description: null, meetingUrl: null, htmlLink: null }], unreadInboxCount: 1, inboxMessages: [{ id: "mail-1", sender: "Project <project@example.com>", subject: "Launch checklist", receivedAt: "2026-08-17T01:30:00.000Z" }], source: { status: "ready", detail: "Calendar and Gmail metadata refreshed." } },
  activity: { events: [], source: { status: "ready", detail: "No application activity has been recorded yet." } },
  files: { recent: [], source: { status: "ready", detail: "No file metadata has been recorded yet." } },
}, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) } } } }));

import MorningBriefing from "./MorningBriefing";

describe("Morning Briefing 5W1H", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("separates Calendar and Gmail and exposes facts without rendering an email body", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    render(<MorningBriefing />);

    expect(screen.getByText("Google Calendar")).toBeTruthy();
    expect(screen.getByText("Gmail metadata")).toBeTruthy();
    expect(screen.getAllByText("Launch review").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Launch checklist").length).toBeGreaterThan(1);
    expect(screen.getAllByText("What").length).toBeGreaterThan(1);
    expect(screen.getAllByText("When").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Who").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Where").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Why / How").length).toBeGreaterThan(1);
    expect(screen.getByText(/Message bodies are not read\./)).toBeTruthy();
  });
});
