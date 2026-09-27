// HTTP routes: auth + OAuth Google callback (PKCE + signed state).
// Start consent TIDAK lewat HTTP route: UI memanggil action publik
// googleStartAction langsung via useAction (token auth + JSON, tanpa CORS) —
// hosting statis aplikasi tidak mem-proxy /api/* ke Convex site.
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { isIsoTimestamp } from "./productReadLogic";

const http = httpRouter();

auth.addHttpRoutes(http);

// Callback OAuth harus mendarat kembali di origin aplikasi, bukan di domain
// convex.site yang melayani HTTP action. Prod wajib set OAUTH_APP_URL;
// dev (tanpa env) memakai Location relatif yang proxy Vite selesaikan
// terhadap origin browser.
function appRedirect(status: "connected" | "error", email?: string): Response {
  const query = new URLSearchParams({ status });
  if (email) query.set("email", email);
  const base = process.env.OAUTH_APP_URL?.replace(/\/+$/, "") ?? "";
  return new Response(null, {
    status: 302,
    headers: { Location: `${base}/connections?${query.toString()}` },
  });
}

// Endpoint read produk klien (F3): klien mengirim secret via header
// Authorization (pola bearer) + capability di body; semua guard di internal
// action. Body ditangani sebagai unknown dan dinarrow eksplisit per guideline.
http.route({
  path: "/api/products/v1/read",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization") ?? "";
    const secret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body harus JSON valid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const capability =
      typeof body === "object" && body !== null && typeof (body as any).capability === "string"
        ? (body as any).capability
        : "";
    const timeMin =
      typeof body === "object" && body !== null && typeof (body as any).timeMin === "string"
        ? (body as any).timeMin
        : undefined;
    const timeMax =
      typeof body === "object" && body !== null && typeof (body as any).timeMax === "string"
        ? (body as any).timeMax
        : undefined;
    if (!secret || !capability) {
      return new Response(JSON.stringify({ error: "Header Authorization bearer dan capability wajib" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Window rusak ditolak 400 di sini (input klien), bukan 500 dari action.
    if (
      (timeMin !== undefined && !isIsoTimestamp(timeMin)) ||
      (timeMax !== undefined && !isIsoTimestamp(timeMax))
    ) {
      return new Response(JSON.stringify({ error: "timeMin/timeMax harus ISO 8601 valid", code: "bad_request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runAction(internal.productReadActions.readProduct, {
      secret,
      capability,
      timeMin,
      timeMax,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error, code: result.code }),
        { status: result.httpStatus, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        capability: result.capability,
        account: result.account,
        window: result.window ?? null,
        items: result.items,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

// ===== Companion Bun: claim + heartbeat (public, polling outbound) =====
// Body dinarrow eksplisit per guideline; logic + signature di companion*.
http.route({
  path: "/api/companion/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body harus JSON valid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const str = (k: string) =>
      typeof body === "object" && body !== null && typeof (body as any)[k] === "string"
        ? ((body as any)[k] as string)
        : "";
    const code = str("code");
    const name = str("name");
    const type = str("type");
    const publicKey = str("publicKey");
    const signature = str("signature");
    if (!code || !name || !type || !publicKey || !signature) {
      return new Response(
        JSON.stringify({ error: "code, name, type, publicKey, signature wajib" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const result = await ctx.runAction(internal.companionActions.claimDevice, {
      code,
      name,
      type,
      publicKey,
      signature,
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error, code: result.code }), {
        status: result.httpStatus,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        deviceSecret: result.deviceSecret,
        deviceId: result.deviceId,
        name: result.name,
        type: result.type,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

http.route({
  path: "/api/companion/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization") ?? "";
    const secret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body harus JSON valid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!secret || typeof body !== "object" || body === null) {
      return new Response(JSON.stringify({ error: "Header Authorization bearer dan payload objek wajib" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runAction(internal.companionActions.sendHeartbeat, {
      secret,
      payload: body,
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error, code: result.code }), {
        status: result.httpStatus,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ accepted: true, nextIntervalMs: result.nextIntervalMs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Endpoint pengajuan proposal produk klien (F4): body = capability + payload
// (string JSON proposal). Write tetap dua langkah — proposal masuk antrean
// status ready dan TIDAK pernah dieksekusi sebelum konfirmasi manusia.
http.route({
  path: "/api/products/v1/proposals",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization") ?? "";
    const secret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body harus JSON valid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const capability =
      typeof body === "object" && body !== null && typeof (body as any).capability === "string"
        ? (body as any).capability
        : "";
    // Payload proposal dikirim sebagai string JSON (pola penyimpanan
    // googleActions) — dinarrow eksplisit per guideline.
    const payload =
      typeof body === "object" && body !== null && typeof (body as any).payload === "string"
        ? (body as any).payload
        : "";
    if (!secret || !capability || !payload) {
      return new Response(
        JSON.stringify({ error: "Header Authorization bearer, capability, dan payload wajib" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const result = await ctx.runAction(internal.productProposalActions.createProductProposal, {
      secret,
      capability,
      payload,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error, code: result.code }),
        { status: result.httpStatus, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        proposalId: result.proposalId,
        kind: result.kind,
        status: "ready",
        expiresAt: result.expiresAt,
        account: result.account,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }),
});

http.route({
  path: "/api/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const reqUrl = new URL(request.url);
    const code = reqUrl.searchParams.get("code");
    const state = reqUrl.searchParams.get("state");
    if (!code || !state) return appRedirect("error");
    try {
      // Identitas user AbelionOS diambil dari state JWT ter-sign (sub), bukan
      // dari session HTTP action (public route), agar state sumber kebenaran.
      const result = await ctx.runAction(internal.googleOAuthActions.googleCallbackAction, {
        code,
        state,
      });
      return appRedirect("connected", result.email);
    } catch {
      return appRedirect("error");
    }
  }),
});

export default http;
