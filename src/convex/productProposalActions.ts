"use node";
// F4: endpoint proposal produk klien (docs/PRODUCT-CONNECTION-DESIGN.md §4–5).
// Produk TIDAK PERNAH menulis langsung ke Google: request masuk antrean
// googleActions status "ready" dan menunggu konfirmasi manusia di Daily Focus
// (AGENTS.md human confirmation). Secret → capability → payload → rate limit →
// scope → insert + audit — pola guard persis read endpoint (F3).
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  PROPOSAL_MIN_INTERVAL_MS,
  proposalKindForCapability,
  requireProposalCapability,
  requiredGoogleScopeForProposal,
} from "./productReadLogic";
import { parseProposalPayload } from "./googleProposalSchema";
import { sha256HexNode } from "./productReadActions";

export type ProductProposalResult =
  | { ok: true; proposalId: string; kind: string; expiresAt: number; account: string }
  | { ok: false; httpStatus: number; code: string; error: string };

export const createProductProposal = internalAction({
  args: {
    secret: v.string(),
    capability: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, { secret, capability, payload }): Promise<ProductProposalResult> => {
    const product = await ctx.runQuery(internal.productReadInternals.productBySecretHash, {
      secretHash: sha256HexNode(secret),
    });
    // Respons identik untuk unknown/archived — jangan bocorkan keberadaan produk.
    if (!product || product.status !== "active") {
      return {
        ok: false,
        httpStatus: 401,
        code: "invalid_product",
        error: "Secret produk tidak valid atau tidak aktif",
      };
    }
    const userId = product.userId;

    // Guard capability dulu (403), rate limit belakangan (429) — sama dengan F3.
    try {
      requireProposalCapability(product.allowlist as string[], capability);
    } catch {
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.proposal.denied",
        status: "rejected",
        actor: "product",
        detail: `product:${product.productId} capability ${capability} ditolak allowlist`,
      });
      return {
        ok: false,
        httpStatus: 403,
        code: "capability_denied",
        error: "Capability tidak diizinkan untuk produk ini",
      };
    }

    // Rate limit atomic cek+set (field lastProposalAt, terpisah dari read).
    const now = Date.now();
    const allowed = await ctx.runMutation(internal.productReadInternals.touchProposal, {
      productId: product._id,
      now,
    });
    if (!allowed) {
      return {
        ok: false,
        httpStatus: 429,
        code: "rate_limited",
        error: "Terlalu sering mengajukan proposal. Coba lagi sebentar.",
      };
    }

    // Payload divalidasi skema proposal existing SEBELUM rate limit dikunci
    // barang berharga — proposal rusak tidak menghabiskan kuota write.
    let parsed: ReturnType<typeof parseProposalPayload>;
    try {
      parsed = parseProposalPayload(payload);
    } catch (e: any) {
      return {
        ok: false,
        httpStatus: 400,
        code: "bad_payload",
        error: e?.message ?? "Payload proposal tidak sesuai skema",
      };
    }
    // Capability harus cocok kind payload: proposal calendar.create.proposal
    // hanya membawa calendar.create, task.create.proposal hanya task.create.
    if (parsed.kind !== proposalKindForCapability(capability)) {
      return {
        ok: false,
        httpStatus: 400,
        code: "kind_mismatch",
        error: "Kind payload tidak sesuai capability yang diajukan",
      };
    }
    // calendar.create produk tetap tunduk ownership guard kalender utama —
    // guard yang sama dengan UI, divalidasi sejak pengajuan.
    if (parsed.kind === "calendar.create") {
      try {
        const { assertOwnedCalendar } = await import("./googleProposalSchema");
        assertOwnedCalendar(parsed.calendarId);
      } catch (e: any) {
        return {
          ok: false,
          httpStatus: 400,
          code: "ownership_guard",
          error: e?.message ?? "calendarId ditolak ownership guard",
        };
      }
    }

    const acc = await ctx.runQuery(internal.productReadInternals.activeAccountForUser, {
      userId,
    });
    if (!acc) {
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.proposal",
        status: "error",
        actor: "product",
        detail: `product:${product.productId} ${capability}: tidak ada akun Google aktif`,
      });
      return {
        ok: false,
        httpStatus: 503,
        code: "no_active_google_account",
        error: "Tidak ada akun Google aktif di AbelionOS",
      };
    }

    // Scope akun harus mencakup capability — proposal yang tak mungkin
    // dieksekusi tidak boleh memenuhi antrian review.
    const googleScope = requiredGoogleScopeForProposal(capability);
    if (!acc.scopes.includes(googleScope)) {
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.proposal",
        status: "error",
        actor: "product",
        detail: `product:${product.productId} ${capability}: scope akun belum mencakup capability ini`,
      });
      return {
        ok: false,
        httpStatus: 403,
        code: "scope_missing",
        error: "Akun Google terhubung belum memberi scope untuk capability ini",
      };
    }

    const proposalId = await ctx.runMutation(
      internal.productReadInternals.insertProductProposal,
      {
        userId,
        accountId: acc._id,
        kind: parsed.kind,
        payload,
        sourceProductId: product.productId,
        now,
      }
    );
    if (!proposalId) {
      return {
        ok: false,
        httpStatus: 400,
        code: "account_mismatch",
        error: "Akun Google sumber tidak valid",
      };
    }

    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "product.proposal",
      status: "accepted",
      actor: "product",
      detail: `product:${product.productId} ${capability}: proposal ${parsed.kind} masuk antrean review (jeda min ${PROPOSAL_MIN_INTERVAL_MS / 1000}s)`,
    });
    return {
      ok: true,
      proposalId,
      kind: parsed.kind,
      expiresAt: now + 24 * 60 * 60 * 1000,
      account: acc.email,
    };
  },
});
