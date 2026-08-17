# Ideas: Dashboard OS Linux Mint

## Pendekatan 1: Mint Atelier
**Very Brief Intro:** Antarmuka desktop yang hangat dan terkurasi, memadukan hijau zamrud khas Linux Mint dengan material kertas, panel krem, dan tipografi editorial. Nuansanya tenang, terpercaya, dan terasa seperti ruang kerja yang dibuat dengan teliti.

**Probability:** 0.07

## Pendekatan 2: Terminal Orchard
**Very Brief Intro:** Dashboard gelap dengan aksen hijau mint dan kuning amber, terinspirasi terminal, panel monitoring, dan utilitas sistem. Karakternya teknis, fokus, dan sedikit retro tanpa menjadi cyberpunk.

**Probability:** 0.04

## Pendekatan 3: Quiet Utility
**Very Brief Intro:** Sistem desktop minimal dengan bidang putih hangat, garis tipis, dan warna aksen yang hemat. Prioritasnya adalah keterbacaan, ketenangan, dan efisiensi ruang untuk pengguna yang bekerja lama di depan layar.

**Probability:** 0.09

# Chosen Approach: Mint Atelier

## Design Movement
Contemporary Swiss editorial UI bertemu dengan material design yang hangat dan bahasa visual Linux Mint. Struktur tegas, tetapi permukaan terasa taktil dan manusiawi.

## Core Principles
1. **Clarity over chrome:** setiap panel menjawab kebutuhan tertentu dan tidak memakai dekorasi tanpa fungsi.
2. **Warm utility:** sistem operasi terasa bersahabat melalui warna krem, bayangan lembut, dan bahasa yang tidak mengintimidasi.
3. **Editorial hierarchy:** angka, status, dan judul memiliki skala yang jelas seperti halaman majalah teknis.
4. **Asymmetric rhythm:** komposisi memakai sidebar, kolom status, dan blok data dengan bobot visual yang sengaja tidak seragam.

## Color Philosophy
Hijau mint bukan sekadar aksen, tetapi sinyal bahwa sistem dalam kondisi sehat dan terkendali. Latar parchment memberi kehangatan dan mengurangi kesan dingin dashboard teknis. Charcoal digunakan untuk teks agar kontras tetap tinggi, sedangkan amber menjadi sinyal perhatian yang jarang dan bermakna.

## Layout Paradigm
Desktop canvas dengan rail navigasi kiri yang ringkas, top utility bar, dan content field asimetris: satu area hero untuk status sistem, satu kolom kanan untuk context, serta baris modular untuk aplikasi dan aktivitas. Pada mobile, rail berubah menjadi bottom dock dan blok-blok disusun ulang menurut prioritas.

## Signature Elements
- Mint ribbon: garis atau pill hijau yang menandai status sehat.
- Parchment cards: panel krem dengan shadow lembut dan radius sedang, bukan kartu putih generik.
- System glyphs: ikon monoline besar dengan lingkaran indikator kecil.

## Interaction Philosophy
Interaksi harus terasa seperti mengoperasikan workspace, bukan mengisi formulir. Hover memberi lift tipis, klik memberi compression singkat, dan setiap aksi penting memberi perubahan status langsung. Navigasi tetap jelas walaupun panel samping diciutkan.

## Animation
Entrance hanya memakai opacity dan translate kecil dengan stagger 40ms. Hover card mengangkat 2px dalam 180ms. Tombol aktif scale 0.97. Chart menggunakan stroke-dashoffset singkat ketika pertama tampil. Semua animasi non-esensial dimatikan untuk prefers-reduced-motion.

## Typography System
Display: **DM Sans**, 700-800, untuk angka besar dan heading utama. Body: **Source Sans 3**, 400-600, untuk label, deskripsi, dan navigasi. Metadata memakai Source Sans 3 semibold dengan letter spacing 0.08em dan uppercase. Hierarki: display 44/48, section 16/20, body 14/20, metadata 11/14.

## Brand Essence
Dashboard OS untuk pengguna Linux yang ingin membaca kondisi mesin dan mengatur workspace dari satu layar yang hangat, tenang, dan terukur. **Personal, grounded, precise.**

## Brand Voice
Headline berbicara singkat dan observasional. CTA berupa tindakan nyata, bukan jargon. Microcopy memberi konteks tanpa menggurui.

Contoh:
- "Your workspace is in good shape."
- "Open the tools you use most."

## Wordmark & Logo
Logo berupa abstraksi daun mint yang dibentuk dari tiga bidang geometris seperti jendela aplikasi, tanpa menuliskan nama brand di dalam simbol. Wordmark menggunakan DM Sans ExtraBold dengan potongan kecil pada huruf O untuk meniru bentuk jendela.

## Signature Brand Color
**Mint Leaf #78C091**, warna hijau desaturasi yang menghubungkan kesehatan sistem dengan nuansa kebun, bukan neon teknologi.

## Style Decisions
- Gunakan latar parchment dan charcoal, bukan purple gradient atau neon.
- Gunakan sidebar asimetris dan panel yang terasa seperti instrumen kerja.
- Gunakan logo daun geometris sebagai simbol brand dan favicon.
- Hindari testimonial atau review palsu; dashboard hanya menampilkan data sistem dan status aplikasi.

## Style Decisions
- Rail kiri adalah struktur inti desktop dan harus memuat simbol daun geometris, active workspace, serta destinasi OS yang jelas.
- Mint Leaf #78C091 menjadi bahasa visual untuk status sehat, navigasi aktif, progress, dan angka sistem penting.
- Komposisi menghindari simetri SaaS terpusat: panel sistem dominan, kolom konteks asimetris, dan modul data dengan bobot berbeda.
- Permukaan hangat dipertahankan, tetapi setiap panel sistem harus menyertakan glyph, status numerik, atau label teknis agar terasa seperti instrumen kerja.
