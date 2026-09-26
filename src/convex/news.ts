// News: fetch on-demand metadata saja (judul/kategori/waktu/link + link-out).
// ponytail: tanpa cron, tanpa persistence artikel. Dua lapis sumber modular:
// registry kurasi (newsRegistry.ts) + sumber milik user (newsSources, guard
// anti-SSRF) — keduanya lewat pipeline filter kategori × wilayah yang sama.
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { toFiveW1H } from "./newsParser";
import { rssToArticles } from "./rssParser";
import { NEWS_SOURCES, CATEGORIES, REGIONS, type CategoryId, type RegionId } from "./newsRegistry";
import { requireUserId } from "./mintdeskHelpers";
import {
  fetchAllWithCache,
  type FeedSourceInput,
  type FeedFetchResult,
} from "./newsFetchService";

const isCategory = (v: string): v is CategoryId => CATEGORIES.some((c) => c.id === v);
const isRegion = (v: string): v is RegionId => REGIONS.some((r) => r.id === v);

// Metadata registry untuk UI: katalog kategori/wilayah + daftar sumber kurasi.
export const listCatalog = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return { categories: CATEGORIES, regions: REGIONS };
  },
});

export const listSources = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return NEWS_SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      category: s.category,
      region: s.region,
      where: s.where,
    }));
  },
});

// ===== Sumber berita milik user (RSS https publik, metadata-only) =====

const MAX_USER_SOURCES = 12;

export const listUserSources = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("newsSources")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const addUserSource = mutation({
  args: {
    label: v.string(),
    url: v.string(),
    category: v.optional(v.string()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, { label, url, category, region }) => {
    const userId = await requireUserId(ctx);
    if (category && !isCategory(category)) throw new Error("Kategori tidak dikenal");
    if (region && !isRegion(region)) throw new Error("Wilayah tidak dikenal");
    const rows = await ctx.db
      .query("newsSources")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    if (rows.length >= MAX_USER_SOURCES) throw new Error("Maksimal 12 sumber pribadi");
    // Guard anti-SSRF: https publik saja; label dibersihkan dari markup.
    const { validateFeedUrl, cleanSourceLabel } = await import("./newsSourceGuard");
    const safeUrl = validateFeedUrl(url);
    const safeLabel = cleanSourceLabel(label || new URL(safeUrl).hostname);
    return await ctx.db.insert("newsSources", {
      userId,
      label: safeLabel,
      url: safeUrl,
      enabled: true,
      category: category && isCategory(category) ? category : undefined,
      region: region && isRegion(region) ? region : undefined,
    });
  },
});

export const removeUserSource = mutation({
  args: { sourceId: v.id("newsSources") },
  handler: async (ctx, { sourceId }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(sourceId);
    if (!row || row.userId !== userId) throw new Error("Tidak ditemukan");
    await ctx.db.delete(sourceId);
  },
});

// ===== Fetch on-demand: registry kurasi + sumber user, satu pipeline =====

function registryFeeds(): FeedSourceInput[] {
  return NEWS_SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    url: s.url,
    category: s.category,
    region: s.region,
    parse: (body: string) => s.parse(body).map((a) => toFiveW1H(a, s.where)),
  }));
}

function userFeed(r: { _id: string; label: string; url: string; category?: string; region?: string }): FeedSourceInput {
  const category = r.category && isCategory(r.category) ? r.category : undefined;
  const region = r.region && isRegion(r.region) ? r.region : undefined;
  return {
    id: "user-" + r._id,
    label: r.label,
    url: r.url,
    category,
    region,
    parse: (xml: string) =>
      rssToArticles(xml).map((a) => toFiveW1H(a, "Sumber pribadi (" + r.label + ")")),
  };
}

export type FetchResultItem = FeedFetchResult;

export const fetchNews = action({
  args: { category: v.optional(v.string()), region: v.optional(v.string()), force: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { category, region, force }
  ): Promise<{ fetchedAt: number; results: FetchResultItem[]; total: number }> => {
    const userId = await requireUserId(ctx);
    const userRows = await ctx.runQuery(internal.newsInternals.listUserSourcesForFetch, { userId });
    const all: FeedSourceInput[] = [...registryFeeds(), ...userRows.map(userFeed)];
    const cat = category && isCategory(category) ? category : undefined;
    const reg = region && isRegion(region) ? region : undefined;
    // Sumber tanpa kategori/wilayah adalah wildcard: selalu ikut tampil.
    const sources = all.filter(
      (s) =>
        (!cat || s.category === undefined || s.category === cat) &&
        (!reg || s.region === undefined || s.region === reg)
    );
    // Cache bersama: pindah kategori memakai cache (mode auto); hanya tombol
    // "Ambil berita" (force) yang fetch ulang — dan fetch ulang pun tetap
    // menulis interval adaptif, bukan mereset kebijakan polling watcher.
    const results = await fetchAllWithCache(ctx, userId, sources, Date.now(), force ? "force" : "auto");
    const total = results.reduce((n, r) => n + r.articles.length, 0);
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "news.fetch",
      status: "accepted",
      detail:
        results.map((r) => r.source + ":" + r.status + (r.fromCache ? "*" : "")).join(",") +
        " total " +
        total,
    });
    return { fetchedAt: Date.now(), results, total };
  },
});
