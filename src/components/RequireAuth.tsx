import { useEffect } from "react";
import { useLocation } from "wouter";
import { useConvexAuth } from "convex/react";
import { BackendStatusNotice } from "@/components/BackendStatusNotice";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth?returnTo=" + encodeURIComponent(location));
    }
  }, [isLoading, isAuthenticated, location, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-page px-4">
        <div className="w-full max-w-sm space-y-3">
          <div className="meta-label text-center">Memuat sesi…</div>
          {/* Tanpa backend yang terjangkau, isLoading tidak pernah selesai:
              notice memberi status unavailable yang eksplisit, bukan spinner abadi. */}
          <BackendStatusNotice />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
