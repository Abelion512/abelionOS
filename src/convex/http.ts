// HTTP routes: auth + OAuth Google callback (PKCE + signed state).
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";
import { isIsoTimestamp } from "./productReadLogic";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/google/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = await ctx.runAction(api.googleOAuthActions.googleStartAction, {});
    return new Response(null, {
      status: 302,
      headers: { Location: url.url },
    });
  }),
});

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

http.route({
  path: "/api/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const reqUrl = new URL(request.url);
    const code = reqUrl.searchParams.get("code");
    const state = reqUrl.searchParams.get("state");
    if (!code || !state) {
      return Response.redirect(new URL("/connections?status=error", request.url), 302);
    }
    try {
      // Identitas user AbelionOS diambil dari state JWT ter-sign (sub), bukan
      // dari session HTTP action (public route), agar state sumber kebenaran.
      const result = await ctx.runAction(internal.googleOAuthActions.googleCallbackAction, {
        code,
        state,
      });
      const target = new URL("/connections?status=connected", request.url);
      target.searchParams.set("email", result.email);
      return Response.redirect(target, 302);
    } catch (e) {
      return Response.redirect(new URL("/connections?status=error", request.url), 302);
    }
  }),
});

export default http;
