import { describe, expect, it } from "vitest";
import { joinRecipientList, parseRecipientList } from "./draftComposer";

describe("Draft composer recipient helpers", () => {
  it("normalizes comma-separated recipients without inventing addresses", () => {
    expect(parseRecipientList(" first@example.com, , second@example.com ")).toEqual(["first@example.com", "second@example.com"]);
    expect(joinRecipientList(["first@example.com", "second@example.com"])).toBe("first@example.com, second@example.com");
  });
});
