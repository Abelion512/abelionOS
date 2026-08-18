// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBridgeConfig: vi.fn(), health: vi.fn(), dailyFocus: vi.fn(),
  devices: vi.fn(), actions: vi.fn(), enroll: vi.fn(), resumePairing: vi.fn(), requestProposal: vi.fn(), prepareTrash: vi.fn(), prepareDelete: vi.fn(), confirm: vi.fn(), reject: vi.fn(), invalidate: vi.fn(),
}));

vi.mock("@/lib/bridge", () => ({ bridgeApi: { health: mocks.health, dailyFocus: mocks.dailyFocus }, getBridgeConfig: mocks.getBridgeConfig }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ companionDevices: { list: { invalidate: mocks.invalidate } }, dailyFocusActions: { list: { invalidate: mocks.invalidate } } }),
    briefing: { get: { useQuery: () => ({
      data: {
        generatedAt: new Date("2026-08-17T01:00:00.000Z"),
        window: { from: new Date("2026-08-17T01:00:00.000Z"), until: new Date("2026-08-18T01:00:00.000Z"), label: "Next 24 hours" },
        workspace: {
          calendarEvents: [{ id: "event-1", summary: "Launch review", start: "2026-08-17T02:00:00.000Z", end: "2026-08-17T02:30:00.000Z", organizer: "Abelion", organizerSelf: true, attendees: ["Team"], location: "Studio", description: null, meetingUrl: null, htmlLink: null }],
          unreadInboxCount: 1,
          inboxMessages: [{ id: "mail-1", sender: "Project <project@example.com>", subject: "Launch checklist", receivedAt: "2026-08-17T01:30:00.000Z", isRead: false, bodyExcerpt: "Review the launch checklist before noon." }],
          readInboxMessages: [{ id: "mail-2", sender: "Archive <archive@example.com>", subject: "Completed notice", receivedAt: "2026-08-16T01:30:00.000Z", isRead: true, bodyExcerpt: null }],
          source: { status: "ready", detail: "Calendar and bounded Gmail content previews refreshed. Bodies are not stored." },
        },
        activity: { events: [], source: { status: "ready", detail: "No application activity has been recorded yet." } },
        files: { recent: [], source: { status: "ready", detail: "No file metadata has been recorded yet." } },
      },
      isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
    }) } },
    companionDevices: {
      list: { useQuery: () => ({ data: mocks.devices() }) },
      enroll: { useMutation: () => ({ mutate: mocks.enroll, isPending: false }) },
      resumePairing: { useMutation: () => ({ mutate: mocks.resumePairing, isPending: false }) },
    },
    dailyFocusActions: {
      list: { useQuery: () => ({ data: mocks.actions() }) },
      requestProposal: { useMutation: () => ({ mutate: mocks.requestProposal, isPending: false }) },
      prepareGmailTrash: { useMutation: () => ({ mutate: mocks.prepareTrash, isPending: false }) },
      prepareCalendarDelete: { useMutation: () => ({ mutate: mocks.prepareDelete, isPending: false }) },
      confirm: { useMutation: () => ({ mutate: mocks.confirm, isPending: false }) },
      reject: { useMutation: () => ({ mutate: mocks.reject, isPending: false }) },
    },
  },
}));

import MorningBriefing from "./MorningBriefing";

function openActionDesk() {
  fireEvent.click(screen.getByRole("button", { name: "Review actions" }));
}

describe("Morning Briefing 5W1H", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.devices.mockReturnValue([]); mocks.actions.mockReturnValue([]); });

  it("separates Calendar and Gmail and exposes bounded previews through on-demand detail", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    render(<MorningBriefing />);
    expect(screen.getByText("Google Calendar")).toBeTruthy();
    expect(screen.getByText("Gmail context")).toBeTruthy();
    expect(screen.getByText("Launch review")).toBeTruthy();
    expect(screen.getByText("Launch checklist")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Details" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[1]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Why / How")).toBeTruthy();
    expect(screen.getByText("Review the launch checklist before noon.")).toBeTruthy();
    expect(screen.getByText(/previews are fetched on open, not stored/i)).toBeTruthy();
  });

  it("states local reasoning is unavailable before a request when the companion is not configured", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    render(<MorningBriefing />);
    expect(screen.getByText(/Local reasoning unavailable\. Add the Linux companion token/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Refine priorities/i })).toHaveProperty("disabled", true);
  });

  it("keeps action capability in Daily Focus and asks for a reasoning device before any proposal is requested", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    render(<MorningBriefing />);
    openActionDesk();
    expect(screen.getAllByText("Turn intention into a reviewed change")).toHaveLength(2);
    expect(screen.getByText("Add a reasoning device")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Register/i })).toBeTruthy();
    expect(mocks.requestProposal).not.toHaveBeenCalled();
  });

  it("allows a replacement or server device to be registered without removing an existing device", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    mocks.devices.mockReturnValue([{ deviceId: "existing-device", name: "Mint laptop", deviceType: "laptop", online: true }]);
    render(<MorningBriefing />);
    openActionDesk();
    fireEvent.click(screen.getByRole("button", { name: "Add device" }));
    expect(screen.getByText("Add another reasoning device")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g. Mint laptop")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("shows one active reasoning device without a redundant device selector", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    mocks.devices.mockReturnValue([{ deviceId: "active-device", name: "Mint laptop", deviceType: "laptop", online: true }]);
    render(<MorningBriefing />);
    openActionDesk();
    expect(screen.getByText("Mint laptop · laptop · online")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Reasoning device" })).toBeNull();
  });

  it("keeps a pending browser pairing available after a reload without rendering its credential", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    mocks.devices.mockReturnValue([{ deviceId: "a3c98704-f361-44ac-a693-86ee70895a52", name: "Mint laptop", deviceType: "laptop", online: false, pendingPairing: true, pairingExpiresAt: new Date("2026-08-17T01:10:00.000Z") }]);
    render(<MorningBriefing />);
    openActionDesk();
    expect(screen.getByText(/Finish pairing Mint laptop/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pair this browser" })).toBeTruthy();
    expect(screen.queryByText(/MINTDESK_DEVICE_SECRET/i)).toBeNull();
  });

  it("does not leave browser pairing as an unbounded UI state when the local endpoint is unavailable", async () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    mocks.devices.mockReturnValue([{ deviceId: "a3c98704-f361-44ac-a693-86ee70895a52", name: "Mint laptop", deviceType: "laptop", online: false, pendingPairing: true, pairingExpiresAt: new Date("2026-08-17T01:10:00.000Z") }]);
    mocks.resumePairing.mockImplementation((_input: unknown) => undefined);
    render(<MorningBriefing />);
    openActionDesk();
    fireEvent.click(screen.getByRole("button", { name: "Pair this browser" }));
    expect(mocks.resumePairing).toHaveBeenCalledWith({ deviceId: "a3c98704-f361-44ac-a693-86ee70895a52" });
  });

  it("explains a provider-limited action without rendering the provider response", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    mocks.actions.mockReturnValue([{ id: 1, status: "error", proposalPayload: null, errorCode: "reasoner_provider_limited", expiresAt: new Date("2026-08-17T02:00:00.000Z") }]);
    render(<MorningBriefing />);
    openActionDesk();
    fireEvent.click(screen.getByRole("button", { name: "Open history" }));
    expect(screen.getByText(/selected local provider has no available quota/i)).toBeTruthy();
    expect(screen.queryByText(/prevent abuse of free resources/i)).toBeNull();
  });

  it("prepares a deletion review from an event Mintdesk created, even outside the current briefing window", () => {
    mocks.getBridgeConfig.mockReturnValue(null);
    mocks.actions.mockReturnValue([{ id: 3, kind: "calendar.create", status: "executed", providerResourceId: "created-event-1", proposalPayload: JSON.stringify({ kind: "calendar.create", calendarId: "primary", title: "Mintdesk verification event", start: "2026-08-19T07:00:00.000Z" }), errorCode: null, expiresAt: new Date("2026-08-17T02:00:00.000Z") }]);
    render(<MorningBriefing />);
    openActionDesk();
    fireEvent.click(screen.getByRole("button", { name: "Open history" }));
    const deletionButtons = screen.getAllByRole("button", { name: "Review deletion" });
    fireEvent.click(deletionButtons.at(-1)!);
    expect(mocks.prepareDelete).toHaveBeenCalledWith({ calendarId: "primary", eventId: "created-event-1", title: "Mintdesk verification event", start: "2026-08-19T07:00:00.000Z", organizerSelf: true });
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
