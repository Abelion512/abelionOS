const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const MAX_TEXT = 220;
const MAX_EVIDENCE_PER_SOURCE = 5;

function text(value, limit = MAX_TEXT) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return normalized ? normalized.slice(0, limit) : null;
}

function list(value, mapper) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_EVIDENCE_PER_SOURCE).map(mapper).filter(Boolean);
}

export function assertLoopbackRouterUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("9router must use an http loopback URL");
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/`;
  return url;
}

export function sanitizeDailyFocusEvidence(input) {
  if (!input || typeof input !== "object") throw new Error("Daily Focus evidence is required");
  const source = input;
  const calendar = list(source.calendar?.events, (event) => {
    const id = text(event?.id, 120);
    const summary = text(event?.summary);
    const start = text(event?.start, 80);
    const end = text(event?.end, 80);
    if (!id || !summary || !start || !end) return null;
    return { ref: `calendar:${id}`, summary, start, end, organizer: text(event?.organizer), location: text(event?.location) };
  });
  const inbox = list(source.inbox?.messages, (message) => {
    const id = text(message?.id, 120);
    if (!id) return null;
    return { ref: `gmail:${id}`, sender: text(message?.sender), subject: text(message?.subject), receivedAt: text(message?.receivedAt, 80) };
  });
  const activity = list(source.activity?.events, (event, index) => {
    const action = text(event?.action, 120);
    if (!action) return null;
    return { ref: `activity:${text(String(event?.id ?? index), 120)}`, action, occurredAt: text(event?.createdAt ?? event?.timestamp, 80) };
  });
  const evidenceRefs = new Set([...calendar, ...inbox, ...activity].map((item) => item.ref));
  return {
    generatedAt: text(source.generatedAt, 80) || new Date().toISOString(),
    window: { from: text(source.window?.from, 80), until: text(source.window?.until, 80) },
    calendar,
    inbox: { unreadCount: Number.isInteger(source.inbox?.unreadCount) && source.inbox.unreadCount >= 0 ? source.inbox.unreadCount : null, messages: inbox },
    activity,
    evidenceRefs,
  };
}

function requiredText(value, field, limit = MAX_TEXT) {
  const result = text(value, limit);
  if (!result) throw new Error(`Daily Focus response is missing ${field}`);
  return result;
}

function validateRefs(value, allowed) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_EVIDENCE_PER_SOURCE) throw new Error("Daily Focus response has invalid evidence references");
  const refs = value.map((entry) => requiredText(entry, "evidence reference", 180));
  if (refs.some((ref) => !allowed.has(ref))) throw new Error("Daily Focus response cited evidence outside the approved payload");
  return [...new Set(refs)];
}

export function parseDailyFocusResponse(raw, allowedEvidenceRefs) {
  if (!raw || typeof raw !== "object") throw new Error("9router returned no Daily Focus object");
  const response = raw;
  const priorities = Array.isArray(response.priorities) ? response.priorities : [];
  if (priorities.length < 1 || priorities.length > 3) throw new Error("Daily Focus response must contain one to three priorities");
  const parsedPriorities = priorities.map((priority, index) => {
    if (!priority || typeof priority !== "object") throw new Error("Daily Focus response contains an invalid priority");
    const confidence = priority.confidence;
    if (!["high", "medium", "low"].includes(confidence)) throw new Error("Daily Focus response has invalid confidence");
    return {
      id: requiredText(priority.id, `priority ${index + 1} id`, 80),
      title: requiredText(priority.title, `priority ${index + 1} title`, 140),
      rationale: requiredText(priority.rationale, `priority ${index + 1} rationale`),
      nextStep: requiredText(priority.nextStep, `priority ${index + 1} next step`, 180),
      confidence,
      evidenceRefs: validateRefs(priority.evidenceRefs, allowedEvidenceRefs),
    };
  });
  const tomorrow = Array.isArray(response.tomorrowPreparation) ? response.tomorrowPreparation.slice(0, 3).map((item) => requiredText(item, "tomorrow preparation", 180)) : [];
  const lessons = Array.isArray(response.yesterdayLessons) ? response.yesterdayLessons.slice(0, 3).map((item) => requiredText(item, "yesterday lesson", 180)) : [];
  const uncertainties = Array.isArray(response.uncertainties) ? response.uncertainties.slice(0, 5).map((item) => requiredText(item, "uncertainty", 180)) : [];
  return {
    headline: requiredText(response.headline, "headline", 180),
    priorities: parsedPriorities,
    tomorrowPreparation: tomorrow,
    yesterdayLessons: lessons,
    uncertainties,
  };
}

export const __dailyFocusPolicyInternals = { text };
