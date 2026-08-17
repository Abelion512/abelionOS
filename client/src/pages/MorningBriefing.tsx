import React, { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, CircleAlert, Clock3, Lightbulb, Mail, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getBriefingViewState } from "@/lib/briefingState";
import { bridgeApi, getBridgeConfig, type BridgeDailyFocus, type BridgeHealth } from "@/lib/bridge";
import { getLocalBridgeBriefingSource } from "@/lib/localBridgeBriefingState";
import { getCalendarEventTiming } from "@/lib/calendarEventTiming";
import { getCalendarFiveWOneH, getInboxFiveWOneH, type BriefingFact } from "@/lib/workspaceBriefing5w1h";
import { toDailyFocusEvidence } from "@/lib/dailyFocusEvidence";

function formatMoment(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatFactTime(value: string) {
  if (value.startsWith("Ongoing → ")) return `Ongoing · ends ${formatMoment(value.slice("Ongoing → ".length))}`;
  const [start, end] = value.split(" → ");
  return end ? `${formatMoment(start)} to ${formatMoment(end)}` : formatMoment(value);
}

function SourceBadge({ status }: { status: "loading" | "ready" | "partial" | "unavailable" | "error" }) {
  const copy = { loading: "checking", ready: "live", partial: "partial", unavailable: "unavailable", error: "error" }[status];
  return <span className={`briefing-source source-${status}`}>{copy}</span>;
}

function FactGrid({ facts }: { facts: BriefingFact[] }) {
  return <dl className="briefing-fact-grid">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value ? fact.label === "When" ? formatFactTime(fact.value) : fact.value : fact.href ? null : "Unavailable"}{fact.href && <a href={fact.href} target="_blank" rel="noreferrer">{fact.label === "Why / How" ? "Open meeting or event" : "Open linked detail"}</a>}</dd></div>)}</dl>;
}

function sourceStatus(value: unknown, status: "ready" | "partial" | "unavailable" | "error") {
  if (value !== null) return "ready" as const;
  return status === "partial" ? "unavailable" as const : status;
}

export default function MorningBriefing() {
  const briefing = trpc.briefing.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const data = briefing.data;
  const viewState = getBriefingViewState({ hasData: Boolean(data), isLoading: briefing.isLoading, hasError: Boolean(briefing.error) });
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);
  const bridgeConfigured = Boolean(getBridgeConfig());
  const [dailyFocus, setDailyFocus] = useState<BridgeDailyFocus | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, "done" | "deprioritized">>({});
  const refreshBridgeSnapshot = async () => {
    if (!getBridgeConfig()) { setBridgeHealth(null); setBridgeError(null); setBridgeLoading(false); return; }
    setBridgeLoading(true);
    try { setBridgeHealth(await bridgeApi.health()); setBridgeError(null); } catch (error) { setBridgeHealth(null); setBridgeError(error instanceof Error ? error.message : "Linux companion request failed"); } finally { setBridgeLoading(false); }
  };
  useEffect(() => { void refreshBridgeSnapshot(); }, []);
  const localBridge = getLocalBridgeBriefingSource({ loading: bridgeLoading, health: bridgeHealth, error: bridgeError, configured: bridgeConfigured });
  const reasoningAvailable = bridgeConfigured && !bridgeLoading && bridgeHealth?.ok === true;
  const reasoningUnavailableDetail = !bridgeConfigured
    ? "Local reasoning unavailable. Add the Linux companion token in Connections, then configure its 9router values locally."
    : bridgeLoading
      ? "Checking local reasoning availability through the Linux companion…"
      : `Local reasoning unavailable. ${bridgeError || "The Linux companion did not report a healthy connection."}`;
  const refreshAll = () => { setDailyFocus(null); setFocusError(null); void briefing.refetch(); void refreshBridgeSnapshot(); };
  const generateFocus = async () => {
    if (!data) return;
    setFocusLoading(true);
    try {
      const next = await bridgeApi.dailyFocus(toDailyFocusEvidence(data));
      setDailyFocus(next);
      setFocusError(null);
      setOverrides({});
    } catch {
      setDailyFocus(null);
      setFocusError("Local reasoning is unavailable. Evidence remains visible and no fallback recommendation is shown.");
    } finally { setFocusLoading(false); }
  };
  const overridePriority = (id: string, value: "done" | "deprioritized") => setOverrides((current) => ({ ...current, [id]: value }));

  return <main className="feature-page briefing-page">
    <header className="feature-header briefing-header">
      <div><p className="eyebrow"><span className="eyebrow-line" /> Evidence-first daily assistant</p><h1>Daily Focus</h1><p>Today, tomorrow, and lessons from recent activity. Missing evidence stays unavailable; no action is automated.</p></div>
      <div className="briefing-actions"><Link href="/" className="back-link"><ArrowLeft size={15} /> Dashboard</Link><button className="power-button" onClick={refreshAll} disabled={briefing.isFetching || bridgeLoading}><RefreshCw size={16} className={briefing.isFetching || bridgeLoading ? "spin" : ""} /><span>{briefing.isFetching || bridgeLoading ? "Refreshing" : "Refresh sources"}</span></button></div>
    </header>

    {viewState === "loading" && <section className="briefing-loading panel"><Clock3 size={22} /><div><strong>Preparing briefing from connected sources.</strong><span>No prior result is shown while the current request is loading.</span></div></section>}
    {viewState === "error" && briefing.error && <section className="briefing-error panel"><CircleAlert size={22} /><div><strong>Morning Briefing could not be loaded.</strong><span>{briefing.error.message}</span></div></section>}
    {viewState === "stale" && briefing.error && <section className="briefing-error briefing-stale panel"><Clock3 size={22} /><div><strong>Showing the last successful briefing.</strong><span>The latest refresh failed: {briefing.error.message}</span></div></section>}

    {data && <>
      <section className="briefing-summary panel"><div><p className="panel-kicker">Window</p><h2>{data.window.label}</h2><p>{formatMoment(data.window.from)} to {formatMoment(data.window.until)}</p></div><div className="briefing-generated"><p>Generated</p><strong>{formatMoment(data.generatedAt)}</strong></div></section>

      <section className="daily-focus-panel panel"><div className="daily-focus-head"><div><p className="panel-kicker">Reasoning, on request</p><h2>What deserves attention today?</h2><p>Local 9router receives only the visible Calendar, Gmail metadata, and audit evidence. It cannot call tools or change your accounts.</p></div><button className="power-button" onClick={() => void generateFocus()} disabled={focusLoading || !reasoningAvailable || !data}><Sparkles size={focusLoading ? 16 : 15} className={focusLoading ? "spin" : ""} /><span>{focusLoading ? "Reasoning" : "Refine priorities"}</span></button></div>
        {!dailyFocus && !focusError && !reasoningAvailable && <div className="daily-focus-unavailable"><CircleAlert size={18} /><span>{reasoningUnavailableDetail}</span></div>}
        {!dailyFocus && !focusError && reasoningAvailable && <div className="daily-focus-empty"><Lightbulb size={18} /><span>Evidence is ready. Ask for a structured refinement only when you want it.</span></div>}
        {focusError && <div className="daily-focus-error"><CircleAlert size={18} /><span>{focusError}</span></div>}
        {dailyFocus && <><div className="daily-focus-headline"><strong>{dailyFocus.focus.headline}</strong><span>Generated locally by {dailyFocus.model} at {formatMoment(dailyFocus.generatedAt)}</span></div><div className="daily-priority-grid">{dailyFocus.focus.priorities.map((priority) => { const override = overrides[priority.id]; return <article className={`daily-priority ${override ? "is-overridden" : ""}`} key={priority.id}><div><span className={`confidence-${priority.confidence}`}>{priority.confidence} confidence</span><h3>{priority.title}</h3><p>{priority.rationale}</p><strong>Next: {priority.nextStep}</strong><small>Evidence: {priority.evidenceRefs.join(" · ")}</small></div><div className="priority-override"><button className="icon-button" aria-label={`Mark ${priority.title} done`} onClick={() => overridePriority(priority.id, "done")}><Check size={15} /></button><button className="icon-button" aria-label={`Deprioritize ${priority.title}`} onClick={() => overridePriority(priority.id, "deprioritized")}><X size={15} /></button>{override && <span>{override === "done" ? "Marked done" : "Deprioritized"}</span>}</div></article>; })}</div>{dailyFocus.focus.tomorrowPreparation.length > 0 && <div className="daily-focus-support"><strong>Prepare tomorrow</strong><ul>{dailyFocus.focus.tomorrowPreparation.map((item) => <li key={item}>{item}</li>)}</ul></div>}{dailyFocus.focus.yesterdayLessons.length > 0 && <div className="daily-focus-support"><strong>Learn from yesterday</strong><ul>{dailyFocus.focus.yesterdayLessons.map((item) => <li key={item}>{item}</li>)}</ul></div>}{dailyFocus.focus.uncertainties.length > 0 && <div className="daily-focus-uncertainty"><strong>Still uncertain</strong><span>{dailyFocus.focus.uncertainties.join(" · ")}</span></div>}</>}
      </section>

      <section className="briefing-grid briefing-grid-5w1h">
        <article className="panel briefing-card briefing-calendar"><div className="briefing-card-header"><div><p className="panel-kicker">Google Calendar</p><h2>What needs your time</h2></div><SourceBadge status={sourceStatus(data.workspace.calendarEvents, data.workspace.source.status)} /></div><p className="briefing-provenance">{data.workspace.calendarEvents === null ? "Calendar could not be refreshed. No agenda is inferred." : `${data.workspace.calendarEvents.length} event${data.workspace.calendarEvents.length === 1 ? "" : "s"} overlapping the next 24 hours.`}</p>{data.workspace.calendarEvents !== null && <div className="briefing-list">{data.workspace.calendarEvents.length === 0 ? <p className="briefing-empty">No Calendar events in this window.</p> : data.workspace.calendarEvents.map((event) => { const timing = getCalendarEventTiming(event, data.window.from); const facts = getCalendarFiveWOneH(event).map((fact) => fact.label === "When" ? { ...fact, value: timing.kind === "ongoing" ? `Ongoing → ${timing.end}` : fact.value } : fact); return <article className="briefing-record" key={event.id}><div className="briefing-record-title"><CalendarDays size={16} /><strong>{event.summary}</strong>{timing.kind === "ongoing" && <span className="briefing-ongoing">Ongoing</span>}</div><FactGrid facts={facts} /></article>; })}</div>}{data.workspace.calendarEvents === null && <Link className="briefing-link" href="/connections">Check Google connection</Link>}</article>

        <article className="panel briefing-card briefing-inbox"><div className="briefing-card-header"><div><p className="panel-kicker">Gmail metadata</p><h2>Unread, at a glance</h2></div><SourceBadge status={sourceStatus(data.workspace.inboxMessages, data.workspace.source.status)} /></div><p className="briefing-provenance">{data.workspace.unreadInboxCount === null ? "Unread inbox metadata could not be refreshed." : `${data.workspace.unreadInboxCount} unread message${data.workspace.unreadInboxCount === 1 ? "" : "s"}. Message bodies are not read.`}</p>{data.workspace.inboxMessages !== null && <div className="briefing-list">{data.workspace.inboxMessages.length === 0 ? <p className="briefing-empty">No unread message metadata was returned.</p> : data.workspace.inboxMessages.map((message) => <article className="briefing-record" key={message.id}><div className="briefing-record-title"><Mail size={16} /><strong>{message.subject || "Subject unavailable"}</strong></div><FactGrid facts={getInboxFiveWOneH(message)} /></article>)}</div>}{data.workspace.inboxMessages === null && <p className="briefing-empty">No Gmail preview is shown until metadata is available.</p>}</article>

        <article className="panel briefing-card"><div className="briefing-card-header"><div><p className="panel-kicker">Application audit</p><h2>Recent activity</h2></div><SourceBadge status={data.activity.source.status} /></div><p className="briefing-provenance">{data.activity.source.detail}</p><div className="briefing-list">{data.activity.events.length === 0 ? <p className="briefing-empty">No application actions have been recorded.</p> : data.activity.events.map((event) => <div className="briefing-event" key={event.id}><strong>{event.action}</strong><span>{formatMoment(event.createdAt)}</span></div>)}</div><Link className="briefing-link" href="/activity">Open audit</Link></article>

        <article className="panel briefing-card"><div className="briefing-card-header"><div><p className="panel-kicker">Local Linux</p><h2>Companion snapshot</h2></div><SourceBadge status={localBridge.status} /></div><p className="briefing-provenance">{localBridge.detail}</p><div className="briefing-list"><div className="briefing-event"><strong>Health endpoint</strong><span>{bridgeHealth?.ok ? "Responding" : "Unavailable"}</span></div><div className="briefing-event"><strong>Version</strong><span>{bridgeHealth?.version || "Unavailable"}</span></div></div><Link className="briefing-link" href="/connections">Open connection</Link></article>
      </section>

      <section className="briefing-integrity"><ShieldCheck size={18} /><span>This briefing is assembled on request from user-scoped sources. It does not persist a synthetic daily summary or read email bodies.</span></section>
    </>}
  </main>;
}
