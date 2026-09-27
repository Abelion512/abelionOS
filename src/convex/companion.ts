// Companion: mutation user-scoped untuk pairing + query daftar device.
// Capability persis design docs/COMPANION-PAIRING-DESIGN.md §4 (disetujui
// pemilik 2026-09-27) — tanpa kontrol eksekusi; UI Settings read-only.
// Ponytail: claim + heartbeat adalah public action "use node" di
// companionActions.ts (node:crypto untuk hash + verifikasi Ed25519).
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { requireUserId } from "./mintdeskHelpers";
import { sha256Hex } from "./auditChain";
import {
  MAX_ACTIVE_PAIRING_CODES,
  PAIRING_TTL_MS,
  generatePairingCode,
  isValidPairingCode,
  validateDeviceInput,
} from "./companionLogic";

// Pemilik meminta code dari UI; code 8 karakter plaintext diketik di laptop.
// Server hanya menyimpan hash-nya (pola device secret).
export const createPairingCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const actives = await ctx.db
      .query("pairingCodes")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(20);
    const live = actives.filter((r: any) => r.expiresAt > now && !r.deviceId);
    if (live.length >= MAX_ACTIVE_PAIRING_CODES) {
      throw new Error(
        `Maksimal ${MAX_ACTIVE_PAIRING_CODES} pairing code aktif. Gunakan yang ada atau tunggu kedaluwarsa.`
      );
    }
    const code = generatePairingCode();
    await ctx.db.insert("pairingCodes", {
      userId,
      codeHash: await sha256Hex(code),
      expiresAt: now + PAIRING_TTL_MS,
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "companion.pairingCode.created",
      status: "accepted",
      detail: "pairing code baru TTL 10 menit",
    });
    await ctx.runMutation(internal.companionInternals.pruneExpiredCodes, {
      userId,
      now,
    });
    return { code, expiresAt: now + PAIRING_TTL_MS };
  },
});

export const registerDevice = mutation({
  args: { code: v.string(), name: v.string(), type: v.union(v.literal("laptop"), v.literal("server")) },
  handler: async (ctx, { code, name, type }): Promise<{ deviceId: Id<"devices"> }> => {
    const userId = await requireUserId(ctx);
    const { name: cleanName } = validateDeviceInput(name, type);
    const normalized = code.trim().toUpperCase();
    if (!isValidPairingCode(normalized)) {
      throw new Error("Pairing code 8 karakter (tanpa 0/O, 1/I/L).");
    }
    const codeHash = await sha256Hex(normalized);
    const codeRow: Doc<"pairingCodes"> | null = await ctx.runQuery(
      internal.companionInternals.pairingCodeByHash,
      { codeHash }
    );
    // Respons identik untuk code salah/kadaluarsa/terpakai — tanpa bocor.
    if (!codeRow || codeRow.userId !== userId || codeRow.deviceId) {
      throw new Error("Pairing code tidak valid atau sudah dipakai.");
    }
    if (codeRow.expiresAt < Date.now()) {
      throw new Error("Pairing code tidak valid atau sudah dipakai.");
    }
    // deviceId = slug tipe: satu device aktif per tipe (design §2).
    const created: Id<"devices"> | null = await ctx.runMutation(
      internal.companionInternals.registerDeviceRow,
      {
      userId,
        codeHash,
        deviceId: type,
        name: cleanName,
        type,
      }
    );
    if (!created) throw new Error("Pairing code tidak valid atau sudah dipakai.");
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "companion.device.registered",
      status: "accepted",
      detail: `${cleanName} (${type}) pending — menunggu claim dari laptop`,
    });
    return { deviceId: created };
  },
});

export const listCompanionDevices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("devices")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(50);
    const states = await ctx.db
      .query("deviceStates")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(50);
    const stateByDevice = new Map(states.map((s: any) => [s.deviceId, s]));
    return rows.map((d: any) => {
      const st = stateByDevice.get(d.deviceId);
      return {
        _id: d._id,
        deviceId: d.deviceId,
        name: d.name,
        type: d.type,
        status: d.status,
        observedAt: st?.observedAt,
        stateStatus: st?.status,
        detail: st?.detail,
      };
    });
  },
});
