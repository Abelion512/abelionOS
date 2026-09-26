// Internal queries/mutations untuk googleExecutor (file non-node).
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const actionForUser = internalQuery({
  args: { userId: v.id("users"), actionId: v.id("googleActions") },
  handler: async (ctx, { userId, actionId }) => {
    const row = await ctx.db.get(actionId);
    if (!row || row.userId !== userId) return null;
    return row;
  },
});

export const accountForUser = internalQuery({
  args: { userId: v.id("users"), accountId: v.id("googleAccounts") },
  handler: async (ctx, { userId, accountId }) => {
    const acc = await ctx.db.get(accountId);
    if (!acc || acc.userId !== userId) return null;
    return {
      _id: acc._id,
      email: acc.email,
      scopes: acc.scopes,
      status: acc.status,
      tokenCipher: acc.tokenCipher,
    };
  },
});

// Hanya executor (via runMutation dari action) yang boleh mengubah status
// proposal menjadi executed/error — dengan ownership check di sini.
export const setActionStatus = internalMutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("googleActions"),
    status: v.union(v.literal("executed"), v.literal("error")),
  },
  handler: async (ctx, { userId, actionId, status }) => {
    const row = await ctx.db.get(actionId);
    if (!row || row.userId !== userId) throw new Error("Tidak ditemukan");
    await ctx.db.patch(actionId, { status, decidedAt: Date.now() });
  },
});
