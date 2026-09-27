import { useEffect, useState } from "react";
import { useConvexConnectionState } from "convex/react";
import { Link } from "wouter";
import { ServerOff } from "lucide-react";

// Deployment statis tanpa VITE_CONVEX_URL (atau backend yang mati) membuat klien
// Convex hanya bisa reconnect-loop tanpa pernah memuat data. Tanpa notice ini UI
// tampak "memuat selamanya"; kontrak UI menuntut status unavailable yang eksplisit.
const GRACE_MS = 6_000;

export function BackendStatusNotice() {
  const { isWebSocketConnected } = useConvexConnectionState();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isWebSocketConnected) {
      setVisible(false);
      return;
    }
    // Beri tenggang agar handshake awal (termasuk lewat proxy dev) tidak memicu notice.
    const timer = setTimeout(() => setVisible(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [isWebSocketConnected]);

  if (!visible) return null;

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-line bg-amber-wash px-4 py-3 text-sm text-amber"
    >
      <ServerOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Backend AbelionOS belum tersambung, jadi data dan sesi tidak dapat dimuat. Pada deployment
        produksi ini berarti <span className="font-mono text-xs">VITE_CONVEX_URL</span> belum diisi.
        <Link href="/status" className="mt-1 block font-semibold text-mint-strong underline">
          Lihat status backend
        </Link>
      </span>
    </p>
  );
}
