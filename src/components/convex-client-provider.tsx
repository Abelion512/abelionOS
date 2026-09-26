import { useState } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { resolveConvexUrl } from "@/lib/backendStatus";

// ponytail: satu tempat memilih alamat backend Convex — logikanya di
// src/lib/backendStatus.ts supaya halaman /status membaca keputusan yang sama.
// - Produksi: VITE_CONVEX_URL cloud (dibake saat build).
// - Preview/dev di origin publik: pakai window.location.origin — WebSocket
//   Convex diproxy Vite ke backend lokal (127.0.0.1:3210). Browser pengguna
//   tidak pernah bisa menjangkau 127.0.0.1 backend secara langsung.
// - fallback terakhir: 127.0.0.1:3210 (browser di dalam sandbox/lokal).
const resolveClientUrl = () =>
  resolveConvexUrl({
    envUrl: import.meta.env.VITE_CONVEX_URL as string | undefined,
    origin: typeof window === "undefined" ? undefined : window.location.origin,
  }).url;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(resolveClientUrl(), { expectAuth: true }));
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
