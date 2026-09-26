import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// ponytail: skema minimum untuk kontrak Mintdesk di Freebuff.
// Tidak ada kolom untuk body Gmail, bearer token, atau raw prompt AI —
// refresh token disimpan terenkripsi server-side (AES-256-GCM) di field cipher.
export default defineSchema({
  ...authTables,

  // Akun Google Workspace yang terhubung per user (multi-account).
  googleAccounts: defineTable({
    userId: v.id("users"),
    label: v.string(),
    email: v.string(),
    scopes: v.array(v.string()),
    // refresh token Google terenkripsi AES-256-GCM, tidak pernah plaintext
    tokenCipher: v.string(),
    // status koneksi
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("error"),
      v.literal("disconnected")
    ),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_email", ["userId", "email"]),

  // Proposal action Google (task, event, trash) — preview + confirm manusia.
  googleActions: defineTable({
    userId: v.id("users"),
    accountId: v.id("googleAccounts"),
    kind: v.union(
      v.literal("task.create"),
      v.literal("calendar.create"),
      v.literal("calendar.delete"),
      v.literal("gmail.trash")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("confirmed"),
      v.literal("executed"),
      v.literal("rejected"),
      v.literal("error"),
      // Kedaluwarsa tanpa keputusan manusia — ditandai retensi, bukan oleh user.
      v.literal("expired")
    ),
    // payload terstruktur yang dipreview pengguna (tanpa konten email body)
    payload: v.string(),
    expiresAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  // Audit event: metadata tindakan saja + rantai hash tamper-evident.
  auditEvents: defineTable({
    userId: v.id("users"),
    actor: v.union(v.literal("user"), v.literal("system"), v.literal("companion")),
    action: v.string(),
    status: v.union(v.literal("accepted"), v.literal("rejected"), v.literal("error")),
    // ringkasan metadata; larang menyimpan credential/konten email
    detail: v.optional(v.string()),
    // hash chain sha256: prevHash event sebelumnya, hash payload ini
    prevHash: v.optional(v.string()),
    hash: v.optional(v.string()),
    chainTime: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Inbox notifikasi user-scoped: hanya metadata operasional.
  // `url` opsional = tautan tujuan notifikasi (mis. artikel berita); dipisah
  // dari body supaya panel UI merender link, bukan URL mentah yang meluap.
  notifications: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("dailyFocus"),
      v.literal("companion"),
      v.literal("googleWorkspace"),
      v.literal("news")
    ),
    title: v.string(),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Observasi companion (heartbeat/metrics terakhir) — metadata saja.
  agentObservations: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    deviceType: v.string(),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("unavailable")),
    observedAt: v.number(),
    detail: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_device", ["userId", "deviceId"]),

  // State terakhir per device companion (satu baris per user+device).
  // Dipisah dari riwayat heartbeat supaya pembacaan Dashboard/Storage
  // O(jumlah device), bukan O(jendela riwayat) — lihat deviceStates.ts.
  deviceStates: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    deviceType: v.string(),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("unavailable")),
    observedAt: v.number(),
    detail: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_device", ["userId", "deviceId"]),

  // State OAuth PKCE single-use (nonce → verifier), server-side signed JWT merujuk nonce.
  authStates: defineTable({
    nonce: v.string(),
    userId: v.id("users"),
    verifier: v.string(),
    createdAt: v.number(),
  }).index("by_nonce", ["nonce"]),

  // Preferensi topik berita per user.
  newsTopics: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    sources: v.array(v.string()),
    enabled: v.boolean(),
  }).index("by_user", ["userId"]),

  // Sumber berita milik user (feed https publik, metadata-only on-demand).
  // URL tervalidasi guard anti-SSRF; tanpa konten artikel yang dipersistenkan.
  // category/region opsional menyambungkan sumber user ke kurasi registry.
  newsSources: defineTable({
    userId: v.id("users"),
    label: v.string(),
    url: v.string(),
    enabled: v.boolean(),
    category: v.optional(v.string()),
    region: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Cache metadata feed berita (5W1H: judul/link/provenance — bukan konten
  // artikel) per user+sourceId. Dedupe fetch antara watcher 5 menit, ganti
  // kategori di UI, dan fetch on-demand: satu sumber maksimal sekali diambil
  // per TTL (newsFetchService.ts). Diprune retention (24 jam).
  newsCache: defineTable({
    userId: v.id("users"),
    sourceId: v.string(),
    articles: v.array(
      v.object({
        what: v.string(),
        when: v.string(),
        who: v.string(),
        where: v.string(),
        source: v.string(),
      })
    ),
    ok: v.boolean(),
    error: v.optional(v.string()),
    fetchedAt: v.number(),
    // Kebijakan polling adaptif per sumber (pollPolicy.ts): interval saat ini
    // antara POLL_FLOOR (5 mnt) dan BACKOFF_CEILING (60 mnt).
    intervalMs: v.optional(v.number()),
  }).index("by_user_and_source", ["userId", "sourceId"]),

  // Dedupe artikel watcher berita: url per user, tanpa konten artikel.
  newsSeen: defineTable({
    userId: v.id("users"),
    url: v.string(),
    seenAt: v.number(),
  }).index("by_user", ["userId"]),

  // Push subscription browser — endpoint adalah bearer-secret Push API;
  // disimpan user-scoped, tidak pernah masuk log atau audit.
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    topics: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
