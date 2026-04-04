import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type {
  BridgeActionResult,
  BridgePlayerState,
  CommandRequest,
  FillBoxRequest,
  InventorySnapshot,
  LocalSpaceSnapshot,
  PlaceBlockRequest,
  SpaceScanRequest,
  TeleportRequest
} from "../bridge/client.js";
import { buildSpaceModel } from "./space-model.js";

export interface ToolDependencies {
  getPlayerState(): Promise<BridgePlayerState>;
  getInventory(): Promise<InventorySnapshot>;
  teleportPlayer(request: TeleportRequest): Promise<BridgePlayerState>;
  scanLocalSpace(request: SpaceScanRequest): Promise<LocalSpaceSnapshot>;
  placeBlock(request: PlaceBlockRequest): Promise<BridgeActionResult>;
  fillBox(request: FillBoxRequest): Promise<BridgeActionResult>;
  runCommand(request: CommandRequest): Promise<BridgeActionResult>;
}

export interface ToolHandlers {
  getPlayerState(): Promise<CallToolResult>;
  getInventory(): Promise<CallToolResult>;
  teleportPlayer(request: TeleportRequest): Promise<CallToolResult>;
  scanLocalSpace(request: SpaceScanRequest): Promise<CallToolResult>;
  analyzeLocalSpace(request: SpaceScanRequest): Promise<CallToolResult>;
  placeBlock(request: PlaceBlockRequest): Promise<CallToolResult>;
  breakBlock(request: Omit<PlaceBlockRequest, "blockId">): Promise<CallToolResult>;
  fillBox(request: FillBoxRequest): Promise<CallToolResult>;
  clearBox(request: Omit<FillBoxRequest, "blockId">): Promise<CallToolResult>;
  runCommand(request: CommandRequest): Promise<CallToolResult>;
  summonEntity(request: SummonEntityRequest): Promise<CallToolResult>;
  setTime(request: SetTimeRequest): Promise<CallToolResult>;
  setWeather(request: SetWeatherRequest): Promise<CallToolResult>;
  giveItem(request: GiveItemRequest): Promise<CallToolResult>;
}

interface SummonEntityRequest {
  entityId: string;
  x: number;
  y: number;
  z: number;
}

interface SetTimeRequest {
  time: string | number;
}

interface SetWeatherRequest {
  weather: "clear" | "rain" | "thunder";
  durationSeconds?: number;
}

interface GiveItemRequest {
  itemId: string;
  count?: number;
  target?: string;
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

    async getInventory() {
      try {
        const inventory = await dependencies.getInventory();
        return {
          content: [
            {
              type: "text",
              text: describeInventory(inventory)
            }
          ],
          structuredContent: {
            inventory
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to read inventory: ${describeError(error)}`);
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
    },

    async summonEntity(request) {
      const normalized = normalizeSummonEntityRequest(request);
      if (normalized instanceof Error) {
        return errorResult(normalized.message);
      }

      try {
        const result = await dependencies.runCommand({
          command: `summon ${normalized.entityId} ${normalized.x} ${normalized.y} ${normalized.z}`
        });
        return successActionResult({
          ...result,
          action: "summon_entity",
          message: `Summoned ${normalized.entityId} at ${normalized.x},${normalized.y},${normalized.z}`
        });
      } catch (error) {
        return errorResult(`Failed to summon entity: ${describeError(error)}`);
      }
    },

    async setTime(request) {
      const normalized = normalizeTimeRequest(request);
      if (normalized instanceof Error) {
        return errorResult(normalized.message);
      }

      try {
        const result = await dependencies.runCommand({
          command: `time set ${normalized.time}`
        });
        return successActionResult({
          ...result,
          action: "set_time",
          message: `Set time to ${normalized.time}`
        });
      } catch (error) {
        return errorResult(`Failed to set time: ${describeError(error)}`);
      }
    },

    async setWeather(request) {
      const normalized = normalizeWeatherRequest(request);
      if (normalized instanceof Error) {
        return errorResult(normalized.message);
      }

      const suffix = normalized.durationSeconds === undefined ? "" : ` ${normalized.durationSeconds}`;

      try {
        const result = await dependencies.runCommand({
          command: `weather ${normalized.weather}${suffix}`
        });
        return successActionResult({
          ...result,
          action: "set_weather",
          message: `Set weather to ${normalized.weather}${normalized.durationSeconds === undefined ? "" : ` for ${normalized.durationSeconds}s`}`
        });
      } catch (error) {
        return errorResult(`Failed to set weather: ${describeError(error)}`);
      }
    },

    async giveItem(request) {
      const normalized = normalizeGiveItemRequest(request);
      if (normalized instanceof Error) {
        return errorResult(normalized.message);
      }

      try {
        const player = await dependencies.getPlayerState();
        const target = normalized.target ?? player.name;
        const result = await dependencies.runCommand({
          command: `give ${target} ${normalized.itemId} ${normalized.count}`
        });
        return successActionResult({
          ...result,
          action: "give_item",
          message: `Gave ${normalized.count} ${normalized.itemId} to ${target}`
        });
      } catch (error) {
        return errorResult(`Failed to give item: ${describeError(error)}`);
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

function describeInventory(inventory: InventorySnapshot): string {
  return `Inventory for ${inventory.playerName}: ${inventory.slots.length} filled slots, selected hotbar slot ${inventory.selectedHotbarSlot}.`;
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

function normalizeSummonEntityRequest(request: SummonEntityRequest): SummonEntityRequest | Error {
  if (!Number.isInteger(request.x) || !Number.isInteger(request.y) || !Number.isInteger(request.z)) {
    return new Error("Summon coordinates must be integers.");
  }

  const entityId = normalizeNamespacedIdentifier(request.entityId, "entityId");
  if (entityId instanceof Error) {
    return entityId;
  }

  return {
    entityId,
    x: request.x,
    y: request.y,
    z: request.z
  };
}

function normalizeTimeRequest(request: SetTimeRequest): { time: string | number } | Error {
  if (typeof request.time === "number") {
    if (!Number.isInteger(request.time) || request.time < 0) {
      return new Error("time must be a non-negative integer or a valid named preset.");
    }
    return { time: request.time };
  }

  if (typeof request.time === "string") {
    const time = request.time.trim();
    if (["day", "night", "noon", "midnight"].includes(time)) {
      return { time };
    }
  }

  return new Error("time must be one of day/night/noon/midnight or a non-negative integer.");
}

function normalizeWeatherRequest(request: SetWeatherRequest): SetWeatherRequest | Error {
  if (!["clear", "rain", "thunder"].includes(request.weather)) {
    return new Error("weather must be clear, rain, or thunder.");
  }

  if (request.durationSeconds !== undefined) {
    if (!Number.isInteger(request.durationSeconds) || request.durationSeconds < 1 || request.durationSeconds > 1_000_000) {
      return new Error("durationSeconds must be an integer between 1 and 1000000.");
    }
  }

  return request;
}

function normalizeGiveItemRequest(request: GiveItemRequest): Required<Pick<GiveItemRequest, "itemId" | "count">> & Pick<GiveItemRequest, "target"> | Error {
  const itemId = normalizeNamespacedIdentifier(request.itemId, "itemId");
  if (itemId instanceof Error) {
    return itemId;
  }

  const count = request.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 6400) {
    return new Error("count must be an integer between 1 and 6400.");
  }

  if (request.target !== undefined) {
    const target = request.target.trim();
    if (target.length === 0 || /\s/.test(target)) {
      return new Error("target must be a non-empty single token.");
    }
  }

  return {
    itemId,
    count,
    target: request.target
  };
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
  return normalizeNamespacedIdentifier(blockId, "blockId");
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

function normalizeNamespacedIdentifier(value: string, label: string): string | Error {
  if (typeof value !== "string" || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(value)) {
    return new Error(`${label} must be a valid Minecraft namespaced identifier.`);
  }

  return value;
}
