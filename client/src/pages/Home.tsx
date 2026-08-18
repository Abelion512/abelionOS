import { ProcessPanel } from "@/components/ProcessPanel";
import { bridgeApi, type BridgeMetrics } from "@/lib/bridge";
import { initialBridgeHealthState } from "@/lib/bridgeHealthState";
import { pollBridgeHealth } from "@/lib/bridgeHealthPolling";
import { getGoogleConnectionScopeState } from "@/lib/googleConnectionScopeState";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, CircleAlert, Cpu, Gauge, HardDrive, ShieldCheck } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function formatUpdatedAt(value?: Date | string | null) {
  if (!value) return "No reading yet";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? "No reading yet" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Home() {
  const [metrics, setMetrics] = useState<BridgeMetrics | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [healthState, setHealthState] = useState(initialBridgeHealthState);
  const google = trpc.google.status.useQuery();
  const googleScopeState = getGoogleConnectionScopeState(google.data?.connected === true, google.data?.scopes);

  const refreshRuntime = useCallback(async () => {
    await pollBridgeHealth(bridgeApi.health, setHealthState);
    try {
      setMetrics(await bridgeApi.metrics());
      setBridgeError(null);
    } catch (reason) {
      setMetrics(null);
      setBridgeError(reason instanceof Error ? reason.message : "Linux companion unavailable");
    }
  }, []);

  useEffect(() => {
    void refreshRuntime();
    const refreshOnVisible = () => { if (document.visibilityState === "visible") void refreshRuntime(); };
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => document.removeEventListener("visibilitychange", refreshOnVisible);
  }, [refreshRuntime]);

  const bridgeOnline = healthState.online && metrics !== null;
  const bridgeTitle = bridgeOnline ? metrics.hostname : "No bridge";
  const bridgeStatus = bridgeOnline ? "Online" : "Unavailable";

  return <main className="main-canvas">
    <div className="content-wrap dashboard-content dashboard-atelier">
      <h1 className="sr-only">Dashboard</h1>
      <section className="dashboard-hero-grid" aria-label="System status">
        <article className="panel system-hero dashboard-runtime-hero">
          <div className="hero-art" aria-hidden="true" />
          <div className="hero-content">
            <div className="hero-topline"><span className={`status-chip ${bridgeOnline ? "" : "status-unavailable"}`}><span />{bridgeStatus}</span><span className="dashboard-hero-caption">Linux companion · system overview</span></div>
            <div className="hero-heading"><p className="panel-kicker">Local workspace</p><h2>{bridgeTitle}</h2><p className="hero-runtime-line">{bridgeOnline ? "Ready for the work ahead." : "Waiting for its companion."}</p><p className="hero-description">{bridgeOnline ? `The Linux companion last reported at ${formatUpdatedAt(metrics?.checkedAt || healthState.checkedAt)}.` : bridgeError || healthState.detail || "No measurement is available until the companion reconnects."}</p></div>
            <div><dl className="hero-meta"><div><dt>Uptime</dt><dd>{metrics ? formatUptime(metrics.uptimeSeconds) : "—"}</dd></div><div><dt>Platform</dt><dd>{metrics?.platform || "—"}</dd></div><div><dt>Observed</dt><dd>{formatUpdatedAt(metrics?.checkedAt || healthState.checkedAt)}</dd></div></dl><div className="system-metrics" aria-label="Current Linux measurements"><div><span><Cpu size={13} /> CPU</span><strong>{metrics ? `${metrics.cpuPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.cpuPercent ?? 0}%` }} /></i></div><div><span><HardDrive size={13} /> Memory</span><strong>{metrics ? `${metrics.memory.usedPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.memory.usedPercent ?? 0}%` }} /></i></div><div><span><Gauge size={13} /> Load</span><strong>{metrics ? metrics.loadAverage[0]?.toFixed(2) : "—"}</strong><i><b style={{ width: `${Math.min((metrics?.loadAverage[0] ?? 0) * 25, 100)}%` }} /></i></div></div></div>
          </div>
        </article>
        <aside className="panel workspace-context-panel">
          <div className="workspace-context-icon"><ShieldCheck size={19} /></div><span className={`source-state ${googleScopeState.status === "connected" ? "ready" : "unavailable"}`}>{google.isLoading ? "Checking" : googleScopeState.status}</span>
          <div><p className="panel-kicker">Connected workspace</p><h2>Google</h2><p>{googleScopeState.detail}</p></div>
          {googleScopeState.status === "connected" ? <div className="workspace-capabilities" aria-label="Available Google Workspace sources"><span>Calendar</span><span>Gmail</span><span>Tasks</span></div> : <div className="workspace-context-empty"><CircleAlert size={16} /><span>No Workspace source is inferred while its connection is unavailable.</span></div>}
          <Link href="/briefing" className="workspace-context-link">Open Daily Focus <ArrowUpRight size={14} /></Link>
        </aside>
      </section>
      <section className="dashboard-process-stage" aria-label="Process controls"><header className="dashboard-section-intro"><div><p className="panel-kicker">Intervention</p><h2>Controlled processes</h2></div><p>Only processes returned by the allowlisted Linux companion can be reviewed or terminated here.</p></header><ProcessPanel /></section>
    </div>
  </main>;
}
