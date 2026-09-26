import { describe, it, expect } from "vitest";
import { validateFeedUrl, cleanSourceLabel } from "./newsSourceGuard";

describe("newsSourceGuard", () => {
  it("menerima feed https publik", () => {
    expect(validateFeedUrl("https://example.com/feed.xml")).toBe("https://example.com/feed.xml");
  });

  it("menolak non-https, kredensial in-URL, dan port non-443", () => {
    expect(() => validateFeedUrl("http://example.com/feed")).toThrow(/https/);
    expect(() => validateFeedUrl("https://user:pass@example.com/feed")).toThrow(/kredensial/);
    expect(() => validateFeedUrl("https://example.com:8080/feed")).toThrow(/Port/);
  });

  it("menolak loopback, LAN, link-local, dan IP mentah (SSRF)", () => {
    expect(() => validateFeedUrl("https://localhost/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://127.0.0.1/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://192.168.1.10/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://10.0.0.5/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://169.254.169.254/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://[::1]/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://172.16.0.9/feed")).toThrow(/loopback|LAN/);
    expect(() => validateFeedUrl("https://8.8.8.8/feed")).toThrow(/IP mentah/);
  });

  it("menolak URL rusak dan terlalu panjang", () => {
    expect(() => validateFeedUrl("bukan-url")).toThrow();
    expect(() => validateFeedUrl("https://example.com/" + "a".repeat(600))).toThrow(/panjang/);
  });

  it("cleanSourceLabel membuang markup dan membatasi panjang", () => {
    expect(cleanSourceLabel("<b>Feed</b> &amp; Co")).toBe("Feed & Co");
    expect(cleanSourceLabel("x".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});
