# Task Breakdown

## Delivery Strategy

Pekerjaan dibagi berdasarkan vertical slice. Sebuah slice tidak dianggap selesai hanya karena UI muncul; slice harus memiliki route, domain model, API contract, data source, permission, empty/error state, test, dan dokumentasi. P0 adalah blocker MVP, P1 adalah release usability, dan P2 adalah enhancement.

## Phase 0: Product and Architecture

| ID | Priority | Task | Dependency | Done when |
|---|---|---|---|---|
| T01 | P0 | Bekukan scope MVP dan page inventory | Audit | PRD/SRS/UIUX/SDD konsisten |
| T02 | P0 | Definisikan schema files, connections, audit, settings | T01 | Drizzle schema dan migration plan tersedia |
| T03 | P0 | Definisikan tRPC procedures dan ownership rules | T02 | Contract typed dan error codes terdokumentasi |
| T04 | P0 | Definisikan auth, secret, OAuth, dan bridge threat model | T01 | Security review checklist disetujui |

## Phase 1: App Shell and Core Pages

| ID | Priority | Task | Dependency | Done when |
|---|---|---|---|---|
| T05 | P0 | Pisahkan Overview, Processes, Files, Connections, Activity, Settings routes | T01 | Tidak ada page feature yang hanya berupa toast placeholder |
| T06 | P0 | Gunakan shared desktop shell dan mobile drawer | T05 | Semua route memiliki navigation escape path |
| T07 | P0 | Implementasikan real auth identity state | T04 | Nama dan ownership berasal dari session |
| T08 | P0 | Tambahkan global loading/error/unavailable components | T05 | Semua P0 page memakai state matrix |

## Phase 2: Linux Operations Slice

| ID | Priority | Task | Dependency | Done when |
|---|---|---|---|---|
| T09 | P0 | Stabilkan bridge health dan metrics adapter | T04 | Health, CPU, memory, uptime, load diuji di Linux nyata |
| T10 | P0 | Implementasikan Processes page | T09 | Daftar proses user nyata tampil dengan refresh |
| T11 | P0 | Implementasikan explicit terminate allowlist | T10 | Non-allowlist dan foreign process ditolak |
| T12 | P0 | Implementasikan audit event bridge dan app | T11, T02 | Aksi terminate tercatat dan dapat difilter |
| T13 | P0 | Dokumentasikan installer dan systemd startup | T09 | User Linux dapat install manual dan uninstall |

## Phase 3: File Storage Slice

| ID | Priority | Task | Dependency | Done when |
|---|---|---|---|---|
| T14 | P0 | Tambahkan files table dan ownership query | T02 | Migration applied dan query teruji |
| T15 | P0 | Implementasikan managed/presigned upload | T14 | File bytes masuk S3, metadata masuk DB |
| T16 | P0 | Implementasikan Files page | T15 | Upload/list/download berjalan setelah refresh |
| T17 | P1 | Tambahkan delete policy dan confirmation | T16 | Delete tidak dapat mengakses file user lain |

## Phase 4: Google Workspace Slice

| ID | Priority | Task | Dependency | Done when |
|---|---|---|---|---|
| T18 | P0 | Implementasikan Google OAuth callback dan state | T04 | Code exchange dan CSRF state diuji |
| T19 | P0 | Simpan refresh token terenkripsi | T18, T02 | Plaintext token tidak masuk DB/log/browser |
| T20 | P1 | Implementasikan Calendar readonly | T19 | Event nyata tampil atau insufficient-scope state |
| T21 | P1 | Implementasikan Gmail metadata readonly | T19 | Search/list nyata tampil atau permission state |
| T22 | P2 | Implementasikan Drive readonly | T19 | File provider terpisah dari local S3 |

## Phase 5: Quality and Release

| ID | Priority | Task | Dependency | Done when |
|---|---|---|---|---|
| T23 | P0 | Unit tests domain dan security | T03, T11, T14, T18 | Test allowlist, ownership, OAuth, and states lulus |
| T24 | P0 | Integration tests backend dan S3 | T15, T19 | API dan storage flow lulus tanpa dummy data |
| T25 | P0 | E2E test pada laptop Linux | T09, T13 | Service, metrics, process list, and terminate diverifikasi |
| T26 | P0 | Responsive/accessibility QA | T05–T22 | Desktop/mobile/keyboard/reduced motion lulus |
| T27 | P0 | Documentation and operational handoff | T25 | Installer, env, rollback, and troubleshooting lengkap |
| T28 | P0 | Production checkpoint | T23–T27 | Build, tests, and live smoke test lulus |

## Explicit Non-Tasks

Tidak ada task untuk arbitrary shell, root escalation, remote host control, fake weather, fake activity, fake calendar, fabricated reviews, atau background polling yang tidak memiliki consent dan rate limit.

## Definition of Ready

Task siap jika output, dependency, owner, data source, permission model, acceptance criteria, failure state, dan test plan sudah jelas. Integrasi provider tidak boleh dimulai dengan hanya API key tanpa penetapan data minimization.

## Definition of Done

Task dianggap selesai setelah implementasi direview, TypeScript dan unit test lulus, acceptance criteria terpenuhi, real-data path diuji atau secara jujur diberi unavailable state, dan dokumentasi operasional diperbarui.
