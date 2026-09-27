// Pesan kegagalan autentikasi yang bisa ditindaklanjuti pengguna.
// Dipisah dari komponen agar logikanya bisa diuji tanpa DOM, dan tetap satu
// sumber kebenaran untuk seluruh alur sign in/up (lihat AuthPage).
export function explainAuthError(err: unknown): string {
  const data = (err as { data?: { code?: string } } | undefined)?.data;
  const code = data?.code;
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (raw === "AbelionOSTimeout" || /timed out|Server Error|Connection lost|not available/i.test(raw)) {
    return "Koneksi ke backend belum selesai. Coba lagi sebentar.";
  }
  if (code === "TooManyFailedAttempts") {
    return "Terlalu banyak percobaan gagal. Tunggu sebentar lalu coba lagi.";
  }
  if (code === "InvalidAccountId" || /InvalidAccountId/.test(raw)) {
    return "Email ini belum punya akun AbelionOS. Pilih “Belum punya akun? Daftar di sini.” untuk membuat akun pemilik.";
  }
  if (code === "InvalidSecret" || /InvalidSecret/.test(raw)) return "Password salah.";
  if (/Pendaftaran hanya untuk pemilik AbelionOS/.test(raw)) {
    return "Pendaftaran hanya untuk pemilik AbelionOS sesuai AUTH_OWNER_EMAIL.";
  }
  if (/Pendaftaran ditutup/.test(raw)) {
    return "Pendaftaran ditutup: AUTH_OWNER_EMAIL belum diisi pada environment Convex.";
  }
  if (/Password minimal 8 karakter/.test(raw)) return raw;
  return raw || "Gagal masuk. Periksa email dan password.";
}
