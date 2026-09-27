// Cron Convex — pekerjaan berkala satu-satunya di AbelionOS.
// Persetujuan eksplisit pemilik untuk news watcher tercatat di todo.md
// (2026-09-25, "auto update ketika ada berita baru tanpa menunggu rentang
// waktu"). Interval 5 menit memadai untuk RSS metadata-only; biaya tetap
// dalam free tier Convex.
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
  "news watcher",
  { minutes: 5 },
  internal.newsWatcher.newsWatcherRun,
  {}
);
export default crons;
