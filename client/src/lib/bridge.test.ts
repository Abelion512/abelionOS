import { describe, expect, it } from "vitest";
import { canRequestProcessTermination, getBridgeStatus, type BridgeMetrics, type BridgeProcess } from "./bridge";

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
});
