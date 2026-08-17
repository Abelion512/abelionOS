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
- [ ] Implementasikan route P0 secara nyata satu per satu. Fase berikutnya dimulai setelah checkpoint fase 1.
- [x] Tambahkan test untuk setiap vertical slice sebelum lanjut. `client/src/lib/bridge.test.ts` mencakup connected/unavailable/error state dan process termination eligibility; 3 test files dan 4 tests lulus.
- [ ] Simpan checkpoint hanya setelah acceptance criteria fase terpenuhi.
