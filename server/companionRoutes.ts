import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createAuditEvent, claimNextDeviceAction, getCompanionDevice, getDailyFocusActionForDevice, markCompanionDeviceSeen, updateDailyFocusActionForDevice } from "./db";
import { decryptActionInput, safeDeviceSecretEquals } from "./dailyFocusActionCrypto";
import { dailyFocusProposalSchema, proposalSummary } from "./dailyFocusActionPolicy";
import { publishUserNotification } from "./notifications";

type AuthenticatedDevice = Awaited<ReturnType<typeof getCompanionDevice>>;

async function authenticateDevice(req: Request, res: Response): Promise<NonNullable<AuthenticatedDevice> | null> {
  const deviceId = req.header("x-mintdesk-device-id");
  const bearer = req.header("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!deviceId || !bearer) {
    res.status(401).json({ error: "device_auth_required" });
    return null;
  }
  const device = await getCompanionDevice(deviceId);
  if (!device || device.isArchived || !safeDeviceSecretEquals(device.secretHash, bearer)) {
    res.status(401).json({ error: "device_auth_invalid" });
    return null;
  }
  const wasOffline = !device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() >= 90_000;
  await markCompanionDeviceSeen(device.deviceId);
  if (wasOffline) {
    await publishUserNotification({ userId: device.userId, event: "companion.online", resourceType: "companion_device", resourceId: device.deviceId });
  }
  return device;
}

const proposalRequestSchema = z.object({ proposal: dailyFocusProposalSchema });
const errorRequestSchema = z.object({ code: z.string().trim().min(1).max(120) });

export function registerCompanionRoutes(app: Express) {
  app.get("/api/companion/v2/health", async (req: Request, res: Response) => {
    try {
      const device = await authenticateDevice(req, res);
      if (!device) return;
      res.json({ deviceId: device.deviceId, status: "online", serverTime: new Date().toISOString() });
    } catch (error) {
      console.error("[Companion] health failed", error);
      res.status(500).json({ error: "companion_health_failed" });
    }
  });

  app.get("/api/companion/v2/actions/next", async (req: Request, res: Response) => {
    try {
      const device = await authenticateDevice(req, res);
      if (!device) return;
      const action = await claimNextDeviceAction(device.deviceId);
      if (!action) {
        res.status(204).end();
        return;
      }
      if (!action.encryptedInput) {
        await updateDailyFocusActionForDevice(device.deviceId, action.id, { status: "error", errorCode: "input_missing" });
        res.status(204).end();
        return;
      }
      res.json({
        actionId: action.id,
        kind: action.kind,
        input: decryptActionInput(action.encryptedInput),
        expiresAt: action.expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("[Companion] next action failed", error);
      res.status(500).json({ error: "companion_action_poll_failed" });
    }
  });

  app.post("/api/companion/v2/actions/:actionId/proposal", async (req: Request, res: Response) => {
    try {
      const device = await authenticateDevice(req, res);
      if (!device) return;
      const actionId = Number(req.params.actionId);
      if (!Number.isSafeInteger(actionId) || actionId < 1) {
        res.status(400).json({ error: "action_id_invalid" });
        return;
      }
      const { proposal } = proposalRequestSchema.parse(req.body);
      const current = await getDailyFocusActionForDevice(device.deviceId, actionId);
      if (!current || current.status !== "processing" || current.expiresAt.getTime() <= Date.now()) {
        res.status(409).json({ error: "action_not_claimed_or_expired" });
        return;
      }
      if (current.kind !== proposal.kind) {
        await updateDailyFocusActionForDevice(device.deviceId, actionId, { status: "error", errorCode: "proposal_kind_mismatch", encryptedInput: null });
        res.status(400).json({ error: "proposal_kind_mismatch" });
        return;
      }
      const saved = await updateDailyFocusActionForDevice(device.deviceId, actionId, {
        status: "ready",
        proposalPayload: JSON.stringify(proposal),
        encryptedInput: null,
        errorCode: null,
      });
      await createAuditEvent({ userId: device.userId, action: "daily_focus.proposal.ready", resourceType: "daily_focus_action", resourceId: String(actionId), status: "accepted", details: JSON.stringify({ deviceId: device.deviceId, summary: proposalSummary(proposal) }) });
      await publishUserNotification({ userId: device.userId, event: "daily_focus.proposal.ready", resourceType: "daily_focus_action", resourceId: String(actionId) });
      res.json({ actionId, status: "ready" });
    } catch (error) {
      console.error("[Companion] proposal failed", error);
      res.status(400).json({ error: "companion_proposal_invalid" });
    }
  });

  app.post("/api/companion/v2/actions/:actionId/error", async (req: Request, res: Response) => {
    try {
      const device = await authenticateDevice(req, res);
      if (!device) return;
      const actionId = Number(req.params.actionId);
      const { code } = errorRequestSchema.parse(req.body);
      if (!Number.isSafeInteger(actionId) || actionId < 1) {
        res.status(400).json({ error: "action_id_invalid" });
        return;
      }
      const current = await getDailyFocusActionForDevice(device.deviceId, actionId);
      if (!current || current.status !== "processing") {
        res.status(409).json({ error: "action_not_claimed" });
        return;
      }
      await updateDailyFocusActionForDevice(device.deviceId, actionId, { status: "error", errorCode: code, encryptedInput: null });
      await createAuditEvent({ userId: device.userId, action: "daily_focus.proposal.error", resourceType: "daily_focus_action", resourceId: String(actionId), status: "error", details: JSON.stringify({ deviceId: device.deviceId, code }) });
      await publishUserNotification({ userId: device.userId, event: "daily_focus.proposal.error", resourceType: "daily_focus_action", resourceId: String(actionId) });
      res.json({ actionId, status: "error" });
    } catch (error) {
      console.error("[Companion] action error failed", error);
      res.status(400).json({ error: "companion_action_error_invalid" });
    }
  });
}
