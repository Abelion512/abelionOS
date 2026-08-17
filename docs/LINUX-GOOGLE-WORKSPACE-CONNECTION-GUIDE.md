# Panduan Koneksi Dashboard OS Linux Mint

## 1. Status Implementasi Saat Ini

Dashboard menggunakan arsitektur **opsi A**: web dashboard + Linux companion lokal. Web dashboard berjalan sebagai aplikasi full-stack. Companion lokal berjalan di laptop Linux melalui `systemd --user`, hanya bind ke `127.0.0.1`, dan memakai bearer token lokal.

Koneksi Gmail dan Google Calendar memang terlihat sebagai connector yang aktif pada sesi Manus. Namun, verifikasi langsung melalui Google Workspace CLI pada 17 Agustus 2026 mengembalikan `403 insufficientPermissions` untuk Gmail profile dan Calendar list. Artinya, connector agent tersedia, tetapi token CLI yang tersedia belum memiliki OAuth scopes yang dibutuhkan. Aplikasi tidak boleh menganggap Gmail atau Calendar sudah terhubung hanya berdasarkan label connector.

> Prinsip no-vaporware: jika provider belum mengembalikan data nyata, UI harus menampilkan `Connection unavailable` atau `Permission required`, bukan data contoh.

## 2. Arsitektur Opsi A

```text
Linux laptop
  ├── mintdesk-bridge.mjs
  │   ├── GET /health
  │   ├── GET /v1/metrics
  │   ├── GET /v1/processes
  │   └── POST /v1/processes/terminate
  └── systemd --user
          ↓ localhost + bearer token
Web dashboard / full-stack server
          ↓ authenticated API boundary
Dashboard UI

Google Workspace
  ├── Gmail connector / OAuth scopes
  └── Calendar connector / OAuth scopes
          ↓ server-side adapter, never browser-direct
Dashboard UI
```

Companion Linux tidak membutuhkan root dan tidak seharusnya bind ke `0.0.0.0`. Pembatasan ini mengurangi permukaan serangan. Web dashboard harus berbicara ke companion melalui API boundary yang diautentikasi; browser tidak boleh diberi kemampuan untuk mengirim perintah arbitrary shell.

## 3. Persyaratan Laptop Linux

| Komponen | Persyaratan |
|---|---|
| OS | Linux desktop dengan systemd user session |
| Runtime | Node.js 20 atau lebih baru |
| Akses | User account biasa; root tidak diperlukan |
| Port lokal | `127.0.0.1:18765` |
| Browser | Browser modern untuk membuka dashboard |
| Workspace | OAuth token dengan scopes Gmail/Calendar yang sesuai |

Manus Desktop tidak diperlukan untuk menjalankan companion. Karena Manus Desktop belum menjadi jalur instalasi Linux yang tersedia pada sesi ini, installer disediakan agar pengguna dapat menjalankannya langsung dari terminal Linux setelah folder proyek tersedia.

## 4. Instalasi Linux Companion

Dari root proyek, jalankan:

```bash
cd /path/to/dashboard-os-linux-mint
bash companion/install-user-service.sh
```

Installer akan menyalin bridge ke `~/.local/share/mintdesk`, membuat token acak di `~/.config/mintdesk/bridge.env`, memasang service di `~/.config/systemd/user/`, lalu mengaktifkan service untuk user saat login.

Verifikasi service:

```bash
systemctl --user status mintdesk-bridge.service
journalctl --user -u mintdesk-bridge.service -f
```

Verifikasi health endpoint:

```bash
TOKEN="$(sed -n 's/^MINTDESK_TOKEN=//p' ~/.config/mintdesk/bridge.env)"
curl -sS \
  -H "Authorization: Bearer ${TOKEN}" \
  http://127.0.0.1:18765/health
```

Response yang benar harus menunjukkan `ok: true`, `service: mintdesk-bridge`, dan versi bridge. Jika response `401`, token pada request tidak sama dengan token service. Jika connection refused, periksa status `systemctl --user` dan journal.

## 5. Auto-start dan Beban Resource

Service dijalankan sebagai user service, bukan root daemon. `Restart=on-failure` digunakan agar service pulih dari crash, sedangkan `RestartSec=3` mencegah restart loop agresif. Bridge hanya melakukan pengukuran CPU singkat, membaca `/proc` melalui `ps`, dan menunggu request dari dashboard. Ia tidak melakukan polling cloud, tidak menjalankan scheduler berat, dan tidak mengirim telemetry tanpa request.

Untuk menjalankan service bahkan ketika user belum membuka desktop session, pengguna dapat mengaktifkan lingering secara sadar:

```bash
loginctl enable-linger "$USER"
```

Untuk laptop pribadi, default yang disarankan adalah tidak mengaktifkan lingering terlebih dahulu dan membiarkan service hidup ketika user login. Nonaktifkan jika tidak diperlukan:

```bash
loginctl disable-linger "$USER"
```

## 6. Metrics Nyata

Endpoint `/v1/metrics` membaca hostname, platform, arsitektur, CPU utilization dari dua snapshot CPU, memory dari runtime OS, uptime, load average, dan timestamp. Tidak ada nilai fallback yang ditulis sebagai data sistem.

Contoh request:

```bash
curl -sS \
  -H "Authorization: Bearer ${TOKEN}" \
  http://127.0.0.1:18765/v1/metrics
```

Jika metrics tidak tersedia, dashboard harus menampilkan status unavailable dengan waktu pemeriksaan terakhir, bukan angka nol yang dapat disalahartikan sebagai kondisi sehat.

## 7. Process Listing dan Kill Process

Endpoint `/v1/processes` hanya mengembalikan proses milik user yang menjalankan bridge. Setiap item memiliki PID, command, CPU, memory, user, state, elapsed time, dan flag `canTerminate`.

Terminasi proses menggunakan `SIGTERM`, bukan `SIGKILL`, agar aplikasi memiliki kesempatan menutup file dan state dengan baik. Bridge memblokir proses sistem, init, display server, network manager, audio stack, polkit, dan dirinya sendiri. Dashboard wajib menampilkan nama command, PID, user, dan peringatan sebelum mengirim terminasi.

Request terminasi:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"pid":12345}' \
  http://127.0.0.1:18765/v1/processes/terminate
```

PID harus diperoleh dari daftar proses terbaru, dimiliki oleh current user, bukan proses protected, dan dikonfirmasi pengguna. Fitur ini tidak boleh menerima command string, path executable, atau shell expression. Jika proses membutuhkan privilege root, bridge menolak dan pengguna harus memakai mekanisme OS yang sesuai secara manual.

## 8. Google Workspace: Kondisi Koneksi

Connector Gmail dan Google Calendar sudah aktif pada sesi Manus dengan akun `agen.salva@gmail.com`, dan tool agent untuk search Gmail serta search Calendar tersedia. Namun, akses aplikasi CLI yang diverifikasi gagal dengan `403 insufficientPermissions`. Dua jalur ini berbeda:

| Jalur | Status | Makna |
|---|---|---|
| Connector agent Manus | Tersedia | Agent dapat memakai tool connector sesuai izin sesi |
| Google Workspace CLI token | Belum cukup scope | CLI tidak boleh dianggap dapat membaca Gmail/Calendar |
| Web dashboard | Belum terhubung otomatis | Aplikasi tidak dapat memanggil connector Manus secara langsung |

Web dashboard hanya boleh memakai Workspace data setelah salah satu adapter resmi berikut disiapkan: OAuth web-server pada backend aplikasi, atau local `gws` adapter yang sudah diautentikasi di laptop dan dipanggil melalui companion. Token tidak boleh ditaruh di `client/`, browser localStorage, URL, atau repository.

## 9. Scope Minimum yang Disarankan

Google merekomendasikan meminta scope paling sempit yang diperlukan dan memeriksa scope yang benar-benar diberikan oleh access token sebelum mengaktifkan fitur [1] [2]. Untuk read-only dashboard, mulai dari:

| Fitur | Scope awal |
|---|---|
| Membaca event Calendar | `https://www.googleapis.com/auth/calendar.events.readonly` |
| Membaca daftar kalender | `https://www.googleapis.com/auth/calendar.calendarlist.readonly` |
| Membaca Gmail metadata/search | Pilih scope Gmail readonly yang sesuai dengan method yang dipakai |

Jangan meminta `calendar` penuh jika hanya menampilkan agenda. Jangan mengaktifkan kirim email atau edit/delete event sebelum ada requirement eksplisit, confirmation UI, dan audit trail. Google Calendar mendokumentasikan perbedaan scope read-only dan read/write pada daftar scope resminya [3].

## 10. Prosedur Re-auth Google Workspace

1. Buka Google Cloud Console dan pilih project yang digunakan oleh aplikasi.
2. Pastikan Gmail API dan Google Calendar API diaktifkan.
3. Periksa OAuth consent screen dan tambahkan scope minimum yang benar-benar diperlukan.
4. Perbarui OAuth client sesuai platform. Untuk backend web gunakan Web application client; untuk companion desktop gunakan Desktop application client sesuai panduan Google [1].
5. Jalankan ulang proses authorization dengan `access_type=offline` bila aplikasi membutuhkan refresh token yang aman di backend.
6. Setelah consent berhasil, periksa scopes yang dikembalikan token. Fitur yang scope-nya tidak diberikan harus tetap disabled.
7. Uji endpoint read-only sebelum mengaktifkan aksi tulis.

Google menjelaskan bahwa access token hanya berlaku untuk resource dan operasi yang tercakup oleh scope yang diberikan; token Calendar tidak otomatis memberikan akses ke Gmail [1].

## 11. Operasi Workspace yang Diizinkan pada MVP

MVP hanya boleh membaca data yang diperlukan untuk dashboard. Gmail dibatasi untuk jumlah kecil metadata atau search result, tanpa menampilkan isi email penuh di halaman utama. Calendar dibatasi untuk event pada rentang waktu dashboard, dengan fallback unavailable ketika izin atau token tidak tersedia.

Aksi kirim email, membuat event, mengubah event, menghapus event, mengelola label, atau menghapus file tidak termasuk MVP. Semua aksi tulis memerlukan confirmation di UI. Penghapusan permanen harus dilarang; gunakan trash/archive bila fitur tersebut nantinya dibutuhkan.

## 12. Troubleshooting

| Gejala | Penyebab mungkin | Tindakan |
|---|---|---|
| `403 insufficientPermissions` | Scope token tidak cukup | Re-authorize dengan scope minimum yang diperlukan |
| `401 Unauthorized` dari bridge | Bearer token salah | Baca token dari `bridge.env`, jangan membuat token manual pendek |
| `Origin not allowed` | Origin dashboard belum di-allowlist | Tambahkan origin eksplisit di `MINTDESK_ALLOWED_ORIGINS` |
| `connection refused` | Service belum aktif | Cek `systemctl --user status` dan journal |
| Metrics unavailable | Companion tidak terpasang atau mati | Tampilkan state unavailable dan minta user menyalakan service |
| Process cannot terminate | Protected, bukan milik user, atau sudah berhenti | Jangan bypass guardrail dengan root dari dashboard |

## 13. Referensi

[1]: https://developers.google.com/identity/protocols/oauth2 "Using OAuth 2.0 to Access Google APIs"
[2]: https://developers.google.com/identity/protocols/oauth2/scopes "OAuth 2.0 Scopes for Google APIs"
[3]: https://developers.google.com/workspace/calendar/api/auth "Choose Google Calendar API scopes"
