type CalendarInput = {
  summary: string;
  start: string;
  end: string;
  organizer: string | null;
  attendees: string[];
  location: string | null;
  description: string | null;
  meetingUrl: string | null;
  htmlLink: string | null;
};

type InboxInput = { sender: string | null; subject: string | null; receivedAt: string | null };

export type BriefingFact = { label: "What" | "When" | "Who" | "Where" | "Why / How"; value: string | null; href?: string | null };

export function getCalendarFiveWOneH(event: CalendarInput): BriefingFact[] {
  const people = [event.organizer, ...event.attendees].filter((person): person is string => Boolean(person));
  const uniquePeople = people.filter((person, index) => people.indexOf(person) === index);
  return [
    { label: "What", value: event.summary || null },
    { label: "When", value: `${event.start} → ${event.end}` },
    { label: "Who", value: uniquePeople.length ? uniquePeople.join(", ") : null },
    { label: "Where", value: event.location },
    { label: "Why / How", value: event.description, href: event.meetingUrl || event.htmlLink },
  ];
}

export function getInboxFiveWOneH(message: InboxInput): BriefingFact[] {
  return [
    { label: "What", value: message.subject },
    { label: "When", value: message.receivedAt },
    { label: "Who", value: message.sender },
    { label: "Where", value: "Gmail Inbox" },
    { label: "Why / How", value: "Unread metadata only" },
  ];
}
