import { Link } from "wouter";
import {
  Sun,
  Newspaper,
  HardDrive,
  History,
  Plug,
  Cpu,
  Cloud,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const QUICK = [
  { href: "/focus", label: "Daily Focus", icon: Sun, desc: "Briefing evidence hari ini" },
  { href: "/news", label: "News", icon: Newspaper, desc: "Berita sumber pilihan" },
  { href: "/storage", label: "Storage", icon: HardDrive, desc: "Metadata workdir" },
  { href: "/activity", label: "Activity", icon: History, desc: "Audit tindakan" },
];

function StatusDot({ status }: { status: "ok" | "warn" | "none" }) {
  const cls =
    status === "ok" ? "bg-mint-strong" : status === "warn" ? "bg-amber" : "bg-ink-faint";
  return <span className={"inline-block w-2 h-2 rounded-full " + cls} aria-hidden />;
}

export default function Dashboard() {
  const overview = useQuery(api.dashboard.overview, {});

  const accounts = overview?.accounts ?? [];
  const devices = overview?.devices ?? [];
  const deviceOk = devices.some((d: any) => d.status === "online");
  const googleOk = accounts.length > 0 && accounts.every((a: any) => a.status === "active");

  return (
    <>
      <div className="space-y-6">
        {/* Hero status: dua sumber nyata, unavailable diberi label */}
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-mint-strong" aria-hidden />
              <div>
                <p className="meta-label">Companion Linux</p>
                <p className="text-sm font-semibold text-ink-strong flex items-center gap-2">
                  <StatusDot status={devices.length === 0 ? "none" : deviceOk ? "ok" : "warn"} />
                  {devices.length === 0
                    ? "Belum ada observasi"
                    : deviceOk
                      ? "Online"
                      : "Offline / unavailable"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-mint-strong" aria-hidden />
              <div>
                <p className="meta-label">Google Workspace</p>
                <p className="text-sm font-semibold text-ink-strong flex items-center gap-2">
                  <StatusDot status={accounts.length === 0 ? "none" : googleOk ? "ok" : "warn"} />
                  {accounts.length === 0
                    ? "Belum terhubung"
                    : `${accounts.length} akun terhubung`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Plug className="w-5 h-5 text-mint-strong" aria-hidden />
              <div>
                <p className="meta-label">Proposal pending</p>
                <p className="text-sm font-semibold text-ink-strong">
                  {overview?.pendingActions ?? 0} menunggu keputusan
                </p>
              </div>
            </div>
          </div>
          {overview === undefined && <p className="meta-label mt-4">Memuat status…</p>}
        </section>

        {/* Quick access ala home screen: tile menuju halaman nyata */}
        <section>
          <h2 className="meta-label mb-3">Quick access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="rounded-xl border border-line bg-card p-4 card-lift"
              >
                <q.icon className="w-5 h-5 text-mint-strong mb-2" aria-hidden />
                <p className="text-sm font-semibold text-ink-strong">{q.label}</p>
                <p className="text-xs text-ink-soft">{q.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Strip Daily Focus + akun */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-ink-strong">Daily Focus</h2>
              <Link href="/focus" className="text-xs font-semibold text-mint-strong hover:underline">
                Buka
              </Link>
            </div>
            <p className="text-sm text-ink-soft">
              {overview === undefined
                ? "Memuat…"
                : accounts.length === 0
                  ? "Hubungkan akun Google untuk briefing Calendar/Gmail."
                  : `${accounts.length} akun siap. Buka Daily Focus untuk evidence dan proposal.`}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-ink-strong">Akun terhubung</h2>
              <Link href="/connections" className="text-xs font-semibold text-mint-strong hover:underline">
                Kelola
              </Link>
            </div>
            {accounts.length === 0 ? (
              <p className="text-sm text-ink-soft">Belum ada akun Google terhubung.</p>
            ) : (
              <ul className="space-y-1">
                {accounts.map((a: any) => (
                  <li key={a._id} className="text-sm text-ink flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-mint-strong" aria-hidden />
                    {a.email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
