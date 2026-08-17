#!/usr/bin/env node
import http from "node:http";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";

const execFileAsync = promisify(execFile);
const HOST = process.env.MINTDESK_HOST || "127.0.0.1";
const PORT = Number(process.env.MINTDESK_PORT || 18765);
const TOKEN = process.env.MINTDESK_TOKEN;
const ALLOWED_ORIGINS = new Set(
  (process.env.MINTDESK_ALLOWED_ORIGINS || "http://localhost:3000,https://mintdash-khcj34hp.manus.space")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const TERMINABLE_COMMANDS = new Set(
  (process.env.MINTDESK_TERMINABLE_COMMANDS || "firefox,chromium,google-chrome,code,code-insiders,node,npm,pnpm,python,python3,obsidian,discord,slack,telegram-desktop,spotify,signal-desktop,vlc")
    .split(",")
    .map((command) => command.trim())
    .filter(Boolean),
);
const AUDIT_PATH = process.env.MINTDESK_AUDIT_PATH || path.join(os.homedir(), ".local", "state", "mintdesk", "terminations.jsonl");

if (!TOKEN || TOKEN.length < 32) {
  console.error("MINTDESK_TOKEN must be set and contain at least 32 characters.");
  process.exit(1);
}

function json(res, status, payload, origin = "") {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  });
  res.end(JSON.stringify(payload));
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authorized(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") && safeEqual(auth.slice(7), TOKEN);
}

function originFor(req) {
  const origin = req.headers.origin || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "";
}

async function readCpuSnapshot() {
  const first = await os.cpus();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const second = await os.cpus();
  let idle = 0;
  let total = 0;
  for (let index = 0; index < second.length; index += 1) {
    const a = first[index].times;
    const b = second[index].times;
    const idleDelta = b.idle - a.idle;
    const totalDelta = Object.values(b).reduce((sum, value) => sum + value, 0) - Object.values(a).reduce((sum, value) => sum + value, 0);
    idle += idleDelta;
    total += totalDelta;
  }
  return total > 0 ? Math.round((1 - idle / total) * 100) : 0;
}

async function getMetrics() {
  const [cpuPercent, uptimeSeconds] = await Promise.all([readCpuSnapshot(), Promise.resolve(os.uptime())]);
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  return {
    hostname: os.hostname(),
    platform: `${process.platform} ${os.release()}`,
    arch: process.arch,
    cpuPercent,
    memory: {
      usedBytes: totalMemory - freeMemory,
      totalBytes: totalMemory,
      usedPercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    },
    uptimeSeconds: Math.round(uptimeSeconds),
    loadAverage: os.loadavg(),
    checkedAt: new Date().toISOString(),
  };
}

async function getProcesses() {
  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,comm=,%cpu=,%mem=,user=,stat=,etime="], { maxBuffer: 2 * 1024 * 1024 });
  const currentUser = os.userInfo().username;
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) return null;
    const [, pid, command, cpu, memory, user, state, elapsed] = match;
    return { pid: Number(pid), command, cpuPercent: Number(cpu), memoryPercent: Number(memory), user, state, elapsed, canTerminate: user === currentUser && TERMINABLE_COMMANDS.has(command) && Number(pid) !== process.pid };
  }).filter(Boolean).filter((item) => item.user === currentUser).sort((a, b) => b.cpuPercent - a.cpuPercent).slice(0, 100);
}

async function readAudit() {
  try {
    const content = await fs.readFile(AUDIT_PATH, "utf8");
    return content.split("\n").filter(Boolean).slice(-100).map((line) => JSON.parse(line)).reverse();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function terminateProcess(pid) {
  if (!Number.isInteger(pid) || pid < 2 || pid === process.pid) throw new Error("Invalid process id");
  const processes = await getProcesses();
  const target = processes.find((item) => item.pid === pid);
  if (!target) throw new Error("Process is not owned by the current user or is no longer running");
  if (!target.canTerminate) throw new Error("Process is not on the explicit termination allowlist");
  process.kill(pid, "SIGTERM");
  const result = { pid, command: target.command, signal: "SIGTERM", terminatedAt: new Date().toISOString() };
  await fs.mkdir(path.dirname(AUDIT_PATH), { recursive: true });
  await fs.appendFile(AUDIT_PATH, `${JSON.stringify({ action: "terminate", ...result, actor: os.userInfo().username })}\n`, { mode: 0o600 });
  return result;
}

async function body(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  const origin = originFor(req);
  if (req.method === "OPTIONS") return json(res, 204, null, origin);
  if (!origin && req.headers.origin) return json(res, 403, { error: "Origin not allowed" });
  if (!authorized(req)) return json(res, 401, { error: "Unauthorized" }, origin);

  try {
    if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true, service: "mintdesk-bridge", version: "1.0.0" }, origin);
    if (req.method === "GET" && req.url === "/v1/metrics") return json(res, 200, await getMetrics(), origin);
    if (req.method === "GET" && req.url === "/v1/processes") return json(res, 200, { processes: await getProcesses(), currentUser: os.userInfo().username }, origin);
    if (req.method === "GET" && req.url === "/v1/audit") return json(res, 200, { events: await readAudit() }, origin);
    if (req.method === "POST" && req.url === "/v1/processes/terminate") {
      const payload = await body(req);
      return json(res, 200, { result: await terminateProcess(Number(payload.pid)) }, origin);
    }
    return json(res, 404, { error: "Not found" }, origin);
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Request failed" }, origin);
  }
});

server.listen(PORT, HOST, () => console.log(`mintdesk-bridge listening on http://${HOST}:${PORT}`));
