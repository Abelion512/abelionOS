import { Link } from "wouter";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Loader2, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { bridgeApi, type BridgeAuditEvent } from "@/lib/bridge";

export default function Activity() {
  const audit = trpc.audit.list.useQuery({ limit: 50 });
  const [localEvents, setLocalEvents] = useState<BridgeAuditEvent[] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  useEffect(() => { bridgeApi.audit().then((result) => setLocalEvents(result.events)).catch((reason: unknown) => setLocalError(reason instanceof Error ? reason.message : "Local audit unavailable")); }, []);

  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Audit log</p><h1>Activity</h1><p>Only events persisted for the authenticated user appear here. Empty means no recorded application events.</p></div><Link href="/" className="back-link"><ArrowLeft size={15} /> Overview</Link></header>
    <div className="feature-notice"><ShieldAlert size={18} /><span>Audit events are not fabricated. Bridge-local JSONL actions and server-side application events are separate sources.</span></div>
    <article className="panel activity-page-card">
      <div className="section-header"><div><p className="panel-kicker">Server audit events</p><h2>Recent activity</h2></div><ClipboardList size={19} className="calendar-symbol" /></div>
      {audit.isLoading && <div className="connection-empty process-empty"><Loader2 className="spin" size={17} /><strong>Loading audit events…</strong></div>}
      {audit.error && <div className="connection-empty process-empty"><strong>Audit data unavailable.</strong><span>{audit.error.message}</span></div>}
      {!audit.isLoading && !audit.error && audit.data?.length === 0 && <div className="connection-empty process-empty"><strong>No server audit events.</strong><span>Events will appear after an authenticated application action is recorded.</span></div>}
      {!audit.isLoading && !audit.error && !!audit.data?.length && <div className="activity-list">{audit.data.map((event) => <div className="activity-row" key={`server-${event.id}`}><span className="activity-icon mint"><ClipboardList size={15} /></span><div className="activity-copy"><strong>{event.action}</strong><span>Server · {event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""} · {event.status}</span></div><time>{new Date(event.createdAt).toLocaleString()}</time></div>)}</div>}
      <div className="activity-source-label">Local bridge audit</div>
      {localError && <div className="connection-empty process-empty"><strong>Local audit unavailable.</strong><span>{localError}</span></div>}
      {!localError && localEvents?.length === 0 && <div className="connection-empty process-empty"><strong>No local bridge events.</strong><span>Local SIGTERM events will appear here after the companion records one.</span></div>}
      {!localError && !!localEvents?.length && <div className="activity-list">{localEvents.map((event, index) => <div className="activity-row" key={`local-${event.pid}-${event.terminatedAt}-${index}`}><span className="activity-icon amber"><ClipboardList size={15} /></span><div className="activity-copy"><strong>{event.action}</strong><span>Local bridge · {event.command} · PID {event.pid} · {event.signal}</span></div><time>{new Date(event.terminatedAt).toLocaleString()}</time></div>)}</div>}
    </article>
  </div>;
}
