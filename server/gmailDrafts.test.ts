import { describe, expect, it } from "vitest";
import { __gmailDraftInternals } from "./gmailDrafts";

describe("Gmail Drafts server contract", () => {
  it("requires compose scope rather than treating metadata scope as write permission", () => {
    expect(__gmailDraftInternals.hasComposeScope("https://www.googleapis.com/auth/gmail.metadata")).toBe(false);
    expect(__gmailDraftInternals.hasComposeScope("https://www.googleapis.com/auth/gmail.metadata https://www.googleapis.com/auth/gmail.compose")).toBe(true);
  });

  it("encodes draft MIME content without permitting header injection", () => {
    expect(() => __gmailDraftInternals.encodeDraftRaw({ to: ["user@example.com"], cc: [], bcc: [], subject: "Hello\r\nBcc: injected@example.com", body: "Body" })).toThrow("Email headers cannot contain line breaks");
  });

  it("normalizes display-name recipient headers into email-only editor values", () => {
    expect(__gmailDraftInternals.normalizeRecipientHeader('Abelion Lavv <agen.salva@gmail.com>, "Project, Team" <team@example.com>, plain@example.com')).toEqual(["agen.salva@gmail.com", "team@example.com", "plain@example.com"]);
  });

  it("returns explicit body availability for full draft data", () => {
    const draft = __gmailDraftInternals.normalizeDraft({ id: "draft-1", message: { id: "message-1", threadId: "thread-1", payload: { headers: [{ name: "To", value: "Abelion <agen.salva@gmail.com>, Team <team@example.com>" }, { name: "Subject", value: "Hello" }], body: { data: Buffer.from("Body", "utf8").toString("base64url") } } } }, true);
    expect(draft).toMatchObject({ id: "draft-1", to: ["agen.salva@gmail.com", "team@example.com"], subject: "Hello", body: "Body", bodyAvailable: true });
  });
});
