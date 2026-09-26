// Parser metadata berita — metadata saja: judul, kategori, waktu, link.
// ponytail: tanpa dependency parser; JSON embedded dulu, fallback regex listing.
// Jalur upgrade: registry sumber (RSS/API) per sumber dengan source-status eksplisit.
import { z } from "zod";

export const ArticleSchema = z.object({
  title: z.string().min(1),
  url: z.string().startsWith("https://cryptowave.co.id/"),
  category: z.string().default("News"),
  publishedLabel: z.string().default(""),
});

export type Article = z.infer<typeof ArticleSchema>;

// 5W1H point dari metadata artikel — tanpa full-text, tanpa rehost.
// `where` diisi label sumber dari registry agar provenance akurat.
export type FiveW1H = {
  what: string;
  when: string;
  who: string;
  where: string;
  source: string;
};

export function toFiveW1H(a: Article, where: string): FiveW1H {
  return {
    what: a.title,
    when: a.publishedLabel || "waktu tidak tersedia",
    who: a.category || "sumber",
    where,
    source: a.url,
  };
}

export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s+([:!?,.])/g, "$1")
    .trim();
}

export function extractEmbeddedJson(html: string): unknown | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

// Fallback: pasangan (title, url) berulang dari listing anchor.
// Situs Cryptowave pernah menyajikan link absolut dan kini relatif — keduanya
// diterima dan diabsolutkan terhadap host resmi; host lain tetap diabaikan
// (metadata link-out hanya boleh menunjuk sumbernya sendiri).
const CRYPTOWAVE_ORIGIN = "https://cryptowave.co.id/";
const CRYPTOWAVE_HOSTS = new Set(["cryptowave.co.id", "www.cryptowave.co.id"]);

export function parseListingFallback(html: string): Article[] {
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set<string>();
  const out: Article[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let url: URL | null = null;
    try {
      const candidate = new URL(m[1], CRYPTOWAVE_ORIGIN);
      if (candidate.protocol !== "https:" || !CRYPTOWAVE_HOSTS.has(candidate.hostname)) continue;
      url = candidate;
    } catch {
      continue;
    }
    if (!url || !url.pathname.startsWith("/articles/")) continue;
    const title = sanitizeText(m[2]);
    if (!title || seen.has(url.href)) continue;
    seen.add(url.href);
    out.push({ title, url: url.href, category: "News", publishedLabel: "" });
  }
  return out.slice(0, 40);
}

export function parseCryptowave(html: string): Article[] {
  const embedded = extractEmbeddedJson(html);
  if (embedded !== null) {
    const arr = Array.isArray(embedded) ? embedded : [];
    const parsed = z.array(ArticleSchema).safeParse(arr);
    if (parsed.success && parsed.data.length > 0) return parsed.data;
  }
  return parseListingFallback(html);
}

// Item RSS minimal dari feed registry — metadata saja, tanpa full-text.
export type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  category: string;
};

function firstTag(block: string, tag: string): string {
  const m = block.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1] : "";
}

export function parseRss(xml: string): RssItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: RssItem[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const title = sanitizeText(firstTag(block, "title"));
    let link = sanitizeText(firstTag(block, "link"));
    // Atom entry di dalam RSS memakai <link href=...> tanpa teks.
    if (!link) {
      const href = block.match(/<link[^>]*href="([^"]+)"/i);
      if (href) link = href[1].trim();
    }
    if (!title || !link.startsWith("https://") || seen.has(link)) continue;
    seen.add(link);
    const category = sanitizeText(firstTag(block, "category")) || "News";
    out.push({ title, link, pubDate: sanitizeText(firstTag(block, "pubDate")), category });
  }
  return out.slice(0, 40);
}
