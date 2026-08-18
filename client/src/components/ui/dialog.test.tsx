// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

describe("Dialog surface", () => {
  afterEach(() => cleanup());

  it("uses an explicit opaque Mint Atelier surface for popup content", () => {
    render(<Dialog open><DialogContent><DialogTitle>Readable popup</DialogTitle><DialogDescription>Popup contrast test.</DialogDescription><p>Content remains visible.</p></DialogContent></Dialog>);
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.classList.contains("mint-dialog-surface")).toBe(true);
    expect(content?.classList.contains("bg-[#fffdf8]")).toBe(true);
    expect(content?.classList.contains("text-[#223126]")).toBe(true);
  });
});
