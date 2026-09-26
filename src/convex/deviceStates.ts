// State terakhir per device companion — satu baris per (user, device).
// Dipisahkan dari riwayat heartbeat (agentObservations) supaya pembacaan
// Dashboard/Storage O(jumlah device), bukan O(jendela riwayat): state dan
// riwayat selalu ditulis di mutation yang sama agar tidak pernah menyimpang.
import type { Id } from "./_generated/dataModel";
import { latestPerDevice, RECENT_OBSERVATIONS } from "./observationLogic";

export type DeviceState = {
  deviceId: string;
  deviceType: string;
  status: "online" | "offline" | "unavailable";
  observedAt: number;
  detail?: string;
};

/** Upsert baris state; dipanggil dari mutation yang sama dengan insert riwayat. */
export async function writeDeviceState(
  ctx: any,
  input: {
    userId: Id<"users">;
    deviceId: string;
    deviceType: string;
    status: "online" | "offline" | "unavailable";
    observedAt: number;
    detail?: string;
  }
): Promise<void> {
  const existing = await ctx.db
    .query("deviceStates")
    .withIndex("by_user_and_device", (q: any) =>
      q.eq("userId", input.userId).eq("deviceId", input.deviceId)
    )
    .unique();
  const snapshot = {
    deviceType: input.deviceType,
    status: input.status,
    observedAt: input.observedAt,
    detail: input.detail,
  };
  if (existing) await ctx.db.patch(existing._id, snapshot);
  else await ctx.db.insert("deviceStates", { userId: input.userId, deviceId: input.deviceId, ...snapshot });
}

// Satu device aktif per tipe device (AGENTS.md); 20 jauh di atas kebutuhan.
const MAX_DEVICES = 20;

/**
 * Baca state terakhir per device, terbaru dulu.
 * ponytail: fallback transisi — deployment yang belum menerima heartbeat
 * pertama belum punya baris state, jadi ringkasan jendela riwayat dipakai
 * sekali. Cabang ini bisa dihapus setelah companion menulis state pertamanya.
 */
export async function readDeviceStates(ctx: any, userId: Id<"users">): Promise<DeviceState[]> {
  const states = await ctx.db
    .query("deviceStates")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .take(MAX_DEVICES);
  if (states.length > 0) {
    // latestPerDevice sebagai jaring pengaman bila pernah ada lebih dari satu
    // baris untuk device yang sama (heartbeat bersamaan).
    return latestPerDevice(states)
      .map((s: any) => ({
        deviceId: s.deviceId,
        deviceType: s.deviceType,
        status: s.status,
        observedAt: s.observedAt,
        detail: s.detail,
      }))
      .sort((a: DeviceState, b: DeviceState) => b.observedAt - a.observedAt);
  }
  const history = await ctx.db
    .query("agentObservations")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .order("desc")
    .take(RECENT_OBSERVATIONS);
  return latestPerDevice(history).map((r: any) => ({
    deviceId: r.deviceId,
    deviceType: r.deviceType,
    status: r.status,
    observedAt: r.observedAt,
    detail: r.detail,
  }));
}
