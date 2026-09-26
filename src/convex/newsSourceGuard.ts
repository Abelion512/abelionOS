// Guard URL feed sumber berita milik user — metadata-only, https publik saja.
// ponytail: validasi ini menutup vektor utama (SSRF ke loopback/LAN/link-local,
// kredensial in-URL, port non-https). Ceiling: redirect runtime tidak diikuti
// manual di sini; aksi fetch Convex berjalan dari cloud sehingga jangkauan
// jaringan internal terbatas. Jalur upgrade: fetch redirect=manual + resolusi
// DNS pin bila registry membuka sumber arbitrer untuk banyak user.
import { sanitizeText } from "./newsParser";
const BLOCKED_HOSTS = /^(localhost|127\.|0\.|10\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[?::1\]?$|\[?fc|\[?fd)/i;

export function validateFeedUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("URL tidak valid");
  }
  if (url.protocol !== "https:") throw new Error("Hanya https:// yang diperbolehkan");
  if (url.username || url.password) throw new Error("URL dengan kredensial tidak diperbolehkan");
  if (url.port && url.port !== "443") throw new Error("Port non-https tidak diperbolehkan");
  if (BLOCKED_HOSTS.test(url.hostname)) {
    throw new Error("Alamat loopback/LAN tidak diperbolehkan");
  }
  if (url.hostname.split(".").every((p) => /^\d+$/.test(p))) {
    throw new Error("Alamat IP mentah tidak diperbolehkan; gunakan hostname");
  }
  if (raw.length > 500) throw new Error("URL terlalu panjang");
  return url.toString();
}

// Reuse sanitizeText: strip tag + decode entity + collapse whitespace.
export function cleanSourceLabel(raw: string): string {
  return sanitizeText(raw).slice(0, 80);
}
