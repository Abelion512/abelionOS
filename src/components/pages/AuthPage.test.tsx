// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthPage from "./AuthPage";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), navigate: vi.fn() }));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mocks.signIn }),
}));
vi.mock("wouter", () => ({
  useLocation: () => ["/auth", mocks.navigate],
}));
// Koneksi dianggap sehat supaya BackendStatusNotice tidak ikut dirender di test form.
vi.mock("convex/react", () => ({
  useConvexConnectionState: () => ({ isWebSocketConnected: true }),
}));

function fillAndSubmit(email = "hai@gmail.com", password = "password-pemilik") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
}

describe("AuthPage", () => {
  beforeEach(() => {
    mocks.signIn.mockReset();
    mocks.navigate.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("default-nya mode Masuk dan bisa beralih ke pendaftaran", () => {
    render(<AuthPage />);
    expect(screen.getByRole("heading", { name: "Masuk" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Daftar di sini/ }));
    expect(screen.getByRole("heading", { name: "Buat akun" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Daftar" })).toBeTruthy();
  });

  it("mengirim flow signUp saat mode pendaftaran dan navigasi setelah sukses", async () => {
    mocks.signIn.mockResolvedValue(undefined);
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: /Daftar di sini/ }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hai@gmail.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password-pemilik" } });
    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));
    await waitFor(() =>
      expect(mocks.signIn).toHaveBeenCalledWith("password", {
        flow: "signUp",
        email: "hai@gmail.com",
        password: "password-pemilik",
      }),
    );
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/dashboard"));
  });

  it("menjelaskan InvalidAccountId sebagai akun belum terdaftar, bukan pesan mentah", async () => {
    mocks.signIn.mockRejectedValue({ data: { code: "InvalidAccountId" }, message: "ConvexError" });
    render(<AuthPage />);
    fillAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/belum punya akun/i);
    expect(alert.textContent).not.toMatch(/ConvexError/);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("menampilkan pesan retry untuk error server/timeout backend dev", async () => {
    mocks.signIn.mockRejectedValue(new Error("[Request ID: abc] Server Error Uncaught Error: Function execution timed out"));
    render(<AuthPage />);
    fillAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/coba lagi/i);
    expect(screen.getByRole("button", { name: "Masuk" })).toBeTruthy();
  });

  it("watchdog mengakhiri tombol Memproses… yang menggantung", async () => {
    vi.useFakeTimers();
    mocks.signIn.mockReturnValue(new Promise(() => {}));
    render(<AuthPage />);
    fillAndSubmit();
    expect(screen.getByRole("button", { name: "Memproses…" })).toBeTruthy();
    // Fake timer + act: tanpa act, state React dari watchdog tidak ter-flush.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(screen.getByRole("alert").textContent).toMatch(/coba lagi/i);
    expect(screen.getByRole("button", { name: "Masuk" })).toBeTruthy();
  });
});
