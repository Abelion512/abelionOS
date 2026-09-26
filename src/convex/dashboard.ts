// Dashboard aggregate + notification read actions (user-scoped).
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./mintdeskHelpers";
import { readDeviceStates } from "./deviceStates";

// ponytail: batas atas proposal ready yang dihitung; retensi menandai proposal
// kedaluwarsa sebagai `expired`, jadi angka ini praktis proposal yang benar-
// benar menunggu keputusan (realistis < 10).
const PENDING_ACTIONS = 50;

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // ponytail: inbox notifikasi sengaja TIDAK dibaca di sini — field `unread`
    // tidak dipakai UI (lonceng memakai dashboard.listNotifications), dan tanpa
    // pembacaan itu dashboard tidak ikut re-run setiap notifikasi baru masuk.
    const [accounts, devices, actions] = await Promise.all([
      ctx.db.query("googleAccounts").withIndex("by_user", (q: any) => q.eq("userId", userId)).collect(),
      readDeviceStates(ctx, userId),
      ctx.db
        .query("googleActions")
        .withIndex("by_user_and_status", (q: any) => q.eq("userId", userId).eq("status", "ready"))
        .take(PENDING_ACTIONS),
    ]);
    return {
      accounts: accounts.map((a: any) => ({ _id: a._id, email: a.email, label: a.label, status: a.status })),
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        deviceType: d.deviceType,
        status: d.status,
        observedAt: d.observedAt,
      })),
      pendingActions: actions.length,
    };
  },
});

export const listNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(30);
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Tidak ditemukan");
    if (!row.readAt) await ctx.db.patch(id, { readAt: Date.now() });
  },
});

// Retensi menjaga inbox di ~300 baris terbaru (retention.ts), jadi pembacaan
// berbatas ini selalu mencakup seluruh inbox. Index readAt sengaja tidak
// dipakai: Convex melewatkan field undefined, dan baris unread justru tidak
// punya readAt.
const MARK_ALL_READ_LIMIT = 500;

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(MARK_ALL_READ_LIMIT);
    const now = Date.now();
    for (const r of rows) {
      if (!r.readAt) await ctx.db.patch(r._id, { readAt: now });
    }
  },
});
