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
import {
  buildExecutionPlan,
  getBlueprint,
  planBlueprintBuild,
  planStructureBuild,
  type BlueprintPlacementMode,
  type BuildPlan
} from "../builder/planner.js";
import { normalizeRuntimeBlueprint, type RuntimeBlueprint } from "../builder/runtime-blueprint.js";
import { projectLocalSpace, type ProjectionBounds } from "./space-projection.js";
import { buildSiteBrief } from "./site-brief.js";
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
  analyzeBuildSite(request: SpaceScanRequest): Promise<CallToolResult>;
  projectLocalSpace(request: ProjectLocalSpaceRequest): Promise<CallToolResult>;
  planBuild(request: PlanBuildRequest): Promise<CallToolResult>;
  previewBlueprint(request: PreviewBlueprintRequest): Promise<CallToolResult>;
  buildStructure(request: BuildStructureRequest): Promise<CallToolResult>;
  buildFromBlueprint(request: BuildFromBlueprintRequest): Promise<CallToolResult>;
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

interface PlanBuildRequest extends SpaceScanRequest {
  blueprintId: string;
  placementMode?: BlueprintPlacementMode;
  clearanceAboveSurface?: number;
  minSupportRatio?: number;
  maxSurfaceVariance?: number;
}

interface BuildStructureRequest extends PlanBuildRequest {
  allowOverlap?: boolean;
}

interface PreviewBlueprintRequest extends SpaceScanRequest {
  blueprint: unknown;
  placementMode?: BlueprintPlacementMode;
  clearanceAboveSurface?: number;
  minSupportRatio?: number;
  maxSurfaceVariance?: number;
}

interface BuildFromBlueprintRequest extends PreviewBlueprintRequest {
  allowOverlap?: boolean;
}

interface ProjectLocalSpaceRequest extends SpaceScanRequest {
  x1?: number;
  y1?: number;
  z1?: number;
  x2?: number;
  y2?: number;
  z2?: number;
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

    async analyzeBuildSite(request) {
      const normalizedRequest = normalizeScanRequest(request);

      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest);
        const site = buildSiteBrief(space);
        return {
          content: [
            {
              type: "text",
              text: describeBuildSite(site)
            }
          ],
          structuredContent: {
            site
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to analyze build site: ${describeError(error)}`);
      }
    },

    async projectLocalSpace(request) {
      const normalizedRequest = normalizeProjectLocalSpaceRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest.scan);
        const projection = projectLocalSpace(space, normalizedRequest.focusBounds);
        return {
          content: [
            {
              type: "text",
              text: describeProjection(projection)
            }
          ],
          structuredContent: {
            projection
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to project local space: ${describeError(error)}`);
      }
    },

    async planBuild(request) {
      const normalizedRequest = normalizePlanBuildRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest.scan);
        const plan = planStructureBuild(
          space,
          normalizedRequest.blueprintId,
          normalizedRequest.placementMode,
          normalizedRequest.options
        );

        if (plan instanceof Error) {
          return errorResult(plan.message);
        }

        return {
          content: [
            {
              type: "text",
              text: describeBuildPlan(plan)
            }
          ],
          structuredContent: {
            plan
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to plan build: ${describeError(error)}`);
      }
    },

    async buildStructure(request) {
      const normalizedRequest = normalizeBuildStructureRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest.scan);
        const plan = planStructureBuild(
          space,
          normalizedRequest.blueprintId,
          normalizedRequest.placementMode,
          normalizedRequest.options
        );

        if (plan instanceof Error) {
          return errorResult(plan.message);
        }

        if (!plan.assessment.isClear && !normalizedRequest.allowOverlap) {
          return errorResult("Build plan overlaps existing blocks or POIs. Re-run with allowOverlap=true to force it.");
        }

        const blueprint = getBlueprint(plan.blueprintId);
        if (blueprint === null) {
          return errorResult(`Unknown blueprint: ${plan.blueprintId}`);
        }

        const executionPlan = buildExecutionPlan(blueprint, plan.origin);
        let totalChangedBlocks = 0;

        for (const step of executionPlan) {
          const result = step.kind === "fill"
            ? await dependencies.fillBox(step.request)
            : step.kind === "block"
              ? await dependencies.placeBlock(step.request)
              : await dependencies.runCommand(step.request);

          totalChangedBlocks += result.changedBlocks ?? 0;
        }

        return {
          content: [
            {
              type: "text",
              text: `Built ${plan.blueprintId} at ${plan.origin.x},${plan.origin.y},${plan.origin.z} ` +
                `using ${executionPlan.length} steps. Total changed blocks: ${totalChangedBlocks}.`
            }
          ],
          structuredContent: {
            build: {
              blueprintId: plan.blueprintId,
              placementMode: plan.placementMode,
              origin: plan.origin,
              bounds: plan.bounds,
              executedStepCount: executionPlan.length,
              totalChangedBlocks,
              plan
            }
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to build structure: ${describeError(error)}`);
      }
    },

    async previewBlueprint(request) {
      const normalizedRequest = normalizePreviewBlueprintRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest.scan);
        const plan = planBlueprintBuild(
          space,
          normalizedRequest.blueprint,
          normalizedRequest.placementMode,
          normalizedRequest.options
        );

        if (plan instanceof Error) {
          return errorResult(plan.message);
        }

        const site = buildSiteBrief(space);
        return {
          content: [
            {
              type: "text",
              text: `${describeBuildPlan(plan)} Site guidance: ${site.recommendations.foundationStyle}; ${site.recommendations.massingStrategy}.`
            }
          ],
          structuredContent: {
            preview: {
              plan,
              site
            }
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to preview blueprint: ${describeError(error)}`);
      }
    },

    async buildFromBlueprint(request) {
      const normalizedRequest = normalizeBuildFromBlueprintRequest(request);
      if (normalizedRequest instanceof Error) {
        return errorResult(normalizedRequest.message);
      }

      try {
        const space = await dependencies.scanLocalSpace(normalizedRequest.scan);
        const plan = planBlueprintBuild(
          space,
          normalizedRequest.blueprint,
          normalizedRequest.placementMode,
          normalizedRequest.options
        );

        if (plan instanceof Error) {
          return errorResult(plan.message);
        }

        if (!plan.assessment.isClear && !normalizedRequest.allowOverlap) {
          return errorResult("Runtime blueprint overlaps existing blocks or POIs. Re-run with allowOverlap=true to force it.");
        }

        const executionPlan = buildExecutionPlan(normalizedRequest.blueprint, plan.origin);
        let totalChangedBlocks = 0;

        for (const step of executionPlan) {
          const result = step.kind === "fill"
            ? await dependencies.fillBox(step.request)
            : step.kind === "block"
              ? await dependencies.placeBlock(step.request)
              : await dependencies.runCommand(step.request);

          totalChangedBlocks += result.changedBlocks ?? 0;
        }

        return {
          content: [
            {
              type: "text",
              text: `Built ${plan.blueprintId} from runtime blueprint at ${plan.origin.x},${plan.origin.y},${plan.origin.z} using ${executionPlan.length} steps. Total changed blocks: ${totalChangedBlocks}.`
            }
          ],
          structuredContent: {
            build: {
              blueprintId: plan.blueprintId,
              placementMode: plan.placementMode,
              origin: plan.origin,
              bounds: plan.bounds,
              executedStepCount: executionPlan.length,
              totalChangedBlocks,
              plan
            }
          },
          isError: false
        };
      } catch (error) {
        return errorResult(`Failed to build runtime blueprint: ${describeError(error)}`);
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

function describeBuildSite(site: ReturnType<typeof buildSiteBrief>): string {
  return `Analyzed build site around ${site.player.name}: site=${site.summary.siteKind}, foundation=${site.recommendations.foundationStyle}, roof=${site.recommendations.roofProfile}.`;
}

function describeBuildPlan(plan: BuildPlan): string {
  const overlapSummary = plan.assessment.isClear
    ? "clear"
    : `overlap=${plan.assessment.overlappingBlockCount}, pois=${plan.assessment.overlappingPois.length}`;

  return `Planned ${plan.blueprintId} as a ${plan.placementMode} build at ` +
    `${plan.origin.x},${plan.origin.y},${plan.origin.z} with ${plan.stepCount} steps; ` +
    `support=${plan.supportingColumnCount}, supportRatio=${plan.supportRatio ?? "n/a"}, ${overlapSummary}.`;
}

function describeProjection(projection: ReturnType<typeof projectLocalSpace>): string {
  return `Built projection for ${projection.summary.width}x${projection.summary.depth}x${projection.summary.height} ` +
    `occupied volume with ${projection.summary.occupiedColumns} occupied columns and ${projection.summary.occupiedCells} occupied cells.`;
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
  const radius = normalizeBoundedInteger(request.radius, 8, 1, 20, "radius");
  if (radius instanceof Error) {
    return radius;
  }

  const down = normalizeBoundedInteger(request.down, 8, 1, 24, "down");
  if (down instanceof Error) {
    return down;
  }

  const up = normalizeBoundedInteger(request.up, 12, 1, 24, "up");
  if (up instanceof Error) {
    return up;
  }

  return { radius, down, up };
}

function normalizeProjectLocalSpaceRequest(
  request: ProjectLocalSpaceRequest
): {
  scan: SpaceScanRequest;
  focusBounds?: ProjectionBounds;
} | Error {
  const scan = normalizeScanRequest(request);
  if (scan instanceof Error) {
    return scan;
  }

  const bounds = [request.x1, request.y1, request.z1, request.x2, request.y2, request.z2];
  const hasAnyBounds = bounds.some((value) => value !== undefined);
  if (!hasAnyBounds) {
    return { scan };
  }

  if (!bounds.every((value) => Number.isInteger(value))) {
    return new Error("Projection bounds must be integers when provided.");
  }

  return {
    scan,
    focusBounds: {
      min: {
        x: Math.min(request.x1!, request.x2!),
        y: Math.min(request.y1!, request.y2!),
        z: Math.min(request.z1!, request.z2!)
      },
      max: {
        x: Math.max(request.x1!, request.x2!),
        y: Math.max(request.y1!, request.y2!),
        z: Math.max(request.z1!, request.z2!)
      }
    }
  };
}

function normalizePlanBuildRequest(
  request: PlanBuildRequest
): {
  blueprintId: string;
  placementMode: BlueprintPlacementMode;
  scan: SpaceScanRequest;
  options: {
    clearanceAboveSurface?: number;
    minSupportRatio?: number;
    maxSurfaceVariance?: number;
  };
} | Error {
  const blueprintId = normalizeBlueprintId(request.blueprintId);
  if (blueprintId instanceof Error) {
    return blueprintId;
  }

  const placementMode = normalizePlacementMode(request.placementMode);
  if (placementMode instanceof Error) {
    return placementMode;
  }

  const scan = normalizeScanRequest(request);
  if (scan instanceof Error) {
    return scan;
  }

  const clearanceAboveSurface = normalizeOptionalBoundedNumber(
    request.clearanceAboveSurface,
    0,
    8,
    "clearanceAboveSurface"
  );
  if (clearanceAboveSurface instanceof Error) {
    return clearanceAboveSurface;
  }

  const minSupportRatio = normalizeOptionalBoundedNumber(
    request.minSupportRatio,
    0,
    1,
    "minSupportRatio"
  );
  if (minSupportRatio instanceof Error) {
    return minSupportRatio;
  }

  const maxSurfaceVariance = normalizeOptionalBoundedInteger(
    request.maxSurfaceVariance,
    0,
    8,
    "maxSurfaceVariance"
  );
  if (maxSurfaceVariance instanceof Error) {
    return maxSurfaceVariance;
  }

  return {
    blueprintId,
    placementMode,
    scan,
    options: {
      clearanceAboveSurface,
      minSupportRatio,
      maxSurfaceVariance
    }
  };
}

function normalizeBuildStructureRequest(
  request: BuildStructureRequest
): {
  blueprintId: string;
  placementMode: BlueprintPlacementMode;
  scan: SpaceScanRequest;
  allowOverlap: boolean;
  options: {
    clearanceAboveSurface?: number;
    minSupportRatio?: number;
    maxSurfaceVariance?: number;
  };
} | Error {
  const normalized = normalizePlanBuildRequest(request);
  if (normalized instanceof Error) {
    return normalized;
  }

  if (request.allowOverlap !== undefined && typeof request.allowOverlap !== "boolean") {
    return new Error("allowOverlap must be a boolean when provided.");
  }

  return {
    ...normalized,
    allowOverlap: request.allowOverlap ?? false
  };
}

function normalizePreviewBlueprintRequest(
  request: PreviewBlueprintRequest
): {
  blueprint: RuntimeBlueprint;
  placementMode: BlueprintPlacementMode;
  scan: SpaceScanRequest;
  options: {
    clearanceAboveSurface?: number;
    minSupportRatio?: number;
    maxSurfaceVariance?: number;
  };
} | Error {
  const blueprint = normalizeRuntimeBlueprint(request.blueprint);
  if (blueprint instanceof Error) {
    return blueprint;
  }

  const placementMode = normalizePlacementMode(request.placementMode);
  if (placementMode instanceof Error) {
    return placementMode;
  }

  const scan = normalizeScanRequest(request);
  if (scan instanceof Error) {
    return scan;
  }

  const clearanceAboveSurface = normalizeOptionalBoundedNumber(
    request.clearanceAboveSurface,
    0,
    8,
    "clearanceAboveSurface"
  );
  if (clearanceAboveSurface instanceof Error) {
    return clearanceAboveSurface;
  }

  const minSupportRatio = normalizeOptionalBoundedNumber(
    request.minSupportRatio,
    0,
    1,
    "minSupportRatio"
  );
  if (minSupportRatio instanceof Error) {
    return minSupportRatio;
  }

  const maxSurfaceVariance = normalizeOptionalBoundedInteger(
    request.maxSurfaceVariance,
    0,
    8,
    "maxSurfaceVariance"
  );
  if (maxSurfaceVariance instanceof Error) {
    return maxSurfaceVariance;
  }

  return {
    blueprint,
    placementMode,
    scan,
    options: {
      clearanceAboveSurface,
      minSupportRatio,
      maxSurfaceVariance
    }
  };
}

function normalizeBuildFromBlueprintRequest(
  request: BuildFromBlueprintRequest
): {
  blueprint: RuntimeBlueprint;
  placementMode: BlueprintPlacementMode;
  scan: SpaceScanRequest;
  allowOverlap: boolean;
  options: {
    clearanceAboveSurface?: number;
    minSupportRatio?: number;
    maxSurfaceVariance?: number;
  };
} | Error {
  const normalized = normalizePreviewBlueprintRequest(request);
  if (normalized instanceof Error) {
    return normalized;
  }

  if (request.allowOverlap !== undefined && typeof request.allowOverlap !== "boolean") {
    return new Error("allowOverlap must be a boolean when provided.");
  }

  return {
    ...normalized,
    allowOverlap: request.allowOverlap ?? false
  };
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

function normalizePlacementMode(value: unknown): BlueprintPlacementMode | Error {
  if (value === undefined) {
    return "grounded";
  }

  if (value === "floating" || value === "grounded") {
    return value;
  }

  return new Error("placementMode must be either 'floating' or 'grounded'.");
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

function normalizeOptionalBoundedNumber(
  value: unknown,
  min: number,
  max: number,
  label: string
): number | undefined | Error {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return new Error(`${label} must be a finite number between ${min} and ${max}.`);
  }

  return value;
}

function normalizeOptionalBoundedInteger(
  value: unknown,
  min: number,
  max: number,
  label: string
): number | undefined | Error {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
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

function normalizeBlueprintId(blueprintId: string): string | Error {
  if (typeof blueprintId !== "string" || !/^[a-z0-9_:-]+$/.test(blueprintId)) {
    return new Error("blueprintId must contain only lowercase letters, numbers, underscores, hyphens, or colons.");
  }

  return blueprintId;
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
