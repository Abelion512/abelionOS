# Rancangan Companion Bun + Pairing UI (DRAFT — menunggu persetujuan pemilik)

> Status: **desain, belum diimplementasi.** Sesuai AGENTS.md, capability baru
> (endpoint pairing, tabel device, command companion) hanya boleh dibangun
> setelah pemilik menyetujui daftar capability dan batasnya di dokumen ini.
> Jangan mulai implementasi sebelum item di todo.md ditandai disetujui.

## 1. Tujuan dan batas

Companion Bun di laptop Linux melaporkan metadata operasional (status, workdir
canonical `/media/abelion/Isaf/ican/project`, health ringkas) ke backend Convex
melalui **polling outbound** — tanpa port inbound, tanpa tunnel, tanpa remote
shell. Browser **tidak pernah** berbicara langsung ke laptop.

Dilarang (tetap, tidak diubah dokumen ini): mengeksekusi command dari web,
membaca file di luar metadata workdir, mengirim body Gmail/token, atau
memperkenalkan capability eksekusi proses apa pun di luar allowlist yang sudah
ada di AGENTS.md.

## 2. Model pairing (satu device aktif per tipe)

Pairing dipimpin **dari laptop** (pemegang kunci), bukan dari browser — supaya
device secret tidak pernah melewati halaman web:

1. Pemilik menjalankan `mintdesk-companion pair --endpoint <CONVEX_CLOUD_URL>`
   di laptop. Companion membuat keypair lokal (mis. Ed25519 via `node:crypto`)
   dan **menampilkan pairing code 8 karakter** di terminal.
2. Browser (Settings → Companion → "Pasangkan perangkat"): pemilik mengetik
   pairing code. UI memanggil mutation `companion.registerDevice` dengan
   `{ code, name, type: "laptop" | "server" }`.
3. Backend memverifikasi code (tabel `pairingCodes`, TTL 10 menit, single-use)
   lalu menyimpan device: `deviceId`, publicKey, name, type, status `pending`.
4. Companion polling `companion.claimApproval` dengan menandatangani nonce —
   begitu disetujui, backend mengembalikan `deviceSecret` **sekali** (hashed
   server-side, sesuai kebijakan existing). Companion menyimpannya di
   `~/.config/mintdesk/companion.env` chmod 600.
5. Heartbeat berikutnya memakai device secret → status `online`. Kebijakan satu
   device aktif per tipe ditegakkan di mutation (heartbeat valid mengarsipkan
   credential lama bertipe sama — guard existing dipertahankan).

## 3. Endpoint dan tabel baru (proposal)

| Nama | Jenis | Isi | Guard |
|---|---|---|---|
| `companion.createPairingCode` | mutation (user-scoped) | insert `pairingCodes` {code hash, TTL 10 mnt} | `requireUserId`, maks 3 code aktif |
| `companion.registerDevice` | mutation (user-scoped) | insert `devices` {publicKey, name, type, status pending} | verifikasi code hash, single-use |
| `companion.claimApproval` | httpAction publik (signed) | verifikasi signature nonce → kembalikan secret sekali | nonce + Ed25519 signature, rate-limit per IP |
| `companion.heartbeat` | httpAction publik (signed) | update `deviceStates` + insert `agentObservations` | device secret hash compare, allowlist payload |
| `devices` | tabel | satu baris per device (bukan per heartbeat) | `by_user`, unique per (user, type) aktif |
| `pairingCodes` | tabel | code hash, userId, expiresAt | prune di retention run |

Semua endpoint baru **read/write metadata saja**; tidak ada field payload
bebas. `agentObservations`/`deviceStates` yang sudah ada dipakai ulang —
companion hanya menjadi penulis kedua di samping `recordObservation` internal.

## 4. Capability companion (allowlist, tidak diperluas)

| Capability | Sumber data | Frekuensi |
|---|---|---|
| health | uptime, load avg (1/5/15) | tiap heartbeat |
| workdir metadata | jumlah entri + total size `/media/abelion/Isaf/ican/project` (tanpa nama file sensitif — hanya angka agregat) | tiap heartbeat |
| audit-local | jumlah event audit companion lokal sejak heartbeat lalu | tiap heartbeat |

Dilarang: daftar proses detail, isi file, network snapshot, environment variable,
atau path lain di luar workdir canonical. Perubahan capability = amendment
AGENTS.md + persetujuan baru.

## 5. UI pairing (Settings → Companion)

- Kartu "Perangkat": daftar device (nama, tipe, status, terakhir dilaporkan)
  dari `deviceStates` — read-only, tanpa tombol kontrol eksekusi.
- Tombol "Pasangkan perangkat" → dialog 2 langkah: (1) tampilkan perintah yang
  harus dijalankan di laptop, (2) input pairing code. Dialog mematuhi kontrak
  dialog existing (Escape, focus return, muat di 375px).
- Status unavailable eksplisit saat companion belum pernah melapor — bukan
  spinner atau data contoh.

## 6. Rencana implementasi bertahap (setelah disetujui)

1. Schema `devices` + `pairingCodes` + migration + codegen.
2. Mutation user-scoped createPairingCode/registerDevice + test trust boundary.
3. httpAction claimApproval + heartbeat (signature verify) + test.
4. UI Settings → Companion + regression jsdom.
5. Skrip companion Bun (`companion/` — repositori terpisah bila dipisah sesuai
   AGENTS.md) + unit test polling/signature.
6. Validasi end-to-end: heartbeat muncul di Dashboard/Storage, device lama
   ter-arsip saat device baru bertipe sama dipasangkan.
