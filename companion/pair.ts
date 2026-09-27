// Companion AbelionOS — pairing dipimpin laptop (design
// docs/COMPANION-PAIRING-DESIGN.md, disetujui pemilik 2026-09-27).
// Pemegang kunci: laptop. Device secret tidak pernah lewat browser —
// server mengembalikannya sekali di respons claim ini.
//
// Pakai:
//   bun run companion/pair.ts --endpoint https://charming-firefly-655.convex.site \
//     --code ABCD2345 --name "Laptop Kantor" --type laptop
import { generateKeyPairSync, sign, createPrivateKey } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function arg(name: string): string {
  const i = process.argv.indexOf("--" + name);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v) {
    console.error(`Argumen --${name} wajib. Contoh lihat README companion/.`);
    process.exit(1);
  }
  return v;
}

const endpoint = arg("endpoint").replace(/\/+$/, "");
const code = arg("code").toUpperCase();
const name = arg("name");
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

let keyPair = (() => {
  if (existsSync(KEY_FILE)) {
    const pem = readFileSync(KEY_FILE, "utf8");
    const priv = createPrivateKey(pem);
    // Turunkan kembali public dari private (spki).
    const pub = (priv as any).export({ type: "spki", format: "der" }) as Buffer;
    return { priv, pub: pub.toString("base64") };
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { priv: privateKey, pub: publicKey.export({ type: "spki", format: "der" }).toString("base64") };
})();

const message = "companion-claim:" + code;
const signature = sign(null, Buffer.from(message, "utf8"), keyPair.priv).toString("base64");

const res = await fetch(endpoint + "/api/companion/claim", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code, name, type, publicKey: keyPair.pub, signature }),
});
const data: any = await res.json().catch(() => ({}));
if (!res.ok || !data.deviceSecret) {
  console.error("Claim gagal:", res.status, data.error ?? "(tanpa detail)");
  process.exit(1);
}

// Simpan kredensial: secret sekali-tampil → file chmod 600.
mkdirSync(CONFIG_DIR, { recursive: true });
if (!existsSync(KEY_FILE)) {
  writeFileSync(
    KEY_FILE,
    keyPair.priv.export({ type: "pkcs8", format: "pem" }).toString(),
    { mode: 0o600 }
  );
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
