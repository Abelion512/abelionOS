import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { hashSecret, verifySecret } from "./passwordCrypto";

// Kebijakan single-user: hanya pemilik (AUTH_OWNER_EMAIL) yang boleh
// mendaftar/masuk. Fail-closed: env kosong berarti tidak ada yang bisa masuk.
// API @convex-dev/auth 0.0.80: profile berupa fungsi yang mengembalikan
// field user; library membuat dokumen users dari hasilnya.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        const owner = process.env.AUTH_OWNER_EMAIL;
        const email = typeof params.email === "string" ? params.email : undefined;
        if (!owner) throw new Error("Pendaftaran ditutup: AUTH_OWNER_EMAIL belum diisi");
        if (!email || email.toLowerCase() !== owner.toLowerCase()) {
          throw new Error("Pendaftaran hanya untuk pemilik Mintdesk");
        }
        return { email };
      },
      validatePasswordRequirements: (password: string) => {
        if (password.length < 8) throw new Error("Password minimal 8 karakter");
      },
      // WebCrypto PBKDF2 menggantikan Scrypt pure-JS bawaan (lihat passwordCrypto.ts).
      crypto: { hashSecret, verifySecret },
    }),
  ],
});
