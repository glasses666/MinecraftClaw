import test from "node:test";
import assert from "node:assert/strict";

import {
  COZY_CABIN_V1,
  RIDGE_LANTERN_LODGE_V1,
  RIDGE_LANTERN_LODGE_V2,
  SKY_GAZEBO_V1,
  assessBlueprintPlacement,
  buildExecutionPlan,
  findGroundedPlacement,
  findFloatingPlacement
} from "../src/builder/planner.js";

test("assessBlueprintPlacement reports overlap when the build volume intersects occupied runs", () => {
  const assessment = assessBlueprintPlacement(sampleSkyPlatformSpace(), COZY_CABIN_V1, {
    x: 2,
    y: 69,
    z: 0
  });

  assert.equal(assessment.isClear, false);
  assert.ok(assessment.overlappingBlockCount > 0);
  assert.match(assessment.reasons.join(","), /occupied_volume_overlap/);
});

test("findFloatingPlacement picks a clear non-overlapping origin inside the scanned bounds", () => {
  const placement = findFloatingPlacement(sampleSkyPlatformSpace(), COZY_CABIN_V1, {
    clearanceAboveSurface: 2
  });

  assert.notEqual(placement, null);
  assert.equal(placement?.origin.y, 72);
  assert.ok(placement!.origin.x <= -1 || placement!.origin.x >= 5);
  assert.equal(placement?.assessment.isClear, true);
  assert.equal(placement?.assessment.overlappingBlockCount, 0);
  assert.equal(placement?.supportingColumnCount, 0);
});

test("buildExecutionPlan emits absolute fill, block, and command actions for the blueprint", () => {
  const placement = findFloatingPlacement(sampleSkyPlatformSpace(), COZY_CABIN_V1, {
    clearanceAboveSurface: 2
  });

  assert.notEqual(placement, null);
  const plan = buildExecutionPlan(COZY_CABIN_V1, placement!.origin);

  assert.ok(plan.length >= 12);
  assert.equal(plan[0]?.kind, "fill");
  assert.equal(plan.some((step) => step.kind === "command"), true);
  assert.equal(plan.some((step) => step.kind === "block"), true);
});

test("buildExecutionPlan emits a lantern-heavy gazebo plan with open sides", () => {
  const placement = findFloatingPlacement(sampleSkyPlatformSpace(), SKY_GAZEBO_V1, {
    clearanceAboveSurface: 2
  });

  assert.notEqual(placement, null);
  const plan = buildExecutionPlan(SKY_GAZEBO_V1, placement!.origin);

  assert.ok(plan.length >= 10);
  assert.equal(plan.some((step) => step.kind === "command"), true);
  assert.equal(plan.some((step) => step.kind === "fill"), true);
});

test("findGroundedPlacement picks a supported flat shelf for the ridge lodge", () => {
  const placement = findGroundedPlacement(sampleRidgeShelfSpace(), RIDGE_LANTERN_LODGE_V1);

  assert.notEqual(placement, null);
  assert.equal(placement?.origin.y, 73);
  assert.ok((placement?.supportingColumnCount ?? 0) >= 54);
  assert.equal(placement?.assessment.isClear, true);
});

test("ridge lodge v2 keeps grounded placement while adding a richer execution plan", () => {
  const placement = findGroundedPlacement(sampleRidgeShelfSpace(), RIDGE_LANTERN_LODGE_V2, {
    minSupportRatio: 0.85,
    maxSurfaceVariance: 1
  });

  assert.notEqual(placement, null);
  assert.equal(placement?.assessment.isClear, true);

  const plan = buildExecutionPlan(RIDGE_LANTERN_LODGE_V2, placement!.origin);
  assert.ok(plan.length > 35);
  assert.ok(plan.filter((step) => step.kind === "command").length >= 10);
  assert.ok(plan.filter((step) => step.kind === "fill").length >= 12);
});

function sampleSkyPlatformSpace() {
  const columns = [];
  const walkableSurfaces = [];

  for (let x = -8; x <= 8; x += 1) {
    for (let z = -6; z <= 10; z += 1) {
      if (x >= 0 && x <= 4 && z >= 0 && z <= 4) {
        columns.push(column(x, z, 69, "minecraft:spruce_planks"));
        walkableSurfaces.push(surface(x, 69, z, "minecraft:spruce_planks", 10));
        continue;
      }

      columns.push(column(x, z, null, null));
    }
  }

  return {
    schemaVersion: 1,
    player: {
      name: "glasserrrr",
      dimension: "minecraft:overworld",
      position: { x: 1, y: 69, z: 2 },
      exactPosition: { x: 1.5, y: 69, z: 2.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: -8, y: 66, z: -6 },
      max: { x: 8, y: 80, z: 10 }
    },
    parameters: {
      radius: 8,
      down: 3,
      up: 11
    },
    summary: {
      sampledColumns: columns.length,
      sampledBlocks: columns.length * 15,
      occupiedBlocks: 25,
      airBlocks: columns.length * 15 - 25,
      fluidBlocks: 0,
      walkableSurfaceCount: walkableSurfaces.length,
      topBlockCounts: [{ blockId: "minecraft:spruce_planks", count: 25 }]
    },
    columns,
    walkableSurfaces,
    pointsOfInterest: []
  };
}

function sampleRidgeShelfSpace() {
  const columns = [];
  const walkableSurfaces = [];

  for (let x = -6; x <= 10; x += 1) {
    for (let z = -6; z <= 12; z += 1) {
      const onShelf = x >= -1 && x <= 8 && z >= 0 && z <= 8;
      const y = onShelf ? 72 : 70;
      const blockId = onShelf ? "minecraft:stone" : "minecraft:grass_block";

      columns.push(column(x, z, y, blockId));
      walkableSurfaces.push(surface(x, y, z, blockId, 10));
    }
  }

  return {
    schemaVersion: 1,
    player: {
      name: "glasserrrr",
      dimension: "minecraft:overworld",
      position: { x: 2, y: 72, z: 4 },
      exactPosition: { x: 2.5, y: 72, z: 4.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: -6, y: 68, z: -6 },
      max: { x: 10, y: 86, z: 12 }
    },
    parameters: {
      radius: 8,
      down: 4,
      up: 14
    },
    summary: {
      sampledColumns: columns.length,
      sampledBlocks: columns.length * 19,
      occupiedBlocks: columns.length,
      airBlocks: columns.length * 18,
      fluidBlocks: 0,
      walkableSurfaceCount: walkableSurfaces.length,
      topBlockCounts: [
        { blockId: "minecraft:stone", count: 81 },
        { blockId: "minecraft:grass_block", count: columns.length - 81 }
      ]
    },
    columns,
    walkableSurfaces,
    pointsOfInterest: []
  };
}

function column(x: number, z: number, walkableY: number | null, topBlockId: string | null) {
  return {
    x,
    z,
    highestOccupiedY: walkableY,
    topBlockId,
    walkableY,
    headroom: walkableY === null ? null : 10,
    occupiedRuns: walkableY === null || topBlockId === null
      ? []
      : [{ startY: walkableY, endY: walkableY, blockId: topBlockId }]
  };
}

function surface(x: number, y: number, z: number, blockId: string, headroom: number) {
  return { x, y, z, blockId, headroom };
}
