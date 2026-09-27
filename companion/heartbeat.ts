// Heartbeat companion AbelionOS — polling outbound tiap 20 detik.
// Capability PERSIS design doc §4 (allowlist, tidak diperluas):
//   health (uptime, load 1/5/15) · workdir metadata AGREGAT (jumlah entri +
//   total bytes, tanpa nama file) · audit-local count (baris log lokal).
// Dilarang: daftar proses, isi file, network snapshot, env vars, path lain.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { homedir, loadavg } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".config", "mintdesk");
const ENV_FILE = join(CONFIG_DIR, "companion.env");
const AUDIT_LOG = join(CONFIG_DIR, "audit.log");

const WORKDIR_CANONICAL = "/media/abelion/Isaf/ican/project";

if (!existsSync(ENV_FILE)) {
  console.error("Belum ada kredensial — jalankan companion/pair.ts dulu.");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);
const endpoint = (env.MINTDESK_ENDPOINT ?? "").replace(/\/+$/, "");
const secret = env.MINTDESK_DEVICE_SECRET ?? "";
if (!endpoint || !secret) {
  console.error("companion.env rusak — pair ulang perangkat.");
  process.exit(1);
}

function auditLocalCount(): number {
  try {
    return readFileSync(AUDIT_LOG, "utf8").split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

function auditLocalAppend(line: string): void {
  try {
    appendFileSync(AUDIT_LOG, line + "\n", { mode: 0o600 });
  } catch {
    // audit lokal adalah best-effort — heartbeat tidak boleh gagal karenanya
  }
}

// Agregat workdir: jumlah entri + total bytes, tanpa nama file. Walk bounded
// (maks 50k entri) dan abaikan entri yang tidak bisa dibaca.
function workdirAggregate(): { entries: number; totalBytes: number } {
  let entries = 0;
  let totalBytes = 0;
  const queue: string[] = [WORKDIR_CANONICAL];
  while (queue.length > 0 && entries < 50_000) {
    const dir = queue.shift()!;
    let items: string[] = [];
    try {
      items = readdirSync(dir);
    } catch {
      continue;
    }
    for (const it of items) {
      entries++;
      try {
        const st = statSync(join(dir, it));
        if (st.isDirectory()) queue.push(join(dir, it));
        else totalBytes += st.size;
      } catch {
        // entri tak terbaca dihitung sebagai entri tanpa size
      }
    }
  }
  return { entries, totalBytes };
}

function payload() {
  // loadavg dari node:os (tersedia di Bun maupun Node). Sebelumnya memakai
  // Bun.os.loadavg yang TIDAK ada → load selalu 0 di Dashboard.
  const load = loadavg();
  return {
    uptimeS: Math.round(process.uptime()),
    load1: load[0] ?? 0,
    load5: load[1] ?? 0,
    load15: load[2] ?? 0,
    workdir: workdirAggregate(),
    auditLocalCount: auditLocalCount(),
  };
}

async function beatOnce(): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(endpoint + "/api/companion/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret },
      body: JSON.stringify(payload()),
    });
  } catch (e) {
    console.error(
      `Tidak bisa menghubungi ${endpoint} — periksa jaringan/endpoint (di companion.env).`,
      e instanceof Error ? e.message : e
    );
    return false;
  }
  if (res.ok) return true;
  const detail = await res.text().catch(() => "");
  // 401 = secret tidak dikenal/diarsipkan (device bertipe sama dipasangkan
  // ulang mengarsipkan yang lama) → heartbeat ini tidak akan pernah pulih.
  if (res.status === 401) {
    console.error(`Secret ditolak (401 ${detail.slice(0, 200)}) — pair ulang: bun run companion/pair.ts …`);
    process.exit(1);
  }
  // 400 bad_payload / 5xx / 404: tampilkan tubuh respons apa adanya (server
  // mengirim {error, code}) supaya penyebabnya terlihat, bukan gagal senyap.
  console.error(`heartbeat gagal: HTTP ${res.status} ${detail.slice(0, 200)}`);
  return false;
}

const INTERVAL_MS = 20_000;
console.log("Heartbeat mulai →", endpoint, `(tiap ${INTERVAL_MS / 1000}s)`);
let lastOk = true;
for (;;) {
  try {
    const ok = await beatOnce();
    if (ok !== lastOk) {
      auditLocalAppend(`${new Date().toISOString()} heartbeat ${ok ? "ok" : "gagal"}`);
      lastOk = ok;
    }
    if (!ok) console.error("heartbeat gagal — dicoba lagi siklus berikutnya");
  } catch (e) {
    console.error("heartbeat error:", e instanceof Error ? e.message : e);
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
