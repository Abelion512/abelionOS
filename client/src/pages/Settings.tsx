import { BellRing, CheckCircle2, CircleHelp, Settings2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { getBridgeConfig } from "@/lib/bridge";
import { trpc } from "@/lib/trpc";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const defaultPreferences = { inAppEnabled: true, browserEnabled: false, dailyFocusEnabled: true, companionEnabled: true, googleEnabled: true };

function browserPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const bridge = getBridgeConfig();
  const workspace = trpc.google.status.useQuery(undefined, { enabled: isAuthenticated });
  const notificationPreferences = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [permission, setPermission] = useState(browserPermission);
  useEffect(() => setPermission(browserPermission()), []);
  const savePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      void utils.notifications.preferences.invalidate();
      toast.success("Notification preferences saved.");
    },
    onError: () => toast.error("Notification preferences could not be saved."),
  });
  const workspaceStatus = !isAuthenticated ? "Not authenticated" : workspace.isLoading ? "Checking" : workspace.data?.connected ? "Connected" : "Not configured";
  const preferences = notificationPreferences.data ?? defaultPreferences;
  const updatePreferences = (changes: Partial<typeof defaultPreferences>) => {
    if (!isAuthenticated || savePreferences.isPending) return;
    savePreferences.mutate({ ...preferences, ...changes });
  };
  const toggleBrowser = async (checked: boolean) => {
    if (!checked) {
      updatePreferences({ browserEnabled: false });
      return;
    }
    if (browserPermission() === "unsupported") {
      toast.error("This browser does not support notification permission.");
      return;
    }
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") {
      updatePreferences({ browserEnabled: false });
      toast.error("Browser notification permission was not granted.");
      return;
    }
    updatePreferences({ browserEnabled: true });
  };
  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Runtime configuration</p><h1>Settings</h1><p>Operational runtime facts and notification preferences. Local secrets remain outside the browser.</p></div></header>
    <div className="settings-grid">
      <article className="panel settings-card"><div className="settings-card-heading"><Settings2 size={18} /><h2>Application</h2></div><dl><div><dt>Environment</dt><dd>Web app</dd></div><div><dt>Storage</dt><dd>S3 metadata-backed</dd></div><div><dt>Workspace OAuth</dt><dd>{workspaceStatus}</dd></div></dl></article>
      <article className="panel settings-card"><div className="settings-card-heading"><ShieldAlert size={18} /><h2>Authentication</h2></div><dl><div><dt>Status</dt><dd>{isAuthenticated ? "Authenticated" : "Not authenticated"}</dd></div><div><dt>Identity</dt><dd>{user?.email || user?.name || "Unavailable"}</dd></div><div><dt>Provider</dt><dd>Manus OAuth</dd></div></dl></article>
      <article className="panel settings-card"><div className="settings-card-heading"><CheckCircle2 size={18} /><h2>Local bridge</h2></div><dl><div><dt>Token in browser</dt><dd>{bridge ? "Configured" : "Unavailable"}</dd></div><div><dt>Endpoint</dt><dd><code>{bridge?.baseUrl || "127.0.0.1:18765"}</code></dd></div><div><dt>Permission</dt><dd>Current user only</dd></div></dl></article>
    </div>
    <section className="panel notification-settings" aria-labelledby="notification-settings-title">
      <div className="notification-settings-heading"><span><BellRing size={18} /><h2 id="notification-settings-title">Notifications</h2></span><p>Events contain operational metadata only. They never include Gmail content, provider payloads, credentials, or raw AI output.</p></div>
      {!isAuthenticated && <p className="notification-settings-unavailable">Sign in to configure notification delivery.</p>}
      {isAuthenticated && notificationPreferences.isLoading && <p className="notification-settings-unavailable">Loading notification preferences…</p>}
      {isAuthenticated && notificationPreferences.isError && <p className="notification-settings-unavailable notification-error">Notification preferences are unavailable right now.</p>}
      {isAuthenticated && !notificationPreferences.isLoading && !notificationPreferences.isError && <div className="notification-settings-list">
        <label className="notification-setting"><span><strong>In-app inbox</strong><small>Store future operational events in the Mintdesk notification center.</small></span><Switch aria-label="In-app inbox" checked={preferences.inAppEnabled} onCheckedChange={(checked) => updatePreferences(checked ? { inAppEnabled: true } : { inAppEnabled: false, browserEnabled: false })} disabled={savePreferences.isPending} /></label>
        <label className="notification-setting"><span><strong>Browser alerts</strong><small>{permission === "unsupported" ? "This browser does not support notification permission." : permission === "denied" ? "Permission is denied in this browser. Update it from browser settings to enable alerts." : "Ask this browser for permission. Alerts are delivered only while Mintdesk is open and new events are received."}</small></span><Switch aria-label="Browser alerts" checked={preferences.browserEnabled} onCheckedChange={toggleBrowser} disabled={!preferences.inAppEnabled || savePreferences.isPending || permission === "unsupported" || permission === "denied"} /></label>
        <label className="notification-setting"><span><strong>Daily Focus</strong><small>Proposal-ready, proposal-error, and confirmed action-complete events.</small></span><Switch aria-label="Daily Focus notifications" checked={preferences.dailyFocusEnabled} onCheckedChange={(checked) => updatePreferences({ dailyFocusEnabled: checked })} disabled={!preferences.inAppEnabled || savePreferences.isPending} /></label>
        <label className="notification-setting"><span><strong>Linux companion</strong><small>Verified online and offline transitions from companion check-in status.</small></span><Switch aria-label="Linux companion notifications" checked={preferences.companionEnabled} onCheckedChange={(checked) => updatePreferences({ companionEnabled: checked })} disabled={!preferences.inAppEnabled || savePreferences.isPending} /></label>
        <label className="notification-setting"><span><strong>Google Workspace</strong><small>Connection and disconnect events, without token or email content.</small></span><Switch aria-label="Google Workspace notifications" checked={preferences.googleEnabled} onCheckedChange={(checked) => updatePreferences({ googleEnabled: checked })} disabled={!preferences.inAppEnabled || savePreferences.isPending} /></label>
      </div>}
    </section>
    <div className="feature-notice"><CircleHelp size={18} /><span>Runtime configuration such as companion installation and Google OAuth client credentials remains outside this page. Notification preferences affect future delivery only and never authorize a provider write.</span></div>
  </div>;
}
