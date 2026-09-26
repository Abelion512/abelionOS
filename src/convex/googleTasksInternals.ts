// Internal queries untuk googleTasks actions.
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listActiveAccounts = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((r: any) => r.status === "active")
      .map((r: any) => ({ _id: r._id, email: r.email, tokenCipher: r.tokenCipher }));
  },
});
