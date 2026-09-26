import { describe, it, expect } from "vitest";
import { latestPerDevice, RECENT_OBSERVATIONS } from "./observationLogic";

const obs = (deviceId: string, observedAt: number, status = "online") => ({
  deviceId,
  observedAt,
  status,
});

describe("latestPerDevice", () => {
  it("mengambil observasi terbaru per device dan membuang duplikat", () => {
    const out = latestPerDevice([
      obs("laptop", 300, "online"),
      obs("phone", 250, "offline"),
      obs("laptop", 100, "offline"),
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((r) => [r.deviceId, r.observedAt, r.status])).toEqual([
      ["laptop", 300, "online"],
      ["phone", 250, "offline"],
    ]);
  });

  it("mempertahankan urutan kemunculan input (bukan urutan waktu naik)", () => {
    const out = latestPerDevice([obs("b", 10), obs("a", 50), obs("b", 99)]);
    expect(out.map((r) => r.deviceId)).toEqual(["b", "a"]);
    expect(out[0].observedAt).toBe(99);
  });

  it("tidak menimpa baris lebih baru dengan baris lama untuk device sama", () => {
    const out = latestPerDevice([obs("laptop", 500), obs("laptop", 400)]);
    expect(out).toEqual([obs("laptop", 500)]);
  });

  it("daftar kosong menghasilkan ringkasan kosong", () => {
    expect(latestPerDevice([])).toEqual([]);
  });

  it("batas baca tetap eksplisit dan terbatas", () => {
    expect(RECENT_OBSERVATIONS).toBeGreaterThan(0);
    expect(RECENT_OBSERVATIONS).toBeLessThanOrEqual(500);
  });
});
