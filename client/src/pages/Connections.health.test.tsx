// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ health: vi.fn(), getBridgeConfig: vi.fn(), invalidate: vi.fn(), mutate: vi.fn(), reset: vi.fn() }));

vi.mock("@/lib/bridge", () => ({ bridgeApi: { health: mocks.health }, getBridgeConfig: mocks.getBridgeConfig }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ google: { status: { invalidate: mocks.invalidate } }, briefing: { invalidate: mocks.invalidate } }), google: { status: { useQuery: () => ({ data: { connected: false }, isLoading: false }) }, disconnect: { useMutation: () => ({ mutate: mocks.mutate, reset: mocks.reset, isPending: false, error: null }) } } } }));

import Connections from "./Connections";

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe("Connections health polling", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it("renders unavailable and an explicit checking detail before the first health response", () => {
    vi.useFakeTimers();
    mocks.getBridgeConfig.mockReturnValue({ baseUrl: "http://127.0.0.1:18765", token: "token" });
    mocks.health.mockReturnValue(new Promise(() => undefined));
    render(<Connections />);
    expect(screen.getAllByText("unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Checking local companion health…")).toBeTruthy();
  });

  it("renders bridge details after success then shows fallback detail after a later poll failure", async () => {
    vi.useFakeTimers();
    mocks.getBridgeConfig.mockReturnValue({ baseUrl: "http://127.0.0.1:18765", token: "token" });
    mocks.health.mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.0" }).mockRejectedValueOnce(new Error("Bridge offline"));

    render(<Connections />);
    await flush();
    expect(screen.getByText("connected")).toBeTruthy();
    expect(screen.getByText(/responded to \/health/)).toBeTruthy();

    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    await flush();
    expect(screen.getAllByText("unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Bridge offline")).toBeTruthy();
  });
});
