import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createFileRecord, listAuditEvents, listUserFiles } from "./db";
import { storagePut } from "./storage";
import { validateUploadBytes } from "./fileValidation";
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
  files: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ ctx, input }) =>
      listUserFiles(ctx.user.id, input?.limit ?? 100)
    ),
    upload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(160), base64: z.string().min(1).max(12_000_000), sizeBytes: z.number().int().positive().max(8_000_000) })).mutation(async ({ ctx, input }) => {
      const bytes = validateUploadBytes(input.base64, input.sizeBytes);
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uploaded = await storagePut(`${ctx.user.id}-files/${safeName}`, bytes, input.mimeType);
      return createFileRecord({ userId: ctx.user.id, objectKey: uploaded.key, objectUrl: uploaded.url, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes });
    }),
  }),
});

export type AppRouter = typeof appRouter;
