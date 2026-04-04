import type { BlockPosition, LocalSpaceSnapshot, SpacePointOfInterest } from "../bridge/client.js";

export type BlueprintPlacementMode = "floating" | "grounded";

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

export interface GroundedPlacementOptions {
  minSupportRatio?: number;
  maxSurfaceVariance?: number;
}

export interface PlannedPlacement {
  origin: BlockPosition;
  assessment: PlacementAssessment;
  supportingColumnCount: number;
  supportY?: number;
  supportRatio?: number;
}

export interface BuildPlan {
  blueprintId: string;
  placementMode: BlueprintPlacementMode;
  origin: BlockPosition;
  bounds: PlacementAssessment["bounds"];
  assessment: PlacementAssessment;
  stepCount: number;
  supportingColumnCount: number;
  supportY?: number;
  supportRatio?: number;
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

export const SKY_GAZEBO_V1: StructureBlueprint = {
  id: "sky_gazebo_v1",
  width: 7,
  depth: 7,
  height: 6,
  steps: [
    fill({ x: 1, y: 0, z: 1 }, { x: 5, y: 0, z: 5 }, "minecraft:spruce_planks"),
    fill({ x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: 3 }, "minecraft:spruce_planks"),
    fill({ x: 6, y: 0, z: 3 }, { x: 6, y: 0, z: 3 }, "minecraft:spruce_planks"),
    fill({ x: 3, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, "minecraft:spruce_planks"),
    fill({ x: 3, y: 0, z: 6 }, { x: 3, y: 0, z: 6 }, "minecraft:spruce_planks"),
    fill({ x: 1, y: 1, z: 1 }, { x: 1, y: 4, z: 1 }, "minecraft:stripped_oak_log"),
    fill({ x: 1, y: 1, z: 5 }, { x: 1, y: 4, z: 5 }, "minecraft:stripped_oak_log"),
    fill({ x: 5, y: 1, z: 1 }, { x: 5, y: 4, z: 1 }, "minecraft:stripped_oak_log"),
    fill({ x: 5, y: 1, z: 5 }, { x: 5, y: 4, z: 5 }, "minecraft:stripped_oak_log"),
    fill({ x: 1, y: 5, z: 1 }, { x: 5, y: 5, z: 5 }, "minecraft:dark_oak_planks"),
    fill({ x: 0, y: 5, z: 0 }, { x: 6, y: 5, z: 6 }, "minecraft:dark_oak_slab"),
    fill({ x: 2, y: 1, z: 1 }, { x: 4, y: 1, z: 1 }, "minecraft:spruce_fence"),
    fill({ x: 2, y: 1, z: 5 }, { x: 4, y: 1, z: 5 }, "minecraft:spruce_fence"),
    fill({ x: 1, y: 1, z: 2 }, { x: 1, y: 1, z: 4 }, "minecraft:spruce_fence"),
    fill({ x: 5, y: 1, z: 2 }, { x: 5, y: 1, z: 4 }, "minecraft:spruce_fence"),
    block({ x: 3, y: 0, z: 3 }, "minecraft:barrel"),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 2, y: 4, z: 2 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 4, y: 4, z: 2 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 2, y: 4, z: 4 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 4, y: 4, z: 4 }),
    command("setblock {x} {y} {z} minecraft:soul_campfire", { x: 3, y: 1, z: 3 })
  ]
};

export const RIDGE_LANTERN_LODGE_V1: StructureBlueprint = {
  id: "ridge_lantern_lodge_v1",
  width: 9,
  depth: 7,
  height: 8,
  steps: [
    fill({ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 6 }, "minecraft:stone_bricks"),
    fill({ x: 1, y: 1, z: 1 }, { x: 7, y: 1, z: 5 }, "minecraft:spruce_planks"),
    fill({ x: 1, y: 2, z: 1 }, { x: 7, y: 4, z: 5 }, "minecraft:oak_planks"),
    fill({ x: 2, y: 2, z: 2 }, { x: 6, y: 4, z: 4 }, "minecraft:air"),
    fill({ x: 0, y: 1, z: 0 }, { x: 0, y: 4, z: 0 }, "minecraft:cobblestone"),
    fill({ x: 0, y: 1, z: 6 }, { x: 0, y: 4, z: 6 }, "minecraft:cobblestone"),
    fill({ x: 8, y: 1, z: 0 }, { x: 8, y: 4, z: 0 }, "minecraft:cobblestone"),
    fill({ x: 8, y: 1, z: 6 }, { x: 8, y: 4, z: 6 }, "minecraft:cobblestone"),
    fill({ x: -1, y: 5, z: -1 }, { x: 9, y: 5, z: 7 }, "minecraft:dark_oak_planks"),
    fill({ x: 0, y: 6, z: 0 }, { x: 8, y: 6, z: 6 }, "minecraft:dark_oak_slab"),
    fill({ x: 2, y: 2, z: 1 }, { x: 3, y: 2, z: 1 }, "minecraft:glass_pane"),
    fill({ x: 5, y: 2, z: 1 }, { x: 6, y: 2, z: 1 }, "minecraft:glass_pane"),
    fill({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 }, "minecraft:glass_pane"),
    fill({ x: 7, y: 2, z: 2 }, { x: 7, y: 2, z: 4 }, "minecraft:glass_pane"),
    fill({ x: 2, y: 2, z: 5 }, { x: 6, y: 2, z: 5 }, "minecraft:glass_pane"),
    fill({ x: 2, y: 1, z: -1 }, { x: 6, y: 1, z: 0 }, "minecraft:spruce_planks"),
    fill({ x: 2, y: 2, z: -1 }, { x: 6, y: 2, z: -1 }, "minecraft:spruce_fence"),
    block({ x: 2, y: 2, z: 3 }, "minecraft:bookshelf"),
    block({ x: 6, y: 2, z: 4 }, "minecraft:bookshelf"),
    block({ x: 6, y: 2, z: 2 }, "minecraft:chest"),
    block({ x: 5, y: 2, z: 2 }, "minecraft:crafting_table"),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false]", { x: 4, y: 2, z: 1 }),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false]", { x: 4, y: 3, z: 1 }),
    command("setblock {x} {y} {z} minecraft:red_bed[facing=east,part=foot,occupied=false]", { x: 2, y: 2, z: 4 }),
    command("setblock {x} {y} {z} minecraft:red_bed[facing=east,part=head,occupied=false]", { x: 3, y: 2, z: 4 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 3, y: 4, z: 2 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 5, y: 4, z: 2 }),
    command("setblock {x} {y} {z} minecraft:campfire[lit=true,signal_fire=false,waterlogged=false]", { x: 7, y: 1, z: 5 }),
    command("setblock {x} {y} {z} minecraft:cobblestone_wall", { x: 7, y: 2, z: 5 }),
    command("setblock {x} {y} {z} minecraft:cobblestone_wall", { x: 7, y: 3, z: 5 })
  ]
};

export const RIDGE_LANTERN_LODGE_V2: StructureBlueprint = {
  id: "ridge_lantern_lodge_v2",
  width: 10,
  depth: 8,
  height: 9,
  steps: [
    fill({ x: 1, y: 0, z: 1 }, { x: 8, y: 0, z: 7 }, "minecraft:stone_bricks"),
    fill({ x: 2, y: 1, z: 0 }, { x: 7, y: 1, z: 1 }, "minecraft:spruce_planks"),
    fill({ x: 1, y: 1, z: 2 }, { x: 8, y: 4, z: 7 }, "minecraft:oak_planks"),
    fill({ x: 2, y: 2, z: 3 }, { x: 7, y: 4, z: 6 }, "minecraft:air"),
    fill({ x: 1, y: 1, z: 2 }, { x: 1, y: 4, z: 7 }, "minecraft:cobblestone"),
    fill({ x: 8, y: 1, z: 2 }, { x: 8, y: 4, z: 7 }, "minecraft:cobblestone"),
    fill({ x: 2, y: 1, z: 7 }, { x: 7, y: 3, z: 7 }, "minecraft:cobblestone"),
    fill({ x: 0, y: 5, z: 1 }, { x: 9, y: 5, z: 7 }, "minecraft:dark_oak_planks"),
    fill({ x: 1, y: 6, z: 2 }, { x: 8, y: 6, z: 6 }, "minecraft:dark_oak_planks"),
    fill({ x: 3, y: 7, z: 3 }, { x: 6, y: 7, z: 5 }, "minecraft:dark_oak_slab"),
    fill({ x: 2, y: 2, z: 2 }, { x: 3, y: 2, z: 2 }, "minecraft:glass_pane"),
    fill({ x: 6, y: 2, z: 2 }, { x: 7, y: 2, z: 2 }, "minecraft:glass_pane"),
    fill({ x: 2, y: 2, z: 7 }, { x: 3, y: 2, z: 7 }, "minecraft:glass_pane"),
    fill({ x: 6, y: 2, z: 7 }, { x: 7, y: 2, z: 7 }, "minecraft:glass_pane"),
    fill({ x: 1, y: 2, z: 4 }, { x: 1, y: 2, z: 5 }, "minecraft:glass_pane"),
    fill({ x: 8, y: 2, z: 4 }, { x: 8, y: 2, z: 5 }, "minecraft:glass_pane"),
    fill({ x: 2, y: 2, z: 1 }, { x: 7, y: 2, z: 1 }, "minecraft:spruce_fence"),
    block({ x: 3, y: 2, z: 5 }, "minecraft:bookshelf"),
    block({ x: 6, y: 2, z: 5 }, "minecraft:bookshelf"),
    block({ x: 6, y: 2, z: 3 }, "minecraft:chest"),
    block({ x: 5, y: 2, z: 3 }, "minecraft:crafting_table"),
    block({ x: 7, y: 2, z: 6 }, "minecraft:furnace"),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false]", { x: 4, y: 2, z: 2 }),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false]", { x: 4, y: 3, z: 2 }),
    command("setblock {x} {y} {z} minecraft:red_bed[facing=east,part=foot,occupied=false]", { x: 2, y: 2, z: 6 }),
    command("setblock {x} {y} {z} minecraft:red_bed[facing=east,part=head,occupied=false]", { x: 3, y: 2, z: 6 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 3, y: 4, z: 3 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 6, y: 4, z: 3 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 5, y: 4, z: 6 }),
    command("setblock {x} {y} {z} minecraft:campfire[lit=true,signal_fire=false,waterlogged=false]", { x: 8, y: 1, z: 6 }),
    command("setblock {x} {y} {z} minecraft:cobblestone_wall", { x: 8, y: 2, z: 6 }),
    command("setblock {x} {y} {z} minecraft:cobblestone_wall", { x: 8, y: 3, z: 6 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 0, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 1, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 2, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 3, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 4, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 5, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 6, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 7, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]", { x: 8, y: 5, z: 1 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 1, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 2, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 3, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 4, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 5, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 6, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 7, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]", { x: 8, y: 5, z: 7 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]", { x: 0, y: 5, z: 2 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]", { x: 0, y: 5, z: 3 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]", { x: 0, y: 5, z: 4 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]", { x: 0, y: 5, z: 5 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]", { x: 0, y: 5, z: 6 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight]", { x: 9, y: 5, z: 2 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight]", { x: 9, y: 5, z: 3 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight]", { x: 9, y: 5, z: 4 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight]", { x: 9, y: 5, z: 5 }),
    command("setblock {x} {y} {z} minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight]", { x: 9, y: 5, z: 6 }),
    command("setblock {x} {y} {z} minecraft:spruce_stairs[facing=south,half=bottom,shape=straight]", { x: 3, y: 1, z: 0 }),
    command("setblock {x} {y} {z} minecraft:spruce_stairs[facing=south,half=bottom,shape=straight]", { x: 4, y: 1, z: 0 }),
    command("setblock {x} {y} {z} minecraft:spruce_stairs[facing=south,half=bottom,shape=straight]", { x: 5, y: 1, z: 0 }),
    command("setblock {x} {y} {z} minecraft:spruce_stairs[facing=south,half=bottom,shape=straight]", { x: 6, y: 1, z: 0 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 3, y: 3, z: 1 }),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 6, y: 3, z: 1 })
  ]
};

export const BLUEPRINT_LIBRARY: Record<string, StructureBlueprint> = {
  [COZY_CABIN_V1.id]: COZY_CABIN_V1,
  [SKY_GAZEBO_V1.id]: SKY_GAZEBO_V1,
  [RIDGE_LANTERN_LODGE_V1.id]: RIDGE_LANTERN_LODGE_V1,
  [RIDGE_LANTERN_LODGE_V2.id]: RIDGE_LANTERN_LODGE_V2
};

export function getBlueprint(blueprintId: string): StructureBlueprint | null {
  return BLUEPRINT_LIBRARY[blueprintId] ?? null;
}

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

export function findGroundedPlacement(
  space: LocalSpaceSnapshot,
  blueprint: StructureBlueprint,
  options: GroundedPlacementOptions = {}
): PlannedPlacement | null {
  const minSupportRatio = options.minSupportRatio ?? 0.9;
  const maxSurfaceVariance = options.maxSurfaceVariance ?? 0;
  const columnsByKey = new Map(space.columns.map((column) => [`${column.x},${column.z}`, column] as const));
  const candidates: PlannedPlacement[] = [];
  const footprintArea = blueprint.width * blueprint.depth;

  for (let x = space.bounds.min.x; x <= space.bounds.max.x - blueprint.width + 1; x += 1) {
    for (let z = space.bounds.min.z; z <= space.bounds.max.z - blueprint.depth + 1; z += 1) {
      const supportHeights: number[] = [];

      for (let dx = 0; dx < blueprint.width; dx += 1) {
        for (let dz = 0; dz < blueprint.depth; dz += 1) {
          const column = columnsByKey.get(`${x + dx},${z + dz}`);
          if (column?.walkableY !== null && column?.walkableY !== undefined) {
            supportHeights.push(column.walkableY);
          }
        }
      }

      if (supportHeights.length === 0) {
        continue;
      }

      const supportRatio = supportHeights.length / footprintArea;
      if (supportRatio < minSupportRatio) {
        continue;
      }

      const minY = Math.min(...supportHeights);
      const maxY = Math.max(...supportHeights);
      if (maxY - minY > maxSurfaceVariance) {
        continue;
      }

      const supportY = maxY;
      const origin = { x, y: supportY + 1, z };
      const assessment = assessBlueprintPlacement(space, blueprint, origin);
      if (!assessment.isClear) {
        continue;
      }

      candidates.push({
        origin,
        assessment,
        supportingColumnCount: supportHeights.length,
        supportY,
        supportRatio: Number(supportRatio.toFixed(3))
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) =>
    (right.supportRatio ?? 0) - (left.supportRatio ?? 0) ||
    Math.abs((right.supportY ?? 0) - space.player.position.y) - Math.abs((left.supportY ?? 0) - space.player.position.y) ||
    scorePlacement(left.origin, space.player.position) - scorePlacement(right.origin, space.player.position) ||
    left.origin.x - right.origin.x ||
    left.origin.z - right.origin.z
  )[0] ?? null;
}

export function planStructureBuild(
  space: LocalSpaceSnapshot,
  blueprintId: string,
  placementMode: BlueprintPlacementMode,
  options: FloatingPlacementOptions & GroundedPlacementOptions = {}
): BuildPlan | Error {
  const blueprint = getBlueprint(blueprintId);
  if (blueprint === null) {
    return new Error(`Unknown blueprint: ${blueprintId}`);
  }

  return planBlueprintBuild(space, blueprint, placementMode, options);
}

export function planBlueprintBuild(
  space: LocalSpaceSnapshot,
  blueprint: StructureBlueprint,
  placementMode: BlueprintPlacementMode,
  options: FloatingPlacementOptions & GroundedPlacementOptions = {}
): BuildPlan | Error {
  const blueprintId = blueprint.id;

  const placement = placementMode === "grounded"
    ? findGroundedPlacement(space, blueprint, options)
    : findFloatingPlacement(space, blueprint, options);

  if (placement === null) {
    return new Error(`No valid ${placementMode} placement found for blueprint ${blueprintId}.`);
  }

  return {
    blueprintId,
    placementMode,
    origin: placement.origin,
    bounds: placement.assessment.bounds,
    assessment: placement.assessment,
    stepCount: buildExecutionPlan(blueprint, placement.origin).length,
    supportingColumnCount: placement.supportingColumnCount,
    supportY: placement.supportY,
    supportRatio: placement.supportRatio
  };
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
