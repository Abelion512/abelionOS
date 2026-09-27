// @vitest-environment jsdom
// Pin konsistensi registry capability: daftar chip di Settings harus persis
// gabungan registry backend (productReadLogic) — drift UI↔backend membuat
// capability yang di-set owner ditolak normalizeAllowlist di server.
import { describe, expect, it } from "vitest";
import {
  PRODUCT_PROPOSAL_CAPABILITIES,
  PRODUCT_READ_CAPABILITIES,
} from "@/convex/productReadLogic";
import { PRODUCT_CAPABILITIES } from "./SettingsPage";

describe("Registry capability Settings ↔ backend", () => {
  it("chip Settings persis gabungan registry read (F3) + proposal (F4)", () => {
    expect(PRODUCT_CAPABILITIES).toEqual([
      ...PRODUCT_READ_CAPABILITIES,
      ...PRODUCT_PROPOSAL_CAPABILITIES,
    ]);
  });

  it("registry tidak memuat capability destruktif", () => {
    for (const cap of PRODUCT_CAPABILITIES) {
      expect(cap).not.toMatch(/delete|trash|send/);
    }
  });
});
