"use node";
// Revoke token di provider (best-effort) saat koneksi diputus.
// ponytail: kegagalan revoke tidak memblokir penghapusan koneksi lokal;
// hasil tetap dicatat di audit. Token TIDAK pernah masuk log.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { decryptToken } from "./crypto";

export const revokeAccountToken = internalAction({
  args: { userId: v.id("users"), tokenCipher: v.string(), email: v.string() },
  handler: async (ctx, { userId, tokenCipher, email }) => {
    let revoked = false;
    try {
      const store = JSON.parse(decryptToken(tokenCipher)) as { refresh?: string };
      if (store.refresh) {
        const res = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: store.refresh }),
          signal: AbortSignal.timeout(8000),
        });
        revoked = res.ok;
      }
    } catch {
      revoked = false; // cipher rusak atau jaringan gagal — lanjut hapus lokal
    }
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "google.disconnect.revoke",
      status: revoked ? "accepted" : "error",
      detail: revoked
        ? "token akun " + email + " dicabut di provider"
        : "revoke provider tidak dapat dipastikan; credential lokal tetap dihapus",
    });
    return { revoked };
  },
});
