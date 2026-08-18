import { ProcessPanel } from "@/components/ProcessPanel";
import { bridgeApi, type BridgeMetrics } from "@/lib/bridge";
import { initialBridgeHealthState } from "@/lib/bridgeHealthState";
import { pollBridgeHealth } from "@/lib/bridgeHealthPolling";
import { getGoogleConnectionScopeState } from "@/lib/googleConnectionScopeState";
import { trpc } from "@/lib/trpc";
import { Cpu, Gauge, HardDrive, ShieldCheck } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

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
    <div className="content-wrap dashboard-content">
      <h1 className="sr-only">Dashboard</h1>
      <section className="runtime-grid" aria-label="System status">
        <article className="panel runtime-panel">
          <header className="runtime-panel-header"><span className="runtime-icon"><Cpu size={21} /></span><span className={`source-state ${bridgeOnline ? "ready" : "unavailable"}`}>{bridgeStatus}</span></header>
          <div className="runtime-heading"><div><h2>{bridgeTitle}</h2>{!bridgeOnline && <p>{bridgeError || healthState.detail || "No measurement"}</p>}</div></div>
          <dl className="runtime-facts"><div><dt>Uptime</dt><dd>{metrics ? formatUptime(metrics.uptimeSeconds) : "—"}</dd></div><div><dt>Platform</dt><dd>{metrics?.platform || "—"}</dd></div></dl>
          <div className="runtime-metrics" aria-label="Current Linux measurements">
            <div><span><Cpu size={14} /> CPU</span><strong>{metrics ? `${metrics.cpuPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.cpuPercent ?? 0}%` }} /></i></div>
            <div><span><HardDrive size={14} /> Memory</span><strong>{metrics ? `${metrics.memory.usedPercent}%` : "—"}</strong><i><b style={{ width: `${metrics?.memory.usedPercent ?? 0}%` }} /></i></div>
            <div><span><Gauge size={14} /> Load</span><strong>{metrics ? metrics.loadAverage[0]?.toFixed(2) : "—"}</strong><i><b style={{ width: `${Math.min((metrics?.loadAverage[0] ?? 0) * 25, 100)}%` }} /></i></div>
          </div>
          <p className="runtime-freshness">{formatUpdatedAt(metrics?.checkedAt || healthState.checkedAt)}</p>
        </article>
        <article className="panel workspace-source-panel">
          <header className="runtime-panel-header"><span className="runtime-icon"><ShieldCheck size={21} /></span><span className={`source-state ${googleScopeState.status === "connected" ? "ready" : "unavailable"}`}>{google.isLoading ? "Checking" : googleScopeState.status}</span></header>
          <div className="workspace-source-heading"><div><h2>Google</h2></div></div>
          {googleScopeState.status === "connected" && <div className="source-capabilities" aria-label="Available Google Workspace sources"><span>Calendar</span><span>Gmail</span><span>Tasks</span></div>}
        </article>
      </section>
      <section className="dashboard-process" aria-label="Process controls"><ProcessPanel /></section>
    </div>
  </main>;
}
