# AbelionOS

**AbelionOS** adalah dashboard operasional personal untuk Linux Mint. Aplikasi ini menyatukan kondisi runtime companion lokal, workdir yang dipantau, koneksi Google Workspace, serta *Daily Focus* berbasis bukti. Sebagai posisi produk, AbelionOS juga menjadi satu tempat koneksi Google Workspace pemilik: daripada setiap produk mengelola OAuth Google sendiri, koneksi dipusatkan di sini dan produk klien menerima metadata/hasil dengan konfirmasi manusia untuk setiap write (layer koneksi produk terimplementasi — registry capability di [docs/PRODUCT-CONNECTION-DESIGN.md](./docs/PRODUCT-CONNECTION-DESIGN.md)). AbelionOS bukan desktop environment, remote shell, atau agent otonom. Ia adalah lapisan kontrol yang membantu pengguna meninjau konteks, menyiapkan tindakan terbatas, dan mengonfirmasi setiap perubahan berisiko.

> Prinsip operasional: **data deterministik dahulu, rekomendasi lokal hanya atas permintaan, dan manusia selalu memberi konfirmasi sebelum write ke Google Workspace.**

## Status produk

| Area | Implementasi saat ini | Batas penting |
|---|---|---|
| Dashboard | Menampilkan status companion (dari observasi terakhir), status akun Google, dan jumlah proposal pending | Sumber yang tidak tersedia ditandai eksplisit, tidak diganti data contoh |
| PWA | Installable (manifest + service worker shell) dan push notifications | Registrasi SW hanya setelah izin push di-enable dari klik eksplisit |
| News | Berita terkurasi kategori × wilayah (Google News + Cryptowave) dalam kartu editorial + sumber pribadi user | Metadata 5W1H + link-out ke artikel resmi; tanpa rehost; cache bersama TTL 10 menit + polling adaptif per sumber; watcher cron 5 menit metadata-only dengan persetujuan pemilik |
| Daily Focus | Today Checklist dari Google Tasks (read-only, on-demand), status evidence per akun, dan proposal yang menunggu keputusan | Tidak dijalankan terjadwal; penalaran lokal 9router hanya relevan setelah companion terpasang |
| Google Workspace | Read Calendar/Gmail, create/delete Calendar yang dimiliki, create Google Tasks, dan pindahkan Gmail ke Trash | Tidak ada Gmail draft atau send; tindakan harus dipreview dan dikonfirmasi manusia |
| Linux companion | Companion Bun (desain final: polling outbound + pairing, lihat [docs/COMPANION-PAIRING-DESIGN.md](./docs/COMPANION-PAIRING-DESIGN.md)) | Implementasi menunggu persetujuan capability pemilik; tanpa companion aktif, Dashboard menampilkan status "Belum ada observasi" yang eksplisit |
| Storage | Metadata workdir `/media/abelion/Isaf/ican/project` ditampilkan lewat observasi companion | Bukan file manager cloud; browser tidak memiliki akses filesystem lokal secara langsung |
| Activity | Audit events (metadata tindakan) dengan verifikasi rantai hash sha256 tamper-evident | Bukan log collector umum atau sistem SIEM |
| Product connection | Produk terdaftar (mis. abelink) memanggil `POST /api/products/v1/read` (Calendar read) dan `POST /api/products/v1/proposals` (mengajukan write) di convex.site dengan secret bearer | Allowlist deny-by-default (registry 4 capability: 2 read + 2 proposal), rate limit per operasi, tiap request ter-audit; proposal produk berlabel `via <slug>` dan tetap preview + confirm manusia |

## Arsitektur

AbelionOS berjalan di Freebuff dengan React 19, TypeScript, Tailwind CSS 4, Wouter, Vite, dan **Convex** sebagai backend/database (Bun sebagai package manager). Companion tetap **Bun** di Linux dan sengaja dipisahkan agar akses ke 9router loopback serta filesystem tidak ikut berpindah ke deployment web.

```text
Browser (desktop atau mobile)
        │ Convex Auth (session) + reactive queries
        ▼
AbelionOS web app (Vite + React)
        │
        ├─ Convex: googleAccounts (multi-account, token AES-256-GCM)
        ├─ Convex: googleActions (proposal preview + confirm)
        ├─ Convex: auditEvents / notifications (metadata-only)
        └─ Convex: news registry (fetch on-demand, metadata-only)

Companion Bun di Linux (berikutnya)
        │ polling outbound + device secret
        ▼
Convex internal endpoints — observasi read-only
```

Browser tidak perlu dapat menjangkau Linux secara langsung. Companion (rebuild berikutnya) mempertahankan koneksi outbound yang terautentikasi dan hanya dapat menjalankan capability yang telah di-allowlist.

## Daily Focus dan Google Workspace

Saat halaman Daily Focus dibuka, AbelionOS menampilkan status akun Google yang terhubung (evidence siap diambil), **Today Checklist** dari Google Tasks yang diambil on-demand per akun (read-only, metadata task, tanpa persistensi), serta proposal action yang menunggu keputusan. Jika pengguna meminta refinement, companion lokal dapat meneruskan payload yang sudah disanitasi ke 9router dan hanya menerima JSON terstruktur kembali — setelah companion terpasang. Hasil penalaran bukan instruksi yang dieksekusi otomatis.

| Provider | Scope OAuth | Kapabilitas yang digunakan |
|---|---|---|
| Google Calendar | `calendar.calendarlist.readonly`, `calendar.events.readonly`, `calendar.events.owned` | Membaca kalender dan event; membuat atau menghapus hanya event yang dimiliki pengguna dengan guard kepemilikan |
| Gmail | `gmail.metadata`, `gmail.modify` | Mengambil metadata dan excerpt terbatas untuk briefing, lalu memindahkan email yang dipreview ke Trash setelah konfirmasi |
| Google Tasks | `tasks` | Menyiapkan dan membuat task setelah pengguna mengonfirmasi proposal |

Refresh token Google disimpan sebagai ciphertext AES-256-GCM. Flow OAuth memakai PKCE, state bertanda tangan, cookie state berumur pendek, dan callback HTTPS kanonis pada deployment. Memutuskan koneksi Google akan mencoba mencabut token di provider, menghapus koneksi lokal, dan menyimpan audit event. Body Gmail tidak disimpan di database.

## Menggunakan aplikasi

### Masuk pertama kali

Halaman `/auth` terbuka dalam mode **Masuk**. Untuk akun pertama, klik **“Belum punya akun? Daftar di sini.”** lalu daftar dengan email pemilik (`AUTH_OWNER_EMAIL`) dan password minimal 8 karakter; email lain ditolak oleh guard single-user. Password diverifikasi dengan WebCrypto PBKDF2-SHA256 (lihat `src/convex/passwordCrypto.ts`) dan sesi memakai JWT RS256.

Jika tombol sempat menampilkan “Memproses…”, tunggu sampai pesan muncul. Backend dev membatasi 1 detik per fungsi, jadi percobaan pertama setelah backend baru menyala (cold start) bisa gagal dan pesannya meminta mencoba sekali lagi — percobaan kedua berjalan normal.

### Menghubungkan Google Workspace

Flow OAuth: UI Connections memanggil action publik `googleStartAction` via `useAction` (token sesi otomatis, respons `{url}` JSON) lalu browser navigasi penuh ke consent Google. Callback di `https://charming-firefly-655.convex.site/api/google/callback` menukar code + memverifikasi state, lalu redirect ke `${OAUTH_APP_URL}/connections?status=connected|error&email=…`.

Jika Google menampilkan `redirect_uri_mismatch`, pastikan redirect URI yang terdaftar di Google Cloud sama persis dengan callback HTTP action deployment Convex (bukan domain aplikasi — hosting statis aplikasi tidak mem-proxy `/api/*`):

```text
https://charming-firefly-655.convex.site/api/google/callback
```

Authorized JavaScript origin tetap domain aplikasi (`https://abelionos.freebuff.app`). Setelah consent, callback me-redirect kembali ke origin aplikasi lewat env `OAUTH_APP_URL`.

Setelah kembali ke AbelionOS, Dashboard dan Daily Focus akan menampilkan status koneksi serta scopes yang benar-benar diberikan. Putuskan koneksi dari menu yang sama apabila akses tidak lagi diperlukan.

### Memberi web akses ke Linux: deploy vs self-host + tunnel

| Pendekatan | Cara kerja | Cocok untuk |
|---|---|---|
| **Deploy (dianjurkan, arsitektur saat ini)** | Web di Freebuff + Convex cloud; companion Bun di Linux melakukan **polling outbound** ke Convex (device secret hashed server-side, capability allowlist). Tidak ada inbound port, tidak ada tunnel. 9router/reasoning lokal tetap dipanggil companion dari loopback. | Dashboard selalu online, push berita berjalan dari cloud, akses dari HP jalan kapan pun, blast radius kecil (companion hanya observasi ber-allowlist). |
| **Self-host + tunnel** | Seluruh AbelionOS dijalankan di laptop Linux lalu diekspos via Cloudflare Tunnel/Tailscale Funnel. Data penuh di rumah dan backend bisa memanggil 9router loopback langsung. | Kalau laptop harus 24/7 menyala, Anda siap merawat TLS/uptime/update sendiri, dan tidak ingin metadata apa pun di cloud. |

Rekomendasi: pertahankan **deploy + companion polling outbound** — tunnel tidak diperlukan untuk arsitektur yang didokumentasikan di sini, karena satu-satunya data Linux yang diangkat (metrics, workdir metadata, audit) dikirim companion ke Convex secara outbound dan ter-filter allowlist. Tunnel hanya relevan bila Anda ingin dashboard-nya sendiri di-serve dari rumah.

### Memasang Linux companion

**Belum tersedia.** Companion Bun belum diimplementasi pada rebuild Convex ini;
desain pairing lengkap (Ed25519, pairing code 8 karakter, device secret tidak
pernah lewat browser, polling outbound, satu device aktif per tipe) sudah final
di [docs/COMPANION-PAIRING-DESIGN.md](./docs/COMPANION-PAIRING-DESIGN.md) dan
menunggu persetujuan capability pemilik yang tercatat di todo.md. Sampai
implementasi disetujui, Dashboard/Storage menampilkan status observasi kosong
yang eksplisit — bukan data contoh.

### Menjalankan Daily Focus

Daily Focus dapat digunakan dari desktop maupun ponsel. Checklist, evidence, dan review Google action tetap dapat dipakai; pairing ke companion lokal hanya relevan setelah companion terpasang di laptop Linux. Setiap proposal action memiliki masa berlaku (24 jam), preview payload, riwayat audit, serta tombol konfirmasi atau penolakan. Proposal yang lewat masa berlaku ditandai `expired` oleh retensi — tidak dihitung sebagai pending. Calendar delete dibatasi oleh ownership guard. Gmail cleanup memindahkan pesan ke Trash dan bukan menghapus permanen.

## Pengembangan lokal

Panduan sinkronisasi yang aman dari checkpoint AbelionOS ke clone Linux lokal tersedia di [docs/LOCAL-LINUX-SYNC.md](./docs/LOCAL-LINUX-SYNC.md). Panduan tersebut membedakan pekerjaan UI lokal dari environment production serta companion Bun yang tetap berjalan terpisah.

## Notifikasi kustom

AbelionOS menyediakan **inbox notifikasi user-scoped** yang dapat dibuka dari kontrol bell di shell aplikasi. Inbox hanya mencatat event operasional nyata dan tidak diisi dengan data contoh. Event saat ini berasal dari proposal Daily Focus yang siap atau gagal, action Daily Focus yang selesai setelah konfirmasi, companion Linux yang kembali online atau terobservasi offline, koneksi atau disconnect Google Workspace, serta **berita baru dari news watcher**.

**Web Push (VAPID)** tersedia sebagai lapisan kedua: izin browser diminta hanya dari klik eksplisit di **Settings → Push notifications**, service worker baru diregistrasi setelah izin granted, dan subscription disimpan user-scoped (endpoint = bearer secret, tidak pernah masuk log/audit). Notifikasi berjalan ketika tab tertutup dan payloadnya metadata-only: judul, provenance sumber, dan tautan — tanpa body email, token, atau payload provider. Tombol **Kirim notifikasi uji** di Settings mengirim notifikasi end-to-end untuk memverifikasi rantai lengkap.

**News watcher** adalah satu-satunya pekerjaan berkala di AbelionOS (cron Convex 5 menit) yang disetujui eksplisit pemilik dan tercatat di todo.md: mengambil registry berita metadata-only, dedupe per-URL (`newsSeen`), lalu mengirim inbox + push hanya untuk artikel yang benar-benar baru — dengan baseline run pertama tanpa push dan batas 12 push per run agar tidak spam. Tidak ada AI terjadwal dan tidak ada write Google dari watcher.

Pengaturan berada di **Settings**. Pengguna dapat mematikan push per perangkat; tanpa push, inbox in-app tetap menjadi fallback utama.

| Data yang masuk notifikasi | Data yang dilarang masuk notifikasi |
|---|---|
| Status operasional, jenis resource, dan hasil action | Isi Gmail, refresh token, device secret, payload provider, prompt mentah, atau output AI mentah |

Menandai item sebagai read hanya mengubah state inbox milik pengguna yang sedang sign in. Preference notifikasi tidak pernah memberi izin baru untuk melakukan write ke Google Workspace.

### Prasyarat

| Komponen | Versi atau penggunaan |
|---|---|
| Node.js | 22 atau kompatibel dengan toolchain proyek |
| Bun | Package manager untuk web application |
| Convex | Backend + database terkelola (`bun convex dev --once` untuk codegen) |
| Convex Auth | `AUTH_OWNER_EMAIL` + pasangan `JWT_PRIVATE_KEY` dan `JWKS` di environment backend (buat dengan `npx @convex-dev/auth`, atau set manual mengikuti format CLI tersebut). Tanpa keduanya akun bisa tercipta tetapi token sesi gagal diterbitkan sehingga login tampak "tidak terjadi apa-apa". `src/convex/auth.config.ts` memakai `CONVEX_SITE_URL` untuk verifikasi JWT. |
| OAuth Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `OAUTH_STATE_SECRET`, `TOKEN_ENCRYPTION_KEY` di Settings → Environment |
| Push (VAPID) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generate: `bunx web-push generate-vapid-keys`) |

```bash
git clone <repository-url>
cd abelionos
bun install
bun convex dev --once   # codegen functions
bun run test            # Vitest (bukan `bun test`, yang memakai runner bawaan Bun)
bunx tsc -b --noEmit
bun run build
```

Variabel environment dikelola oleh platform. Jangan membuat atau meng-commit `.env` berisi credential.

Untuk pengembangan lokal, daftarkan URL callback dev Anda di Authorized redirect URIs Google Cloud, lalu set `GOOGLE_OAUTH_REDIRECT_URI` pada environment lokal, misalnya:

```text
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/api/google/callback
```

Tanpa env tersebut, fallback default memakai `http://localhost:5173/api/google/callback`; produksi wajib mengisi URI callback kanoniknya sendiri. Jika mengubah schema, lakukan urutan berikut:

```bash
bunx convex dev --once
# Baca schema/function yang dihasilkan; jangan edit src/convex/_generated manual.
bun run test
bunx tsc -b --noEmit
bun run build
```

## Validasi wajib

Perubahan dianggap siap checkpoint hanya bila test, typecheck, build, dan verifikasi visual yang relevan lulus. Komponen interaktif harus memiliki regression test yang mencakup state loading, unavailable/error, serta aksi yang mengubah state. Perubahan UI juga diverifikasi pada desktop dan viewport mobile 375px.

```bash
bun run test
bunx tsc -b --noEmit
bun run build
```

`bun run test` memakai Vitest sesuai script proyek: environment jsdom untuk test komponen (`AuthPage.test.tsx`) dan env `TOKEN_ENCRYPTION_KEY` untuk test kripto. Menjalankan `bun test` (runner bawaan Bun) akan melewati `vitest.config.ts` sehingga test komponen gagal — pakai script proyek.

## Workflow GitHub

Gunakan alur ini agar perubahan lokal dan perubahan yang dikerjakan agent tidak saling menimpa:

1. Buat perubahan lokal pada branch yang disepakati.
2. Jalankan test, typecheck, dan build secara lokal.
3. Commit perubahan dengan pesan yang menjelaskan intent dan risiko.
4. Push ke GitHub hanya setelah persetujuan pemilik repository.
5. Minta agent menyinkronkan checkpoint sebelum pekerjaan lanjutan atau verifikasi.

Jangan gunakan `git reset --hard` untuk memulihkan aplikasi yang terhubung ke deployment. Gunakan mekanisme rollback checkpoint agar code, dependency, dan metadata proyek kembali konsisten.

## Model keamanan data Linux

Pertanyaan yang sah: "aman kah Linux saya terbaca kalau deploy, bagaimana kalau hosting-nya nakal?" Jawaban jujurnya berlapis:

| Lapisan | Fakta | Sisa risiko |
|---|---|---|
| Arah koneksi | Companion **polling outbound** dari laptop Anda ke Convex; tidak ada port inbound, tidak ada tunnel yang bisa diserang dari luar | — |
| Capability | Companion hanya menjalankan allowlist: health, metrics, observasi proses, workdir metadata, audit, terminate ber-konfirmasi (desain allowlist; implementasi menunggu persetujuan capability — tanpa shell arbitrer, tanpa filesystem bebas) | Metadata yang ter-allowlist memang dilihat hosting |
| Data di cloud | Hanya metadata operasional ter-filter (bukan isi file); device secret **hashed** server-side (bocor ≠ bisa dipakai login); refresh token Google **AES-256-GCM** dengan kunci yang hanya Anda punya | Hosting bisa MELIHAT metadata ter-filter — tidak bisa isi file, token plaintext, atau body email |
| Integritas | Audit hash chain sha256 per event membuat manipulasi riwayat **terdeteksi**, meski tidak mencegah | — |
| Distrust penuh | Bila Anda tidak percaya hosting sama sekali: self-host + tunnel (README §deploy vs self-host) — trade-off: laptop 24/7, TLS/uptime dirawat sendiri | Kemudahan akses mobile berkurang |

Prinsipnya: **asumsikan hosting bisa membaca apa pun yang tersimpan di cloudda — karena itu yang tersimpan dibuat seminimal mungkin**, dan kunci dekripsi tidak pernah meninggalkan environment Anda.

## Versioning dan automation

Rilis mengikuti **semantic versioning otomatis**: merge ke `main` memicu workflow Release yang memverifikasi test/typecheck, menurunkan versi berikutnya dari **conventional commits** sejak tag terakhir (`feat:` → minor, `fix:`/`chore:`/`refactor:`/`perf:` → patch), menyisipkan entri CHANGELOG, mendorong tag `v<version>`, dan menerbitkan GitHub Release — tanpa action pihak ketiga. CI (`ci.yml`) menjalankan typecheck + test pada setiap PR. Konvensi commit: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` dengan scope opsional.

## Guardrail keamanan

AbelionOS dirancang untuk mengurangi blast radius, bukan memberikan otomasi tanpa batas. Ia tidak boleh menjalankan agent-to-agent workflow di luar Daily Focus, melakukan Google write tanpa konfirmasi manusia, mengakses filesystem browser secara arbitrer, menampilkan token, atau mengirim body Gmail ke database. Detail implementasi dan aturan kontribusi wajib ada di [AGENTS.md](./AGENTS.md).

## Referensi desain

UI AbelionOS mengikuti prinsip minimising chrome dan disclosure bertahap: navigasi inti di sidebar, konten halaman ringkas dengan state eksplisit untuk data yang tidak tersedia. Rujukan desain utamanya adalah [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) dan pola komponen [shadcn/ui](https://ui.shadcn.com/). Taste Skill dipasang sebagai helper audit anti-template, tetapi diterapkan secara kontekstual karena AbelionOS adalah dashboard operasional, bukan landing page. Guardrail lengkap tersedia di [docs/ANTI-SLOP-GUARDRAILS.md](./docs/ANTI-SLOP-GUARDRAILS.md).
