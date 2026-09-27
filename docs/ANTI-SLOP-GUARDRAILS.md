# AbelionOS Anti-Slop Guardrails

## Status dan Scope

Taste Skill `design-taste-frontend` telah dipasang untuk lingkungan proyek melalui `npx skills add Leonxlnx/taste-skill`. Skill tersebut secara eksplisit menyatakan bahwa ia terutama ditujukan untuk landing page, portfolio, dan redesign, **bukan dashboard atau product UI multi-langkah**. Karena itu AbelionOS memakai prinsip audit-first dan anti-defaultnya, bukan aturan landing-page secara literal.[1]

> **Design read AbelionOS:** personal operational dashboard untuk satu pemilik Linux Mint, dengan bahasa visual Mint Atelier yang tenang, editorial, evidence-first, dan berdisiplin HIG; design variance 5, motion intensity 2, visual density 5.

## Sumber dan Hierarki Keputusan

| Sumber | Dipakai untuk | Tidak diterapkan secara literal |
|---|---|---|
| Taste Skill | Audit-first redesign, anti-template discipline, explicit mobile fallback, contextual card usage, interactive-state coverage, contrast review | Hero/CTA marketing rules, bento requirements, landing-page density presets, dan larangan generik untuk dashboard |
| `design.md` dari pengguna | Clarity, deference, depth, grid 8pt, batas radius, shadow ambient, restraint warna, serta checklist pre-publish | Larangan asimetri secara mutlak dan kewajiban system font yang akan menghapus identitas Mint Atelier |
| Mint Atelier V1 | Warm parchment, botanical Dashboard hero, DM Sans + Source Sans 3, mint primary accent, evidence-first structure | Kartu utilitas seragam, decorative UI, dan placeholder sistem |

## Aturan Wajib AbelionOS

| Area | Guardrail |
|---|---|
| Halaman | Satu pertanyaan operasional utama per halaman. Dashboard: kesiapan workspace; Daily Focus: apa yang perlu perhatian; Storage: apa yang terobservasi; Activity: apa yang berubah. |
| Hierarki | Satu primary surface di atas fold. Surface sekunder harus memberi evidence atau tindakan yang berbeda, bukan kartu seragam. |
| Kartu | Card dipakai hanya untuk keputusan, source evidence, atau action yang terikat. Gunakan `divide-y`, batas tipis, atau negative space untuk daftar yang tidak membutuhkan elevasi. |
| Copy | Setiap kalimat menyatakan source, state, uncertainty, atau next human decision. Klaim dekoratif, pseudo-intelligence, dan filler dilarang. |
| Warna | Mint adalah accent interaktif utama. Amber dan rose hanya status semantik (warning/error), bukan aksen kompetitif. Satu neutral family hangat dipakai lintas halaman. |
| Tipografi | DM Sans untuk display dan Source Sans 3 untuk body tetap merupakan keputusan brand. Maksimum dua family; hierarchy mengikuti large title, title, headline, body, dan caption. |
| Spacing | Gunakan kelipatan grid 4/8px untuk rhythm baru. Legacy spacing tidak diperluas tanpa alasan komposisional. |
| Material dan motion | Shadow ambient tipis sesuai hue background. Glassmorphism hanya untuk layering fungsional (dialog, dropdown, popover, overlay sidebar, notification center), bukan dekorasi kartu statis: `backdrop-filter: blur` pada layer transparan di atas konten bergerak, dengan border 1px semi-transparan dan fallback opaque saat `backdrop-filter` tidak didukung. Bukan gradient berkilau, neon border, atau blur pada kartu yang berdiri sendiri. Motion di bawah 300ms, hanya transform/opacity, dan menghormati reduced motion; saat reduced motion aktif, glass degenerate ke background opaque. |
| Ikon | Pertahankan Lucide karena sudah menjadi satu keluarga ikon yang konsisten di project. Jangan menambah family ikon kedua hanya karena Taste Skill memiliki preferensi library lain. Ikon Sparkles/AI-glamour dilarang sebagai dekorasi (termasuk pada copy "AI-powered"). |
| Struktur DOM | Tidak ada wrapper div nested atau borderless tanpa fungsi layout yang jelas: setiap pembungkus harus membawa spacing, border, grouping semantik, atau behavior. Flat-first: bila pembungkus bisa dihapus tanpa perubahan visual/aksesibilitas, hapus. |
| Gradien | Gradient purple/pink dilarang. Multicolor gradient dilarang sesuai identitas. Satu-satunya gradien yang diperbolehkan adalah ambient hangat yang sudah ada dalam palette parchment. |
| Responsif | Setiap grid punya fallback eksplisit di 900px/680px atau breakpoint yang lebih sempit. Tidak boleh mengandalkan wrapping kebetulan. Glass surface wajib diverifikasi pada 375px: teks dan kontrol tetap terbaca, blur tidak menciptakan area kontras rendah, dan dialog tetap muat viewport. |
| Detail | Evidence panjang dan action composer masuk dialog hanya bila preview halaman cukup untuk menentukan apakah detail perlu dibuka. Jangan menyembunyikan konteks esensial. |
| State | Loading, unavailable, error, empty, success, dan confirmation harus memakai data nyata atau state eksplisit. Tidak ada mock, seeded review, atau placeholder yang menyaru sebagai data. |

## Keputusan Ponytail yang Diterapkan

Notification Center tidak lagi memiliki tombol **Refresh** manual. Saat dialog dibuka, mutation `observeStatus` yang sudah ada menerbitkan observasi companion dan menginvalidasi inbox; query juga melakukan refetch ketika jendela kembali fokus. Menambah tombol kedua hanya memperluas kontrol tanpa sumber data baru. Tombol **Mark all read** dipertahankan karena melakukan aksi user-scoped yang berbeda. Tidak ada dependency, hook, atau abstraction baru yang ditambahkan.

## Checklist Sebelum Checkpoint

- [ ] Apakah primary surface menjawab pertanyaan halaman dalam satu pandangan?
- [ ] Apakah setiap kartu memiliki satu reason to exist, bukan sekadar pembungkus layout?
- [ ] Apakah eyebrow/source label membantu provenance nyata? Jika tidak, hapus.
- [ ] Apakah CTA memiliki intent unik, label singkat, kontras cukup, dan tidak wrap pada desktop?
- [ ] Apakah text, controls, error, focus ring, dan metadata terbaca pada background sebenarnya?
- [ ] Apakah warna selain mint membawa status semantik yang jelas?
- [ ] Apakah mobile fallback sudah diverifikasi pada 375px tanpa teks terpotong atau drawer/modal yang menutup konteks?
- [ ] Apakah setiap glass surface adalah layering fungsional (mengambang di atas konten), bukan kartu statis ber-blur, dan fallback opaque-nya teruji?
- [ ] Apakah test, typecheck, build, dan screenshot page terkait telah lulus tanpa data dummy?

## Referensi

[1]: https://www.tasteskill.dev/ "Taste Skill documentation and installation"
[2]: https://github.com/Leonxlnx/taste-skill "Leonxlnx/taste-skill source repository"
[3]: https://developer.apple.com/design/human-interface-guidelines/ "Apple Human Interface Guidelines"

## Referensi Anti-Slop Tambahan (kurasi pengguna)

- [no-ai-slop](https://github.com/petergyang/no-ai-slop) — penghapusan pola copy AI-slop (binary contrast, throat-clearing, faux-insight, weasel attribution); dipakai untuk audit copy UI.
- [impeccable](https://github.com/pbakaus/impeccable) — disiplin detail UI.
- [apple-design-skill](https://github.com/dickwu/apple-design-skill) — penerapan Apple HIG yang kontekstual.
- [stop-slop](https://github.com/hardikpandya/stop-slop) — checklist anti-template.
- [i-have-adhd](https://github.com/ayghri/i-have-adhd) — keterbacaan dan hierarki untuk attention budget rendah.
