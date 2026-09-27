import { useEffect, useRef, useState } from "react";
import { RefreshCw, Plus, X, ExternalLink, TriangleAlert, Rss, LayoutGrid } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

type FetchResult = {
  fetchedAt: number;
  total: number;
  results: {
    source: string;
    label: string;
    category?: string;
    region?: string;
    status: "ok" | "unavailable";
    articles: { what: string; when: string; who: string; where: string; source: string }[];
    // Alasan eksplisit saat sumber tidak tersedia (HTTP/timeout) — bukan error diam.
    error?: string;
    // Hasil datang dari cache server (tanpa request eksternal).
    fromCache?: boolean;
  }[];
};

export default function News() {
  const catalog = useQuery(api.news.listCatalog, {});
  const userSources = useQuery(api.news.listUserSources, {});
  const addSource = useMutation(api.news.addUserSource);
  const removeSource = useMutation(api.news.removeUserSource);
  const fetchNews = useAction(api.news.fetchNews);

  const [category, setCategory] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceCategory, setSourceCategory] = useState("");
  const [sourceRegion, setSourceRegion] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = catalog?.categories ?? [];
  const regions = catalog?.regions ?? [];

  // Design read: kartu editorial non-seragam dalam grid asimetris — judul
  // sebagai headline (what), provenance (where/who) sebagai kicker. Opaque
  // parchment, satu accent mint, tanpa dekorasi; link-out satu cara membaca.

  async function run(cat: string, reg: string, force = false) {
    setCategory(cat);
    setRegion(reg);
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNews({
        category: cat || undefined,
        region: reg || undefined,
        // Pindah kategori memakai cache (server TTL 10 menit); hanya tombol
        // "Ambil berita" yang memaksa fetch ulang.
        force,
      });
      setData(res as unknown as FetchResult);
    } catch (e: any) {
      setError(e?.message ?? "Gagal mengambil berita.");
    } finally {
      setLoading(false);
    }
  }

  // ponytail: auto-load sekali per kunjungan halaman memakai cache server
  // (force=false, TTL 10 menit) — halaman tidak lagi kosong sebelum tombol
  // ditekan; fetch paksa tetap lewat tombol "Ambil berita".
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    void run("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="space-y-6">
        {/* Kurasi kategori × wilayah */}
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-mint-strong" aria-hidden />
            <h2 className="font-display font-bold text-ink-strong">Kurasi</h2>
            <span className="meta-label">kategori × wilayah</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => run("", "")}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold " +
                (category === "" && region === ""
                  ? "bg-mint-strong text-white"
                  : "bg-sunken text-ink hover:bg-line")
              }
            >
              Semua
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => run(c.id, region)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-semibold " +
                  (category === c.id
                    ? "bg-mint-strong text-white"
                    : "bg-sunken text-ink hover:bg-line")
                }
              >
                {c.label}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            {regions.map((r: any) => (
              <button
                key={r.id}
                onClick={() => run(category, r.id)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-semibold " +
                  (region === r.id
                    ? "bg-mint-strong text-white"
                    : "bg-sunken text-ink hover:bg-line")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint">Sumber: Google News dan sumber pribadi Anda.</p>
        </section>

        {/* Sumber milik user: RSS publik, metadata-only, guard URL */}
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Rss className="w-4 h-4 text-mint-strong" aria-hidden />
            <h2 className="font-display font-bold text-ink-strong">Sumber Anda</h2>
            <span className="meta-label">RSS https · maks 12</span>
          </div>
          <form
            className="flex flex-wrap items-center gap-2 mb-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSourceError(null);
              if (!sourceUrl.trim()) return;
              try {
                await addSource({
                  label: sourceLabel.trim() || "",
                  url: sourceUrl.trim(),
                  category: sourceCategory || undefined,
                  region: sourceRegion || undefined,
                });
                setSourceLabel("");
                setSourceUrl("");
                setSourceCategory("");
                setSourceRegion("");
              } catch (err: any) {
                setSourceError(err?.message ?? "Gagal menambah sumber.");
              }
            }}
          >
            <input
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="Label (opsional)"
              className="w-36 rounded-lg border border-line bg-raised px-3 py-1.5 text-xs"
              aria-label="Label sumber berita"
            />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://contoh.com/feed"
              type="url"
              required
              className="min-w-0 flex-1 rounded-lg border border-line bg-raised px-3 py-1.5 text-xs"
              aria-label="URL feed sumber berita"
            />
            <select
              value={sourceCategory}
              onChange={(e) => setSourceCategory(e.target.value)}
              aria-label="Kategori sumber"
              className="rounded-lg border border-line bg-raised px-2 py-1.5 text-xs"
            >
              <option value="">Semua kategori</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              value={sourceRegion}
              onChange={(e) => setSourceRegion(e.target.value)}
              aria-label="Wilayah sumber"
              className="rounded-lg border border-line bg-raised px-2 py-1.5 text-xs"
            >
              <option value="">Semua wilayah</option>
              {regions.map((r: any) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-mint-strong px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </form>
          {sourceError && (
            <p className="mb-3 rounded-lg bg-rose-wash px-3 py-2 text-xs text-rose" role="alert">
              {sourceError}
            </p>
          )}
          {userSources === undefined ? (
            <p className="text-xs text-ink-soft">Memuat…</p>
          ) : userSources.length === 0 ? (
            <p className="text-xs text-ink-faint">Belum ada sumber pribadi.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {userSources.map((s: any) => (
                <li key={s._id} className="px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-strong truncate">{s.label}</p>
                    <p className="text-xs text-ink-faint truncate">{s.url}</p>
                  </div>
                  <button
                    onClick={() => removeSource({ sourceId: s._id })}
                    aria-label={"Hapus sumber " + s.label}
                    className="p-1.5 rounded-lg text-ink-faint hover:text-rose hover:bg-rose-wash shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fetch control + state */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="meta-label">
              {data ? `Terakhir diambil ${new Date(data.fetchedAt).toLocaleTimeString("id-ID")}` : "Belum diambil"}
            </h2>
            <button
              onClick={() => run(category, region, true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-mint-strong px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              <RefreshCw className={"w-3.5 h-3.5" + (loading ? " animate-spin" : "")} />
              {loading ? "Mengambil…" : "Ambil berita"}
            </button>
          </div>

          {error && (
            <p className="rounded-xl border border-line bg-rose-wash px-4 py-3 text-sm text-rose" role="alert">
              {error}
            </p>
          )}

          {data?.results.map((r) => (
            <div key={r.source} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm text-ink-strong">
                  {r.label}
                  {r.fromCache && (
                    <span className="ml-2 meta-label" title="Hasil dari cache server (TTL 10 menit) — tekan Ambil berita untuk memaksa muat ulang">
                      cache
                    </span>
                  )}
                </h3>
                {r.status === "unavailable" ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-amber"
                    title={r.error}
                  >
                    <TriangleAlert className="w-3.5 h-3.5" /> Sumber tidak tersedia
                    {r.error && <span className="text-ink-faint">· {r.error}</span>}
                  </span>
                ) : (
                  <span className="meta-label">{r.articles.length} artikel</span>
                )}
              </div>
              {r.status === "ok" && r.articles.length === 0 ? (
                <p className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink-soft">
                  Tidak ada artikel pada sumber ini saat diambil.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {r.articles.slice(0, 12).map((a) => (
                    <li key={a.source}>
                      <a
                        href={a.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex h-full flex-col rounded-2xl border border-line bg-card p-4 shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <p className="meta-label mb-2 text-mint-strong">
                          {[a.where, a.who].filter((x) => x && x !== "sumber").join(" · ")}
                        </p>
                        <p className="font-display text-sm font-bold leading-snug text-ink-strong">
                          {a.what}
                        </p>
                        {a.when && !a.when.startsWith("waktu") && (
                          <p className="mt-auto pt-3 text-xs text-ink-faint">{a.when}</p>
                        )}
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft group-hover:text-mint-strong">
                          Baca di sumber asli
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {!data && !loading && !error && (
            <div className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">
              Tekan “Ambil berita” untuk menarik berita terbaru.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
