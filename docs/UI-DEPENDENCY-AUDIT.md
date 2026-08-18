# UI Dependency Audit

**Tanggal audit:** 18 Agustus 2026  
**Metode:** import graph dari route `App.tsx`, pencarian source/test lintas `client/src` dan `server`, lalu typecheck serta build produksi setelah penghapusan.

## Keputusan

Scaffold template yang tidak dirutekan dihapus: `ComponentShowcase`, `AIChatBox`, `DashboardLayout`, `DashboardLayoutSkeleton`, `ManusDialog`, dan `Map`. Semua menyimpan demo atau primitive template yang tidak berada pada jalur route Mintdesk.

Sebanyak 41 primitive UI yang hanya dirujuk oleh showcase atau shell template yang ikut dihapus juga dihapus. Primitive produksi yang dipertahankan adalah `alert-dialog`, `avatar`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `scroll-area`, `sonner`, `switch`, `textarea`, dan `tooltip`.

| Kategori | Keputusan | Alasan |
|---|---|---|
| Dependency UI produksi | 30 dependency dihapus | Tidak memiliki import pada route atau component produksi setelah scaffold dihapus |
| Tooling development | 3 dependency dihapus | Hanya berasal dari template Map, typography, atau utility install yang tidak dipakai konfigurasi build |
| `next-themes` | Dipertahankan | Typecheck membuktikan `components/ui/sonner.tsx` menggunakannya untuk tema toast runtime |
| Toolchain CSS inti | Dipertahankan | `autoprefixer`, `postcss`, dan `tw-animate-css` tidak dihapus hanya karena tidak terlihat di import React; mereka dapat menjadi dependency konfigurasi atau CSS build |

## Hasil Footprint

Build produksi sebelum cleanup menghasilkan CSS `151.53 kB` (`27.37 kB` gzip). Setelah cleanup, CSS menjadi `90.13 kB` (`18.56 kB` gzip): berkurang `61.40 kB` atau `40.5%` pada output mentah, dan `8.81 kB` atau `32.1%` gzip.

JavaScript aplikasi tetap `920.14 kB` (`237.71 kB` gzip). Ini konsisten dengan hasil audit: scaffold tersebut tidak dirutekan sebelumnya sehingga telah dihilangkan oleh tree-shaking produksi; cleanup terutama mengurangi CSS template, source dead code, dan footprint instalasi dependency.

## Validasi

`pnpm test`, `pnpm check`, dan `pnpm build` lulus setelah cleanup. Suite mencakup 36 file dan 104 test. Penghapusan dependency `next-themes` sempat dicoba karena tidak diimpor halaman secara langsung, lalu dibatalkan setelah typecheck menemukan dependency transitif aktif pada Toaster. Ini menjadi contoh aturan audit: **typecheck adalah bukti terakhir, bukan asumsi dari grep**.

Screenshot desktop Dashboard, Daily Focus, Storage, dan Activity setelah restart dependency memperlihatkan route aktif tetap memuat surface, status sumber nyata, navigasi, serta state unavailable tanpa perubahan komposisi atau error runtime baru.
