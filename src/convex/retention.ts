// Retensi data operasional — metadata-only, berbatas per run.
// Persetujuan eksplisit pemilik tercatat di todo.md (2026-09-26): prune inbox
// notifikasi, riwayat observasi companion, dan penandaan proposal kedaluwarsa.
// Dijalankan sebagai langkah tambahan di dalam satu-satunya workflow periodik
// yang sudah disetujui (news watcher 5 menit) — tanpa cron baru, tanpa AI,
// tanpa write Google, tanpa notifikasi baru.
// ponytail: tiap langkah membaca take(keep + batch) lalu menghapus sisanya;
// sisa berikutnya dikerjakan run selanjutnya, jadi transaksi tetap kecil.
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { splitLegacyNewsBody } from "./newsWatcherLogic";

// Proposal ready yang kedaluwarsa dipindai per run; sisanya run berikutnya.
const EXPIRED_PROPOSALS_BATCH = 100;

// Inbox notifikasi: sisakan 300 terbaru (Dashboard/AppShell hanya butuh 30).
const NOTIFICATIONS_KEEP = 300;
const NOTIFICATIONS_BATCH = 200;
// Riwayat heartbeat: sisakan 500 terbaru — jendela fallback deviceStates.ts
// membaca 200, jadi 500 tetap cukup untuk transisi.
const OBSERVATIONS_KEEP = 500;
const OBSERVATIONS_BATCH = 300;
// Cache metadata feed: sisakan yang masih segar (24 jam jauh di atas TTL 10
// menit, tapi menjamin tabel tidak tumbuh tanpa batas).
const NEWS_CACHE_KEEP_MS = 24 * 60 * 60 * 1000;
const NEWS_CACHE_BATCH = 300;
// Backfill sekali-jalan (menyertai run retensi, berhenti sendiri saat tak ada
// lagi yang cocok): notifikasi berita lama menyimpan URL di dalam body teks;
// pindahkan ke kolom `url` agar panel merender link yang bisa diklik.
const LEGACY_NEWS_BATCH = 200;
// State PKCE OAuth single-use yang lewat masa berlakunya (state berumur 10
// menit) — bukan data sensitif, tapi tetap sampah yang tumbuh per percobaan
// connect. ponytail: menumpang run retensi yang sudah disetujui.
const AUTH_STATES_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const AUTH_STATES_BATCH = 200;

export const pruneOperationalData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Single-user produk: pakai pemilik tunggal, sama seperti news watcher.
    const owners = await ctx.db.query("users").take(2);
    if (owners.length !== 1)
      return {
        notifications: 0,
        observations: 0,
        expired: 0,
        migratedNewsUrls: 0,
        prunedCache: 0,
        prunedAuthStates: 0,
      };
    const userId = owners[0]._id;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(NOTIFICATIONS_KEEP + NOTIFICATIONS_BATCH);
    const staleNotifications = notifications.slice(NOTIFICATIONS_KEEP);
    for (const row of staleNotifications) await ctx.db.delete(row._id);

    const observations = await ctx.db
      .query("agentObservations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(OBSERVATIONS_KEEP + OBSERVATIONS_BATCH);
    const staleObservations = observations.slice(OBSERVATIONS_KEEP);
    for (const row of staleObservations) await ctx.db.delete(row._id);

    // Proposal ready yang lewat masa berlaku tidak lagi menunggu keputusan
    // manusia; ditandai `expired` supaya hitungan pending di Dashboard akurat.
    const now = Date.now();
    // Cache metadata feed basi (>24 jam) dihapus per run.
    const cacheCutoff = now - NEWS_CACHE_KEEP_MS;
    const staleCache = await ctx.db
      .query("newsCache")
      .withIndex("by_user_and_source", (q) => q.eq("userId", userId))
      .order("desc")
      .take(NEWS_CACHE_BATCH);
    let prunedCache = 0;
    for (const row of staleCache) {
      if (row.fetchedAt >= cacheCutoff) continue;
      await ctx.db.delete(row._id);
      prunedCache++;
    }

    // Migrasi notifikasi berita lama (URL di body → kolom url). Dipindai asc
    // (terlama dulu), hanya kategori news tanpa url; berhenti sendiri.
    const legacyNews = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .take(LEGACY_NEWS_BATCH);
    let migrated = 0;
    for (const row of legacyNews) {
      if (row.category !== "news" || row.url || !row.body) continue;
      const split = splitLegacyNewsBody(row.body);
      if (!split) continue;
      await ctx.db.patch(row._id, { url: split.url, body: split.body });
      migrated++;
    }

    // State PKCE kadaluarsa dihapus (≤200/run, sisanya run berikutnya).
    // Pemindaian ascending creation time = terlama dulu; baris pertama yang
    // masih segar mengakhiri pemindaian.
    const authCutoff = now - AUTH_STATES_MAX_AGE_MS;
    const staleAuthStates = await ctx.db.query("authStates").take(AUTH_STATES_BATCH);
    let prunedAuthStates = 0;
    for (const row of staleAuthStates) {
      if (row.createdAt >= authCutoff) break;
      await ctx.db.delete(row._id);
      prunedAuthStates++;
    }

    const ready = await ctx.db
      .query("googleActions")
      .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", "ready"))
      .take(EXPIRED_PROPOSALS_BATCH);
    const expired = ready.filter((row) => row.expiresAt < now);
    for (const row of expired) await ctx.db.patch(row._id, { status: "expired" });
    if (expired.length > 0) {
      // Satu event audit ringkas per run, bukan satu per proposal (metadata saja).
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "google.proposal.expire",
        status: "accepted",
        detail: expired.length + " proposal kedaluwarsa ditandai expired",
      });
    }

    return {
      notifications: staleNotifications.length,
      observations: staleObservations.length,
      expired: expired.length,
      migratedNewsUrls: migrated,
      prunedCache,
      prunedAuthStates,
    };
  },
});
