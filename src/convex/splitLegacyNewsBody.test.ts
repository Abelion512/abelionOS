import { describe, it, expect } from "vitest";
import { splitLegacyNewsBody } from "./newsWatcherLogic";

describe("splitLegacyNewsBody", () => {
  it("memisahkan provenance dan URL dari format lama", () => {
    expect(
      splitLegacyNewsBody("Google News (Global) · News · https://news.google.com/rss/articles/CBMi?oc=5")
    ).toEqual({
      body: "Google News (Global) · News",
      url: "https://news.google.com/rss/articles/CBMi?oc=5",
    });
  });

  it("menolak body tanpa URL di ujung", () => {
    expect(splitLegacyNewsBody("Companion kembali online")).toBeNull();
    expect(splitLegacyNewsBody("https://contoh.com di tengah kalimat")).toBeNull();
  });

  it("menolak body kosong dan URL tanpa provenance", () => {
    expect(splitLegacyNewsBody("")).toBeNull();
    // " · url" tanpa teks provenance bukan format lama yang sah.
    expect(splitLegacyNewsBody(" · https://contoh.com/a")).toBeNull();
  });

  it("URL dengan spasi di depan tetap dipisah bersih (tanpa spasi tersisa)", () => {
    const out = splitLegacyNewsBody("Provenance ·   https://contoh.com/a");
    expect(out).not.toBeNull();
    expect(out!.body).toBe("Provenance");
    expect(out!.url).toBe("https://contoh.com/a");
  });
});
