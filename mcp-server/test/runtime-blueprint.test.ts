import test from "node:test";
import assert from "node:assert/strict";

import { buildExecutionPlan, planBlueprintBuild } from "../src/builder/planner.js";
import { normalizeRuntimeBlueprint } from "../src/builder/runtime-blueprint.js";

test("normalizeRuntimeBlueprint accepts a valid runtime blueprint object", () => {
  const result = normalizeRuntimeBlueprint(sampleRuntimeBlueprint());

  assert.ok(!(result instanceof Error));
  assert.equal(result.id, "runtime_cliff_test");
  assert.equal(result.steps.length, 8);
});

test("normalizeRuntimeBlueprint rejects fill steps that exceed declared bounds", () => {
  const result = normalizeRuntimeBlueprint({
    ...sampleRuntimeBlueprint(),
    steps: [
      {
        kind: "fill",
        from: { x: 0, y: 0, z: 0 },
        to: { x: 5, y: 0, z: 5 },
        blockId: "minecraft:stone"
      }
    ]
  });

  assert.ok(result instanceof Error);
  assert.match(result.message, /bounds/i);
});

test("normalizeRuntimeBlueprint rejects unsafe command templates", () => {
  const result = normalizeRuntimeBlueprint({
    ...sampleRuntimeBlueprint(),
    steps: [
      {
        kind: "command",
        commandTemplate: "fill {x} {y} {z} {x} {y} {z} minecraft:stone",
        offset: { x: 1, y: 1, z: 1 }
      }
    ]
  });

  assert.ok(result instanceof Error);
  assert.match(result.message, /unsafe command/i);
});

test("planBlueprintBuild plans a grounded build from a runtime blueprint without library registration", () => {
  const blueprint = normalizeRuntimeBlueprint(sampleRuntimeBlueprint());
  assert.ok(!(blueprint instanceof Error));

  const plan = planBlueprintBuild(sampleGroundedSpace(), blueprint, "grounded", {
    minSupportRatio: 0.75,
    maxSurfaceVariance: 1
  });

  assert.ok(!(plan instanceof Error));
  assert.equal(plan.blueprintId, "runtime_cliff_test");
  assert.equal(plan.placementMode, "grounded");
  assert.equal(plan.assessment.isClear, true);
  assert.ok(plan.stepCount >= 8);

  const executionPlan = buildExecutionPlan(blueprint, plan.origin);
  assert.equal(executionPlan.length, 8);
});

function sampleRuntimeBlueprint() {
  return {
    id: "runtime_cliff_test",
    width: 5,
    depth: 6,
    height: 5,
    steps: [
      {
        kind: "fill",
        from: { x: 0, y: 0, z: 0 },
        to: { x: 4, y: 0, z: 5 },
        blockId: "minecraft:stone_bricks"
      },
      {
        kind: "fill",
        from: { x: 1, y: 1, z: 1 },
        to: { x: 3, y: 3, z: 4 },
        blockId: "minecraft:oak_planks"
      },
      {
        kind: "fill",
        from: { x: 2, y: 2, z: 2 },
        to: { x: 2, y: 3, z: 3 },
        blockId: "minecraft:air"
      },
      { kind: "block", at: { x: 1, y: 2, z: 1 }, blockId: "minecraft:glass_pane" },
      { kind: "block", at: { x: 3, y: 2, z: 1 }, blockId: "minecraft:glass_pane" },
      {
        kind: "command",
        commandTemplate: "setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false]",
        offset: { x: 2, y: 1, z: 1 }
      },
      {
        kind: "command",
        commandTemplate: "setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false]",
        offset: { x: 2, y: 2, z: 1 }
      },
      {
        kind: "command",
        commandTemplate: "setblock {x} {y} {z} minecraft:lantern[hanging=true]",
        offset: { x: 2, y: 4, z: 2 }
      }
    ]
  };
}

function sampleGroundedSpace() {
  const columns = [];
  const walkableSurfaces = [];

  for (let x = 0; x <= 8; x += 1) {
    for (let z = 0; z <= 8; z += 1) {
      const y = x >= 1 && x <= 6 && z >= 2 && z <= 7 ? 70 : 69;
      const blockId = y === 70 ? "minecraft:stone" : "minecraft:grass_block";
      columns.push({
        x,
        z,
        highestOccupiedY: y,
        topBlockId: blockId,
        walkableY: y,
        headroom: 10,
        occupiedRuns: [{ startY: y, endY: y, blockId }]
      });
      walkableSurfaces.push({ x, y, z, blockId, headroom: 10 });
    }
  }

  return {
    schemaVersion: 1,
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 4, y: 72, z: 4 },
      exactPosition: { x: 4.5, y: 72, z: 4.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: 0, y: 66, z: 0 },
      max: { x: 8, y: 84, z: 8 }
    },
    parameters: {
      radius: 4,
      down: 6,
      up: 12
    },
    summary: {
      sampledColumns: columns.length,
      sampledBlocks: columns.length * 19,
      occupiedBlocks: columns.length,
      airBlocks: columns.length * 18,
      fluidBlocks: 0,
      walkableSurfaceCount: walkableSurfaces.length,
      topBlockCounts: [
        { blockId: "minecraft:stone", count: 36 },
        { blockId: "minecraft:grass_block", count: columns.length - 36 }
      ]
    },
    columns,
    walkableSurfaces,
    pointsOfInterest: []
  };
}
