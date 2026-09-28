# Companion AbelionOS (Bun)

Companion di laptop Linux melaporkan **metadata operasional agregat** ke
AbelionOS via **polling outbound** — tanpa port inbound, tanpa tunnel, browser
tidak pernah berbicara ke laptop. Capability persis
[design doc §4](../docs/COMPANION-PAIRING-DESIGN.md) (disetujui pemilik
2026-09-27): health (uptime, load), metadata workdir canonical
`/media/abelion/Isaf/ican/project` (jumlah entri + total bytes, tanpa nama
file), dan jumlah event audit lokal. Tidak ada kontrol eksekusi dari web.

## Pairing (dipimpin laptop — pemegang kunci)

1. **Browser** — Settings → Companion → "Pasangkan perangkat": tulis nama,
   pilih tipe, daftarkan (pairing code TTL 10 menit dibuat otomatis).
2. **Laptop** — jalankan perintah yang ditampilkan dialog, atau:

   ```bash
   bun run companion/pair.ts \
     --endpoint https://charming-firefly-655.convex.site \
     --code ABCD2345 \
     --name "Laptop Kantor" \
     --type laptop
   ```

   Pairing code = yang dibuat browser di langkah 1. Skrip membuat keypair
   Ed25519, menandatangani code, dan menerima `deviceSecret` **sekali** —
   disimpan di `~/.config/mintdesk/companion.env` (chmod 600).

   Jalur `companion/pair.ts` bersifat relatif — perintah di atas harus
   dijalankan dari **akar repo abelionOS yang di-clone** di laptop (dari
   `~` atau folder lain muncul `error: Module not found "companion/pair.ts"`).
   Tidak ingin clone repo? Kedua skrip zero-dependency: lihat
   [Pasang tanpa clone repo](#pasang-tanpa-clone-repo) di bawah.

3. **Heartbeat** — jalankan terus di laptop:

   ```bash
   bun run companion/heartbeat.ts
   ```

Satu device aktif per tipe: memasangkan laptop baru mengarsipkan credential
laptop lama secara otomatis (riwayat tetap di audit).

**Urutan wajib:** daftarkan device di browser (Langkah 1) *sebelum* menjalankan
perintah laptop (Langkah 2). Nama di perintah harus sama dengan nama yang
didaftarkan; dialog Settings menyediakan tombol **Salin perintah** supaya
perintah tersalin utuh.

## Pasang tanpa clone repo

Kedua skrip hanya memakai modul bawaan (`node:crypto`, `node:fs`, `node:os`,
`node:path`) — tidak perlu `bun install` maupun clone penuh.

**Opsi A — unduh 2 file (dianjurkan):** file terlihat dan bisa dibaca dulu
sebelum dieksekusi — untuk skrip yang menulis kredensial ini sedikit lebih
disiplin.

```bash
mkdir -p ~/mintdesk-companion && cd ~/mintdesk-companion
curl -fsSL -o pair.ts      https://raw.githubusercontent.com/Abelion512/abelionOS/main/companion/pair.ts
curl -fsSL -o heartbeat.ts https://raw.githubusercontent.com/Abelion512/abelionOS/main/companion/heartbeat.ts
bun pair.ts \
  --endpoint https://charming-firefly-655.convex.site \
  --code ABCD2345 --name "Laptop Kantor" --type laptop
bun heartbeat.ts   # setelah claim sukses — polling tiap 20 detik
```

**Opsi B — langsung dari URL, tanpa file:**

```bash
bun run https://raw.githubusercontent.com/Abelion512/abelionOS/main/companion/pair.ts \
  --endpoint https://charming-firefly-655.convex.site \
  --code ABCD2345 --name "Laptop Kantor" --type laptop
```

Kedua opsi selalu mengambil versi terakhir di `main`. Kredensial ditulis ke
`~/.config/mintdesk/` terlepas dari lokasi skrip — clone repo penuh kemudian
langsung bisa menjalankan `bun run companion/heartbeat.ts` tanpa pair ulang.

## Diagnosa cepat (error CLI)

| Gejala di terminal | Penyebab | Tindakan |
|---|---|---|
| `error: Module not found "companion/pair.ts"` | skrip dijalankan dari luar akar repo (mis. dari `~`) — jalur relatif CWD | `cd` ke akar repo yang di-clone, atau pakai seksi **Pasang tanpa clone repo** |
| `Argumen --code wajib` lalu `--code: command not found` | perintah tersalin terpotong (baris continuation hilang) | salin ulang lewat tombol **Salin perintah** di dialog, tempel sebagai satu blok |
| `Claim gagal: HTTP 401 invalid_code` | pairing code sudah lewat 10 menit atau sudah dipakai (single-use) | buat code baru di Settings → Companion, ulangi Langkah 1–2 |
| `Claim gagal: HTTP 404 no_pending_device` | Langkah 1 (daftar device) belum dijalankan, atau `--type` berbeda dari yang didaftarkan | daftarkan dulu di dialog Settings dengan tipe yang sama |
| `Claim gagal: HTTP 401 bad_signature` | file kunci lokal berubah/rusak | hapus `~/.config/mintdesk/companion-<tipe>.key`, jalankan ulang (kunci baru dibuat otomatis) |
| `Tidak bisa menghubungi <endpoint>` | `--endpoint` salah atau jaringan | endpoint = Convex **site** (`https://<deployment>.convex.site`), bukan domain aplikasi web |
| heartbeat `Secret ditolak (401 …)` | credential lama diarsipkan (device bertipe sama dipasangkan ulang) | jalankan `pair.ts` lagi untuk tipe itu, lalu `heartbeat.ts` |
| heartbeat `gagal: HTTP 400 bad_payload` | payload di luar allowlist capability (§4) | jangan menambah field pada payload; laporkan bila terjadi tanpa perubahan payload |
| Dashboard menampilkan load `0.00` | (sudah diperbaiki) `Bun.os.loadavg` tidak ada | `heartbeat.ts` kini memakai `loadavg()` dari `node:os` |

## Batas keamanan

- Device secret disimpan **hashed** server-side; plaintext hanya di file lokal.
- Private key Ed25519 tidak pernah keluar laptop; server hanya memverifikasi.
- Payload heartbeat di-clamp server (`companionLogic.parseHeartbeatPayload`);
  field di luar allowlist **ditolak**, bukan diabaikan.
- Perubahan capability = amendment AGENTS.md + persetujuan pemilik.
