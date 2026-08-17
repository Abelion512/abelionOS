# Stress-Test Remediation

## Scope and Evidence

Dokumen ini menutup temuan yang dapat ditangani tanpa mengarang data atau membuat record test pada akun pengguna. Validasi lokal terakhir menjalankan `pnpm test`, `pnpm run check`, dan `pnpm run build` dengan **14 test files dan 30 tests lulus**. Pemeriksaan browser dilakukan pada `/connections`, `/processes`, `/activity`, dan `/files` menggunakan state nyata yang tersedia, yaitu empty atau unavailable ketika bridge dan provider belum dikonfigurasi.

| Temuan | Tindakan | Evidence |
|---|---|---|
| Sumber tidak tersedia harus tetap jujur | Morning Briefing menampilkan source badge `ready`, `partial`, `unavailable`, atau `error`; tidak ada substitusi data | `server/morningBriefing.test.ts` |
| Bridge dapat timeout dan pulih | Semua request bridge dibatalkan setelah 5 detik; polling health menguji failure lalu recovery | `bridge.test.ts`, `bridgeHealthPolling.test.ts` |
| Refresh bersamaan dapat mencampur data | Agregasi briefing diuji serentak untuk lima user dan tetap user-scoped | `morningBriefing.test.ts` |
| Upload object dan metadata tidak boleh tampak atomik padahal gagal | Workflow prepare → transfer → complete teruji: transfer gagal tidak memanggil completion; completion gagal tampil sebagai error | `fileUploadWorkflow.test.ts` |
| Hasil lama dapat disalahpahami setelah refresh gagal | Hasil retained diberi banner stale dengan pesan kegagalan terbaru | `briefingState.test.ts` |

## Deliberate Boundaries

> Tidak ada file S3, event audit, Calendar event, Gmail message, process, atau token uji yang dibuat oleh automated suite.

End-to-end Linux companion, upload S3 nyata, dan consent Google masih merupakan gate operasional pada laptop dan akun pengguna. Jalankan langkah terkait pada [Runtime Verification Runbook](./RUNTIME-VERIFICATION-RUNBOOK.md) sebelum menyatakan source tersebut connected di production.

Storage template yang dipakai tidak mengekspos endpoint delete object. Bila object sudah ter-upload lalu database completion gagal, aplikasi tidak membuat metadata atau tautan ke object tersebut; key yang tidak direferensikan tidak dapat dijangkau dari UI. Tidak ada cleanup fisik yang diklaim, dan implementasi tidak mengarang endpoint delete yang tidak disediakan platform.

## Residual Work

Pekerjaan berikut tidak dihapus dari backlog: fixture integration bridge lebih luas, E2E route penuh dalam CI dengan environment aman, browser-console collection pada CI, serta performance budget. Mereka tidak dipalsukan sebagai sudah selesai karena membutuhkan harness companion atau pipeline CI yang belum dikonfigurasi di proyek ini.
