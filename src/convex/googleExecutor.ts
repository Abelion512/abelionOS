"use node";
// Executor provider nyata untuk proposal yang SUDAH dikonfirmasi manusia.
// Guard wajib per panggilan: ownership user + account + scope minimum +
// ownership kalender. Tidak ada executor untuk proposal draft/rejected.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { accessTokenFor } from "./googleAccessToken";
import { assertOwnedCalendar, parseProposalPayload, REQUIRED_SCOPES } from "./googleProposalSchema";

// Executor memanggil Google API dengan timeout agar UI tidak menggantung.
async function googleFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
}

function assertScope(scopes: string[], kind: string): void {
  const required = REQUIRED_SCOPES[kind as keyof typeof REQUIRED_SCOPES] ?? [];
  for (const s of required) {
    if (!scopes.includes(s)) {
      throw new Error("Scope belum granted untuk " + kind + ": re-consent dibutuhkan.");
    }
  }
}

function requireBody<T>(payload: unknown, kind: string): T {
  if (!payload || (payload as { kind?: string }).kind !== kind) {
    throw new Error("Payload proposal tidak cocok dengan kind " + kind);
  }
  return payload as T;
}

export const executeConfirmedAction = internalAction({
  args: { userId: v.id("users"), actionId: v.id("googleActions") },
  handler: async (ctx, { userId, actionId }) => {
    const row = await ctx.runQuery(internal.googleExecutorInternals.actionForUser, {
      userId,
      actionId,
    });
    // Ownership guard: proposal harus milik user dan sudah dikonfirmasi.
    if (!row) throw new Error("Proposal tidak ditemukan untuk user ini");
    if (row.status !== "confirmed") throw new Error("Executor hanya menjalankan proposal confirmed");

    const acc = await ctx.runQuery(internal.googleExecutorInternals.accountForUser, {
      userId,
      accountId: row.accountId,
    });
    if (!acc || acc.status !== "active") throw new Error("Akun Google tidak aktif untuk proposal ini");

    let outcome = "ok";
    try {
      // Parse ulang payload dari DB agar guard skema selalu jalan, meski
      // proposal dibuat sebelum schema ditambahkan.
      const payload = parseProposalPayload(row.payload);
      if (payload.kind !== row.kind) throw new Error("Payload dan kind proposal berbeda");
      assertScope(acc.scopes, row.kind);
      const access = await accessTokenFor(acc.tokenCipher);

      if (row.kind === "task.create") {
        const p = requireBody<{ title: string; notes?: string; due?: string; listId?: string }>(
          payload,
          "task.create"
        );
        const res = await googleFetch(
          "https://tasks.googleapis.com/tasks/v1/lists/" +
            encodeURIComponent(p.listId ?? "@default") +
            "/tasks",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
            body: JSON.stringify({ title: p.title, notes: p.notes, due: p.due }),
          }
        );
        if (!res.ok) throw new Error("Tasks API gagal: HTTP " + res.status);
      } else if (row.kind === "calendar.create") {
        const p = requireBody<{ calendarId: string; summary: string; start: string; end: string; description?: string }>(
          payload,
          "calendar.create"
        );
        assertOwnedCalendar(p.calendarId);
        const res = await googleFetch(
          "https://www.googleapis.com/calendar/v3/calendars/" +
            encodeURIComponent(p.calendarId) +
            "/events",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: p.summary,
              description: p.description,
              start: { dateTime: p.start },
              end: { dateTime: p.end },
            }),
          }
        );
        if (!res.ok) throw new Error("Calendar API gagal: HTTP " + res.status);
      } else if (row.kind === "calendar.delete") {
        const p = requireBody<{ calendarId: string; eventId: string }>(payload, "calendar.delete");
        assertOwnedCalendar(p.calendarId);
        const res = await googleFetch(
          "https://www.googleapis.com/calendar/v3/calendars/" +
            encodeURIComponent(p.calendarId) +
            "/events/" +
            encodeURIComponent(p.eventId),
          {
            method: "DELETE",
            headers: { Authorization: "Bearer " + access },
          }
        );
        if (!res.ok) throw new Error("Calendar API gagal: HTTP " + res.status);
      } else if (row.kind === "gmail.trash") {
        const p = requireBody<{ messageIds: string[] }>(payload, "gmail.trash");
        for (const mid of p.messageIds) {
          const res = await googleFetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(mid) + "/trash",
            { method: "POST", headers: { Authorization: "Bearer " + access } }
          );
          if (!res.ok) throw new Error("Gmail API gagal: HTTP " + res.status);
        }
      }
    } catch (e: any) {
      outcome = "error";
      const message = e?.message ?? "eksekusi gagal";
      await ctx.runMutation(internal.googleExecutorInternals.setActionStatus, {
        userId,
        actionId,
        status: "error",
      });
      await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
        userId,
        action: "google.execute." + row.kind,
        status: "error",
        detail: message,
      });
      await ctx.runMutation(internal.mintdeskInternals.notifyFromAction, {
        userId,
        category: "googleWorkspace",
        title: "Proposal gagal dieksekusi",
        body: "Action " + row.kind + " tidak selesai. Periksa koneksi akun atau scope.",
      });
      return { status: "error" as const, message };
    }

    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "google.execute." + row.kind,
      status: "accepted",
      detail: "proposal dieksekusi ke provider",
    });
    return { status: "executed" as const, message: outcome };
  },
});
