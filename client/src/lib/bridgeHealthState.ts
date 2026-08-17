import type { BridgeHealth } from "./bridge";

export type BridgeHealthState = {
  online: boolean;
  detail: string | null;
  checkedAt: Date | null;
};

export const initialBridgeHealthState: BridgeHealthState = { online: false, detail: null, checkedAt: null };

export function healthSucceeded(health: BridgeHealth, checkedAt: Date): BridgeHealthState {
  return { online: health.ok === true, detail: health.ok ? null : "Linux companion returned an unhealthy response.", checkedAt };
}

export function healthFailed(error: unknown, checkedAt: Date): BridgeHealthState {
  return { online: false, detail: error instanceof Error ? error.message : "Linux companion unavailable", checkedAt };
}
