import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import crypto from "node:crypto";
import { createAuditEvent, createCompanionDevice, createDailyFocusAction, createFileRecord, getCompanionDeviceForUser, getDailyFocusAction, getGoogleConnection, listAuditEvents, listCompanionDevices, listDailyFocusActions, listUserFiles, updateDailyFocusAction } from "./db";
import { storageCreatePresignedUpload } from "./storage";
import { buildMorningBriefing } from "./morningBriefing";
import { disconnectGoogleWorkspace } from "./googleOAuth";
import { decryptPendingPairingSecret, encryptActionInput, encryptPendingPairingSecret, hashDeviceSecret } from "./dailyFocusActionCrypto";
import { dailyFocusActionKindSchema, parseDailyFocusProposal } from "./dailyFocusActionPolicy";
import { executeDailyFocusGoogleAction } from "./googleDailyFocusActions";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  audit: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ ctx, input }) =>
      listAuditEvents(ctx.user.id, input?.limit ?? 50)
    ),
  }),
  google: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const connection = await getGoogleConnection(ctx.user.id);
      if (!connection) return { connected: false as const, scopes: [] as string[], updatedAt: null };
      return { connected: true as const, scopes: connection.grantedScopes.split(" ").filter(Boolean), updatedAt: connection.updatedAt };
    }),
    disconnect: protectedProcedure.mutation(({ ctx }) => disconnectGoogleWorkspace(ctx.user.id)),
  }),
  briefing: router({
    get: protectedProcedure.query(({ ctx }) => buildMorningBriefing(ctx.user.id)),
  }),
  companionDevices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const devices = await listCompanionDevices(ctx.user.id);
      return devices.map(({ secretHash: _secretHash, encryptedPairingSecret, pairingExpiresAt, ...device }) => ({
        ...device,
        capabilities: JSON.parse(device.capabilities) as string[],
        online: device.lastSeenAt ? Date.now() - device.lastSeenAt.getTime() < 90_000 : false,
        pendingPairing: Boolean(encryptedPairingSecret && pairingExpiresAt && pairingExpiresAt.getTime() > Date.now()),
        pairingExpiresAt: pairingExpiresAt && pairingExpiresAt.getTime() > Date.now() ? pairingExpiresAt : null,
      }));
    }),
    enroll: protectedProcedure.input(z.object({
      name: z.string().trim().min(1).max(120),
      deviceType: z.enum(["laptop", "server"]),
    })).mutation(async ({ ctx, input }) => {
      const deviceId = crypto.randomUUID();
      const deviceSecret = crypto.randomBytes(32).toString("base64url");
      const pairingExpiresAt = new Date(Date.now() + 10 * 60_000);
      const device = await createCompanionDevice({
        userId: ctx.user.id,
        deviceId,
        name: input.name,
        deviceType: input.deviceType,
        capabilities: JSON.stringify(["reasoning"]),
        secretHash: hashDeviceSecret(deviceSecret),
        encryptedPairingSecret: encryptPendingPairingSecret(deviceSecret),
        pairingExpiresAt,
        isDefaultReasoner: false,
      });
      await createAuditEvent({ userId: ctx.user.id, action: "companion.enrolled", resourceType: "companion_device", resourceId: deviceId, status: "accepted", details: JSON.stringify({ deviceType: input.deviceType }) });
      return { deviceId: device.deviceId, name: device.name, deviceType: device.deviceType, pairingExpiresAt };
    }),
    resumePairing: protectedProcedure.input(z.object({ deviceId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const device = await getCompanionDeviceForUser(ctx.user.id, input.deviceId);
      if (!device || !device.encryptedPairingSecret || !device.pairingExpiresAt || device.pairingExpiresAt.getTime() <= Date.now()) {
        throw new Error("This pairing request expired. Register a new device to pair it.");
      }
      await createAuditEvent({ userId: ctx.user.id, action: "companion.pairing.resumed", resourceType: "companion_device", resourceId: device.deviceId, status: "accepted", details: null });
      return { deviceId: device.deviceId, deviceSecret: decryptPendingPairingSecret(device.encryptedPairingSecret) };
    }),
  }),
  dailyFocusActions: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(25) }).optional()).query(({ ctx, input }) =>
      listDailyFocusActions(ctx.user.id, input?.limit ?? 25).then((actions) => actions.map((action) => ({ ...action, encryptedInput: null })))
    ),
    requestProposal: protectedProcedure.input(z.object({
      deviceId: z.string().uuid(),
      kind: z.enum(["task.create", "calendar.create"]),
      text: z.string().trim().min(1).max(5_000),
    })).mutation(async ({ ctx, input }) => {
      const device = await getCompanionDeviceForUser(ctx.user.id, input.deviceId);
      if (!device) throw new Error("Selected companion device was not found");
      const action = await createDailyFocusAction({
        userId: ctx.user.id,
        deviceId: device.deviceId,
        kind: input.kind,
        status: "queued",
        encryptedInput: encryptActionInput(input.text),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });
      await createAuditEvent({ userId: ctx.user.id, action: "daily_focus.proposal.requested", resourceType: "daily_focus_action", resourceId: String(action.id), status: "accepted", details: JSON.stringify({ kind: input.kind, deviceId: device.deviceId }) });
      return { id: action.id, status: action.status, expiresAt: action.expiresAt };
    }),
    prepareCalendarDelete: protectedProcedure.input(z.object({
      calendarId: z.string().trim().min(1).max(512),
      eventId: z.string().trim().min(1).max(1024),
      title: z.string().trim().min(1).max(1024),
      start: z.string().datetime(),
      organizerSelf: z.literal(true),
    })).mutation(async ({ ctx, input }) => {
      const proposal = parseDailyFocusProposal({ kind: "calendar.delete", ...input });
      const action = await createDailyFocusAction({
        userId: ctx.user.id,
        kind: proposal.kind,
        status: "ready",
        proposalPayload: JSON.stringify(proposal),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });
      await createAuditEvent({ userId: ctx.user.id, action: "daily_focus.calendar_delete.prepared", resourceType: "daily_focus_action", resourceId: String(action.id), status: "accepted", details: JSON.stringify({ eventId: input.eventId }) });
      return { id: action.id, status: action.status, expiresAt: action.expiresAt };
    }),
    prepareGmailTrash: protectedProcedure.input(z.object({
      messages: z.array(z.object({
        id: z.string().trim().min(1).max(512),
        sender: z.string().max(1024).nullable(),
        subject: z.string().max(1024).nullable(),
        receivedAt: z.string().datetime().nullable(),
      })).min(1).max(25),
    })).mutation(async ({ ctx, input }) => {
      const proposal = parseDailyFocusProposal({ kind: "gmail.trash", messages: input.messages });
      const action = await createDailyFocusAction({
        userId: ctx.user.id,
        kind: proposal.kind,
        status: "ready",
        proposalPayload: JSON.stringify(proposal),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });
      await createAuditEvent({ userId: ctx.user.id, action: "daily_focus.gmail_trash.prepared", resourceType: "daily_focus_action", resourceId: String(action.id), status: "accepted", details: JSON.stringify({ messageCount: input.messages.length, permanentDelete: false }) });
      return { id: action.id, status: action.status, expiresAt: action.expiresAt };
    }),
    reject: protectedProcedure.input(z.object({ actionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const action = await getDailyFocusAction(ctx.user.id, input.actionId);
      if (!action) throw new Error("Daily Focus action was not found");
      if (!["draft", "queued", "processing", "ready"].includes(action.status)) throw new Error("Daily Focus action cannot be rejected in its current state");
      await updateDailyFocusAction(ctx.user.id, input.actionId, { status: "rejected", encryptedInput: null });
      await createAuditEvent({ userId: ctx.user.id, action: "daily_focus.action.rejected", resourceType: "daily_focus_action", resourceId: String(input.actionId), status: "rejected", details: JSON.stringify({ kind: action.kind }) });
      return { id: input.actionId, status: "rejected" as const };
    }),
    confirm: protectedProcedure.input(z.object({ actionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const action = await getDailyFocusAction(ctx.user.id, input.actionId);
      if (!action) throw new Error("Daily Focus action was not found");
      if (action.status !== "ready" || !action.proposalPayload) throw new Error("Daily Focus action is not ready for confirmation");
      if (action.expiresAt.getTime() <= Date.now()) {
        await updateDailyFocusAction(ctx.user.id, input.actionId, { status: "expired", encryptedInput: null });
        throw new Error("Daily Focus action expired before confirmation");
      }
      const proposal = parseDailyFocusProposal(JSON.parse(action.proposalPayload));
      if (proposal.kind !== action.kind) throw new Error("Daily Focus action proposal does not match its kind");
      await updateDailyFocusAction(ctx.user.id, input.actionId, { status: "confirmed", confirmedAt: new Date() });
      try {
        const result = await executeDailyFocusGoogleAction(ctx.user.id, input.actionId, proposal);
        await updateDailyFocusAction(ctx.user.id, input.actionId, { status: "executed", providerResourceId: result.providerResourceId, executedAt: new Date(), encryptedInput: null });
        return { id: input.actionId, status: "executed" as const, providerResourceId: result.providerResourceId };
      } catch (error) {
        await updateDailyFocusAction(ctx.user.id, input.actionId, { status: "error", errorCode: "provider_action_failed", encryptedInput: null });
        await createAuditEvent({ userId: ctx.user.id, action: "daily_focus.action.error", resourceType: "daily_focus_action", resourceId: String(input.actionId), status: "error", details: JSON.stringify({ kind: action.kind, reason: error instanceof Error ? error.message : "unknown" }) });
        throw error;
      }
    }),
  }),
  files: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ ctx, input }) =>
      listUserFiles(ctx.user.id, input?.limit ?? 100)
    ),
    prepareUpload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(160), sizeBytes: z.number().int().positive().max(8_000_000) })).mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      return storageCreatePresignedUpload(`${ctx.user.id}-files/${safeName}`);
    }),
    completeUpload: protectedProcedure.input(z.object({ objectKey: z.string().min(1).max(512), objectUrl: z.string().min(1).max(1024), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(160), sizeBytes: z.number().int().positive().max(8_000_000) })).mutation(async ({ ctx, input }) => {
      const prefix = `${ctx.user.id}-files/`;
      if (!input.objectKey.startsWith(prefix) || input.objectUrl !== `/manus-storage/${input.objectKey}`) {
        throw new Error("Upload object does not belong to the authenticated user");
      }
      return createFileRecord({ userId: ctx.user.id, objectKey: input.objectKey, objectUrl: input.objectUrl, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes });
    }),
  }),
});

export type AppRouter = typeof appRouter;
