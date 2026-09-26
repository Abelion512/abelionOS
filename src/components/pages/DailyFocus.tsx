import { useState } from "react";
import { CalendarDays, Inbox, ShieldCheck, Check, X, ListChecks, RefreshCw, TriangleAlert } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

type ChecklistResult = {
  fetchedAt: number;
  accounts: { email: string; status: string; tasks: { id: string; title: string; due: string; status: string; account: string }[] }[];
};

export default function DailyFocus() {
  const accounts = useQuery(api.googleAccounts.listAccounts, {});
  const actions = useQuery(api.googleActions.listActions, {});
  const decide = useMutation(api.googleActions.decide);
  const loadChecklist = useAction(api.googleTasks.todayChecklist);
  const [checklist, setChecklist] = useState<ChecklistResult | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = (actions ?? []).filter((a: any) => a.status === "ready" && a.expiresAt > Date.now());
  const history = (actions ?? []).filter((a: any) => a.status !== "ready");

  async function refreshChecklist() {
    setLoadingChecklist(true);
    setChecklistError(null);
    try {
      setChecklist((await loadChecklist({})) as unknown as ChecklistResult);
    } catch (e: any) {
      setChecklistError(e?.message ?? "Gagal memuat checklist.");
    } finally {
      setLoadingChecklist(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Today Checklist: Google Tasks read-only per akun */}
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-mint-strong" aria-hidden />
              <h2 className="font-display font-bold text-ink-strong">Today Checklist</h2>
              <span className="meta-label">Google Tasks · read-only</span>
            </div>
            <button
              onClick={refreshChecklist}
              disabled={loadingChecklist || (accounts ?? []).length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-mint-strong px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              <RefreshCw className={"w-3.5 h-3.5" + (loadingChecklist ? " animate-spin" : "")} />
              {loadingChecklist ? "Memuat…" : "Muat checklist"}
            </button>
          </div>
          {checklistError && (
            <p className="rounded-xl border border-line bg-rose-wash px-4 py-3 text-sm text-rose" role="alert">
              {checklistError}
            </p>
          )}
          {!checklist && !checklistError && (
            <p className="text-sm text-ink-soft">
              Hubungkan akun Google di Connections untuk memuat checklist.
            </p>
          )}
          {checklist?.accounts.map((a) => (
            <div key={a.email} className="mt-3">
              <p className="meta-label mb-1">{a.email}</p>
              {a.status === "unavailable" ? (
                <p className="text-sm text-amber flex items-center gap-1">
                  <TriangleAlert className="w-3.5 h-3.5" /> Akun tidak dapat dibaca saat ini
                </p>
              ) : a.tasks.length === 0 ? (
                <p className="text-sm text-ink-soft">Tidak ada task aktif.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {a.tasks.slice(0, 15).map((t) => (
                    <li key={t.id} className="px-3 py-2 text-sm text-ink flex items-center justify-between gap-3">
                      <span>{t.title}</span>
                      {t.due && <span className="text-xs text-ink-faint shrink-0">{new Date(t.due).toLocaleDateString("id-ID")}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {/* Evidence sources */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-mint-strong" aria-hidden />
              <h2 className="font-display font-bold text-ink-strong">Calendar</h2>
            </div>
            {accounts === undefined ? (
              <p className="text-sm text-ink-soft">Memuat…</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Belum ada akun Google terhubung. Hubungkan dari Connections untuk evidence Calendar.
              </p>
            ) : (
              <ul className="space-y-1">
                {accounts.map((a: any) => (
                  <li key={a._id} className="text-sm text-ink flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-mint-strong" aria-hidden />
                    {a.email}
                    <span className="meta-label">read-only evidence</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Inbox className="w-4 h-4 text-mint-strong" aria-hidden />
              <h2 className="font-display font-bold text-ink-strong">Gmail (metadata)</h2>
            </div>
            <p className="text-sm text-ink-soft">
              Metadata Gmail saja — body tidak disimpan.
            </p>
          </div>
        </section>

        {/* Proposals pending */}
        <section>
          <h2 className="meta-label mb-3">Proposal menunggu keputusan</h2>
          {actions === undefined ? (
            <p className="text-sm text-ink-soft">Memuat…</p>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">
              Belum ada proposal.
            </div>
          ) : (
            <ul className="space-y-3">
              {pending.map((a: any) => (
                <li key={a._id} className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-ink-strong">{a.kind}</p>
                      <p className="text-xs text-ink-soft">
                        Berlaku sampai {new Date(a.expiresAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setBusyId(a._id);
                          try {
                            await decide({ actionId: a._id, confirm: true });
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        disabled={busyId === a._id}
                        className="inline-flex items-center gap-1 rounded-lg bg-mint-strong px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95"
                      >
                        <Check className="w-3.5 h-3.5" /> Konfirmasi
                      </button>
                      <button
                        onClick={async () => {
                          setBusyId(a._id);
                          try {
                            await decide({ actionId: a._id, confirm: false });
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        disabled={busyId === a._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken"
                      >
                        <X className="w-3.5 h-3.5" /> Tolak
                      </button>
                    </div>
                  </div>
                  <pre className="mt-3 rounded-lg bg-sunken p-3 text-xs overflow-x-auto text-ink">
                    {a.payload}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Riwayat proposal: hasil eksekusi nyata per keputusan manusia */}
        {history.length > 0 && (
          <section>
            <h2 className="meta-label mb-3">Riwayat proposal</h2>
            <ul className="space-y-2">
              {history.slice(0, 10).map((a: any) => (
                <li
                  key={a._id}
                  className="rounded-xl border border-line bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-strong">{a.kind}</p>
                    <p className="text-xs text-ink-faint">
                      {a.decidedAt ? "Diputus " + new Date(a.decidedAt).toLocaleString("id-ID") : "—"}
                    </p>
                  </div>
                  <span
                    className={
                      "meta-label rounded-full px-2.5 py-1 " +
                      (a.status === "executed"
                        ? "bg-mint-wash text-mint-strong"
                        : a.status === "error"
                          ? "bg-rose-wash text-rose"
                          : "bg-sunken text-ink-soft")
                    }
                  >
                    {a.status === "executed"
                      ? "Dieksekusi ke provider"
                      : a.status === "error"
                        ? "Gagal dieksekusi"
                        : a.status === "expired"
                          ? "Kedaluwarsa — tidak diputuskan"
                          : a.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
