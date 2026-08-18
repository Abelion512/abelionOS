// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ health: vi.fn(), metrics: vi.fn(), googleStatus: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Test User", email: "test@example.com" }, loading: false, isAuthenticated: true }) }));
vi.mock("@/components/ProcessPanel", () => ({ ProcessPanel: () => <div>Process panel</div> }));
vi.mock("@/lib/bridge", () => ({ bridgeApi: { health: mocks.health, metrics: mocks.metrics } }));
vi.mock("@/lib/trpc", () => ({ trpc: { google: { status: { useQuery: mocks.googleStatus } } } }));

import Home from "./Home";

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe("Overview health polling", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it("renders unavailable before the first health request settles", () => {
    vi.useFakeTimers();
    mocks.googleStatus.mockReturnValue({ data: { connected: false, scopes: [] }, isLoading: false });
    mocks.health.mockReturnValue(new Promise(() => undefined));
    mocks.metrics.mockReturnValue(new Promise(() => undefined));
    render(<Home />);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("No bridge")).toBeTruthy();
    expect(screen.queryByText("Weather is unavailable.")).toBeNull();
  });

  it("renders connected health then refreshes when the dashboard becomes visible", async () => {
    vi.useFakeTimers();
    mocks.health
      .mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.0" })
      .mockRejectedValueOnce(new Error("Bridge offline"));
    mocks.metrics.mockResolvedValue({ hostname: "linux", platform: "linux", arch: "x64", cpuPercent: 20, memory: { usedBytes: 1, totalBytes: 2, usedPercent: 50 }, uptimeSeconds: 10, loadAverage: [0.1], checkedAt: new Date().toISOString() });
    mocks.googleStatus.mockReturnValue({ data: { connected: true, scopes: ["https://www.googleapis.com/auth/gmail.modify"] }, isLoading: false });

    render(<Home />);
    await flush();
    expect(screen.getByRole("heading", { name: "linux" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Google" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /refresh linux/i })).toBeNull();

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await flush();
    expect(screen.getByText("No bridge")).toBeTruthy();
    expect(screen.getByText("Bridge offline")).toBeTruthy();
  });
});
