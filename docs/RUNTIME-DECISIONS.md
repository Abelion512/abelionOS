# Runtime and Scope Decisions

## Stack web application

Mintdesk web berjalan di Freebuff dengan **Bun** sebagai satu-satunya package
manager: React 19, TypeScript, Tailwind CSS 4, Wouter, Vite, dan **Convex**
sebagai backend/database (`bun.lock` tracked, `bun install --frozen-lockfile`
di CI). Stack Express + MySQL + Drizzle dari era sebelumnya sudah tidak ada —
semua query/mutation/action kini Convex user-scoped via `requireUserId`
(`src/convex/`), tanpa backend HTTP terpisah selain HTTP routes Convex
(`src/convex/http.ts` untuk Convex Auth + OAuth Google callback).

Runner test kontrak: **`bun run test`** (Vitest, memuat `vitest.config.ts` —
environment jsdom untuk test komponen dan env uji kripto). `bun test`
(runner bawaan Bun) tidak memuat config proyek dan membuat test komponen
gagal; CI dan workflow Release memakai script proyek.

## Deployment topology

| Komponen | Lokasi | Catatan |
|---|---|---|
| Static build | Freebuff hosting (`abelionos.freebuff.app`) | `bun run build` → `dist/`; perintah build wajib mengeset `VITE_CONVEX_URL` + `VITE_CONVEX_SITE_URL` eksplisit karena env warisan platform bisa berformat tersegel yang membuat bundle blank (diagnosa: halaman `/status`). |
| Backend + database | Convex cloud `agen-salva:mintdesk:production` (`charming-firefly-655.convex.cloud`) | Schema + functions di-push lewat `bunx convex deploy`; env backend dikelola lewat `bunx convex env set --deployment …`. |
| Preview dev | `scripts/dev.sh` (`bun run dev`) | Menyalakan `convex dev` + Vite di satu perintah; WebSocket Convex diproxy Vite (`/api`) ke backend lokal. |

## Linux companion

Companion **Bun** di laptop Linux adalah runtime terpisah dan tidak ikut
berpindah ke deployment web. Implementasinya masih menunggu persetujuan
pemilik; desain pairing lengkap ada di
[COMPANION-PAIRING-DESIGN.md](./COMPANION-PAIRING-DESIGN.md) dan status
terkininya dicatat di `todo.md` (seksi Implementasi Companion). Companion
hanya boleh polling outbound dengan capability allowlist AGENTS.md — tanpa
port inbound, tanpa remote shell, device secret hashed server-side.

## Google Workspace

Google Workspace writes are deliberately limited to reviewed Daily Focus
actions. Google Tasks, Calendar create/delete for self-organized events, and
Gmail Trash are available only after an explicit preview and confirmation.
Gmail Draft and send capabilities remain out of scope because `gmail.compose`
is not granted. A Calendar event has no Trash state; a controlled verification
creates a named test event and deletes that exact self-organized event only
after explicit approval.

Gmail content previews use the already-granted `gmail.modify` scope because
Google does not provide a narrower scope that both reads message bodies and
moves messages to Trash. The OAuth grant is therefore broader than Mintdesk's
application allowlist. Mintdesk does not expose Draft, send, permanent-delete,
filter, or settings endpoints. Bounded previews are fetched on open, never
persisted, and are sent to local reasoning only after the user explicitly
requests refinement.
