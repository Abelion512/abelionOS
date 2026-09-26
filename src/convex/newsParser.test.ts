import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  parseListingFallback,
  parseCryptowave,
  parseRss,
  toFiveW1H,
} from "./newsParser";

describe("newsParser", () => {
  it("membersihkan entity HTML dan whitespace", () => {
    expect(sanitizeText("<b>JPMorgan</b>: &quot;Bitcoin&quot; &amp; ETH")).toBe(
      'JPMorgan: "Bitcoin" & ETH'
    );
  });

  it("fallback listing mengekstrak judul+url, dedupe, batasi 40", () => {
    const html = `
      <a href="https://cryptowave.co.id/articles/aaa">Judul <b>A</b></a>
      <a href="https://cryptowave.co.id/articles/aaa">Duplikat</a>
      <a href="https://contoh-lain.com/x">Harus diabaikan</a>
      <a href="https://cryptowave.co.id/articles/bbb">Judul B</a>
    `;
    const out = parseListingFallback(html);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe("Judul A");
    expect(out[0].url).toBe("https://cryptowave.co.id/articles/aaa");
    expect(out[1].url).toBe("https://cryptowave.co.id/articles/bbb");
  });

  // Regresi 2026-09-26: situs kini menyajikan href relatif (/articles/...);
  // parser lama hanya cocokkan URL absolut sehingga hasil selalu kosong.
  it("fallback listing menerima href relatif dan mengabsolutkannya ke host resmi", () => {
    const html = `
      <a href="/articles/gabriel-rey-siapkan-vto">Gabriel Rey Siapkan VTO</a>
      <a href="/articles/as-dan-iran">AS dan Iran</a>
      <a href="/articles/gabriel-rey-siapkan-vto">Duplikat relatif</a>
    `;
    const out = parseListingFallback(html);
    expect(out).toHaveLength(2);
    expect(out[0].url).toBe("https://cryptowave.co.id/articles/gabriel-rey-siapkan-vto");
    expect(out[0].title).toBe("Gabriel Rey Siapkan VTO");
    expect(out[1].url).toBe("https://cryptowave.co.id/articles/as-dan-iran");
  });

  it("fallback listing menolak host dan path di luar artikel resmi", () => {
    const html = `
      <a href="/categories/kripto">Bukan artikel</a>
      <a href="https://contoh-lain.com/articles/aaa">Host lain</a>
      <a href="http://cryptowave.co.id/articles/aaa">Non-https</a>
      <a href="//evil.example/articles/aaa">Protocol-relative host lain</a>
    `;
    expect(parseListingFallback(html)).toHaveLength(0);
  });

  it("parseCryptowave memakai fallback bila JSON embedded tidak ada", () => {
    const html = '<html><a href="https://cryptowave.co.id/articles/zzz">Z</a></html>';
    const out = parseCryptowave(html);
    expect(out.map((a) => a.url)).toContain("https://cryptowave.co.id/articles/zzz");
  });

  it("parseRss mengekstrak item, dedupe, tolak non-https, batasi 40", () => {
    const xml = `
      <rss><channel>
        <item><title>Feed &amp; Title</title><link>https://s.example/a</link><pubDate>Wed, 23 Sep 2026 01:00:00 GMT</pubDate><category>Kripto</category></item>
        <item><title>Dup</title><link>https://s.example/a</link></item>
        <item><title>Insecure</title><link>http://s.example/b</link></item>
        <item><title>Atom-style</title><link href="https://s.example/c" /></item>
      </channel></rss>`;
    const out = parseRss(xml);
    expect(out.map((i) => i.link)).toEqual([
      "https://s.example/a",
      "https://s.example/c",
    ]);
    expect(out[0].category).toBe("Kripto");
    expect(out[0].title).toBe('Feed & Title');
    expect(out.length).toBeLessThanOrEqual(40);
  });

  it("5W1H membawa provenance `where` dari registry, bukan hardcode", () => {
    const w = toFiveW1H(
      { title: "T", url: "https://s.example/a", category: "Kripto", publishedLabel: "Wed, 23 Sep 2026" },
      "Google News (indeks Cryptowave)"
    );
    expect(w.where).toBe("Google News (indeks Cryptowave)");
    expect(w.what).toBe("T");
    expect(w.source).toBe("https://s.example/a");
  });
});
