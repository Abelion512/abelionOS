# Hybrid Bun Companion Architecture

## Keputusan

Mintdesk menggunakan satu aplikasi hosted yang dapat dibuka dari ponsel, laptop, atau desktop. Dua companion yang sama dapat didaftarkan: satu pada Linux laptop dan satu pada Linux server. Keduanya memakai Bun dan systemd, tetapi tidak membuka port publik atau mengirim token 9router ke browser.

## Alur kerja

| Komponen | Tanggung jawab | Tidak diizinkan |
| --- | --- | --- |
| Daily Focus di ponsel | Menampilkan evidence, menerima teks bebas, menampilkan proposal dan confirmation | Menyimpan token companion atau memanggil 9router langsung |
| Backend Mintdesk | Menyimpan device registry, action proposal, confirmation record, audit, dan token OAuth Google terenkripsi | Menjalankan 9router atau mengeksekusi action tanpa confirmation |
| Bun companion pada laptop/server | Mengambil pekerjaan yang ditujukan kepadanya, memanggil 9router lokal, mengembalikan proposal JSON tervalidasi | Menulis Gmail, Tasks, atau Calendar; membaca data di luar payload allowlist |
| Google provider | Menjalankan aksi hanya sesudah proposal dikonfirmasi | Menghapus Gmail permanen atau event kalender yang tidak dimiliki pengguna |

## Routing perangkat

Setiap device memiliki nama, tipe (`laptop` atau `server`), public key/device secret, capability, waktu heartbeat, dan status online. Daily Focus memilih device yang Anda tandai sebagai default. Jika default offline, UI meminta pemilihan device lain yang online; tidak ada fallback AI cloud dan tidak ada eksekusi diam-diam.

## Operasi Google yang direncanakan

| Operasi | Scope | Guardrail |
| --- | --- | --- |
| Buat task Google Tasks | `tasks` | Preview judul, catatan, due date, dan target task list sebelum submit |
| Rapikan teks menjadi event | `calendar.events.owned` | Proposal memuat judul, waktu, timezone, kalender, peserta, dan reminder; pengguna harus confirm |
| Hapus event | `calendar.events.owned` | Hanya event dengan organizer akun pengguna; tampilkan event ID dan jadwal sebelum confirm |
| Bersihkan inbox | `gmail.modify` | Hanya message ID yang dipreview; aksi default memindahkan ke Trash, bukan delete permanen |

## Deployment Bun

Companion akan dijalankan sebagai service systemd non-root pada laptop maupun server. Dokumentasi Bun mendukung executable Linux dan contoh unit dengan `Restart=always`; tidak diperlukan listener publik untuk companion ini. [Bun systemd guide](https://bun.com/docs/guides/ecosystem/systemd) [Bun installation](https://bun.com/docs/installation)
