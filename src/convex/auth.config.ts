// Verifikasi JWT yang diterbitkan @convex-dev/auth: Convex mengambil JWKS dari
// CONVEX_SITE_URL (HTTP actions) dan mencocokkan issuer/audience token.
// Tanpa file ini ctx.auth tidak mengenali token yang sah.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
