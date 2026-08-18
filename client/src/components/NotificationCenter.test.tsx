// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  preferences: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  observeStatus: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      list: { useQuery: mocks.list },
      preferences: { useQuery: mocks.preferences },
      markRead: { useMutation: () => ({ mutate: mocks.markRead, isPending: false, isError: false }) },
      markAllRead: { useMutation: () => ({ mutate: mocks.markAllRead, isPending: false }) },
    },
    companionDevices: {
      observeStatus: { useMutation: () => ({ mutate: mocks.observeStatus }) },
    },
    useUtils: () => ({ notifications: { list: { invalidate: mocks.invalidate } } }),
  },
}));

import { NotificationCenter } from "./NotificationCenter";

describe("NotificationCenter", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("keeps a real empty inbox explicit instead of inventing a notification", () => {
    mocks.list.mockReturnValue({ data: { items: [], unreadCount: 0 }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() });
    mocks.preferences.mockReturnValue({ data: { browserEnabled: false } });

    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("No notifications yet. Mintdesk will add an entry only when a real operational event occurs.")).toBeTruthy();
    expect(mocks.observeStatus).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Refresh notifications" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark all read" })).toBeTruthy();
  });

  it("shows unread count and marks only the selected notification as read", () => {
    const createdAt = new Date("2026-08-18T06:00:00.000Z");
    mocks.list.mockReturnValue({ data: { items: [{ id: 41, title: "Daily Focus proposal is ready", body: "Review the prepared action before its confirmation window expires.", severity: "info", readAt: null, createdAt }], unreadCount: 1 }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() });
    mocks.preferences.mockReturnValue({ data: { browserEnabled: false } });

    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: "Open notifications, 1 unread" }));
    fireEvent.click(screen.getByText("Daily Focus proposal is ready"));

    expect(mocks.markRead).toHaveBeenCalledWith({ notificationId: 41 });
    expect(screen.getByText("1 unread")).toBeTruthy();
  });
});
