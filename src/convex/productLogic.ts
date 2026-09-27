// Logika murni registry produk klien (tanpa ctx Convex) — pola newsWatcherLogic.
// Secret produk: 32 byte acak WebCrypto, prefix "abp_", plaintext HANYA
// dikembalikan sekali oleh mutation register/rotate; yang disimpan server
// hanyalah sha256(secret) — pola device secret (docs/PRODUCT-CONNECTION-DESIGN.md).
export const PRODUCT_SECRET_PREFIX = "abp_";

export function validateProductId(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(slug)) {
    throw new Error(
      "Nama produk harus 2–32 karakter: huruf kecil, angka, atau dash, diawali huruf/angka."
    );
  }
  return slug;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generateProductSecret(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return PRODUCT_SECRET_PREFIX + toBase64Url(bytes);
}

export type ProductRecord = {
  _id: string;
  productId: string;
  type: "local" | "web";
  status: "active" | "archived";
  allowlist: string[];
};

// Satu aturan untuk rotate & revoke: hanya baris aktif yang boleh diproses,
// dan operasi gagal jelas bila tidak ada baris aktif untuk slug tersebut.
export function requireActiveRows<T extends ProductRecord>(rows: T[], slug: string): T[] {
  const actives = rows.filter((r) => r.status === "active");
  if (actives.length === 0) {
    throw new Error(`Tidak ada produk aktif bernama "${slug}".`);
  }
  return actives;
}
