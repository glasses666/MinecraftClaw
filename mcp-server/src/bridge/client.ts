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

export interface InventorySlot {
  slot: number;
  itemId: string;
  count: number;
  displayName: string;
}

export interface InventorySnapshot {
  playerName: string;
  selectedHotbarSlot: number;
  slots: InventorySlot[];
}

export interface TeleportRequest {
  x: number;
  y: number;
  z: number;
}

export interface PlaceBlockRequest {
  x: number;
  y: number;
  z: number;
  blockId: string;
}

export interface FillBoxRequest {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  blockId: string;
}

export interface CommandRequest {
  command: string;
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

export interface BridgeActionResult {
  action: string;
  success: boolean;
  dimension: string;
  changedBlocks: number;
  blockId?: string;
  primaryPosition?: BlockPosition;
  bounds?: {
    min: BlockPosition;
    max: BlockPosition;
  };
  command?: string;
  commandResult?: number;
  message: string;
}

interface PlayerEnvelope {
  status: string;
  player?: BridgePlayerState;
  error?: string;
}

interface InventoryEnvelope {
  status: string;
  inventory?: InventorySnapshot;
  error?: string;
}

interface SpaceEnvelope {
  status: string;
  space?: LocalSpaceSnapshot;
  error?: string;
}

interface ActionEnvelope {
  status: string;
  result?: BridgeActionResult;
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

  public async getInventory(): Promise<InventorySnapshot> {
    return this.requestInventory("/player/inventory", {
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

  public async placeBlock(request: PlaceBlockRequest): Promise<BridgeActionResult> {
    return this.requestAction("/world/block/place", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    });
  }

  public async fillBox(request: FillBoxRequest): Promise<BridgeActionResult> {
    return this.requestAction("/world/fill", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    });
  }

  public async runCommand(request: CommandRequest): Promise<BridgeActionResult> {
    return this.requestAction("/world/command", {
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

  private async requestAction(path: string, init: RequestInit): Promise<BridgeActionResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    const payload = (await response.json()) as ActionEnvelope;

    if (!response.ok || payload.status !== "ok" || payload.result === undefined) {
      throw new Error(payload.error ?? `Bridge request failed with status ${response.status}`);
    }

    return payload.result;
  }

  private async requestInventory(path: string, init: RequestInit): Promise<InventorySnapshot> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    const payload = (await response.json()) as InventoryEnvelope;

    if (!response.ok || payload.status !== "ok" || payload.inventory === undefined) {
      throw new Error(payload.error ?? `Bridge request failed with status ${response.status}`);
    }

    return payload.inventory;
  }
}
