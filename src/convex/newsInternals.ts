// Internal query untuk fetchNews (action tidak punya db reader langsung).
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listUserSourcesForFetch = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("newsSources")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((r: any) => r.enabled)
      .map((r: any) => ({
        _id: r._id,
        label: r.label,
        url: r.url,
        category: r.category as string | undefined,
        region: r.region as string | undefined,
      }));
  },
});
