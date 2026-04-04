import test from "node:test";
import assert from "node:assert/strict";

import {
  COZY_CABIN_V1,
  assessBlueprintPlacement,
  buildExecutionPlan,
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
