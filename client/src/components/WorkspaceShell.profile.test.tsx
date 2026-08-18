// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Abelion", email: "agen.salva@gmail.com" }, isAuthenticated: true }),
}));

import { WorkspaceShell } from "./WorkspaceShell";

describe("Workspace profile menu", () => {
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
    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeTruthy();
  });
});
