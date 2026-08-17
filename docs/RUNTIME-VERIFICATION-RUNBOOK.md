# Mintdesk Runtime Verification Runbook

> **Tujuan.** Dokumen ini membantu memverifikasi tiga hal secara berurutan: Linux companion lokal, File Storage berbasis S3, dan prasyarat OAuth Google Workspace. Jalankan satu tahap sampai terbukti berhasil sebelum melanjutkan ke tahap berikutnya.

## Status yang Perlu Dipahami

| Area | Status kode saat ini | Definisi selesai |
|---|---|---|
| Linux companion | Implemented, belum diuji di laptop Linux pengguna | Service hidup, health/metrics/process/audit memberi respons nyata, dan satu proses disposable dihentikan dengan `SIGTERM` |
| File Storage | Implemented, membutuhkan login dan S3 runtime | File kecil diunggah, muncul pada halaman **Files**, dan tautan `/manus-storage/…` dapat dibuka |
| Google Workspace | Kredensial diuji, OAuth callback dan adapter belum dibuat | OAuth callback, token storage aman, dan adapter Calendar/Gmail read-only tersedia |

## 1. Uji Linux Companion End-to-End

### 1.1 Dapatkan source proyek di laptop Linux

Karena Manus Desktop belum menyediakan installer Linux, gunakan **Download as ZIP** dari halaman proyek atau clone repository yang berisi source Mintdesk. Ekstrak source lalu buka terminal pada root proyek.

Prasyaratnya adalah **Node.js 20+**, `systemd --user`, dan akses akun Linux biasa. Root tidak diperlukan.

```bash
cd /path/to/dashboard-os-linux-mint
node --version
bash companion/install-user-service.sh
```

Installer menyalin bridge ke `~/.local/share/mintdesk`, membuat token pada `~/.config/mintdesk/bridge.env`, lalu mengaktifkan user service.

### 1.2 Verifikasi service dan endpoint lokal

```bash
systemctl --user status mintdesk-bridge.service --no-pager
journalctl --user -u mintdesk-bridge.service -n 50 --no-pager

TOKEN="$(sed -n 's/^MINTDESK_TOKEN=//p' ~/.config/mintdesk/bridge.env)"
curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/health
curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/v1/metrics
curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/v1/processes
```

Respons `/health` harus memiliki `ok: true`; metrics harus memuat hostname, CPU, memory, uptime, dan timestamp dari laptop; process list harus hanya memuat proses user saat ini. Bridge hanya bind ke `127.0.0.1`, sehingga tidak boleh diubah menjadi `0.0.0.0`.

### 1.3 Hubungkan browser ke bridge

Buka dashboard yang dipublikasikan: `https://mintdash-khcj34hp.manus.space`.

Pada browser **milik Anda sendiri**, buka Developer Tools → Console, lalu jalankan:

```js
localStorage.setItem("mintdesk_bridge_token", "PASTE_TOKEN_DARI_bridge.env")
location.reload()
```

Token ini adalah kontrak browser saat ini. Jangan menyimpannya di komputer bersama, screenshot, URL, repository, atau chat. Setelah reload, halaman **Overview**, **Processes**, dan **Connections** seharusnya berubah dari `unavailable` menjadi status bridge nyata.

Jika domain publik berubah, perbarui `MINTDESK_ALLOWED_ORIGINS` pada `~/.config/mintdesk/bridge.env` agar mencantumkan domain baru, lalu restart service:

```bash
systemctl --user restart mintdesk-bridge.service
```

### 1.4 Uji terminasi dengan proses disposable

Bridge menolak command arbitrary dan hanya mengizinkan command dalam allowlist. Gunakan proses `node` disposable, bukan aplikasi kerja atau proses sistem.

```bash
node -e 'setInterval(() => {}, 600000)' &
TEST_PID=$!
echo "Disposable test PID: ${TEST_PID}"

curl -sS -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"pid\":${TEST_PID}}" \
  http://127.0.0.1:18765/v1/processes/terminate

curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/v1/audit
```

Hasil yang benar adalah respons `SIGTERM` untuk `TEST_PID`, proses berhenti, dan satu event baru muncul pada `/v1/audit` serta halaman **Activity**. Jangan mencoba terminasi PID 1, bridge service, desktop session, network manager, atau command di luar allowlist.

## 2. Uji File Storage S3

### 2.1 Masuk ke aplikasi terlebih dahulu

Halaman **Files** memakai protected tRPC procedures. Jika Anda belum terautentikasi, buka dashboard dari browser dan selesaikan sign-in Manus OAuth sampai Settings menunjukkan `Authenticated`.

### 2.2 Gunakan file uji kecil yang tidak sensitif

Jangan menguji dengan password export, SSH private key, database dump, atau dokumen pribadi. Buat file bukti kecil:

```bash
printf 'mintdesk storage verification %s\n' "$(date --iso-8601=seconds)" > ~/mintdesk-storage-proof.txt
ls -lh ~/mintdesk-storage-proof.txt
```

Pada halaman `/files`, klik **Select file**, pilih file tersebut, dan tunggu hingga status upload selesai.

| Bukti yang diharapkan | Arti |
|---|---|
| Baris file muncul pada **Your files** | Metadata berhasil disimpan dengan ownership user login |
| Ukuran dan MIME type tampil | Browser mengirim metadata yang diterima backend |
| Tombol **Open** membuka path `/manus-storage/…` | Objek berhasil ditulis ke S3 melalui storage helper |
| Tidak ada nilai contoh | Daftar kosong bila belum ada upload nyata |

Penerapan saat ini membatasi file hingga **8 MB**. Jika muncul error ukuran, pilih file lebih kecil. Jika muncul error otorisasi, login belum selesai. Jika muncul `Storage presign failed` atau `Storage upload to S3 failed`, catat pesan lengkap dan jangan menyimpulkan file sudah tersimpan.

## 3. Konfigurasi Google Workspace OAuth Minimal

### 3.1 Batas implementasi saat ini

Kredensial `GOOGLE_OAUTH_CLIENT_ID` dan `GOOGLE_OAUTH_CLIENT_SECRET` telah tervalidasi sebagai client Google yang dikenali, tetapi aplikasi **belum** memiliki route `/api/google/callback`, token storage, refresh-token handler, atau Calendar/Gmail adapter. Menambahkan redirect URI atau scope saja **belum mengaktifkan Gmail dan Calendar pada UI**.

### 3.2 Konfigurasi Google Cloud

Di Google Cloud Console untuk project Mintdesk:

1. Aktifkan **Google Calendar API** dan **Gmail API**.
2. Konfigurasikan OAuth consent screen. Jika statusnya *Testing*, tambahkan akun Anda sebagai test user.
3. Buat atau perbarui OAuth Client bertipe **Web application**.
4. Tambahkan redirect URI persis berikut:

```text
https://mintdash-khcj34hp.manus.space/api/google/callback
```

5. Mulai dari scope read-only paling sempit:

| Fitur MVP | Scope |
|---|---|
| Daftar kalender | `https://www.googleapis.com/auth/calendar.calendarlist.readonly` |
| Event kalender | `https://www.googleapis.com/auth/calendar.events.readonly` |
| Metadata Gmail | `https://www.googleapis.com/auth/gmail.metadata` |

Google merekomendasikan meminta scope sekecil mungkin dan memverifikasi scope yang benar-benar diberikan token sebelum mengaktifkan fitur [1] [2].

### 3.3 Pengembangan yang masih harus dilakukan

Sebelum tombol Connect Google dibuat, implementasikan secara berurutan:

1. Tambahkan `GOOGLE_OAUTH_CLIENT_ID` dan `GOOGLE_OAUTH_CLIENT_SECRET` ke environment helper server, bukan client.
2. Tambahkan `/api/google/start` yang membentuk authorization request dengan `state`, PKCE, scope minimal, dan `access_type=offline`.
3. Tambahkan `/api/google/callback` yang memvalidasi state, menukar authorization code, dan menyimpan refresh token terenkripsi pada database per user.
4. Tambahkan procedure Calendar/Gmail read-only yang memakai token server-side, menangani refresh token, dan mengembalikan `permission required` atau `unavailable` secara jujur.
5. Tambahkan audit event untuk connect, refresh failure, revoke, dan penggunaan data. Jangan tampilkan isi email penuh pada Overview.

Setelah flow tersebut ada, lakukan satu test Calendar read-only dan satu Gmail metadata query. Fitur yang tidak memperoleh scope harus tetap disabled atau unavailable. Google menjelaskan bahwa scope token membatasi resource dan operasi yang dapat diakses; Calendar scope tidak memberikan Gmail access secara otomatis [1].

## Checklist Bukti

| Tahap | Bukti minimum sebelum dianggap selesai |
|---|---|
| Linux companion | `/health`, `/metrics`, `/processes`, dan `/audit` memberi data nyata; satu test `node` dihentikan melalui `SIGTERM` |
| File Storage | File uji kurang dari 8 MB tercantum di Files dan tautan `/manus-storage/…` dapat dibuka setelah login |
| Google OAuth | Callback tersedia, token tersimpan server-side, scope diverifikasi, dan adapter read-only berhasil memberi data nyata |

## References

[1]: https://developers.google.com/identity/protocols/oauth2 "Using OAuth 2.0 to Access Google APIs"
[2]: https://developers.google.com/identity/protocols/oauth2/scopes "OAuth 2.0 Scopes for Google APIs"
