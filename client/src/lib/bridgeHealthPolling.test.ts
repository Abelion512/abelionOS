import { afterEach, describe, expect, it, vi } from "vitest";
import { startBridgeHealthPolling } from "./bridgeHealthPolling";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("shared bridge health poller", () => {
  afterEach(() => vi.useRealTimers());

  it("runs immediately, refreshes on interval, updates timestamps, and falls back after a later failure", async () => {
    vi.useFakeTimers();
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.0" })
      .mockRejectedValueOnce(new Error("Bridge offline"));
    const onState = vi.fn();
    const now = vi.fn().mockReturnValueOnce(new Date("2026-08-17T00:00:00Z")).mockReturnValueOnce(new Date("2026-08-17T00:00:15Z"));

    const stop = startBridgeHealthPolling({ request, onState, intervalMs: 15_000, now });
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ online: true, checkedAt: new Date("2026-08-17T00:00:00Z") }));

    await vi.advanceTimersByTimeAsync(15_000);
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ online: false, detail: "Bridge offline", checkedAt: new Date("2026-08-17T00:00:15Z") }));

    stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
