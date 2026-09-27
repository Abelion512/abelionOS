# skill.md — Pembelajaran Sesi AbelionOS (Freebuff, 2026-09-25)

Skill ini didistilasi dari sesi rebuild AbelionOS di Freebuff: web app React 19 + Vite +
Tailwind 4 + Wouter + Convex (backend/database + auth), single-user, dengan companion
Bun di Linux sebagai rencana lanjutan. Semua pola di bawah sudah teruji lewat test,
build, dan preview — bukan teori.

## 1. Kontrak produk yang mengikat implementasi
- Evidence-first + human confirmation: semua write Google lewat proposal `ready →
  confirmed → executed/error` dengan preview, expiry 24 jam, dan audit metadata-only.
- Kriptografi lokal, bukan blockchain: hash chain sha256 per user (prevHash) untuk
  audit; AES-256-GCM untuk refresh token; PKCE + state JWT 10 menit untuk OAuth.
- No scheduled AI: cron/background job hanya boleh ada dengan persetujuan eksplisit
  pemilik yang tercatat di todo.md (contoh yang lolos: news watcher 5 menit).
- Single-user fail-closed: `AUTH_OWNER_EMAIL` kosong = tidak ada yang bisa mendaftar.
- Minimum retention: tanpa body Gmail, tanpa token plaintext, tanpa raw prompt di DB.

## 2. Idiom Convex yang dipelajari dengan cara yang sulit
- File `"use node"` HANYA boleh berisi actions. Mutasi/query langganan push sempat
  error push: `Only actions can be defined in Node.js`. Solusi: pisah ke file non-node
  (`pushSubscriptions.ts` untuk mutasi, `push.ts` untuk internal action pengirim).
- Side effect setelah konfirmasi manusia: jangan eksekusi inline di mutation. Pola:
  mutation `decide()` → patch status `confirmed` → `ctx.scheduler.runAfter(0,
  internal.x.y, args)`. Scheduler baru jalan setelah commit, jadi eksekusi tidak
  pernah mendahului keputusan tersimpan.
- Siklus inferensi tipe (TS7022/TS7023 berantai) di internal action diputus dengan
  anotasi return eksplisit pada handler.
- `internal.xxx` tidak ada di typegen sebelum file terbaca codegen — jalankan
  `bun convex dev --once` dulu, jangan pernah edit `src/convex/_generated`.
- Cron didefinisikan di `src/convex/crons.ts` (`crons.interval(...)`), karena
  folder backend = `src/convex/`.
- `require()` tidak ada di bundle Convex — selalu ESM import statis di atas file.
- **Backend anonymous/local TIDAK memuat `.env.local` ke `process.env`** — gejala: login/daftar gagal diam-diam, guard `AUTH_OWNER_EMAIL` menolak semua. Verifikasi root cause tanpa UI: POST ke `<origin>/api/action` dengan `auth:signIn` (bentuk arg: `{provider, params:{email,password,flow}}`) dan baca error message-nya. Fix: `bunx convex env set KEY value` (env store backend, persisten per project dir); VAPID mengalami hal yang sama. Di cloud Convex, env dikelola dashboard/CLI cloud.
- **@convex-dev/auth butuh tiga hal sekaligus; kurang satu = login mati diam-diam.**
  1. `JWT_PRIVATE_KEY` + `JWKS` di env backend (format = keluaran CLI resmi:
     PKCS8 PEM dengan newline diganti spasi, JWKS `{"keys":[{"use":"sig",...jwk}]}`).
     Tanpa itu akun SUDAH tercipta di DB tetapi `generateToken` melempar → klien
     tidak pernah melihat sukses ("tidak terjadi apa-apa").
  2. `auth.config.ts` (`{domain: CONVEX_SITE_URL, applicationID: "convex"}`); tanpa
     itu Convex tidak memverifikasi JWT dan sesi selalu terlihat anonim.
  3. `auth.addHttpRoutes(http)` di `http.ts` (endpoint JWKS/`/.well-known`).
  Diagnosa urutan: probe `auth:signIn` → error berubah tiap layer diperbaiki; bukti
  akhir = query dengan header `Authorization: Bearer <token>` mengembalikan data.
- **Batas 1 detik fungsi di backend dev + cold start = timeout pada panggilan PERTAMA.**
  Hashing password bawaan (`Scrypt` pure-JS dari lucia) ~200 ms saat isolate panas
  tetapi >1 s saat dingin, sehingga pendaftaran pertama gagal timeout. Hashing
  kripto di Convex lebih baik lewat `crypto.subtle` (tersedia di runtime default;
  PBKDF2-SHA256 210k iterasi ≈ 15–30 ms) via opsi `crypto: {hashSecret, verifySecret}`
  milik provider `Password` — platform native, tanpa dependency baru. Ukur dulu
  dengan action diagnostik sementara (`crypto.subtle` ada? berapa ms?) sebelum menebak.
- **HTTP actions Convex hidup di SITE port, bukan client port.** Di backend lokal,
  `/api/query|mutation|action|sync` = `127.0.0.1:3210`, sedangkan route HTTP
  (`/api/google/*`, `/.well-known/jwks.json`) = `127.0.0.1:3211` (`CONVEX_SITE_URL`).
  Proxy Vite karenanya butuh dua rule dengan urutan spesifik dulu (`/api/google`
  sebelum `/api`) — kalau tidak, tombol OAuth 404 padahal route-nya ada.
- Verifikasi cepat fungsi live tanpa UI: `bunx convex run file:function '{"arg":1}'`
  (admin, dari project root). HTTP `/api/query` mentah dari shell sering diam;
  protokolnya bukan untuk curl manual.

## 3. Topologi deployment Freebuff + Convex (pelajaran terbesar sesi)
- Sandbox `.env.local` berisi `VITE_CONVEX_URL=http://127.0.0.1:3210` (backend lokal).
  Backend lokal hanya hidup saat `convex dev` berjalan — dan **browser pengguna di
  URL preview publik tidak akan pernah bisa menjangkau `127.0.0.1` sandbox**.
- Gejala: log console penuh `WebSocket ... ws://127.0.0.1:3210/api/.../sync failed
  (1006)` + UI login "memproses terus".
- Solusi tiga lapis:
  1. `vite.config.ts` server.proxy `"/api"` → `http://127.0.0.1:3210` dengan
     `ws: true` (HTTP + WebSocket Convex lewat origin preview).
  2. Provider memilih alamat backend: env bukan-local ATAU origin lokal → pakai env;
     selain itu → `window.location.origin` (biar lewat proxy).
  3. `scripts/dev.sh` menyalakan `bunx convex dev` (backend lokal) + `vite` bersamaan;
     `package.json` `dev` memanggil script ini sehingga preview self-contained.
- Produksi tetap pola standar: bake `VITE_CONVEX_URL` cloud saat build.
- Verifikasi proxy end-to-end dari LUAR: `curl -X POST
  https://<preview>/api/query -d '{"path":"file:fn","args":{},"format":"json"}'`.
  Respons berisi header Convex = request menembus sampai backend.
- `freebuff-preview restart` memiliki port 8080 dan membebaskannya sendiri; jangan
  pernah start dev server manual, dan hati-hati `pkill -f convex dev` — pattern bisa
  match shell command itu sendiri (command membunuh dirinya, exit -1).

## 4. PWA + Web Push tanpa framework
- Jangan pakai `vite-plugin-pwa` kalau butuh SW kustom: mode generateSW MENIMPA
  `public/sw.js` dan push handler hilang diam-diam. Solusi minimum: manifest.json +
  `public/sw.js` statis (cache shell + handler `push` + `notificationclick`) +
  registrasi manual.
- Urutan yang benar (kontrak notifikasi): izin diminta HANYA dari klik eksplisit →
  registrasi service worker SETELAH izin granted → subscribe push → simpan ke DB.
  Auto-register SW saat load melanggar kontrak dan memicu prompt tak beralasan.
- `Uint8Array` untuk `applicationServerKey` harus menampung `ArrayBuffer` konkret
  (bukan `ArrayBufferLike`) agar lolos tipe DOM lib baru.
- VAPID: `bunx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY`/`PRIVATE_KEY` di
  Settings → Environment. Public key boleh ke browser via query; **endpoint
  subscription = bearer secret** — user-scoped, tidak pernah masuk log/audit.
- Pengirim: `web-push` di internal action; cleanup otomatis saat 404/410.
- Ikon PWA: buat SVG mint-leaf → raster via `bunx @resvg/resvg-js-cli --fit-width
  <px> in.svg out.png` (flag `--fit-width`, bukan `-w`).

## 5. Registry berita modular + watcher
- Kontrak satu sumber: `{ id, label, url, where, category, region, topics?, parse }`.
  Tambah sumber = tambah satu objek. Kategori × wilayah adalah data, bukan hardcode.
- Kurasi: kanal topik Google News per wilayah (TECHNOLOGY/WORLD/BUSINESS) — kanal
  WORLD/BUSINESS WAJIB diberi topic-filter agar benar-benar geopolitik/finansial.
  Cryptowave sengaja tanpa filter. Verifikasi feed (HTTP 200 + hitung `<item>`) WAJIB
  sebelum masuk registry.
- Sumber milik user: guard anti-SSRF (https publik saja; tolak loopback/LAN/link-local,
  IP mentah, kredensial in-URL, port non-443) + kategori/wilayah opsional = wildcard
  (tampil di semua filter). Reuse `sanitizeText`, jangan duplikasi sanitasi (test
  langsung menangkapnya).
- Watcher cron: pisahkan keputusan ke logika murni (`watcherDecide`) agar bisa
  diuji: **baseline (seen kosong) tidak pernah push TETAPI tetap markSeen** — kalau
  tidak, baseline berulang selamanya. Delta berikutnya hanya artikel baru; dedupe
  lintas sumber per URL; batas push per run; prune seen (2000).

## 6. Disiplin desain & copy (Mint Atelier)
- Kartu berita editorial: kicker provenance (`where · who`) pakai `.meta-label`,
  judul DM Sans bold, CTA "Baca di sumber asli"; grid asimetris sm/lg, opaque
  parchment, satu accent mint — referensi pola kartu 21st.dev diadaptasi, bukan
  disalin gaya landing-nya.
- Copy bertingkat: level "Sedang" (penjelas sekali-lihat) dihapus sesuai arahan
  pemilik — status faktual saja. Setiap perubahan visual menulis satu kalimat
  *design read*.
- Meta yang benar saat ini: `mobile-web-app-capable` (bukan `apple-mobile-web-app-
  capable` yang deprecated) + `theme-color` + manifest + apple-touch-icon.

## 7. Ritme validasi yang terbukti
1. Ubah schema → `bun convex dev --once` (baca output index/migration-nya).
2. Logika keputusan/keamanan diekstrak pure lalu ditegaskan di test (Vitest) —
   termasuk trust boundary: SSRF guard, scope allowlist, ownership guard, dedupe.
3. `bun tsc -b --noEmit` — parse error pertama biasanya akar masalah sebenarnya.
4. `bun run build` — cek `dist/sw.js` benar-benar versi kustom.
5. `freebuff-preview restart` → probe manifest/sw/ikon (200) → probe `/api/query`
   lewat URL publik → baris terakhir ini yang membuktikan browser pengguna bisa
   bicara dengan backend.
- Screenshot bukan pengganti test; log console pengguna (decay WebSocket 1006,
  meta deprecated) adalah signal defect yang sama validnya dengan test merah.

## 8. Antipolan yang nyata terjadi di sesi ini (jangan diulang)
- Mutasi di file `"use node"` → push Convex gagal total.
- `redirectTo` pada `signIn` password tanpa email verification → UI "memproses
  terus"; navigasi manual setelah promise lebih andal.
- `require()`/dynamic import API berbeda di bundle Convex.
- Plugin PWA menimpa SW kustom tanpa peringatan.
- Duplikasi logika token refresh / sanitasi — selalu ekstrak + reuse (Ponytail).
- Memakai `bunx convex run` setelah env berganti deployment perlu `--once`
  codegen dulu; `_generated` tidak boleh dipatch tangan.
