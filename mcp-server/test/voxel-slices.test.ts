import test from "node:test";
import assert from "node:assert/strict";

import { buildVoxelSlices } from "../src/mcp/voxel-slices.js";

test("buildVoxelSlices reconstructs non-empty Y layers from occupied runs", () => {
  const slices = buildVoxelSlices(sampleVoxelSpace());

  assert.equal(slices.schemaVersion, 1);
  assert.equal(slices.summary.width, 3);
  assert.equal(slices.summary.depth, 3);
  assert.equal(slices.summary.nonEmptySliceCount, 4);
  assert.equal(slices.slices[0]?.y, 67);
  assert.ok(slices.slices[0]?.rows.some((row) => row.includes("W")));
  assert.ok(slices.slices.some((slice) => slice.rows.some((row) => row.includes("G"))));
  assert.ok(slices.slices.some((slice) => slice.rows.some((row) => row.includes("S"))));
});

function sampleVoxelSpace() {
  return {
    schemaVersion: 1,
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 0, y: 65, z: 0 },
      exactPosition: { x: 0.5, y: 65.0, z: 0.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: 0, y: 64, z: 0 },
      max: { x: 2, y: 67, z: 2 }
    },
    parameters: {
      radius: 1,
      down: 1,
      up: 2
    },
    summary: {
      sampledColumns: 9,
      sampledBlocks: 36,
      occupiedBlocks: 12,
      airBlocks: 24,
      fluidBlocks: 0,
      walkableSurfaceCount: 4,
      topBlockCounts: [
        { blockId: "minecraft:oak_planks", count: 3 }
      ]
    },
    columns: [
      column(0, 0, [{ startY: 64, endY: 64, blockId: "minecraft:stone" }, { startY: 65, endY: 65, blockId: "minecraft:oak_planks" }]),
      column(1, 0, [{ startY: 64, endY: 64, blockId: "minecraft:stone" }, { startY: 65, endY: 65, blockId: "minecraft:glass_pane" }]),
      column(2, 0, [{ startY: 64, endY: 64, blockId: "minecraft:stone" }]),
      column(0, 1, [{ startY: 64, endY: 64, blockId: "minecraft:stone" }, { startY: 65, endY: 67, blockId: "minecraft:oak_planks" }]),
      column(1, 1, [{ startY: 64, endY: 64, blockId: "minecraft:stone" }, { startY: 65, endY: 65, blockId: "minecraft:crafting_table" }]),
      column(2, 1, [{ startY: 64, endY: 64, blockId: "minecraft:stone" }]),
      column(0, 2, [{ startY: 64, endY: 64, blockId: "minecraft:grass_block" }]),
      column(1, 2, [{ startY: 64, endY: 64, blockId: "minecraft:grass_block" }]),
      column(2, 2, [{ startY: 64, endY: 64, blockId: "minecraft:grass_block" }])
    ],
    walkableSurfaces: [],
    pointsOfInterest: []
  };
}

function column(x: number, z: number, occupiedRuns: Array<{ startY: number; endY: number; blockId: string }>) {
  const highest = occupiedRuns.length > 0 ? occupiedRuns[occupiedRuns.length - 1]?.endY ?? null : null;
  const topBlockId = occupiedRuns.length > 0 ? occupiedRuns[occupiedRuns.length - 1]?.blockId ?? null : null;
  return {
    x,
    z,
    highestOccupiedY: highest,
    topBlockId,
    walkableY: highest,
    headroom: 4,
    occupiedRuns
  };
}
