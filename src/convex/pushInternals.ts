// Internal query/mutation untuk push.ts (file non-node).
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listSubscriptions = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const deleteSubscriptionRow = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
