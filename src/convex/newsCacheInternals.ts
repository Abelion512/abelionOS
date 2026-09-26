// Internal query/mutation untuk cache metadata feed (file non-node).
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getFresh = internalQuery({
  args: { userId: v.id("users"), sourceId: v.string() },
  handler: async (ctx, { userId, sourceId }) => {
    return await ctx.db
      .query("newsCache")
      .withIndex("by_user_and_source", (q) => q.eq("userId", userId).eq("sourceId", sourceId))
      .take(1);
  },
});

const articleValidator = v.object({
  what: v.string(),
  when: v.string(),
  who: v.string(),
  where: v.string(),
  source: v.string(),
});

export const upsert = internalMutation({
  args: {
    userId: v.id("users"),
    sourceId: v.string(),
    articles: v.array(articleValidator),
    ok: v.boolean(),
    error: v.optional(v.string()),
    fetchedAt: v.number(),
    // Interval adaptif berikutnya (pollPolicy) — opsional agar backward-compatible.
    intervalMs: v.optional(v.number()),
  },
  handler: async (ctx, { userId, sourceId, articles, ok, error, fetchedAt, intervalMs }) => {
    const rows = await ctx.db
      .query("newsCache")
      .withIndex("by_user_and_source", (q) => q.eq("userId", userId).eq("sourceId", sourceId))
      .take(1);
    const patch = { articles, ok, error, fetchedAt, intervalMs };
    if (rows[0]) await ctx.db.patch(rows[0]._id, patch);
    else await ctx.db.insert("newsCache", { userId, sourceId, ...patch });
  },
});

// State polling semua sumber user untuk seleksi due di watcher.
export const listStates = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("newsCache")
      .withIndex("by_user_and_source", (q) => q.eq("userId", userId))
      .collect();
  },
});
