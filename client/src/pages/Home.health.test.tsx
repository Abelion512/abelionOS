// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ health: vi.fn(), metrics: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Test User", email: "test@example.com" }, loading: false, isAuthenticated: true }) }));
vi.mock("@/components/ProcessPanel", () => ({ ProcessPanel: () => <div>Process panel</div> }));
vi.mock("@/lib/bridge", () => ({ bridgeApi: { health: mocks.health, metrics: mocks.metrics } }));

import Home from "./Home";

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe("Overview health polling", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it("renders unavailable before the first health request settles", () => {
    vi.useFakeTimers();
    mocks.health.mockReturnValue(new Promise(() => undefined));
    mocks.metrics.mockReturnValue(new Promise(() => undefined));
    render(<Home />);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText(/Connect the Linux/)).toBeTruthy();
  });

  it("renders connected health then switches to unavailable after the next poll fails", async () => {
    vi.useFakeTimers();
    mocks.health
      .mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.0" })
      .mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.0" })
      .mockRejectedValueOnce(new Error("Bridge offline"));
    mocks.metrics.mockResolvedValue({ hostname: "linux", platform: "linux", arch: "x64", cpuPercent: 20, memory: { usedBytes: 1, totalBytes: 2, usedPercent: 50 }, uptimeSeconds: 10, loadAverage: [0.1], checkedAt: new Date().toISOString() });

    render(<Home />);
    await flush();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getAllByText(/Health checked/).length).toBeGreaterThan(0);

    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    await flush();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Bridge offline")).toBeTruthy();
  });
});
