# AGENTS.md

Dokumen ini adalah kontrak implementasi untuk setiap agent atau kontributor yang memodifikasi Mintdesk. Jika instruksi ad hoc bertentangan dengan guardrail di bawah, hentikan dan minta klarifikasi sebelum memperluas capability.

## Tujuan dan batas produk

Mintdesk adalah **Daily Focus Assistant** dan dashboard operasional Linux Mint. Aplikasi membantu pengguna melihat evidence Calendar, Gmail, companion runtime, proses terkontrol, Storage workdir, serta audit. Ia tidak boleh berubah menjadi remote shell, file browser umum, sistem monitoring yang memanen seluruh data perangkat, atau agent otonom lintas layanan.

| Prinsip | Aturan yang dapat diverifikasi |
|---|---|
| Evidence-first | Data sumber ditampilkan atau direferensikan sebelum rekomendasi; sumber unavailable diberi label eksplisit |
| Human confirmation | Semua Google write membutuhkan preview proposal dan konfirmasi eksplisit pengguna |
| Local reasoning only | 9router hanya diakses oleh companion melalui loopback `127.0.0.1`; web app tidak menerima token 9router |
| Minimum data retention | Jangan persist body Gmail, bearer token, device secret, atau raw prompt AI dalam database atau audit event |
| Capability allowlist | Companion hanya boleh menjalankan health, metrics, process observation, audit, terminate yang telah di-allowlist, workdir observation, dan Daily Focus reasoning |
| No scheduled AI | Jangan menambahkan cron, background AI, atau notification scheduler tanpa persetujuan eksplisit dan workflow periodik yang sesuai |

## Arsitektur dan package manager

Web app berada di repository ini dan selalu memakai **pnpm**. Stack: React 19, TypeScript, Tailwind 4, Wouter, Express, tRPC, Drizzle, serta MySQL. Jangan membuat `bun.lock` atau mengganti script proyek ke Bun. **Bun hanya digunakan oleh companion hybrid di Linux**, yang dipasang di luar repository aplikasi web.

| Lokasi | Peran | Aturan perubahan |
|---|---|---|
| `client/src/` | UI dan tRPC hooks | Gunakan component primitives yang ada dan buat UI ringkas, aksesibel, serta mobile-ready |
| `server/routers.ts` | Contract tRPC | Semua API aplikasi lewat protected/public procedure yang tepat; jangan menambah fetch client ad hoc |
| `server/db.ts` | Query helpers | Semua query user-scoped dan mengembalikan raw Drizzle result yang tervalidasi di caller |
| `drizzle/schema.ts` | Model data | Perubahan schema harus disertai migration SQL dan aplikasi migration melalui workflow database terkelola |
| `server/googleOAuth.ts` | OAuth Google | Jangan melonggarkan scope atau mengubah callback canonical tanpa review security |
| `server/googleDailyFocusActions.ts` | Google write executor | Pertahankan ownership guard, preview, confirmation, dan audit |
| `server/morningBriefing.ts` | Aggregasi briefing | Hindari persistence konten Gmail; sanitasi evidence sebelum dikirim ke companion |
| `client/src/components/WorkspaceShell.tsx` | Navigasi shell | Sidebar hanya Dashboard, Daily Focus, Storage, Activity; Connections dan Settings tetap di profil menu |

## Google Workspace policy

Scope yang dibolehkan saat ini adalah `calendar.calendarlist.readonly`, `calendar.events.readonly`, `calendar.events.owned`, `gmail.metadata`, `gmail.modify`, dan `tasks`. Jangan menambah scope tanpa menyatakan capability, alasan proporsionalitas, data yang diproses, retention, dan dampaknya pada human confirmation.

| Operasi | Diperbolehkan | Guard wajib |
|---|---:|---|
| Baca Calendar | Ya | Hanya untuk evidence briefing |
| Baca metadata/excerpt Gmail | Ya | Excerpt terbatas, tidak dipersistenkan |
| Membuat Calendar event | Ya | Proposal schema-valid, preview, confirm |
| Menghapus Calendar event | Ya | Ownership guard, preview, confirm |
| Membuat Google Task | Ya | Proposal, preview, confirm |
| Memindahkan Gmail ke Trash | Ya | Daftar pesan preview, confirm, bukan permanent delete |
| Gmail draft/send | Tidak | Tidak ada `gmail.compose`; jangan implementasikan endpoint atau UI tersembunyi |
| Menulis data Google secara otomatis | Tidak | Tidak ada agent-to-agent action atau bulk execute |

Google refresh token dienkripsi AES-256-GCM. OAuth memakai PKCE dan signed, short-lived state. Credential tidak boleh masuk ke logs, fixtures, database audit, test snapshot, atau response UI.

## Companion policy

Companion berkomunikasi melalui polling outbound dan otentikasi device secret yang di-hash server-side. Pairing browser-ke-loopback hanya boleh menerima origin Mintdesk dan berjalan di `127.0.0.1:20129`. Jangan membuka endpoint pairing ke LAN, jangan menerima host selain loopback, dan jangan memindahkan device secret ke localStorage atau URL.

Workdir canonical adalah:

```text
/media/abelion/Isaf/ican/project
```

Satu device aktif per tipe device. Heartbeat credential valid mengarsipkan credential lama bertipe sama. Jangan menghapus guard ini atau menampilkan credential recovery yang telah diarsipkan sebagai perangkat aktif.

## Notifikasi kustom

Notifikasi harus menjadi **user-scoped inbox**, bukan mekanisme untuk melakukan tindakan. Event yang boleh dikirim hanya berupa metadata operasional, misalnya perubahan status companion, perubahan koneksi Google, atau status proposal Daily Focus. Jangan sertakan body Gmail, token, prompt mentah, path sensitif selain workdir canonical, atau provider resource payload.

Notifikasi browser harus meminta izin hanya dari interaksi pengguna yang jelas. Bila izin ditolak atau API tidak tersedia, inbox in-app tetap menjadi fallback utama. Push owner bawaan platform hanya digunakan untuk alert operasional yang relevan bagi pemilik, bukan sebagai saluran pesan produk bagi pengguna lain.

## Pola UI dan aksesibilitas

Gunakan gaya **Mint Atelier**: warm parchment, mint status signals, DM Sans untuk display, dan Source Sans 3 untuk body. Terapkan prinsip Apple HIG dan disclosure bertahap: ringkas di card, detail di dialog, bukan halaman yang memaksa scrolling panjang. Gunakan Lucide icons, bukan emoji.

Dialog harus dapat ditutup dengan Escape, mengembalikan fokus ke trigger, memiliki label aksesibel, dan tetap muat pada viewport 375px. Animasi menggunakan transform/opacity di bawah 300 ms dan menghormati `prefers-reduced-motion`. Sidebar expanded/collapsed harus mempertahankan transisi serempak serta state `mintdesk.sidebar.collapsed`.

## Data, audit, dan logging

Semua record domain harus dimiliki user melalui `userId`. API list, get, update, delete, dan action confirmation wajib memfilter user aktif. Audit event mencatat metadata tindakan dan status `accepted`, `rejected`, atau `error`; jangan merekam credentials ataupun konten Gmail.

Jangan menyimpan file byte pada database. Gunakan S3 untuk byte dan database hanya untuk metadata object. Asset statis di web project harus diunggah dari `/home/ubuntu/webdev-static-assets/` dan direferensikan dengan URL storage yang disediakan.

## Workflow implementasi dan validasi

Setiap perubahan fitur harus mengikuti urutan berikut:

1. Tambahkan item `[ ]` spesifik di `todo.md` sebelum mengubah implementation.
2. Baca skill yang relevan sebelum merencanakan atau menulis code.
3. Perbarui schema terlebih dahulu bila model data berubah, generate migration, baca SQL, kemudian aplikasikan melalui workflow database terkelola.
4. Tambahkan helper database, tRPC procedure user-scoped, UI, dan state success/error/unavailable.
5. Tulis atau perbarui Vitest sebelum delivery. Screenshot bukan pengganti test.
6. Jalankan `pnpm test`, `pnpm check`, dan `pnpm build`.
7. Verifikasi tampilan desktop dan mobile 375px; baca `.manus-logs/` melalui terminal jika ada error runtime atau network.
8. Tandai item selesai menjadi `[x]`, baca keseluruhan `todo.md`, lalu buat checkpoint.

Gunakan `webdev_rollback_checkpoint` untuk rollback. Jangan gunakan `git reset --hard`.

## Workflow GitHub

Perubahan lokal harus melalui: **edit lokal → test → commit → push dengan persetujuan pemilik → sinkronisasi agent**. Jangan melakukan `git push` tanpa persetujuan eksplisit pemilik repository. Jika terjadi konflik, jangan overwrite perubahan remote secara otomatis. Gabungkan perubahan struktural secara hati-hati dan minta keputusan untuk konflik konten.

## Larangan eksplisit

- Jangan membuat mock data, testimonial, review, atau status sistem palsu untuk mengisi UI.
- Jangan membuat scheduled AI run atau background job tanpa persetujuan dan desain capability yang terdokumentasi.
- Jangan menambah data exfiltration, webhooks pihak ketiga, telemetry baru, atau logging sensitif tanpa persetujuan eksplisit.
- Jangan membuka capability system process atau filesystem di luar companion allowlist.
- Jangan menghapus browser confirmation, proposal expiration, atau ownership guard untuk mempercepat Google write.
- Jangan menaruh secret pada client bundle, URL, README, screenshot, fixture, atau git history.
