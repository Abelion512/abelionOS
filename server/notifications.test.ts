import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  getEffectiveNotificationPreferences: vi.fn(),
}));

vi.mock("./db", () => ({
  createNotification: mocks.createNotification,
  getEffectiveNotificationPreferences: mocks.getEffectiveNotificationPreferences,
}));

import { publishUserNotification } from "./notifications";

const enabledPreferences = {
  inAppEnabled: true,
  browserEnabled: false,
  dailyFocusEnabled: true,
  companionEnabled: true,
  googleEnabled: true,
};

describe("publishUserNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEffectiveNotificationPreferences.mockResolvedValue(enabledPreferences);
    mocks.createNotification.mockResolvedValue({ id: 1 });
  });

  it("records a metadata-only Daily Focus completion for the owning user", async () => {
    await publishUserNotification({ userId: 14, event: "daily_focus.action.executed", resourceType: "daily_focus_action", resourceId: "120004" });

    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 14,
      category: "daily_focus",
      severity: "success",
      title: "Daily Focus action completed",
      resourceType: "daily_focus_action",
      resourceId: "120004",
    }));
    expect(mocks.createNotification.mock.calls[0]?.[0].body).not.toMatch(/gmail|token|credential|prompt/i);
  });

  it("respects a disabled category instead of creating a notification", async () => {
    mocks.getEffectiveNotificationPreferences.mockResolvedValue({ ...enabledPreferences, companionEnabled: false });

    const result = await publishUserNotification({ userId: 14, event: "companion.online", resourceType: "companion_device", resourceId: "device-1" });

    expect(result).toBeNull();
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("does not break the underlying user action when notification persistence is unavailable", async () => {
    mocks.createNotification.mockRejectedValue(new Error("Database unavailable"));

    await expect(publishUserNotification({ userId: 14, event: "google.connected", resourceType: "google_connection" })).resolves.toBeNull();
  });
});
