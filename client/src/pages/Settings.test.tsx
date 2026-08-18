// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  updatePreferences: vi.fn(),
  invalidate: vi.fn(),
  requestPermission: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "owner@example.test" }, isAuthenticated: true }) }));
vi.mock("@/lib/bridge", () => ({ getBridgeConfig: () => null }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    google: { status: { useQuery: () => ({ data: { connected: false }, isLoading: false }) } },
    notifications: {
      preferences: { useQuery: () => ({ data: { inAppEnabled: true, browserEnabled: false, dailyFocusEnabled: true, companionEnabled: true, googleEnabled: true }, isLoading: false, isError: false }) },
      updatePreferences: { useMutation: () => ({ mutate: mocks.updatePreferences, isPending: false }) },
    },
    useUtils: () => ({ notifications: { preferences: { invalidate: mocks.invalidate } } }),
  },
}));

import Settings from "./Settings";

describe("Settings notifications", () => {
  beforeEach(() => {
    mocks.requestPermission.mockResolvedValue("granted");
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "default", requestPermission: mocks.requestPermission } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("requests browser permission only after the user explicitly enables browser alerts", async () => {
    render(<Settings />);
    expect(mocks.requestPermission).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("switch", { name: "Browser alerts" }));

    await waitFor(() => expect(mocks.requestPermission).toHaveBeenCalledTimes(1));
    expect(mocks.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ browserEnabled: true }));
  });
});
