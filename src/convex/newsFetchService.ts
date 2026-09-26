// Layanan fetch berita dengan cache metadata-only, dipakai bersama oleh
// fetch on-demand (news.ts) dan watcher (newsWatcher.ts). Tiga mode eksplisit:
// - "auto": cache segar (< TTL) dilayani tanpa request; basi → fetch.
// - "force": fetch ulang walau cache segar (tombol "Ambil berita", sumber due watcher).
// - "cache-only": baca cache tanpa request sama sekali (sumber belum due).
// Setiap fetch menulis interval adaptif berikutnya (pollPolicy): sukses 1,5×,
// gagal 2× — inilah yang menekan rate-limit tanpa mengorbankan berita awal.
import { internal } from "./_generated/api";
import {
  recoverAfterSuccess,
  backoffAfterFailure,
  type PollState,
} from "./pollPolicy";

export type CachedArticle = {
  what: string;
  when: string;
  who: string;
  where: string;
  source: string;
};

export type FeedFetchResult = {
  source: string;
  label: string;
  category?: string;
  region?: string;
  status: "ok" | "unavailable";
  articles: CachedArticle[];
  error?: string;
  // true bila hasil datang dari cache (tidak ada request eksternal).
  fromCache?: boolean;
};

export type FeedSourceInput = {
  id: string;
  label: string;
  url: string;
  category?: string;
  region?: string;
  // Parser mengembalikan metadata 5W1H langsung (bukan konten artikel).
  parse: (body: string) => CachedArticle[];
};

export type FetchMode = "auto" | "force" | "cache-only";

// ponytail: 10 menit memadai untuk berita on-demand; kecepatan watcher justru
// diatur interval adaptif per sumber, bukan TTL ini. Jalur upgrade: TTL per
// sumber atau stale-while-revalidate bila ada bukti kebutuhan.
export const CACHE_TTL_MS = 10 * 60 * 1000;

// Antrian berbatas: tidak ada Promise.all besar ke host yang sama.
export const FETCH_CONCURRENCY = 3;

// Murni: keputusan pakai cache atau tidak (dites terpisah).
export function isCacheFresh(fetchedAt: number, now: number, ttlMs = CACHE_TTL_MS): boolean {
  return now - fetchedAt < ttlMs;
}

export function chunkQueue<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type CacheRow = {
  articles: CachedArticle[];
  ok: boolean;
  error?: string;
  fetchedAt: number;
  intervalMs?: number;
};

async function readCacheRow(
  ctx: any,
  userId: string,
  sourceId: string
): Promise<CacheRow | undefined> {
  const rows = await ctx.runQuery(internal.newsCacheInternals.getFresh, { userId, sourceId });
  return rows[0];
}

async function writeCache(
  ctx: any,
  userId: string,
  s: FeedSourceInput,
  now: number,
  ok: boolean,
  articles: CachedArticle[],
  error: string | undefined,
  prevState?: PollState
): Promise<void> {
  await ctx.runMutation(internal.newsCacheInternals.upsert, {
    userId,
    sourceId: s.id,
    articles,
    ok,
    error,
    fetchedAt: now,
    intervalMs: ok ? recoverAfterSuccess(prevState?.intervalMs ?? 0) : backoffAfterFailure(prevState?.intervalMs ?? 0),
  });
}

/**
 * Ambil satu sumber sesuai mode. Hasil selalu metadata 5W1H; tidak pernah ada
 * konten artikel yang dipersistenkan (kontrak privacy).
 */
export async function fetchSourceWithCache(
  ctx: any,
  userId: string,
  s: FeedSourceInput,
  now: number,
  mode: FetchMode = "auto"
): Promise<FeedFetchResult> {
  const base = { source: s.id, label: s.label, category: s.category, region: s.region };
  const cached = await readCacheRow(ctx, userId, s.id);
  const state: PollState | undefined = cached
    ? { intervalMs: cached.intervalMs, lastFetchedAt: cached.fetchedAt, lastOk: cached.ok }
    : undefined;

  if (mode === "cache-only") {
    if (!cached) {
      return { ...base, status: "unavailable" as const, articles: [], fromCache: true, error: "belum pernah diambil" };
    }
    return {
      ...base,
      status: cached.ok ? ("ok" as const) : ("unavailable" as const),
      articles: cached.articles,
      error: cached.error,
      fromCache: true,
    };
  }

  if (mode === "auto" && cached && isCacheFresh(cached.fetchedAt, now)) {
    return {
      ...base,
      status: cached.ok ? ("ok" as const) : ("unavailable" as const),
      articles: cached.articles,
      error: cached.error,
      fromCache: true,
    };
  }

  try {
    const res = await fetch(s.url, {
      headers: { "User-Agent": "Mintdesk/1.0 (personal dashboard; metadata-only)" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const body = await res.text();
    const articles = s.parse(body);
    await writeCache(ctx, userId, s, now, true, articles, undefined, state);
    return { ...base, status: "ok" as const, articles };
  } catch (e) {
    const error = (e instanceof Error ? e.message : "gagal mengambil").slice(0, 120);
    await writeCache(ctx, userId, s, now, false, [], error, state);
    return { ...base, status: "unavailable" as const, articles: [], error };
  }
}

/** Ambil banyak sumber dengan konkurensi terbatas (mode seragam). */
export async function fetchAllWithCache(
  ctx: any,
  userId: string,
  sources: FeedSourceInput[],
  now: number,
  mode: FetchMode = "auto"
): Promise<FeedFetchResult[]> {
  const results: FeedFetchResult[] = [];
  for (const batch of chunkQueue(sources, FETCH_CONCURRENCY)) {
    results.push(
      ...(await Promise.all(batch.map((s) => fetchSourceWithCache(ctx, userId, s, now, mode))))
    );
  }
  return results;
}
