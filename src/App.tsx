import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import Home from "@/components/pages/Home";
import AuthPage from "@/components/pages/AuthPage";
import BackendStatusPage from "@/components/pages/BackendStatusPage";
import AppShell from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";

// ponytail: halaman publik (Home/Auth/status) tetap eager — status justru
// dibutuhkan saat backend bermasalah; tujuh halaman workspace di-load per route
// lewat dynamic import supaya bundle awal tidak memuat kode yang belum dibuka.
const Dashboard = lazy(() => import("@/components/pages/Dashboard"));
const DailyFocus = lazy(() => import("@/components/pages/DailyFocus"));
const News = lazy(() => import("@/components/pages/News"));
const StoragePage = lazy(() => import("@/components/pages/StoragePage"));
const Activity = lazy(() => import("@/components/pages/Activity"));
const Connections = lazy(() => import("@/components/pages/Connections"));
const SettingsPage = lazy(() => import("@/components/pages/SettingsPage"));

// Judul/subtitle shell per route: satu tempat, sehingga AppShell cukup dimount
// sekali untuk semua halaman workspace — navigasi tidak me-remount sidebar,
// state collapsed, dan subscription notifikasinya.
const SHELL_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Kondisi workspace Anda saat ini" },
  "/focus": { title: "Daily Focus", subtitle: "Evidence dulu, keputusan kemudian" },
  "/news": {
    title: "News",
    subtitle: "Metadata berita dari sumber pilihan Anda — klik untuk artikel asli",
  },
  "/storage": { title: "Storage", subtitle: "Metadata workdir yang diizinkan — bukan file manager" },
  "/activity": {
    title: "Activity",
    subtitle: "Audit metadata tindakan — tanpa credential atau konten email",
  },
  "/connections": {
    title: "Connections",
    subtitle: "Multi-account Google Workspace — satu koneksi per akun",
  },
  "/settings": { title: "Settings", subtitle: "Konfigurasi environment dan batas produk" },
};

// Hanya path workspace yang masuk shell; path tak dikenal tetap jatuh ke Home.
const WORKSPACE_PATHS = /^\/(dashboard|focus|news|storage|activity|connections|settings)(\/|$)/;

function ShellLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const meta = SHELL_META["/" + (location.split("/")[1] ?? "")];
  return (
    <AppShell title={meta?.title ?? "Mintdesk"} subtitle={meta?.subtitle}>
      {children}
    </AppShell>
  );
}

// Design read: fallback pemuatan singkat sebagai status halaman satu baris di
// dalam shell (sidebar tetap terlihat), bukan overlay penuh atau spinner.
function PageFallback() {
  return (
    <p className="meta-label" role="status">
      Memuat halaman…
    </p>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      {/* Diagnostik backend sengaja publik: dibutuhkan justru saat backend mati. */}
      <Route path="/status" component={BackendStatusPage} />
      <Route path={WORKSPACE_PATHS}>
        <RequireAuth>
          <ShellLayout>
            <Suspense fallback={<PageFallback />}>
              <Switch>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/focus" component={DailyFocus} />
                <Route path="/news" component={News} />
                <Route path="/storage" component={StoragePage} />
                <Route path="/activity" component={Activity} />
                <Route path="/connections" component={Connections} />
                <Route path="/settings" component={SettingsPage} />
              </Switch>
            </Suspense>
          </ShellLayout>
        </RequireAuth>
      </Route>
      <Route component={Home} />
    </Switch>
  );
}
