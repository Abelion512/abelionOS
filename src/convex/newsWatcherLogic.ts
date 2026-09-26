// Logika murni news watcher — dipisah agar dapat diuji tanpa runtime Convex.
// Baseline: watcher belum pernah jalan (seen kosong) → semua dianggap lama,
// tanpa push; run berikutnya hanya meneruskan artikel yang benar-benar baru.
import type { Article } from "./newsParser";

export type WatcherSourceResult = { where: string; articles: Article[] };
export type NewItem = { url: string; what: string; where: string; who: string; when: string };

function computeUnseen(results: WatcherSourceResult[], seenUrls: string[]): NewItem[] {
  const seen = new Set(seenUrls);
  const fresh: NewItem[] = [];
  const seenThisRun = new Set<string>();
  for (const { where, articles } of results) {
    for (const a of articles) {
      if (seen.has(a.url) || seenThisRun.has(a.url)) continue;
      seenThisRun.add(a.url);
      fresh.push({
        url: a.url,
        what: a.title,
        where,
        who: a.category || "sumber",
        when: a.publishedLabel || "",
      });
    }
  }
  return fresh;
}

// Keputusan satu run watcher: baseline tidak pernah push, tetapi semua URL
// tetap ditandai seen agar baseline hanya terjadi sekali.
export function watcherDecide(
  results: WatcherSourceResult[],
  seenUrls: string[]
): { baseline: boolean; fresh: NewItem[]; markUrls: string[] } {
  const baseline = seenUrls.length === 0;
  const unseen = computeUnseen(results, seenUrls);
  return {
    baseline,
    fresh: baseline ? [] : unseen,
    markUrls: unseen.map((u) => u.url),
  };
}

// Notifikasi berita lama memakai body "provenance · url" (URL di dalam teks).
// Pisahkan keduanya supaya panel bisa merender anchor; null berarti body tidak
// membawa URL sehingga tidak perlu dimigrasi.
export function splitLegacyNewsBody(body: string): { body: string; url: string } | null {
  const m = body.match(/^(.*\S)\s+·\s+(https:\/\/\S+)$/);
  if (!m) return null;
  return { body: m[1], url: m[2] };
}

// Payload push metadata-only: judul + provenance, tanpa konten artikel.
export function buildPushPayload(item: NewItem): {
  title: string;
  body: string;
  url: string;
  tag: string;
} {
  return {
    title: item.what.slice(0, 120),
    body: (item.where + " · " + item.who).slice(0, 200),
    url: item.url,
    tag: "news",
  };
}
