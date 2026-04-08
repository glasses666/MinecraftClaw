export interface DesignDaemonConfig {
  host: string;
  port: number;
  token: string;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4867;
const DEFAULT_TOKEN = "minecraftclaw-dev-token";

export function resolveDesignDaemonConfig(env: NodeJS.ProcessEnv = process.env): DesignDaemonConfig {
  return {
    host: readString(env.MINECRAFTCLAW_DESIGN_DAEMON_HOST, DEFAULT_HOST),
    port: readPort(env.MINECRAFTCLAW_DESIGN_DAEMON_PORT, DEFAULT_PORT),
    token: readString(env.MINECRAFTCLAW_DESIGN_DAEMON_TOKEN, DEFAULT_TOKEN)
  };
}

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function readPort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}
