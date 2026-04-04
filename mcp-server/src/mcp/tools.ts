import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type {
  BridgeActionResult,
  BridgePlayerState,
  CommandRequest,
  FillBoxRequest,
  LocalSpaceSnapshot,
  PlaceBlockRequest,
  SpaceScanRequest,
  TeleportRequest
} from "../bridge/client.js";
import { buildSpaceModel } from "./space-model.js";

export interface ToolDependencies {
  getPlayerState(): Promise<BridgePlayerState>;
  teleportPlayer(request: TeleportRequest): Promise<BridgePlayerState>;
  scanLocalSpace(request: SpaceScanRequest): Promise<LocalSpaceSnapshot>;
  placeBlock(request: PlaceBlockRequest): Promise<BridgeActionResult>;
  fillBox(request: FillBoxRequest): Promise<BridgeActionResult>;
  runCommand(request: CommandRequest): Promise<BridgeActionResult>;
}

export interface ToolHandlers {
  getPlayerState(): Promise<CallToolResult>;
  teleportPlayer(request: TeleportRequest): Promise<CallToolResult>;
  scanLocalSpace(request: SpaceScanRequest): Promise<CallToolResult>;
  analyzeLocalSpace(request: SpaceScanRequest): Promise<CallToolResult>;
  placeBlock(request: PlaceBlockRequest): Promise<CallToolResult>;
  breakBlock(request: Omit<PlaceBlockRequest, "blockId">): Promise<CallToolResult>;
  fillBox(request: FillBoxRequest): Promise<CallToolResult>;
  clearBox(request: Omit<FillBoxRequest, "blockId">): Promise<CallToolResult>;
  runCommand(request: CommandRequest): Promise<CallToolResult>;
}

export function createToolHandlers(dependencies: ToolDependencies): ToolHandlers {
  return {
    async getPlayerState() {
      try {
        const player = await dependencies.getPlayerState();
        return successResult(player, `Current player state: ${describePlayerState(player)}`);
      } catch (error) {
        return errorResult(`Failed to read player state: ${describeError(error)}`);
      }
    },

    async teleportPlayer(request) {
      if (!isFiniteNumber(request.x) || !isFiniteNumber(request.y) || !isFiniteNumber(request.z)) {
        return errorResult("Teleport coordinates must be finite numbers.");
      }

      try {
        const player = await dependencies.teleportPlayer(request);
        return successResult(
          player,
          `Teleported player to ${request.x},${request.y},${request.z}. New state: ${describePlayerState(player)}`
        );
      } catch (error) {
        return errorResult(`Failed to teleport player: ${describeError(error)}`);
      }
    },

    async scanLocalSpace(request) {
      const normalizedRequest = normalizeScanRequest(request);

      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest);
        return {
          content: [
            {
              type: "text",
              text: describeLocalSpace(space)
            }
          ],
          structuredContent: {
            space
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to scan local space: ${describeError(error)}`);
      }
    },

    async analyzeLocalSpace(request) {
      const normalizedRequest = normalizeScanRequest(request);

      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest);
        const model = buildSpaceModel(space);
        return {
          content: [
            {
              type: "text",
              text: describeSpaceModel(model)
            }
          ],
          structuredContent: {
            model
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to analyze local space: ${describeError(error)}`);
      }
    },

    async placeBlock(request) {
      const normalizedRequest = normalizePlaceBlockRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const result = await dependencies.placeBlock(normalizedRequest);
        return successActionResult(result);
      } catch (error) {
        return errorResult(`Failed to place block: ${describeError(error)}`);
      }
    },

    async breakBlock(request) {
      const normalizedPosition = normalizeBlockCoordinates(request);
      if (normalizedPosition instanceof Error) {
        return errorResult(normalizedPosition.message);
      }

      try {
        const baseResult = await dependencies.placeBlock({
          ...normalizedPosition,
          blockId: "minecraft:air"
        });
        return successActionResult(aliasActionResult(baseResult, "break_block", "Cleared block at"));
      } catch (error) {
        return errorResult(`Failed to break block: ${describeError(error)}`);
      }
    },

    async fillBox(request) {
      const normalizedRequest = normalizeFillBoxRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const result = await dependencies.fillBox(normalizedRequest);
        return successActionResult(result);
      } catch (error) {
        return errorResult(`Failed to fill box: ${describeError(error)}`);
      }
    },

    async clearBox(request) {
      const normalizedRequest = normalizeFillBoxRequest({
        ...request,
        blockId: "minecraft:air"
      });
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const baseResult = await dependencies.fillBox(normalizedRequest);
        return successActionResult(aliasActionResult(baseResult, "clear_box", "Cleared box"));
      } catch (error) {
        return errorResult(`Failed to clear box: ${describeError(error)}`);
      }
    },

    async runCommand(request) {
      const normalizedRequest = normalizeCommandRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const result = await dependencies.runCommand(normalizedRequest);
        return successActionResult(result);
      } catch (error) {
        return errorResult(`Failed to run command: ${describeError(error)}`);
      }
    }
  };
}

function successResult(player: BridgePlayerState, message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: message
      }
    ],
    structuredContent: {
      player
    },
    isError: false
  };
}

function errorResult(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: message
      }
    ],
    isError: true
  };
}

function successActionResult(result: BridgeActionResult): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: describeActionResult(result)
      }
    ],
    structuredContent: {
      result
    },
    isError: false
  };
}

function describePlayerState(player: BridgePlayerState): string {
  return `${player.name} in ${player.dimension} at ${player.position.x},${player.position.y},${player.position.z} ` +
    `(exact ${player.exactPosition.x},${player.exactPosition.y},${player.exactPosition.z}) ` +
    `yaw=${player.yaw} pitch=${player.pitch}`;
}

function describeLocalSpace(space: LocalSpaceSnapshot): string {
  const topBlocks = space.summary.topBlockCounts
    .slice(0, 3)
    .map((entry) => `${entry.blockId}(${entry.count})`)
    .join(", ");

  return `Scanned local space around ${space.player.name}: ${space.summary.sampledColumns} columns, ` +
    `${space.summary.sampledBlocks} sampled blocks, ${space.summary.walkableSurfaceCount} walkable surfaces, ` +
    `${space.pointsOfInterest.length} POIs. Top surface blocks: ${topBlocks || "none"}.`;
}

function describeSpaceModel(model: ReturnType<typeof buildSpaceModel>): string {
  const regionSummary = model.regions
    .slice(0, 2)
    .map((region) => `${region.kind}(${region.walkableSurfaceCount})`)
    .join(", ");

  return `Analyzed scene around ${model.player.name}: scene=${model.summary.dominantSceneKind}, ` +
    `buildability=${model.buildability.status}, ${model.regions.length} regions, ` +
    `${model.structures.length} structures. Regions: ${regionSummary || "none"}.`;
}

function describeActionResult(result: BridgeActionResult): string {
  return result.message;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeScanRequest(request: SpaceScanRequest): SpaceScanRequest | Error {
  const radius = normalizeBoundedInteger(request.radius, 8, 1, 12, "radius");
  if (radius instanceof Error) {
    return radius;
  }

  const down = normalizeBoundedInteger(request.down, 8, 1, 16, "down");
  if (down instanceof Error) {
    return down;
  }

  const up = normalizeBoundedInteger(request.up, 12, 1, 16, "up");
  if (up instanceof Error) {
    return up;
  }

  return { radius, down, up };
}

function normalizePlaceBlockRequest(request: PlaceBlockRequest): PlaceBlockRequest | Error {
  const position = normalizeBlockCoordinates(request);
  if (position instanceof Error) {
    return position;
  }

  const blockId = normalizeBlockId(request.blockId);
  if (blockId instanceof Error) {
    return blockId;
  }

  return { ...position, blockId };
}

function normalizeFillBoxRequest(request: FillBoxRequest): FillBoxRequest | Error {
  const blockId = normalizeBlockId(request.blockId);
  if (blockId instanceof Error) {
    return blockId;
  }

  const coordinates = [request.x1, request.y1, request.z1, request.x2, request.y2, request.z2];
  if (!coordinates.every((value) => Number.isInteger(value))) {
    return new Error("Fill-box coordinates must be integers.");
  }

  const volume = (Math.abs(request.x2 - request.x1) + 1)
    * (Math.abs(request.y2 - request.y1) + 1)
    * (Math.abs(request.z2 - request.z1) + 1);

  if (volume <= 0 || volume > 32_768) {
    return new Error("Fill-box volume must be between 1 and 32768 blocks.");
  }

  return {
    x1: request.x1,
    y1: request.y1,
    z1: request.z1,
    x2: request.x2,
    y2: request.y2,
    z2: request.z2,
    blockId
  };
}

function normalizeCommandRequest(request: CommandRequest): CommandRequest | Error {
  if (typeof request.command !== "string") {
    return new Error("command must be a string.");
  }

  const command = request.command.trim().replace(/^\/+/, "").trim();
  if (command.length === 0) {
    return new Error("command must be non-empty.");
  }

  return { command };
}

function normalizeBoundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string
): number | Error {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < min || value > max) {
    return new Error(`${label} must be an integer between ${min} and ${max}.`);
  }

  return value;
}

function normalizeBlockCoordinates(
  request: Pick<PlaceBlockRequest, "x" | "y" | "z">
): Pick<PlaceBlockRequest, "x" | "y" | "z"> | Error {
  if (!Number.isInteger(request.x) || !Number.isInteger(request.y) || !Number.isInteger(request.z)) {
    return new Error("Block coordinates must be integers.");
  }

  return {
    x: request.x,
    y: request.y,
    z: request.z
  };
}

function normalizeBlockId(blockId: string): string | Error {
  if (typeof blockId !== "string" || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(blockId)) {
    return new Error("blockId must be a valid Minecraft namespaced identifier.");
  }

  return blockId;
}

function aliasActionResult(result: BridgeActionResult, action: string, prefix: string): BridgeActionResult {
  const subject = result.primaryPosition === undefined
    ? result.message
    : `${result.primaryPosition.x},${result.primaryPosition.y},${result.primaryPosition.z}`;

  return {
    ...result,
    action,
    message: `${prefix} ${subject}. Changed blocks: ${result.changedBlocks}.`
  };
}
