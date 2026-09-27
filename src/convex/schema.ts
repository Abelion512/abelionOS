import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// ponytail: skema minimum untuk kontrak AbelionOS di Freebuff.
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
    // F4: slug produk klien pengusul (mis. "abelink") bila proposal masuk
    // lewat endpoint /api/products/v1/proposals — kosong berarti dari UI.
    sourceProductId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  // Audit event: metadata tindakan saja + rantai hash tamper-evident.
  auditEvents: defineTable({
    userId: v.id("users"),
    // "product" = permintaan dari produk klien terdaftar (F3); identitas
    // produk spesifik (product:<slug>) dicatat di detail, bukan di union ini.
    actor: v.union(v.literal("user"), v.literal("system"), v.literal("companion"), v.literal("product")),
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

  // Companion Bun terpairing (design docs/COMPANION-PAIRING-DESIGN.md —
  // disetujui pemilik 2026-09-27). Device secret disimpan hashed (pola
  // products/secret; plaintext hanya dikembalikan sekali di claim).
  // Satu device aktif per tipe: heartbeat valid mengarsipkan credential lama.
  devices: defineTable({
    userId: v.id("users"),
    // slug stabil ("laptop", "server"); nama tampilan bebas di name
    deviceId: v.string(),
    name: v.string(),
    type: v.union(v.literal("laptop"), v.literal("server")),
    // kunci publik Ed25519 (base64) — diisi saat claim (laptop membuktikan
    // kepemilikan code + kunci); browser tidak pernah melihat kunci.
    publicKey: v.optional(v.string()),
    secretHash: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_device", ["userId", "deviceId"])
    .index("by_secret_hash", ["secretHash"]),

  // Pairing code 8 karakter TTL 10 menit single-use: di-hash server-side
  // (code plaintext hanya tampil di terminal laptop), diprune retention.
  pairingCodes: defineTable({
    userId: v.id("users"),
    codeHash: v.string(),
    expiresAt: v.number(),
    // device yang terdaftar memakai code ini (diisi saat register)
    deviceId: v.optional(v.id("devices")),
  })
    .index("by_code_hash", ["codeHash"])
    .index("by_user", ["userId"]),

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

  // Produk klien yang menyambung ke Google Workspace melalui AbelionOS
  // (hub koneksi — keputusan pemilik 2026-09-26, lihat
  // docs/PRODUCT-CONNECTION-DESIGN.md). Secret produk disimpan hashed
  // (pola device secret; plaintext hanya tampil sekali saat registrasi).
  // Token Google tidak pernah disimpan di tabel ini dan tidak pernah
  // dikirim ke produk klien. Allowlist default kosong — tiap capability
  // ditambah eksplisit dengan justifikasi capability/proporsionalitas/
  // retention/dampak human confirmation di todo.md.
  products: defineTable({
    userId: v.id("users"),
    // nama stabil (slug), mis. "abelink"; satu produk aktif per nama
    productId: v.string(),
    type: v.union(v.literal("local"), v.literal("web")),
    // sha256 secret produk; verifikasi request klien lookup via by_secret_hash
    secretHash: v.string(),
    // capability eksplisit ("calendar.read.events" dll), tanpa wildcard
    allowlist: v.array(v.string()),
    // rotasi/arsip: secret baru mengarsipkan yang lama, riwayat tidak dihapus
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    // rate limit read per produk: timestamp request read terakhir
    // (isRateLimited di productReadLogic.ts) — tanpa tabel/kron baru.
    lastReadAt: v.optional(v.number()),
    // F4: rate limit pengajuan proposal per produk (terpisah dari read agar
    // jalur write dan read tidak saling memblokir).
    lastProposalAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_product", ["userId", "productId"])
    .index("by_secret_hash", ["secretHash"]),

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
