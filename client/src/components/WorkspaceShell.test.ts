import { describe, expect, it } from "vitest";
import { workspaceNavItems, workspaceProfileItems } from "./WorkspaceShell";

describe("Mintdesk workspace navigation", () => {
  it("keeps the sidebar focused on core workspace routes and moves Connections/Settings to the profile menu", () => {
    const routes = [...workspaceNavItems, ...workspaceProfileItems];
    expect(routes.map((item) => item.label)).toEqual(["Dashboard", "Daily Focus", "Storage", "Activity", "Connections", "Settings"]);
    expect(workspaceNavItems.map((item) => item.label)).toEqual(["Dashboard", "Daily Focus", "Storage", "Activity"]);
    expect(routes.some((item) => item.label === "Files" || item.label === "System" || item.label === "Processes")).toBe(false);
  });
});
