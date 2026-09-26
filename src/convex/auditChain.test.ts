import { describe, it, expect } from "vitest";
import { computeChainHash, verifyChain } from "./auditChain";

// WebCrypto tidak ada di node 22 environment vitest? Node 18+ punya globalThis.crypto.
const mk = async (i: number) => ({
  _creationTime: 1700000000000 + i,
  userId: "u1",
  action: "test.action." + i,
  status: "accepted",
  detail: "d" + i,
  prevHash: "",
  hash: "",
  chainTime: 1700000000000 + i,
});

async function build(n: number) {
  const rows = [];
  let prev = "GENESIS";
  for (let i = 0; i < n; i++) {
    const r = await mk(i);
    r.prevHash = prev;
    r.hash = await computeChainHash(prev, r.chainTime, r.userId, r.action, r.status, r.detail);
    prev = r.hash;
    rows.push(r);
    await new Promise((res) => setTimeout(res, 0));
  }
  return rows;
}

describe("auditChain", () => {
  it("computeChainHash deterministik dan sensitif payload", async () => {
    const a = await computeChainHash("GENESIS", 1, "u1", "act", "accepted", "d");
    const b = await computeChainHash("GENESIS", 1, "u1", "act", "accepted", "d");
    const c = await computeChainHash("GENESIS", 1, "u1", "act", "accepted", "x");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("verifyChain lulus untuk rantai utuh", async () => {
    const rows = await build(5);
    const out = await verifyChain(rows);
    expect(out.valid).toBe(true);
    expect(out.brokenAt).toBeNull();
  });

  it("verifyChain mendeteksi detail yang diubah", async () => {
    const rows = await build(4);
    rows[2].detail = "TAMPERED";
    const out = await verifyChain(rows);
    expect(out.valid).toBe(false);
    expect(out.brokenAt).toBe(2);
    expect(out.valid).toBeTypeOf("boolean");
  });

  it("verifyChain mendeteksi event yang dihapus (putus rantai)", async () => {
    const rows = await build(4);
    const removed = rows.splice(1, 1);
    const out = await verifyChain(rows);
    expect(out.valid).toBe(false);
    void removed;
  });
});
