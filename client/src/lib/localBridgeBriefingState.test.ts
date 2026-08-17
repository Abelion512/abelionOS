import { describe, expect, it } from "vitest";
import { getLocalBridgeBriefingSource } from "./localBridgeBriefingState";

describe("local bridge briefing source", () => {
  it("does not report a local bridge as ready before a browser-local health response exists", () => {
    expect(getLocalBridgeBriefingSource({ loading: false, health: null, error: null, configured: false })).toEqual({ status: "unavailable", detail: "No Linux companion token is configured in this browser." });
  });

  it("uses the real health response to report the companion snapshot", () => {
    expect(getLocalBridgeBriefingSource({ loading: false, health: { ok: true, service: "mintdesk-bridge", version: "1.0.1" }, error: null, configured: true })).toEqual({ status: "ready", detail: "mintdesk-bridge 1.0.1 responded from this browser's local companion." });
  });
});
