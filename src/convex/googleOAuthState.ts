// State OAuth non-node: nonce via WebCrypto, signed JWT via jose, DB state single-use.
// ponytail: dipisah dari file "use node" karena Convex melarang mutation di file node.
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { SignJWT, jwtVerify } from "jose";
import { signingKey } from "./googleOAuthConfig";

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createAuthState = internalMutation({
  args: { userId: v.id("users"), verifier: v.string() },
  handler: async (ctx, { userId, verifier }) => {
    const nonce = randomNonce();
    await ctx.db.insert("authStates", { nonce, userId, verifier, createdAt: Date.now() });
    return nonce;
  },
});

export const consumeAuthState = internalMutation({
  args: { nonce: v.string() },
  handler: async (ctx, { nonce }) => {
    const row = await ctx.db
      .query("authStates")
      .withIndex("by_nonce", (q: any) => q.eq("nonce", nonce))
      .unique();
    if (!row) return null;
    await ctx.db.delete(row._id);
    return row;
  },
});

export const upsertGoogleAccount = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    label: v.string(),
    scopes: v.array(v.string()),
    tokenCipher: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user_and_email", (q: any) =>
        q.eq("userId", args.userId).eq("email", args.email)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        scopes: args.scopes,
        tokenCipher: args.tokenCipher,
        status: "active",
        lastSyncedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("googleAccounts", {
      ...args,
      status: "active",
      lastSyncedAt: Date.now(),
    });
  },
});

export async function signGoogleState(sub: string, nonce: string) {
  const key = signingKey();
  return await new SignJWT({ sub, nonce, provider: "google" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}

export async function verifyGoogleState(state: string) {
  const key = signingKey();
  const { payload } = await jwtVerify(state, key);
  if (payload.provider !== "google") throw new Error("provider tidak cocok");
  return payload as { sub: string; nonce: string };
}
