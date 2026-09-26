// Proposal Google actions: preview + confirm manusia (tanpa auto-write).
// Konfirmasi hanya menandai confirmed; eksekusi provider nyata berjalan di
// internal action googleExecutor via scheduler setelah status berubah.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserId } from "./mintdeskHelpers";
import { parseProposalPayload, PROPOSAL_KINDS } from "./googleProposalSchema";

export const listActions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("googleActions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(30);
  },
});

export const createDraft = mutation({
  args: {
    accountId: v.id("googleAccounts"),
    kind: v.union(
      v.literal("task.create"),
      v.literal("calendar.create"),
      v.literal("calendar.delete"),
      v.literal("gmail.trash")
    ),
    payload: v.string(),
  },
  handler: async (ctx, { accountId, kind, payload }) => {
    const userId = await requireUserId(ctx);
    const acc = await ctx.db.get(accountId);
    if (!acc || acc.userId !== userId) throw new Error("Akun tidak ditemukan");
    if (!PROPOSAL_KINDS.includes(kind as any)) throw new Error("Kind tidak diizinkan");
    // Validasi skema payload saat dibuat — proposal rusak tidak boleh masuk antrian.
    parseProposalPayload(payload);
    const id = await ctx.db.insert("googleActions", {
      userId,
      accountId,
      kind,
      status: "ready",
      payload,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "google.proposal." + kind,
      status: "accepted",
      detail: "proposal siap review (expiry 24 jam)",
    });
    return id;
  },
});

export const decide = mutation({
  args: { actionId: v.id("googleActions"), confirm: v.boolean() },
  handler: async (ctx, { actionId, confirm }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(actionId);
    if (!row || row.userId !== userId) throw new Error("Tidak ditemukan");
    if (row.status !== "ready") throw new Error("Proposal tidak dalam status ready");
    if (Date.now() > row.expiresAt) {
      await ctx.db.patch(actionId, { status: "error" });
      throw new Error("Proposal kedaluwarsa");
    }
    if (!confirm) {
      await ctx.db.patch(actionId, { status: "rejected", decidedAt: Date.now() });
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "google.decide." + row.kind,
        status: "rejected",
        detail: "proposal ditolak pengguna",
      });
      return { status: "rejected" as const };
    }
    await ctx.db.patch(actionId, { status: "confirmed", decidedAt: Date.now() });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "google.decide." + row.kind,
      status: "accepted",
      detail: "proposal dikonfirmasi pengguna, eksekusi dijadwalkan",
    });
    // Scheduler menjalankan executor setelah mutation commit — eksekusi tidak
    // pernah terjadi sebelum konfirmasi manusia ini tersimpan.
    await ctx.scheduler.runAfter(0, internal.googleExecutor.executeConfirmedAction, {
      userId,
      actionId,
    });
    return { status: "confirmed" as const };
  },
});
