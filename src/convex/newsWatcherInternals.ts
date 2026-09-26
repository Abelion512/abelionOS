// Internal query/mutation untuk newsWatcher (file non-node).
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getSingleOwner = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").take(2);
    return rows.length === 1 ? rows[0]._id : null;
  },
});

export const listSeen = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("newsSeen")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const markSeen = internalMutation({
  args: { userId: v.id("users"), urls: v.array(v.string()) },
  handler: async (ctx, { userId, urls }) => {
    const now = Date.now();
    for (const url of urls) {
      await ctx.db.insert("newsSeen", { userId, url, seenAt: now });
    }
  },
});

export const pruneSeen = internalMutation({
  args: { userId: v.id("users"), keep: v.number() },
  handler: async (ctx, { userId, keep }) => {
    if (keep < 0) keep = 0;
    const rows = await ctx.db
      .query("newsSeen")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const sorted = rows.sort((a: any, b: any) => a.seenAt - b.seenAt);
    // Hapus seen terlama sampai sisa = keep terbaru.
    const toDelete = sorted.slice(0, Math.max(0, sorted.length - keep));
    for (const r of toDelete) await ctx.db.delete(r._id);
  },
});

export const insertNewsNotification = internalMutation({
  args: { userId: v.id("users"), title: v.string(), body: v.string(), url: v.string() },
  handler: async (ctx, { userId, title, body, url }) => {
    await ctx.db.insert("notifications", {
      userId,
      category: "news",
      title,
      body,
      // Link-out dipisah dari body: panel merender anchor, bukan URL mentah.
      url,
      readAt: undefined,
    });
  },
});
