import { useEffect, useState } from "react";
import { Plug, Trash2, Plus, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Connections() {
  const accounts = useQuery(api.googleAccounts.listAccounts, {});
  const disconnect = useMutation(api.googleAccounts.disconnectAccount);
  const startConsent = useAction(api.googleOAuthActions.googleStartAction);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Status hasil callback OAuth.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "connected") setFlash("Akun Google berhasil terhubung.");
    if (status === "error") setFlash("Koneksi Google gagal. Coba lagi dari halaman ini.");
  }, []);

  // ponytail: mulai consent via action publik (useAction melampirkan token
  // auth otomatis, respons JSON tanpa CORS), lalu navigasi browser penuh ke
  // consent URL. Fetch ke /api/google/start salah dua arah: hosting statis
  // tidak mem-proxy /api/*, dan fetch polos tidak membawa token Convex.
  async function connect() {
    setStarting(true);
    try {
      const { url } = await startConsent({});
      if (url) window.location.href = url;
    } catch (e) {
      setFlash(
        e instanceof Error && e.message
          ? "Gagal memulai koneksi: " + e.message
          : "Gagal memulai koneksi. Coba lagi dari halaman ini."
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {flash && (
          <p
            className={
              "rounded-xl border px-4 py-3 text-sm " +
              (flash.includes("berhasil")
                ? "border-line bg-mint-wash text-mint-strong"
                : "border-line bg-rose-wash text-rose")
            }
            role="status"
          >
            {flash}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Plug className="w-5 h-5 text-mint-strong" aria-hidden />
              <h2 className="font-display font-bold text-ink-strong">Akun Google</h2>
            </div>
            <button
              onClick={connect}
              disabled={starting}
              className="inline-flex items-center gap-2 rounded-xl bg-mint-strong px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> Hubungkan akun
            </button>
          </div>

          {accounts === undefined ? (
            <p className="text-sm text-ink-soft">Memuat…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada akun terhubung.</p>
          ) : (
            <ul className="divide-y divide-line">
              {accounts.map((a: any) => (
                <li key={a._id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-ink-strong">{a.email}</p>
                    <p className="text-xs text-ink-faint flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-mint-strong" aria-hidden />
                      {a.status} · {a.scopes.length} scope · sinkron{" "}
                      {a.lastSyncedAt ? new Date(a.lastSyncedAt).toLocaleString("id-ID") : "—"}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Putuskan koneksi akun " + a.email + "?")) return;
                      setBusyId(a._id);
                      try {
                        await disconnect({ accountId: a._id });
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === a._id}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-rose hover:bg-rose-wash"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Putuskan
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <p className="text-xs text-ink-faint leading-relaxed">
            Scope: Calendar, Gmail (metadata/modify), Tasks, identitas akun. Tanpa gmail.compose.
          </p>
        </section>
      </div>
    </>
  )
};
