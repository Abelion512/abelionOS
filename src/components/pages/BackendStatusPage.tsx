// Design read: halaman diagnostik tenang ala Mint Atelier — satu kartu status dominan
// (alamat + socket) dan kolom kanan yang lebih kecil untuk env/diagnostik, bertumpuk di
// 375px. Semua permukaan opaque (tanpa glass dekoratif), satu accent mint, amber hanya
// untuk state unavailable.
//
// Halaman ini sengaja PUBLIK (di luar RequireAuth): kegagalan yang paling perlu
// didiagnosis adalah justru saat backend tidak bisa dihubungi, sehingga halaman yang
// butuh sesi tidak akan bisa dibuka.
import { Link } from "wouter";
import { useConvexAuth, useConvexConnectionState } from "convex/react";
import { ArrowLeft, KeyRound, Leaf, Radio, Server } from "lucide-react";
import type { ReactNode } from "react";
import { describeBackend, type UrlSource } from "@/lib/backendStatus";

const SOURCE_LABEL: Record<UrlSource, string> = {
  env: "dari env build",
  origin: "origin browser (proxy dev)",
  fallback: "fallback lokal",
  "derived-cloud": "turunan .convex.cloud",
  "local-site": "site port lokal",
  "origin-proxy": "origin browser (jalur /api)",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="meta-label">{label}</dt>
      <dd className="text-right text-xs text-ink-soft">{children}</dd>
    </div>
  );
}

function Chip({ tone, children }: { tone: "ok" | "warn" | "plain"; children: ReactNode }) {
  const style =
    tone === "ok"
      ? "bg-mint-wash text-mint-strong"
      : tone === "warn"
        ? "bg-amber-wash text-amber"
        : "bg-sunken text-ink-soft";
  return (
    <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + style}>{children}</span>
  );
}

export default function BackendStatusPage() {
  const connection = useConvexConnectionState();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Alamat dihitung dari env build yang sedang berjalan + origin browser saat ini,
  // memakai helper murni yang sama dengan provider Convex.
  const view = describeBackend({
    envClientUrl: import.meta.env.VITE_CONVEX_URL as string | undefined,
    envSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL as string | undefined,
    origin: typeof window === "undefined" ? undefined : window.location.origin,
  });

  const socket = connection.isWebSocketConnected
    ? {
        label: "WebSocket tersambung",
        tone: "ok" as const,
        hint: "Query dan mutation berjalan lewat socket ini.",
      }
    : connection.hasEverConnected
      ? {
          label: "Terputus — mencoba menyambung ulang",
          tone: "warn" as const,
          hint: "Convex mencoba ulang otomatis; data terakhir tetap tampil sampai koneksi pulih.",
        }
      : {
          label: "Menunggu koneksi pertama",
          tone: "warn" as const,
          hint: "Bila bertahan, alamat di bawah tidak terjangkau dari browser — bukan masalah sesi.",
        };

  return (
    <div className="min-h-screen bg-page px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-mint-strong" aria-hidden />
            <span className="font-display font-bold text-lg text-ink-strong">AbelionOS</span>
          </div>
          <Link
            href={isAuthenticated ? "/dashboard" : "/auth"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink-strong"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
            {isAuthenticated ? "Kembali ke dashboard" : "Ke halaman masuk"}
          </Link>
        </div>

        <h1 className="mt-6 font-display font-bold text-2xl text-ink-strong">Status backend</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Alamat Convex yang sedang dipakai build ini dan koneksi realtime-nya. Nilainya
          ter-update otomatis tanpa reload, dan tidak ada secret yang ditampilkan di sini.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          {/* Kartu dominan: status koneksi + alamat yang benar-benar dipakai */}
          <section className="rounded-2xl border border-line bg-card p-6">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-mint-strong" aria-hidden />
              <h2 className="font-display font-bold text-ink-strong">Koneksi backend</h2>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="status">
              <Chip tone={socket.tone}>{socket.label}</Chip>
              <span className="text-xs text-ink-soft">{socket.hint}</span>
            </div>

            <dl className="mt-4">
              <Row label="Client URL (query + socket)">
                <code className="font-mono break-all text-ink">{view.client.url}</code>
                <div className="mt-1">
                  <Chip tone={view.clientFromEnv ? "ok" : "plain"}>
                    {view.clientFromEnv ? "dari VITE_CONVEX_URL" : SOURCE_LABEL[view.client.source]}
                  </Chip>
                </div>
              </Row>
              <Row label="Site URL (HTTP action + OAuth callback)">
                <code className="font-mono break-all text-ink">{view.site.url}</code>
                <div className="mt-1">
                  <Chip tone={view.siteFromEnv ? "ok" : "plain"}>
                    {view.siteFromEnv ? "dari VITE_CONVEX_SITE_URL" : SOURCE_LABEL[view.site.source]}
                  </Chip>
                </div>
              </Row>
              <Row label="Origin browser ini">
                <code className="font-mono break-all text-ink">{view.origin ?? "—"}</code>
              </Row>
              <Row label="Sesi AbelionOS">
                {isLoading ? (
                  <Chip tone="plain">memeriksa…</Chip>
                ) : isAuthenticated ? (
                  <Chip tone="ok">terautentikasi</Chip>
                ) : (
                  <Chip tone="plain">anonim</Chip>
                )}
              </Row>
            </dl>
          </section>

          <div className="space-y-4">
            {/* Environment yang dibake saat build */}
            <section className="rounded-2xl border border-line bg-card p-6">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-mint-strong" aria-hidden />
                <h2 className="font-display font-bold text-ink-strong">Environment build</h2>
              </div>
              <dl className="mt-3">
                <Row label="VITE_CONVEX_URL">
                  {view.envClientUrl ? (
                    <code className="font-mono break-all text-ink">{view.envClientUrl}</code>
                  ) : (
                    <Chip tone="warn">
                      {view.envClientInvalid ? "bukan URL absolut — diabaikan" : "tidak diisi"}
                    </Chip>
                  )}
                </Row>
                <Row label="VITE_CONVEX_SITE_URL">
                  {view.envSiteUrl ? (
                    <code className="font-mono break-all text-ink">{view.envSiteUrl}</code>
                  ) : (
                    <Chip tone="warn">
                      {view.envSiteInvalid ? "bukan URL absolut — diabaikan" : "tidak diisi"}
                    </Chip>
                  )}
                </Row>
              </dl>
              {!view.clientFromEnv && (
                <p className="mt-4 rounded-xl border border-line bg-amber-wash px-4 py-3 text-xs text-amber">
                  {view.envClientInvalid ? (
                    <>
                      Build ini menerima <span className="font-mono">VITE_CONVEX_URL</span> yang
                      bukan URL absolut (nilai tersegel platform), jadi diabaikan: perintah build
                      perlu mengeset URL Convex secara eksplisit, lalu deploy ulang.
                    </>
                  ) : (
                    <>
                      Build ini tidak memakai <span className="font-mono">VITE_CONVEX_URL</span>. Di
                      preview dev itu normal (origin diproxy Vite ke backend lokal), tetapi di
                      deployment statis artinya tidak ada backend yang bisa dihubungi: isi kedua env
                      di atas pada environment deploy, lalu deploy ulang.
                    </>
                  )}
                </p>
              )}
            </section>

            {/* Diagnostik koneksi: angka mentah dari Convex client */}
            <section className="rounded-2xl border border-line bg-card p-6">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-mint-strong" aria-hidden />
                <h2 className="font-display font-bold text-ink-strong">Diagnostik koneksi</h2>
              </div>
              <dl className="mt-3">
                <Row label="Pernah tersambung">
                  <Chip tone={connection.hasEverConnected ? "ok" : "warn"}>
                    {connection.hasEverConnected ? "ya" : "belum"}
                  </Chip>
                </Row>
                <Row label="Percobaan gagal">
                  <span className="font-mono text-ink">{connection.connectionRetries}</span>
                </Row>
                <Row label="Jumlah koneksi">
                  <span className="font-mono text-ink">{connection.connectionCount}</span>
                </Row>
                <Row label="Request tertunda">
                  <span className="font-mono text-ink">
                    {connection.inflightMutations + connection.inflightActions}
                  </span>
                </Row>
              </dl>
            </section>
          </div>
        </div>

        <section className="mt-4 rounded-2xl border border-line bg-card p-6 text-xs text-ink-soft">
          <h2 className="font-display font-bold text-sm text-ink-strong">Cara membaca halaman ini</h2>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>
              <span className="font-mono">Client URL</span> harus menunjuk deployment Convex yang
              aktif (cloud di produksi); WebSocket AbelionOS berjalan di alamat ini.
            </li>
            <li>
              <span className="font-mono">Site URL</span> melayani HTTP action: Convex Auth dan
              callback OAuth Google (<span className="font-mono">/api/google/callback</span>).
            </li>
            <li>
              Deployment statis tidak bisa menjalankan backend sendiri — tanpa{" "}
              <span className="font-mono">VITE_CONVEX_URL</span> yang diisi saat build, halaman ini
              akan tetap menampilkan status menunggu koneksi.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
