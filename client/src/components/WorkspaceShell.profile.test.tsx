// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Abelion", email: "agen.salva@gmail.com" }, isAuthenticated: true }),
}));

vi.mock("@/components/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

import { WorkspaceShell } from "./WorkspaceShell";

describe("Workspace profile menu", () => {
  afterEach(() => cleanup());

  it("keeps secondary navigation in an accessible profile popover", async () => {
    render(<WorkspaceShell><main>Workspace content</main></WorkspaceShell>);
    expect(screen.queryByText("Connections")).toBeNull();
    expect(screen.queryByText("Evidence before advice")).toBeNull();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Open profile menu" }), { button: 0, ctrlKey: false });
    expect(await screen.findByText("Connections")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("collapses desktop navigation to icons and persists the preference", () => {
    window.localStorage.clear();
    const { container } = render(<WorkspaceShell><main>Workspace content</main></WorkspaceShell>);
    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(container.querySelector(".desktop-shell")?.classList.contains("sidebar-is-collapsed")).toBe(true);
    expect(window.localStorage.getItem("mintdesk.sidebar.collapsed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
    expect(container.querySelector(".desktop-shell")?.classList.contains("sidebar-is-collapsed")).toBe(false);
    expect(window.localStorage.getItem("mintdesk.sidebar.collapsed")).toBe("false");
    expect(screen.getByRole("button", { name: "Collapse navigation" })).toBeTruthy();
  });

  it("opens the mobile drawer without losing the active workspace route", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    const { container } = render(<WorkspaceShell><main>Workspace content</main></WorkspaceShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(container.querySelector(".sidebar")?.classList.contains("sidebar-open")).toBe(true);
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(container.querySelector(".mobile-scrim")!);
    expect(container.querySelector(".sidebar")?.classList.contains("sidebar-open")).toBe(false);
  });
});
