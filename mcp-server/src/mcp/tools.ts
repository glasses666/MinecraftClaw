import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { BridgePlayerState, TeleportRequest } from "../bridge/client.js";

export interface ToolDependencies {
  getPlayerState(): Promise<BridgePlayerState>;
  teleportPlayer(request: TeleportRequest): Promise<BridgePlayerState>;
}

export interface ToolHandlers {
  getPlayerState(): Promise<CallToolResult>;
  teleportPlayer(request: TeleportRequest): Promise<CallToolResult>;
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

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
