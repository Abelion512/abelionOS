import { describe, it, expect } from "vitest";
import { NEWS_SOURCES, CATEGORIES, REGIONS, categoryLabel, regionLabel } from "./newsRegistry";

describe("newsRegistry", () => {
  it("setiap sumber punya kontrak lengkap: url https, parser, kategori, wilayah", () => {
    expect(NEWS_SOURCES.length).toBeGreaterThan(2);
    const ids = new Set<string>();
    for (const s of NEWS_SOURCES) {
      expect(s.url.startsWith("https://")).toBe(true);
      expect(typeof s.parse).toBe("function");
      expect(CATEGORIES.some((c) => c.id === s.category)).toBe(true);
      expect(REGIONS.some((r) => r.id === s.region)).toBe(true);
      expect(s.where.length).toBeGreaterThan(0);
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("kurasi mencakup teknologi/geopolitik/finansial × Indonesia/China/Global", () => {
    for (const region of REGIONS.map((r) => r.id)) {
      for (const cat of ["technology", "geopolitics", "finance"]) {
        expect(NEWS_SOURCES.some((s) => s.region === region && s.category === cat)).toBe(true);
      }
    }
  });

  it("cryptowave tidak difilter konten (tanpa topics) dan kategorinya crypto", () => {
    const cw = NEWS_SOURCES.find((s) => s.id === "cryptowave");
    expect(cw).toBeDefined();
    expect(cw!.category).toBe("crypto");
    expect(cw!.topics).toBeUndefined();
  });

  it("kanal geopolitik/finansial diberi topic-filter agar sesuai kategori", () => {
    const filtered = NEWS_SOURCES.filter((s) => s.topics !== undefined);
    expect(filtered.length).toBeGreaterThan(0);
    for (const s of filtered) {
      expect(s.topics!.length).toBeGreaterThan(0);
      expect(s.category === "geopolitics" || s.category === "finance").toBe(true);
    }
  });

  it("helper label mengembalikan label kurasi", () => {
    expect(categoryLabel("technology")).toBe("Teknologi");
    expect(regionLabel("id")).toBe("Indonesia");
    expect(categoryLabel("tidak-ada")).toBe("tidak-ada");
  });
});
