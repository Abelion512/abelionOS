"use node";
// News watcher — SATU-SATUNYA pekerjaan berkala di AbelionOS, dengan
// persetujuan eksplisit pemilik (todo.md, 2026-09-25): "auto update ketika
// ada berita baru tanpa menunggu rentang waktu". Fetch on-demand tetap ada;
// watcher hanya menambah lapisan pemberitahuan metadata-only.
// ponytail: interval 5 menit via cron Convex, tanpa dependency scheduler.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { NEWS_SOURCES } from "./newsRegistry";
import { watcherDecide, buildPushPayload } from "./newsWatcherLogic";
import { fetchSourceWithCache } from "./newsFetchService";
import { toFiveW1H } from "./newsParser";
import { selectDueSources, type PollState } from "./pollPolicy";

const MAX_SEEN_PER_USER = 2000;
const MAX_ARTICLES_PER_RUN = 12; // batas push per run agar tidak spam

export const newsWatcherRun = internalAction({
  args: { userId: v.optional(v.id("users")) },
  // Anotasi return eksplisit memutus siklus inferensi tipe Convex.
  handler: async (
    ctx,
    { userId: explicitUserId }
  ): Promise<{ checked: number; newCount: number; pushed: number }> => {
    // Single-user product: ambil satu pemilik dari tabel users.
    let userId = explicitUserId;
    if (!userId) {
      const owner = await ctx.runQuery(internal.newsWatcherInternals.getSingleOwner);
      userId = owner ?? undefined;
    }
    if (!userId) return { checked: 0, newCount: 0, pushed: 0 };

    const seenRows = await ctx.runQuery(internal.newsWatcherInternals.listSeen, { userId });

    // Kebijakan polling adaptif (permintaan pemilik 2026-09-26): run pertama
    // semua sumber due (berita pertama <5 menit); setelahnya hanya sumber yang
    // intervalnya terlampaui, maksimal 8 per run, terlama-dulu. Sumber yang
    // belum due dibaca dari cache tanpa request eksternal.
    const cacheRows = await ctx.runQuery(internal.newsCacheInternals.listStates, { userId });
    const stateById = new Map<string, PollState>();
    for (const row of cacheRows as any[]) {
      stateById.set(row.sourceId, {
        intervalMs: row.intervalMs,
        lastFetchedAt: row.fetchedAt,
        lastOk: row.ok,
      });
    }
    const { due } = selectDueSources(
      NEWS_SOURCES.map((s) => ({ id: s.id, state: stateById.get(s.id) })),
      Date.now()
    );
    const dueIds = new Set(due.map((c) => c.id));

    type FiveW = ReturnType<typeof toFiveW1H>;
    const results: { source: (typeof NEWS_SOURCES)[number]; articles: FiveW[] }[] = [];
    for (const s of NEWS_SOURCES) {
      // Sumber due: fetch ulang (interval adaptifnya sudah terlampaui).
      // Sisanya: cache-only — nol request ke host, nol risiko rate-limit.
      const r = await fetchSourceWithCache(
        ctx,
        userId,
        {
          id: s.id,
          label: s.label,
          url: s.url,
          category: s.category,
          region: s.region,
          parse: (body: string) => s.parse(body).map((a) => toFiveW1H(a, s.where)),
        },
        Date.now(),
        dueIds.has(s.id) ? "force" : "cache-only"
      );
      results.push({ source: s, articles: r.articles });
    }
    // watcherDecide bekerja dengan bentuk Article (title/url); 5W1H dipetakan balik.
    const decisionInput = results.map(({ source: s, articles }) => ({
      where: s.where,
      articles: articles.map((a) => ({
        title: a.what,
        url: a.source,
        category: a.who,
        publishedLabel: a.when === "waktu tidak tersedia" ? "" : a.when,
      })),
    }));

    // Keputusan run (baseline/delta, dedupe lintas sumber) dari logika murni teruji.
    const decision = watcherDecide(decisionInput, seenRows.map((r: any) => r.url));

    if (!decision.baseline) {
      // Batasi push per run; sisanya tetap ditandai seen agar tidak menumpuk.
      const toNotify = decision.fresh.slice(0, MAX_ARTICLES_PER_RUN);
      for (const item of toNotify) {
        const payload = buildPushPayload(item);
        // Inbox ditulis lebih dulu (fallback utama kontrak notifikasi);
        // kegagalan push tidak boleh menggagalkan run sampai markSeen.
        await ctx.runMutation(internal.newsWatcherInternals.insertNewsNotification, {
          userId,
          title: payload.title,
          body: payload.body,
          url: payload.url,
        });
        try {
          await ctx.runAction(internal.push.pushSendInternal, {
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            tag: payload.tag,
            topic: "news",
          });
        } catch (e) {
          // Push gagal (mis. VAPID belum diisi): jangan bunuh run — artikel
          // tetap harus ditandai seen agar tidak di-notifikasi ulang tiap run.
          console.error("push gagal untuk item", e instanceof Error ? e.message : e);
        }
      }
    }

    for (let i = 0; i < decision.markUrls.length; i += 100) {
      await ctx.runMutation(internal.newsWatcherInternals.markSeen, {
        userId,
        urls: decision.markUrls.slice(i, i + 100),
      });
    }
    // Prune seen lama agar tabel tidak tumbuh tanpa batas.
    if (seenRows.length + decision.markUrls.length > MAX_SEEN_PER_USER) {
      await ctx.runMutation(internal.newsWatcherInternals.pruneSeen, {
        userId,
        keep: MAX_SEEN_PER_USER - decision.markUrls.length - 100,
      });
    }
    // Retensi data operasional (todo.md 2026-09-26) menumpang workflow periodik
    // yang sama: inbox, riwayat heartbeat, dan proposal kedaluwarsa.
    await ctx.scheduler.runAfter(0, internal.retention.pruneOperationalData, {});
    return {
      checked: decision.markUrls.length,
      newCount: decision.fresh.length,
      pushed: decision.baseline ? 0 : Math.min(decision.fresh.length, MAX_ARTICLES_PER_RUN),
    };
  },
});
