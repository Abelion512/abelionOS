// HTTP routes: auth + OAuth Google callback (PKCE + signed state).
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

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
      // Identitas user Mintdesk diambil dari state JWT ter-sign (sub), bukan
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
