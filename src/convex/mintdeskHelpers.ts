// Helper lintas modul Mintdesk: identitas user-scoped.
// ponytail: satu modul kecil, reuse di semua router domain. Audit memakai
// internal.mintdeskInternals.auditFromAction (satu penulis hash chain) —
// jangan menulis ke auditEvents dari tempat lain.
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";

// Resolve users row dari Convex Auth; null berarti belum sign in.
export async function requireUserId(ctx: any): Promise<Id<"users">> {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
