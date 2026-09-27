// AbelionOS service worker — push handler + offline shell minimum.
// ponytail: tanpa Workbox; shell untuk installability + offline, data selalu
// live dari jaringan (bukan SWR app), dan aset ber-hash di-cache untuk
// kunjungan ulang. Naikkan versi cache saat ingin mengosongkannya.
// Rename produk 2026-09-26: naikkan versi cache agar cache lama bertema
// "mintdesk-*" dihapus otomatis di handler activate di bawah.
const SHELL_CACHE = "abelionos-shell-v2";
const ASSET_CACHE = "abelionos-assets-v2";
const KEEP_CACHES = [SHELL_CACHE, ASSET_CACHE];
const SHELL_URLS = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Chunk ber-hash Vite (/assets/*) dan ikon bersifat immutable: cache-first
  // supaya kunjungan ulang (termasuk chunk route lazy) tidak mengunduh ulang.
  // ponytail: entri lama lintas deploy dibiarkan sampai versi ASSET_CACHE
  // dinaikkan; cukup untuk PWA personal, belum perlu precache manifest.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Offline fallback shell untuk navigasi; selain itu network-first tanpa cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/").then((res) => res ?? new Response("Offline", { status: 503 }))
      )
    );
  }
});

// Payload notifikasi dibuat server (pushSendInternal) — metadata saja:
// title, body, url, tag. Tanpa body Gmail, token, atau payload provider.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "AbelionOS", body: "Notifikasi baru." };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "AbelionOS", {
      body: data.body || "",
      tag: data.tag || "abelionos",
      data: { url: data.url || "/dashboard" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      // Payload url bisa relatif (internal, mis. /settings) atau absolut
      // (tautan artikel sumber asli) — normalisasi ke absolut sebelum banding.
      const target = new URL(raw, self.location.origin);
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Fokus tab yang sudah membuka URL target persis — jangan buka tab baru
      // untuk konten yang sama (bug: pembanding pathname vs URL absolut dulu
      // tidak pernah cocok sehingga tiap klik selalu openWindow).
      const same = clients.find((c) => {
        try {
          return new URL(c.url).href === target.href;
        } catch {
          return false;
        }
      });
      if (same && "focus" in same) return same.focus();
      return self.clients.openWindow(target.href);
    })()
  );
});
