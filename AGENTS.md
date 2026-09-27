# AGENTS.md

Dokumen ini adalah kontrak implementasi untuk setiap agent atau kontributor yang memodifikasi AbelionOS. Jika instruksi ad hoc bertentangan dengan guardrail di bawah, hentikan dan minta klarifikasi sebelum memperluas capability.

## Tujuan dan batas produk

AbelionOS adalah **Daily Focus Assistant**, dashboard operasional Linux Mint, dan hub koneksi Google Workspace pemilik: produk lain milik pemilik menyambung ke Google Workspace melalui AbelionOS, bukan mengelola koneksi Google sendiri-sendiri (keputusan pemilik 2026-09-26, tercatat di todo.md). Aplikasi membantu pengguna melihat evidence Calendar, Gmail, companion runtime, proses terkontrol, Storage workdir, serta audit. Kredensial Google tidak pernah keluar dari backend; produk klien hanya menerima metadata/hasil sesuai allowlist capability per produk, dan semua Google write dari klien mana pun tetap membutuhkan preview + konfirmasi manusia. Ia tidak boleh berubah menjadi remote shell, file browser umum, sistem monitoring yang memanen seluruh data perangkat, agent otonom lintas layanan, atau broker yang menyerahkan token Google ke klien.

| Prinsip | Aturan yang dapat diverifikasi |
|---|---|
| Push privacy | Endpoint push subscription = bearer secret: user-scoped, tidak masuk log/audit/response UI; payload push metadata-only |
| Evidence-first | Data sumber ditampilkan atau direferensikan sebelum rekomendasi; sumber unavailable diberi label eksplisit |
| Human confirmation | Semua Google write membutuhkan preview proposal dan konfirmasi eksplisit pengguna |
| Local reasoning only | 9router hanya diakses oleh companion melalui loopback `127.0.0.1`; web app tidak menerima token 9router |
| Minimum data retention | Jangan persist body Gmail, bearer token, device secret, atau raw prompt AI dalam database atau audit event |
| Capability allowlist | Companion hanya boleh menjalankan health, metrics, process observation, audit, terminate yang telah di-allowlist, workdir observation, dan Daily Focus reasoning |
| No scheduled AI | Jangan menambahkan cron, background AI, atau notification scheduler tanpa persetujuan eksplisit dan workflow periodik yang sesuai. Pengecualian tercatat: news watcher cron Convex 5 menit (metadata-only, tanpa AI, tanpa write Google) disetujui pemilik 2026-09-25 di todo.md |
| Hub tunggal Google Workspace | Produk klien terdaftar dengan secret hashed server-side + allowlist per produk; kredensial Google tidak pernah dikirim ke klien; write dari klien tetap proposal + confirm; tiap permintaan klien masuk audit |

## Arsitektur dan package manager

Web app berjalan di Freebuff dengan **Bun** sebagai package manager dan stack: React 19, TypeScript, Tailwind 4, Wouter, Vite, dan **Convex** sebagai backend/database (rebuild 2026 dari stack Express+MySQL+Drizzle). **Companion hybrid tetap Bun di Linux** dan tidak ikut dipindah ke deployment web.

| Lokasi | Peran | Aturan perubahan |
|---|---|---|
| `src/` | UI React + Wouter | Gunakan component primitives yang ada dan buat UI ringkas, aksesibel, serta mobile-ready |
| `src/convex/` | Backend Convex | Semua query/mutation/action user-scoped via `requireUserId`; file `"use node"` hanya berisi actions |
| `src/convex/schema.ts` | Model data | Perubahan schema mengikuti codegen `bun convex dev --once`; jangan edit `src/convex/_generated` manual |
| `src/convex/googleOAuthActions.ts` | OAuth Google | Jangan melonggarkan scope OAUTH_SCOPES atau mengubah state JWT + PKCE tanpa review security |
| `src/convex/googleActions.ts` | Proposal Google | Pertahankan ownership guard, preview, expiry, confirmation, dan audit |
| `src/convex/news.ts` | Registry sumber berita | Metadata-only, fetch on-demand, tanpa cron; sumber baru masuk registry dengan source-status eksplisit |
| `src/convex/agents.ts` | Observasi agent | Read-only: metadata companion saja, tanpa kontrol eksekusi |
| `src/components/AppShell.tsx` | Navigasi shell | Sidebar hanya Dashboard, Daily Focus, News, Storage, Activity; Connections dan Settings tetap di profil menu |
| `companion/` | Companion Bun (repositori terpisah bila dipisah) | Polling outbound, device secret hashed server-side, capability allowlist |

## Google Workspace policy

Scope yang dibolehkan saat ini adalah `calendar.calendarlist.readonly`, `calendar.events.readonly`, `calendar.events.owned`, `gmail.metadata`, `gmail.modify`, `tasks`, dan `userinfo.email`. Jangan menambah scope tanpa menyatakan capability, alasan proporsionalitas, data yang diproses, retention, dan dampaknya pada human confirmation.

Justifikasi scope tambahan `userinfo.email` (multi-account): capability mengidentifikasi akun Google mana yang memberi consent pada tiap koneksi; proporsionalitas karena tanpa itu koneksi multi-akun tidak dapat dipisahkan dengan aman; data yang diproses hanya alamat email akun; retention disimpan sebagai metadata koneksi user-scoped; dampak human confirmation tidak berubah karena tiap proposal tetap preview + confirm per akun.

Kebijakan multi-account Google Workspace: satu user boleh menghubungkan lebih dari satu akun Google. Setiap koneksi disimpan terenkripsi dan terpisah per akun (email sebagai identifier), memiliki status, scope, dan disconnect/revoke sendiri. Evidence briefing, proposal, dan audit event wajib melabeli akun sumbernya; kegagalan satu akun tidak boleh memblokir akun lain. Isi Gmail dari akun mana pun tetap tidak boleh dipersistenkan.

Kebijakan berita: AbelionOS hanya merangkum poin 5W1H (what/when/who/where/why/how) dari metadata artikel, dengan tautan ke artikel asli sebagai satu-satunya cara membaca konten. Tidak ada rehost, tidak ada full-text, dan tidak menampilkan isi berita di dashboard. Personalisasi terbatas pada pemilihan topik/sumber.

Kebijakan checklist: Today Checklist membaca Google Tasks (read-only, on-demand, metadata task) sebagai evidence checklist, tanpa persistensi konten task. Scope baru hanya boleh ditambah setelah justifikasi capability/proporsionalitas/retention/dampak human confirmation tersimpan di todo.md.

Kebijakan kriptografi: integritas riwayat audit dijaga dengan hash chain sha256 (tiap event menyimpan prevHash; verify menyusun ulang rantai). Blockchain penuh (jaringan P2P, konsensus, token) tidak digunakan karena AbelionOS single-user dan tidak ada manfaatnya dibanding hash chain lokal.

| Operasi | Diperbolehkan | Guard wajib |
|---|---:|---|
| Baca Calendar | Ya | Hanya untuk evidence briefing |
| Baca metadata/excerpt Gmail | Ya | Excerpt terbatas, tidak dipersistenkan |
| Membuat Calendar event | Ya | Proposal schema-valid, preview, confirm |
| Menghapus Calendar event | Ya | Ownership guard, preview, confirm |
| Membuat Google Task | Ya | Proposal, preview, confirm |
| Memindahkan Gmail ke Trash | Ya | Daftar pesan preview, confirm, bukan permanent delete |
| Gmail draft/send | Tidak | Tidak ada `gmail.compose`; jangan implementasikan endpoint atau UI tersembunyi |
| Menulis data Google secara otomatis | Tidak | Tidak ada agent-to-agent action atau bulk execute |

Google refresh token dienkripsi AES-256-GCM. OAuth memakai PKCE dan signed, short-lived state. Credential tidak boleh masuk ke logs, fixtures, database audit, test snapshot, atau response UI.

## Companion policy

Companion berkomunikasi melalui polling outbound dan otentikasi device secret yang di-hash server-side. Pairing browser-ke-loopback hanya boleh menerima origin AbelionOS dan berjalan di `127.0.0.1:20129`. Jangan membuka endpoint pairing ke LAN, jangan menerima host selain loopback, dan jangan memindahkan device secret ke localStorage atau URL.

Workdir canonical adalah:

```text
/media/abelion/Isaf/ican/project
```

Satu device aktif per tipe device. Heartbeat credential valid mengarsipkan credential lama bertipe sama. Jangan menghapus guard ini atau menampilkan credential recovery yang telah diarsipkan sebagai perangkat aktif.

## Kebijakan single-user

AbelionOS adalah aplikasi personal satu pemilik: satu user AbelionOS, satu device type aktif per tipe. Pendaftaran akun baru dikunci fail-closed via `AUTH_OWNER_EMAIL`: bila env tidak terisi, tidak ada yang bisa mendaftar; bila terisi, hanya email tersebut yang diterima. Jangan menghapus guard ini untuk membuat multi-user.

## Notifikasi kustom

Notifikasi harus menjadi **user-scoped inbox**, bukan mekanisme untuk melakukan tindakan. Event yang boleh dikirim hanya berupa metadata operasional, misalnya perubahan status companion, perubahan koneksi Google, atau status proposal Daily Focus. Jangan sertakan body Gmail, token, prompt mentah, path sensitif selain workdir canonical, atau provider resource payload.

Notifikasi browser harus meminta izin hanya dari interaksi pengguna yang jelas. Bila izin ditolak atau API tidak tersedia, inbox in-app tetap menjadi fallback utama. Push owner bawaan platform hanya digunakan untuk alert operasional yang relevan bagi pemilik, bukan sebagai saluran pesan produk bagi pengguna lain.

## Pola UI, anti-slop, dan aksesibilitas

Gunakan gaya **Mint Atelier**: warm parchment, mint status signals, DM Sans untuk display, dan Source Sans 3 untuk body. Terapkan prinsip Apple HIG dan disclosure bertahap: ringkas di card, detail di dialog, bukan halaman yang memaksa scrolling panjang. Gunakan Lucide icons, bukan emoji.

Gunakan [docs/ANTI-SLOP-GUARDRAILS.md](./docs/ANTI-SLOP-GUARDRAILS.md) sebagai kontrak desain sebelum perubahan visual. Taste Skill `design-taste-frontend` dipakai hanya untuk audit-first redesign, anti-default discipline, responsive fallback, state interaktif, serta pre-flight check. Ia bukan sistem desain dashboard dan aturan landing page seperti hero/CTA marketing, bento, atau variasi layout wajib tidak boleh diterapkan secara mekanis. Untuk setiap perubahan visual, tulis satu kalimat *design read*, pertahankan Dashboard V1 sebagai baseline, dan jelaskan alasan setiap primary surface atau card.

Gunakan Ponytail pada setiap tugas coding: setelah menelusuri flow yang disentuh, berhenti pada solusi pertama yang memenuhi kebutuhan, dengan urutan **YAGNI → reuse codebase → standard library → platform native → dependency yang sudah ada → diff minimum**. Jangan menambah dependency, abstraction, config, atau boilerplate spekulatif. Prinsip ini tidak pernah boleh mengurangi validasi trust boundary, error handling yang mencegah kehilangan data, security, aksesibilitas, atau test non-trivial. Untuk simplifikasi yang memiliki batas nyata, tulis komentar `ponytail:` yang menjelaskan ceiling dan jalur upgrade.

Gunakan grid 4/8px, satu accent interaktif mint, radius card konsisten 12–16px, dan shadow ambient tipis sesuai warm background. Amber serta rose hanya untuk status semantik. Asimetri hanya boleh ketika memperjelas hirarki keputusan. Hindari kartu SaaS seragam, eyebrow yang tidak menjelaskan provenance, ikon Sparkles/AI-glamour, gradient purple/pink, wrapper div nested atau borderless tanpa fungsi layout, gradient multicolor, dan copy pseudo-intelligent. Glass effect hanya untuk layering fungsional (dialog, dropdown, popover, overlay sidebar, notification center) di atas konten bergerak dengan fallback opaque dan kontras WCAG AA; glass sebagai dekorasi kartu statis tetap dilarang. Semua state tetap harus menggunakan data nyata atau status unavailable yang eksplisit.

Dialog harus dapat ditutup dengan Escape, mengembalikan fokus ke trigger, memiliki label aksesibel, dan tetap muat pada viewport 375px. Animasi menggunakan transform/opacity di bawah 300 ms dan menghormati `prefers-reduced-motion`. Sidebar expanded/collapsed harus mempertahankan transisi serempak serta state `mintdesk.sidebar.collapsed`.

## Data, audit, dan logging

Semua record domain harus dimiliki user melalui `userId`. API list, get, update, delete, dan action confirmation wajib memfilter user aktif. Audit event mencatat metadata tindakan dan status `accepted`, `rejected`, atau `error`; jangan merekam credentials ataupun konten Gmail.

Jangan menyimpan file byte pada database. Gunakan S3 untuk byte dan database hanya untuk metadata object. Asset statis di web project harus diunggah dari `/home/ubuntu/webdev-static-assets/` dan direferensikan dengan URL storage yang disediakan.

## Workflow implementasi dan validasi

Setiap perubahan fitur harus mengikuti urutan berikut:

1. Tambahkan item `[ ]` spesifik di `todo.md` sebelum mengubah implementation.
2. Baca skill yang relevan sebelum merencanakan atau menulis code.
3. Perbarui schema terlebih dahulu bila model data berubah, generate migration, baca SQL, kemudian aplikasikan melalui workflow database terkelola.
4. Tambahkan helper database, tRPC procedure user-scoped, UI, dan state success/error/unavailable.
5. Tulis atau perbarui Vitest sebelum delivery. Screenshot bukan pengganti test.
6. Jalankan `bun run test` (Vitest — runner resmi proyek, memuat `vitest.config.ts` termasuk environment jsdom dan env uji; `bun test` menjalankan runner bawaan Bun dan bukan suite kontrak), `bunx tsc -b --noEmit`, dan `bun run build`.
7. Verifikasi tampilan desktop dan mobile 375px; baca `.manus-logs/` melalui terminal jika ada error runtime atau network.
8. Tandai item selesai menjadi `[x]`, baca keseluruhan `todo.md`, lalu buat checkpoint.

Gunakan `webdev_rollback_checkpoint` untuk rollback. Jangan gunakan `git reset --hard`.

## Workflow GitHub

Perubahan lokal harus melalui: **edit lokal → test → commit → push dengan persetujuan pemilik → sinkronisasi agent**. Jangan melakukan `git push` tanpa persetujuan eksplisit pemilik repository. Jika terjadi konflik, jangan overwrite perubahan remote secara otomatis. Gabungkan perubahan struktural secara hati-hati dan minta keputusan untuk konflik konten.

## Larangan eksplisit

- Jangan membuat mock data, testimonial, review, atau status sistem palsu untuk mengisi UI.
- Jangan membuat scheduled AI run atau background job tanpa persetujuan dan desain capability yang terdokumentasi.
- Jangan menambah data exfiltration, webhooks pihak ketiga, telemetry baru, atau logging sensitif tanpa persetujuan eksplisit.
- Jangan membuka capability system process atau filesystem di luar companion allowlist.
- Jangan menghapus browser confirmation, proposal expiration, atau ownership guard untuk mempercepat Google write.
- Jangan menaruh secret pada client bundle, URL, README, screenshot, fixture, atau git history.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
