// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ workdirStorage: vi.fn() }));
vi.mock("@/lib/bridge", () => ({ bridgeApi: { workdirStorage: mocks.workdirStorage } }));

import Storage from "./Storage";

describe("Storage observer", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("shows Workdir unavailable with the companion error instead of a fabricated folder listing", async () => {
    mocks.workdirStorage.mockRejectedValue(new Error("Observer cannot reach the configured workdir"));
    render(<Storage />);
    expect(await screen.findByText("Workdir unavailable")).toBeTruthy();
    expect(screen.getByText("Observer cannot reach the configured workdir")).toBeTruthy();
    expect(screen.queryByText("Observed entries")).toBeNull();
  });
});
