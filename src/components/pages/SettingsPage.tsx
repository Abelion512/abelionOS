import { Settings as SettingsIcon, BellRing, BellOff, Send, Server } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAction } from "convex/react";
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
