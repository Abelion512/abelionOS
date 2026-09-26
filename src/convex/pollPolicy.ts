// Kebijakan polling adaptif per sumber — logika murni tanpa runtime Convex.
// Tujuan (permintaan pemilik 2026-09-26): meminimalkan risiko rate-limit
// Google News tanpa mengorbankan kecepatan berita pertama (<5 menit), lalu
// interval longgar bertahap begitu pola stabil.
// ponytail: state satu angka (interval saat ini per sumber) di newsCache —
// tanpa tabel state terpisah. Jalur upgrade: backoff per-host bila suatu hari
// ada sumber non-Google yang perlu perlakuan berbeda.

// Cron berjalan tiap 5 menit: sumber due paling cepat diambil di run berikutnya.
export const POLL_FLOOR_MS = 5 * 60 * 1000;
// Sukses berturut → interval dinaikkan 1,5× sampai 20 menit.
export const POLL_CEILING_MS = 20 * 60 * 1000;
// 429/unavailable → interval digandakan sampai 60 menit (menjauh dari host).
export const BACKOFF_CEILING_MS = 60 * 60 * 1000;
// Kenaikan sukses bertahap (pola eksponensial halus): 5 → 7.5 → 11.25 → 16.9 → 20.
export const SUCCESS_FACTOR = 1.5;
export const FAILURE_FACTOR = 2;
// Maksimal sumber yang di-fetch per run watcher (sisanya menunggu run berikutnya);
// watch out: fetch on-demand tetap melayani sumber mana pun dari cache/manual.
export const MAX_POLLS_PER_RUN = 8;

// intervalMs opsional: baris newsCache lama (sebelum kebijakan adaptif) belum
// punya interval — pollDecision sudah memperlakukan kosong sebagai POLL_FLOOR.
export type PollState = { intervalMs?: number; lastFetchedAt?: number; lastOk?: boolean };

export type PollDecision = {
  due: boolean;
  reason: "never-fetched" | "interval-elapsed" | "waiting" | "capped-by-run-limit";
  nextIntervalMs: number;
};

/** Keputusan apakah satu sumber boleh di-fetch pada run ini (murni). */
export function pollDecision(
  state: PollState | undefined,
  now: number,
  hasRunBudget: boolean
): PollDecision {
  if (!state || state.lastFetchedAt === undefined) {
    return { due: true, reason: "never-fetched", nextIntervalMs: POLL_FLOOR_MS };
  }
  const interval = Math.max(POLL_FLOOR_MS, Math.min(state.intervalMs || POLL_FLOOR_MS, BACKOFF_CEILING_MS));
  const elapsed = now - state.lastFetchedAt;
  if (elapsed >= interval) {
    return hasRunBudget
      ? { due: true, reason: "interval-elapsed", nextIntervalMs: interval }
      : { due: false, reason: "capped-by-run-limit", nextIntervalMs: interval };
  }
  return { due: false, reason: "waiting", nextIntervalMs: interval };
}

/** Sukses: interval naik bertahap sampai ceiling 20 menit. */
export function recoverAfterSuccess(currentMs: number): number {
  const next = Math.round((Math.max(POLL_FLOOR_MS, currentMs) * SUCCESS_FACTOR) / 1000) * 1000;
  return Math.min(next, POLL_CEILING_MS);
}

/** Gagal (429/timeout/unavailable): mundur dua kali lipat sampai 60 menit. */
export function backoffAfterFailure(currentMs: number): number {
  const next = Math.round((Math.max(POLL_FLOOR_MS, currentMs) * FAILURE_FACTOR) / 1000) * 1000;
  return Math.min(next, BACKOFF_CEILING_MS);
}

export type DueCandidate = { id: string; state?: PollState };

/**
 * Pilih sumber due untuk run ini, terlama-dulu (fairness), dengan budget run.
 * Murni dan deterministik supaya mudah dites.
 */
export function selectDueSources(
  candidates: DueCandidate[],
  now: number,
  budget = MAX_POLLS_PER_RUN
): { due: DueCandidate[]; skipped: DueCandidate[] } {
  const scored = candidates
    .map((c) => ({ c, d: pollDecision(c.state, now, true) }))
    .filter((x) => x.d.due)
    .sort((a, b) => {
      const ta = a.c.state?.lastFetchedAt ?? -1;
      const tb = b.c.state?.lastFetchedAt ?? -1;
      return ta - tb;
    });
  const due = scored.slice(0, budget).map((x) => x.c);
  const skipped = scored.slice(budget).map((x) => x.c);
  return { due, skipped };
}
