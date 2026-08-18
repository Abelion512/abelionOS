import { describe, expect, it } from "vitest";
import { applyLoopbackPairing, isValidLoopbackPairing } from "./loopbackPairingPolicy.mjs";

const pairing = { deviceId: "a3c98704-f361-44ac-a693-86ee70895a52", deviceSecret: "NGG4lVCZVRTE2ooD5cLP85IXSqak0hLz5SoKe1CEBFI" };

describe("loopback pairing policy", () => {
  it("accepts only bounded UUID and URL-safe device secret values", () => {
    expect(isValidLoopbackPairing(pairing)).toBe(true);
    expect(isValidLoopbackPairing({ deviceId: "not-a-device", deviceSecret: "secret" })).toBe(false);
  });

  it("replaces only device credential entries and preserves the local router token", () => {
    const next = applyLoopbackPairing("MINTDESK_DEVICE_ID=old\nMINTDESK_DEVICE_SECRET=old\nMINTDESK_9ROUTER_TOKEN=local-only\n", pairing);
    expect(next).toContain(`MINTDESK_DEVICE_ID=${pairing.deviceId}`);
    expect(next).toContain(`MINTDESK_DEVICE_SECRET=${pairing.deviceSecret}`);
    expect(next).toContain("MINTDESK_9ROUTER_TOKEN=local-only");
  });
});
