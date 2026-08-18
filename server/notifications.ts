import { createNotification, getEffectiveNotificationPreferences } from "./db";

export type NotificationEvent =
  | "companion.online"
  | "companion.offline"
  | "daily_focus.proposal.ready"
  | "daily_focus.proposal.error"
  | "daily_focus.action.executed"
  | "google.connected"
  | "google.disconnected";

type NotificationDefinition = {
  category: "daily_focus" | "companion" | "google";
  severity: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
};

const notificationDefinitions: Record<NotificationEvent, NotificationDefinition> = {
  "companion.online": {
    category: "companion",
    severity: "success",
    title: "Companion is online",
    body: "A registered Linux companion resumed communication with Mintdesk.",
  },
  "companion.offline": {
    category: "companion",
    severity: "warning",
    title: "Companion appears offline",
    body: "A registered Linux companion has not checked in within the expected interval.",
  },
  "daily_focus.proposal.ready": {
    category: "daily_focus",
    severity: "info",
    title: "Daily Focus proposal is ready",
    body: "Review the prepared action before its confirmation window expires.",
  },
  "daily_focus.proposal.error": {
    category: "daily_focus",
    severity: "error",
    title: "Daily Focus needs attention",
    body: "The local companion could not prepare the requested action. No provider change was made.",
  },
  "daily_focus.action.executed": {
    category: "daily_focus",
    severity: "success",
    title: "Daily Focus action completed",
    body: "The action was completed after your confirmation.",
  },
  "google.connected": {
    category: "google",
    severity: "success",
    title: "Google Workspace connected",
    body: "Mintdesk can use the Google scopes you approved.",
  },
  "google.disconnected": {
    category: "google",
    severity: "info",
    title: "Google Workspace disconnected",
    body: "The local connection record was removed and Mintdesk no longer uses this Google account.",
  },
};

function isCategoryEnabled(
  category: NotificationDefinition["category"],
  preferences: Awaited<ReturnType<typeof getEffectiveNotificationPreferences>>,
) {
  if (!preferences.inAppEnabled) return false;
  if (category === "daily_focus") return preferences.dailyFocusEnabled;
  if (category === "companion") return preferences.companionEnabled;
  return preferences.googleEnabled;
}

export async function publishUserNotification(input: {
  userId: number;
  event: NotificationEvent;
  resourceType?: string;
  resourceId?: string;
}) {
  const definition = notificationDefinitions[input.event];
  try {
    const preferences = await getEffectiveNotificationPreferences(input.userId);
    if (!isCategoryEnabled(definition.category, preferences)) return null;
    return await createNotification({
      userId: input.userId,
      category: definition.category,
      severity: definition.severity,
      title: definition.title,
      body: definition.body,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
    });
  } catch (error) {
    console.warn("[Notifications] Delivery was skipped", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
