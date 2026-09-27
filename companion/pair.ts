// Companion AbelionOS — pairing dipimpin laptop (design
// docs/COMPANION-PAIRING-DESIGN.md, disetujui pemilik 2026-09-27).
// Pemegang kunci: laptop. Device secret tidak pernah lewat browser —
// server mengembalikannya sekali di respons claim ini.
//
// Urutan wajib: daftarkan perangkat dulu di Settings → Companion → "Pasangkan
// perangkat" (Langkah 1, browser), baru jalankan perintah ini (Langkah 2).
//
// Pakai:
//   bun run companion/pair.ts --endpoint https://charming-firefly-655.convex.site \
//     --code ABCD2345 --name "Laptop Kantor" --type laptop
import { generateKeyPairSync, sign, createPrivateKey, createPublicKey } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function arg(name: string): string {
  const i = process.argv.indexOf("--" + name);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v || v.startsWith("--")) {
    console.error(`Argumen --${name} wajib (nilai kosong). Contoh lihat companion/README.md.`);
    process.exit(1);
  }
  return v;
}

const endpoint = arg("endpoint").replace(/\/+$/, "");
if (!/^https?:\/\//.test(endpoint)) {
  console.error(
    `--endpoint harus URL http(s) lengkap, mis. https://<deployment>.convex.site (diterima: "${endpoint}").`
  );
  process.exit(1);
}
const code = arg("code").toUpperCase();
const name = arg("name").trim();
const type = arg("type");
if (type !== "laptop" && type !== "server") {
  console.error("Tipe harus laptop atau server.");
  process.exit(1);
}

// Keypair Ed25519: private disimpan lokal (chmod 600), public DER SPKI
// dikirim ke server dan diikat ke device saat claim.
const CONFIG_DIR = join(homedir(), ".config", "mintdesk");
const KEY_FILE = join(CONFIG_DIR, `companion-${type}.key`);
const ENV_FILE = join(CONFIG_DIR, "companion.env");

const keyPair = (() => {
  if (existsSync(KEY_FILE)) {
    const priv = createPrivateKey(readFileSync(KEY_FILE, "utf8"));
    // Private KeyObject menolak export type "spki"/"pkcs1" (Node & Bun:
    // ERR_INVALID_ARG_VALUE) — public key harus diturunkan lewat
    // createPublicKey. Regresi 2026-09-27: export langsung membuat pair ulang
    // (file kunci sudah ada) selalu crash sebelum claim dikirim.
    const pub = createPublicKey(priv).export({ type: "spki", format: "der" });
    return { priv, pub: pub.toString("base64") };
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { priv: privateKey, pub: publicKey.export({ type: "spki", format: "der" }).toString("base64") };
})();

const message = "companion-claim:" + code;
const signature = sign(null, Buffer.from(message, "utf8"), keyPair.priv).toString("base64");

let res: Response;
try {
  res = await fetch(endpoint + "/api/companion/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, name, type, publicKey: keyPair.pub, signature }),
  });
} catch (e) {
  console.error(
    `Tidak bisa menghubungi ${endpoint} — periksa koneksi internet dan nilai --endpoint.`,
    e instanceof Error ? e.message : e
  );
  process.exit(1);
}

const raw = await res.text();
let data: any = {};
try {
  data = JSON.parse(raw);
} catch {
  data = { error: raw.slice(0, 200) || "(respons kosong)" };
}

if (!res.ok || !data.deviceSecret) {
  console.error(`Claim gagal: HTTP ${res.status} ${data.code ?? ""} ${data.error ?? "(tanpa detail)"}`);
  const hint: Record<string, string> = {
    invalid_code:
      "Code kadaluarsa (>10 menit) atau sudah dipakai. Buat code baru di Settings → Companion lalu ulangi; code juga single-use.",
    bad_signature:
      `Signature tidak cocok dengan kunci lokal. Hapus ${KEY_FILE} lalu ulangi (kunci baru dibuat otomatis).`,
    no_pending_device:
      "Daftarkan perangkat dulu di Settings → Companion (Langkah 1) dengan nama & tipe yang sama, baru jalankan perintah ini.",
  };
  if (data.code && hint[data.code]) console.error("Saran:", hint[data.code]);
  process.exit(1);
}

// Simpan kredensial: secret sekali-tampil → file chmod 600.
mkdirSync(CONFIG_DIR, { recursive: true });
if (!existsSync(KEY_FILE)) {
  writeFileSync(KEY_FILE, keyPair.priv.export({ type: "pkcs8", format: "pem" }).toString(), {
    mode: 0o600,
  });
}
writeFileSync(
  ENV_FILE,
  [
    `# AbelionOS companion — JANGAN dibagikan (chmod 600)`,
    `MINTDESK_ENDPOINT=${endpoint}`,
    `MINTDESK_TYPE=${type}`,
    `MINTDESK_DEVICE_SECRET=${data.deviceSecret}`,
    "",
  ].join("\n"),
  { mode: 0o600 }
);
console.log(`Companion "${data.name}" (${data.type}) aktif.`);
console.log(`Kredensial disimpan: ${ENV_FILE}`);
console.log("Jalankan heartbeat: bun run companion/heartbeat.ts");
