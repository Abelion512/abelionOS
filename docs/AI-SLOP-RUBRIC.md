# AbelionOS Anti-AI-Slop Rubric

## Tujuan

AbelionOS harus memprioritaskan bukti, tindakan, dan status runtime. AI hanya membantu menyusun proposal dalam Daily Focus. Antarmuka tidak boleh memakai estetika generik sebagai pengganti kejelasan fungsi.

## Aturan yang dapat ditinjau

| Area | Hindari | Standar AbelionOS |
| --- | --- | --- |
| Copy | slogan, buzzword SaaS, pengulangan label dan helper text | satu pernyataan spesifik tentang data, aksi, atau status yang tersedia |
| Hierarki | eyebrow besar, badge di atas judul tanpa makna, hero marketing | breadcrumb atau label sumber hanya jika membantu orientasi atau provenance |
| Kontainer | kartu bersarang, grid kartu identik, border aksen dekoratif | satu lapisan surface untuk satu unit tugas; pakai dividers dan spacing sebelum membuat kartu baru |
| Warna dan motion | gradien/neon/glow sebagai dekorasi, pulse untuk status statis | warna hanya menyatakan status; motion hanya menandakan perubahan atau feedback interaksi |
| Aksi agent | tombol AI umum atau hasil mentah | proposal terstruktur, evidence reference, preview diff, dan konfirmasi eksplisit per aksi tulis/hapus |
| Mobile | teks kecil, label terpotong, toolbar padat | target sentuh jelas, teks fungsi minimal 14px, satu aksi primer per konteks |

## Pemeriksaan sebelum rilis

1. Setiap status harus terhubung ke sumber runtime atau provider yang nyata.
2. Setiap teks helper harus menambah informasi, bukan mengulang judul atau label.
3. Setiap modal hanya memuat keputusan yang dapat selesai tanpa nested navigation.
4. Setiap write/delete action harus memiliki preview, scope provider, dan confirmation record.
5. Screenshot desktop dan mobile harus diperiksa untuk overflow, kontras, serta hierarki tindakan.

## Sumber

- [Impeccable Slop catalog](https://impeccable.style/slop/): katalog pola visual dan kualitas yang dapat dideteksi.
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/): prinsip, foundations, patterns, components, dan inputs.
- [How I Design UI with Help of AI Tool, Without Ending up With Slop](https://pub.towardsai.net/how-i-design-ui-with-help-of-ai-tool-without-ending-up-with-slop-592ac513286b): argumen system-first untuk mengurangi keputusan default dari generator.
