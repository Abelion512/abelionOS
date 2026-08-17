const MAX_TITLE = 1024;
const MAX_NOTES = 8192;

function text(value, field, limit) {
  if (typeof value !== "string") throw new Error(`Action proposal is missing ${field}`);
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (!normalized || normalized.length > limit) throw new Error(`Action proposal has invalid ${field}`);
  return normalized;
}

function nullableText(value, field, limit) {
  if (value === null || value === undefined) return null;
  return text(value, field, limit);
}

function isoOrNull(value, field) {
  if (value === null || value === undefined) return null;
  const parsed = text(value, field, 80);
  if (!Number.isFinite(Date.parse(parsed))) throw new Error(`Action proposal has invalid ${field}`);
  return new Date(parsed).toISOString();
}

function array(value, field, limit) {
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Action proposal has invalid ${field}`);
  return value;
}

export function parseActionProposal(raw, expectedKind) {
  if (!raw || typeof raw !== "object" || raw.kind !== expectedKind) throw new Error("Action proposal kind does not match the requested action");
  if (expectedKind === "task.create") {
    return {
      kind: "task.create",
      taskListId: raw.taskListId === undefined ? "@default" : text(raw.taskListId, "taskListId", 256),
      title: text(raw.title, "title", MAX_TITLE),
      notes: nullableText(raw.notes, "notes", MAX_NOTES),
      due: isoOrNull(raw.due, "due"),
    };
  }
  if (expectedKind === "calendar.create") {
    const start = isoOrNull(raw.start, "start");
    const end = isoOrNull(raw.end, "end");
    if (!start || !end || Date.parse(end) <= Date.parse(start)) throw new Error("Calendar proposal has invalid time range");
    const attendees = array(raw.attendees ?? [], "attendees", 20).map((email) => text(email, "attendee", 320));
    const reminderMinutes = array(raw.reminderMinutes ?? [], "reminderMinutes", 5).map((minutes) => {
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10_080) throw new Error("Calendar proposal has invalid reminder");
      return minutes;
    });
    return {
      kind: "calendar.create",
      calendarId: raw.calendarId === undefined ? "primary" : text(raw.calendarId, "calendarId", 512),
      title: text(raw.title, "title", MAX_TITLE),
      description: nullableText(raw.description, "description", MAX_NOTES),
      start,
      end,
      timeZone: text(raw.timeZone, "timeZone", 128),
      attendees,
      reminderMinutes,
    };
  }
  throw new Error("Companion can only propose task.create or calendar.create");
}
