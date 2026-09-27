// Internal queries/mutations companion (dipanggil dari companionActions.ts).
// Tidak berisi logic bisnis — itu di companionLogic.ts. Metadata saja; secret
// plaintext tidak pernah disimpan (hanya hash).
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { parseHeartbeatPayload, describeHeartbeat } from "./companionLogic";

export const pairingCodeByHash = internalQuery({
  args: { codeHash: v.string() },
  handler: async (ctx, { codeHash }): Promise<Doc<"pairingCodes"> | null> => {
    return (
      (await ctx.db
        .query("pairingCodes")
        .withIndex("by_code_hash", (q: any) => q.eq("codeHash", codeHash))
        .unique()) ?? null
    );
  },
});

export const deviceBySecretHash = internalQuery({
  args: { secretHash: v.string() },
  handler: async (ctx, { secretHash }): Promise<Doc<"devices"> | null> => {
    return (
      (await ctx.db
        .query("devices")
        .withIndex("by_secret_hash", (q: any) => q.eq("secretHash", secretHash))
        .unique()) ?? null
    );
  },
});

export const activeDevicesOfType = internalQuery({
  args: { userId: v.id("users"), deviceId: v.string() },
  handler: async (ctx, { userId, deviceId }): Promise<Doc<"devices">[]> => {
    return await ctx.db
      .query("devices")
      .withIndex("by_user_and_device", (q: any) =>
        q.eq("userId", userId).eq("deviceId", deviceId)
      )
      .take(20);
  },
});

// Insert device pending + tandai code terpakai (satu transaksi).
export const registerDeviceRow = internalMutation({
  args: {
    userId: v.id("users"),
    codeHash: v.string(),
    deviceId: v.string(),
    name: v.string(),
    type: v.union(v.literal("laptop"), v.literal("server")),
  },
  handler: async (
    ctx,
    { userId, codeHash, deviceId, name, type }
  ): Promise<Id<"devices"> | null> => {
    const code = await ctx.db
      .query("pairingCodes")
      .withIndex("by_code_hash", (q: any) => q.eq("codeHash", codeHash))
      .unique();
    if (!code) return null;
    const id = await ctx.db.insert("devices", {
      userId,
      deviceId,
      name,
      type,
      status: "pending",
      createdAt: Date.now(),
    });
    await ctx.db.patch(code._id, { deviceId: id });
    return id;
  },
});

// Aktivasi: publicKey + secretHash diisi, status active — dipanggil saat
// claim sukses (laptop membuktikan kepemilikan code via signature flow).
export const activateDevice = internalMutation({
  args: { deviceId: v.id("devices"), publicKey: v.string(), secretHash: v.string() },
  handler: async (ctx, { deviceId, publicKey, secretHash }) => {
    await ctx.db.patch(deviceId, { publicKey, secretHash, status: "active" });
  },
});

// Satu device aktif per tipe: credential lama bertipe sama diarsipkan.
// Jangan menghapus riwayat (pola rotasi products) — guard AGENTS.md.
export const archiveOtherActives = internalMutation({
  args: { userId: v.id("users"), deviceId: v.string(), exceptId: v.id("devices") },
  handler: async (ctx, { userId, deviceId, exceptId }) => {
    const rows = await ctx.db
      .query("devices")
      .withIndex("by_user_and_device", (q: any) =>
        q.eq("userId", userId).eq("deviceId", deviceId)
      )
      .take(20);
    for (const row of rows) {
      if (row._id !== exceptId && row.status === "active") {
        await ctx.db.patch(row._id, { status: "archived" });
      }
    }
  },
});

// Heartbeat: upsert state terakhir per device (bacaan O(1) UI) + observasi
// riwayat. Payload dinarrow via parseHeartbeatPayload — field di luar
// allowlist design §4 ditolak, bukan diabaikan.
export const recordHeartbeat = internalMutation({
  args: {
    userId: v.id("users"),
    deviceDocId: v.id("devices"),
    deviceId: v.string(),
    deviceType: v.string(),
    payload: v.any(),
  },
  handler: async (
    ctx,
    { userId, deviceDocId, deviceId, deviceType, payload }
  ): Promise<void> => {
    const h = parseHeartbeatPayload(payload);
    const now = Date.now();
    const detail = describeHeartbeat(h);
    const existing = await ctx.db
      .query("deviceStates")
      .withIndex("by_user_and_device", (q: any) =>
        q.eq("userId", userId).eq("deviceId", deviceId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        deviceType,
        status: "online",
        observedAt: now,
        detail,
      });
    } else {
      await ctx.db.insert("deviceStates", {
        userId,
        deviceId,
        deviceType,
        status: "online",
        observedAt: now,
        detail,
      });
    }
    await ctx.db.insert("agentObservations", {
      userId,
      deviceId,
      deviceType,
      status: "online",
      observedAt: now,
      detail,
    });
    // deviceDocId dipakai untuk menautkan observasi ke device (tidak disimpan
    // terpisah — deviceId slug sudah mengidentifikasi). Void agar linter senang.
    void deviceDocId;
  },
});

// Prune code kadaluarsa milik user — menumpang pemanggilan berikutnya.
export const pruneExpiredCodes = internalMutation({
  args: { userId: v.id("users"), now: v.number() },
  handler: async (ctx, { userId, now }): Promise<void> => {
    const rows = await ctx.db
      .query("pairingCodes")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(50);
    for (const row of rows) {
      if (row.expiresAt < now && !row.deviceId) {
        await ctx.db.delete(row._id);
      }
    }
  },
});
