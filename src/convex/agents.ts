// Agents: panel read-only (metadata status companion, tanpa kontrol eksekusi).
// ponytail: guardrail AGENTS.md — capability kontrol hanya lewat amendment.
import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { requireUserId } from "./mintdeskHelpers";
import { readDeviceStates, writeDeviceState } from "./deviceStates";

export const listObservations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // State terakhir per device dibaca dari tabel state (O(device)); riwayat
    // heartbeat hanya dipakai sebagai fallback transisi di dalam helper.
    return await readDeviceStates(ctx, userId);
  },
});

export const recordObservation = internalMutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    deviceType: v.string(),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("unavailable")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { userId, deviceId, deviceType, status, detail }) => {
    const observedAt = Date.now();
    const trimmed = detail ? detail.slice(0, 300) : undefined;
    // State dan riwayat ditulis dalam satu transaksi yang sama.
    await writeDeviceState(ctx, { userId, deviceId, deviceType, status, observedAt, detail: trimmed });
    await ctx.db.insert("agentObservations", {
      userId,
      deviceId,
      deviceType,
      status,
      observedAt,
      detail: trimmed,
    });
  },
});
