export type BridgeEnv = Partial<Record<string, string | undefined>>;

export interface BridgeConfig {
  host: string;
  port: number;
  timeoutMs: number;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 47_127;
const DEFAULT_TIMEOUT_MS = 5_000;

export function resolveBridgeConfig(env: BridgeEnv = process.env): BridgeConfig {
  return {
    host: normalizeString(env.MCCLAW_BRIDGE_HOST, DEFAULT_HOST),
    port: normalizeInteger(env.MCCLAW_BRIDGE_PORT, DEFAULT_PORT),
    timeoutMs: normalizeInteger(env.MCCLAW_BRIDGE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
  };
}

function normalizeString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeInteger(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
