import { CheckCircle2, CircleHelp, Settings2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getBridgeConfig } from "@/lib/bridge";
import { trpc } from "@/lib/trpc";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const bridge = getBridgeConfig();
  const workspace = trpc.google.status.useQuery(undefined, { enabled: isAuthenticated });
  const workspaceStatus = !isAuthenticated ? "Not authenticated" : workspace.isLoading ? "Checking" : workspace.data?.connected ? "Connected" : "Not configured";
  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Runtime configuration</p><h1>Settings</h1><p>This page exposes current runtime facts only. There are no settings controls until persistence and permission contracts exist.</p></div></header>
    <div className="settings-grid">
      <article className="panel settings-card"><div className="settings-card-heading"><Settings2 size={18} /><h2>Application</h2></div><dl><div><dt>Environment</dt><dd>Web app</dd></div><div><dt>Storage</dt><dd>S3 metadata-backed</dd></div><div><dt>Workspace OAuth</dt><dd>{workspaceStatus}</dd></div></dl></article>
      <article className="panel settings-card"><div className="settings-card-heading"><ShieldAlert size={18} /><h2>Authentication</h2></div><dl><div><dt>Status</dt><dd>{isAuthenticated ? "Authenticated" : "Not authenticated"}</dd></div><div><dt>Identity</dt><dd>{user?.email || user?.name || "Unavailable"}</dd></div><div><dt>Provider</dt><dd>Manus OAuth</dd></div></dl></article>
      <article className="panel settings-card"><div className="settings-card-heading"><CheckCircle2 size={18} /><h2>Local bridge</h2></div><dl><div><dt>Token in browser</dt><dd>{bridge ? "Configured" : "Unavailable"}</dd></div><div><dt>Endpoint</dt><dd><code>{bridge?.baseUrl || "127.0.0.1:18765"}</code></dd></div><div><dt>Permission</dt><dd>Current user only</dd></div></dl></article>
    </div>
    <div className="feature-notice"><CircleHelp size={18} /><span>Changing runtime settings is intentionally not available from this page. Configure the Linux companion with the documented installer and configure Google OAuth through the deployment secrets flow.</span></div>
  </div>;
}
