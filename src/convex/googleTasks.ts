"use node";
// Today Checklist — evidence Google Tasks read-only, on-demand, metadata saja.
// ponytail: tidak ada persist konten task; scope `tasks` sudah dalam allowlist.
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { accessTokenFor } from "./googleAccessToken";
import { requireUserId } from "./mintdeskHelpers";

type TaskItem = { id: string; title: string; due: string; status: string; account: string; notes: string };

export const todayChecklist = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ fetchedAt: number; accounts: { email: string; status: string; tasks: TaskItem[] }[] }> => {
    const userId = await requireUserId(ctx);
    const accounts: any[] = await ctx.runQuery(internal.googleTasksInternals.listActiveAccounts, { userId });
    const out: { email: string; status: string; tasks: TaskItem[] }[] = [];
    for (const acc of accounts) {
      try {
        const access = await accessTokenFor(acc.tokenCipher);
        const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
          headers: { Authorization: "Bearer " + access },
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const lists: any = await res.json();
        const tasks: TaskItem[] = [];
        for (const list of (lists.items ?? []).slice(0, 3)) {
          const tres = await fetch(
            "https://tasks.googleapis.com/tasks/v1/lists/" +
              encodeURIComponent(list.id) +
              "/tasks?showCompleted=false&maxResults=20",
            { headers: { Authorization: "Bearer " + access } }
          );
          if (!tres.ok) continue;
          const data: any = await tres.json();
          for (const t of data.items ?? []) {
            tasks.push({
              id: String(t.id),
              title: String(t.title ?? "(tanpa judul)"),
              due: t.due ? String(t.due) : "",
              status: String(t.status ?? "needsAction"),
              account: acc.email,
              notes: t.notes ? String(t.notes).slice(0, 140) : "",
            });
          }
        }
        out.push({ email: acc.email, status: "ok", tasks });
      } catch {
        // Satu akun gagal tidak memblokir akun lain (kontrak multi-account).
        out.push({ email: acc.email, status: "unavailable", tasks: [] });
      }
    }
    return { fetchedAt: Date.now(), accounts: out };
  },
});
