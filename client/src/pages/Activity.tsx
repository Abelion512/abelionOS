import React, { useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { bridgeApi, type BridgeAuditEvent } from "@/lib/bridge";
import { OnDemandDetail } from "@/components/OnDemandDetail";

export default function Activity() {
  const audit = trpc.audit.list.useQuery({ limit: 50 });
  const [localEvents, setLocalEvents] = useState<BridgeAuditEvent[] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  useEffect(() => { bridgeApi.audit().then((result) => setLocalEvents(result.events)).catch((reason: unknown) => setLocalError(reason instanceof Error ? reason.message : "Local audit unavailable")); }, []);
  const serverEvents = audit.data ?? [];
  const serverPreview = serverEvents.slice(0, 2);
  const localPreview = localEvents?.slice(0, 2) ?? [];

  return <main className="feature-page operational-page activity-page">
    <header className="operational-header activity-header"><div><p className="panel-kicker">Evidence trail</p><h1>Activity</h1><p>Recent actions from Mintdesk and the Linux companion, kept separate by source.</p></div></header>
    <section className="audit-grid">
      <article className="panel audit-panel">
      <div className="section-header"><h2>Application</h2><span className="source-state ready">{audit.isLoading ? "Loading" : `${serverEvents.length} events`}</span></div>
      {audit.isLoading && <div className="connection-empty process-empty"><Loader2 className="spin" size={17} /><strong>Loading audit events…</strong></div>}
      {audit.error && <div className="connection-empty process-empty"><strong>Audit data unavailable.</strong><span>{audit.error.message}</span></div>}
      {!audit.isLoading && !audit.error && audit.data?.length === 0 && <div className="connection-empty process-empty"><strong>No application events.</strong></div>}
      {!audit.isLoading && !audit.error && !!serverEvents.length && <><div className="audit-preview-cards">{serverPreview.map((event) => <div className="activity-row" key={`server-${event.id}`}><span className="activity-icon mint"><ClipboardList size={15} /></span><div className="activity-copy"><strong>{event.action}</strong><span>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""} · {event.status}</span></div><time>{new Date(event.createdAt).toLocaleString()}</time><OnDemandDetail title={event.action} description="Application audit record"><dl className="detail-facts"><div><dt>Source</dt><dd>Server</dd></div><div><dt>Resource</dt><dd>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""}</dd></div><div><dt>Status</dt><dd>{event.status}</dd></div><div><dt>Recorded</dt><dd>{new Date(event.createdAt).toLocaleString()}</dd></div></dl></OnDemandDetail></div>)}</div>{serverEvents.length > serverPreview.length && <OnDemandDetail title="Application audit" description={`${serverEvents.length} recorded events`} triggerLabel={`All ${serverEvents.length} events`}><div className="detail-record-list">{serverEvents.map((event) => <div key={`detail-server-${event.id}`}><strong>{event.action}</strong><span>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""} · {event.status}</span><time>{new Date(event.createdAt).toLocaleString()}</time></div>)}</div></OnDemandDetail>}</>}
      </article>
      <article className="panel audit-panel local-audit-panel">
      <div className="section-header"><h2>Linux companion</h2><span className={`source-state ${localError ? "unavailable" : "ready"}`}>{localError ? "Unavailable" : `${localEvents?.length ?? 0} events`}</span></div>
      {localError && <div className="connection-empty process-empty"><strong>Local audit unavailable.</strong><span>{localError}</span></div>}
      {!localError && localEvents?.length === 0 && <div className="connection-empty process-empty"><strong>No local events.</strong></div>}
      {!localError && !!localEvents?.length && <><div className="audit-preview-cards">{localPreview.map((event, index) => <div className="activity-row" key={`local-${event.pid}-${event.terminatedAt}-${index}`}><span className="activity-icon amber"><ClipboardList size={15} /></span><div className="activity-copy"><strong>{event.action}</strong><span>PID {event.pid} · {event.signal}</span></div><time>{new Date(event.terminatedAt).toLocaleString()}</time><OnDemandDetail title={event.action} description="Linux companion audit record"><dl className="detail-facts"><div><dt>Command</dt><dd>{event.command}</dd></div><div><dt>PID</dt><dd>{event.pid}</dd></div><div><dt>Signal</dt><dd>{event.signal}</dd></div><div><dt>Recorded</dt><dd>{new Date(event.terminatedAt).toLocaleString()}</dd></div></dl></OnDemandDetail></div>)}</div>{localEvents.length > localPreview.length && <OnDemandDetail title="Linux companion audit" description={`${localEvents.length} recorded events`} triggerLabel={`All ${localEvents.length} events`}><div className="detail-record-list">{localEvents.map((event, index) => <div key={`detail-local-${event.pid}-${event.terminatedAt}-${index}`}><strong>{event.action}</strong><span>{event.command} · PID {event.pid} · {event.signal}</span><time>{new Date(event.terminatedAt).toLocaleString()}</time></div>)}</div></OnDemandDetail>}</>}
      </article>
    </section>
  </main>;
}
