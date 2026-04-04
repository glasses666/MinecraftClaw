import test from "node:test";
import assert from "node:assert/strict";

import { buildSiteBrief } from "../src/mcp/site-brief.js";

test("buildSiteBrief abstracts a rocky riverside slope into symbols and environmental recommendations", () => {
  const brief = buildSiteBrief(sampleRiversideSlopeSpace());

  assert.equal(brief.schemaVersion, 1);
  assert.equal(brief.summary.siteKind, "rocky_riverside_slope");
  assert.equal(brief.summary.hasNearbyWater, true);
  assert.equal(brief.summary.slopeAxis, "north_south");
  assert.ok(brief.symbolMaps.surface.rows.some((row) => row.includes("~")));
  assert.ok(brief.symbolMaps.surface.rows.some((row) => row.includes("R")));
  assert.ok(brief.symbolMaps.surface.rows.some((row) => row.includes("G")));
  assert.ok(brief.recommendations.foundationStyle.includes("terraced"));
  assert.ok(brief.recommendations.massingStrategy.includes("step"));
  assert.ok(brief.recommendations.notes.some((note) => /water/i.test(note)));
});

function sampleRiversideSlopeSpace() {
  const columns = [];
  const walkableSurfaces = [];

  for (let x = -3; x <= 3; x += 1) {
    for (let z = -3; z <= 3; z += 1) {
      const walkableY = 70 - Math.max(0, z);
      let blockId = "minecraft:stone";

      if (z <= -2) {
        blockId = "minecraft:water";
      } else if (z === -1 || z === 0) {
        blockId = x % 2 === 0 ? "minecraft:grass_block" : "minecraft:gravel";
      } else if (z >= 2 && x >= 1) {
        blockId = "minecraft:grass_block";
      }

      columns.push({
        x,
        z,
        highestOccupiedY: walkableY,
        topBlockId: blockId,
        walkableY,
        headroom: 8,
        occupiedRuns: [{ startY: walkableY, endY: walkableY, blockId }]
      });

      walkableSurfaces.push({ x, y: walkableY, z, blockId, headroom: 8 });
    }
  }

  return {
    schemaVersion: 1,
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 0, y: 69, z: 0 },
      exactPosition: { x: 0.5, y: 69.0, z: 0.5 },
      yaw: 180,
      pitch: 0
    },
    bounds: {
      min: { x: -3, y: 64, z: -3 },
      max: { x: 3, y: 78, z: 3 }
    },
    parameters: {
      radius: 3,
      down: 5,
      up: 9
    },
    summary: {
      sampledColumns: columns.length,
      sampledBlocks: columns.length * 15,
      occupiedBlocks: columns.length,
      airBlocks: columns.length * 14,
      fluidBlocks: 14,
      walkableSurfaceCount: walkableSurfaces.length,
      topBlockCounts: [
        { blockId: "minecraft:stone", count: 21 },
        { blockId: "minecraft:grass_block", count: 16 },
        { blockId: "minecraft:water", count: 14 }
      ]
    },
    columns,
    walkableSurfaces,
    pointsOfInterest: []
  };
}
