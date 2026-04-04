import test from "node:test";
import assert from "node:assert/strict";

import { projectLocalSpace } from "../src/mcp/space-projection.js";

test("projectLocalSpace builds top and elevation projections for a compact house volume", () => {
  const projection = projectLocalSpace(sampleProjectionSpace(), {
    min: { x: 0, y: 10, z: 0 },
    max: { x: 4, y: 14, z: 4 }
  });

  assert.deepEqual(projection.occupiedBounds, {
    min: { x: 0, y: 10, z: 0 },
    max: { x: 4, y: 14, z: 4 }
  });
  assert.equal(projection.topView.width, 5);
  assert.equal(projection.topView.height, 5);
  assert.equal(projection.northElevation.width, 5);
  assert.equal(projection.northElevation.height, 5);
  assert.equal(projection.westElevation.width, 5);
  assert.equal(projection.summary.occupiedColumns, 25);
  assert.match(projection.topView.rows.join("\n"), /W/);
  assert.match(projection.northElevation.rows.join("\n"), /S/);
});

function sampleProjectionSpace() {
  const columns = [];

  for (let x = 0; x <= 4; x += 1) {
    for (let z = 0; z <= 4; z += 1) {
      const occupiedRuns = [];

      occupiedRuns.push({ startY: 10, endY: 10, blockId: "minecraft:stone_bricks" });

      const isWall = x === 0 || x === 4 || z === 0 || z === 4;
      if (isWall) {
        occupiedRuns.push({ startY: 11, endY: 12, blockId: "minecraft:spruce_planks" });
      }

      occupiedRuns.push({ startY: 14, endY: 14, blockId: "minecraft:dark_oak_planks" });

      columns.push({
        x,
        z,
        highestOccupiedY: 14,
        topBlockId: "minecraft:dark_oak_planks",
        walkableY: 10,
        headroom: 4,
        occupiedRuns
      });
    }
  }

  return {
    schemaVersion: 1,
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 2, y: 11, z: 2 },
      exactPosition: { x: 2.5, y: 11.0, z: 2.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: 0, y: 10, z: 0 },
      max: { x: 4, y: 14, z: 4 }
    },
    parameters: {
      radius: 2,
      down: 1,
      up: 3
    },
    summary: {
      sampledColumns: 25,
      sampledBlocks: 125,
      occupiedBlocks: 66,
      airBlocks: 59,
      fluidBlocks: 0,
      walkableSurfaceCount: 25,
      topBlockCounts: [{ blockId: "minecraft:dark_oak_planks", count: 25 }]
    },
    columns,
    walkableSurfaces: [],
    pointsOfInterest: []
  };
}
