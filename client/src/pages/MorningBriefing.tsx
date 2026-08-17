import React, { useEffect, useState } from "react";
import { Activity, ArrowLeft, CalendarDays, CircleAlert, Clock3, FileText, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getBriefingViewState } from "@/lib/briefingState";
import { bridgeApi, getBridgeConfig, type BridgeHealth } from "@/lib/bridge";
import { getLocalBridgeBriefingSource } from "@/lib/localBridgeBriefingState";
import { getCalendarEventTiming } from "@/lib/calendarEventTiming";

function formatMoment(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SourceBadge({ status }: { status: "loading" | "ready" | "partial" | "unavailable" | "error" }) {
  const copy = { loading: "checking", ready: "live", partial: "partial", unavailable: "unavailable", error: "error" }[status];
  return <span className={`briefing-source source-${status}`}>{copy}</span>;
}

export default function MorningBriefing() {
  const briefing = trpc.briefing.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const data = briefing.data;
  const viewState = getBriefingViewState({ hasData: Boolean(data), isLoading: briefing.isLoading, hasError: Boolean(briefing.error) });
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);
  const bridgeConfigured = Boolean(getBridgeConfig());
  const refreshBridgeSnapshot = async () => {
    if (!getBridgeConfig()) { setBridgeHealth(null); setBridgeError(null); setBridgeLoading(false); return; }
    setBridgeLoading(true);
    try { setBridgeHealth(await bridgeApi.health()); setBridgeError(null); } catch (error) { setBridgeHealth(null); setBridgeError(error instanceof Error ? error.message : "Linux companion request failed"); } finally { setBridgeLoading(false); }
  };
  useEffect(() => { void refreshBridgeSnapshot(); }, []);
  const localBridge = getLocalBridgeBriefingSource({ loading: bridgeLoading, health: bridgeHealth, error: bridgeError, configured: bridgeConfigured });
  const refreshAll = () => { void briefing.refetch(); void refreshBridgeSnapshot(); };

  return <main className="feature-page briefing-page">
    <header className="feature-header briefing-header">
      <div><p className="eyebrow"><span className="eyebrow-line" /> On-demand briefing</p><h1>Morning Briefing</h1><p>One source-aware readout for the next 24 hours. Missing sources remain missing.</p></div>
      <div className="briefing-actions"><Link href="/" className="back-link"><ArrowLeft size={15} /> Overview</Link><button className="power-button" onClick={refreshAll} disabled={briefing.isFetching || bridgeLoading}><RefreshCw size={16} className={briefing.isFetching || bridgeLoading ? "spin" : ""} /><span>{briefing.isFetching || bridgeLoading ? "Refreshing" : "Refresh"}</span></button></div>
    </header>

    {viewState === "loading" && <section className="briefing-loading panel"><Clock3 size={22} /><div><strong>Preparing briefing from connected sources.</strong><span>No prior result is shown while the current request is loading.</span></div></section>}
    {viewState === "error" && briefing.error && <section className="briefing-error panel"><CircleAlert size={22} /><div><strong>Morning Briefing could not be loaded.</strong><span>{briefing.error.message}</span></div></section>}
    {viewState === "stale" && briefing.error && <section className="briefing-error briefing-stale panel"><Clock3 size={22} /><div><strong>Showing the last successful briefing.</strong><span>The latest refresh failed: {briefing.error.message}</span></div></section>}

    {data && <>
      <section className="briefing-summary panel"><div><p className="panel-kicker">Window</p><h2>{data.window.label}</h2><p>{formatMoment(data.window.from)} to {formatMoment(data.window.until)}</p></div><div className="briefing-generated"><p>Generated</p><strong>{formatMoment(data.generatedAt)}</strong></div></section>

      <section className="briefing-grid">
        <article className="panel briefing-card briefing-workspace"><div className="briefing-card-header"><div><p className="panel-kicker">Google Workspace</p><h2>Calendar and inbox</h2></div><SourceBadge status={data.workspace.source.status} /></div><p className="briefing-provenance">{data.workspace.source.detail}</p><div className="briefing-workspace-stats"><div><CalendarDays size={18} /><span>Calendar</span><strong>{data.workspace.calendarEvents === null ? "Unavailable" : `${data.workspace.calendarEvents.length} event${data.workspace.calendarEvents.length === 1 ? "" : "s"}`}</strong></div><div><Mail size={18} /><span>Unread inbox</span><strong>{data.workspace.unreadInboxCount === null ? "Unavailable" : data.workspace.unreadInboxCount}</strong></div></div>{data.workspace.calendarEvents !== null && <div className="briefing-list">{data.workspace.calendarEvents.length === 0 ? <p className="briefing-empty">No Calendar events were returned for this window.</p> : data.workspace.calendarEvents.map((event) => { const timing = getCalendarEventTiming(event, data.window.from); return <div className="briefing-event" key={event.id}><strong>{event.summary}</strong><span>{timing.kind === "ongoing" ? `Ongoing · ends ${formatMoment(timing.end)}` : `${formatMoment(timing.start)} to ${formatMoment(timing.end)}`}</span></div>; })}</div>} {data.workspace.source.status === "unavailable" && <Link className="briefing-link" href="/connections">Connect Google Workspace</Link>}</article>

        <article className="panel briefing-card"><div className="briefing-card-header"><div><p className="panel-kicker">Application audit</p><h2>Recent activity</h2></div><SourceBadge status={data.activity.source.status} /></div><p className="briefing-provenance">{data.activity.source.detail}</p><div className="briefing-list">{data.activity.events.length === 0 ? <p className="briefing-empty">No application actions have been recorded.</p> : data.activity.events.map((event) => <div className="briefing-event" key={event.id}><strong>{event.action}</strong><span>{formatMoment(event.createdAt)}</span></div>)}</div><Link className="briefing-link" href="/activity">Open audit</Link></article>

        <article className="panel briefing-card"><div className="briefing-card-header"><div><p className="panel-kicker">File Storage</p><h2>Recent files</h2></div><SourceBadge status={data.files.source.status} /></div><p className="briefing-provenance">{data.files.source.detail}</p><div className="briefing-list">{data.files.recent.length === 0 ? <p className="briefing-empty">No file metadata has been recorded.</p> : data.files.recent.map((file) => <div className="briefing-event" key={file.id}><strong><FileText size={15} /> {file.fileName}</strong><span>{formatMoment(file.createdAt)}</span></div>)}</div><Link className="briefing-link" href="/files">Open files</Link></article>

        <article className="panel briefing-card"><div className="briefing-card-header"><div><p className="panel-kicker">Local Linux</p><h2>Companion snapshot</h2></div><SourceBadge status={localBridge.status} /></div><p className="briefing-provenance">{localBridge.detail}</p><div className="briefing-list"><div className="briefing-event"><strong>Health endpoint</strong><span>{bridgeHealth?.ok ? "Responding" : "Unavailable"}</span></div><div className="briefing-event"><strong>Version</strong><span>{bridgeHealth?.version || "Unavailable"}</span></div></div><Link className="briefing-link" href="/connections">Open connection</Link></article>
      </section>

      <section className="briefing-integrity"><ShieldCheck size={18} /><span>This briefing is assembled on request from user-scoped sources. It does not persist a synthetic daily summary.</span></section>
    </>}
  </main>;
}
