import type { BridgeHealth } from "./bridge";

export type LocalBridgeBriefingSource = { status: "loading" | "ready" | "unavailable" | "error"; detail: string };

export function getLocalBridgeBriefingSource({ loading, health, error, configured }: { loading: boolean; health: BridgeHealth | null; error: string | null; configured: boolean }): LocalBridgeBriefingSource {
  if (loading) return { status: "loading", detail: "Checking the local Linux companion." };
  if (health) return { status: "ready", detail: `${health.service} ${health.version} responded from this browser's local companion.` };
  if (error) return { status: "error", detail: error };
  if (!configured) return { status: "unavailable", detail: "No Linux companion token is configured in this browser." };
  return { status: "unavailable", detail: "Linux companion is unavailable." };
}
