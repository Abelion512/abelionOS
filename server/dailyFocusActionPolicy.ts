import { z } from "zod";

export const dailyFocusActionKindSchema = z.enum(["task.create", "calendar.create", "calendar.delete", "gmail.trash"]);
export type DailyFocusActionKind = z.infer<typeof dailyFocusActionKindSchema>;

const taskProposalSchema = z.object({
  kind: z.literal("task.create"),
  taskListId: z.string().min(1).max(256).default("@default"),
  title: z.string().trim().min(1).max(1024),
  notes: z.string().trim().max(8192).nullable().default(null),
  due: z.string().datetime().nullable().default(null),
});

const calendarCreateProposalSchema = z.object({
  kind: z.literal("calendar.create"),
  calendarId: z.string().min(1).max(512).default("primary"),
  title: z.string().trim().min(1).max(1024),
  description: z.string().trim().max(8192).nullable().default(null),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timeZone: z.string().trim().min(1).max(128),
  attendees: z.array(z.string().email()).max(20).default([]),
  reminderMinutes: z.array(z.number().int().min(0).max(10_080)).max(5).default([]),
}).superRefine((value, ctx) => {
  if (Date.parse(value.end) <= Date.parse(value.start)) {
    ctx.addIssue({ code: "custom", path: ["end"], message: "End must be after start" });
  }
});

const calendarDeleteProposalSchema = z.object({
  kind: z.literal("calendar.delete"),
  calendarId: z.string().min(1).max(512),
  eventId: z.string().min(1).max(1024),
  title: z.string().trim().min(1).max(1024),
  start: z.string().datetime(),
  organizerSelf: z.literal(true),
});

const gmailTrashProposalSchema = z.object({
  kind: z.literal("gmail.trash"),
  messages: z.array(z.object({
    id: z.string().min(1).max(512),
    sender: z.string().max(1024).nullable(),
    subject: z.string().max(1024).nullable(),
    receivedAt: z.string().datetime().nullable(),
  })).min(1).max(25),
});

export const dailyFocusProposalSchema = z.discriminatedUnion("kind", [
  taskProposalSchema,
  calendarCreateProposalSchema,
  calendarDeleteProposalSchema,
  gmailTrashProposalSchema,
]);
export type DailyFocusProposal = z.infer<typeof dailyFocusProposalSchema>;

export const requiredScopeByAction: Record<DailyFocusActionKind, string> = {
  "task.create": "https://www.googleapis.com/auth/tasks",
  "calendar.create": "https://www.googleapis.com/auth/calendar.events.owned",
  "calendar.delete": "https://www.googleapis.com/auth/calendar.events.owned",
  "gmail.trash": "https://www.googleapis.com/auth/gmail.modify",
};

export function hasActionScope(grantedScopes: string, kind: DailyFocusActionKind) {
  return new Set(grantedScopes.split(" ").filter(Boolean)).has(requiredScopeByAction[kind]);
}

export function parseDailyFocusProposal(value: unknown): DailyFocusProposal {
  return dailyFocusProposalSchema.parse(value);
}

/**
 * Accepts only an explicit, line-oriented event draft. Ambiguous prose returns
 * null so it remains on the companion reasoning path rather than guessing.
 */
export function parseExplicitCalendarDraft(text: string): DailyFocusProposal | null {
  const fields = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(Title|Start|End|Timezone|Description):\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (fields.has(key)) return null;
    fields.set(key, match[2].trim());
  }

  const title = fields.get("title");
  const start = fields.get("start");
  const end = fields.get("end");
  const timeZone = fields.get("timezone");
  if (!title || !start || !end || !timeZone) return null;

  return parseDailyFocusProposal({
    kind: "calendar.create",
    calendarId: "primary",
    title,
    description: fields.get("description") || null,
    start,
    end,
    timeZone,
    attendees: [],
    reminderMinutes: [],
  });
}

export function proposalSummary(proposal: DailyFocusProposal) {
  if (proposal.kind === "task.create") return `Create task: ${proposal.title}`;
  if (proposal.kind === "calendar.create") return `Create event: ${proposal.title}`;
  if (proposal.kind === "calendar.delete") return `Delete event: ${proposal.title}`;
  return `Move ${proposal.messages.length} message${proposal.messages.length === 1 ? "" : "s"} to Trash`;
}
