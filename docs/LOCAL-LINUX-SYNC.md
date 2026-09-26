# Sinkronisasi Mintdesk ke Clone Linux Lokal

Panduan ini digunakan setelah sebuah checkpoint Mintdesk tersedia di GitHub dan Anda ingin meninjau atau melanjutkan perubahan dari Linux Mint. Ia **tidak** memindahkan database produksi (Convex cloud), token Google, device secret, atau secret environment deployment ke repository lokal.

> Jalankan web application dengan **Bun** (`bun.lock` tracked). Convex adalah backend + database; tidak ada MySQL/Drizzle lagi dari era sebelumnya.

## Batas yang perlu dipahami

| Area | Dapat dikerjakan dari clone lokal | Tidak boleh dilakukan dari clone lokal |
|---|---|---|
| UI dan component test | Mengubah React, CSS, test, dan menjalankan dev server | Menaruh asset besar atau credential di repository |
| Backend Convex | Mengubah `src/convex/`, schema, dan test; menjalankan `bunx convex dev` (backend **lokal** untuk codegen/preview) | Men-push functions atau env ke deployment **prod** (`charming-firefly-655`) dari laptop |
| Google Workspace | Memeriksa UI untuk state unavailable | Menguji OAuth/write provider dengan secret atau redirect URI produksi yang disalin ke `.env` |
| Linux companion | Mengecek status service lama bila masih ada | Mengubah device secret, token 9router, atau env companion untuk sekadar mengedit UI |

## 1. Masuk ke clone yang sudah ada

Gunakan path kerja tetap. Ganti nama folder terakhir bila clone Anda menggunakan nama berbeda.

```bash
export MINTDESK_DIR="/media/abelion/Isaf/ican/project/mintdesk"
cd "$MINTDESK_DIR"

git status --short --branch
git remote -v
```

Jika `git status` menampilkan perubahan yang belum siap disimpan, commit atau stash terlebih dahulu. Jangan menjalankan `git reset --hard` karena perubahan lokal akan hilang dan sulit dibandingkan dengan checkpoint.

## 2. Tarik perubahan Mintdesk dengan fast-forward saja

```bash
git fetch origin --prune
git pull --ff-only origin main
```

`--ff-only` sengaja digunakan agar Git berhenti ketika branch lokal menyimpang. Jika itu terjadi, lihat perubahan dengan `git log --oneline --decorate --graph -20` dan selesaikan intent yang bertentangan sebelum merge. Jangan mengambil keputusan konten secara otomatis apabila keduanya mengubah copy, policy, atau UI yang sama.

## 3. Instal dependency dan validasi perubahan

```bash
bun install --frozen-lockfile
bun run check          # tsc -b --noEmit
bun run test           # Vitest (bukan `bun test` — runner bawaan Bun tidak memuat vitest.config.ts)
bun run build
bun run dev            # scripts/dev.sh: convex dev (lokal) + Vite dalam satu perintah
```

Dev server akan mencetak URL lokal. Untuk pekerjaan UI, kondisi **unavailable** pada Google, companion, atau backend adalah valid bila Anda tidak menyuplai environment development terpisah. Jangan membuat data dummy untuk menghilangkan state tersebut.

Bila mengubah schema Convex, ikuti urutan di README (codegen `bunx convex dev --once` → baca hasil generate → test → typecheck → build). Jangan mengedit `src/convex/_generated` manual.

## 4. Menjalankan aplikasi lokal dengan aman

Web application produksi menerima environment terkelola dari platform. Clone lokal tidak otomatis memiliki environment itu. Oleh sebab itu, untuk perubahan UI gunakan component tests, mocked query states, dan dev server dengan backend Convex **lokal** tanpa menyalin secret.

| Kebutuhan | Cara yang aman |
|---|---|
| Mengubah tampilan dan layout | Gunakan `bun run dev`, screenshot lokal, lalu `bun run test`, `bun run check`, dan `bun run build`. |
| Menguji schema atau query baru | Backend Convex lokal (`bunx convex dev`) — jangan pernah menarget deployment prod. |
| Menguji OAuth Google | Gunakan OAuth client dan redirect URI development yang terpisah (default fallback `http://localhost:5173/api/google/callback`). Jangan menyalin client secret produksi atau refresh token dari deployment. |
| Menguji provider write | Review di deployment setelah human confirmation; tidak ada write Google dari mesin lokal. |

File berikut tidak boleh dibuat, di-commit, atau dikirim melalui chat:

```text
.env / .env.local berisi credential
hybrid-companion.env
TOKEN_ENCRYPTION_KEY, OAUTH_STATE_SECRET
JWT_PRIVATE_KEY / JWKS
GOOGLE_CLIENT_SECRET
```

## 5. Hubungan dengan Linux companion

Companion Bun **belum diimplementasi** pada rebuild Convex ini — desain pairing final ada di [COMPANION-PAIRING-DESIGN.md](./COMPANION-PAIRING-DESIGN.md) dan menunggu persetujuan capability pemilik di todo.md. Bila service companion dari era sebelumnya masih terpasang:

```bash
systemctl --user status mintdesk-hybrid-companion.service --no-pager -l
journalctl --user -u mintdesk-hybrid-companion.service -n 80 --no-pager
```

Jangan mengubah `hybrid-companion.env`, device secret, atau token 9router untuk sekadar mengedit UI. Pairing endpoint tetap loopback-only (`127.0.0.1:20129`) dan tidak boleh diproxy atau diekspos ke jaringan.

## 6. Siklus kerja yang direkomendasikan

1. Perbaikan diprototipe dan diverifikasi pada Mintdesk (Freebuff workspace) terlebih dahulu.
2. Setelah checkpoint tersedia, tarik dengan `git pull --ff-only` ke clone Linux.
3. Jalankan test, typecheck, build, dan screenshot pada viewport desktop serta 375px.
4. Commit perubahan lokal dengan pesan yang menyebut intent dan risiko.
5. Push hanya setelah persetujuan pemilik repository.
6. Minta agent menyinkronkan checkpoint sebelum pekerjaan berikutnya supaya perubahan lokal dan deployment tidak saling menimpa.

> Setelah rebuild Convex, file visual utama adalah `src/components/pages/*.tsx` (Dashboard, DailyFocus, News, StoragePage, Activity) dengan token di `src/index.css`. Konstitusi desain dan acceptance criteria ada di [ANTI-SLOP-GUARDRAILS.md](./ANTI-SLOP-GUARDRAILS.md); audit historis tersimpan di [archive/](./archive/).
