# Software Requirements Specification (SRS)

## 1. Scope

SRS ini mendefinisikan perilaku perangkat lunak untuk Dashboard OS Linux Mint versi MVP. Cakupan saat ini adalah aplikasi web client-side dengan route utama `/`, visualisasi data dashboard, interaksi navigasi, dan responsivitas. Backend, database, autentikasi, serta integrasi API nyata berada di luar baseline MVP.

## 2. Aktor Sistem

| Aktor | Hak akses / tujuan |
|---|---|
| Pengguna workspace | Melihat status, membuka shortcut, mengubah focus mode, mencari aplikasi |
| Sistem aplikasi | Menghasilkan status UI, toast, filtering, dan navigasi |
| Integrasi data masa depan | Menyediakan system metrics, cuaca, agenda, serta aktivitas |

## 3. Kebutuhan Fungsional

| ID | Requirement | Acceptance criteria |
|---|---|---|
| SRS-F01 | Sistem menampilkan greeting, nama pengguna, tanggal, dan deskripsi kondisi workspace. | Semua elemen tampil pada route `/` tanpa error. |
| SRS-F02 | Sistem menampilkan status healthy, last checked, uptime, kernel, CPU, memory, dan storage. | Nilai dan progress bar terlihat serta memiliki label yang terbaca. |
| SRS-F03 | Sistem menyediakan navigasi Overview, Workspace, Applications, dan System health. | Item aktif memiliki state visual; item lain memberi feedback saat dipilih. |
| SRS-F04 | Sistem menyediakan quick launch Files, Terminal, Editor, dan Notes. | Klik setiap item menghasilkan feedback dan tidak menyebabkan dead-end. |
| SRS-F05 | Sistem menyediakan pencarian aplikasi. | Hasil quick launch tersaring berdasarkan nama secara case-insensitive. |
| SRS-F06 | Sistem menyediakan notification popover. | Klik ikon notifikasi membuka dan menutup popover dengan status yang jelas. |
| SRS-F07 | Sistem menyediakan Focus mode. | Klik toggle mengubah state visual dan menampilkan toast. |
| SRS-F08 | Sistem menampilkan activity feed dan agenda. | Data tersusun berdasarkan waktu dan memiliki icon, detail, serta timestamp. |
| SRS-F09 | Sistem menyediakan responsive mobile navigation. | Menu dapat dibuka dari mobile, memiliki scrim, dan dapat ditutup. |
| SRS-F10 | Sistem menghormati reduced motion preference. | Animasi non-esensial dikurangi ketika preference aktif. |

## 4. Kebutuhan Nonfungsional

| ID | Area | Requirement |
|---|---|---|
| SRS-N01 | Performance | Halaman utama harus dapat dibuild dengan command project dan tidak menghasilkan TypeScript error. |
| SRS-N02 | Responsiveness | Layout harus mendukung desktop, tablet, dan viewport mobile sekitar 390px. |
| SRS-N03 | Accessibility | Button interaktif memiliki label atau teks yang bermakna, focus ring tidak dihilangkan, dan kontras teks dijaga. |
| SRS-N04 | Maintainability | Warna dan spacing utama menggunakan CSS custom properties; page component tidak menyimpan server logic. |
| SRS-N05 | Reliability | Aksi placeholder tidak boleh gagal secara diam-diam; aksi tersebut menampilkan toast atau state yang dapat dipahami. |
| SRS-N06 | Security | Versi MVP tidak memproses kredensial, token, atau data privat pengguna. |

## 5. UI States

Setiap fitur yang akan dihubungkan ke data eksternal wajib memiliki state loading, success, empty, error, dan offline. Pada MVP statis, state success digunakan sebagai baseline dan toast digunakan untuk aksi simulasi. Empty state sudah ditentukan untuk hasil pencarian aplikasi.

## 6. Data Contract Awal

```ts
type SystemHealth = {
  status: "healthy" | "attention" | "critical";
  lastChecked: string;
  uptime: string;
  kernel: string;
  cpuPercent: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  storageUsedGb: number;
  storageTotalGb: number;
};

type ActivityItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  type: "system" | "backup" | "network";
};
```

## 7. Definition of Done

Sebuah requirement dianggap selesai apabila implementasi tersedia pada route yang ditentukan, memiliki state interaksi yang teruji, tidak menghasilkan TypeScript error, tidak menimbulkan overflow pada mobile, dan memenuhi acceptance criteria pada tabel di atas. Requirement yang bergantung pada API tidak boleh dianggap selesai hanya karena placeholder berhasil ditampilkan.
