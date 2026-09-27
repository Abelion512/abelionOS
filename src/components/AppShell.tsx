// AppShell Mint Atelier: sidebar ringkas + topbar (notification glass + profile).
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Sun,
  Newspaper,
  HardDrive,
  History,
  Bell,
  LogOut,
  Plug,
  Settings as SettingsIcon,
  Menu,
  X,
  Leaf,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useAuthActions } from "@/lib/api";
import { api } from "@/convex/_generated/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/focus", label: "Daily Focus", icon: Sun },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/storage", label: "Storage", icon: HardDrive },
  { href: "/activity", label: "Activity", icon: History },
];

const COLLAPSED_KEY = "mintdesk.sidebar.collapsed";

function useEscape(onEscape: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onEscape, active]);
}

export default function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "1"
  );
  const [drawer, setDrawer] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const { signOut } = useAuthActions();
  const notifications = useQuery(api.dashboard.listNotifications, {});
  const markAllRead = useMutation(api.dashboard.markAllRead);
  useEscape(() => {
    setBellOpen(false);
    setProfileOpen(false);
  }, bellOpen || profileOpen);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setDrawer(false);
    setBellOpen(false);
    setProfileOpen(false);
  }, [location]);

  const unread = (notifications ?? []).filter((n: any) => !n.readAt).length;

  return (
    <div className="min-h-screen bg-page text-ink">
      {/* ===== Sidebar ===== */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r border-line bg-card transition-[width] duration-200 " +
          (collapsed ? "w-16" : "w-60")
        }
        aria-label="Navigasi utama"
      >
        <div className="flex items-center gap-2 h-16 px-4">
          <Leaf className="w-5 h-5 text-mint-strong" aria-hidden />
          {!collapsed && (
            <span className="font-display font-bold text-ink-strong text-lg">AbelionOS</span>
          )}
        </div>
        <nav className="flex-1 px-2 py-2 space-y-1" aria-label="Workspace">
          {NAV.map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-mint-wash text-mint-strong"
                    : "text-ink-soft hover:bg-sunken hover:text-ink-strong")
                }
                title={item.label}
              >
                <item.icon className="w-4 h-4 shrink-0" aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center rounded-lg py-2 text-ink-soft hover:bg-sunken"
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            <Menu className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </aside>

      {/* ===== Mobile drawer ===== */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink-strong/40"
            onClick={() => setDrawer(false)}
            aria-hidden
          />
          <div className="glass-surface absolute inset-y-0 left-0 w-64 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-bold text-ink-strong">AbelionOS</span>
              <button onClick={() => setDrawer(false)} aria-label="Tutup menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1" aria-label="Workspace mobile">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium " +
                    (location.startsWith(item.href)
                      ? "bg-mint-wash text-mint-strong"
                      : "text-ink-soft")
                  }
                >
                  <item.icon className="w-4 h-4" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ===== Main ===== */}
      <div className={"transition-[padding] duration-200 " + (collapsed ? "md:pl-16" : "md:pl-60")}>
        <header className="sticky top-0 z-30 h-16 border-b border-line bg-page/90 backdrop-blur-sm">
          <div className="h-full px-4 md:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-sunken"
                onClick={() => setDrawer(true)}
                aria-label="Buka menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-lg md:text-xl text-ink-strong truncate">{title}</h1>
                {subtitle && <p className="text-xs text-ink-soft truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification center (glass layering fungsional) */}
              <div className="relative">
                <button
                  ref={bellRef}
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative p-2 rounded-lg hover:bg-sunken"
                  aria-label="Notifikasi"
                  aria-expanded={bellOpen}
                >
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber" aria-hidden />
                  )}
                </button>
                {bellOpen && (
                  <div
                    className="glass-surface absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl p-3"
                    role="dialog"
                    aria-label="Notification center"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="meta-label">Notifikasi</span>
                      <button
                        className="text-xs text-mint-strong hover:underline"
                        onClick={() => markAllRead({})}
                      >
                        Tandai semua dibaca
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-line">
                      {(notifications ?? []).length === 0 && (
                        <p className="text-sm text-ink-soft py-4">Belum ada notifikasi.</p>
                      )}
                      {(notifications ?? []).map((n: any) => (
                        <div key={n._id} className="py-2">
                          <p className="text-sm font-medium text-ink-strong break-words">{n.title}</p>
                          {n.body && <p className="text-xs text-ink-soft break-words">{n.body}</p>}
                          {/* Notifikasi berita: tautan internal ke halaman News
                              (card berita), selain link-out sumber asli. */}
                          {n.category === "news" && (
                            <Link
                              href="/news"
                              className="mt-1 mr-3 inline-flex items-center gap-1 text-xs font-semibold text-mint-strong hover:underline"
                            >
                              Lihat di News
                              <Newspaper className="w-3 h-3" aria-hidden />
                            </Link>
                          )}
                          {/* Link-out metadata-only: satu cara membaca artikel,
                              URL tidak pernah dirender sebagai teks mentah. */}
                          {n.url && (
                            <a
                              href={n.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mint-strong hover:underline"
                            >
                              Baca di sumber asli
                              <ExternalLink className="w-3 h-3" aria-hidden />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Profile menu */}
              <div className="relative">
                <button
                  ref={profileRef}
                  onClick={() => setProfileOpen((v) => !v)}
                  className="w-9 h-9 rounded-full bg-mint-wash text-mint-strong grid place-items-center text-sm font-bold"
                  aria-label="Menu profil"
                  aria-expanded={profileOpen}
                >
                  M
                </button>
                {profileOpen && (
                  <div
                    className="glass-surface absolute right-0 mt-2 w-56 rounded-xl p-2"
                    role="dialog"
                    aria-label="Menu profil"
                  >
                    <Link href="/connections" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-raised">
                      <Plug className="w-4 h-4" /> Connections
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-raised">
                      <SettingsIcon className="w-4 h-4" /> Settings
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-raised text-left"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 md:px-8 py-6 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
