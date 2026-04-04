import type { BlockPosition, LocalSpaceSnapshot, SpacePointOfInterest } from "../bridge/client.js";

export interface RelativeFillStep {
  kind: "fill";
  from: BlockPosition;
  to: BlockPosition;
  blockId: string;
}

export interface RelativeBlockStep {
  kind: "block";
  at: BlockPosition;
  blockId: string;
}

export interface RelativeCommandStep {
  kind: "command";
  commandTemplate: string;
  offset: BlockPosition;
}

export type RelativeBuildStep = RelativeFillStep | RelativeBlockStep | RelativeCommandStep;

export interface StructureBlueprint {
  id: string;
  width: number;
  depth: number;
  height: number;
  steps: RelativeBuildStep[];
}

export interface PlacementAssessment {
  origin: BlockPosition;
  bounds: {
    min: BlockPosition;
    max: BlockPosition;
  };
  overlappingBlockCount: number;
  overlappingPois: SpacePointOfInterest[];
  isClear: boolean;
  reasons: string[];
}

export interface FloatingPlacementOptions {
  clearanceAboveSurface?: number;
}

export interface PlannedPlacement {
  origin: BlockPosition;
  assessment: PlacementAssessment;
  supportingColumnCount: number;
}

export type ExecutableBuildStep =
  | { kind: "fill"; request: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; blockId: string } }
  | { kind: "block"; request: { x: number; y: number; z: number; blockId: string } }
  | { kind: "command"; request: { command: string } };

export const COZY_CABIN_V1: StructureBlueprint = {
  id: "cozy_cabin_v1",
  width: 7,
  depth: 8,
  height: 6,
  steps: [
    fill({ x: 0, y: 0, z: 1 }, { x: 6, y: 0, z: 7 }, "minecraft:spruce_planks"),
    fill({ x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, "minecraft:spruce_planks"),
    fill({ x: 0, y: 1, z: 1 }, { x: 6, y: 3, z: 7 }, "minecraft:oak_planks"),
    fill({ x: 1, y: 1, z: 2 }, { x: 5, y: 3, z: 6 }, "minecraft:air"),
    fill({ x: 0, y: 1, z: 1 }, { x: 0, y: 3, z: 1 }, "minecraft:stripped_oak_log"),
    fill({ x: 0, y: 1, z: 7 }, { x: 0, y: 3, z: 7 }, "minecraft:stripped_oak_log"),
    fill({ x: 6, y: 1, z: 1 }, { x: 6, y: 3, z: 1 }, "minecraft:stripped_oak_log"),
    fill({ x: 6, y: 1, z: 7 }, { x: 6, y: 3, z: 7 }, "minecraft:stripped_oak_log"),
    fill({ x: -1, y: 4, z: 0 }, { x: 7, y: 4, z: 8 }, "minecraft:dark_oak_planks"),
    block({ x: 1, y: 2, z: 1 }, "minecraft:glass"),
    block({ x: 5, y: 2, z: 1 }, "minecraft:glass"),
    block({ x: 0, y: 2, z: 4 }, "minecraft:glass"),
    block({ x: 6, y: 2, z: 4 }, "minecraft:glass"),
    block({ x: 3, y: 2, z: 7 }, "minecraft:glass"),
    block({ x: 5, y: 1, z: 5 }, "minecraft:chest"),
    block({ x: 5, y: 1, z: 6 }, "minecraft:crafting_table"),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false]", { x: 3, y: 1, z: 1 }),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false]", { x: 3, y: 2, z: 1 }),
    command("setblock {x} {y} {z} minecraft:red_bed[facing=east,part=foot,occupied=false]", { x: 1, y: 1, z: 6 }),
    command("setblock {x} {y} {z} minecraft:red_bed[facing=east,part=head,occupied=false]", { x: 2, y: 1, z: 6 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 3, y: 3, z: 4 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 2, y: 3, z: 2 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 4, y: 3, z: 2 })
  ]
};

export function assessBlueprintPlacement(
  space: LocalSpaceSnapshot,
  blueprint: StructureBlueprint,
  origin: BlockPosition
): PlacementAssessment {
  const bounds = {
    min: { x: origin.x, y: origin.y, z: origin.z },
    max: {
      x: origin.x + blueprint.width - 1,
      y: origin.y + blueprint.height - 1,
      z: origin.z + blueprint.depth - 1
    }
  };
  const reasons: string[] = [];

  if (
    bounds.min.x < space.bounds.min.x ||
    bounds.min.y < space.bounds.min.y ||
    bounds.min.z < space.bounds.min.z ||
    bounds.max.x > space.bounds.max.x ||
    bounds.max.y > space.bounds.max.y ||
    bounds.max.z > space.bounds.max.z
  ) {
    reasons.push("outside_scanned_bounds");
  }

  let overlappingBlockCount = 0;

  for (const column of space.columns) {
    if (column.x < bounds.min.x || column.x > bounds.max.x || column.z < bounds.min.z || column.z > bounds.max.z) {
      continue;
    }

    for (const run of column.occupiedRuns) {
      const overlapStart = Math.max(run.startY, bounds.min.y);
      const overlapEnd = Math.min(run.endY, bounds.max.y);
      if (overlapStart <= overlapEnd) {
        overlappingBlockCount += overlapEnd - overlapStart + 1;
      }
    }
  }

  if (overlappingBlockCount > 0) {
    reasons.push("occupied_volume_overlap");
  }

  const overlappingPois = space.pointsOfInterest.filter((poi) =>
    poi.position.x >= bounds.min.x &&
    poi.position.x <= bounds.max.x &&
    poi.position.y >= bounds.min.y &&
    poi.position.y <= bounds.max.y &&
    poi.position.z >= bounds.min.z &&
    poi.position.z <= bounds.max.z
  );

  if (overlappingPois.length > 0) {
    reasons.push("poi_overlap");
  }

  return {
    origin,
    bounds,
    overlappingBlockCount,
    overlappingPois,
    isClear: reasons.length === 0,
    reasons
  };
}

export function findFloatingPlacement(
  space: LocalSpaceSnapshot,
  blueprint: StructureBlueprint,
  options: FloatingPlacementOptions = {}
): PlannedPlacement | null {
  const clearanceAboveSurface = options.clearanceAboveSurface ?? 2;
  const columnsByKey = new Map(space.columns.map((column) => [`${column.x},${column.z}`, column] as const));
  const candidates: PlannedPlacement[] = [];

  for (let x = space.bounds.min.x; x <= space.bounds.max.x - blueprint.width + 1; x += 1) {
    for (let z = space.bounds.min.z; z <= space.bounds.max.z - blueprint.depth + 1; z += 1) {
      let highestOccupiedY = Number.NEGATIVE_INFINITY;
      let supportingColumnCount = 0;

      for (let dx = 0; dx < blueprint.width; dx += 1) {
        for (let dz = 0; dz < blueprint.depth; dz += 1) {
          const column = columnsByKey.get(`${x + dx},${z + dz}`);
          if (column?.highestOccupiedY !== null && column?.highestOccupiedY !== undefined) {
            supportingColumnCount += 1;
          }
          highestOccupiedY = Math.max(highestOccupiedY, column?.highestOccupiedY ?? Number.NEGATIVE_INFINITY);
        }
      }

      const baseY = Number.isFinite(highestOccupiedY)
        ? highestOccupiedY + clearanceAboveSurface + 1
        : space.player.position.y + clearanceAboveSurface + 1;

      const origin = { x, y: baseY, z };
      const assessment = assessBlueprintPlacement(space, blueprint, origin);
      if (assessment.isClear) {
        candidates.push({ origin, assessment, supportingColumnCount });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) =>
    left.supportingColumnCount - right.supportingColumnCount ||
    scorePlacement(left.origin, space.player.position) - scorePlacement(right.origin, space.player.position) ||
    left.origin.x - right.origin.x ||
    left.origin.z - right.origin.z
  )[0] ?? null;
}

export function buildExecutionPlan(
  blueprint: StructureBlueprint,
  origin: BlockPosition
): ExecutableBuildStep[] {
  return blueprint.steps.map((step) => {
    if (step.kind === "fill") {
      return {
        kind: "fill",
        request: {
          x1: origin.x + step.from.x,
          y1: origin.y + step.from.y,
          z1: origin.z + step.from.z,
          x2: origin.x + step.to.x,
          y2: origin.y + step.to.y,
          z2: origin.z + step.to.z,
          blockId: step.blockId
        }
      } satisfies ExecutableBuildStep;
    }

    if (step.kind === "block") {
      return {
        kind: "block",
        request: {
          x: origin.x + step.at.x,
          y: origin.y + step.at.y,
          z: origin.z + step.at.z,
          blockId: step.blockId
        }
      } satisfies ExecutableBuildStep;
    }

    return {
      kind: "command",
      request: {
        command: step.commandTemplate
          .replaceAll("{x}", String(origin.x + step.offset.x))
          .replaceAll("{y}", String(origin.y + step.offset.y))
          .replaceAll("{z}", String(origin.z + step.offset.z))
      }
    } satisfies ExecutableBuildStep;
  });
}

function scorePlacement(origin: BlockPosition, player: BlockPosition): number {
  const dx = origin.x - player.x;
  const dz = origin.z - player.z;
  const dy = origin.y - player.y;
  return Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 2;
}

function fill(from: BlockPosition, to: BlockPosition, blockId: string): RelativeFillStep {
  return {
    kind: "fill",
    from,
    to,
    blockId
  };
}

function block(at: BlockPosition, blockId: string): RelativeBlockStep {
  return {
    kind: "block",
    at,
    blockId
  };
}

function command(template: string, offset: BlockPosition): RelativeCommandStep {
  return {
    kind: "command",
    commandTemplate: template,
    offset
  };
}
