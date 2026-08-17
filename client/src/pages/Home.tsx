/* Mint Atelier: warm editorial Linux desktop dashboard with asymmetric utility panels, parchment surfaces, and mint status signals. */
import { useMemo, useState } from "react";
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

const activities = [
  { time: "09:42", title: "System update complete", detail: "12 packages installed", icon: ShieldCheck, tone: "mint" },
  { time: "09:18", title: "Workspace backed up", detail: "Documents · 148 MB", icon: HardDrive, tone: "blue" },
  { time: "08:56", title: "New network connected", detail: "Studio Wi-Fi · secured", icon: Wifi, tone: "amber" },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [query, setQuery] = useState("");

  const filteredApps = useMemo(
    () => apps.filter((app) => app.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

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
              <p className="eyebrow"><span className="eyebrow-line" /> Monday, August 17, 2026</p>
              <h1>Good morning, <em>Abelion.</em></h1>
              <p className="welcome-copy">Your workspace is in good shape. Here&apos;s the pulse of your machine.</p>
            </div>
            <button className={`focus-toggle ${focusMode ? "on" : ""}`} onClick={() => { setFocusMode(!focusMode); toast(focusMode ? "Focus mode off" : "Focus mode on"); }}><span className="toggle-dot" /> Focus mode</button>
          </section>

          <section className="hero-grid">
            <article className="system-hero panel">
              <div className="hero-art" aria-hidden="true" />
              <div className="hero-content">
                <div className="hero-topline"><span className="status-chip"><span /> System healthy</span><button className="bare-button" onClick={() => toast("System report refreshed")}>Refresh <Activity size={14} /></button></div>
                <div className="hero-heading"><p className="panel-kicker">System overview</p><h2>Everything is<br /><span>running smoothly.</span></h2><p className="hero-description">Your machine is ready for the work ahead. No action needed right now.</p></div>
                <div className="hero-meta"><div><p>Last checked</p><strong>Just now</strong></div><div><p>Uptime</p><strong>14d 06h</strong></div><div><p>Kernel</p><strong>6.8.0-41</strong></div></div><div className="system-metrics"><div><span>CPU</span><strong>18%</strong><i><b style={{ width: "18%" }} /></i></div><div><span>Memory</span><strong>6.4 / 16 GB</strong><i><b style={{ width: "40%" }} /></i></div><div><span>Storage</span><strong>248 / 512 GB</strong><i><b style={{ width: "48%" }} /></i></div></div>
              </div>
            </article>

            <article className="weather-card panel">
              <div className="card-heading"><div><p className="panel-kicker">Today</p><h3>Surabaya, ID</h3></div><CloudSun size={26} className="weather-icon" /></div>
              <div className="temperature"><strong>29°</strong><span>Partly cloudy</span></div>
              <div className="weather-range"><span>H 31°</span><span>L 24°</span><span className="weather-bar"><i /></span></div>
              <div className="sunrise"><span>Sunrise <strong>05:35</strong></span><span>Sunset <strong>17:32</strong></span></div>
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
              <div className="activity-list">{activities.map(({ time, title, detail, icon: Icon, tone }) => <div className="activity-row" key={title}><span className={`activity-icon ${tone}`}><Icon size={16} /></span><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>)}</div>
              <button className="activity-footer" onClick={() => toast("Full activity history opened")}>See full activity <ChevronRight size={15} /></button>
            </article>

            <article className="calendar-card panel">
              <div className="section-header"><div><p className="panel-kicker">Monday</p><h2>August 17</h2></div><CalendarDays size={21} className="calendar-symbol" /></div>
              <div className="calendar-event"><span className="event-time">10:00</span><div className="event-line" /><div><strong>Design review</strong><span>Workspace refresh · 45 min</span></div></div>
              <div className="calendar-event"><span className="event-time">14:30</span><div className="event-line amber-line" /><div><strong>Build &amp; ship</strong><span>OlivX product sync · 30 min</span></div></div>
              <button className="activity-footer" onClick={() => toast("Calendar opened")}>Open calendar <ChevronRight size={15} /></button>
            </article>
          </section>

          <footer className="bottom-status"><span><span className="live-dot" /> All systems operational</span><span>mintdesk 1.4.0</span><span>Updated just now</span></footer>
        </div>
      </main>
    </div>
  );
}
