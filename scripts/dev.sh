#!/bin/sh
# Preview self-contained: backend Convex lokal + Vite dev server.
# ponytail: satu script menghidupkan keduanya agar WebSocket Convex tersedia
# di preview tanpa akun cloud; produksi tetap memakai VITE_CONVEX_URL cloud.
#
# Incident 2026-09-26: preview di-SIGKILL OOM karena backend convex lokal dari
# run sebelumnya menjadi proses yatim (exec mengganti shell sehingga trap
# cleanup tidak pernah jalan) dan tiap edit file memicu siklus push + tsc
# penuh berulang. Perbaikan tanpa mengubah perilaku aplikasi:
# 1. bunuh yatim di port 3210 sebelum start (hanya backend lokal kita yang
#    memakai port itu);
# 2. tanpa `exec` — vite berjalan foreground sehingga trap cleanup bekerja
#    dan convex ikut mati saat script berakhir;
# 3. --typecheck=disable di loop dev (tsc berulanglah yang memakan RAM);
#    guard typecheck tetap dari platform check pasca-turn dan CI.
set -e
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3210/tcp 2>/dev/null || true
fi
bunx convex dev --typecheck=disable &
CONVEX_PID=$!
cleanup() {
  kill "$CONVEX_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
bunx vite --host 0.0.0.0 --port "${PORT:-8080}"
