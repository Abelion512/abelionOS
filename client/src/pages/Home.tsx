/* Mint Atelier: warm editorial Linux desktop dashboard with asymmetric utility panels, parchment surfaces, and mint status signals. */
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { bridgeApi, type BridgeMetrics } from "@/lib/bridge";
import { ProcessPanel } from "@/components/ProcessPanel";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Code2,
  FileText,
  FolderOpen,
  HardDrive,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Network,
  Play,
  Power,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Workspace", icon: FolderOpen },
  { label: "Applications", icon: Sparkles },
  { label: "System health", icon: Activity },
];

const apps = [
  { name: "Files", type: "File manager", icon: FolderOpen, tone: "mint" },
  { name: "Terminal", type: "Command line", icon: TerminalSquare, tone: "charcoal" },
  { name: "Editor", type: "Code workspace", icon: Code2, tone: "amber" },
  { name: "Notes", type: "Quick capture", icon: FileText, tone: "rose" },
];

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [activeNav, setActiveNav] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [query, setQuery] = useState("");
  const [now] = useState(() => new Date());
  const [bridgeMetrics, setBridgeMetrics] = useState<BridgeMetrics | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    bridgeApi.metrics().then((metrics) => {
      if (!active) return;
      setBridgeMetrics(metrics);
      setBridgeError(null);
    }).catch((error: unknown) => {
      if (!active) return;
      setBridgeError(error instanceof Error ? error.message : "Linux companion unavailable");
    });
    return () => { active = false; };
  }, []);

  const filteredApps = useMemo(
    () => apps.filter((app) => app.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const handleNav = (label: string) => {
    setActiveNav(label);
    setSidebarOpen(false);
    if (label !== "Overview") toast(`${label} view is coming next`);
  };

  return (
    <div className="desktop-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <img src="/manus-storage/mint-leaf-logo_f4aa82f7.png" alt="Mint Atelier symbol" className="brand-mark" />
          <div>
            <p className="brand-name">mint<span>desk</span></p>
            <p className="brand-caption">Personal workspace</p>
          </div>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-eyebrow">Workspace</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => handleNav(label)}>
              <Icon size={18} strokeWidth={activeNav === label ? 2.4 : 1.8} />
              <span>{label}</span>
              {activeNav === label && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <div className="note-icon"><Zap size={17} /></div>
          <div>
            <p className="note-title">Quick tip</p>
            <p className="note-copy">Press <kbd>⌘ K</kbd> to search your workspace.</p>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => toast("Settings are ready for customization")}><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => toast("Help center opened")}><CircleHelp size={18} /><span>Help center</span></button>
          <div className="profile-row">
            <div className="avatar">AB</div>
            <div><p className="profile-name">Abelion</p><p className="profile-status"><span /> Available</p></div>
            <MoreHorizontal size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="mobile-scrim" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}

      <main className="main-canvas">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search applications" placeholder="Search workspace" value={query} onChange={(e) => setQuery(e.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <div className="notification-wrap">
              <button className={`icon-button ${notificationsOpen ? "selected" : ""}`} aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} /><span className="notification-dot" /></button>
              {notificationsOpen && <div className="notification-popover"><p className="popover-label">Notifications</p><p className="popover-title">All caught up</p><p className="popover-copy">No new alerts from your system.</p></div>}
            </div>
            <button className="power-button" onClick={() => toast("Power menu opened")}><Power size={16} /><span>Power</span></button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              <h1>Good morning, <em>{user?.name || "Workspace user"}.</em></h1>
              <p className="welcome-copy">Your workspace is in good shape. Here&apos;s the pulse of your machine.</p>
            </div>
            <button className={`focus-toggle ${focusMode ? "on" : ""}`} onClick={() => { setFocusMode(!focusMode); toast(focusMode ? "Focus mode off" : "Focus mode on"); }}><span className="toggle-dot" /> Focus mode</button>
          </section>

          <section className="hero-grid">
            <article className="system-hero panel">
              <div className="hero-art" aria-hidden="true" />
              <div className="hero-content">
                <div className="hero-topline"><span className={`status-chip ${bridgeMetrics ? "" : "status-unavailable"}`}><span /> {bridgeMetrics ? "System connected" : "Linux bridge unavailable"}</span><button className="bare-button" onClick={() => window.location.reload()}>Refresh <Activity size={14} /></button></div>
                <div className="hero-heading"><p className="panel-kicker">System overview</p><h2>{bridgeMetrics ? <>Live system<br /><span>data connected.</span></> : <>Connect the Linux<br /><span>companion to begin.</span></>}</h2><p className="hero-description">{bridgeError || "Metrics are read from your local Linux companion. No fallback values are shown."}</p></div>
                <div className="hero-meta"><div><p>Last checked</p><strong>{bridgeMetrics ? new Date(bridgeMetrics.checkedAt).toLocaleTimeString() : "Unavailable"}</strong></div><div><p>Uptime</p><strong>{bridgeMetrics ? formatUptime(bridgeMetrics.uptimeSeconds) : "Unavailable"}</strong></div><div><p>Platform</p><strong>{bridgeMetrics ? bridgeMetrics.platform : "Unavailable"}</strong></div></div><div className="system-metrics"><div><span>CPU</span><strong>{bridgeMetrics ? `${bridgeMetrics.cpuPercent}%` : "—"}</strong><i><b style={{ width: `${bridgeMetrics?.cpuPercent ?? 0}%` }} /></i></div><div><span>Memory</span><strong>{bridgeMetrics ? `${bridgeMetrics.memory.usedPercent}%` : "—"}</strong><i><b style={{ width: `${bridgeMetrics?.memory.usedPercent ?? 0}%` }} /></i></div><div><span>Load</span><strong>{bridgeMetrics ? bridgeMetrics.loadAverage[0]?.toFixed(2) : "—"}</strong><i><b style={{ width: `${Math.min((bridgeMetrics?.loadAverage[0] ?? 0) * 25, 100)}%` }} /></i></div></div>
              </div>
            </article>

            <article className="weather-card panel">
              <div className="card-heading"><div><p className="panel-kicker">External data</p><h3>Weather not connected</h3></div><CloudSun size={26} className="weather-icon" /></div>
              <div className="connection-empty"><strong>No provider configured.</strong><span>Weather will appear here after a real provider is connected.</span></div>
              <div className="weather-range"><span>Source —</span><span>Permission —</span><span className="weather-bar"><i style={{ width: "0%" }} /></span></div>
              <div className="sunrise"><span>Last sync <strong>—</strong></span><span>State <strong>Unavailable</strong></span></div>
            </article>
          </section>

          <section className="section-block">
            <div className="section-header"><div><p className="panel-kicker">Your tools</p><h2>Quick launch</h2></div><button className="text-button" onClick={() => toast("Application library opened")}>View all <ChevronRight size={15} /></button></div>
            <div className="apps-grid">
              {filteredApps.map(({ name, type, icon: Icon, tone }) => <button className="app-card" key={name} onClick={() => toast(`${name} is opening...`)}><span className={`app-icon ${tone}`}><Icon size={21} /></span><span className="app-copy"><strong>{name}</strong><small>{type}</small></span><ChevronRight size={16} className="app-arrow" /></button>)}
              {filteredApps.length === 0 && <div className="empty-state">No tools match “{query}”.</div>}
            </div>
          </section>

          <section className="lower-grid">
            <article className="activity-card panel">
              <div className="section-header"><div><p className="panel-kicker">Live feed</p><h2>Recent activity</h2></div><button className="icon-button subtle" aria-label="More activity options" onClick={() => toast("Activity filters opened")}><MoreHorizontal size={18} /></button></div>
              <div className="connection-empty activity-empty"><strong>No activity source connected.</strong><span>System events will appear after the Linux bridge exposes an activity stream.</span></div>
              <button className="activity-footer" onClick={() => toast("Full activity history opened")}>See full activity <ChevronRight size={15} /></button>
            </article>

            <article className="calendar-card panel">
              <div className="section-header"><div><p className="panel-kicker">Workspace data</p><h2>Calendar</h2></div><CalendarDays size={21} className="calendar-symbol" /></div>
              <div className="connection-empty calendar-empty"><strong>Google Calendar not connected.</strong><span>Re-authorize with Calendar read scope to load real events.</span></div>
              <button className="activity-footer" onClick={() => toast("Calendar opened")}>Open calendar <ChevronRight size={15} /></button>
            </article>
          </section>

          <section className="process-section"><ProcessPanel /></section>

          <footer className="bottom-status"><span><span className="live-dot" /> {bridgeMetrics ? "Linux bridge connected" : "Waiting for Linux bridge"}</span><span>mintdesk</span><span>{bridgeMetrics ? `Checked ${new Date(bridgeMetrics.checkedAt).toLocaleTimeString()}` : "System status unavailable"}</span></footer>
        </div>
      </main>
    </div>
  );
}
