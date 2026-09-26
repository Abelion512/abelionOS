// Logika murni observasi companion. Tabel heartbeat terus bertambah, jadi
// pembaca membatasi jumlah baris (RECENT_OBSERVATIONS) lalu meringkasnya
// menjadi state terakhir per device di sini — satu definisi untuk
// agents.listObservations dan dashboard.overview.
export const RECENT_OBSERVATIONS = 200;

// ponytail: ceiling — device yang berhenti melapor lebih lama daripada
// RECENT_OBSERVATIONS baris terakhir tidak lagi muncul di ringkasan. Upgrade
// path: tabel state "latest per device" yang di-update saat write companion,
// bukan memperbesar take.
export function latestPerDevice<T extends { deviceId: string; observedAt: number }>(
  rows: T[]
): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const prev = latest.get(row.deviceId);
    // Baris pertama per device menang saat observedAt sama; urutan input
    // (index desc = terbaru dulu) dipertahankan di hasil.
    if (!prev || row.observedAt > prev.observedAt) latest.set(row.deviceId, row);
  }
  return [...latest.values()];
}
