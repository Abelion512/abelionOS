// Internal mutations untuk audit/notifikasi dari dalam actions.
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./mintdeskHelpers";
import { computeChainHash } from "./auditChain";

const SENSITIVE = /(token|secret|password|authorization|bearer|refresh|access)/i;

export const auditFromAction = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    status: v.union(v.literal("accepted"), v.literal("rejected"), v.literal("error")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { userId, action, status, detail }) => {
    if (detail && SENSITIVE.test(detail)) detail = "(redacted)";
    if (detail && detail.length > 300) detail = detail.slice(0, 300);
    // Hash chain: satu penulis (mutation ini) agar rantai per-user tetap linier.
    const last = await ctx.db
      .query("auditEvents")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .first();
    const prevHash = last?.hash ?? "GENESIS";
    const chainTime = Date.now();
    const hash = await computeChainHash(prevHash, chainTime, userId, action, status, detail);
    await ctx.db.insert("auditEvents", {
      userId,
      actor: "system",
      action,
      status,
      detail,
      prevHash,
      hash,
      chainTime,
    });
  },
});

export const notifyFromAction = internalMutation({
  args: {
    userId: v.id("users"),
    category: v.union(
      v.literal("dailyFocus"),
      v.literal("companion"),
      v.literal("googleWorkspace"),
      v.literal("news")
    ),
    title: v.string(),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { userId, category, title, body }) => {
    await ctx.db.insert("notifications", { userId, category, title, body });
  },
});

export const listAudit = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("auditEvents")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit ?? 30, 100));
  },
});
