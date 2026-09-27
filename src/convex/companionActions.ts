"use node";
// Action companion "use node": claim + heartbeat (public httpAction memanggil
// ini). Kunci Ed25519 laptop diverifikasi di sini; secret device di-generate
// di Node dan hanya dikembalikan SEKALI di respons claim (server menyimpan
// hash) — pola products/secret; browser tidak pernah melihat secret.
// Capability heartbeat persis design doc §4 (disetujui pemilik 2026-09-27).
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  HEARTBEAT_MIN_INTERVAL_MS,
  generateDeviceSecret,
} from "./companionLogic";
import { sha256HexNode, verifyPairingSignature } from "./companionSignature";

export type ClaimResult =
  | { ok: true; deviceSecret: string; deviceId: string; name: string; type: string }
  | { ok: false; httpStatus: number; code: string; error: string };

export type HeartbeatResult =
  | { ok: true; accepted: true; nextIntervalMs: number }
  | { ok: false; httpStatus: number; code: string; error: string };

// Claim: laptop membuktikan kepemilikan code dengan menandatangani
// "companion-claim:" + code menggunakan private key Ed25519-nya. Server:
// code hash → device pending milik code → kunci publik TIDAK dikenal sebelum
// claim; kunci dikirim pertama kali di sini dan langsung diikat ke device
// (first-use trust — pairing code TTL 10 menit single-use adalah faktor
// penguatnya). Device secret plaintext dikembalikan sekali.
export const claimDevice = internalAction({
  args: { code: v.string(), name: v.string(), type: v.string(), publicKey: v.string(), signature: v.string() },
  handler: async (ctx, { code, name, type, publicKey, signature }): Promise<ClaimResult> => {
    const normalized = code.trim().toUpperCase();
    const codeHash = sha256HexNode(normalized);
    const codeRow = await ctx.runQuery(internal.companionInternals.pairingCodeByHash, { codeHash });
    if (!codeRow || codeRow.deviceId || codeRow.expiresAt < Date.now()) {
      return { ok: false, httpStatus: 401, code: "invalid_code", error: "Pairing code tidak valid, kadaluarsa, atau sudah dipakai" };
    }
    const userId = codeRow.userId;
    if (!verifyPairingSignature(publicKey, "companion-claim:" + normalized, signature)) {
      return { ok: false, httpStatus: 401, code: "bad_signature", error: "Signature tidak valid" };
    }

    // Device pending dibuat oleh registerDevice (browser) — claim hanya valid
    // untuk device yang masih pending.
    const pending = await ctx.runQuery(internal.companionInternals.activeDevicesOfType, {
      userId,
      deviceId: type,
    });
    const device = pending.find((d: any) => d.status === "pending" && d.name === name.trim());
    if (!device) {
      return {
        ok: false,
        httpStatus: 404,
        code: "no_pending_device",
        error: "Tidak ada device pending bernama itu — daftarkan dulu dari Settings → Companion",
      };
    }

    const secret = generateDeviceSecret();
    await ctx.runMutation(internal.companionInternals.activateDevice, {
      deviceId: device._id,
      publicKey,
      secretHash: sha256HexNode(secret),
    });
    // Satu device aktif per tipe: arsipkan credential aktif lama bertipe sama.
    await ctx.runMutation(internal.companionInternals.archiveOtherActives, {
      userId,
      deviceId: type,
      exceptId: device._id,
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "companion.device.claimed",
      status: "accepted",
      detail: `${device.name} (${type}) aktif — secret sekali-tampil ke companion`,
    });
    return {
      ok: true,
      deviceSecret: secret,
      deviceId: type,
      name: device.name,
      type,
    };
  },
});

// Heartbeat: secret bearer → device aktif → payload dinarrow → upsert state.
export const sendHeartbeat = internalAction({
  args: { secret: v.string(), payload: v.any() },
  handler: async (ctx, { secret, payload }): Promise<HeartbeatResult> => {
    const secretHash = sha256HexNode(secret);
    const device = await ctx.runQuery(internal.companionInternals.deviceBySecretHash, { secretHash });
    if (!device || device.status !== "active") {
      return { ok: false, httpStatus: 401, code: "invalid_device", error: "Device secret tidak valid atau tidak aktif" };
    }
    try {
      await ctx.runMutation(internal.companionInternals.recordHeartbeat, {
        userId: device.userId,
        deviceDocId: device._id,
        deviceId: device.deviceId,
        deviceType: device.type,
        payload,
      });
    } catch {
      // Payload di luar allowlist ditolak parseHeartbeatPayload → 400 eksplisit,
      // bukan 500 dari uncaught throw.
      return {
        ok: false,
        httpStatus: 400,
        code: "bad_payload",
        error: "Payload heartbeat tidak sesuai allowlist capability",
      };
    }
    return { ok: true, accepted: true, nextIntervalMs: HEARTBEAT_MIN_INTERVAL_MS };
  },
});
