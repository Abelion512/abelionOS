#!/bin/sh
# Preview self-contained: backend Convex lokal + Vite dev server.
# ponytail: satu script menghidupkan keduanya agar WebSocket Convex tersedia
# di preview tanpa akun cloud; produksi tetap memakai VITE_CONVEX_URL cloud.
# Ceiling: bila preview pindah ke cloud backend penuh waktu, script ini bisa
# dihapus bersama semua logika pembersihannya.
#
# Incident 2026-09-26: preview OOM karena backend convex lokal dari run
# sebelumnya jadi yatim + siklus push/tsc berulang; perbaikannya memakai
# `fuser` yang ternyata tidak tersedia di sandbox (diam-diam gagal).
# Incident 2026-09-27: `freebuff-preview stop/restart` hanya mematikan satu
# lapis (vite) — watcher `convex dev` + backend lokal tertinggal sebagai
# yatim dan menumpuk antar restart (CPU 3k%, RAM merambat). Pembersih
# diganti pola `pkill -f` ber-path codebase:
# 1. saat start: bunuh sisa watcher/backend/vite milik proyek ini dari run
#    sebelumnya (pattern ber-path agar tidak menyentuh proses managed lain);
# 2. saat EXIT: bunuh lagi — anak `bunx` kadang lolos dari sinyal pertama;
# 3. tanpa `exec` — vite foreground sehingga trap cleanup pasti jalan;
# 4. --typecheck=disable di loop dev; guard tsc tetap dari platform check
#    pasca-turn dan CI.
# ponytail: pattern pkill berbasis nama, bukan port — cukup untuk sandbox
# satu-proyek ini; pertajam (match path/PORT) bila sandbox jadi multi-proyek.
set -e
pkill -f "bunx convex dev" 2>/dev/null || true
pkill -f "node_modules/.bin/convex dev" 2>/dev/null || true
pkill -f "convex-local-backend.*codebase/.convex" 2>/dev/null || true
pkill -f "codebase/node_modules/convex/node_modules/esbuild" 2>/dev/null || true
pkill -f "vite --host 0.0.0.0 --port" 2>/dev/null || true
sleep 1

bunx convex dev --typecheck=disable &
CONVEX_PID=$!
cleanup() {
  kill "$CONVEX_PID" 2>/dev/null || true
  pkill -f "node_modules/.bin/convex dev" 2>/dev/null || true
  pkill -f "convex-local-backend.*codebase/.convex" 2>/dev/null || true
  pkill -f "codebase/node_modules/convex/node_modules/esbuild" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
bunx vite --host 0.0.0.0 --port "${PORT:-8080}"
