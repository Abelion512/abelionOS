# Mintdesk Runtime Verification Runbook

> **Tujuan.** Dokumen ini membantu memverifikasi tiga hal secara berurutan: Linux companion lokal, File Storage berbasis S3, dan prasyarat OAuth Google Workspace. Jalankan satu tahap sampai terbukti berhasil sebelum melanjutkan ke tahap berikutnya.

## Status yang Perlu Dipahami

| Area | Status kode saat ini | Definisi selesai |
|---|---|---|
| Linux companion | Implemented, belum diuji di laptop Linux pengguna | Service hidup, health/metrics/process/audit memberi respons nyata, dan satu proses disposable dihentikan dengan `SIGTERM` |
| File Storage | Implemented, membutuhkan login dan S3 runtime | File kecil diunggah, muncul pada halaman **Files**, dan tautan `/manus-storage/…` dapat dibuka |
| Google Workspace | Implemented, belum melewati consent pengguna pada runtime ini | OAuth callback berjalan, token refresh tersimpan terenkripsi, dan Morning Briefing mengembalikan Calendar/Gmail metadata nyata atau source state jujur |

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

Route `/api/google/start` dan `/api/google/callback` sudah memakai PKCE dan signed state cookie. Refresh token disimpan per user dalam bentuk terenkripsi AES-256-GCM; token tidak dikirim ke bundle browser. Setelah consent selesai, halaman **Morning Briefing** membuat query on-demand ke Calendar dan Gmail metadata, lalu menampilkan data nyata, `partial`, `unavailable`, atau `error` per sumber. Tidak ada polling cloud berkala dan tidak ada isi email yang dirender.

### 3.2 Konfigurasi Google Cloud

Di Google Cloud Console untuk project Mintdesk:

1. Aktifkan **Google Calendar API** dan **Gmail API**.
2. Konfigurasikan OAuth consent screen. Jika statusnya *Testing*, tambahkan akun Anda sebagai test user.
3. Buat atau perbarui OAuth Client bertipe **Web application**.
4. Tambahkan **dua Authorized redirect URI** berikut pada OAuth client yang memakai Client ID Mintdesk. Tidak boleh ada trailing slash atau domain runtime internal:

```text
https://mintdash-khcj34hp.manus.space/api/google/callback
http://localhost:3000/api/google/callback
```

URI HTTPS pertama dipakai deployment production. URI `localhost` kedua hanya dipakai saat `pnpm run dev` berjalan pada port 3000; Google mengizinkan HTTP hanya untuk localhost. Aplikasi memakai `GOOGLE_OAUTH_REDIRECT_URI` sebagai callback production kanonik dan tetap membentuk callback localhost secara dinamis untuk development.

5. Mintdesk meminta scope berikut sesuai kemampuan yang Anda aktifkan:

| Fitur MVP | Scope |
|---|---|
| Daftar kalender | `https://www.googleapis.com/auth/calendar.calendarlist.readonly` |
| Event kalender | `https://www.googleapis.com/auth/calendar.events.readonly` |
| Metadata Gmail | `https://www.googleapis.com/auth/gmail.metadata` |
| Lifecycle Gmail Draft | `https://www.googleapis.com/auth/gmail.compose` |

Scope `gmail.compose` adalah **restricted scope**. Ia diperlukan Google untuk list, get, create, update, dan delete draft, serta secara teknis juga memberi kemampuan mengirim. Mintdesk rilis awal tidak mengekspos endpoint atau UI send. Review persyaratan OAuth verification dan security assessment Google sebelum aplikasi dipublikasikan kepada pengguna di luar daftar test. [3]

### 3.3 Jalankan consent dan verifikasi

1. Pastikan `GOOGLE_OAUTH_CLIENT_ID` dan `GOOGLE_OAUTH_CLIENT_SECRET` di deployment cocok dengan OAuth client Web application dan redirect URI pada langkah 3.2.
2. Buka `/connections` sebagai user yang sudah sign-in, lalu klik **Connect Google Workspace** atau **Reconnect for Gmail Drafts**. Consent terjadi di Google, bukan di Manus connector. Existing token metadata-only harus diberi consent ulang untuk scope compose.
3. Buka `/drafts`. Pastikan daftar draft nyata muncul atau state error menjelaskan bahwa scope atau API belum tersedia. Buat satu draft disposable, ubah, lalu hapus melalui confirmation dialog. Jangan kirim pesan; Mintdesk tidak menyediakan operasi send.
4. Kembali ke `/briefing` dan klik **Refresh**. Periksa badge source untuk Calendar dan Gmail metadata.
5. Bila consent ditolak, scope kurang, atau refresh token invalid, sumber terkait wajib tampil `unavailable` atau `error`, bukan angka contoh.

Lakukan satu verifikasi Calendar read-only dan satu query Gmail metadata pada akun yang diizinkan. Calendar scope tidak memberi akses Gmail secara otomatis [1].

## Checklist Bukti

| Tahap | Bukti minimum sebelum dianggap selesai |
|---|---|
| Linux companion | `/health`, `/metrics`, `/processes`, dan `/audit` memberi data nyata; satu test `node` dihentikan melalui `SIGTERM` |
| File Storage | File uji kurang dari 8 MB tercantum di Files dan tautan `/manus-storage/…` dapat dibuka setelah login |
| Google OAuth + Drafts | Callback tersedia, token tersimpan server-side, scope diverifikasi, Morning Briefing memberi data nyata atau source state yang benar, dan satu draft disposable dibuat/diubah/dihapus dengan event audit tanpa body tersimpan |

## References

[1]: https://developers.google.com/identity/protocols/oauth2 "Using OAuth 2.0 to Access Google APIs"
[2]: https://developers.google.com/identity/protocols/oauth2/scopes "OAuth 2.0 Scopes for Google APIs"
[3]: https://developers.google.com/workspace/gmail/api/auth/scopes "Choose Gmail API scopes"
