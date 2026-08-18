import { describe, expect, it } from "vitest";
import { extractReasonerCompletion, ReasonerProviderLimitedError } from "./reasonerResponsePolicy.mjs";

describe("Bun companion reasoner response policy", () => {
  it("accepts a non-streaming OpenAI completion followed by an SSE done marker", () => {
    const raw = '{"choices":[{"message":{"content":"```json\\n{\\\"kind\\\":\\\"task.create\\\"}\\n```"}}]}data: [DONE]';
    expect(extractReasonerCompletion(raw)).toContain('"task.create"');
  });

  it("joins content deltas from a framed SSE response", () => {
    const raw = 'data: {"choices":[{"delta":{"content":"{\\\"kind\\\":"}}]}\n\ndata: {"choices":[{"delta":{"content":"\\\"task.create\\\"}"}}]}\n\ndata: [DONE]';
    expect(extractReasonerCompletion(raw)).toBe('{"kind":"task.create"}');
  });

  it("labels provider free-tier denial without exposing its raw message", () => {
    const raw = '{"choices":[{"message":{"content":"Sorry, to prevent abuse of free resources, accounts that have not been recharged can only try 10 times."}}]}data: [DONE]';
    expect(() => extractReasonerCompletion(raw)).toThrow(ReasonerProviderLimitedError);
  });
});
