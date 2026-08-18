import React, { useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { bridgeApi, type BridgeAuditEvent } from "@/lib/bridge";

export default function Activity() {
  const audit = trpc.audit.list.useQuery({ limit: 50 });
  const [localEvents, setLocalEvents] = useState<BridgeAuditEvent[] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  useEffect(() => { bridgeApi.audit().then((result) => setLocalEvents(result.events)).catch((reason: unknown) => setLocalError(reason instanceof Error ? reason.message : "Local audit unavailable")); }, []);

  return <main className="feature-page operational-page activity-page">
    <header className="operational-header"><h1>Activity</h1></header>
    <section className="audit-grid">
      <article className="panel audit-panel">
      <div className="section-header"><h2>Application</h2><span className="source-state ready">{audit.isLoading ? "Loading" : "Recorded"}</span></div>
      {audit.isLoading && <div className="connection-empty process-empty"><Loader2 className="spin" size={17} /><strong>Loading audit events…</strong></div>}
      {audit.error && <div className="connection-empty process-empty"><strong>Audit data unavailable.</strong><span>{audit.error.message}</span></div>}
      {!audit.isLoading && !audit.error && audit.data?.length === 0 && <div className="connection-empty process-empty"><strong>No application events.</strong></div>}
      {!audit.isLoading && !audit.error && !!audit.data?.length && <div className="activity-list">{audit.data.map((event) => <div className="activity-row" key={`server-${event.id}`}><span className="activity-icon mint"><ClipboardList size={15} /></span><div className="activity-copy"><strong>{event.action}</strong><span>Server · {event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""} · {event.status}</span></div><time>{new Date(event.createdAt).toLocaleString()}</time></div>)}</div>}
      </article>
      <article className="panel audit-panel local-audit-panel">
      <div className="section-header"><h2>Linux companion</h2><span className={`source-state ${localError ? "unavailable" : "ready"}`}>{localError ? "Unavailable" : "Recorded"}</span></div>
      {localError && <div className="connection-empty process-empty"><strong>Local audit unavailable.</strong><span>{localError}</span></div>}
      {!localError && localEvents?.length === 0 && <div className="connection-empty process-empty"><strong>No local events.</strong></div>}
      {!localError && !!localEvents?.length && <div className="activity-list">{localEvents.map((event, index) => <div className="activity-row" key={`local-${event.pid}-${event.terminatedAt}-${index}`}><span className="activity-icon amber"><ClipboardList size={15} /></span><div className="activity-copy"><strong>{event.action}</strong><span>{event.command} · PID {event.pid} · {event.signal}</span></div><time>{new Date(event.terminatedAt).toLocaleString()}</time></div>)}</div>}
      </article>
    </section>
  </main>;
}
