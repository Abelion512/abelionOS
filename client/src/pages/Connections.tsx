import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CircleHelp, Link2, ShieldAlert } from "lucide-react";
import { bridgeApi, getBridgeConfig } from "@/lib/bridge";
import { healthFailed, healthSucceeded, initialBridgeHealthState } from "@/lib/bridgeHealthState";
import { startBridgeHealthPolling } from "@/lib/bridgeHealthPolling";
import { trpc } from "@/lib/trpc";
import { getGoogleConnectionScopeState } from "@/lib/googleConnectionScopeState";

export default function Connections() {
  const [healthState, setHealthState] = useState(initialBridgeHealthState);
  const google = trpc.google.status.useQuery();

  useEffect(() => {
    if (!getBridgeConfig()) {
      setHealthState(healthFailed(new Error("No local token is configured in this browser."), new Date()));
      return;
    }
    return startBridgeHealthPolling({
      request: bridgeApi.health,
      onState: (next) => setHealthState({ ...next, detail: next.online ? "Local companion responded to /health." : next.detail }),
    });
  }, []);

  const googleConnected = google.data?.connected === true;
  const googleScopeState = getGoogleConnectionScopeState(googleConnected, google.data?.scopes);
  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Connection status</p><h1>Connections</h1><p>Every card reports a real connection check or an explicit unavailable state. No account or provider is inferred from the browser session.</p></div><Link href="/" className="back-link"><ArrowLeft size={15} /> Overview</Link></header>
    <div className="connection-grid">
      <article className="panel connection-card"><div className="connection-card-top"><div className="connection-icon mint"><Link2 size={18} /></div><span className={healthState.online ? "connection-pill connected" : "connection-pill unavailable"}>{healthState.online ? "connected" : "unavailable"}</span></div><h2>Linux companion</h2><p>{healthState.detail || (healthState.checkedAt ? "Local companion responded to /health." : "Checking local companion health…")}</p><div className="connection-meta">Endpoint <code>127.0.0.1:18765</code>{healthState.checkedAt ? ` · checked ${healthState.checkedAt.toLocaleTimeString()}` : ""}</div></article>
      <article className="panel connection-card"><div className="connection-card-top"><div className="connection-icon amber"><ShieldAlert size={18} /></div><span className={googleScopeState.status === "connected" ? "connection-pill connected" : "connection-pill unavailable"}>{google.isLoading ? "checking" : googleScopeState.status}</span></div><h2>Google Workspace</h2><p>{googleScopeState.detail}</p><div className="connection-meta">{googleConnected ? <code>{google.data?.scopes.join(" · ")}</code> : <a className="back-link" href="/api/google/start">Connect Google Workspace</a>}</div></article>
    </div>
    <div className="feature-notice"><CircleHelp size={18} /><span>Linux health is checked every 15 seconds. Google OAuth opens a provider consent flow and stores refresh tokens server-side only.</span></div>
  </div>;
}
