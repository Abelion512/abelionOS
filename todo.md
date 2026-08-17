# Operational Dashboard Upgrade

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
- [ ] Simpan checkpoint perbaikan OAuth setelah validasi.
- [x] Tambahkan konfigurasi URI callback publik kanonik yang tidak bergantung pada host runtime internal melalui `GOOGLE_OAUTH_REDIRECT_URI`.
- [x] Daftarkan URI callback Mintdesk yang sama di Authorized redirect URIs Google Cloud. Production dan `http://localhost:3000/api/google/callback` sudah disimpan pada OAuth Client Mintdesk; consent flow akan diuji setelah deployment callback kanonik.
- [x] Dukung callback OAuth localhost yang terdaftar terpisah untuk pengembangan lokal tanpa menggantikan callback production.
- [x] Perbaiki filter Calendar Morning Briefing agar hanya event yang overlap window 24 jam yang tampil. Verifikasi production menunjukkan event Juli berakhir September sehingga memang ongoing pada window Agustus.
- [ ] Jelaskan event Calendar multi-hari yang overlap window sebagai ongoing dengan waktu selesai, bukan hanya tanggal mulai yang dapat terlihat lampau.
