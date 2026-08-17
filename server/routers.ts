import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createFileRecord, getGoogleConnection, listAuditEvents, listUserFiles } from "./db";
import { storageCreatePresignedUpload } from "./storage";
import { buildMorningBriefing } from "./morningBriefing";
import { createGmailDraft, deleteGmailDraft, getGmailDraft, listGmailDrafts, updateGmailDraft } from "./gmailDrafts";
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
  }),
  briefing: router({
    get: protectedProcedure.query(({ ctx }) => buildMorningBriefing(ctx.user.id)),
  }),
  gmailDrafts: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional()).query(({ ctx, input }) => listGmailDrafts(ctx.user.id, input?.limit ?? 20)),
    get: protectedProcedure.input(z.object({ draftId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) })).query(({ ctx, input }) => getGmailDraft(ctx.user.id, input.draftId)),
    create: protectedProcedure.input(z.object({ to: z.array(z.string().email()).min(1).max(25), cc: z.array(z.string().email()).max(25).default([]), bcc: z.array(z.string().email()).max(25).default([]), subject: z.string().max(255), body: z.string().max(100_000), confirmed: z.literal(true) })).mutation(({ ctx, input }) => createGmailDraft(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ draftId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), to: z.array(z.string().email()).min(1).max(25), cc: z.array(z.string().email()).max(25).default([]), bcc: z.array(z.string().email()).max(25).default([]), subject: z.string().max(255), body: z.string().max(100_000), confirmed: z.literal(true) })).mutation(({ ctx, input }) => updateGmailDraft(ctx.user.id, input.draftId, input)),
    delete: protectedProcedure.input(z.object({ draftId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), confirmed: z.literal(true) })).mutation(({ ctx, input }) => deleteGmailDraft(ctx.user.id, input.draftId)),
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
