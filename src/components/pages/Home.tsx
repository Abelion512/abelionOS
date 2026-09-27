import { Link } from "wouter";
import { Sun, Users, Laptop, Newspaper, ArrowRight, Leaf } from "lucide-react";

const FEATURES = [
  {
    icon: Sun,
    title: "Daily Focus",
    body: "Briefing harian dari Calendar dan Gmail — evidence dulu, rekomendasi kemudian, konfirmasi manusia selalu di akhir.",
  },
  {
    icon: Users,
    title: "Multi-account Workspace",
    body: "Hubungkan beberapa akun Google. Setiap proposal diberi label akun asalnya, dipreview, lalu diputuskan oleh Anda.",
  },
  {
    icon: Laptop,
    title: "Companion Linux",
    body: "Companion Bun di laptop Anda melaporkan health, metrics, dan workdir metadata — read-only, tanpa remote shell.",
  },
  {
    icon: Newspaper,
    title: "News personal",
    body: "Ringkasan berita dari sumber pilihan Anda, on-demand, dengan tautan ke artikel asli — bukan rehost konten.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-mint-strong" aria-hidden />
          <span className="font-display font-bold text-lg text-ink-strong">AbelionOS</span>
        </div>
        <Link
          href="/auth?returnTo=%2Fdashboard"
          className="text-sm font-semibold text-mint-strong hover:underline"
        >
          Masuk
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        {/* Hero — satu pernyataan operasional, bukan copy marketing */}
        <section className="pt-14 pb-16 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-wash px-3 py-1 text-xs font-semibold text-mint-strong mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-strong" aria-hidden />
            Daily Focus Assistant untuk Linux Mint
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-tight text-ink-strong">
            Satu layar untuk kondisi mesin, agenda, dan keputusan harian Anda.
          </h1>
          <p className="mt-5 text-lg text-ink-soft leading-relaxed">
            Evidence Calendar, Gmail, dan companion lokal — konfirmasi di setiap tindakan.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth?returnTo=%2Fdashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-mint-strong px-5 py-3 text-sm font-semibold text-white hover:brightness-95"
            >
              Mulai sekarang <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <span className="text-xs text-ink-faint">
              Data ditampilkan apa adanya — tanpa mock, tanpa klaim kosong.
            </span>
          </div>
        </section>

        {/* Fitur: empat kartu dengan bobot berbeda, bukan grid SaaS seragam */}
        <section className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className={
                "rounded-2xl border border-line bg-card p-6 card-lift " +
                (i === 0 ? "md:col-span-2 md:flex md:items-start md:gap-6" : "")
              }
            >
              <f.icon className="w-6 h-6 text-mint-strong mb-3 md:mb-0 shrink-0" aria-hidden />
              <div>
                <h2 className="font-display font-bold text-ink-strong mb-1">{f.title}</h2>
                <p className="text-sm text-ink-soft leading-relaxed">{f.body}</p>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
