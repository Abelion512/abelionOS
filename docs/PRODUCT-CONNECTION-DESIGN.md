# Product Connection Design — AbelionOS sebagai Hub Google Workspace

> **Status: DRAFT v2 — menunggu persetujuan implementasi.**
> Keputusan pemilik 2026-09-26 (tercatat di todo.md): produk lain milik pemilik menyambung
> ke Google Workspace **melalui AbelionOS**, bukan mengelola koneksi Google sendiri-sendiri.
> Prinsip adopsi: **ATM (amati–tiru–modifikasi)** dari desain yang sudah matang.

## 1. Ringkasan keputusan

| Keputusan | Nilai | Sumber |
|---|---|---|
| Mekanisme | Native product-connection, pola dikontek dari desain matang | Pemilik 2026-09-26 |
| Cakupan akses | Per-produk configurable; **read-only default**; write sesuai kebutuhan; scope seminimal mungkin | Pemilik 2026-09-26 |
| Bentuk klien | Local tools semuanya + satu produk web | Pemilik 2026-09-26 |
| Write dari klien | **Tidak pernah eksekusi langsung** — selalu proposal → preview → konfirmasi manusia (kontrak AGENTS.md) | Kontrak produk |
| Produk pertama | **abelink** (`Abelion512/abelink`) — local | Pemilik 2026-09-26 |
| Tahap awal | abelink + abelionos saja; registry tidak diisi spekulatif | Pemilik 2026-09-26 |

## 2. Referensi yang ditiru (ATM)

| Desain sumber | Pola yang diamati | Modifikasi AbelionOS |
|---|---|---|
| **GitHub Apps** | Identitas per-installation, permission granular per app, token pendek, revocable terpisah | Satu "installation" = satu produk klien dengan secret + allowlist sendiri; revoke tidak menyentuh koneksi Google utama |
| **MCP (Model Context Protocol)** | Capability surface eksplisit: klien hanya melihat tools/resources yang di-grant | Endpoint metadata menolak capability di luar allowlist produk; surface klien = isi allowlist |
| **OpenConnector (oomol-lab)** | Secrets di belakang runtime boundary; klien hanya menerima metadata, safe labels, dan hasil eksekusi; run logs redacted | Refresh token Google tetap 100% di backend AbelionOS (AES-256-GCM); klien tak pernah menerima token; log permintaan tanpa payload sensitif |
| **Pairing companion (desain sendiri)** | Secret hashed server-side, tidak pernah lewat browser, one active per identity, arsip saat rotasi | Pola identik untuk product secret; satu secret aktif per produk |
| **OAuth Google sendiri** | Multi-account, scope minimal, audit tiap aksi | Permintaan klien memakai koneksi Google yang sudah ada; tiap permintaan masuk `auditEvents` |

## 3. Arsitektur

```text
┌──────────────┐   secret (header)   ┌─────────────────────────────┐
│ Local tool   │ ──────────────────► │ AbelionOS backend (Convex)  │
└──────────────┘   HTTPS /api/...    │  ├─ verify product secret   │
┌──────────────┐                     │  ├─ cek allowlist produk    │
│ Produk web   │ ──────────────────► │  ├─ baca metadata Google    │──► Google API
│ (secret di   │   server-to-server  │  │   (token dari backend)   │    (existing)
│  backend env)│                     │  └─ audit + rate limit      │
└──────────────┘                     │                             │
                                     │  write: buat PROPOSAL       │──► UI AbelionOS
                                     │   (schema-valid, expiry)    │    preview → confirm
                                     └─────────────────────────────┘
```

- **Satu sumber kredensial**: koneksi Google tetap milik AbelionOS (multi-account, terenkripsi per akun). Klien tidak pernah melihat token.
- **Transport**: HTTPS dari klien mana pun ke backend AbelionOS. Tidak ada port baru di laptop; local tools hanya melakukan request keluar. Pola polling/request keluar identik dengan companion.
- **Endpoint baru (HTTP actions, bukan query publik)**:
  - `POST /api/products/v1/read` — metadata sesuai allowlist (calendar list/events window, gmail metadata count, tasks).
  - `POST /api/products/v1/proposals` — membuat proposal write (masuk antrean proposal existing dengan `sourceProductId`).

## 4. Model data (minimum)

Satu tabel baru `products`, permintaan ditanggung `auditEvents` yang sudah ada:

| Field | Catatan |
|---|---|
| `productId` | nama stabil (slug), unik |
| `type` | `local` \| `web` |
| `secretHash` | hash secret produk (pola device secret); secret plaintext hanya tampil sekali saat registrasi |
| `allowlist` | array capability string, **default kosong** |
| `status` | `active` \| `archived` (rotasi/arsip, tanpa hapus riwayat) |
| `userId` | ownership wajib (single-user, tetap user-scoped) |

Audit permintaan klien: `actor: "product:<productId>"`, capability, status `accepted|rejected|error`, **tanpa** payload sensitif. Rate limit sederhana per produk (antar-request minimum) mencegah loop klien bocor.

## 5. Capability model

Penamaan `<sumber>.<mode>.<objek>`. Default: **kosong** — tiap capability ditambah eksplisit dengan justifikasi (pola justifikasi scope di AGENTS.md).

| Capability | Mode | Status | Catatan |
|---|---|---|---|
| `calendar.read.list` | read | **live (F3)** | daftar kalender akun, maks 25 item |
| `calendar.read.events` | read | **live (F3)** | jendela waktu terbatas (maks 7 hari, 25 item) |
| `calendar.create.proposal` | proposal | **live (F4)** | klien mengusulkan event (kind `calendar.create`); ownership guard + preview + confirm di UI |
| `task.create.proposal` | proposal | **live (F4)** | klien mengusulkan task (kind `task.create`); preview + confirm di UI |
| `gmail.read.metadata` | read | planned | metadata/excerpt terbatas, tidak pernah body, tidak dipersistenkan |
| `tasks.read` | read | planned | metadata task on-demand |

Capability destruktif (`calendar.propose.delete`, `gmail.trash`) sengaja **tidak** masuk registry proposal — klien tidak mengusulkan operasi destruktif; keputusan F4 2026-09-27 di todo.md.

Aturan:
1. Read-only default; write capability hanya untuk produk yang dibuktikan butuh, dan bentuknya **usulan proposal**, bukan eksekusi.
2. Tidak ada wildcard (`*`), tidak ada capability lintas produk.
3. Capability baru = item todo.md + justifikasi capability/proporsionalitas/retention/dampak human confirmation.
4. Keluaran read dibatasi ukuran (jumlah item, window waktu) — bukan mirror penuh data Google.

## 6. Siklus hidup produk klien

1. **Registrasi** — UI: Settings → Connected products → Register: nama + tipe → server membuat secret (tampil **sekali**) + allowlist awal read-only.
2. **Distribusi secret** — local tool: file `~/.config/abelionos/products.env` chmod 600 (pola companion env); produk web: secret disimpan di **backend env produk tersebut** (bukan browser, bukan localStorage).
3. **Operasi** — klien mengirim `PRODUCT_ID` + secret per request; server verifikasi hash → allowlist → eksekusi read / buat proposal.
4. **Rotasi** — secret baru mengarsipkan yang lama (satu secret aktif per produk, pola single-device).
5. **Revoke** — status `archived`: semua request ditolak 401, riwayat audit tetap.

## 7. Write flow (tidak berubah dari kontrak)

Klien → `POST /api/products/v1/proposals` (schema-valid, `sourceProductId`) → proposal muncul di UI AbelionOS → **preview** → **konfirmasi manusia** → executor existing → audit `accepted/rejected/error` + notifikasi inbox. Proposal expired, ownership guard, dan larangan bulk execute tetap berlaku penuh. Klien dapat polling status proposal via `read` capability-nya sendiri — tidak ada push ke klien (YAGNI).

## 8. Yang sengaja TIDAK dibangun (Ponytail)

- SDK npm publik, multi-tenant, OAuth delegation (act-as antar produk).
- Gateway OpenConnector atau runtime pihak ketiga — dicatat sebagai jalur upgrade bila jumlah provider non-Google meledak.
- Webhook/push ke klien, sinkronisasi terjadwal per produk (no scheduled AI/job baru tanpa persetujuan).
- Menyimpan konten hasil read di database (metadata result per-request saja).

## 9. Fase implementasi (hanya setelah disetujui)

| Fase | Isi | Validasi |
|---|---|---|
| F1 | Schema `products` + codegen | `bun convex dev --once`, review SQL/schema |
| F2 | Register/list/revoke + rotasi secret + UI Settings | test Vitest + audit event |
| F3 | Endpoint `read` (2 capability pertama) + allowlist guard + rate limit + audit | test allowlist deny-by-default, user-scoping |
| F4 | Endpoint `proposals` + `sourceProductId` di UI preview | test expiry/ownership tetap, regression confirmation |
| F5 | Docs + regression penuh | `bun run test`, `tsc -b --noEmit`, `bun run build`, cek 375px |

## 10. Abelink sebagai produk pertama

Fakta dari repo `Abelion512/abelink` (publik, 2026-09-23): Autonomous AI OS Companion Linux —
Tauri v2 (Rust) + Bun sidecar, berjalan di workstation lokal, memuat AI agent, subagents, dan MCP.
Implikasi desain:

- **Kategori**: `local` — secret produk di file lokal `~/.config/abelionos/products.env` chmod 600
  (pola companion env); transport HTTPS keluar ke backend AbelionOS, tanpa port baru.
- **Boundary AI-agent (paling penting)**: agent AI di dalam abelink diperlakukan sama seperti
  browser — **tidak pernah menerima token Google**. Yang diterima agent hanya metadata/hasil read
  sesuai allowlist, dan setiap write tetap proposal + konfirmasi manusia di UI AbelionOS.
  Secret produk dipegang proses host abelink (bukan prompt/konteks agent).
- **Allowlist awal usulan (read-only, seminimal mungkin)**: `calendar.read.list` +
  `calendar.read.events` — dirilis bertahap; capability berikutnya hanya ditambah dengan
  justifikasi eksplisit di todo.md saat abelink benar-benar membutuhkannya.
- **Tahap awal registry**: `abelink` (local) + `abelionos` (web, secret di backend env) — dua baris,
  tidak lebih.

## 11. Riwayat keputusan

| Tanggal | Keputusan |
|---|---|
| 2026-09-26 | Repositioning: AbelionOS = hub koneksi Google Workspace pemilik; produk menyambung melalui AbelionOS (todo.md) |
| 2026-09-26 | Mekanisme native product-connection dengan prinsip ATM; per-produk configurable, read-only default, scope minimal; klien local + satu web |
| 2026-09-26 | Produk pertama abelink; tahap awal registry = abelink + abelionos |
