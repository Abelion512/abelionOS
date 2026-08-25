# Mintdesk

**Mintdesk** adalah dashboard operasional personal untuk Linux Mint. Aplikasi ini menyatukan kondisi runtime companion lokal, workdir yang dipantau, koneksi Google Workspace, serta *Daily Focus* berbasis bukti. Mintdesk bukan desktop environment, remote shell, atau agent otonom. Ia adalah lapisan kontrol yang membantu pengguna meninjau konteks, menyiapkan tindakan terbatas, dan mengonfirmasi setiap perubahan berisiko.

> Prinsip operasional: **data deterministik dahulu, rekomendasi lokal hanya atas permintaan, dan manusia selalu memberi konfirmasi sebelum write ke Google Workspace.**

## Status produk

| Area | Implementasi saat ini | Batas penting |
|---|---|---|
| Dashboard | Menampilkan status companion, runtime, proses terkontrol, serta status Google Workspace | Sumber yang tidak tersedia ditandai eksplisit, tidak diganti data contoh |
| Daily Focus | Menggabungkan ringkasan Calendar dan Gmail berbasis evidence | Tidak dijalankan terjadwal; penalaran 9router hanya dipanggil dari companion lokal atas permintaan pengguna |
| Google Workspace | Read Calendar/Gmail, create/delete Calendar yang dimiliki, create Google Tasks, dan pindahkan Gmail ke Trash | Tidak ada Gmail draft atau send; tindakan harus dipreview dan dikonfirmasi manusia |
| Linux companion | Companion Bun melakukan polling outbound, observasi workdir, health, metrics, proses, audit, dan operasi terminate ber-allowlist | Tidak ada akses browser ke secret lokal dan tidak ada shell arbitrer dari dashboard |
| Storage | Metadata workdir `/media/abelion/Isaf/ican/project` ditampilkan lewat companion | Bukan file manager cloud; browser tidak memiliki akses filesystem lokal secara langsung |
| Activity | Audit events aplikasi dan companion dengan detail on-demand | Bukan log collector umum atau sistem SIEM |

## Arsitektur

Mintdesk menggunakan aplikasi web full-stack dan satu companion lokal. Aplikasi web berjalan dengan React 19, TypeScript, Tailwind CSS 4, Wouter, Express, tRPC 11, Drizzle ORM, dan MySQL. Web application dikelola dengan **Bun** sebagai package manager dan runtime. Companion juga menggunakan **Bun** dan sengaja dipisahkan agar akses ke Linux, 9router loopback, serta filesystem tidak ikut berpindah ke deployment web.

```text
Browser (desktop atau mobile)
        │ session authentication + tRPC
        ▼
Mintdesk web app ──────────────── MySQL
        │                              │
        │ OAuth token terenkripsi       ├─ audit events
        ▼                              ├─ Google connection metadata
Google Workspace                    └─ Daily Focus action records

Companion Bun di Linux
        │ polling outbound + device secret
        ▼
Mintdesk companion API
        │
        ├─ observasi health, metrics, proses, dan workdir
        └─ 9router loopback: http://127.0.0.1:20128/v1
```

Browser tidak perlu dapat menjangkau Linux secara langsung. Companion mempertahankan koneksi outbound yang terautentikasi dan hanya dapat menjalankan capability yang telah di-allowlist. Pairing browser-ke-loopback memakai endpoint `127.0.0.1:20129`, sehingga tidak mengekspos credential perangkat ke perangkat lain atau ke halaman yang tidak berasal dari Mintdesk.

## Daily Focus dan Google Workspace

Saat halaman Daily Focus dibuka, Mintdesk mengambil evidence Calendar dan Gmail yang diizinkan lalu menampilkannya sebagai kartu ringkas. Evidence tetap merupakan data yang harus ditinjau pengguna. Jika pengguna meminta refinement, companion lokal dapat meneruskan payload yang sudah disanitasi ke 9router dan hanya menerima JSON terstruktur kembali. Hasil penalaran bukan instruksi yang dieksekusi otomatis.

| Provider | Scope OAuth | Kapabilitas yang digunakan |
|---|---|---|
| Google Calendar | `calendar.calendarlist.readonly`, `calendar.events.readonly`, `calendar.events.owned` | Membaca kalender dan event; membuat atau menghapus hanya event yang dimiliki pengguna dengan guard kepemilikan |
| Gmail | `gmail.metadata`, `gmail.modify` | Mengambil metadata dan excerpt terbatas untuk briefing, lalu memindahkan email yang dipreview ke Trash setelah konfirmasi |
| Google Tasks | `tasks` | Menyiapkan dan membuat task setelah pengguna mengonfirmasi proposal |

Refresh token Google disimpan sebagai ciphertext AES-256-GCM. Flow OAuth memakai PKCE, state bertanda tangan, cookie state berumur pendek, dan callback HTTPS kanonis pada deployment. Memutuskan koneksi Google akan mencoba mencabut token di provider, menghapus koneksi lokal, dan menyimpan audit event. Body Gmail tidak disimpan di database.

## Menggunakan aplikasi

### Menghubungkan Google Workspace

Pengguna harus sudah sign in ke Mintdesk. Dari **Connections** pada menu profil, mulai koneksi Google dan selesaikan consent screen. Jika Google menampilkan `redirect_uri_mismatch`, pastikan redirect URI yang terdaftar di Google Cloud sama persis dengan callback deployment Mintdesk:

```text
https://mintdash-khcj34hp.manus.space/api/google/callback
```

Setelah kembali ke Mintdesk, Dashboard dan Daily Focus akan menampilkan status koneksi serta scopes yang benar-benar diberikan. Putuskan koneksi dari menu yang sama apabila akses tidak lagi diperlukan.

### Memasang Linux companion

Companion dipasang dan dijalankan sebagai user service melalui systemd. Paket companion harus diekstrak dan diinstal dari workdir, bukan dari direktori sementara atau Downloads. Setelah instalasi, lakukan pairing dari Daily Focus agar credential satu-kali tersimpan di `~/.config/mintdesk/hybrid-companion.env` dengan permission `600`.

```bash
cd /media/abelion/Isaf/ican/project
systemctl --user daemon-reload
systemctl --user enable --now mintdesk-hybrid-companion.service
systemctl --user status mintdesk-hybrid-companion.service --no-pager -l
```

Companion akan start ulang bersama user session Linux selama layanan enabled. Untuk memeriksa log tanpa mencetak credential, gunakan:

```bash
journalctl --user -u mintdesk-hybrid-companion.service -n 80 --no-pager
```

Jangan menaruh bearer token 9router, device secret, atau file `hybrid-companion.env` di Git, issue tracker, atau chat. Pairing yang valid menyisakan satu perangkat aktif per jenis device; credential recovery lama diarsipkan.

### Menjalankan Daily Focus

Daily Focus dapat digunakan dari desktop maupun ponsel. Pada ponsel, briefing dan Google action review tetap dapat dipakai, tetapi pairing ke `127.0.0.1` hanya relevan pada browser Linux yang menjalankan companion. Format Calendar eksplisit berikut dapat diparse secara deterministik tanpa menunggu penalaran lokal:

```text
Title: Review proposal
Start: 2026-08-19T09:00:00+07:00
End: 2026-08-19T09:30:00+07:00
Timezone: Asia/Jakarta
```

Setiap proposal action memiliki masa berlaku, preview, riwayat audit, serta tombol konfirmasi atau penolakan. Calendar delete dibatasi oleh ownership guard. Gmail cleanup memindahkan pesan ke Trash dan bukan menghapus permanen.

## Pengembangan lokal

Panduan sinkronisasi yang aman dari checkpoint Mintdesk ke clone Linux lokal tersedia di [docs/LOCAL-LINUX-SYNC.md](./docs/LOCAL-LINUX-SYNC.md). Panduan tersebut membedakan pekerjaan UI lokal dari environment production serta companion Bun yang tetap berjalan terpisah.

## Notifikasi kustom

Mintdesk menyediakan **inbox notifikasi user-scoped** yang dapat dibuka dari kontrol bell di shell aplikasi. Inbox hanya mencatat event operasional nyata dan tidak diisi dengan data contoh. Event saat ini berasal dari proposal Daily Focus yang siap atau gagal, action Daily Focus yang selesai setelah konfirmasi, companion Linux yang kembali online atau terobservasi offline, serta koneksi atau disconnect Google Workspace.

Pengaturan berada di **Settings**. Pengguna dapat mematikan inbox secara keseluruhan atau per kategori Daily Focus, Linux companion, dan Google Workspace. Browser alerts bersifat opt-in: aplikasi baru memanggil `Notification.requestPermission()` setelah pengguna menyalakan kontrol tersebut. Tidak ada polling server, cron, background AI, ataupun alert yang dikirim ketika Mintdesk tertutup. Saat izin browser tidak tersedia atau ditolak, inbox in-app tetap menjadi fallback.

| Data yang masuk notifikasi | Data yang dilarang masuk notifikasi |
|---|---|
| Status operasional, jenis resource, dan hasil action | Isi Gmail, refresh token, device secret, payload provider, prompt mentah, atau output AI mentah |

Menandai item sebagai read hanya mengubah state inbox milik pengguna yang sedang sign in. Preference notifikasi tidak pernah memberi izin baru untuk melakukan write ke Google Workspace.

### Prasyarat

| Komponen | Versi atau penggunaan |
|---|---|
| Node.js | 22 atau kompatibel dengan toolchain proyek |
| Bun | Package manager dan runtime untuk web application serta Linux companion |
| MySQL | Database aplikasi pada environment yang dikelola |

```bash
git clone <repository-url>
cd dashboard-os-linux-mint
bun install
bun run dev
```

Variabel environment dikelola oleh platform. Jangan membuat atau meng-commit `.env` berisi credential. Jika mengubah schema, lakukan urutan berikut:

```bash
bunx drizzle-kit generate
# Baca migration SQL yang dihasilkan, lalu aplikasikan melalui workflow database terkelola.
bun test
bunx tsc --noEmit
bun run build
```

## Validasi wajib

Perubahan dianggap siap checkpoint hanya bila test, typecheck, build, dan verifikasi visual yang relevan lulus. Komponen interaktif harus memiliki regression test yang mencakup state loading, unavailable/error, serta aksi yang mengubah state. Perubahan UI juga diverifikasi pada desktop dan viewport mobile 375px.

```bash
bun test
bunx tsc --noEmit
bun run build
```

## Workflow GitHub

Gunakan alur ini agar perubahan lokal dan perubahan yang dikerjakan agent tidak saling menimpa:

1. Buat perubahan lokal pada branch yang disepakati.
2. Jalankan test, typecheck, dan build secara lokal.
3. Commit perubahan dengan pesan yang menjelaskan intent dan risiko.
4. Push ke GitHub hanya setelah persetujuan pemilik repository.
5. Minta agent menyinkronkan checkpoint sebelum pekerjaan lanjutan atau verifikasi.

Jangan gunakan `git reset --hard` untuk memulihkan aplikasi yang terhubung ke deployment. Gunakan mekanisme rollback checkpoint agar code, dependency, dan metadata proyek kembali konsisten.

## Guardrail keamanan

Mintdesk dirancang untuk mengurangi blast radius, bukan memberikan otomasi tanpa batas. Ia tidak boleh menjalankan agent-to-agent workflow di luar Daily Focus, melakukan Google write tanpa konfirmasi manusia, mengakses filesystem browser secara arbitrer, menampilkan token, atau mengirim body Gmail ke database. Detail implementasi dan aturan kontribusi wajib ada di [AGENTS.md](./AGENTS.md).

## Referensi desain

UI Mintdesk mengikuti prinsip minimising chrome dan disclosure bertahap: navigasi inti di sidebar, detail audit melalui dialog, dan metadata Storage dipaginasi di popup. Rujukan desain utamanya adalah [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/), [Radix UI](https://www.radix-ui.com/), dan [shadcn/ui](https://ui.shadcn.com/). Taste Skill dipasang sebagai helper audit anti-template, tetapi diterapkan secara kontekstual karena Mintdesk adalah dashboard operasional, bukan landing page. Guardrail lengkap tersedia di [docs/ANTI-SLOP-GUARDRAILS.md](./docs/ANTI-SLOP-GUARDRAILS.md).
