import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const created: string[] = [];
afterEach(() => { while (created.length) rmSync(created.pop()!, { recursive: true, force: true }); });

describe("companion pairing helper", () => {
  it("updates only device credentials from one hidden pairing-code input", () => {
    const root = mkdtempSync(join(tmpdir(), "mintdesk-pair-"));
    created.push(root);
    const configHome = join(root, "config");
    const configDir = join(configHome, "mintdesk");
    mkdirSync(configDir, { recursive: true });
    const configFile = join(configDir, "hybrid-companion.env");
    writeFileSync(configFile, "MINTDESK_API_BASE_URL=https://mintdash-khcj34hp.manus.space\nMINTDESK_DEVICE_ID=old\nMINTDESK_DEVICE_SECRET=old\nMINTDESK_9ROUTER_URL=http://127.0.0.1:20128/v1\nMINTDESK_9ROUTER_TOKEN=local-token\n");
    const script = join(process.cwd(), "companion", "pair-companion-credential.sh");
    const result = spawnSync("bash", [script], {
      input: "1dca8cfd-d1b2-458c-b81b-9215ad61f8d1:Abcdefghijklmnopqrstuvwxyz0123456789_-123\n",
      encoding: "utf8",
      env: { ...process.env, XDG_CONFIG_HOME: configHome, MINTDESK_SKIP_SERVICE_RESTART: "1" },
    });
    expect(result.status).toBe(0);
    const saved = readFileSync(configFile, "utf8");
    expect(saved).toContain("MINTDESK_DEVICE_ID=1dca8cfd-d1b2-458c-b81b-9215ad61f8d1");
    expect(saved).toContain("MINTDESK_DEVICE_SECRET=Abcdefghijklmnopqrstuvwxyz0123456789_-123");
    expect(saved).toContain("MINTDESK_9ROUTER_TOKEN=local-token");
  });

  it("uses a copied pairing code from the Linux clipboard without terminal input", () => {
    const root = mkdtempSync(join(tmpdir(), "mintdesk-pair-clipboard-"));
    created.push(root);
    const configHome = join(root, "config");
    const configDir = join(configHome, "mintdesk");
    const binDir = join(root, "bin");
    mkdirSync(configDir, { recursive: true });
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, "xclip"), "#!/usr/bin/env bash\nprintf '%s' '2bca8cfd-d1b2-458c-b81b-9215ad61f8d1:ClipboardPairingSecret_abcdefghijklmnopqrstuvwxyz123'\n");
    spawnSync("chmod", ["700", join(binDir, "xclip")]);
    const configFile = join(configDir, "hybrid-companion.env");
    writeFileSync(configFile, "MINTDESK_DEVICE_ID=old\nMINTDESK_DEVICE_SECRET=old\nMINTDESK_9ROUTER_TOKEN=local-token\n");
    const script = join(process.cwd(), "companion", "pair-companion-credential.sh");
    const result = spawnSync("bash", [script], {
      input: "",
      encoding: "utf8",
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, XDG_CONFIG_HOME: configHome, MINTDESK_SKIP_SERVICE_RESTART: "1" },
    });
    expect(result.status).toBe(0);
    const saved = readFileSync(configFile, "utf8");
    expect(saved).toContain("MINTDESK_DEVICE_ID=2bca8cfd-d1b2-458c-b81b-9215ad61f8d1");
    expect(saved).toContain("MINTDESK_DEVICE_SECRET=ClipboardPairingSecret_abcdefghijklmnopqrstuvwxyz123");
  });
});
