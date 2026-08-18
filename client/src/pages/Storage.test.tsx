// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ workdirStorage: vi.fn() }));
vi.mock("@/lib/bridge", () => ({ bridgeApi: { workdirStorage: mocks.workdirStorage } }));

import Storage from "./Storage";

describe("Storage observer", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("shows an unavailable state with the companion error instead of a fabricated folder listing", async () => {
    mocks.workdirStorage.mockRejectedValue(new Error("Observer cannot reach the configured workdir"));
    render(<Storage />);
    expect(await screen.findByText("Unavailable")).toBeTruthy();
    expect(screen.getByText("Observer cannot reach the configured workdir")).toBeTruthy();
    expect(screen.queryByText("Observed entries")).toBeNull();
  });

  it("keeps workdir metadata inside an on-demand detail dialog", async () => {
    mocks.workdirStorage.mockResolvedValue({ workdir: "/media/abelion/Isaf/ican/project", scannedAt: "2026-08-18T05:00:00.000Z", totalEntryCount: 4, entryLimit: 20, capacity: { usedPercent: 44, usedBytes: 44_000, totalBytes: 100_000, freeBytes: 56_000 }, entries: [{ name: "mintdesk", kind: "directory", sizeBytes: null, modifiedAt: "2026-08-18T04:00:00.000Z" }] });
    render(<Storage />);
    expect(await screen.findByText("4 entries observed")).toBeTruthy();
    expect(screen.queryByText("mintdesk")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Browse entries" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("mintdesk")).toBeTruthy();
  });
});
