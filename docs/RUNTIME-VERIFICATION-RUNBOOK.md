# Mintdesk Runtime Verification Runbook

> **Tujuan.** Runbook ini memverifikasi Linux companion lokal, Storage observer read-only, 9router untuk Daily Focus, dan OAuth Google least-privilege. Jalankan setiap tahap sampai terbukti, lalu lanjutkan ke tahap berikutnya. Tidak ada tahap yang mengizinkan upload, perubahan file, pengiriman Gmail, perubahan Calendar, atau tindakan otomatis oleh AI.

## Status Operasional

| Area | Status kode | Bukti selesai |
|---|---|---|
| Linux companion | Diimplementasikan, perlu dipasang pada laptop Linux | Health, metrics, process, audit, Storage observer, dan Daily Focus proxy memberi respons lokal nyata. |
| Storage observer | Metadata-only pada workdir allowlisted | Path, kapasitas mount, dan daftar entry top-level muncul tanpa kemampuan baca isi, upload, download, atau modifikasi. |
| Daily Focus | Evidence-first, refinement eksplisit | Bukti Calendar/Gmail metadata/audit tampil; 9router hanya dipanggil setelah pengguna memilih **Refine priorities**. |
| Google Workspace | OAuth read-only, token lama perlu re-consent | Connections tidak lagi menunjukkan `gmail.compose`; Morning Briefing memakai metadata Calendar dan Gmail saja. |

## 1. Pasang dan Verifikasi Linux Companion

Karena Manus Desktop belum menyediakan installer Linux, ambil source Mintdesk dari proyek lalu jalankan installer dari root proyek. Prasyaratnya adalah Node.js 20+, `systemd --user`, dan akun Linux biasa. Root tidak diperlukan.

```bash
cd /path/to/dashboard-os-linux-mint
node --version
bash companion/install-user-service.sh
```

Installer menyalin bridge ke `~/.local/share/mintdesk`, membuat `~/.config/mintdesk/bridge.env`, dan mengaktifkan user service. Buka file environment tersebut lalu set workdir dan konfigurasi 9router pada perangkat lokal saja.

```bash
MINTDESK_WORKDIR=/media/abelion/Isaf/ican/project
MINTDESK_9ROUTER_URL=http://127.0.0.1:20128/v1
MINTDESK_9ROUTER_TOKEN=PASTE_LOCAL_BEARER_TOKEN
MINTDESK_9ROUTER_MODEL=claude-work
```

> Nilai `MINTDESK_9ROUTER_TOKEN` dan `MINTDESK_TOKEN` adalah secret lokal. Jangan memasukkannya ke chat, repository, browser URL, screenshot, atau deployment Mintdesk.

Restart service dan verifikasi endpoint hanya pada loopback.

```bash
systemctl --user restart mintdesk-bridge.service
systemctl --user status mintdesk-bridge.service --no-pager
journalctl --user -u mintdesk-bridge.service -n 50 --no-pager

TOKEN="$(sed -n 's/^MINTDESK_TOKEN=//p' ~/.config/mintdesk/bridge.env)"
curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/health
curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/v1/metrics
curl -sS -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:18765/v1/storage/workdir
```

Respons health harus memiliki `ok: true`. Endpoint Storage hanya boleh melaporkan metadata entry yang berada langsung dalam `MINTDESK_WORKDIR` dan statistik kapasitas mount. Bridge harus tetap bind ke `127.0.0.1`; jangan mengubahnya menjadi `0.0.0.0`.

## 2. Hubungkan Browser dan Uji Batas Bridge

Buka dashboard production di browser milik Anda sendiri. Masukkan token bridge yang telah dibuat secara lokal melalui Console browser, lalu reload sekali.

```js
localStorage.setItem("mintdesk_bridge_token", "PASTE_TOKEN_DARI_bridge.env")
location.reload()
```

Halaman **Dashboard**, **Storage**, **Activity**, dan **Connections** harus beralih dari unavailable ke state lokal yang nyata. Bila domain publik berubah, tambahkan domain baru ke `MINTDESK_ALLOWED_ORIGINS` pada `bridge.env`, lalu restart service. Jangan menyimpan token pada komputer bersama.

Untuk menguji Process control, gunakan proses disposable yang termasuk allowlist. Jangan menggunakan proses kerja atau sistem.

```bash
node -e 'setInterval(() => {}, 600000)' &
TEST_PID=$!
curl -sS -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"pid\":${TEST_PID}}" \
  http://127.0.0.1:18765/v1/processes/terminate
```

Respons yang benar adalah `SIGTERM` untuk `TEST_PID`. Jangan mencoba terminasi PID 1, bridge service, desktop session, network manager, atau command di luar allowlist.

## 3. Verifikasi Daily Focus dan 9router

Daily Focus selalu membangun evidence terlebih dahulu dari Calendar read-only, Gmail metadata tanpa body, dan audit aplikasi yang didukung. Jejak historis `gmail.draft.*` tidak dikirim sebagai evidence. Pilih **Refine priorities** hanya bila Anda ingin reasoning lokal; Mintdesk tidak menjalankan AI terjadwal dan tidak menyimpan respons AI mentah.

| Kondisi | Perilaku yang benar |
|---|---|
| Companion atau 9router offline | Evidence tetap tampil dan panel menyatakan local reasoning unavailable. Tidak ada rekomendasi fallback. |
| 9router merespons | Hanya JSON tervalidasi dengan `evidenceRefs` yang benar dapat dirender. |
| Pengguna menandai done/deprioritized | Override hanya terjadi di browser. Tidak mengubah Google, Linux, atau evidence asal. |

## 4. Re-consent Google Workspace dengan Scope Read-Only

Halaman **Connections** akan menampilkan **re-consent required** jika token yang tersimpan masih memuat `https://www.googleapis.com/auth/gmail.compose`. Token itu berasal dari capability Drafts yang telah dicabut. Mintdesk tidak lagi mengekspos route Draft atau meminta scope tersebut, tetapi scope lama tidak dapat dicabut dari token secara otomatis.

1. Buka [Google Account permissions](https://myaccount.google.com/permissions) pada akun `agen.salva@gmail.com`.
2. Pilih akses Mintdesk, lalu pilih **Remove access**.
3. Kembali ke `/connections` dan klik **Connect Google Workspace**.
4. Selesaikan consent hanya untuk scope berikut, kemudian buka `/briefing` dan pilih **Refresh sources**.

| Fitur MVP | Scope |
|---|---|
| Daftar kalender | `https://www.googleapis.com/auth/calendar.calendarlist.readonly` |
| Event kalender | `https://www.googleapis.com/auth/calendar.events.readonly` |
| Metadata Gmail | `https://www.googleapis.com/auth/gmail.metadata` |

Mintdesk tidak meminta `gmail.compose`, `gmail.modify`, atau `gmail.full_access`. Bila satu sumber tidak dapat direfresh, Daily Focus harus tetap memperlihatkan state `unavailable`, `partial`, atau `error`, bukan nilai contoh.

## References

[1]: https://developers.google.com/identity/protocols/oauth2 "Using OAuth 2.0 to Access Google APIs"
[2]: https://developers.google.com/identity/protocols/oauth2/scopes "OAuth 2.0 Scopes for Google APIs"
