// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getBridgeConfig: vi.fn(), health: vi.fn(), dailyFocus: vi.fn() }));

vi.mock("@/lib/bridge", () => ({ bridgeApi: { health: mocks.health, dailyFocus: mocks.dailyFocus }, getBridgeConfig: mocks.getBridgeConfig }));
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

  it("states local reasoning is unavailable before a request when the companion is not configured", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    render(<MorningBriefing />);
    expect(screen.getByText(/Local reasoning unavailable\. Add the Linux companion token/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Refine priorities/i })).toHaveProperty("disabled", true);
  });

  it("lets the user mark a structured priority as done without changing the source evidence", async () => {
    mocks.getBridgeConfig.mockReturnValue({ baseUrl: "http://127.0.0.1", token: "test" });
    mocks.health.mockResolvedValue({ ok: true, service: "mintdesk", version: "test" });
    mocks.dailyFocus.mockResolvedValue({ generatedAt: "2026-08-17T01:00:00.000Z", model: "claude-work", focus: { headline: "Focus review", priorities: [{ id: "p1", title: "Review launch", rationale: "Calendar event is scheduled.", nextStep: "Open calendar event.", confidence: "high", evidenceRefs: ["calendar:event-1"] }], tomorrowPreparation: [], yesterdayLessons: [], uncertainties: [] } });
    render(<MorningBriefing />);
    const refine = screen.getByRole("button", { name: /Refine priorities/i });
    await waitFor(() => expect(refine).toHaveProperty("disabled", false));
    fireEvent.click(refine);
    expect(await screen.findByText("Review launch")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mark Review launch done/i }));
    expect(screen.getByText("Marked done")).toBeTruthy();
    expect(screen.getAllByText("Launch review").length).toBeGreaterThan(0);
  });

  it("clears a prior local recommendation when companion or 9router reasoning fails", async () => {
    mocks.getBridgeConfig.mockReturnValue({ baseUrl: "http://127.0.0.1", token: "test" });
    mocks.health.mockResolvedValue({ ok: true, service: "mintdesk", version: "test" });
    mocks.dailyFocus
      .mockResolvedValueOnce({ generatedAt: "2026-08-17T01:00:00.000Z", model: "claude-work", focus: { headline: "Prior response", priorities: [{ id: "p1", title: "Old recommendation", rationale: "Evidence.", nextStep: "Review.", confidence: "high", evidenceRefs: ["calendar:event-1"] }], tomorrowPreparation: [], yesterdayLessons: [], uncertainties: [] } })
      .mockRejectedValueOnce(new Error("9router unavailable"));
    render(<MorningBriefing />);
    const refine = screen.getByRole("button", { name: /Refine priorities/i });
    await waitFor(() => expect(refine).toHaveProperty("disabled", false));
    fireEvent.click(refine);
    expect(await screen.findByText("Old recommendation")).toBeTruthy();
    fireEvent.click(refine);
    expect(await screen.findByText(/Local reasoning is unavailable\. Evidence remains visible/)).toBeTruthy();
    expect(screen.queryByText("Old recommendation")).toBeNull();
    expect(screen.queryByText("Prior response")).toBeNull();
  });
});
