# Operational Dashboard Upgrade

# Dashboard and Shell Rework

- [x] Rekonstruksi Dashboard agar status Linux dan Google Workspace menampilkan sumber nyata atau kondisi unavailable yang ringkas, tanpa breadcrumb, label, kartu, atau waktu pemeriksaan yang redundan. Kategori integrasi eksternal yang belum memiliki sumber nyata sengaja dihapus dari Dashboard, bukan dipresentasikan sebagai placeholder unavailable.
- [x] Sederhanakan Workspace Shell: hapus penanda aktif berlapis, rapikan identitas/profil, dan pindahkan konteks autentikasi serta konfigurasi ke menu profil.
- [x] Evaluasi pola expand-collapse sidebar sebagai pekerjaan terpisah setelah fondasi status backend, server, dan autentikasi/otorisasi real-time disetujui; jangan membuat affordance palsu pada iterasi ini. Keputusan iterasi ini: ditunda sampai pengguna menyetujui scope status real-time, sehingga tidak ada kontrol collapse inert.
- [x] Tambahkan regresi UI dan verifikasi desktop/mobile untuk dashboard serta shell setelah perombakan visual. Regresi Dashboard/Shell, typecheck, build, dan screenshot desktop/mobile lulus; breakpoint mobile dua-kolom diperbaiki setelah verifikasi pertama.

- [x] Tetapkan batasan keamanan untuk metrics, Google Workspace, startup, dan process termination.
- [x] Konfirmasi folder lokal terikat untuk Linux bridge atau desktop companion. Bind Linux tidak tersedia karena Manus Desktop hanya menyediakan installer macOS; jalur installer manual Linux telah didokumentasikan.
- [x] Upgrade project ke full-stack dan siapkan server-side API boundary.
- [x] Ganti semua data presentasi dengan adapter data nyata atau state unavailable yang jujur. Identitas, tanggal, footer, metrics, weather, activity, dan calendar kini tidak lagi memakai nilai contoh.
- [x] Implementasikan Linux bridge ringan untuk system metrics dan process listing.
- [x] Implementasikan kill process dengan explicit command allowlist, confirmation, audit log JSONL, dan proteksi proses kritis.
- [x] Verifikasi koneksi Gmail/Calendar yang sudah tersedia dan integrasikan hanya layanan yang benar-benar dapat diakses. Agent connector tersedia; CLI token masih insufficient scope.
- [x] Siapkan auto-start berbasis systemd user service atau desktop autostart.
- [x] Tulis panduan koneksi Linux OS, Google Workspace, startup, dan kill process, termasuk keterbatasan Manus Desktop di Linux.
- [x] Uji TypeScript, Vitest, production build, syntax companion, OAuth credential validation, error states, dan no-dummy-data UI compliance.
- [x] Simpan checkpoint dokumentasi rebaseline; E2E Linux dan scope Gmail/Calendar tetap menjadi dependency implementasi berikutnya.

# Product Rebaseline

- [x] Audit page, route, backend, bridge, storage, auth, and Workspace implementation status.
- [x] Pisahkan implemented, scaffolded, blocked, and not-started features.
- [x] Revisi PRD dengan MVP realistis dan prioritas halaman.
- [x] Revisi SRS dengan requirement yang dapat diuji dan unavailable states.
- [x] Revisi SDD dengan arsitektur aktual dan target architecture.
- [x] Revisi UI/UX Design dengan page inventory dan state matrix.
- [x] Revisi Task Breakdown menjadi roadmap fase implementasi.
- [x] Review konsistensi seluruh dokumen sebelum coding berikutnya.

# Clean Restart

- [x] Bekukan MVP pertama: app shell, Overview nyata, dan Linux connection state.
- [x] Audit dan hapus route/CTA yang hanya berupa toast atau placeholder. Sweep route dan action fase 1 selesai; hanya `/`, close/open drawer, refresh bridge, dan process control yang aktif.
- [x] Tetapkan kontrak data minimum dan sumber data untuk setiap widget.
- [x] Implementasikan route P0 secara nyata satu per satu. Routes `/`, `/processes`, `/activity`, `/files`, `/connections`, dan `/settings` sekarang nyata; file upload end-to-end tetap membutuhkan authenticated runtime + S3 availability, Workspace tetap unavailable sampai OAuth scope tersedia.
- [x] Tambahkan test untuk setiap vertical slice sebelum lanjut. Bridge dan file validation tercakup; 4 test files dan 7 tests lulus.
- [x] Simpan checkpoint hanya setelah acceptance criteria fase terpenuhi. Checkpoint P0 tersedia; runtime blockers Workspace OAuth dan Linux E2E tetap terdokumentasi.

# Runtime Verification Runbook

- [x] Dokumentasikan prosedur Linux companion, termasuk health, metrics, process listing, audit lokal, dan terminasi proses disposable. Eksekusi aktual memerlukan laptop Linux pengguna.
- [x] Dokumentasikan prosedur login dan uji upload File Storage hingga metadata serta URL S3 dapat diverifikasi. Eksekusi aktual memerlukan session login pengguna.
- [x] Dokumentasikan konfigurasi OAuth Google scope-minimal dan pekerjaan callback/server adapter yang masih harus diimplementasikan sebelum Gmail atau Calendar diaktifkan.

# Reliability and Google OAuth Upgrade

- [x] Tambahkan progress upload berbasis byte dan error message yang dapat ditindaklanjuti pada Files.
- [x] Tambahkan bridge health polling real-time pada Overview dan Connections.
- [x] Tambahkan schema token OAuth Google yang terenkripsi dan terikat user.
- [x] Implementasikan `/api/google/start` dengan state, PKCE, scope minimum, dan redirect aman.
- [x] Implementasikan `/api/google/callback` dengan validasi state, code exchange, dan penyimpanan token server-side.
- [x] Tambahkan test keamanan OAuth state dan visual route. Total 5 test files dan 10 tests lulus sebelum coverage UI tambahan.
- [x] Tambahkan automated test Files untuk state preparing, byte-progress, finalizing, success, dan error yang actionable.
- [x] Tambahkan automated test Overview/Connections untuk health unavailable, sukses, polling refresh, dan failure fallback. Total 7 test files dan 14 tests lulus; OAuth route smoke test mengembalikan redirect aman untuk sesi anonim dan access denial.
- [x] Tambahkan integration test shared poller untuk refresh berkala, timestamp, failure fallback, dan cleanup timer. Total 8 test files dan 15 tests lulus.
- [x] Tambahkan component/integration test Overview untuk health success, timestamp, dan fallback berikutnya.
- [x] Tambahkan component/integration test Connections untuk health success dan fallback berikutnya. Total 10 test files dan 17 tests lulus.
- [x] Tambahkan assertion render state awal Overview sebelum health pertama berhasil.
- [x] Tambahkan assertion label dan detail state awal Connections sebelum health pertama berhasil. Total 10 test files dan 19 tests lulus.

# Morning Briefing and Stress-Test Upgrade

- [x] Ekstrak dan audit report stres yang dilampirkan, termasuk temuan yang dapat direproduksi.
- [x] Tetapkan kontrak Morning Briefing dengan sumber data nyata dan source-status per bagian.
- [x] Tambahkan backend briefing yang menggabungkan audit, file metadata, dan Google Workspace hanya ketika masing-masing sumber benar-benar tersedia.
- [x] Tambahkan route dan UI Morning Briefing dengan loading, empty, partial, dan failure state yang jujur.
- [x] Tambahkan stress-test untuk bridge recovery, Workspace belum tersambung, token OAuth invalid, upload state failure, dan refresh bersamaan. Validasi memakai 30 test otomatis tanpa membuat file, audit, atau provider data sintetis.
- [x] Perbaiki temuan report yang berada dalam scope halaman dan kontrak data saat ini. Status Workspace di Settings kini user-scoped; briefing memakai source-aware aggregator. Uji E2E Linux companion, S3, dan consent Google tetap memerlukan koneksi nyata pengguna.
- [x] Revisi kontrak briefing: audit, file metadata, dan Google Workspace diagregasi server-side; snapshot Linux bridge tetap browser-local agar bearer token tidak berpindah ke backend.
- [x] Tambahkan stale-state eksplisit pada Morning Briefing untuk hasil terakhir saat refresh gagal.
- [x] Tambahkan test timeout Linux bridge dan test upload failure pada alur prepare-upload → transfer → complete-upload.
- [x] Verifikasi route `/connections`, `/processes`, `/activity`, dan `/files` di browser dengan state nyata tanpa data seed; workflow upload membuktikan metadata tidak dibuat bila transfer gagal. Storage template tidak menyediakan delete-object, sehingga object orphan akibat metadata failure tidak dapat dibersihkan langsung dan tidak memiliki referensi aplikasi. Automation E2E CI yang lebih luas tetap backlog quality, bukan klaim selesai.
- [x] Perbarui audit, PRD, SRS, SDD, UI/UX, Task Breakdown, runbook, dan catatan remediation untuk Morning Briefing.
- [x] Jalankan test, typecheck, build, dan visual check route utama setelah restart bersih. Checkpoint release siap disimpan setelah review checklist ini.

# Google OAuth Redirect URI Fix

- [x] Diagnosa `redirect_uri_mismatch` Google OAuth dan bandingkan URI callback aplikasi dengan Authorized redirect URIs di Google Cloud. Penyebabnya: aplikasi mengirim host runtime internal `ydhstprd65-aco4kte4cq-ue.a.run.app`, bukan domain publik Mintdesk.
- [x] Terapkan dan uji fallback forwarded-host tanpa mengekspos credential OAuth. Test contract lulus, tetapi smoke test produksi membuktikan gateway masih meneruskan host runtime internal sehingga konfigurasi callback kanonik tetap diperlukan.
- [x] Uji redirect OAuth anonim dan perbarui runbook callback URI. Smoke test production mencapai pemilihan akun Google tanpa `redirect_uri_mismatch`; runbook memuat URI production dan localhost.
- [x] Simpan checkpoint perbaikan OAuth setelah validasi. Callback production, localhost, dan consent pengguna telah diverifikasi serta dipublikasikan.
- [x] Tambahkan konfigurasi URI callback publik kanonik yang tidak bergantung pada host runtime internal melalui `GOOGLE_OAUTH_REDIRECT_URI`.
- [x] Daftarkan URI callback Mintdesk yang sama di Authorized redirect URIs Google Cloud. Production dan `http://localhost:3000/api/google/callback` sudah disimpan pada OAuth Client Mintdesk; consent flow akan diuji setelah deployment callback kanonik.
- [x] Dukung callback OAuth localhost yang terdaftar terpisah untuk pengembangan lokal tanpa menggantikan callback production.
- [x] Perbaiki filter Calendar Morning Briefing agar hanya event yang overlap window 24 jam yang tampil. Verifikasi production menunjukkan event Juli berakhir September sehingga memang ongoing pada window Agustus.
- [x] Jelaskan event Calendar multi-hari yang overlap window sebagai ongoing dengan waktu selesai, bukan hanya tanggal mulai yang dapat terlihat lampau. Helper presentasi dan regression test lulus; release dipublikasikan pada checkpoint Calendar clarity.

# Morning Briefing 5W1H Clarity

- [x] Audit kontrak saat ini: Calendar hanya memakai ringkasan dan waktu; Gmail hanya memakai unread count. Metadata 5W1H belum diambil sehingga tidak boleh diklaim tersedia.
- [x] Perluas kontrak backend untuk metadata Calendar dan Gmail yang benar-benar dikembalikan provider serta aman untuk scope read-only yang sudah disetujui. Calendar memakai ringkasan, waktu, organizer/peserta, lokasi, deskripsi, serta tautan event/meeting bila dikembalikan; Gmail memakai From, Subject, dan internalDate dengan `format=metadata`, tanpa body.
- [x] Rancang dan implementasikan hierarchy Calendar/Inbox terpisah dengan label 5W1H serta unavailable state per field.
- [x] Tambahkan test data-presentation dan component untuk layout 5W1H, partial source, dan field yang unavailable.
- [x] Implementasikan blok 5W1H, empty/partial/error state yang ringkas, dan visual grouping yang konsisten.
- [x] Tambahkan test presentation dan component, lalu lakukan visual smoke check desktop/mobile. Validasi release lulus: 17 test files dan 40 tests, typecheck, serta production build; checkpoint siap disimpan.

# Gmail Drafts Backend Capability

- [x] Telaah Gmail Drafts API, scope OAuth minimal, dan batas data yang aman untuk Mintdesk.
- [x] Tetapkan kontrak tRPC server-side untuk daftar, baca metadata, buat, update, dan hapus draft dengan audit trail. Endpoint send sengaja tidak dibuat.
- [x] Tambahkan scope OAuth yang diperlukan dan jalur reconnect yang eksplisit tanpa mengekspos token. Token lama memerlukan re-consent untuk `gmail.compose`.
- [x] Normalisasi recipient header Gmail untuk round-trip create/update yang menerima format display-name nyata tanpa mengizinkan header injection.
- [x] Tambahkan test service untuk round-trip draft dengan display-name recipient serta scope compose yang hilang.
- [x] Tambahkan component test dasar `/drafts` untuk edit dan delete yang dibatalkan.
- [x] Tambahkan test tRPC/router untuk list, get, create, update, dan delete termasuk error ketika `gmail.compose` belum granted.
- [x] Tambahkan component test `/drafts` untuk load error, create/update confirmation=true, delete confirmation=true, dan pesan error mutation.
- [x] Perbarui runbook, validasi end-to-end dengan akun pengguna, dan simpan checkpoint. Dibatal-kan oleh security rebaseline: capability Gmail Drafts telah dicabut; runbook kini mendokumentasikan re-consent read-only.

## Approved Scope Boundary

- [x] Pengguna menyetujui scope restricted `gmail.compose` untuk lifecycle draft. Rilis awal mengekspos list, get, create, update, dan delete; `send` tidak diimplementasikan atau diekspos.

# Morning Briefing Agent Boundary

- [x] Nonaktifkan endpoint/UI Gmail Drafts dan hapus `gmail.compose` dari scope OAuth karena agent tidak boleh menyentuh data di luar Morning Briefing.
- [x] Revoke/re-consent koneksi Google ke scope read-only Morning Briefing setelah capability Drafts dinonaktifkan. Production kini menunjukkan tiga scope read-only tanpa `gmail.compose`; Daily Focus memuat Calendar nyata, dan Gmail metadata tetap menyatakan unavailable secara eksplisit saat provider tidak dapat di-refresh.
- [x] Tambahkan mutation Disconnect Google Workspace yang meminta konfirmasi, mencoba revoke refresh token di Google, menghapus koneksi terenkripsi lokal, dan mencatat audit tanpa token atau scope sensitif.
- [x] Tambahkan status UI serta error state untuk disconnect Google, lalu arahkan pengguna ke connect ulang dengan scope read-only.
- [x] Definisikan kontrak rekomendasi harian: sumber yang diizinkan, evidence, prioritas, rekomendasi langkah, ketidakpastian, dan human override.
- [x] Bangun layar Daily Briefing sebagai pendukung data nyata, tanpa data dummy atau aksi agent-to-agent.
- [x] Tambahkan guardrail companion yang melarang write action, scheduled action, dan akses data di luar sumber Morning Briefing.
- [x] Uji policy boundary, human override, unavailable state, dan dokumentasikan model operasional asisten.

# Daily Focus and Workspace Simplification

- [x] Hapus capability Drafts yang sudah dicabut dari catatan active scope, route inventory, dan Daily Focus evidence; dokumentasikan rollback least-privilege dan re-consent Google.
- [x] Sederhanakan sidebar menjadi workspace-level navigation: Dashboard, Daily Focus, Storage, Activity, Connections, dan Settings; hilangkan Files cloud serta pastikan icon Activity berbeda dari Process control panel.
- [x] Hilangkan refresh redundant dan jadikan refresh kontekstual hanya pada sumber yang benar-benar on-demand.
- [x] Rancang local storage observer melalui Linux companion dengan directory allowlist, metadata-only listing, dan tanpa upload/download/modify file.
- [x] Ganti Files dengan Storage observer yang menampilkan kapasitas, mount, serta folder yang secara eksplisit diizinkan dan dapat dipindai dari companion.
- [x] Definisikan Daily Focus evidence model untuk today priorities, tomorrow preparation, dan lessons dari activity dengan sumber serta tingkat keyakinan eksplisit.
- [x] Implementasikan rekomendasi terstruktur melalui companion lokal yang menyertakan evidence, uncertainty, dan human override; tidak ada raw LLM response atau agent-to-agent action.
- [x] Bangun layar Daily Focus evidence-first dengan refresh sumber yang bermakna, refinement eksplisit, dan zero fabricated content.
- [x] Tambahkan test policy dan UI lalu validasi Daily Focus, sidebar, dan local storage unavailable state sebelum checkpoint; runtime Linux nyata tetap memerlukan laptop pengguna.

## Confirmed Operating Decisions

- [x] Daily Focus dibentuk saat Dashboard dibuka, menggunakan evidence dan aturan deterministik; AI refinement hanya berjalan saat pengguna meminta agar tidak ada run berulang tanpa kebutuhan nyata.
- [x] Storage observer dibatasi ke workdir `/media/abelion/Isaf/ican/project` dan hanya membaca metadata allowlisted.
- [x] Sidebar target: Dashboard, Daily Focus, Storage, Activity, Connections, dan Settings. Process control menjadi panel Dashboard/System; Files cloud tidak lagi menjadi menu terpisah.
- [x] Audit Log berada pada menu Activity terpisah karena merupakan bukti operasional untuk pembelajaran harian, bukan konfigurasi.
- [x] 9router local menjadi layanan reasoning lokal untuk Daily Focus. Mintdesk hanya mengirim evidence Morning Briefing yang diizinkan dan menerima rekomendasi schema-terstruktur; 9router tidak menerima tool/action ke Gmail, Calendar, filesystem, atau sistem.

## 9router Daily Focus Runtime

- [x] Dapatkan endpoint, metode autentikasi, dan format request 9router yang berjalan lokal tanpa mengeksposnya ke internet.
- [x] Implementasikan adapter companion-to-9router dengan allowlist payload Morning Briefing dan schema response Daily Focus yang ketat.
- [x] Pastikan jika 9router/laptop offline, Daily Focus hanya menampilkan evidence dan reasoning state unavailable tanpa fallback AI atau data lama yang menyesatkan.
- [x] Terapkan sidebar yang sama pada setiap halaman workspace dan tandai route aktif agar Dashboard, Daily Focus, Storage, Activity, Connections, serta Settings selalu dapat dijangkau tanpa kembali dulu ke Dashboard.
- [x] Hapus refresh kedua pada hero Dashboard sehingga refresh hanya tersedia sekali pada sumber Linux yang sedang ditampilkan.
- [x] Tambahkan test UI Daily Focus untuk human override, reasoning unavailable, dan kegagalan companion/9router tanpa fallback AI.
- [x] Tampilkan state eksplisit pada panel Daily Focus saat Linux companion atau local reasoning belum tersedia, sebelum pengguna meminta refinement.
- [x] Dokumentasikan model operasional Daily Focus: sumber yang diizinkan, larangan write/schedule, batas local reasoning, dan perilaku human override.
- [x] Tambahkan test UI Daily Focus yang memaksa `bridgeApi.dailyFocus` reject lalu memastikan panel menampilkan reasoning unavailable tanpa merender hasil AI baru maupun hasil AI lama.
- [x] Tambahkan test UI Storage yang memaksa `bridgeApi.workdirStorage()` gagal lalu memastikan Workdir unavailable serta error observer tampil benar.
- [x] Perbaiki tombol Refresh Storage pada viewport mobile agar hanya menampilkan ikon yang dapat diakses, tanpa label terpotong.
- [x] Pindahkan Connections dan Settings dari sidebar ke menu profil popover yang ringkas, dapat diakses dengan keyboard, dan menjaga route tetap tersedia.
- [x] Sederhanakan informasi profil/sidebar untuk hierarki visual yang lebih tenang, modern, dan konsisten dengan HIG Apple tanpa menghilangkan status yang bermakna.
- [x] Tambahkan test kontrak disconnect serta test menu profil, lalu verifikasi desktop/mobile sebelum checkpoint.
- [x] Perbaiki layout mobile Connections dan Settings agar kartu tidak meluber horizontal dan tetap mudah dibaca pada viewport sempit.
- [x] Hapus copy Dashboard yang terasa seperti AI-slop dan rapikan status ringkas agar hanya menyatakan fakta runtime yang bermakna.
- [x] Sederhanakan profile trigger dengan menghapus ikon atau dekorasi yang tidak menambah affordance, sambil mempertahankan menu profil yang dapat diakses.
- [x] Tambahkan atau perbarui test dan verifikasi visual desktop/mobile untuk revisi anti-slop sebelum checkpoint.

# Daily Focus Action Expansion

- [x] Riset pola AI-slop dari sumber desain dan produk yang kredibel, lalu terjemahkan menjadi rubric visual/copy yang dapat diuji untuk Mintdesk.
- [x] Gunakan Bun untuk companion hybrid yang dapat berjalan pada Linux laptop dan Linux server; device yang online dipilih secara eksplisit untuk 9router tanpa memindahkan token lokal ke browser.
- [x] Tentukan arsitektur akses dari ponsel, Linux laptop, dan Linux server tanpa memindahkan token companion atau 9router ke browser.
- [x] Perluas konfigurasi consent Google hanya untuk Google Tasks, Gmail modify, dan Calendar write/delete setelah menyepakati preview serta konfirmasi per aksi; production kini memverifikasi enam scope yang diizinkan tanpa `gmail.compose`.
- [x] Tambahkan contract action Daily Focus untuk membuat task, menyusun draft event dari teks, membuat/menghapus event, dan menandai atau menghapus inbox dengan audit user-scoped.
- [x] Bangun companion Linux Bun yang dapat menerima pekerjaan Daily Focus terautentikasi dari server dan mengembalikan proposal terstruktur dari 9router tanpa menjalankan aksi Google sendiri.
- [x] Bangun UI Daily Focus mobile untuk input teks bebas, preview perubahan, batch selection, dan konfirmasi eksplisit per aksi.
- [x] Tambahkan test otomatis untuk scope, ownership, preview, failure policy, audit boundary, responsive layout, serta verifikasi build sebelum checkpoint.
- [x] Jalankan E2E nyata proposal task disposable setelah Bun companion Linux aktif dan re-consent scope action Google selesai. Lifecycle `queued` → `processing` → `ready` → `rejected` terverifikasi pada action `90001`, tanpa aksi Google dieksekusi.
- [x] Validasi Calendar create/delete terhadap data Google nyata setelah proposal event dapat dibuat tanpa ketergantungan provider reasoning yang sedang unavailable. Gmail Trash tervalidasi nyata pada action `120002`; Calendar create action `120003` dan delete action `120004` keduanya executed terhadap provider resource yang sama, tanpa event uji tersisa.
- [x] Selesaikan verifikasi provider yang telah disetujui: satu newsletter terbaca dipindahkan ke Gmail Trash setelah preview serta konfirmasi, lalu event Calendar uji yang bertanda jelas dibuat dan dihapus melalui preview, confirmation, serta ownership guard. Proposal lama `120001` tetap tercatat sebagai kegagalan reasoner sebelum provider dipanggil.
- [x] Tampilkan jalur review deletion untuk event Calendar yang baru dibuat Mintdesk dari riwayat action, agar event uji dapat dibersihkan walaupun berada di luar window Calendar 24 jam. Regression UI, typecheck, dan build produksi lulus.
- [x] Tambahkan fallback deterministik untuk proposal Calendar ketika input berisi judul, waktu mulai, dan waktu selesai ISO yang eksplisit, sehingga event terstruktur dapat direview tanpa bergantung pada 9router; input ambigu tetap memakai companion atau ditolak untuk klarifikasi. Parser, router, UI, test policy, typecheck, dan build produksi tervalidasi.
- [x] Tambahkan kemampuan Gmail content-aware untuk Daily Focus: baca isi pesan secara scoped, rangkum secara evidence-first, dan siapkan pembersihan email terbaca melalui preview serta konfirmasi manusia. Preview dibatasi lima unread email, tidak disimpan, dan pembersihan hanya menampilkan kandidat `is:read` untuk review Trash.
- [x] Evaluasi Google OAuth untuk capability Gmail content-aware dan dokumentasikan retention serta batas data. Scope `gmail.modify` yang sudah diberikan mendukung `format=full`, sehingga tidak meminta re-consent baru atau `gmail.compose`; tradeoff allowlist dicatat di `docs/RUNTIME-DECISIONS.md`.
- [x] Dokumentasikan keputusan runtime: pnpm tetap untuk web app dan Bun hanya untuk companion; Gmail draft/send tetap di luar scope karena `gmail.compose` tidak diizinkan. Lihat `docs/RUNTIME-DECISIONS.md`.
- [x] Buat paket companion Bun mandiri beserta panduan instalasi singkat agar Linux laptop/server tidak memerlukan source penuh Mintdesk.
- [x] Perbaiki parser respons 9router agar JSON dalam markdown fence dapat diekstrak dan tetap ditolak bila tidak memenuhi schema proposal ketat.
- [x] Buat credential companion pengganti setelah device lama mengembalikan 401, lalu gunakan alur unduh dan pemasangan yang seluruhnya berawal dari workdir `/media/abelion/Isaf/ican/project`. Device v6 dipasangkan melalui browser-ke-loopback tanpa token di chat.
- [x] Izinkan pendaftaran device companion tambahan dari Daily Focus saat device lain sudah ada, sehingga laptop dan server atau credential pengganti dapat dikelola bersamaan.
- [x] Perbaiki distribusi paket companion agar URL workdir mengembalikan arsip gzip yang tervalidasi sebelum ekstraksi, bukan halaman respons deployment. CDN direct-download terbaru diverifikasi checksum dan memuat installer.
- [x] Selaraskan runtime companion Linux dengan parser fenced-JSON dan reader SSE DONE yang telah diperbaiki, lalu verifikasi proposal task disposable mencapai status siap review dan ditolak tanpa perubahan Google.
- [x] Deteksi respons streaming dan penolakan kuota provider 9router secara eksplisit agar Daily Focus tidak mengklasifikasikannya sebagai kegagalan JSON yang ambigu. Regression test, typecheck, production build, dan syntax installer lulus.
- [x] Terapkan retry bounded hingga 10 percobaan untuk alias 9router model kombinasi yang merotasi provider gratis, dengan jeda dan batas waktu sehingga tidak menjadi polling tanpa akhir atau menghasilkan aksi Google otomatis. Test parser/retry/UI, typecheck, build, syntax installer, serta checksum CDN lulus.
- [x] Pulihkan pasangan device ID dan secret yang benar pada runtime companion setelah restart mengembalikan 401, tanpa memindahkan credential ke chat. Pairing v6 tervalidasi heartbeat online.
- [x] Ganti pengeditan file credential manual dengan helper pairing terminal yang meminta secret tersembunyi, menulis dua field aman, mengunci izin, dan me-restart service. Test helper, UI, parser/retry, typecheck, build, syntax script, serta checksum CDN lulus.
- [x] Tambahkan pairing dari clipboard dengan fallback input tersembunyi agar credential hasil tombol Copy pairing code tidak perlu diketik ulang di terminal. Helper memprioritaskan wl-paste, xclip, atau xsel; test, build, syntax, dan checksum paket lulus.
- [x] Selaraskan path helper pairing yang dipublikasikan dengan APP_DIR installer agar perintah satu-langkah tidak gagal karena direktori drift. Installer kini menampilkan lokasi `mintdesk-hybrid` yang benar.
- [x] Tambahkan pairing browser-ke-loopback yang hanya menerima credential di 127.0.0.1, memvalidasi Origin Mintdesk, menulis file atomik, dan me-restart companion tanpa clipboard atau input terminal. Policy test, typecheck, build, syntax, dan checksum paket lulus.
- [x] Simpan pending pairing device secara terenkripsi dan user-scoped dengan masa berlaku singkat agar reload browser dapat melanjutkan Pair this browser tanpa menampilkan token. Migration database, UI regression test, companion policy test, typecheck, dan build lulus.
- [x] Diagnosa endpoint pairing loopback yang tidak merespons di Linux pengguna dan tambahkan timeout eksplisit agar UI tidak menampilkan spinner tanpa batas. Service dan endpoint tervalidasi aktif; UI kini mengajukan izin loopback, target address space, serta abort enam detik.
- [x] Tambahkan observabilitas request loopback dan tangani kegagalan browser-ke-loopback secara bounded agar respons CORS atau private-network tidak mengunci UI pairing. Pairing browser v6 berhasil, dengan permission loopback dan timeout enam detik sebagai fallback.
- [x] Hentikan pembacaan respons 9router streaming segera setelah penanda SSE `[DONE]` agar action tidak macet dalam status processing saat koneksi tetap hidup. Reader SSE, regression test koneksi terbuka, build, dan paket CDN tervalidasi.
- [x] Konsolidasikan credential pemulihan dan test untuk satu laptop menjadi satu device aktif yang terlihat, dengan riwayat lama diarsipkan dari pemilih Daily Focus. Production kini menampilkan hanya `abelion-linux-mint-autopair-v6` sebagai laptop aktif; enam credential recovery lama dipertahankan sebagai audit tetapi tidak dapat autentikasi.
