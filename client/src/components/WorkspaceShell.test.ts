import { describe, expect, it } from "vitest";
import { workspaceFooterItems, workspaceNavItems } from "./WorkspaceShell";

describe("Mintdesk workspace navigation", () => {
  it("keeps the sidebar focused on the approved six routes without Files or a separate Process menu", () => {
    const routes = [...workspaceNavItems, ...workspaceFooterItems];
    expect(routes.map((item) => item.label)).toEqual(["Dashboard", "Daily Focus", "Storage", "Activity", "Connections", "Settings"]);
    expect(routes.some((item) => item.label === "Files" || item.label === "System" || item.label === "Processes")).toBe(false);
  });
});
