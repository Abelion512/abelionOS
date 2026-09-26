import { describe, it, expect } from "vitest";
import { watcherDecide, buildPushPayload } from "./newsWatcherLogic";

const a1 = { title: "Judul satu", url: "https://s.example/1", category: "Kripto", publishedLabel: "Wed, 23 Sep 2026" };
const a2 = { title: "Judul dua", url: "https://s.example/2", category: "News", publishedLabel: "" };
const a3 = { title: "Judul tiga", url: "https://s.example/3", category: "News", publishedLabel: "" };

describe("newsWatcherLogic", () => {
  it("baseline: tanpa push, tetapi semua URL tetap ditandai seen", () => {
    const d = watcherDecide(
      [
        { where: "Sumber A", articles: [a1, a2] },
        { where: "Sumber B", articles: [a3] },
      ],
      []
    );
    expect(d.baseline).toBe(true);
    expect(d.fresh).toEqual([]);
    expect(d.markUrls.sort()).toEqual([a1.url, a2.url, a3.url].sort());
  });

  it("run kedua: hanya artikel yang belum ada di seen", () => {
    const d = watcherDecide(
      [
        { where: "Sumber A", articles: [a1, a2] },
        { where: "Sumber B", articles: [a3] },
      ],
      [a1.url, a2.url]
    );
    expect(d.baseline).toBe(false);
    expect(d.fresh.map((f) => f.url)).toEqual([a3.url]);
    expect(d.fresh[0].where).toBe("Sumber B");
    expect(d.markUrls).toEqual([a3.url]);
  });

  it("dedupe lintas sumber per URL dalam satu run", () => {
    const d = watcherDecide(
      [
        { where: "Sumber A", articles: [a1] },
        { where: "Sumber B", articles: [a1] },
      ],
      [a2.url, a3.url]
    );
    expect(d.fresh).toHaveLength(1);
    expect(d.fresh[0].where).toBe("Sumber A");
  });

  it("payload push metadata-only: judul dipotong, provenance dipertahankan", () => {
    const p = buildPushPayload({
      url: a1.url,
      what: "J".repeat(300),
      where: "Sumber A",
      who: "Kripto",
      when: "",
    });
    expect(p.title.length).toBeLessThanOrEqual(120);
    expect(p.body).toBe("Sumber A · Kripto");
    expect(p.url).toBe(a1.url);
    expect(p.tag).toBe("news");
    // Tanpa konten penuh: teks 300 karakter tidak ikut utuh ke payload.
    expect(JSON.stringify(p)).not.toContain("J".repeat(300));
  });
});
