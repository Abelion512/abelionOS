import type { BridgeHealth } from "./bridge";
import { healthFailed, healthSucceeded, type BridgeHealthState } from "./bridgeHealthState";

type HealthRequest = () => Promise<BridgeHealth>;

export async function pollBridgeHealth(request: HealthRequest, onState: (state: BridgeHealthState) => void, now: () => Date = () => new Date()) {
  try {
    onState(healthSucceeded(await request(), now()));
  } catch (error) {
    onState(healthFailed(error, now()));
  }
}

export function startBridgeHealthPolling({ request, onState, intervalMs = 15_000, now }: { request: HealthRequest; onState: (state: BridgeHealthState) => void; intervalMs?: number; now?: () => Date }) {
  void pollBridgeHealth(request, onState, now);
  const timer = globalThis.setInterval(() => { void pollBridgeHealth(request, onState, now); }, intervalMs);
  return () => globalThis.clearInterval(timer);
}
