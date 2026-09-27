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

3. **Heartbeat** — jalankan terus di laptop:

   ```bash
   bun run companion/heartbeat.ts
   ```

Satu device aktif per tipe: memasangkan laptop baru mengarsipkan credential
laptop lama secara otomatis (riwayat tetap di audit).

## Batas keamanan

- Device secret disimpan **hashed** server-side; plaintext hanya di file lokal.
- Private key Ed25519 tidak pernah keluar laptop; server hanya memverifikasi.
- Payload heartbeat di-clamp server (`companionLogic.parseHeartbeatPayload`);
  field di luar allowlist **ditolak**, bukan diabaikan.
- Perubahan capability = amendment AGENTS.md + persetujuan pemilik.
