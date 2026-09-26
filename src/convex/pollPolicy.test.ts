import { describe, it, expect } from "vitest";
import {
  pollDecision,
  backoffAfterFailure,
  recoverAfterSuccess,
  selectDueSources,
  POLL_FLOOR_MS,
  POLL_CEILING_MS,
  BACKOFF_CEILING_MS,
  MAX_POLLS_PER_RUN,
} from "./pollPolicy";

const now = 1_000_000_000;

describe("pollPolicy", () => {
  it("sumber baru due segera — berita pertama < 5 menit", () => {
    const d = pollDecision({}, now, true);
    expect(d.due).toBe(true);
    expect(d.reason).toBe("never-fetched");
    // Cron 5 menit: run pertama langsung mengambil semua sumber.
    expect(POLL_FLOOR_MS).toBe(5 * 60 * 1000);
  });

  it("belum due saat elapsed < interval", () => {
    const state = { intervalMs: 20 * 60 * 1000, lastFetchedAt: now - 10 * 60 * 1000 };
    const d = pollDecision(state, now, true);
    expect(d.due).toBe(false);
    expect(d.reason).toBe("waiting");
  });

  it("due saat interval terlampaui", () => {
    const state = { intervalMs: POLL_FLOOR_MS, lastFetchedAt: now - POLL_FLOOR_MS };
    const d = pollDecision(state, now, true);
    expect(d.due).toBe(true);
    expect(d.reason).toBe("interval-elapsed");
  });

  it("tanpa budget run, sumber due dilewati dengan alasan eksplisit", () => {
    const state = { intervalMs: POLL_FLOOR_MS, lastFetchedAt: now - POLL_FLOOR_MS };
    const d = pollDecision(state, now, false);
    expect(d.due).toBe(false);
    expect(d.reason).toBe("capped-by-run-limit");
  });

  it("sukses menaikkan interval bertahap sampai ceiling 20 menit", () => {
    // 5 → 7.5 → 11.25 → 16.875 → 20 (dibulatkan ribuan) — tangga sukses.
    expect(recoverAfterSuccess(POLL_FLOOR_MS)).toBe(7.5 * 60 * 1000);
    expect(recoverAfterSuccess(7.5 * 60 * 1000)).toBe(11.25 * 60 * 1000);
    expect(recoverAfterSuccess(16 * 60 * 1000)).toBe(POLL_CEILING_MS);
    expect(recoverAfterSuccess(POLL_CEILING_MS)).toBe(POLL_CEILING_MS);
    expect(recoverAfterSuccess(0)).toBeGreaterThan(0);
  });

  it("gagal menggandakan interval sampai ceiling backoff 60 menit", () => {
    expect(backoffAfterFailure(POLL_FLOOR_MS)).toBe(10 * 60 * 1000);
    expect(backoffAfterFailure(30 * 60 * 1000)).toBe(BACKOFF_CEILING_MS);
    expect(backoffAfterFailure(BACKOFF_CEILING_MS)).toBe(BACKOFF_CEILING_MS);
  });

  it("selectDueSources: terlama-dulu, dibatasi budget, sisanya skipped", () => {
    const candidates = [
      { id: "a", state: { intervalMs: POLL_FLOOR_MS, lastFetchedAt: now - 6 * 60 * 1000 } },
      { id: "b", state: { intervalMs: POLL_FLOOR_MS, lastFetchedAt: now - 9 * 60 * 1000 } },
      { id: "c", state: { intervalMs: POLL_FLOOR_MS, lastFetchedAt: now - 2 * 60 * 1000 } }, // waiting
      { id: "d" }, // never-fetched, prioritas tertinggi (lastFetchedAt -1)
    ];
    const { due, skipped } = selectDueSources(candidates, now, 2);
    expect(due.map((c) => c.id)).toEqual(["d", "b"]);
    expect(skipped.map((c) => c.id)).toEqual(["a"]);
    expect(MAX_POLLS_PER_RUN).toBeLessThanOrEqual(8);
  });

  it("selectDueSources tanpa kandidat due mengembalikan kosong", () => {
    const { due, skipped } = selectDueSources(
      [{ id: "x", state: { intervalMs: POLL_CEILING_MS, lastFetchedAt: now } }],
      now,
      8
    );
    expect(due).toEqual([]);
    expect(skipped).toEqual([]);
  });
});
