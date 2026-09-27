import { Settings as SettingsIcon, BellRing, BellOff, Send, Server, Plug, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePushSetup } from "@/lib/pushSetup";

const ENV_KEYS = [
  "AUTH_OWNER_EMAIL (pemilik tunggal — tanpa ini pendaftaran terkunci)",
  "JWT_PRIVATE_KEY (dibuat npx @convex-dev/auth — penandatangan sesi)",
  "JWKS (kunci publik pasangan JWT_PRIVATE_KEY)",
  "VITE_CONVEX_URL (diisi Freebuff untuk deployment Convex)",
  "GOOGLE_CLIENT_ID",
  "Google Secret (GOOGLE_CLIENT_SECRET)",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "OAUTH_STATE_SECRET (min 32 karakter)",
  "TOKEN_ENCRYPTION_KEY (hex 64 karakter)",
  "VAPID_PUBLIC_KEY (push notifications)",
  "VAPID_PRIVATE_KEY (push notifications)",
];

function PushSettingsSection() {
  const { state, error, enable, disable } = usePushSetup();
  const sendTest = useAction(api.push.sendTestPush);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function runTest() {
    setTestBusy(true);
    setTestResult(null);
    try {
      const r = (await sendTest({})) as unknown as { sent: number; removed: number };
      setTestResult(
        r.sent > 0
          ? "Terkirim ke " + r.sent + " perangkat — periksa notifikasi sistem."
          : "Tidak ada perangkat terdaftar, notifikasi uji masuk ke inbox in-app."
      );
    } catch (e: any) {
      setTestResult(e?.message ?? "Gagal mengirim notifikasi uji.");
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-mint-strong" aria-hidden />
          <h2 className="font-display font-bold text-ink-strong">Push notifications</h2>
        </div>
        {state === "subscribed" ? (
          <button
            onClick={disable}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-sunken"
          >
            <BellOff className="w-4 h-4" /> Matikan
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={state === "busy" || state === "unsupported"}
            className="inline-flex items-center gap-2 rounded-xl bg-mint-strong px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            <BellRing className="w-4 h-4" />
            {state === "busy" ? "Memproses…" : "Aktifkan push"}
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        {state === "unsupported"
          ? "Browser ini tidak mendukung push. Inbox in-app tetap berfungsi."
          : state === "subscribed"
            ? "Aktif di perangkat ini — berita baru dan status operasional dikirim sebagai metadata, tanpa isi email."
            : "Izin diminta setelah Anda menekan tombol. Tanpa push, inbox in-app tetap menjadi fallback utama."}
      </p>
      {error && (
        <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-xs text-amber" role="alert">
          {error}
        </p>
      )}
      {state === "subscribed" && (
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={runTest}
            disabled={testBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {testBusy ? "Mengirim…" : "Kirim notifikasi uji"}
          </button>
          {testResult && (
            <p className="text-xs text-ink-soft" role="status">
              {testResult}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

type ProductRow = {
  _id: string;
  productId: string;
  type: "local" | "web";
  status: "active" | "archived";
  allowlist: string[];
  createdAt: number;
};

// Bagian "Connected products" — registry produk klien yang menyambung ke
// Google Workspace melalui AbelionOS (docs/PRODUCT-CONNECTION-DESIGN.md).
// Secret hanya tampil SEKALI setelah register/rotate, lalu tidak pernah
// dikirim server lagi (server hanya menyimpan hash).
// Registry capability yang bisa di-grant owner: read F3 + proposal F4.
// Sengaja tanpa calendar.delete/gmail.trash — klien tidak mengusulkan
// operasi destruktif; write tetap preview + confirm di Daily Focus.
// Di-export agar regression test bisa mem-pin konsistensi dengan registry
// backend (productReadLogic) — daftar capability tidak boleh berbeda.
export const PRODUCT_CAPABILITIES = [
  "calendar.read.list",
  "calendar.read.events",
  "calendar.create.proposal",
  "task.create.proposal",
];

function ProductsSection() {
  const products = useQuery(api.products.listProducts, {});
  const register = useMutation(api.products.registerProduct);
  const rotate = useMutation(api.products.rotateProductSecret);
  const revoke = useMutation(api.products.revokeProduct);
  const setAllowlist = useMutation(api.products.setProductAllowlist);

  const [name, setName] = useState("");
  const [type, setType] = useState<"local" | "web">("local");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oneTimeSecret, setOneTimeSecret] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [allowlistError, setAllowlistError] = useState<string | null>(null);

  const active = (products ?? []).filter((p: ProductRow) => p.status === "active");
  const archived = (products ?? []).filter((p: ProductRow) => p.status === "archived");

  async function run(fn: () => Promise<{ secret: string }>, slug: string) {
    setBusy(true);
    setError(null);
    setOneTimeSecret(null);
    try {
      const { secret } = await fn();
      setOneTimeSecret({ id: slug, secret });
      setCopied(false);
      setName("");
    } catch (e: any) {
      setError(e?.message ?? "Gagal memproses permintaan.");
    } finally {
      setBusy(false);
    }
  }

  async function doRevoke(slug: string) {
    setBusy(true);
    setError(null);
    setConfirmRevoke(null);
    try {
      await revoke({ productId: slug });
    } catch (e: any) {
      setError(e?.message ?? "Gagal mencabut produk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Plug className="w-5 h-5 text-mint-strong" aria-hidden />
        <h2 className="font-display font-bold text-ink-strong">Connected products</h2>
      </div>
      <p className="text-sm text-ink-soft">
        Secret = bearer token produk, tampil sekali; server menyimpan hash-nya. Akses
        terbatas allowlist (deny-by-default).
      </p>

      {products === undefined ? (
        <p className="mt-4 text-sm text-ink-faint">Memuat produk terhubung…</p>
      ) : (
        <>
          {active.length === 0 ? (
            <p className="mt-4 text-sm text-ink-faint">
              Belum ada produk aktif. Daftarkan satu, misalnya abelink.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {active.map((p: ProductRow) => (
                <li
                  key={p._id}
                  className="rounded-xl border border-line px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-strong font-mono">{p.productId}</p>
                    <p className="text-xs text-ink-faint">
                      {p.type} · allowlist {p.allowlist.length} capability
                      {p.allowlist.length > 0 ? ": " + p.allowlist.join(", ") : " (deny-by-default)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Capability produk ${p.productId}`}>
                      {PRODUCT_CAPABILITIES.map((cap) => {
                        const granted = p.allowlist.includes(cap);
                        return (
                          <label
                            key={cap}
                            className={
                              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                              (granted
                                ? "border-mint-strong/40 bg-mint-wash text-mint-strong"
                                : "border-line text-ink-faint hover:bg-sunken")
                            }
                          >
                            <input
                              type="checkbox"
                              checked={granted}
                              disabled={busy}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...p.allowlist, cap]
                                  : p.allowlist.filter((c) => c !== cap);
                                setAllowlistError(null);
                                setAllowlist({ productId: p.productId, capabilities: next }).catch(
                                  (err: any) => setAllowlistError(err?.message ?? "Gagal mengubah capability.")
                                );
                              }}
                              className="h-3 w-3 accent-mint-strong"
                            />
                            {cap}
                          </label>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => run(() => rotate({ productId: p.productId }), p.productId)}
                      disabled={busy}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken disabled:opacity-60"
                    >
                      Rotasi kunci
                    </button>
                    {confirmRevoke === p.productId ? (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => doRevoke(p.productId)}
                          disabled={busy}
                          className="rounded-lg bg-rose px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Ya, cabut
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(null)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken"
                        >
                          Batal
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRevoke(p.productId)}
                        disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken disabled:opacity-60"
                      >
                        Cabut akses
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {archived.length > 0 && (
            <p className="mt-3 text-xs text-ink-faint">
              {archived.length} entri lama diarsipkan — riwayat tetap tercatat di audit.
            </p>
          )}
        </>
      )}

      {oneTimeSecret && (
        <div
          className="mt-4 rounded-xl border border-mint-strong/40 bg-sunken px-4 py-3"
          role="status"
        >
          <p className="text-xs font-semibold text-ink-strong">
            Secret produk “{oneTimeSecret.id}” — tampil sekali, salin sekarang:
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <code className="rounded-lg bg-card px-3 py-1.5 text-xs font-mono text-ink break-all max-w-full">
              {oneTimeSecret.secret}
            </code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(oneTimeSecret.secret);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken"
            >
              {copied ? <Check className="w-3.5 h-3.5" aria-label="Tersalin" /> : <Copy className="w-3.5 h-3.5" aria-label="Salin" />}
              <span className="ml-1">{copied ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Simpan sekarang (local: file chmod 600; web: backend env) — tidak bisa dilihat lagi.
          </p>
        </div>
      )}

      {allowlistError && (
        <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-xs text-amber" role="alert">
          {allowlistError}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-xs text-amber" role="alert">
          {error}
        </p>
      )}

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void run(() => register({ productId: name, type }), name.trim().toLowerCase());
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nama produk (mis. abelink)"
          aria-label="Nama produk baru"
          maxLength={32}
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-mint-strong/40"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value === "web" ? "web" : "local")}
          aria-label="Tipe produk"
          className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mint-strong/40"
        >
          <option value="local">local</option>
          <option value="web">web</option>
        </select>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-xl bg-mint-strong px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Memproses…" : "Daftarkan"}
        </button>
      </form>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <SettingsIcon className="w-5 h-5 text-mint-strong" aria-hidden />
            <h2 className="font-display font-bold text-ink-strong">Environment keys</h2>
          </div>
          <ul className="text-sm text-ink space-y-1 list-disc list-inside">
            {ENV_KEYS.map((k) => (
              <li key={k} className="font-mono text-xs">
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-faint">
            Nama key saja yang tercantum — nilai secret diisi pemilik lewat Settings →
            Environment dan tidak pernah masuk git, log, atau UI.
          </p>
        </section>

        {/* Diagnostik alamat backend (halaman publik /status). */}
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-5 h-5 text-mint-strong" aria-hidden />
            <h2 className="font-display font-bold text-ink-strong">Status backend</h2>
          </div>
          <p className="text-sm text-ink-soft">
            Alamat Convex yang sedang dipakai build ini (client URL, site URL, status WebSocket)
            beserta env yang dibake saat build.
          </p>
          <Link
            href="/status"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-sunken"
          >
            Buka status backend
          </Link>
        </section>

        {/* Push notifications: izin hanya dari klik eksplisit (kontrak AGENTS.md). */}
        <PushSettingsSection />

        {/* Registry produk klien — secret tampil sekali, hash-only server-side. */}
        <ProductsSection />

        <section className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">
          <h2 className="font-display font-bold text-ink-strong mb-2">Batas produk</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Tidak ada gmail.compose (draft/send) — scope sengaja tidak diminta.</li>
            <li>Semua write Google lewat proposal + konfirmasi manusia.</li>
            <li>Body Gmail tidak pernah dipersistenkan.</li>
            <li>Companion hanya observasi; tidak ada remote shell.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
