// Kelola akun Google per user (multi-account): list + disconnect.
// Disconnect mencabut token di provider (best-effort, action terpisah) lalu
// menghapus koneksi lokal — credential tidak pernah masuk audit atau log.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserId } from "./mintdeskHelpers";

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return rows.map((r: any) => ({
      _id: r._id,
      email: r.email,
      label: r.label,
      status: r.status,
      scopes: r.scopes,
      lastSyncedAt: r.lastSyncedAt,
    }));
  },
});

export const disconnectAccount = mutation({
  args: { accountId: v.id("googleAccounts") },
  handler: async (ctx, { accountId }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(accountId);
    if (!row || row.userId !== userId) throw new Error("Tidak ditemukan");
    await ctx.db.delete(accountId);
    // Revoke best-effort di provider; credential lokal sudah terhapus sehingga
    // kegagalan revoke tidak meninggalkan kredensial aktif di Mintdesk.
    await ctx.scheduler.runAfter(0, internal.googleRevoke.revokeAccountToken, {
      userId,
      tokenCipher: row.tokenCipher,
      email: row.email,
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "google.disconnect",
      status: "accepted",
      detail: "akun " + row.email + " diputus (credential lokal dihapus)",
    });
  },
});
