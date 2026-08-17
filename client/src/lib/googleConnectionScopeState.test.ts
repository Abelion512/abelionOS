import { describe, expect, it } from "vitest";
import { getGoogleConnectionScopeState } from "./googleConnectionScopeState";

describe("Google connection scope presentation", () => {
  it("requires re-consent when an old Gmail Drafts write scope remains", () => {
    const state = getGoogleConnectionScopeState(true, ["https://www.googleapis.com/auth/gmail.metadata", "https://www.googleapis.com/auth/gmail.compose"]);
    expect(state).toMatchObject({ status: "re-consent required", hasLegacyComposeScope: true });
  });
});
