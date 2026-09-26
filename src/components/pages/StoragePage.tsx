import { HardDrive, TriangleAlert } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Workdir canonical sesuai AGENTS.md.
const WORKDIR = "/media/abelion/Isaf/ican/project";

export default function StoragePage() {
  const devices = useQuery(api.agents.listObservations, {});

  const latest = (devices ?? [])
    .filter((d: any) => d.status === "online")
    .sort((a: any, b: any) => b.observedAt - a.observedAt)[0];

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-5 h-5 text-mint-strong" aria-hidden />
            <h2 className="font-display font-bold text-ink-strong">Workdir canonical</h2>
          </div>
          <p className="rounded-lg bg-sunken px-3 py-2 text-sm font-mono text-ink">{WORKDIR}</p>
          {devices === undefined ? (
            <p className="meta-label mt-4">Memuat observasi…</p>
          ) : !latest ? (
            <p className="mt-4 rounded-xl border border-line bg-amber-wash px-4 py-3 text-sm text-amber">
              Companion belum melaporkan observasi workdir. Metadata akan muncul setelah
              companion online dan melaporkan workdir.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="meta-label">Device</p>
                <p className="text-sm font-semibold text-ink-strong">{latest.deviceId}</p>
              </div>
              <div>
                <p className="meta-label">Status</p>
                <p className="text-sm font-semibold text-ink-strong">{latest.status}</p>
              </div>
              <div>
                <p className="meta-label">Terakhir dilaporkan</p>
                <p className="text-sm font-semibold text-ink-strong">
                  {new Date(latest.observedAt).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-faint flex items-center gap-1">
            <TriangleAlert className="w-3.5 h-3.5" />
            Metadata saja — Mintdesk tidak membuka, mengunggah, atau mengubah file dari browser.
          </p>
        </section>
      </div>
    </>
  );
}
