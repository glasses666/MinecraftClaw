import type { BridgeConfig } from "./config.js";

export interface BlockPosition {
  x: number;
  y: number;
  z: number;
}

export interface ExactPosition {
  x: number;
  y: number;
  z: number;
}

export interface BridgePlayerState {
  name: string;
  dimension: string;
  position: BlockPosition;
  exactPosition: ExactPosition;
  yaw: number;
  pitch: number;
}

export interface TeleportRequest {
  x: number;
  y: number;
  z: number;
}

interface BridgeEnvelope {
  status: string;
  player?: BridgePlayerState;
  error?: string;
}

export class MinecraftClawBridgeClient {
  private readonly baseUrl: string;

  public constructor(private readonly config: BridgeConfig) {
    this.baseUrl = `http://${config.host}:${config.port}`;
  }

  public async getPlayerState(): Promise<BridgePlayerState> {
    return this.requestPlayer("/player", {
      method: "GET"
    });
  }

  public async teleportPlayer(request: TeleportRequest): Promise<BridgePlayerState> {
    return this.requestPlayer("/player/teleport", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    });
  }

  private async requestPlayer(path: string, init: RequestInit): Promise<BridgePlayerState> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    const payload = (await response.json()) as BridgeEnvelope;

    if (!response.ok || payload.status !== "ok" || payload.player === undefined) {
      throw new Error(payload.error ?? `Bridge request failed with status ${response.status}`);
    }

    return payload.player;
  }
}
