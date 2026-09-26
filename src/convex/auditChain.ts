// Audit hash chain: tiap event menyimpan hash sha256 dari (prevHash + payload).
// ponytail: tamper-evidence cukup dengan hash chain lokal untuk produk single-user;
// blockchain penuh (P2P/konsensus/token) tidak menambah jaminan nyata di sini.
import { query } from "./_generated/server";
import { requireUserId } from "./mintdeskHelpers";

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

type ChainRow = {
  _creationTime: number;
  userId: string;
  action: string;
  status: string;
  detail?: string;
  prevHash?: string;
  hash?: string;
  chainTime?: number;
};

export function computeChainHash(
  prevHash: string,
  chainTime: number,
  userId: string,
  action: string,
  status: string,
  detail?: string
): Promise<string> {
  return sha256Hex([prevHash, String(chainTime), userId, action, status, detail ?? ""].join("|"));
}

// Murni: susun ulang rantai dan laporkan titik rusak pertama.
export async function verifyChain(
  rows: ChainRow[]
): Promise<{ valid: boolean; brokenAt: number | null }> {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const expectedPrev = i === 0 ? "GENESIS" : rows[i - 1].hash ?? "";
    if ((r.prevHash ?? "") !== expectedPrev) return { valid: false, brokenAt: i };
    const chainTime = r.chainTime ?? r._creationTime;
    const recomputed = await computeChainHash(
      r.prevHash ?? "",
      chainTime,
      r.userId,
      r.action,
      r.status,
      r.detail
    );
    if ((r.hash ?? "") !== recomputed) return { valid: false, brokenAt: i };
  }
  return { valid: true, brokenAt: null };
}

export const verifyAuditChain = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // ponytail: verifikasi utuh memang membaca seluruh rantai (O(n) hash) demi
    // tamper-evidence, bukan take. Urutan index `by_user` (ascending
    // `_creationTime`) sudah sama dengan urutan rantai yang disusun
    // auditFromAction, jadi tidak ada sort ulang — sort by `chainTime` justru
    // rapuh bila jam sistem mundur. Kalau event sudah sangat banyak, upgrade
    // path: simpan checkpoint (hash + jumlah terverifikasi) dan verifikasi ekor.
    const rows: any[] = await ctx.db
      .query("auditEvents")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return await verifyChain(rows);
  },
});
