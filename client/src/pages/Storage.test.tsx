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
    const entries = Array.from({ length: 9 }, (_, index) => ({ name: `entry-${index + 1}`, kind: "directory", sizeBytes: null, modifiedAt: "2026-08-18T04:00:00.000Z" }));
    mocks.workdirStorage.mockResolvedValue({ workdir: "/media/abelion/Isaf/ican/project", scannedAt: "2026-08-18T05:00:00.000Z", totalEntryCount: 9, entryLimit: 20, capacity: { usedPercent: 44, usedBytes: 44_000, totalBytes: 100_000, freeBytes: 56_000 }, entries });
    render(<Storage />);
    expect(await screen.findByText("9 entries observed")).toBeTruthy();
    expect(screen.queryByText("entry-1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Browse entries" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("entry-1")).toBeTruthy();
    expect(screen.queryByText("entry-9")).toBeNull();
    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("entry-9")).toBeTruthy();
    expect(screen.queryByText("entry-1")).toBeNull();
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
  });

  it("keeps pagination controls inside the constrained 375px detail dialog", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    const entries = Array.from({ length: 9 }, (_, index) => ({ name: `mobile-entry-${index + 1}`, kind: "directory", sizeBytes: null, modifiedAt: "2026-08-18T04:00:00.000Z" }));
    mocks.workdirStorage.mockResolvedValue({ workdir: "/media/abelion/Isaf/ican/project", scannedAt: "2026-08-18T05:00:00.000Z", totalEntryCount: 9, entryLimit: 20, capacity: { usedPercent: 44, usedBytes: 44_000, totalBytes: 100_000, freeBytes: 56_000 }, entries });
    render(<Storage />);
    await screen.findByText("9 entries observed");
    fireEvent.click(screen.getByRole("button", { name: "Browse entries" }));
    expect(screen.getByRole("dialog").classList.contains("detail-dialog")).toBe(true);
    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  });
});
