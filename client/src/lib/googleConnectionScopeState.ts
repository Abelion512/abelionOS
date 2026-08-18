const LEGACY_DRAFT_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
const DAILY_FOCUS_ACTION_SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events.owned",
];

export function getGoogleConnectionScopeState(connected: boolean, scopes: string[] | undefined) {
  const hasLegacyComposeScope = Boolean(connected && scopes?.includes(LEGACY_DRAFT_SCOPE));
  const hasActionScopes = DAILY_FOCUS_ACTION_SCOPES.every((scope) => scopes?.includes(scope));
  if (!connected) return { status: "not connected", detail: "Connect the deployed app for Calendar context and bounded Gmail previews used by Daily Focus.", hasLegacyComposeScope: false } as const;
  if (hasLegacyComposeScope) return { status: "re-consent required", detail: "Existing authorization still includes the legacy Gmail Drafts and send scope. Revoke Mintdesk access and reconnect without gmail.compose.", hasLegacyComposeScope: true } as const;
  if (!hasActionScopes) return { status: "Daily Focus action re-consent required", detail: "Reconnect Google Workspace to enable bounded Gmail previews plus reviewed Google Tasks, Calendar event, and Gmail Trash actions in Daily Focus.", hasLegacyComposeScope: false } as const;
  return { status: "connected", detail: `OAuth token is stored server-side with ${scopes?.length ?? 0} Daily Focus scopes. Gmail previews are bounded and not persisted.`, hasLegacyComposeScope: false } as const;
}
