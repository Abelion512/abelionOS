import { describe, it, expect } from "vitest";
import {
  parseProposalPayload,
  assertOwnedCalendar,
  REQUIRED_SCOPES,
} from "./googleProposalSchema";

describe("googleProposalSchema", () => {
  it("menerima payload task.create valid", () => {
    const p = parseProposalPayload(
      JSON.stringify({ kind: "task.create", title: "Review proposal", due: "2026-09-26T09:00:00+07:00" })
    );
    expect(p.kind).toBe("task.create");
  });

  it("menolak payload bukan JSON", () => {
    expect(() => parseProposalPayload("bukan json")).toThrow(/JSON/);
  });

  it("menolak kind yang tidak diizinkan", () => {
    expect(() => parseProposalPayload(JSON.stringify({ kind: "gmail.send" }))).toThrow(/skema/);
  });

  it("menolak calendar.create dengan waktu tidak valid", () => {
    expect(() =>
      parseProposalPayload(
        JSON.stringify({
          kind: "calendar.create",
          calendarId: "primary",
          summary: "uji",
          start: "bukan-waktu",
          end: "2026-09-26T10:00:00+07:00",
        })
      )
    ).toThrow();
  });

  it("gmail.trash dibatasi maksimal 20 pesan", () => {
    const ids = Array.from({ length: 21 }, (_, i) => "msg" + i);
    expect(() => parseProposalPayload(JSON.stringify({ kind: "gmail.trash", messageIds: ids }))).toThrow();
    expect(() =>
      parseProposalPayload(JSON.stringify({ kind: "gmail.trash", messageIds: ids.slice(0, 20) }))
    ).not.toThrow();
  });

  it("ownership guard menolak kalender bersama dan calendarId mencurigakan", () => {
    expect(() => assertOwnedCalendar("abc@group.calendar.google.com")).toThrow(/Ownership guard/);
    expect(() => assertOwnedCalendar("../other")).toThrow(/tidak valid/);
    expect(() => assertOwnedCalendar("primary")).not.toThrow();
  });

  it("scope minimum per kind sesuai allowlist AGENTS.md", () => {
    expect(REQUIRED_SCOPES["task.create"]).toEqual(["https://www.googleapis.com/auth/tasks"]);
    expect(REQUIRED_SCOPES["calendar.create"]).toEqual([
      "https://www.googleapis.com/auth/calendar.events.owned",
    ]);
    expect(REQUIRED_SCOPES["gmail.trash"]).toEqual(["https://www.googleapis.com/auth/gmail.modify"]);
  });
});
