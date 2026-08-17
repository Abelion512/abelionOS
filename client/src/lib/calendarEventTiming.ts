export type CalendarTiming = { kind: "ongoing"; end: string } | { kind: "scheduled"; start: string; end: string };

export function getCalendarEventTiming({ start, end }: { start: string; end: string }, windowStart: Date): CalendarTiming {
  return Date.parse(start) < windowStart.getTime() ? { kind: "ongoing", end } : { kind: "scheduled", start, end };
}
