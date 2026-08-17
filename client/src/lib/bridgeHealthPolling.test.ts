import { afterEach, describe, expect, it, vi } from "vitest";
import { startBridgeHealthPolling } from "./bridgeHealthPolling";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("shared bridge health poller", () => {
  afterEach(() => vi.useRealTimers());

  it("runs immediately, refreshes on interval, falls back after a failure, and recovers on the next success", async () => {
    vi.useFakeTimers();
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.0" })
      .mockRejectedValueOnce(new Error("Bridge offline"))
      .mockResolvedValueOnce({ ok: true, service: "mintdesk-bridge", version: "1.0.1" });
    const onState = vi.fn();
    const now = vi.fn().mockReturnValueOnce(new Date("2026-08-17T00:00:00Z")).mockReturnValueOnce(new Date("2026-08-17T00:00:15Z")).mockReturnValueOnce(new Date("2026-08-17T00:00:30Z"));

    const stop = startBridgeHealthPolling({ request, onState, intervalMs: 15_000, now });
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ online: true, checkedAt: new Date("2026-08-17T00:00:00Z") }));

    await vi.advanceTimersByTimeAsync(15_000);
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ online: false, detail: "Bridge offline", checkedAt: new Date("2026-08-17T00:00:15Z") }));

    await vi.advanceTimersByTimeAsync(15_000);
    await flush();
    expect(request).toHaveBeenCalledTimes(3);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ online: true, detail: null, checkedAt: new Date("2026-08-17T00:00:30Z") }));

    stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(request).toHaveBeenCalledTimes(3);
  });
});
