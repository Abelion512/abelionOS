import { describe, it, expect } from "vitest";
import { isCacheFresh, chunkQueue, CACHE_TTL_MS, FETCH_CONCURRENCY } from "./newsFetchService";

describe("newsFetchService", () => {
  it("cache segar di bawah TTL dan basi di atasnya", () => {
    const fetchedAt = 1_000_000;
    expect(isCacheFresh(fetchedAt, fetchedAt + 1)).toBe(true);
    expect(isCacheFresh(fetchedAt, fetchedAt + CACHE_TTL_MS - 1)).toBe(true);
    expect(isCacheFresh(fetchedAt, fetchedAt + CACHE_TTL_MS)).toBe(false);
    expect(isCacheFresh(fetchedAt, fetchedAt + CACHE_TTL_MS + 60_000)).toBe(false);
  });

  it("TTL dan konkurensi di nilai yang menjaga Google News tetap hidup", () => {
    expect(CACHE_TTL_MS).toBeGreaterThanOrEqual(5 * 60 * 1000);
    expect(FETCH_CONCURRENCY).toBeLessThanOrEqual(3);
  });

  it("chunkQueue membagi utuh dan menangani sisa", () => {
    expect(chunkQueue([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkQueue([], 3)).toEqual([]);
    expect(chunkQueue([1, 2], 5)).toEqual([[1, 2]]);
  });
});
