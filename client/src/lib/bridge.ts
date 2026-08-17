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

export function getBridgeConfig(): BridgeConfig | null {
  const baseUrl = import.meta.env.VITE_MINTDESK_BRIDGE_URL || "http://127.0.0.1:18765";
  const token = window.localStorage.getItem("mintdesk_bridge_token") || "";
  return token ? { baseUrl, token } : null;
}

async function bridgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getBridgeConfig();
  if (!config) throw new Error("Linux companion is not connected");
  const response = await fetch(`${config.baseUrl}${path}`, {
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
  metrics: () => bridgeRequest<BridgeMetrics>("/v1/metrics"),
  processes: () => bridgeRequest<{ processes: BridgeProcess[]; currentUser: string }>("/v1/processes"),
  terminate: (pid: number) => bridgeRequest<{ result: { pid: number; command: string; signal: string; terminatedAt: string } }>("/v1/processes/terminate", { method: "POST", body: JSON.stringify({ pid }) }),
};
