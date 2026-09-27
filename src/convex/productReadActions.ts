"use node";
// Action endpoint read produk klien (F3): verifikasi secret (hash lookup) →
// status active → allowlist deny-by-default → rate limit → baca Calendar API
// dengan token backend (klien TIDAK pernah menerima token) → audit.
// Kontrak: docs/PRODUCT-CONNECTION-DESIGN.md §3–5 + AGENTS.md (hub tunggal
// Google Workspace; tiap permintaan klien ter-audit; tanpa persist konten).
import { v } from "convex/values";
import { createHash } from "node:crypto";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { accessTokenFor } from "./googleAccessToken";
import {
  MAX_EVENTS_ITEMS,
  ProductReadCapability,
  boundsForEvents,
  requireCapability,
  requiredGoogleScope,
} from "./productReadLogic";

// ponytail: hash node lokal alih-alih mengimpor auditChain (query-nya tidak
// relevan di sini) — algoritma sha256 hex identik dengan secret saat registrasi.
function sha256HexNode(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

type CalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
  accessRole?: string;
};
type CalendarEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export type ProductReadResult =
  | {
      ok: true;
      capability: string;
      // akun Google sumber (metadata koneksi; melabeli akun per AGENTS multi-account)
      account: string;
      items: unknown[];
      window?: { timeMin: string; timeMax: string };
    }
  | { ok: false; httpStatus: number; code: string; error: string };

export const readProduct = internalAction({
  args: {
    secret: v.string(),
    capability: v.string(),
    timeMin: v.optional(v.string()),
    timeMax: v.optional(v.string()),
  },
  handler: async (ctx, { secret, capability, timeMin, timeMax }): Promise<ProductReadResult> => {
    const secretHash = sha256HexNode(secret);
    const product = await ctx.runQuery(internal.productReadInternals.productBySecretHash, {
      secretHash,
    });
    // Secret tidak dikenal ATAU sudah diarsipkan (rotate/revoke): respons sama,
    // jangan bocorkan keberadaan produk.
    if (!product || product.status !== "active") {
      return {
        ok: false,
        httpStatus: 401,
        code: "invalid_product",
        error: "Secret produk tidak valid atau tidak aktif",
      };
    }
    const userId = product.userId;

    // Guard capability dulu (403), rate limit belakangan (429) — penolakan
    // capability tidak boleh tercampur dengan sinyal "terlalu sering".
    try {
      requireCapability(product.allowlist as string[], capability);
    } catch (e: any) {
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.read.denied",
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

    // Rate limit atomic (cek+set satu transaksi). ponytail: 429 tidak
    // ter-audit — request loop justru membanjiri rantai hash; jalur upgrade
    // bila pemilik butuh jejaknya: counter burst terpisah.
    const now = Date.now();
    const allowed = await ctx.runMutation(internal.productReadInternals.touchRead, {
      productId: product._id,
      now,
    });
    if (!allowed) {
      return {
        ok: false,
        httpStatus: 429,
        code: "rate_limited",
        error: "Terlalu sering. Coba lagi sebentar.",
      };
    }

    const acc = await ctx.runQuery(internal.productReadInternals.activeAccountForUser, {
      userId,
    });
    if (!acc) {
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.read",
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

    // Koneksi Google harus memegang scope OAuth yang sesuai capability.
    const googleScope = requiredGoogleScope(capability as ProductReadCapability);
    if (!acc.scopes.includes(googleScope)) {
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.read",
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

    try {
      const access = await accessTokenFor(acc.tokenCipher);
      const headers = { Authorization: "Bearer " + access };

      if (capability === "calendar.read.list") {
        const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error("Calendar API gagal: HTTP " + res.status);
        const data: { items?: CalendarListEntry[] } = await res.json();
        const items = (data.items ?? []).slice(0, MAX_EVENTS_ITEMS).map((c) => ({
          id: c.id,
          summary: c.summary,
          primary: !!c.primary,
          accessRole: c.accessRole,
        }));
        await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
          userId,
          action: "product.read",
          status: "accepted",
          actor: "product",
          detail: `product:${product.productId} calendar.read.list ok (${items.length} kalender)`,
        });
        return { ok: true, capability, account: acc.email, items };
      }

      // calendar.read.events — window ter-clamp + item terbatas (logic murni).
      const bounds = boundsForEvents(now, { timeMin, timeMax });
      const url =
        `${CALENDAR_API}/users/me/calendars/primary/events` +
        `?timeMin=${encodeURIComponent(bounds.timeMin)}` +
        `&timeMax=${encodeURIComponent(bounds.timeMax)}` +
        `&maxResults=${bounds.maxResults}&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error("Calendar API gagal: HTTP " + res.status);
      const data: { items?: CalendarEvent[] } = await res.json();
      const items = (data.items ?? []).slice(0, bounds.maxResults).map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
      }));
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.read",
        status: "accepted",
        actor: "product",
        detail: `product:${product.productId} calendar.read.events ok (${items.length} item)`,
      });
      return {
        ok: true,
        capability,
        account: acc.email,
        window: { timeMin: bounds.timeMin, timeMax: bounds.timeMax },
        items,
      };
    } catch (e: any) {
      const message = e?.message ?? "read gagal";
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "product.read",
        status: "error",
        actor: "product",
        detail: `product:${product.productId} ${capability}: ${message}`,
      });
      return {
        ok: false,
        httpStatus: 502,
        code: "upstream_error",
        error: message,
      };
    }
  },
});
