# UI/UX Design Specification

## 1. Design Direction

Nama arah desain adalah **Mint Atelier**. Arah ini menggabungkan Swiss editorial UI dengan material design yang hangat dan bahasa visual Linux Mint. Tujuannya adalah membuat dashboard yang terasa seperti ruang kerja pribadi, bukan halaman SaaS generik.

## 2. Brand System

| Elemen | Spesifikasi |
|---|---|
| Signature color | Mint Leaf `#78C091`, sinyal sehat dan kontrol |
| Background | Parchment `#F4F0E6`, hangat dan rendah distraksi |
| Surface | Paper `#FBF9F3`, untuk panel dan cards |
| Text | Charcoal `#1F2C26`, kontras dan grounded |
| Attention | Amber `#D7A94D`, hanya untuk cuaca atau perhatian |
| Display font | DM Sans 700–800 |
| Body font | Source Sans 3 400–700 |
| Logo | Tiga bidang window geometris membentuk daun mint |

## 3. Layout Paradigm

Desktop menggunakan rail kiri selebar sekitar 246px, topbar utility yang sticky, dan canvas utama dengan padding luas. Content field memiliki satu panel system health dominan, satu panel cuaca lebih ringan, baris quick launch, lalu modul activity dan calendar dengan bobot yang berbeda.

Mobile mengubah rail menjadi drawer. Topbar memprioritaskan menu, breadcrumb ringkas, search icon, notification, dan power action. Konten disusun menjadi satu kolom: greeting, system health, weather, quick launch dua kolom, activity, lalu calendar.

## 4. Information Hierarchy

Urutan perhatian pengguna adalah status mesin, konteks hari, tool yang sering digunakan, aktivitas terbaru, lalu agenda. Status healthy selalu memakai Mint Leaf melalui pill, progress, titik indikator, dan angka penting. Amber tidak digunakan untuk dekorasi umum agar tetap memiliki makna ketika muncul.

## 5. Component Specification

| Komponen | Perilaku visual | Perilaku interaksi |
|---|---|---|
| Sidebar | Latar sage pucat, active item berbentuk paper pill | Active nav berubah; item placeholder memberi toast |
| Topbar | Border bawah tipis, blur ringan, utility alignment | Search dapat difokuskan; notification membuka popover |
| System hero | Panel dominan dengan visual botanical dan overlay parchment | Refresh memberi feedback; metrics menunjukkan progress |
| Status chip | Pill hijau dengan live dot | Menunjukkan healthy state |
| Quick launch | Card kecil dengan glyph monoline dan arrow | Hover lift; click compression dan toast |
| Activity row | Icon tone, title, detail, timestamp | Footer membuka histori pada fase berikutnya |
| Calendar event | Timeline vertikal mint atau amber | Open calendar memberi feedback |
| Focus toggle | Outline control dengan dot state | Toggle mengubah state dan toast |

## 6. Spacing dan Shape

Sistem spacing utama memakai kelipatan 4px dengan padding panel 24–29px. Radius panel besar adalah 15px, card kecil 12px, dan control 8px. Border dipakai tipis dan redup; depth terutama berasal dari soft shadow dan perbedaan surface, bukan border tebal.

## 7. Motion

Hover menggunakan translateY sekitar 2–3px dan durasi sekitar 180ms. Button press menggunakan scale 0.97. Popover menggunakan perubahan opacity dan transform dari trigger. Tidak ada animasi layout yang mengubah width atau height. `prefers-reduced-motion` harus menonaktifkan motion non-esensial.

## 8. Copywriting

Voice bersifat singkat, observasional, dan actionable. Headline utama yang digunakan adalah “Good morning, Abelion.” dan “Everything is running smoothly.” Microcopy harus memberi konteks nyata seperti “Your workspace is in good shape.” Hindari filler seperti “Welcome to our website” atau CTA abstrak.

## 9. Accessibility

Semua icon-only button memiliki `aria-label`. Text dan background harus memiliki kontras yang memadai. Navigasi harus dapat dicapai melalui keyboard. Drawer mobile memiliki close action dan scrim. Toast tidak boleh menjadi satu-satunya tempat untuk menyampaikan informasi penting.

## 10. Responsive Acceptance Criteria

Pada lebar desktop, sidebar dan content canvas harus terlihat bersamaan. Pada lebar mobile, tidak boleh ada horizontal overflow; system hero dan weather card harus menjadi satu kolom; quick launch harus tetap dapat dibaca dalam dua kolom; menu drawer harus dapat dibuka dan ditutup dengan jelas.

## 11. Asset Usage

Logo transparan digunakan pada brand lockup dan favicon. Hero botanical hanya digunakan pada system hero untuk menjaga keunikan visual. Visual glyph tidak boleh menggantikan label tekstual pada informasi yang penting.
