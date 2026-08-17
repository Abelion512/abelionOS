import { describe, expect, it } from "vitest";
import { getBriefingViewState } from "./briefingState";

describe("Morning Briefing view state", () => {
  it("labels a retained prior result as stale when a refresh fails", () => {
    expect(getBriefingViewState({ hasData: true, isLoading: false, hasError: true })).toBe("stale");
  });

  it("does not claim a new briefing exists when the first request fails", () => {
    expect(getBriefingViewState({ hasData: false, isLoading: false, hasError: true })).toBe("error");
  });
});
