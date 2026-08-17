# UI/UX Design Specification

## Design Direction

Mintdesk memakai **Mint Atelier**: shell desktop Linux yang tenang, material, dan editorial. Visual membantu scanning status, tetapi tidak boleh menciptakan klaim operasional. Green berarti data terhubung atau action aman, bukan sekadar dekorasi.

## Page Inventory

| Page | Primary job | Main action |
|---|---|---|
| Overview | Memahami keadaan workspace | Refresh bridge / open issue |
| Processes | Mengelola proses user | Inspect / confirm SIGTERM |
| Files | Mengelola file | Upload / download / delete policy |
| Connections | Menghubungkan provider | Connect / re-authorize / revoke |
| Workspace | Membaca Gmail/Calendar/Drive | Filter by provider and date |
| Activity | Memahami perubahan sensitif | Filter / inspect audit detail |
| Settings | Mengatur bridge dan preference | Save / revoke / reset |
| Morning Briefing | Membaca konteks 24 jam dari source nyata | Refresh / open source data |

## Shell

Desktop mempertahankan rail kiri, topbar utility, breadcrumb, user identity, and connection indicator. Mobile memakai drawer. Setiap navigation item harus memiliki route nyata; item yang belum tersedia tidak boleh tampil sebagai completed feature. Jika route masih planned, tampilkan badge Planned atau sembunyikan dari MVP navigation.

## State Matrix

| State | Visual | Copy rule |
|---|---|---|
| Connected | Mint accent + timestamp | Sebutkan source dan last checked |
| Loading | Skeleton/spinner ringan | Jangan tampilkan angka lama sebagai current |
| Empty | Neutral surface | Jelaskan mengapa belum ada data |
| Unavailable | Amber/neutral warning | Beri langkah install/connect |
| Permission denied | Warning with action | Sebutkan scope atau ownership |
| Error | Red only for actionable failure | Sediakan retry dan detail ringkas |
| Stale | Muted timestamp | Labeli stale secara eksplisit |

## Component Rules

System status card dominan tetapi harus menampilkan source, timestamp, hostname/platform, dan state. Process row wajib menampilkan PID, command, ownership, resource usage, dan action disabled bila tidak allowlisted. File row wajib menampilkan name, size, MIME, modified time, owner context, dan action states. Connection card wajib membedakan agent connector, app OAuth, dan local bridge. Morning Briefing memakai source badge per kartu, memperlihatkan Calendar, Gmail metadata, audit, file metadata, serta snapshot health Linux sebagai sumber terpisah.

## Copy Rules

Hindari `All systems operational` ketika bridge belum terhubung. Gunakan `Linux bridge unavailable`, `Google Calendar not connected`, atau `No activity source connected`. Nama user berasal dari auth session; tanggal berasal dari runtime. Tidak boleh ada event, weather, uptime, kernel, atau activity yang ditulis sebagai contoh.

## Accessibility

Semua icon-only button memiliki accessible name. Confirmation process termination memakai dialog keyboard-accessible dan menjelaskan command, PID, signal, dan risiko. Status tidak disampaikan lewat warna saja. Focus ring terlihat. Loading dan error diumumkan dengan text yang relevan. Reduced motion menonaktifkan animasi non-esensial.

## Responsive Behavior

Pada desktop, shell dan content terlihat bersamaan. Pada tablet, rail dapat menyempit dan grids turun menjadi satu kolom. Pada mobile, drawer menjadi overlay, process table berubah menjadi card list, file metadata turun ke baris kedua, dan confirmation action memenuhi lebar layar. Tidak boleh ada horizontal overflow.

## Visual Tokens

| Token | Value |
|---|---|
| Parchment | `#F4F0E6` |
| Paper | `#FBF9F3` |
| Mint Leaf | `#78C091` |
| Charcoal | `#1F2C26` |
| Amber attention | `#D7A94D` |
| Panel radius | 15px |
| Control radius | 8px |
| Motion | 160–220ms, reduced-motion aware |

## Acceptance

Design dianggap siap diimplementasikan apabila semua P0 page memiliki route, empty/loading/error/unavailable states, keyboard path, mobile behavior, data source label, dan action feedback. Visual polish tidak dapat menggantikan page yang belum memiliki API contract.
