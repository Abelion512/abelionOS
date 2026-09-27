// @vitest-environment jsdom
// Pin konsistensi registry capability: daftar chip di Settings harus persis
// gabungan registry backend (productReadLogic) — drift UI↔backend membuat
// capability yang di-set owner ditolak normalizeAllowlist di server.
// Plus regression pairing companion 2026-09-27: urutan langkah dialog dan
// perintah laptop yang benar-benar bisa di-paste ke shell.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  PRODUCT_PROPOSAL_CAPABILITIES,
  PRODUCT_READ_CAPABILITIES,
} from "@/convex/productReadLogic";
import { PRODUCT_CAPABILITIES } from "./SettingsPage";
import SettingsPage from "./SettingsPage";

const mocks = vi.hoisted(() => ({
  createPairingCode: vi.fn(),
  registerDevice: vi.fn(),
  devices: [] as unknown[],
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: unknown) => (ref === "companionDevices" ? mocks.devices : undefined),
  useMutation: (ref: unknown) => {
    if (ref === "companionCreateCode") return mocks.createPairingCode;
    if (ref === "companionRegisterDevice") return mocks.registerDevice;
    return vi.fn();
  },
  useAction: () => vi.fn(),
}));

// Referensi fungsi Convex asli adalah Proxy tanpa konversi primitif — di mock
// cukup token string yang dicocokkan di atas.
vi.mock("@/convex/_generated/api", () => ({
  api: {
    companion: {
      listCompanionDevices: "companionDevices",
      createPairingCode: "companionCreateCode",
      registerDevice: "companionRegisterDevice",
    },
    products: { listProducts: "products" },
    push: { sendTestPush: "sendTestPush" },
  },
}));

// Push API tidak tersedia di jsdom — bagian push tidak diuji di sini.
vi.mock("@/lib/pushSetup", () => ({
  usePushSetup: () => ({ state: "unsupported", error: null, enable: vi.fn(), disable: vi.fn() }),
}));

describe("Registry capability Settings ↔ backend", () => {
  it("chip Settings persis gabungan registry read (F3) + proposal (F4)", () => {
    expect(PRODUCT_CAPABILITIES).toEqual([
      ...PRODUCT_READ_CAPABILITIES,
      ...PRODUCT_PROPOSAL_CAPABILITIES,
    ]);
  });

  it("registry tidak memuat capability destruktif", () => {
    for (const cap of PRODUCT_CAPABILITIES) {
      expect(cap).not.toMatch(/delete|trash|send/);
    }
  });
});

describe("Dialog pairing companion (urutan langkah)", () => {
  beforeEach(() => {
    mocks.devices = [];
    mocks.createPairingCode.mockResolvedValue({ code: "ABCD2345", expiresAt: Date.now() + 600_000 });
    mocks.registerDevice.mockResolvedValue({ deviceId: "dev_laptop" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("daftarkan device dulu (Langkah 1), perintah laptop baru muncul setelah terdaftar", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pasangkan perangkat/ }));
    expect(await screen.findByText(/Langkah 1/)).toBeTruthy();
    // Perintah laptop tidak boleh tampil sebelum device terdaftar: claim
    // mensyaratkan device pending yang terikat ke code (Langkah 1 browser).
    expect(screen.queryByText(/companion\/pair\.ts/)).toBeNull();

    // Scoped ke dialog: form produk juga punya tombol "Daftarkan".
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nama device"), {
      target: { value: " Laptop Kantor " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Daftarkan" }));

    expect(await screen.findByText(/Langkah 2/)).toBeTruthy();
    expect(mocks.registerDevice).toHaveBeenCalledWith({
      code: "ABCD2345",
      name: "Laptop Kantor",
      type: "laptop",
    });
    const command = within(screen.getByRole("dialog")).getByText(/companion\/pair\.ts/).textContent ?? "";
    // Nama otoritatif = nama yang didaftarkan browser (trim, tanpa spasi tepi).
    expect(command).toContain('--name "Laptop Kantor"');
    expect(command).toContain("--code ABCD2345");
    expect(command).toContain("--endpoint");
    // Tiap baris selain baris terakhir harus diakhiri satu backslash (continuation)
    // — escape ganjil membuat perintah pecah saat di-paste ke shell.
    const lines = command.split("\n");
    for (const [i, line] of lines.entries()) {
      if (i < lines.length - 1) expect(line.endsWith(" \\")).toBe(true);
    }
  });
});
