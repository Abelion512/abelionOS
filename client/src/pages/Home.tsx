import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { bridgeApi, type BridgeMetrics } from "@/lib/bridge";
import { ProcessPanel } from "@/components/ProcessPanel";
import { healthFailed, healthSucceeded, initialBridgeHealthState } from "@/lib/bridgeHealthState";
import { pollBridgeHealth, startBridgeHealthPolling } from "@/lib/bridgeHealthPolling";
import { Activity, CheckCircle2, CircleHelp, Cpu, FolderOpen, LayoutDashboard, Menu, Settings, ShieldAlert, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<BridgeMetrics | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [healthState, setHealthState] = useState(initialBridgeHealthState);

  const checkHealth = async () => pollBridgeHealth(bridgeApi.health, setHealthState);

  const refresh = async () => {
    await checkHealth();
    try {
      const next = await bridgeApi.metrics();
      setMetrics(next);
      setBridgeError(null);
      setCheckedAt(new Date());
    } catch (reason) {
      setMetrics(null);
      setBridgeError(reason instanceof Error ? reason.message : "Linux companion unavailable");
      setCheckedAt(new Date());
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => startBridgeHealthPolling({ request: bridgeApi.health, onState: setHealthState }), []);

  const displayName = user?.name || user?.email || "Unauthenticated user";
  const statusLabel = healthState.online ? "Connected" : "Unavailable";

  return <div className="desktop-shell">
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">✦</div>
        <div><p className="brand-name">mint<span>desk</span></p><p className="brand-caption">Linux workspace</p></div>
        <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
      </div>
      <nav className="primary-nav" aria-label="Primary navigation">
        <p className="nav-eyebrow">Workspace</p>
        <div className="nav-item active"><LayoutDashboard size={18} /><span>Overview</span><span className="nav-dot" /></div>
        <Link href="/briefing" className="nav-item"><Sun size={18} /><span>Morning briefing</span><span className="nav-status">Live</span></Link>
        <Link href="/processes" className="nav-item"><Activity size={18} /><span>Processes</span><span className="nav-status">Local</span></Link>
        <Link href="/activity" className="nav-item"><Activity size={18} /><span>Activity</span><span className="nav-status">Audit</span></Link>
        <Link href="/files" className="nav-item"><FolderOpen size={18} /><span>Files</span><span className="nav-status">S3</span></Link>
      </nav>
      <div className="sidebar-note"><div className="note-icon"><ShieldAlert size={17} /></div><div><p className="note-title">No hidden fallback</p><p className="note-copy">Unavailable data stays unavailable until a source is connected.</p></div></div>
      <div className="sidebar-footer"><Link href="/settings" className="nav-item"><Settings size={18} /><span>Settings</span><span className="nav-status">Read-only</span></Link><Link href="/connections" className="nav-item"><CircleHelp size={18} /><span>Connection guide</span></Link><div className="profile-row"><div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div><div><p className="profile-name">{displayName}</p><p className="profile-status"><span className={isAuthenticated ? "" : "offline-dot"} /> {isAuthenticated ? "Authenticated" : "Not authenticated"}</p></div></div></div>
    </aside>
    {sidebarOpen && <button className="mobile-scrim" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}
    <main className="main-canvas">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><strong>Overview</strong></div><div className="topbar-actions"><span className={`connection-label ${healthState.online ? "is-online" : "is-offline"}`}><Cpu size={15} /> {statusLabel}</span><button className="power-button" onClick={() => void refresh()}><Activity size={16} /><span>Refresh</span></button></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><p className="eyebrow"><span className="eyebrow-line" /> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><h1>Linux workspace, <em>without the fiction.</em></h1><p className="welcome-copy">Only connected sources appear as live data. Everything else is explicitly marked unavailable or planned.</p></div></section>
        <section className="hero-grid">
          <article className="system-hero panel"><div className="hero-content"><div className="hero-topline"><span className={`status-chip ${healthState.online ? "" : "status-unavailable"}`}><span /> Linux bridge {statusLabel.toLowerCase()}</span><button className="bare-button" onClick={() => void refresh()}>Refresh <Activity size={14} /></button></div><div className="hero-heading"><p className="panel-kicker">System overview</p><h2>{metrics ? <>Live Linux<br /><span>data connected.</span></> : healthState.online ? <>Bridge is online.<br /><span>Metrics are unavailable.</span></> : <>Connect the Linux<br /><span>companion to begin.</span></>}</h2><p className="hero-description">{bridgeError || healthState.detail || "Metrics come directly from the local companion. No fallback values are shown."}</p></div><div className="hero-meta"><div><p>Health checked</p><strong>{healthState.checkedAt ? healthState.checkedAt.toLocaleTimeString() : "Not checked"}</strong></div><div><p>Uptime</p><strong>{metrics ? formatUptime(metrics.uptimeSeconds) : "Unavailable"}</strong></div><div><p>Platform</p><strong>{metrics?.platform || "Unavailable"}</strong></div></div><div className="system-metrics"><div><span>CPU</span><strong>{metrics ? `${metrics.cpuPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.cpuPercent ?? 0}%` }} /></i></div><div><span>Memory</span><strong>{metrics ? `${metrics.memory.usedPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.memory.usedPercent ?? 0}%` }} /></i></div><div><span>Load</span><strong>{metrics ? metrics.loadAverage[0]?.toFixed(2) : "—"}</strong><i><b style={{ width: `${Math.min((metrics?.loadAverage[0] ?? 0) * 25, 100)}%` }} /></i></div></div></div></article>
          <article className="weather-card panel"><div className="card-heading"><div><p className="panel-kicker">External provider</p><h3>Not configured</h3></div><ShieldAlert size={25} className="weather-icon" /></div><div className="connection-empty"><strong>Weather is unavailable.</strong><span>No provider or location permission has been configured. This card will remain unavailable.</span></div></article>
        </section>
        <section className="lower-grid"><ProcessPanel /><article className="calendar-card panel"><div className="section-header"><div><p className="panel-kicker">Google Workspace</p><h2>Not connected</h2></div><ShieldAlert size={20} className="calendar-symbol" /></div><div className="connection-empty calendar-empty"><strong>Calendar and Gmail are not available to this app yet.</strong><span>The session connector is separate from the deployed app OAuth flow. No events or messages are fabricated.</span></div></article></section>
        <footer className="bottom-status"><span><span className="live-dot" /> {healthState.online ? "Linux bridge health online" : "Linux bridge health unavailable"}</span><span>mintdesk</span><span>{loading ? "Authenticating" : healthState.checkedAt ? `Health checked ${healthState.checkedAt.toLocaleTimeString()}` : "Not checked"}</span></footer>
      </div>
    </main>
  </div>;
}
