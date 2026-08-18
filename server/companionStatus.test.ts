import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markStale: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("./db", () => ({ markStaleCompanionDevicesOffline: mocks.markStale }));
vi.mock("./notifications", () => ({ publishUserNotification: mocks.publish }));

import { observeUserCompanionStatus } from "./companionStatus";

describe("observeUserCompanionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publish.mockResolvedValue(null);
  });

  it("creates one metadata-only offline event for devices that atomically crossed the stale boundary", async () => {
    mocks.markStale.mockResolvedValue([{ deviceId: "laptop-1" }, { deviceId: "server-1" }]);

    const result = await observeUserCompanionStatus(27);

    expect(result).toEqual({ offlineDeviceIds: ["laptop-1", "server-1"] });
    expect(mocks.publish).toHaveBeenCalledTimes(2);
    expect(mocks.publish).toHaveBeenCalledWith({ userId: 27, event: "companion.offline", resourceType: "companion_device", resourceId: "laptop-1" });
    expect(JSON.stringify(mocks.publish.mock.calls)).not.toMatch(/token|credential|gmail|prompt/i);
  });

  it("does not create a duplicate offline event when no device state transition is returned", async () => {
    mocks.markStale.mockResolvedValue([]);

    await expect(observeUserCompanionStatus(27)).resolves.toEqual({ offlineDeviceIds: [] });
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
