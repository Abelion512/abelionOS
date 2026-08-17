import { ProcessPanel } from "@/components/ProcessPanel";
import { bridgeApi, type BridgeMetrics } from "@/lib/bridge";
import { initialBridgeHealthState } from "@/lib/bridgeHealthState";
import { pollBridgeHealth, startBridgeHealthPolling } from "@/lib/bridgeHealthPolling";
import { Activity, ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from "react";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function Home() {
  const [metrics, setMetrics] = useState<BridgeMetrics | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [healthState, setHealthState] = useState(initialBridgeHealthState);
  const checkHealth = async () => pollBridgeHealth(bridgeApi.health, setHealthState);
  const refresh = async () => {
    await checkHealth();
    try { setMetrics(await bridgeApi.metrics()); setBridgeError(null); }
    catch (reason) { setMetrics(null); setBridgeError(reason instanceof Error ? reason.message : "Linux companion unavailable"); }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => startBridgeHealthPolling({ request: bridgeApi.health, onState: setHealthState }), []);
  const statusLabel = healthState.online ? "Connected" : "Unavailable";

  return <main className="main-canvas">
    <header className="topbar"><div className="breadcrumb"><span>Workspace</span><strong>Dashboard</strong></div><div className="topbar-actions"><span className={`status-chip ${healthState.online ? "" : "status-unavailable"}`}><span /> Linux bridge {statusLabel.toLowerCase()}</span><button className="power-button" onClick={() => void refresh()}><Activity size={16} /><span>Refresh Linux</span></button></div></header>
    <div className="content-wrap">
      <section className="welcome-row"><div><p className="eyebrow"><span className="eyebrow-line" /> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><h1>Linux workspace</h1></div></section>
      <section className="hero-grid"><article className="system-hero panel"><div className="hero-content"><div className="hero-topline"><span className={`status-chip ${healthState.online ? "" : "status-unavailable"}`}><span /> Linux bridge {statusLabel.toLowerCase()}</span></div><div className="hero-heading"><p className="panel-kicker">System overview</p><h2>{healthState.online ? "Linux companion connected" : "Linux companion unavailable"}</h2><p className="hero-description">{bridgeError || healthState.detail || "Metrics are read from the local companion when it is available."}</p></div><div className="hero-meta"><div><p>Health checked</p><strong>{healthState.checkedAt ? healthState.checkedAt.toLocaleTimeString() : "Not checked"}</strong></div><div><p>Uptime</p><strong>{metrics ? formatUptime(metrics.uptimeSeconds) : "Unavailable"}</strong></div><div><p>Platform</p><strong>{metrics?.platform || "Unavailable"}</strong></div></div><div className="system-metrics"><div><span>CPU</span><strong>{metrics ? `${metrics.cpuPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.cpuPercent ?? 0}%` }} /></i></div><div><span>Memory</span><strong>{metrics ? `${metrics.memory.usedPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.memory.usedPercent ?? 0}%` }} /></i></div><div><span>Load</span><strong>{metrics ? metrics.loadAverage[0]?.toFixed(2) : "—"}</strong><i><b style={{ width: `${Math.min((metrics?.loadAverage[0] ?? 0) * 25, 100)}%` }} /></i></div></div></div></article><article className="weather-card panel"><div className="card-heading"><div><p className="panel-kicker">External provider</p><h3>Not configured</h3></div><ShieldAlert size={25} className="weather-icon" /></div><div className="connection-empty"><strong>Weather is unavailable.</strong><span>No provider or location permission has been configured. This card will remain unavailable.</span></div></article></section>
      <section className="lower-grid"><ProcessPanel /><article className="calendar-card panel"><div className="section-header"><div><p className="panel-kicker">Google Workspace</p><h2>Not connected</h2></div><ShieldAlert size={20} className="calendar-symbol" /></div><div className="connection-empty calendar-empty"><strong>Calendar and Gmail are not available to this app yet.</strong><span>The session connector is separate from the deployed app OAuth flow. No events or messages are fabricated.</span></div></article></section>
      <footer className="bottom-status"><span><span className="live-dot" /> {healthState.online ? "Linux bridge health online" : "Linux bridge health unavailable"}</span><span>mintdesk</span><span>{healthState.checkedAt ? `Health checked ${healthState.checkedAt.toLocaleTimeString()}` : "Not checked"}</span></footer>
    </div>
  </main>;
}
