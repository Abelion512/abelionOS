// Parser RSS/Atom generik untuk registry sumber berita — metadata saja.
// ponytail: regex pembacaan tag sederhana tanpa dependency XML parser;
// batas ceiling: feed tak-well-formed jatuh ke hasil kosong dengan status
// unavailable eksplisit di caller. Jalur upgrade: parser XML penuh bila ada
// sumber yang benar-benar gagal dibaca parser ini.
import { parseRss, type Article } from "./newsParser";

export function rssToArticles(xml: string): Article[] {
  return parseRss(xml).map((item) => ({
    title: item.title,
    url: item.link,
    category: item.category,
    publishedLabel: item.pubDate,
  }));
}
