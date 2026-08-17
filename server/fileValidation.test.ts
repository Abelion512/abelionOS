import { describe, expect, it } from "vitest";
import { validateUploadBytes } from "./fileValidation";

describe("file upload validation", () => {
  it("accepts base64 bytes when declared size matches", () => {
    const bytes = validateUploadBytes(Buffer.from("mintdesk").toString("base64"), 8);
    expect(bytes.toString()).toBe("mintdesk");
  });

  it("rejects mismatched declared size", () => {
    expect(() => validateUploadBytes(Buffer.from("mintdesk").toString("base64"), 7)).toThrow(/does not match/);
  });

  it("rejects oversized files", () => {
    expect(() => validateUploadBytes("AA==", 8_000_001)).toThrow(/outside/);
  });
});
