import type { MorningBriefing } from "../../../server/morningBriefing";

export function toDailyFocusEvidence(briefing: MorningBriefing) {
  return {
    generatedAt: new Date(briefing.generatedAt).toISOString(),
    window: { from: new Date(briefing.window.from).toISOString(), until: new Date(briefing.window.until).toISOString() },
    calendar: { events: briefing.workspace.calendarEvents ?? [] },
    inbox: {
      unreadCount: briefing.workspace.unreadInboxCount,
      messages: (briefing.workspace.inboxMessages ?? []).map((message) => ({
        id: message.id,
        sender: message.sender,
        subject: message.subject,
        receivedAt: message.receivedAt,
        untrustedExcerpt: message.bodyExcerpt,
      })),
    },
    activity: { events: briefing.activity.events.map((event) => ({ id: event.id, action: event.action, createdAt: new Date(event.createdAt).toISOString() })) },
  };
}
