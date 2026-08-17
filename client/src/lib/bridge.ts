export type BridgeMetrics = {
  hostname: string;
  platform: string;
  arch: string;
  cpuPercent: number;
  memory: { usedBytes: number; totalBytes: number; usedPercent: number };
  uptimeSeconds: number;
  loadAverage: number[];
  checkedAt: string;
};

export type BridgeAuditEvent = { action: string; pid: number; command: string; signal: string; terminatedAt: string; actor: string };

export type BridgeProcess = {
  pid: number;
  command: string;
  cpuPercent: number;
  memoryPercent: number;
  user: string;
  state: string;
  elapsed: string;
  canTerminate: boolean;
};

export type BridgeConfig = { baseUrl: string; token: string };
export type BridgeStatus = "connected" | "unavailable" | "error";
export type BridgeHealth = { ok: boolean; service: string; version: string };
export const BRIDGE_REQUEST_TIMEOUT_MS = 5_000;

export function getBridgeStatus(metrics: BridgeMetrics | null, error: string | null): BridgeStatus {
  if (metrics) return "connected";
  return error ? "error" : "unavailable";
}

export function canRequestProcessTermination(process: BridgeProcess): boolean {
  return process.canTerminate === true && process.pid > 1 && process.command.length > 0;
}

export function getBridgeConfig(): BridgeConfig | null {
  const baseUrl = import.meta.env.VITE_MINTDESK_BRIDGE_URL || "http://127.0.0.1:18765";
  const token = window.localStorage.getItem("mintdesk_bridge_token") || "";
  return token ? { baseUrl, token } : null;
}

export async function fetchBridgeWithTimeout(url: string, init: RequestInit, timeoutMs = BRIDGE_REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Linux companion request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function bridgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getBridgeConfig();
  if (!config) throw new Error("Linux companion is not connected");
  const response = await fetchBridgeWithTimeout(`${config.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Bridge request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const bridgeApi = {
  health: () => bridgeRequest<BridgeHealth>("/health"),
  metrics: () => bridgeRequest<BridgeMetrics>("/v1/metrics"),
  processes: () => bridgeRequest<{ processes: BridgeProcess[]; currentUser: string }>("/v1/processes"),
  audit: () => bridgeRequest<{ events: BridgeAuditEvent[] }>("/v1/audit"),
  terminate: (pid: number) => bridgeRequest<{ result: { pid: number; command: string; signal: string; terminatedAt: string } }>("/v1/processes/terminate", { method: "POST", body: JSON.stringify({ pid }) }),
};
