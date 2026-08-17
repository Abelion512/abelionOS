# Software Requirements Specification

## 1. Scope

SRS ini mendefinisikan perilaku Mintdesk setelah rebaseline. Sistem terdiri dari web client, backend full-stack, database metadata, S3 File Storage, Google OAuth adapter, dan Linux companion lokal. Runtime harus membedakan data `connected`, `stale`, `unavailable`, `permission_denied`, dan `error`.

## 2. Functional Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| FR-01 | Sistem menampilkan user dari auth session | Nama tidak hardcoded; anonymous state jelas |
| FR-02 | Sistem mengambil metrics dari bridge | CPU, memory, uptime, load memiliki timestamp source |
| FR-03 | Sistem menampilkan processes user | PID, command, CPU, memory, state, canTerminate |
| FR-04 | Sistem mengirim terminate hanya untuk allowlist | Non-allowlist ditolak server/bridge |
| FR-05 | Setiap terminate membuat audit event | Audit menyimpan actor, PID, command, signal, timestamp, result |
| FR-06 | Sistem menyediakan koneksi bridge | Token tidak ditampilkan ulang penuh dan dapat dicabut |
| FR-07 | Sistem meng-upload file ke S3 | Bytes tidak disimpan di DB; metadata dapat dicari setelah refresh |
| FR-08 | Sistem menampilkan daftar file user | File milik user lain tidak ikut tampil |
| FR-09 | Sistem menghubungkan Google OAuth | Granted scope diperiksa sebelum fitur enabled |
| FR-10 | Sistem menampilkan Calendar/Gmail hanya jika authorized | Scope kurang menghasilkan permission state |
| FR-11 | Sistem menyimpan settings user | Settings tidak memakai localStorage untuk secret |
| FR-12 | Sistem menampilkan audit activity | Empty state jujur ketika belum ada event |

## 3. Page and Route Requirements

| Route | Page | Required states |
|---|---|---|
| `/` | Overview | connected, unavailable, loading, error |
| `/processes` | Processes | list, empty, permission denied, terminate pending, audit success |
| `/files` | Files | upload, progress, empty, list, download error |
| `/connections` | Connections | not connected, consent, connected, expired, insufficient scope |
| `/workspace` | Workspace | Calendar/Gmail/Drive per-provider availability |
| `/activity` | Activity | audit list, empty, filter, load error |
| `/settings` | Settings | saved, invalid, revoked, local bridge instructions |

## 4. Nonfunctional Requirements

Authentication wajib digunakan untuk data user. Server harus memvalidasi ownership sebelum query atau mutation. Credential dan refresh token tidak boleh masuk ke browser bundle, URL, log umum, atau database plaintext. Companion harus bind ke localhost, berjalan tanpa root, dan membatasi endpoint pada token serta allowlisted origins.

UI harus keyboard accessible, memiliki focus state, memiliki contrast yang dapat dibaca, dan menghormati reduced motion. API harus mengembalikan structured errors. Semua timestamps disimpan UTC dan ditampilkan dalam timezone pengguna.

## 5. Data Integrity

Tidak boleh ada seeded customer data, fabricated activity, fabricated weather, fabricated calendar event, atau fake health status. Data tidak tersedia harus direpresentasikan sebagai `null` atau state enum dan bukan angka nol yang menyesatkan.

## 6. Security Requirements

Process termination memakai SIGTERM dan explicit command allowlist. Root process, system daemon, display server, network manager, bridge sendiri, dan proses di luar current user harus ditolak. File access harus memakai user ownership. OAuth scope harus incremental dan provider-specific.

## 7. Test Requirements

Unit tests wajib mencakup auth, ownership, allowlist, audit serialization, unavailable state, dan OAuth scope mapping. Integration tests wajib mencakup upload/list file, bridge health/metrics, process termination rejection, dan token expiration. End-to-end Linux test harus dijalankan pada laptop Linux nyata sebelum feature dinyatakan released.
