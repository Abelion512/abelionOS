import { afterEach, describe, expect, it, vi } from "vitest";
import { BRIDGE_REQUEST_TIMEOUT_MS, canRequestProcessTermination, fetchBridgeWithTimeout, getBridgeStatus, type BridgeMetrics, type BridgeProcess } from "./bridge";

const metrics: BridgeMetrics = {
  hostname: "linux-host",
  platform: "linux",
  arch: "x64",
  cpuPercent: 12,
  memory: { usedBytes: 100, totalBytes: 200, usedPercent: 50 },
  uptimeSeconds: 60,
  loadAverage: [0.3],
  checkedAt: "2026-08-17T00:00:00.000Z",
};

const process: BridgeProcess = {
  pid: 4242,
  command: "code",
  cpuPercent: 1,
  memoryPercent: 2,
  user: "abelion",
  state: "S",
  elapsed: "01:00",
  canTerminate: true,
};

describe("phase 1 bridge contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("represents a connected bridge only when metrics exist", () => {
    expect(getBridgeStatus(metrics, null)).toBe("connected");
    expect(getBridgeStatus(null, null)).toBe("unavailable");
    expect(getBridgeStatus(null, "connection refused")).toBe("error");
  });

  it("allows process action only for a valid bridge-approved process", () => {
    expect(canRequestProcessTermination(process)).toBe(true);
    expect(canRequestProcessTermination({ ...process, canTerminate: false })).toBe(false);
    expect(canRequestProcessTermination({ ...process, pid: 1 })).toBe(false);
    expect(canRequestProcessTermination({ ...process, command: "" })).toBe(false);
  });

  it("turns an unresponsive local bridge request into an actionable timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));

    const request = fetchBridgeWithTimeout("http://127.0.0.1:18765/health", { headers: { Authorization: "Bearer test-token" } });
    const timeoutAssertion = expect(request).rejects.toThrow("Linux companion request timed out after 5 seconds");
    await vi.advanceTimersByTimeAsync(BRIDGE_REQUEST_TIMEOUT_MS);
    await timeoutAssertion;
  });
});
