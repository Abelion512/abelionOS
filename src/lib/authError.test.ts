import { describe, expect, it } from "vitest";
import { explainAuthError } from "./authError";

describe("explainAuthError", () => {
  it("mengarahkan akun belum terdaftar ke mode Daftar, tanpa bocoran pesan ConvexError", () => {
    const mapped = explainAuthError({ data: { code: "InvalidAccountId" }, message: "ConvexError" });
    expect(mapped).toMatch(/belum punya akun/i);
    expect(mapped).not.toMatch(/ConvexError/);
  });

  it("tetap memetakan pesan InvalidAccountId yang datang sebagai string mentah", () => {
    expect(explainAuthError(new Error("Uncaught Error: InvalidAccountId"))).toMatch(/belum punya akun/i);
  });

  it("menjelaskan password salah dan status guard pemilik", () => {
    expect(explainAuthError(new Error("Uncaught Error: InvalidSecret"))).toBe("Password salah.");
    expect(explainAuthError(new Error("Uncaught Error: Pendaftaran hanya untuk pemilik AbelionOS"))).toMatch(/AUTH_OWNER_EMAIL/);
    expect(explainAuthError(new Error("Uncaught Error: Pendaftaran ditutup: AUTH_OWNER_EMAIL belum diisi"))).toMatch(/ditutup/i);
  });

  it("meminta mencoba ulang saat backend dev timeout atau tidak menjawab", () => {
    expect(explainAuthError(new Error("AbelionOSTimeout"))).toMatch(/coba lagi/i);
    expect(
      explainAuthError(new Error("[Request ID: abc] Server Error Uncaught Error: Function execution timed out (maximum duration: 1s)")),
    ).toMatch(/coba lagi/i);
  });

  it("meneruskan validasi password dan memberi fallback untuk error tak dikenal", () => {
    expect(explainAuthError(new Error("Password minimal 8 karakter"))).toBe("Password minimal 8 karakter");
    expect(explainAuthError(undefined)).toBe("Gagal masuk. Periksa email dan password.");
  });
});
