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

export interface SpaceScanRequest {
  radius?: number;
  down?: number;
  up?: number;
}

export interface BlockCount {
  blockId: string;
  count: number;
}

export interface OccupiedRun {
  startY: number;
  endY: number;
  blockId: string;
}

export interface LocalSpaceColumn {
  x: number;
  z: number;
  highestOccupiedY: number | null;
  topBlockId: string | null;
  walkableY: number | null;
  headroom: number | null;
  occupiedRuns: OccupiedRun[];
}

export interface WalkableSurface {
  x: number;
  y: number;
  z: number;
  blockId: string;
  headroom: number;
}

export interface SpacePointOfInterest {
  category: string;
  kindId: string;
  label: string;
  position: BlockPosition;
}

export interface LocalSpaceSnapshot {
  schemaVersion: number;
  player: BridgePlayerState;
  bounds: {
    min: BlockPosition;
    max: BlockPosition;
  };
  parameters: {
    radius: number;
    down: number;
    up: number;
  };
  summary: {
    sampledColumns: number;
    sampledBlocks: number;
    occupiedBlocks: number;
    airBlocks: number;
    fluidBlocks: number;
    walkableSurfaceCount: number;
    topBlockCounts: BlockCount[];
  };
  columns: LocalSpaceColumn[];
  walkableSurfaces: WalkableSurface[];
  pointsOfInterest: SpacePointOfInterest[];
}

interface PlayerEnvelope {
  status: string;
  player?: BridgePlayerState;
  error?: string;
}

interface SpaceEnvelope {
  status: string;
  space?: LocalSpaceSnapshot;
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

  public async scanLocalSpace(request: SpaceScanRequest = {}): Promise<LocalSpaceSnapshot> {
    return this.requestSpace("/space/local", {
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

    const payload = (await response.json()) as PlayerEnvelope;

    if (!response.ok || payload.status !== "ok" || payload.player === undefined) {
      throw new Error(payload.error ?? `Bridge request failed with status ${response.status}`);
    }

    return payload.player;
  }

  private async requestSpace(path: string, init: RequestInit): Promise<LocalSpaceSnapshot> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    const payload = (await response.json()) as SpaceEnvelope;

    if (!response.ok || payload.status !== "ok" || payload.space === undefined) {
      throw new Error(payload.error ?? `Bridge request failed with status ${response.status}`);
    }

    return payload.space;
  }
}
