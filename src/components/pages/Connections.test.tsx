// @vitest-environment jsdom
// Regression bug 2026-09-27: tombol "Hubungkan akun" gagal memulai consent —
// dulu fetch ke /api/google/start (SPA fallback + tanpa token auth). Kini
// memanggil action publik googleStartAction via useAction lalu navigasi penuh.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Connections from "./Connections";

const mocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  disconnectAccount: vi.fn(),
  googleStartAction: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.listAccounts(),
  useMutation: () => mocks.disconnectAccount,
  useAction: (ref: unknown) => (ref === "googleStartAction" ? mocks.googleStartAction : vi.fn()),
}));

// Referensi fungsi Convex asli adalah Proxy tanpa konversi primitif — di mock
// cukup token string yang dicocokkan di atas.
vi.mock("@/convex/_generated/api", () => ({
  api: {
    googleAccounts: {
      listAccounts: "listAccounts",
      disconnectAccount: "disconnectAccount",
    },
    googleOAuthActions: {
      googleStartAction: "googleStartAction",
    },
  },
}));

const accounts = [
  { _id: "acc1", email: "pemilik@example.com", status: "active", scopes: ["a", "b"], lastSyncedAt: null },
];

describe("Connections: mulai consent Google", () => {
  beforeEach(() => {
    mocks.listAccounts.mockReset().mockReturnValue(accounts);
    mocks.disconnectAccount.mockReset();
    mocks.googleStartAction.mockReset();
  });
  afterEach(() => cleanup());

  it("klik Hubungkan akun memanggil googleStartAction dan mengunci tombol selama proses", async () => {
    // Promise tanpa resolusi: jalur sukses akan navigasi penuh browser
    // (tidak dieksekusi di jsdom) — cukup verifikasi pemanggilan + state.
    mocks.googleStartAction.mockReturnValue(new Promise(() => {}));
    render(<Connections />);
    const button = screen.getByRole("button", { name: /Hubungkan akun/ });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.googleStartAction).toHaveBeenCalledTimes(1));
    expect(mocks.googleStartAction).toHaveBeenCalledWith({});
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("gagal memulai (mis. GOOGLE_CLIENT_ID belum diisi) tampil sebagai flash eksplisit", async () => {
    mocks.googleStartAction.mockRejectedValue(new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum diisi"));
    render(<Connections />);
    fireEvent.click(screen.getByRole("button", { name: /Hubungkan akun/ }));
    const flash = await screen.findByRole("status");
    expect(flash.textContent).toContain("Gagal memulai koneksi");
    expect(flash.textContent).toContain("GOOGLE_CLIENT_ID");
    // Tombol kembali aktif setelah gagal — pemilik bisa mencoba lagi.
    expect((screen.getByRole("button", { name: /Hubungkan akun/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Connections: hasil callback (?status=)", () => {
  beforeEach(() => {
    mocks.listAccounts.mockReset().mockReturnValue(accounts);
    mocks.disconnectAccount.mockReset();
    mocks.googleStartAction.mockReset();
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/connections");
  });

  it("status=connected menampilkan flash sukses", () => {
    window.history.replaceState({}, "", "/connections?status=connected&email=pemilik@example.com");
    render(<Connections />);
    const flash = screen.getByRole("status");
    expect(flash.textContent).toContain("berhasil");
  });

  it("status=error menampilkan flash gagal", () => {
    window.history.replaceState({}, "", "/connections?status=error");
    render(<Connections />);
    const flash = screen.getByRole("status");
    expect(flash.textContent).toMatch(/gagal/i);
  });
});
