# Product Requirements Document (PRD)

## 1. Informasi Dokumen

| Atribut | Nilai |
|---|---|
| Produk | Dashboard OS Linux Mint / mintdesk |
| Versi | 1.0 |
| Status | Baseline untuk MVP frontend |
| Pemilik produk | Abelion / OlivX |
| Penulis | Manus AI |
| Tanggal | 17 Agustus 2026 |

## 2. Ringkasan Produk

Dashboard OS Linux Mint adalah personal workspace dashboard yang menyajikan kondisi mesin, aplikasi yang sering digunakan, aktivitas terbaru, agenda harian, dan konteks cuaca dalam satu layar. Produk ini mengambil bahasa visual Linux Mint, tetapi menyusunnya sebagai pengalaman desktop yang hangat, editorial, dan mudah dipindai.

> Produk ini bukan pengganti desktop environment Linux. Pada fase MVP, produk berfungsi sebagai dashboard web responsif yang memvisualisasikan status workspace dan menyediakan titik masuk ke fitur-fitur lanjutan.

## 3. Masalah yang Diselesaikan

Pengguna perlu berpindah antara utilitas sistem, file manager, kalender, catatan, dan status perangkat untuk memahami kondisi workspace. Informasi tersebut biasanya tersebar dan tidak memiliki hirarki yang jelas. Dashboard ini mengurangi context switching dengan merangkum informasi penting dalam satu permukaan yang konsisten.

## 4. Target Pengguna

| Persona | Kebutuhan utama | Hambatan |
|---|---|---|
| Developer Linux | Membaca health status dan membuka tool dengan cepat | Data tersebar di banyak aplikasi |
| Founder/solo builder | Memulai hari dengan konteks kerja yang jelas | Tidak punya ringkasan workspace |
| Power user | Mengawasi resource dan aktivitas | Dashboard generik kurang relevan |

## 5. Tujuan dan Non-Tujuan

Tujuan MVP adalah menyediakan dashboard yang terbuka cepat, dapat dipindai dalam kurang dari satu menit, memiliki navigasi yang jelas, dan menjadi fondasi untuk integrasi data nyata. Non-tujuan MVP adalah mengontrol hardware secara langsung, menggantikan window manager, menyediakan terminal penuh di browser, dan membuat sistem operasi Linux baru.

## 6. Fitur MVP

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| PRD-01 | Overview workspace | Ringkasan greeting, tanggal, status sistem, dan konteks mesin | P0 |
| PRD-02 | System health | Status healthy, uptime, kernel, CPU, memory, dan storage | P0 |
| PRD-03 | Quick launch | Shortcut Files, Terminal, Editor, dan Notes | P0 |
| PRD-04 | Activity feed | Riwayat aktivitas sistem dan workspace | P1 |
| PRD-05 | Calendar context | Agenda hari berjalan | P1 |
| PRD-06 | Weather context | Kondisi cuaca lokasi pengguna | P1 |
| PRD-07 | Navigation shell | Sidebar desktop dan drawer mobile | P0 |
| PRD-08 | Interaction feedback | Search filtering, toast, notifications, dan focus mode | P1 |

## 7. Kebutuhan Pengalaman

Produk harus terasa personal, tenang, teknis, dan presisi. Pengguna harus dapat mengenali status sehat melalui bahasa warna Mint Leaf tanpa memerlukan penjelasan tambahan. Tampilan desktop mengutamakan rail navigasi dan komposisi asimetris; tampilan mobile mengutamakan urutan prioritas informasi dan akses menu yang mudah.

## 8. Acceptance Criteria Tingkat Produk

MVP diterima apabila pengguna dapat memahami status sistem dari halaman pertama, membuka quick launch, memfilter aplikasi melalui search, melihat activity dan calendar, serta mengakses navigasi pada desktop dan mobile. Tidak boleh ada teks yang kehilangan kontras, aksi utama yang tidak memberi feedback, atau layout yang melampaui viewport mobile.

## 9. Risiko dan Asumsi

Dokumen ini mengasumsikan data sistem, cuaca, kalender, dan aktivitas pada versi awal masih berupa data presentasi atau adapter lokal. Integrasi API nyata akan memerlukan autentikasi, permission, error state, caching, dan kebijakan privasi. Nama pengguna dan lokasi dapat dikonfigurasi pada fase berikutnya.

## 10. Roadmap

Fase berikutnya mencakup File Storage, autentikasi, data system metrics nyata, integrasi kalender dan cuaca, serta personalisasi workspace. Setiap integrasi harus memiliki loading, empty, error, dan offline state sebelum dianggap production-ready.
