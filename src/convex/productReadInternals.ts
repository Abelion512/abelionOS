// Internal queries/mutations untuk endpoint read produk (dipanggil dari
// productReadActions.ts). Tidak berisi logic bisnis — itu di productReadLogic.ts.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { firstActiveAccount, isRateLimited } from "./productReadLogic";

export const productBySecretHash = internalQuery({
  args: { secretHash: v.string() },
  handler: async (ctx, { secretHash }): Promise<Doc<"products"> | null> => {
    return (
      (await ctx.db
        .query("products")
        .withIndex("by_secret_hash", (q: any) => q.eq("secretHash", secretHash))
        .unique()) ?? null
    );
  },
});

export const activeAccountForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<Doc<"googleAccounts"> | null> => {
    // Multi-account: kegagalan satu akun tidak boleh memblokir akun lain —
    // pilih koneksi aktif pertama, bukan baris pertama apa pun statusnya.
    // ponytail: seleksi akun per request (mis. body.accountEmail) adalah jalur
    // upgrade ketika abelink membutuhkannya.
    const rows = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(50);
    return firstActiveAccount(rows);
  },
});

// Atomic cek+set rate limit: satu transaksi membaca lastReadAt lalu patch.
export const touchRead = internalMutation({
  args: { productId: v.id("products"), now: v.number() },
  handler: async (ctx, { productId, now }): Promise<boolean> => {
    const row = await ctx.db.get(productId);
    if (!row) return false;
    if (isRateLimited(row.lastReadAt, now)) return false;
    await ctx.db.patch(productId, { lastReadAt: now });
    return true;
  },
});
