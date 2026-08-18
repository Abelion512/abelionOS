// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auditList: vi.fn(), localAudit: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { audit: { list: { useQuery: mocks.auditList } } } }));
vi.mock("@/lib/bridge", () => ({ bridgeApi: { audit: mocks.localAudit } }));

import Activity from "./Activity";

describe("Activity operational layout", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("shows loading and local audit error states without fabricating audit events", async () => {
    mocks.auditList.mockReturnValue({ isLoading: true, error: null, data: undefined });
    mocks.localAudit.mockRejectedValue(new Error("Companion offline"));
    render(<Activity />);
    expect(screen.getByText("Loading audit events…")).toBeTruthy();
    expect(await screen.findByText("Local audit unavailable.")).toBeTruthy();
    expect(screen.getByText("Companion offline")).toBeTruthy();
  });

  it("renders separate empty application and companion sources", async () => {
    mocks.auditList.mockReturnValue({ isLoading: false, error: null, data: [] });
    mocks.localAudit.mockResolvedValue({ events: [] });
    render(<Activity />);
    expect(screen.getByText("No application events.")).toBeTruthy();
    expect(await screen.findByText("No local events.")).toBeTruthy();
  });

  it("renders recorded application actions with their real source metadata", async () => {
    mocks.auditList.mockReturnValue({ isLoading: false, error: null, data: [{ id: 1, action: "daily_focus.action.executed", resourceType: "daily_focus_action", resourceId: "120004", status: "accepted", createdAt: "2026-08-18T05:00:00.000Z" }] });
    mocks.localAudit.mockResolvedValue({ events: [] });
    render(<Activity />);
    expect(screen.getByText("daily_focus.action.executed")).toBeTruthy();
    expect(screen.getByText(/daily_focus_action · 120004 · accepted/)).toBeTruthy();
    const detailTrigger = screen.getByRole("button", { name: "Details" });
    fireEvent.click(detailTrigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Application audit record")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(detailTrigger);
    expect(await screen.findByText("No local events.")).toBeTruthy();
  });

  it("opens a constrained detail dialog at the mobile breakpoint", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    mocks.auditList.mockReturnValue({ isLoading: false, error: null, data: [{ id: 7, action: "daily_focus.proposal.ready", resourceType: "daily_focus_action", resourceId: "7", status: "accepted", createdAt: "2026-08-18T05:00:00.000Z" }] });
    mocks.localAudit.mockResolvedValue({ events: [] });
    render(<Activity />);
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.classList.contains("detail-dialog")).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
