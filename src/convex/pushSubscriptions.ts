// Kelola langganan push per user (file non-node — mutasi dilarang di file node).
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./mintdeskHelpers";

// Topik langganan push — metadata operasional + berita, tanpa konten email.
const VALID_TOPICS = ["all", "news", "dailyFocus", "companion", "googleWorkspace"];
const MAX_SUBS_PER_USER = 8;

// Public key VAPID bukan secret — dikirim ke browser untuk subscribe.
export const vapidPublicKey = query({
  args: {},
  handler: async () => ({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null }),
});

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    topics: v.array(v.string()),
  },
  handler: async (ctx, { endpoint, p256dh, auth, topics }) => {
    const userId = await requireUserId(ctx);
    if (!topics.length || topics.some((t) => !VALID_TOPICS.includes(t))) {
      throw new Error("Topik langganan tidak valid");
    }
    if (topics.includes("all") && topics.length > 1) {
      throw new Error("Topik 'all' tidak boleh digabung topik lain");
    }
    if (endpoint.length > 1500) throw new Error("Endpoint terlalu panjang");
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q: any) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      if (existing.userId !== userId) throw new Error("Endpoint sudah terdaftar untuk user lain");
      await ctx.db.patch(existing._id, { p256dh, auth, topics, createdAt: Date.now() });
      return existing._id;
    }
    const count = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    if (count.length >= MAX_SUBS_PER_USER) throw new Error("Maksimal 8 perangkat per akun");
    return await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint,
      p256dh,
      auth,
      topics,
      createdAt: Date.now(),
    });
  },
});

export const deleteSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q: any) => q.eq("endpoint", endpoint))
      .unique();
    if (!existing || existing.userId !== userId) throw new Error("Tidak ditemukan");
    await ctx.db.delete(existing._id);
  },
});
