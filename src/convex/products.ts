// Registry produk klien yang menyambung ke Google Workspace melalui AbelionOS.
// Kontrak (docs/PRODUCT-CONNECTION-DESIGN.md, keputusan pemilik 2026-09-26):
// - satu produk aktif per productId; rotasi mengarsipkan kunci lama;
// - secret plaintext hanya dikembalikan SEKALI (register/rotate), server
//   hanya menyimpan sha256 — tidak pernah masuk audit, log, atau UI lagi;
// - allowlist baru diisi lewat justifikasi eksplisit di todo.md (F3),
//   default kosong (deny-by-default);
// - semua aksi owner ter-audit via auditFromAction (satu penulis hash chain).
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserId } from "./mintdeskHelpers";
import { sha256Hex } from "./auditChain";
import { generateProductSecret, requireActiveRows, validateProductId } from "./productLogic";
import { normalizeAllowlist } from "./productReadLogic";

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // ponytail: take(200) — produk per user sedikit, tapi query tetap dibatasi
    // sesuai guideline; riwayat rotasi tidak boleh membiarkan list tumbuh liar.
    const rows = await ctx.db
      .query("products")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(200);
    // secretHash tidak pernah keluar dari server.
    return rows.map((r: any) => ({
      _id: r._id,
      productId: r.productId,
      type: r.type,
      status: r.status,
      allowlist: r.allowlist as string[],
      createdAt: r.createdAt,
    }));
  },
});

export const registerProduct = mutation({
  args: {
    productId: v.string(),
    type: v.union(v.literal("local"), v.literal("web")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const slug = validateProductId(args.productId);
    const existing = await ctx.db
      .query("products")
      .withIndex("by_user_and_product", (q: any) =>
        q.eq("userId", userId).eq("productId", slug)
      )
      .take(50);
    if (existing.some((r: any) => r.status === "active")) {
      throw new Error(
        `Produk "${slug}" masih aktif. Gunakan rotasi kunci bila butuh secret baru.`
      );
    }
    const secret = await generateProductSecret();
    const secretHash = await sha256Hex(secret);
    await ctx.db.insert("products", {
      userId,
      productId: slug,
      type: args.type,
      secretHash,
      allowlist: [],
      status: "active",
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "product.register",
      status: "accepted",
      detail: `${slug} (${args.type}) terdaftar, allowlist kosong`,
    });
    return { secret };
  },
});

export const rotateProductSecret = mutation({
  args: { productId: v.string() },
  handler: async (ctx, { productId }) => {
    const userId = await requireUserId(ctx);
    const slug = validateProductId(productId);
    const rows = await ctx.db
      .query("products")
      .withIndex("by_user_and_product", (q: any) =>
        q.eq("userId", userId).eq("productId", slug)
      )
      .take(50);
    const actives = requireActiveRows(rows as any[], slug);
    for (const row of actives) {
      await ctx.db.patch(row._id, { status: "archived" });
    }
    const template = actives[actives.length - 1];
    const secret = await generateProductSecret();
    const secretHash = await sha256Hex(secret);
    await ctx.db.insert("products", {
      userId,
      productId: slug,
      type: template.type,
      secretHash,
      allowlist: template.allowlist,
      status: "active",
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "product.rotate",
      status: "accepted",
      detail: `${slug}: kunci lama diarsipkan, kunci baru diterbitkan sekali tampil`,
    });
    return { secret };
  },
});

// Grant/cabut capability satu produk — hanya dari capability registry F3
// (normalizeAllowlist menolak selain itu). Owner-scoped + ter-audit; identitas
// produk di detail memakai pola product:<slug> yang sama dengan F3.
export const setProductAllowlist = mutation({
  args: { productId: v.string(), capabilities: v.array(v.string()) },
  handler: async (ctx, { productId, capabilities }) => {
    const userId = await requireUserId(ctx);
    const slug = validateProductId(productId);
    const next = normalizeAllowlist(capabilities);
    const rows = await ctx.db
      .query("products")
      .withIndex("by_user_and_product", (q: any) =>
        q.eq("userId", userId).eq("productId", slug)
      )
      .take(50);
    const actives = requireActiveRows(rows as any[], slug);
    await ctx.db.patch(actives[actives.length - 1]._id, { allowlist: next });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "product.allowlist.set",
      status: "accepted",
      detail: `${slug}: allowlist ${next.length > 0 ? next.join(", ") : "kosong (deny-by-default)"}`,
    });
    return { allowlist: next };
  },
});

export const revokeProduct = mutation({
  args: { productId: v.string() },
  handler: async (ctx, { productId }) => {
    const userId = await requireUserId(ctx);
    const slug = validateProductId(productId);
    const rows = await ctx.db
      .query("products")
      .withIndex("by_user_and_product", (q: any) =>
        q.eq("userId", userId).eq("productId", slug)
      )
      .take(50);
    const actives = requireActiveRows(rows as any[], slug);
    for (const row of actives) {
      await ctx.db.patch(row._id, { status: "archived" });
    }
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "product.revoke",
      status: "accepted",
      detail: `${slug} diarsipkan, semua request klien berikut ditolak`,
    });
  },
});
