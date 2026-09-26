// Kontrak payload proposal Google — dipreview pengguna sebelum dieksekusi.
// ponytail: zod sudah ada; guard scope + ownership tidak boleh dilemahkan
// saat dipakai di file lain — executor wajib memanggil helper di sini.
import { z } from "zod";

export const PROPOSAL_KINDS = [
  "task.create",
  "calendar.create",
  "calendar.delete",
  "gmail.trash",
] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

const rfc3339 = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "harus waktu RFC 3339" });

export const GoogleActionPayload = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("task.create"),
    title: z.string().min(1).max(400),
    notes: z.string().max(2000).optional(),
    due: rfc3339.optional(),
    // task list provider; kosong berarti @default
    listId: z.string().max(200).optional(),
  }),
  z.object({
    kind: z.literal("calendar.create"),
    calendarId: z.string().min(1).max(200),
    summary: z.string().min(1).max(400),
    start: rfc3339,
    end: rfc3339,
    description: z.string().max(2000).optional(),
  }),
  z.object({
    kind: z.literal("calendar.delete"),
    calendarId: z.string().min(1).max(200),
    eventId: z.string().min(1).max(300),
  }),
  // Trash, bukan permanent delete — maksimal 20 pesan per proposal.
  z.object({
    kind: z.literal("gmail.trash"),
    messageIds: z.array(z.string().min(1).max(300)).min(1).max(20),
  }),
]);

export type GoogleActionPayload = z.infer<typeof GoogleActionPayload>;

export function parseProposalPayload(payload: string): GoogleActionPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    throw new Error("Payload proposal bukan JSON valid");
  }
  const parsed = GoogleActionPayload.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Payload proposal tidak sesuai skema: " + (parsed.error.issues[0]?.message ?? "tidak diketahui"));
  }
  return parsed.data;
}

// Scope provider minimum per kind. Eksekusi menolak bila scope belum granted
// — jangan pernah memanggil provider dengan scope di luar daftar ini.
export const REQUIRED_SCOPES: Record<ProposalKind, string[]> = {
  "task.create": ["https://www.googleapis.com/auth/tasks"],
  "calendar.create": ["https://www.googleapis.com/auth/calendar.events.owned"],
  "calendar.delete": ["https://www.googleapis.com/auth/calendar.events.owned"],
  "gmail.trash": ["https://www.googleapis.com/auth/gmail.modify"],
};

// Ownership guard: hanya kalender utama akun sendiri yang boleh ditulis.
// Event kalender bersama (@group.calendar.google.com) di luar kepemilikan.
export function assertOwnedCalendar(calendarId: string): void {
  const id = calendarId.toLowerCase();
  if (id.endsWith("@group.calendar.google.com")) {
    throw new Error("Ownership guard: kalender bersama tidak boleh diubah; gunakan kalender utama akun.");
  }
  if (id.includes("..") || id.includes("/") || id.includes("%") || id.includes(" ")) {
    throw new Error("calendarId tidak valid.");
  }
}
