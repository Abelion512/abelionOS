// ponytail: hashing password dengan WebCrypto PBKDF2-SHA256 (native, ~30 ms)
// menggantikan `Scrypt` pure-JS bawaan @convex-dev/auth (~200 ms saat isolate
// sudah panas) karena fungsi auth pada deployment dev dibatasi 1 detik dan
// cold start membuat pendaftaran pertama timeout tanpa pesan yang jelas.
// Ceiling: format hash ini tidak punya jalur verify untuk hash Scrypt lama;
// belum ada akun produksi sehingga tidak diperlukan migrasi. Bila suatu saat
// ada akun lama, tambahkan cabang verify Scrypt (via `lucia`) sebelum upgrade.
const PREFIX = "pbkdf2-sha256";
const ITERATIONS = 210_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashSecret(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}:${ITERATIONS}:${toHex(salt)}:${toHex(hash)}`;
}

export async function verifySecret(password: string, stored: string): Promise<boolean> {
  const [prefix, iterationsRaw, saltHex, hashHex] = stored.split(":");
  if (prefix !== PREFIX) return false;
  const iterations = Number(iterationsRaw);
  const salt = fromHex(saltHex ?? "");
  const expected = fromHex(hashHex ?? "");
  if (!Number.isInteger(iterations) || iterations < 1000 || !salt || !expected?.length) return false;
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
