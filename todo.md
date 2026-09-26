# todo.md

## Checkpoint 2026-09-26 (rebuild → GitHub)
- [x] **Rebuild Convex 2026 dikirim sebagai PR** — branch `rebuild/convex-2026`, commit `8f47c73` (295 file, +9119/−19391), PR #2 ke `main` (https://github.com/Abelion512/dashboard-os-linux/pull/2). Validasi lulus sebelum push: Vitest 91/91, `tsc -b --noEmit` bersih, build sukses, scan secret staged diff bersih. `isolate/` (kosong) dikecualikan. Status: menunggu review + merge pemilik. Konteks: workspace sempat wedged (RAM ~2000%, OOM thrashing) lalu di-restart dari UI Freebuff; semua file utuh.

## Checkpoint 2026-09-26 (CI PR #2)
- [x] **Perbaiki check gagal di PR #2** — tiga lapis penyebab, semua tertangani: (1) job CI awalnya ditolak start oleh billing GitHub Actions (aksi pemilik: billing dibereskan; repo ternyata sudah PUBLIC sejak awal — kuota private bukan masalah), (2) Socket alert Block `@auth/core@0.37.4` → upgrade `@convex-dev/auth` `^0.0.95` + pin `@auth/core@0.41.3` (transitive `oslo`/`arctic` keluar dari lock; Socket PR Alerts kini pass), (3) setelah billing beres, CI gagal betulan: `scripts/patch-wouter.js` (postinstall) merusak type defs wouter fresh di CI (`TS1005` di `wouter/types/index.d.ts`) → patch dihapus + wouter `^3.11.0` (type defs kompatibel React 19 tanpa patch; debt ponytail lunas). Validasi lokal pada fresh install: Vitest 91/91, tsc bersih, build sukses. Sisa sadar: `lucia@3.2.2` (internal `@convex-dev/auth`) Deprecated di Socket — Warn, tunggu upstream; advisory `convex` inactive-collaborators = maintenance, dimonitor.

## Riwayat Terkompresi
- [x] Riwayat 1–169 (Operational Dashboard Upgrade, Product Rebaseline, Clean Restart, Runtime Verification Runbook, Reliability & OAuth, Morning Briefing, Gmail Drafts rollback, Daily Focus, 9router, Action Expansion, Glassmorphism Phase 0): SEMUA selesai — ringkasan lengkap tersimpan permanen di CHANGELOG.md v1.0.0 dan docs/archive/.
- [x] Riwayat 4–103 (9router Runtime, Action Expansion, Glassmorphism, Rebuild Freebuff: executor/revoke/registry OAuth multi-account, login fix): SEMUA selesai — keputusan operasional permanen ada di AGENTS.md, README.md, dan docs/RUNTIME-DECISIONS.md.
- [x] Riwayat 170–205 (Login end-to-end: PBKDF2 WebCrypto + JWT RS256 + auth.config.ts, watchdog AuthPage; Prod Convex cloud `charming-firefly-655` aktif + build command ber-URL eksplisit; PWA + Web Push VAPID end-to-end; news watcher cron 5 menit disetujui pemilik; registry berita modular kategori×wilayah + guard anti-SSRF; optimasi performa: code splitting 8 halaman lazy, `deviceStates` per device, retensi `retention.ts` menumpang cron watcher, `markAllRead` berbatas, proposal `expired`, AppShell layout route, SW asset cache; bugfix prod: parser Cryptowave href relatif, error eksplisit per sumber, `newsCache` TTL 10 menit bersama on-demand+watcher, `pollPolicy` adaptif 5→20 mnt sukses / backoff 60 mnt gagal, interop CJS web-push + push per-item tidak membunuh run, migrasi URL notifikasi lama ke kolom `url`): SEMUA selesai — detail teknis lengkap ada di git history (commit-fix 2026-09-25/26) dan CHANGELOG.md.

# Pekerjaan Aktif

## Implementasi Companion Bun + Pairing (menunggu persetujuan pemilik)
- [ ] **Implementasi companion Bun + pairing UI** sesuai desain `docs/COMPANION-PAIRING-DESIGN.md` — pairing dipimpin laptop (Ed25519 + pairing code 8 karakter TTL 10 menit single-use), device secret tidak pernah lewat browser, endpoint `createPairingCode`/`registerDevice`/`claimApproval`/`heartbeat`, tabel `devices` + `pairingCodes`, allowlist capability (health, workdir metadata agregat, audit-local count), UI Settings → Companion read-only, 6 tahap implementasi. **Status: desain selesai dan menunggu persetujuan pemilik — JANGAN implementasi sebelum disetujui.** (Permintaan pemilik 2026-09-26: "Rancang companion Bun + pairing UI untuk koneksi laptop Linux, dengan persetujuan capability di todo.md".)

## Prod / Prasyarat Pemilik
- [ ] **Kredensial Google produksi** (butuh pemilik): isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_STATE_SECRET`, `TOKEN_ENCRYPTION_KEY` sebagai env deployment prod (`bunx convex env set --deployment charming-firefly-655 …`) dan daftarkan `https://abelionos.freebuff.app/api/google/callback` di Google Cloud. Tanpa ini Connections/Daily Focus menampilkan status unavailable eksplisit — bukan error diam.
- [ ] **/news kosong di prod** — pola audit: 10 feed Google News `unavailable` sekaligus sementara Cryptowave ok, padahal feed tervalidasi hidup dari sandbox. Dugaan terkuat: rate-limit terhadap IP deployment prod. Mitigasi kode sudah terpasang (cache bersama TTL 10 menit + polling adaptif per sumber + konkurensi 3 + error per sumber ditampilkan). Setelah deploy, tekan "Ambil berita" sekali → label per sumber menampilkan alasan eksplisit; bila masih `HTTP 429`, mitigasi lanjutan (jarangkan watcher) dibahas dengan bukti itu. Jangan ubahan kode spekulatif sebelum alasan terlihat.
- [ ] **Daftar akun pertama di prod** (pemilik): `https://abelionos.freebuff.app/auth` (email pemilik + password sendiri), lalu buka `/status` memastikan chip WebSocket hijau.

## Pengawasan Berkelanjutan
- [ ] Verifikasi `/news` pasca-deploy + pastikan build command deploy masih memakai assignment eksplisit `VITE_CONVEX_URL=https://charming-firefly-655.convex.cloud VITE_CONVEX_SITE_URL=https://charming-firefly-655.convex.site bun run build` (env warisan platform bisa tersegel; lihat catatan WS 1006 di git history).
- [ ] Audit log runtime pasca-deploy via `bunx convex logs --deployment charming-firefly-655 --history` dan `bunx convex insights --deployment charming-firefly-655` (`.manus-logs/` tidak ada di workspace Freebuff ini).

## Saran Berikutnya (belum dikerjakan, butuh keputusan pemilik)
- [ ] **Checkpoint verifikasi rantai audit** — `auditChain.verifyAuditChain` masih menyusun ulang seluruh rantai tiap Activity dibuka (O(n) hash + baca semua event). Desain yang disarankan: simpan checkpoint `{throughTime, lastHash, count}` di tabel baru, perluas checkpoint secara inkremental dari workflow periodik (verifikasi ekor + rotasi batch untuk verifikasi penuh), lalu query hanya memverifikasi ekor setelah checkpoint. **Belum dikerjakan karena mengubah semantik tamper-evidence** (deteksi perubahan pada event lama hanya lewat verifikasi penuh) — butuh keputusan pemilik: (a) incremental checkpoint + tombol "verifikasi penuh", atau (b) tetap verifikasi penuh tiap kunjungan.
- [ ] Prefetch chunk route saat hover/idle bila navigasi pertama terasa lambat (catatan `ponytail:` sudah ada di `src/App.tsx`).
- [ ] Cabang fallback transisi di `deviceStates.readDeviceStates` bisa dihapus setelah companion menulis state pertamanya (tergantung implementasi companion di atas).

## Ponytail Debt/Gain (inventaris `ponytail:` di kode, 2026-09-26)

**Gain yang sudah direalisasikan:**
- Satu layanan fetch (`newsFetchService`) dipakai bersama fetch on-demand + watcher → cache metadata TTL 10 menit menghapus burst 12 fetch per klik kategori; konkurensi dibatasi 3 dengan antrian berbatas tanpa dependency.
- Kebijakan polling adaptif disimpan sebagai satu angka (`intervalMs`) di baris `newsCache` yang sudah ada — nol tabel baru, nol migration untuk fitur rate-limit.
- `deviceStates` (satu baris per device) menggantikan pembacaan O(jendela 200) — baca O(jumlah device) dengan fallback transisi sekali.
- Retensi menumpang workflow periodik yang sudah disetujui (news watcher) via `scheduler.runAfter(0, …)` — nol cron baru. Sekarang juga mem-prune `authStates` PKCE kadaluarsa (dulu daftar saran, kenyataannya menumpang langkah yang sama tanpa cron baru).
- Route-level code splitting (8 halaman lazy), pembacaan heartbeat `take(200)`, `pendingActions take(50)`, hapus query mati `unreadCount`.
- Pembersihan kode 2026-09-26: hapus `logAudit`/`notify` mati dari `mintdeskHelpers` (audit satu penulis `auditFromAction`), konstanta endpoint OAuth tak terpakai (`GOOGLE_AUTH_ENDPOINT`/`GOOGLE_USERINFO_ENDPOINT`), `stripBold` mati di `newsParser`. Nol dependency produksi mati tersisa (audit 2026-09-25 sudah menghapus 18).

**Debt sadar (ceiling + jalur upgrade, komentar `ponytail:` di kode):**
- `pollPolicy.ts` — state satu angka per sumber, tanpa backoff per-host; upgrade bila ada sumber non-Google yang butuh perlakuan berbeda.
- `newsFetchService.ts` — TTL cache 10 menit seragam; upgrade: TTL per sumber / stale-while-revalidate bila ada bukti kebutuhan.
- `retention.ts` — tiap langkah take(keep+batch) lalu hapus sisanya; sisanya dikerjakan run berikutnya (transaksi kecil, bukan sweep penuh).
- `deviceStates.ts` — fallback transisi ke ringkasan riwayat + `MAX_DEVICES = 20`; cabang fallback bisa dihapus setelah companion menulis state pertamanya.
- `auditChain.ts` — verifikasi rantai masih full O(n) tiap Activity dibuka (sengaja, tamper-evidence); upgrade inkremental menunggu keputusan pemilik di seksi "Saran Berikutnya".
- `App.tsx` — chunk route belum di-prefetch saat hover/idle; tambah bila navigasi pertama terasa lambat.
- `newsCacheInternals.ts` — `intervalMs` opsional demi backward-compatible dengan baris cache lama; bisa dipertegas setelah semua baris lama tertimpa.
- `passwordCrypto.ts` — format PBKDF2 tidak punya jalur verify untuk hash Scrypt lama; belum ada akun produksi sehingga tidak diperlukan migrasi.
- ~~`scripts/patch-wouter.js`~~ **SELESAI (2026-09-26)** — wouter 3.11.0 menerbitkan type defs kompatibel React 19 (ReactElement diimpor valid tanpa patch); script patch + postinstall dihapus, wouter dinaikkan ke ^3.11.0. Debt ponytail ini lunas sesuai jalur upgrade yang direncanakan.
- `scripts/dev.sh` — convex dev + vite dalam satu script (backend lokal preview); upgrade: bila preview pindah ke cloud backend penuh waktu, script bisa dihapus.

## Status Backend + Prasyarat Referensi (terkompresi dari riwayat)
- Prod deployment Convex: `agen-salva:mintdesk:production` (`charming-firefly-655.convex.cloud`, site `charming-firefly-655.convex.site`). Pemilik sudah login CLI Convex dari Terminal hosted Freebuff (`~/.convex/config.json`).
- Env prod backend sudah berisi: `JWT_PRIVATE_KEY` + `JWKS` RS256, `AUTH_OWNER_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. Yang belum: kredensial Google (seksi Prod di atas).
- Runner test kontrak: `bun run test` (Vitest — memuat vitest.config.ts); `bun test` (runner bawaan Bun) TIDAK memuat config dan membuat test komponen gagal. CI dan workflow Release sudah memakai `bun run test`.
- OAuth callback prod: `https://abelionos.freebuff.app/api/google/callback` (daftarkan di Google Cloud). HTTP action dilayani di site port (proxy Vite `/api/google` → 3211 di dev).
