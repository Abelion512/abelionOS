import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthActions } from "@convex-dev/auth/react";
import { Leaf } from "lucide-react";
import { explainAuthError } from "@/lib/authError";
import { BackendStatusNotice } from "@/components/BackendStatusNotice";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [location, navigate] = useLocation();

  const returnTo = (() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const target = q.get("returnTo");
      return target && target.startsWith("/") ? target : "/dashboard";
    } catch {
      return "/dashboard";
    }
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Tanpa redirectTo: pada Password provider tanpa email verification,
      // parameter itu menunda penyelesaian flow sampai redirect kedua dan UI
      // tampak "memproses terus". Navigasi manual setelah promise selesai.
      // Watchdog: promise yang menggantung karena retry/limit server tidak boleh
      // membuat tombol "Memproses…" tanpa akhir dan tanpa pesan.
      const watchdog = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("AbelionOSTimeout")), 15_000);
      });
      await Promise.race([
        signIn("password", {
          flow: mode === "signin" ? "signIn" : "signUp",
          email,
          password,
        }),
        watchdog,
      ]);
      navigate(returnTo);
    } catch (err) {
      setError(explainAuthError(err));
    } finally {
      if (timer) clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-page grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Leaf className="w-5 h-5 text-mint-strong" aria-hidden />
          <span className="font-display font-bold text-lg text-ink-strong">AbelionOS</span>
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h1 className="font-display font-bold text-xl text-ink-strong mb-1">
            {mode === "signin" ? "Masuk" : "Buat akun"}
          </h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="meta-label block mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="meta-label block mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            {error && (
              <p className="text-sm text-rose" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-mint-strong px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Memproses…" : mode === "signin" ? "Masuk" : "Daftar"}
            </button>
          </form>
          <button
            className="mt-4 w-full text-xs text-ink-soft hover:text-ink-strong"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "Belum punya akun? Daftar di sini."
              : "Sudah punya akun? Masuk di sini."}
          </button>
        </div>
        <div className="mt-4">
          <BackendStatusNotice />
        </div>
      </div>
    </div>
  );
}
