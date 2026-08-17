import { describe, expect, it } from "vitest";
import { healthFailed, healthSucceeded, initialBridgeHealthState } from "./bridgeHealthState";

describe("Bridge health UI state", () => {
  it("starts unavailable until the companion responds", () => {
    expect(initialBridgeHealthState).toMatchObject({ online: false, detail: null, checkedAt: null });
  });

  it("records successful health checks and replaces state on a later polling failure", () => {
    const first = healthSucceeded({ ok: true, service: "mintdesk-bridge", version: "1.0.0" }, new Date("2026-08-17T00:00:00Z"));
    expect(first).toMatchObject({ online: true, detail: null });
    const refreshed = healthFailed(new Error("Network unavailable"), new Date("2026-08-17T00:00:15Z"));
    expect(refreshed).toMatchObject({ online: false, detail: "Network unavailable" });
    expect(refreshed.checkedAt?.toISOString()).toBe("2026-08-17T00:00:15.000Z");
  });
});
