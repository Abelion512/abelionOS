import { History, ShieldCheck, ShieldAlert } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Activity() {
  const audit = useQuery(api.mintdeskInternals.listAudit, { limit: 50 });
  const chain = useQuery(api.auditChain.verifyAuditChain, {});

  return (
    <>
      <div className="space-y-4">
        {/* Integritas rantai audit (hash sha256 tamper-evident) */}
        <div
          className={
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold " +
            (chain === undefined
              ? "bg-sunken text-ink-soft"              : chain.valid                ? "bg-mint-wash text-mint-strong"                : "bg-rose-wash text-rose")
          }
          role="status"
        >
          {chain === undefined ? (
            "Memverifikasi rantai…"
          ) : chain.valid ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> Rantai audit utuh
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden /> Rantai putus di event #{(chain.brokenAt ?? 0) + 1}
            </>
          )}
        </div>
        {audit === undefined ? (
          <p className="text-sm text-ink-soft">Memuat…</p>
        ) : audit.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">
            Belum ada audit event. Setiap tindakan (koneksi Google, proposal, fetch berita)
            akan tercatat di sini.
          </div>
        ) : (
          <ul className="rounded-2xl border border-line bg-card divide-y divide-line">
            {audit.map((a: any) => (
              <li key={a._id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-ink-faint" aria-hidden />
                    <span className="text-sm font-medium text-ink-strong">{a.action}</span>
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                        (a.status === "accepted"
                          ? "bg-mint-wash text-mint-strong"
                          : a.status === "rejected"
                            ? "bg-rose-wash text-rose"
                            : "bg-amber-wash text-amber")
                      }
                    >
                      {a.status}
                    </span>
                  </div>
                  <span className="text-xs text-ink-faint">
                    {new Date(a._creationTime).toLocaleString("id-ID")}
                  </span>
                </div>
                {a.detail && <p className="mt-1 text-xs text-ink-soft">{a.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
