# Mintdesk Runtime Verification Runbook

> **Tujuan.** Verifikasi Mintdesk pada ponsel, Linux laptop, dan Linux server tanpa memberi browser akses ke secret perangkat atau 9router. Bridge observasi tetap read-only. Companion Bun hybrid hanya mengubah teks menjadi **proposal**; perubahan Google selalu berasal dari backend setelah konfirmasi pengguna.

## Status Operasional

| Area | Status kode | Bukti selesai |
|---|---|---|
| Dashboard dan Daily Focus mobile | Web production responsif | Dashboard dan `/briefing` dapat dibuka dari ponsel tanpa secret lokal. |
| Bridge observasi Linux | Node service lokal terpisah | Health, metrics, process, audit, dan Storage observer bekerja melalui loopback. |
| Companion proposal hybrid | Bun service pada laptop dan/atau server | Device terdaftar melakukan polling outbound dan mengembalikan proposal JSON tervalidasi. |
| Action Daily Focus | Preview dan confirmation eksplisit | Task, event baru, Trash Gmail, atau delete event tidak berjalan sebelum konfirmasi. |
| Google Workspace | Re-consent action scope diperlukan | Token memiliki scope Morning Briefing serta scope action yang tercantum pada tabel di bawah. |

## 1. Akses dari Ponsel

Gunakan domain production Mintdesk dari browser ponsel. Ponsel tidak menyimpan `MINTDESK_9ROUTER_TOKEN`, `MINTDESK_DEVICE_SECRET`, atau token bridge. Dari Daily Focus, ponsel hanya mengirim teks ke backend untuk dibuat sebagai job terenkripsi. Laptop atau server yang terdaftar dan online akan memproses job dengan 9router lokal, lalu backend menampilkan preview.

> Jika semua companion offline, Mintdesk tidak membuat fallback AI. Job tetap `queued` atau panel menyatakan unavailable. Anda masih dapat membaca evidence Calendar dan Gmail metadata.

## 2. Bridge Observasi Linux Lama

Bridge Node mempertahankan fungsi observasi lokal dan Storage read-only. Pasang bila Anda memerlukan Dashboard system state, Process control allowlist, atau workdir observer.

```bash
cd /path/to/dashboard-os-linux-mint
node --version
bash companion/install-user-service.sh
```

Edit `~/.config/mintdesk/bridge.env` hanya pada perangkat tersebut.

```bash
MINTDESK_WORKDIR=/media/abelion/Isaf/ican/project
MINTDESK_9ROUTER_URL=http://127.0.0.1:20128/v1
MINTDESK_9ROUTER_TOKEN=PASTE_LOCAL_BEARER_TOKEN
MINTDESK_9ROUTER_MODEL=claude-work
```

Bridge harus tetap bind pada `127.0.0.1`. Jangan memasukkan `MINTDESK_TOKEN` atau token 9router ke chat, deployment, URL browser, atau screenshot.

## 3. Companion Bun Hybrid untuk Laptop dan Server

Pasang companion ini pada Linux laptop, Linux server, atau keduanya. Keduanya dapat terdaftar sebagai device berbeda. Daily Focus memilih device yang Anda pilih di UI; job hanya diproses oleh device tersebut.

```bash
curl -fsSL https://bun.sh/install | bash
cd /path/to/dashboard-os-linux-mint
bun --version
bash companion/install-hybrid-bun-companion.sh
```

Di Daily Focus, pilih **Add a reasoning device**, masukkan nama dan tipe device, lalu simpan credential satu kali ke `~/.config/mintdesk/hybrid-companion.env`:

```bash
MINTDESK_API_BASE_URL=https://mintdash-khcj34hp.manus.space
MINTDESK_DEVICE_ID=PASTE_ONE_TIME_DEVICE_ID
MINTDESK_DEVICE_SECRET=PASTE_ONE_TIME_DEVICE_SECRET
MINTDESK_9ROUTER_URL=http://127.0.0.1:20128/v1
MINTDESK_9ROUTER_TOKEN=PASTE_LOCAL_BEARER_TOKEN
MINTDESK_9ROUTER_MODEL=claude-work
MINTDESK_TIME_ZONE=Asia/Jakarta
```

Aktifkan service user:

```bash
systemctl --user enable --now mintdesk-hybrid-companion.service
systemctl --user status mintdesk-hybrid-companion.service --no-pager
journalctl --user -u mintdesk-hybrid-companion.service -n 50 --no-pager
```

Untuk server tanpa sesi login, aktifkan lingering untuk user service yang menjalankan companion:

```bash
sudo loginctl enable-linger "$USER"
```

Companion melakukan polling HTTPS keluar menuju Mintdesk. Ia tidak membuka port publik, tidak memegang refresh token Google, dan tidak pernah memanggil Google API.

## 4. Daily Focus Action Contract

| Aksi | Asal proposal | Batas | Konfirmasi |
|---|---|---|---|
| Buat Google Task | Teks bebas → 9router lokal → schema | Satu task per proposal | Preview task sebelum create |
| Buat Calendar event | Teks bebas → 9router lokal → schema | Waktu harus lengkap dan tidak ambigu | Preview title, waktu, timezone, dan attendee |
| Hapus Calendar event | Evidence Calendar yang dipilih | Hanya `organizer.self=true` | Preview event spesifik sebelum delete |
| Bersihkan inbox Gmail | Metadata Gmail yang dipilih | Maks. 25 message per action | Pindahkan ke Trash, **bukan** delete permanen |

Proposal memiliki masa berlaku 10 menit. Job yang ditolak, error, atau kedaluwarsa tidak dapat dikonfirmasi. Audit hanya mencatat tipe action, resource ID, status, dan count. Body email, secret device, refresh token, serta raw prompt 9router tidak dicatat dalam audit.

## 5. Re-consent Google Workspace untuk Action Daily Focus

Setelah release capability action, buka **Connections** dari menu profile dan pilih **Reconnect with Daily Focus actions**. Google akan meminta scope berikut. `gmail.compose` tidak pernah diminta kembali.

| Fungsi | Scope |
|---|---|
| Daftar kalender | `https://www.googleapis.com/auth/calendar.calendarlist.readonly` |
| Evidence event Calendar | `https://www.googleapis.com/auth/calendar.events.readonly` |
| Buat dan hapus event milik pengguna | `https://www.googleapis.com/auth/calendar.events.owned` |
| Metadata Gmail untuk evidence | `https://www.googleapis.com/auth/gmail.metadata` |
| Move message terpilih ke Trash | `https://www.googleapis.com/auth/gmail.modify` |
| Create Google Task | `https://www.googleapis.com/auth/tasks` |

Jika consent belum selesai, Morning Briefing tetap read-only dan action panel tetap dapat menampilkan preview. Namun, tombol confirm akan gagal secara eksplisit tanpa menjalankan perubahan apa pun.

## 6. Verification Checklist

1. Dari HP, buka `/briefing` dan pastikan device status tampak online atau offline secara jujur.
2. Kirim satu teks task dengan device laptop online. Pastikan status berubah `queued → processing → ready` dan preview muncul.
3. Tekan **Reject**. Pastikan tidak ada Google action dan audit mencatat rejection.
4. Ulangi dengan event uji, lalu periksa preview sebelum menekan confirmation.
5. Pilih satu metadata Gmail uji. Pastikan preview menyebut **Trash**, bukan permanent delete.
6. Pastikan delete event hanya ditawarkan untuk event dengan organizer akun sendiri.
7. Setelah re-consent, gunakan satu action disposable per provider dan periksa audit tanpa body email atau secret.

## References

[1]: https://bun.com/docs/guides/ecosystem/systemd "Run a Bun application as a systemd service"
[2]: https://developers.google.com/workspace/tasks/auth "Google Tasks authorization"
[3]: https://developers.google.com/workspace/gmail/api/auth/scopes "Gmail API scopes"
[4]: https://developers.google.com/workspace/calendar/api/auth "Calendar API scopes"
