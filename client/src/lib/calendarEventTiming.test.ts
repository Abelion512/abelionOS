import { describe, expect, it } from "vitest";
import { getCalendarEventTiming } from "./calendarEventTiming";

describe("Calendar event timing", () => {
  const windowStart = new Date("2026-08-17T16:44:14.110Z");

  it("labels a multi-day event that began earlier but has not ended as ongoing", () => {
    expect(getCalendarEventTiming({ start: "2026-07-13T10:00:00+07:00", end: "2026-09-14T23:59:00+07:00" }, windowStart)).toEqual({ kind: "ongoing", end: "2026-09-14T23:59:00+07:00" });
  });

  it("keeps a new event within the window scheduled", () => {
    expect(getCalendarEventTiming({ start: "2026-08-17T18:00:00.000Z", end: "2026-08-17T18:30:00.000Z" }, windowStart)).toEqual({ kind: "scheduled", start: "2026-08-17T18:00:00.000Z", end: "2026-08-17T18:30:00.000Z" });
  });
});
