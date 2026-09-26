// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { BackendStatusNotice } from "./BackendStatusNotice";

const conn = vi.hoisted(() => ({ isWebSocketConnected: false }));

vi.mock("convex/react", () => ({
  useConvexConnectionState: () => ({ isWebSocketConnected: conn.isWebSocketConnected }),
}));

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("BackendStatusNotice", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    conn.isWebSocketConnected = false;
  });

  it("tidak muncul selama tenggang walau socket belum tersambung", async () => {
    vi.useFakeTimers();
    render(<BackendStatusNotice />);
    await advance(5_000);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("muncul setelah tenggang ketika WebSocket tidak pernah tersambung", async () => {
    vi.useFakeTimers();
    render(<BackendStatusNotice />);
    await advance(6_000);
    expect(screen.getByRole("status").textContent).toMatch(/belum tersambung/i);
    expect(screen.getByRole("status").textContent).toMatch(/VITE_CONVEX_URL/);
  });

  it("diam saat koneksi aktif", async () => {
    vi.useFakeTimers();
    conn.isWebSocketConnected = true;
    render(<BackendStatusNotice />);
    await advance(30_000);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
