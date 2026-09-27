import { describe, expect, it } from "vitest";
import {
  MAX_EVENTS_ITEMS,
  MAX_EVENTS_WINDOW_DAYS,
  PRODUCT_PROPOSAL_CAPABILITIES,
  PRODUCT_READ_CAPABILITIES,
  PROPOSAL_MIN_INTERVAL_MS,
  boundsForEvents,
  firstActiveAccount,
  isIsoTimestamp,
  isRateLimited,
  normalizeAllowlist,
  proposalKindForCapability,
  requireCapability,
  requireProposalCapability,
  requiredGoogleScope,
  requiredGoogleScopeForProposal,
} from "./productReadLogic";

describe("requireCapability", () => {
  const allowlist = ["calendar.read.list", "calendar.read.events"];

  it("menerima capability yang ada di allowlist produk", () => {
    expect(() => requireCapability(allowlist, "calendar.read.list")).not.toThrow();
    expect(() => requireCapability(allowlist, "calendar.read.events")).not.toThrow();
  });

  it("deny-by-default: allowlist kosong menolak semua", () => {
    expect(() => requireCapability([], "calendar.read.list")).toThrow(
      /Capability tidak diizinkan/
    );
  });

  it("menolak capability yang tidak ada di allowlist produk ini", () => {
    expect(() => requireCapability(["calendar.read.list"], "calendar.read.events")).toThrow(
      /Capability tidak diizinkan/
    );
  });

  it("menolak capability yang tidak dikenal (tidak terdaftar)", () => {
    expect(() => requireCapability(PRODUCT_READ_CAPABILITIES as unknown as string[], "gmail.read.metadata")).toThrow(
      /tidak dikenal/
    );
  });

  it("menolak wildcard — tidak ada bypass pattern", () => {
    expect(() => requireCapability(["*"], "calendar.read.list")).toThrow(/tidak diizinkan/);
  });
});

describe("requiredGoogleScope", () => {
  it("memetakan capability ke scope OAuth minimum yang sesuai", () => {
    expect(requiredGoogleScope("calendar.read.list")).toBe(
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
    );
    expect(requiredGoogleScope("calendar.read.events")).toBe(
      "https://www.googleapis.com/auth/calendar.events.readonly"
    );
  });

  it("whitelist capability persis sesuai justifikasi abelink (F3)", () => {
    expect([...PRODUCT_READ_CAPABILITIES]).toEqual([
      "calendar.read.list",
      "calendar.read.events",
    ]);
  });
});

describe("normalizeAllowlist", () => {
  it("menerima, dedupe, dan mempertahankan urutan capability terdaftar", () => {
    expect(normalizeAllowlist(["calendar.read.events", "calendar.read.list", "calendar.read.events"])).toEqual(
      ["calendar.read.events", "calendar.read.list"]
    );
  });

  it("menolak capability di luar registry F3 (tidak ada jalur wildcard)", () => {
    expect(() => normalizeAllowlist(["gmail.read.metadata"])).toThrow(/tidak dikenal/);
    expect(() => normalizeAllowlist(["*"])).toThrow(/tidak dikenal/);
  });

  it("menerima allowlist kosong — deny-by-default adalah state valid", () => {
    expect(normalizeAllowlist([])).toEqual([]);
  });
});

describe("boundsForEvents", () => {
  const now = Date.parse("2026-09-27T10:00:00Z");
  const DAY = 24 * 60 * 60 * 1000;

  it("default window: now → now+7 hari", () => {
    const b = boundsForEvents(now, {});
    expect(b.timeMin).toBe("2026-09-27T10:00:00.000Z");
    expect(b.timeMax).toBe("2026-10-04T10:00:00.000Z");
  });

  it("mengikuti timeMin/timeMax yang diberikan", () => {
    const b = boundsForEvents(now, {
      timeMin: "2026-09-28T00:00:00Z",
      timeMax: "2026-09-30T00:00:00Z",
    });
    expect(b.timeMin).toBe("2026-09-28T00:00:00.000Z");
    expect(b.timeMax).toBe("2026-09-30T00:00:00.000Z");
  });

  it("clamp window melebihi 7 hari", () => {
    const b = boundsForEvents(now, {
      timeMin: "2026-09-01T00:00:00Z",
      timeMax: "2026-09-30T00:00:00Z",
    });
    const span = Date.parse(b.timeMax) - Date.parse(b.timeMin);
    expect(span).toBe(7 * DAY);
  });

  it("membalik window terbalik menjadi rentang valid", () => {
    const b = boundsForEvents(now, {
      timeMin: "2026-09-30T00:00:00Z",
      timeMax: "2026-09-28T00:00:00Z",
    });
    expect(Date.parse(b.timeMin)).toBeLessThan(Date.parse(b.timeMax));
  });

  it("menolak ISO yang tidak valid", () => {
    expect(() => boundsForEvents(now, { timeMin: "bukan-tanggal" })).toThrow(/ISO 8601/);
  });

  it("maxResults selalu terbatas pada konstanta", () => {
    expect(boundsForEvents(now, {}).maxResults).toBe(MAX_EVENTS_ITEMS);
    expect(MAX_EVENTS_ITEMS).toBe(25);
    expect(MAX_EVENTS_WINDOW_DAYS).toBe(7);
  });
});

describe("isIsoTimestamp", () => {
  it("menerima ISO date/datetime valid", () => {
    expect(isIsoTimestamp("2026-09-27T10:00:00Z")).toBe(true);
    expect(isIsoTimestamp("2026-09-27")).toBe(true);
  });

  it("menolak string non-tanggal (jalan masuk 400, bukan 500)", () => {
    expect(isIsoTimestamp("bukan-tanggal")).toBe(false);
    expect(isIsoTimestamp("")).toBe(false);
  });
});

describe("firstActiveAccount", () => {
  const row = (over: Partial<{ status: string }> = {}) => ({ status: "active", ...over });

  it("mengabaikan akun non-aktif sebelum akun aktif — kegagalan satu akun tidak memblokir lainnya", () => {
    const rows = [row({ status: "expired" }), row({ status: "error" }), row()];
    expect(firstActiveAccount(rows)?.status).toBe("active");
  });

  it("mengembalikan null bila tidak ada akun aktif", () => {
    expect(firstActiveAccount([row({ status: "disconnected" })])).toBeNull();
    expect(firstActiveAccount([])).toBeNull();
  });
});

describe("F4 proposal capabilities", () => {
  it("registry persis dua: create calendar + create task — tanpa kind destruktif", () => {
    expect([...PRODUCT_PROPOSAL_CAPABILITIES]).toEqual([
      "calendar.create.proposal",
      "task.create.proposal",
    ]);
  });

  it("kind payload wajib cocok capability", () => {
    expect(proposalKindForCapability("calendar.create.proposal")).toBe("calendar.create");
    expect(proposalKindForCapability("task.create.proposal")).toBe("task.create");
  });

  it("scope minimum persis REQUIRED_SCOPES proposal schema", () => {
    expect(requiredGoogleScopeForProposal("calendar.create.proposal")).toBe(
      "https://www.googleapis.com/auth/calendar.events.owned"
    );
    expect(requiredGoogleScopeForProposal("task.create.proposal")).toBe(
      "https://www.googleapis.com/auth/tasks"
    );
  });

  it("requireProposalCapability deny-by-default dan menolak kind destruktif", () => {
    expect(() =>
      requireProposalCapability(["calendar.create.proposal"], "calendar.create.proposal")
    ).not.toThrow();
    expect(() => requireProposalCapability([], "task.create.proposal")).toThrow(
      /tidak diizinkan/
    );
    expect(() =>
      requireProposalCapability(["calendar.create.proposal"], "gmail.trash")
    ).toThrow(/tidak dikenal/);
  });

  it("normalizeAllowlist menerima capability proposal (F4) di samping read (F3)", () => {
    expect(normalizeAllowlist(["calendar.read.list", "task.create.proposal"])).toEqual([
      "calendar.read.list",
      "task.create.proposal",
    ]);
  });

  it("jeda minimum proposal lebih ketat daripada read", () => {
    expect(PROPOSAL_MIN_INTERVAL_MS).toBeGreaterThan(2_000);
    // Rate limit proposal memakai isRateLimited dengan interval proposal.
    expect(isRateLimited(1_000_000, 1_000_000 + PROPOSAL_MIN_INTERVAL_MS - 1, PROPOSAL_MIN_INTERVAL_MS)).toBe(true);
    expect(isRateLimited(1_000_000, 1_000_000 + PROPOSAL_MIN_INTERVAL_MS, PROPOSAL_MIN_INTERVAL_MS)).toBe(false);
  });
});

describe("isRateLimited", () => {
  const READ_MIN_INTERVAL_MS = 2_000;

  it("request pertama (tanpa lastReadAt) tidak dibatasi", () => {
    expect(isRateLimited(undefined, 1_000_000)).toBe(false);
  });

  it("dibatasi bila kurang dari jeda minimum", () => {
    expect(isRateLimited(1_000_000, 1_001_999)).toBe(true);
  });

  it("tidak dibatasi setelah jeda minimum terlampaui", () => {
    expect(isRateLimited(1_000_000, 1_002_000)).toBe(false);
  });
});
