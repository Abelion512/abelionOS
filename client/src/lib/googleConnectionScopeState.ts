const LEGACY_DRAFT_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export function getGoogleConnectionScopeState(connected: boolean, scopes: string[] | undefined) {
  const hasLegacyComposeScope = Boolean(connected && scopes?.includes(LEGACY_DRAFT_SCOPE));
  if (!connected) return { status: "not connected", detail: "Connect the deployed app for Calendar read-only and Gmail metadata used by Morning Briefing.", hasLegacyComposeScope: false } as const;
  if (hasLegacyComposeScope) return { status: "re-consent required", detail: "Existing authorization still includes the legacy Gmail Drafts write scope. Revoke Mintdesk access and reconnect with the read-only Morning Briefing scopes.", hasLegacyComposeScope: true } as const;
  return { status: "connected", detail: `OAuth token is stored server-side with ${scopes?.length ?? 0} read-only Morning Briefing scopes.`, hasLegacyComposeScope: false } as const;
}
