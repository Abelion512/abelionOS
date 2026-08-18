# Sinkronisasi Mintdesk ke Clone Linux Lokal

Panduan ini digunakan setelah sebuah checkpoint Mintdesk tersedia di GitHub dan Anda ingin meninjau atau melanjutkan perubahan UI dari Linux Mint. Ia **tidak** memindahkan database produksi, token Google, device secret, atau konfigurasi 9router ke repository lokal.

> Jalankan web application dengan **pnpm**. Bun tetap khusus untuk companion Linux yang sudah berjalan sebagai user service.

## Batas yang perlu dipahami

| Area | Dapat dikerjakan dari clone lokal | Tidak boleh dilakukan dari clone lokal |
|---|---|---|
| UI dan component test | Mengubah React, CSS, test, dan menjalankan dev server | Menaruh asset besar atau credential di repository |
| Backend | Mengubah router, policy, dan unit test | Mengarahkan `DATABASE_URL` lokal ke database produksi tanpa prosedur terkelola |
| Google Workspace | Memeriksa UI untuk state unavailable atau test mock | Menguji OAuth/write provider dengan secret atau redirect URI produksi yang disalin ke `.env` |
| Linux companion | Mengecek status/log user service yang ada | Mengubah `hybrid-companion.env`, device secret, atau token 9router untuk sekadar mengedit UI |

## 1. Masuk ke clone yang sudah ada

Gunakan path kerja tetap. Ganti nama folder terakhir bila clone Anda menggunakan nama berbeda.

```bash
export MINTDESK_DIR="/media/abelion/Isaf/ican/project/dashboard-os-linux-mint"
cd "$MINTDESK_DIR"

git status --short --branch
git remote -v
```

Jika `git status` menampilkan perubahan yang belum siap disimpan, commit atau stash terlebih dahulu. Jangan menjalankan `git reset --hard` karena perubahan lokal akan hilang dan sulit dibandingkan dengan checkpoint Manus.

## 2. Tarik perubahan Mintdesk dengan fast-forward saja

Gunakan remote yang terlihat dari `git remote -v`. Pada banyak clone remote bernama `origin`; proyek Manus yang terhubung dapat memakai `user_github`.

```bash
# Pilih salah satu yang benar-benar ada pada `git remote -v`.
git fetch origin --prune
git pull --ff-only origin main

# atau, bila remote proyek bernama user_github:
# git fetch user_github --prune
# git pull --ff-only user_github main
```

`--ff-only` sengaja digunakan agar Git berhenti ketika branch lokal menyimpang. Jika itu terjadi, lihat perubahan dengan `git log --oneline --decorate --graph -20` dan selesaikan intent yang bertentangan sebelum merge. Jangan mengambil keputusan konten secara otomatis apabila keduanya mengubah copy, policy, atau UI yang sama.

## 3. Instal dependency dan validasi perubahan UI

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm dev
```

Dev server akan mencetak URL lokal. Untuk pekerjaan UI, kondisi **unavailable** pada Google, database, atau companion lokal adalah valid bila Anda tidak menyuplai environment development terpisah. Jangan membuat data dummy untuk menghilangkan state tersebut.

## 4. Menjalankan aplikasi lokal dengan aman

Web application produksi menerima environment terkelola dari platform. Clone lokal tidak otomatis memiliki environment itu. Oleh sebab itu, untuk perubahan UI gunakan component tests, mocked query states, dan dev server tanpa menyalin secret.

| Kebutuhan | Cara yang aman |
|---|---|
| Mengubah tampilan dan layout | Gunakan `pnpm dev`, screenshot lokal, lalu `pnpm test`, `pnpm check`, dan `pnpm build`. |
| Menguji schema atau query baru | Gunakan database development terpisah yang telah disetujui. Terapkan migration terlebih dahulu melalui workflow database terkelola, bukan ke database produksi dari laptop. |
| Menguji OAuth Google | Gunakan OAuth client dan redirect URI development yang terpisah. Jangan menyalin client secret produksi atau refresh token dari deployment. |
| Menguji provider write | Gunakan data uji yang aman pada environment development atau review di deployment setelah human confirmation. |

File berikut tidak boleh dibuat, di-commit, atau dikirim melalui chat:

```text
.env
hybrid-companion.env
MINTDESK_DEVICE_SECRET
MINTDESK_9ROUTER_TOKEN
GOOGLE_OAUTH_CLIENT_SECRET
DATABASE_URL
```

## 5. Hubungan dengan Linux companion yang sudah aktif

Anda **tidak perlu memasang ulang companion** saat hanya menarik perubahan UI web. Companion Bun yang sudah aktif tetap berada di user service dan melanjutkan polling outbound ke deployment Mintdesk.

```bash
systemctl --user status mintdesk-hybrid-companion.service --no-pager -l
journalctl --user -u mintdesk-hybrid-companion.service -n 80 --no-pager
```

Gunakan browser pada laptop Linux dan halaman Connections atau Daily Focus ketika pairing memang diperlukan. Browser ponsel tidak pernah menerima secret lokal. Endpoint pairing tetap loopback-only pada `127.0.0.1:20129` dan tidak boleh diproxy atau diekspos ke jaringan.

## 6. Siklus kerja yang direkomendasikan

1. Perbaikan diprototipe dan diverifikasi pada Mintdesk terlebih dahulu.
2. Setelah checkpoint tersedia, tarik dengan `git pull --ff-only` ke clone Linux.
3. Jalankan test, typecheck, build, dan screenshot pada viewport desktop serta 375px.
4. Commit perubahan lokal dengan pesan yang menyebut intent dan risiko.
5. Push hanya setelah persetujuan pemilik repository.
6. Minta agent menyinkronkan checkpoint sebelum pekerjaan berikutnya supaya perubahan lokal dan deployment tidak saling menimpa.

> Untuk perubahan visual saat ini, file utama adalah `client/src/pages/Home.tsx`, `client/src/pages/MorningBriefing.tsx`, `client/src/pages/Storage.tsx`, `client/src/pages/Activity.tsx`, dan `client/src/ui-rebaseline.css`. Konstitusi desain serta acceptance criteria dicatat di [UI-REBASELINE-AUDIT.md](./UI-REBASELINE-AUDIT.md).
