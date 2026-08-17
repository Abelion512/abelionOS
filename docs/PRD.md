# Product Requirements Document

## Product

**Mintdesk** adalah dashboard operasional dan Morning Briefing on-demand untuk pengguna Linux yang ingin melihat kondisi laptop, mengelola proses milik user, mengakses file, serta melihat metadata Google Workspace dari satu antarmuka yang terasa seperti desktop Linux. Produk ini bukan pengganti desktop environment, bukan remote shell, dan bukan service manager dengan hak root.

## Problem

Pengguna harus berpindah antara system monitor, file manager, browser, Gmail, Calendar, dan terminal untuk memahami keadaan workspace. Dashboard saat ini baru memvisualisasikan konsep tersebut; MVP harus mengubahnya menjadi alur nyata dengan sumber data yang dapat diverifikasi.

## Users

| Persona | Kebutuhan | Risiko |
|---|---|---|
| Linux power user | Metrics, process control, files, quick workspace context | Salah menghentikan proses penting |
| Developer | Proses dev, logs, storage, terminal links | Token dan command leakage |
| Founder/operator | Calendar, Gmail metadata, activity audit | Data Workspace terlalu luas |

## MVP Scope

MVP wajib mencakup Overview berbasis metrics Linux bridge, Processes dengan filtering dan terminate allowlist, Files dengan upload/list/download melalui S3, Connections dengan status OAuth, Settings untuk bridge dan provider, Activity Audit untuk aksi sensitif, serta Morning Briefing on-demand. Briefing menggabungkan audit dan metadata file per user dari server, Calendar dan Gmail metadata hanya bila OAuth aktif, dan snapshot health Linux hanya dari bridge browser-local. Semua halaman harus memiliki loading, empty, unavailable, permission denied, dan error state; Briefing juga memberi label stale bila refresh gagal setelah hasil sebelumnya tersedia.

Out of scope untuk MVP adalah arbitrary shell execution, root operations, remote machine control, email body indexing, automatic file deletion, background cloud polling tanpa consent, dan fitur weather tanpa provider nyata.

## Success Metrics

Keberhasilan MVP diukur melalui kriteria teknis, bukan kesan visual: metrics tampil dari laptop Linux nyata setelah bridge aktif; request bridge yang macet berhenti dalam lima detik; terminate hanya menerima proses yang allowlisted dan selalu tercatat; file upload dapat ditemukan kembali setelah refresh; OAuth scope yang tidak diberikan membuat fitur disabled; dan Briefing tidak membuat ringkasan sintetis ketika sumber belum tersedia.

## Page Priority

| Prioritas | Halaman | Tujuan |
|---|---|---|
| P0 | Overview | Ringkasan system state nyata |
| P0 | Processes | Melihat dan menghentikan proses yang aman |
| P0 | Connections | Menghubungkan Linux bridge dan Google Workspace |
| P1 | Files | Upload, list, preview metadata, dan download |
| P1 | Activity | Audit event dan status perubahan |
| P1 | Settings | Token bridge, provider, retention, dan permissions |
| P1 | Morning Briefing | Ringkasan on-demand, source status, dan tautan menuju data asli |
| P2 | Workspace | Gmail/Calendar/Drive views terpisah setelah kebutuhan product bertambah |

## Non-negotiables

Tidak ada mock data pada runtime production. Jika sumber data belum tersedia, UI menampilkan unavailable state. Setiap action sensitif memiliki confirmation, permission check, audit event, dan error handling. Semua credential disimpan server-side atau pada konfigurasi lokal yang permission-nya ketat.

## Risks

Risiko utama adalah Manus Desktop belum mendukung Linux, sehingga companion harus diinstal manual. Risiko kedua adalah Google OAuth scope dan review. Risiko ketiga adalah perbedaan proses Linux antar desktop environment. Semua risiko tersebut harus direpresentasikan sebagai dependency di Task Breakdown, bukan disembunyikan dalam UI.
