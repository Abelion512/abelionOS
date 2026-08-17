# Model Operasional Daily Focus

Daily Focus adalah **asisten pembaca bukti**, bukan agent pengendali. Ketika halaman dibuka, Mintdesk meminta Morning Briefing secara on-demand dari Google Calendar read-only, Gmail metadata, dan audit aplikasi yang terikat pengguna. Halaman selalu menampilkan bukti yang tersedia lebih dahulu. Jika satu sumber gagal, halaman menjelaskan bahwa sumber tersebut tidak tersedia dan tidak menggantikannya dengan asumsi, riwayat AI, atau data contoh.

Refinement dilakukan hanya ketika pengguna memilih **Refine priorities**. Browser mengirim evidence yang telah disaring ke Linux companion lokal, lalu companion meneruskannya ke 9router pada loopback. Model harus mengembalikan JSON tervalidasi, dengan setiap prioritas mengacu pada `evidenceRefs` yang benar-benar ada. Respons model tidak ditampilkan mentah. Bila companion atau 9router tidak tersedia, Mintdesk mempertahankan evidence dan menyatakan reasoning unavailable.

| Aspek | Kebijakan yang diterapkan |
|---|---|
| Sumber yang diizinkan | Calendar event metadata, Gmail metadata tanpa body, dan audit aplikasi terbaru. |
| Data yang dilarang | Isi email, kredensial OAuth, token companion, filesystem, S3 object, dan data di luar Morning Briefing. |
| Batas reasoning | 9router lokal hanya melakukan reasoning terstruktur. Ia tidak menerima tool, tidak memanggil API pihak ketiga, dan tidak dapat mengubah Linux, Google, atau file. |
| Penjadwalan | Tidak ada scheduled AI run. Refinement hanya terjadi melalui tindakan eksplisit pengguna. |
| Human override | Pengguna dapat menandai prioritas selesai atau mendeprioritaskannya di browser. Override tidak mengubah Calendar, Gmail, proses Linux, atau evidence asal. |

> Daily Focus tidak mengirim tindakan ke sistem mana pun. **Rekomendasi merupakan masukan yang dapat ditolak**, bukan instruksi yang dieksekusi otomatis.

Untuk menjalankan reasoning di laptop, Linux companion harus aktif pada loopback dengan bearer token lokal dan konfigurasi `MINTDESK_9ROUTER_URL`, `MINTDESK_9ROUTER_TOKEN`, serta `MINTDESK_9ROUTER_MODEL`. Konfigurasi tersebut hanya berada di `~/.config/mintdesk/bridge.env`; tidak pernah disimpan sebagai secret deployment atau dikirim ke browser.
