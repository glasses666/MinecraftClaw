import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type {
  BridgePlayerState,
  LocalSpaceSnapshot,
  SpaceScanRequest,
  TeleportRequest
} from "../bridge/client.js";
import { buildSpaceModel } from "./space-model.js";

export interface ToolDependencies {
  getPlayerState(): Promise<BridgePlayerState>;
  teleportPlayer(request: TeleportRequest): Promise<BridgePlayerState>;
  scanLocalSpace(request: SpaceScanRequest): Promise<LocalSpaceSnapshot>;
}

export interface ToolHandlers {
  getPlayerState(): Promise<CallToolResult>;
  teleportPlayer(request: TeleportRequest): Promise<CallToolResult>;
  scanLocalSpace(request: SpaceScanRequest): Promise<CallToolResult>;
  analyzeLocalSpace(request: SpaceScanRequest): Promise<CallToolResult>;
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
