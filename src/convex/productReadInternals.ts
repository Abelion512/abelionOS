// Internal queries/mutations untuk endpoint read produk (dipanggil dari
// productReadActions.ts). Tidak berisi logic bisnis — itu di productReadLogic.ts.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { firstActiveAccount, isRateLimited, PROPOSAL_MIN_INTERVAL_MS } from "./productReadLogic";

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

// F4: rate limit pengajuan proposal — pola sama dengan touchRead, field
// lastProposalAt terpisah agar jalur write dan read tidak saling memblokir.
export const touchProposal = internalMutation({
  args: { productId: v.id("products"), now: v.number() },
  handler: async (ctx, { productId, now }): Promise<boolean> => {
    const row = await ctx.db.get(productId);
    if (!row) return false;
    if (isRateLimited(row.lastProposalAt, now, PROPOSAL_MIN_INTERVAL_MS)) return false;
    await ctx.db.patch(productId, { lastProposalAt: now });
    return true;
  },
});

// F4: masukkan proposal produk ke antrean googleActions existing (status
// ready, expiry 24 jam sama dengan draft UI). Konfirmasi manusia tetap
// lewat googleActions.decide — endpoint ini tidak pernah mengeksekusi.
export const insertProductProposal = internalMutation({
  args: {
    userId: v.id("users"),
    accountId: v.id("googleAccounts"),
    kind: v.union(v.literal("calendar.create"), v.literal("task.create")),
    payload: v.string(),
    sourceProductId: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { userId, accountId, kind, payload, sourceProductId, now }) => {
    const acc = await ctx.db.get(accountId);
    if (!acc || acc.userId !== userId) return null;
    const id = await ctx.db.insert("googleActions", {
      userId,
      accountId,
      kind,
      status: "ready",
      payload,
      expiresAt: now + 24 * 60 * 60 * 1000,
      sourceProductId,
    });
    return id;
  },
});
