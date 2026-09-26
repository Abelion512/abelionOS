# Implementation Audit

## Executive Finding

Mintdesk saat ini adalah **web application full-stack dengan Linux companion lokal**, bukan sistem operasi desktop dan bukan remote shell. Aplikasi memiliki route operasional untuk Overview, Processes, Files, Connections, Activity, Settings, dan Morning Briefing; backend menyimpan audit, metadata file, serta koneksi Google terenkripsi. Koneksi Linux nyata dan consent Google tetap belum dapat dinyatakan selesai sampai diverifikasi pada laptop dan akun pengguna.

## Status Matrix

| Area | Status faktual | Catatan |
|---|---|---|
| Visual dashboard | Implemented | Mint Atelier responsive shell dengan source-aware states |
| Routing | Implemented | `/`, `/processes`, `/activity`, `/files`, `/connections`, `/settings`, dan `/briefing` |
| Authentication | Implemented | Protected tRPC domain procedures memakai session user |
| Database | Implemented | `users`, `files`, `audit_events`, dan `google_connections` sudah dipakai |
| tRPC/API | Implemented | Audit, file metadata, Google status, dan briefing contracts tersedia |
| File Storage | Implemented, real runtime pending | Presigned S3 transfer + metadata completion; E2E upload pengguna belum dijalankan |
| Linux bridge | Implemented, real runtime pending | Source, systemd user service, health/metrics/process/audit endpoints tersedia |
| Process control | Implemented, real runtime pending | Allowlist, confirmation, SIGTERM, JSONL audit; Linux-laptop E2E belum dijalankan |
| Gmail/Calendar | Implemented, consent pending | PKCE callback, encrypted refresh token, read-only on-demand briefing adapter |
| Morning Briefing | Implemented | Audit, file metadata, Workspace, dan browser-local bridge snapshot dengan source status |
| Settings | Implemented as runtime facts | Menampilkan auth, browser bridge config, dan status OAuth user-scoped |
| Activity feed | Implemented | Server audit dan local bridge audit dijaga sebagai sumber terpisah |
| Documentation | Updated | Runbook, design docs, task breakdown, dan remediation mencatat batas nyata |

## Scope Correction

Pekerjaan berikutnya adalah validasi environment nyata dan coverage integration lebih luas, bukan menambah widget kosmetik. Feature yang belum memiliki bukti Linux/S3/OAuth tetap diberi label `unavailable`, `error`, atau `not connected`, bukan `connected`.

## Product Decision

MVP realistis terdiri dari Overview, System Processes, Files, Connections, Settings, Activity Audit, dan Morning Briefing on-demand. Drive dan cloud background polling tetap di luar scope. Linux bridge tetap menjadi companion lokal yang diinstal manual karena Manus Desktop belum mendukung Linux.
