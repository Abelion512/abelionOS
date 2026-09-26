// Registry sumber berita Mintdesk — modular dan pluggable.
// ponytail: satu kontrak feed, tambah sumber = tambah satu objek; tanpa
// dependency parser XML, tanpa cron, tanpa persistence artikel. Ceiling:
// kurasi manual di file ini; jalur upgrade: pindah registry ke tabel bila
// kurasi perlu diatur dari UI tanpa deploy.
import { parseCryptowave, type Article } from "./newsParser";
import { rssToArticles } from "./rssParser";

// Kategori kurasi — label tampil di UI, id dipakai user-scoped.
export const CATEGORIES = [
  { id: "technology", label: "Teknologi" },
  { id: "geopolitics", label: "Geopolitik & Politik" },
  { id: "finance", label: "Finansial" },
  { id: "crypto", label: "Kripto" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

// Wilayah edisi Google News — provenance `where` mengikuti label ini.
export const REGIONS = [
  { id: "id", label: "Indonesia", gn: "hl=id&gl=ID&ceid=ID:id" },
  { id: "cn", label: "China", gn: "hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  { id: "global", label: "Global", gn: "hl=en-US&gl=US&ceid=US:en" },
] as const;
export type RegionId = (typeof REGIONS)[number]["id"];

// Kontrak sumber: setiap feed deklarasikan category/region-nya sendiri.
// `topics` opsional men-filter judul (mis. politik untuk kanal WORLD);
// cryptowave sengaja tanpa filter — semua kontennya diterima.
export type NewsSource = {
  id: string;
  label: string;
  url: string;
  where: string;
  category: CategoryId;
  region: RegionId;
  topics?: string[];
  parse: (body: string) => Article[];
};

// Kanal topik Google News yang sudah diverifikasi hidup (200, 44–70 item).
function gnTopic(topic: string, gn: string): string {
  return "https://news.google.com/rss/headlines/section/topic/" + topic + "?" + gn;
}

const REGION_TOPICS: Record<RegionId, { category: CategoryId; topic: string; topics?: string[] }[]> = {
  id: [
    { category: "technology", topic: "TECHNOLOGY" },
    { category: "geopolitics", topic: "WORLD", topics: ["politik", "pemerintah", "presiden", "dpr", "geopolitik", "kamtib"] },
    { category: "finance", topic: "BUSINESS", topics: ["ekonomi", "bank", "rupiah", "saham", "investasi", "fiskal", "bank indonesia"] },
  ],
  cn: [
    { category: "technology", topic: "TECHNOLOGY" },
    { category: "geopolitics", topic: "WORLD", topics: ["china", "beijing", "taiwan", "politik", "xijing", "diplomat"] },
    { category: "finance", topic: "BUSINESS", topics: ["china", "yuan", "ekonomi", "bank", "market", "trade"] },
  ],
  global: [
    { category: "technology", topic: "TECHNOLOGY" },
    { category: "geopolitics", topic: "WORLD", topics: ["geopolitic", "election", "government", "war", "sanction", "diplomat", "politic"] },
    { category: "finance", topic: "BUSINESS", topics: ["economy", "market", "fed", "bank", "inflation", "trade", "invest"] },
  ],
};

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "cryptowave",
    label: "Cryptowave",
    url: "https://cryptowave.co.id/",
    where: "Cryptowave (Indonesia)",
    category: "crypto",
    region: "id",
    // Tanpa filter konten: seluruh listing Cryptowave diterima apa adanya.
    parse: (html) => parseCryptowave(html),
  },
  {
    id: "cryptowave-gnews",
    label: "Cryptowave via Google News",
    url: "https://news.google.com/rss/search?q=site:cryptowave.co.id&hl=id&gl=ID&ceid=ID:id",
    where: "Google News (indeks Cryptowave)",
    category: "crypto",
    region: "id",
    parse: (xml) => rssToArticles(xml),
  },
  ...REGIONS.flatMap((r) =>
    REGION_TOPICS[r.id].map((t) => ({
      id: "gn-" + r.id + "-" + t.category,
      label: r.label + " · " + (CATEGORIES.find((c) => c.id === t.category)?.label ?? t.category),
      url: gnTopic(t.topic, r.gn),
      where: "Google News (" + r.label + ")",
      category: t.category,
      region: r.id,
      topics: t.topics,
      parse: (xml: string) => rssToArticles(xml),
    }))
  ),
];

// Helper UI: label kategori/wilayah dari id.
export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
export function regionLabel(id: string): string {
  return REGIONS.find((r) => r.id === id)?.label ?? id;
}
