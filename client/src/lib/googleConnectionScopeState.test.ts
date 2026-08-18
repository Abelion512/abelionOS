import { describe, expect, it } from "vitest";
import { getGoogleConnectionScopeState } from "./googleConnectionScopeState";

describe("Google connection scope presentation", () => {
  it("requires re-consent when an old Gmail Drafts write scope remains", () => {
    const state = getGoogleConnectionScopeState(true, ["https://www.googleapis.com/auth/gmail.metadata", "https://www.googleapis.com/auth/gmail.compose"]);
    expect(state).toMatchObject({ status: "re-consent required", hasLegacyComposeScope: true });
  });

  it("requires action re-consent until all Daily Focus write scopes are present", () => {
    const state = getGoogleConnectionScopeState(true, ["https://www.googleapis.com/auth/gmail.metadata"]);
    expect(state).toMatchObject({ status: "Daily Focus action re-consent required", hasLegacyComposeScope: false });
  });

  it("reports connected after all declared Daily Focus action scopes are granted", () => {
    const state = getGoogleConnectionScopeState(true, [
      "https://www.googleapis.com/auth/gmail.metadata",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/tasks",
      "https://www.googleapis.com/auth/calendar.events.owned",
    ]);
    expect(state).toMatchObject({ status: "connected", detail: expect.stringContaining("Gmail previews are bounded") });
  });
});
