import test from "node:test";
import assert from "node:assert/strict";

import { buildSpaceModel } from "../src/mcp/space-model.js";

test("buildSpaceModel recognizes a settlement-like cultivated platform as blocked for building", () => {
  const model = buildSpaceModel(sampleSettlementSpace());

  assert.equal(model.schemaVersion, 1);
  assert.equal(model.summary.dominantSceneKind, "settlement");
  assert.equal(model.buildability.status, "blocked");
  assert.match(model.buildability.reasons.join(","), /settlement_poi_density/);
  assert.ok(model.regions.some((region) => region.kind === "settlement_core"));
  assert.ok(model.regions.some((region) => region.kind === "cultivated_patch"));
  assert.ok(model.structures.some((structure) => structure.kind === "bed_cluster"));
  assert.ok(model.structures.some((structure) => structure.kind === "villager_presence"));
  assert.ok(model.structures.some((structure) => structure.kind === "workstation"));
});

test("buildSpaceModel marks a flat natural clearing as suitable and returns build anchors", () => {
  const model = buildSpaceModel(sampleClearingSpace());

  assert.equal(model.summary.dominantSceneKind, "natural");
  assert.equal(model.buildability.status, "suitable");
  assert.equal(model.buildability.reasons.length, 0);
  assert.ok(model.buildability.candidateAnchors.length >= 3);
  assert.deepEqual(model.buildability.candidateAnchors[0], {
    x: 0,
    y: 64,
    z: 0,
    blockId: "minecraft:grass_block",
    headroom: 5,
    flatnessScore: 1
  });
  assert.ok(model.regions.some((region) => region.kind === "natural_ground"));
});

function sampleSettlementSpace() {
  return {
    schemaVersion: 1,
    player: {
      name: "glasserrrr",
      dimension: "minecraft:overworld",
      position: { x: 27, y: 279, z: 22 },
      exactPosition: { x: 27.5, y: 279, z: 22.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: 24, y: 275, z: 19 },
      max: { x: 30, y: 285, z: 25 }
    },
    parameters: {
      radius: 3,
      down: 4,
      up: 6
    },
    summary: {
      sampledColumns: 49,
      sampledBlocks: 539,
      occupiedBlocks: 220,
      airBlocks: 319,
      fluidBlocks: 1,
      walkableSurfaceCount: 12,
      topBlockCounts: [
        { blockId: "minecraft:spruce_planks", count: 10 },
        { blockId: "minecraft:farmland", count: 8 },
        { blockId: "minecraft:spruce_leaves", count: 6 },
        { blockId: "minecraft:acacia_stairs", count: 5 }
      ]
    },
    columns: [
      column(26, 21, 279, "minecraft:spruce_planks"),
      column(26, 22, 279, "minecraft:spruce_planks"),
      column(27, 21, 279, "minecraft:spruce_planks"),
      column(27, 22, 279, "minecraft:spruce_planks"),
      column(29, 24, 279, "minecraft:farmland"),
      column(29, 25, 279, "minecraft:farmland"),
      column(30, 24, 279, "minecraft:farmland"),
      column(30, 25, 279, "minecraft:farmland"),
      column(25, 24, 280, "minecraft:spruce_leaves"),
      column(26, 24, 280, "minecraft:spruce_leaves"),
      column(25, 23, 279, "minecraft:acacia_stairs"),
      column(24, 21, null, null)
    ],
    walkableSurfaces: [
      surface(26, 279, 21, "minecraft:spruce_planks", 4),
      surface(26, 279, 22, "minecraft:spruce_planks", 4),
      surface(27, 279, 21, "minecraft:spruce_planks", 4),
      surface(27, 279, 22, "minecraft:spruce_planks", 4),
      surface(29, 279, 24, "minecraft:farmland", 3),
      surface(29, 279, 25, "minecraft:farmland", 3),
      surface(30, 279, 24, "minecraft:farmland", 3),
      surface(30, 279, 25, "minecraft:farmland", 3),
      surface(25, 280, 24, "minecraft:spruce_leaves", 2),
      surface(26, 280, 24, "minecraft:spruce_leaves", 2),
      surface(25, 279, 23, "minecraft:acacia_stairs", 4),
      surface(30, 279, 23, "minecraft:composter", 4)
    ],
    pointsOfInterest: [
      poi("entity", "minecraft:villager", "南居白夜", 26, 279, 21),
      poi("entity", "minecraft:villager", "24Zi", 27, 279, 22),
      poi("block_entity", "minecraft:orange_bed", "minecraft:orange_bed", 26, 279, 20),
      poi("block_entity", "minecraft:orange_bed", "minecraft:orange_bed", 27, 279, 20),
      poi("block_entity", "minecraft:lectern", "minecraft:lectern", 25, 279, 21),
      poi("block_entity", "minecraft:lootr_chest", "minecraft:lootr_chest", 28, 279, 23),
      poi("block_entity", "minecraft:composter", "minecraft:composter", 30, 279, 23)
    ]
  };
}

function sampleClearingSpace() {
  return {
    schemaVersion: 1,
    player: {
      name: "glasserrrr",
      dimension: "minecraft:overworld",
      position: { x: 0, y: 64, z: 0 },
      exactPosition: { x: 0.5, y: 64, z: 0.5 },
      yaw: 0,
      pitch: 0
    },
    bounds: {
      min: { x: -2, y: 60, z: -2 },
      max: { x: 2, y: 70, z: 2 }
    },
    parameters: {
      radius: 2,
      down: 4,
      up: 6
    },
    summary: {
      sampledColumns: 25,
      sampledBlocks: 275,
      occupiedBlocks: 80,
      airBlocks: 195,
      fluidBlocks: 0,
      walkableSurfaceCount: 9,
      topBlockCounts: [
        { blockId: "minecraft:grass_block", count: 9 },
        { blockId: "minecraft:dirt", count: 4 }
      ]
    },
    columns: [
      column(-1, -1, 64, "minecraft:grass_block"),
      column(-1, 0, 64, "minecraft:grass_block"),
      column(-1, 1, 64, "minecraft:grass_block"),
      column(0, -1, 64, "minecraft:grass_block"),
      column(0, 0, 64, "minecraft:grass_block"),
      column(0, 1, 64, "minecraft:grass_block"),
      column(1, -1, 64, "minecraft:grass_block"),
      column(1, 0, 64, "minecraft:grass_block"),
      column(1, 1, 64, "minecraft:grass_block")
    ],
    walkableSurfaces: [
      surface(-1, 64, -1, "minecraft:grass_block", 5),
      surface(-1, 64, 0, "minecraft:grass_block", 5),
      surface(-1, 64, 1, "minecraft:grass_block", 5),
      surface(0, 64, -1, "minecraft:grass_block", 5),
      surface(0, 64, 0, "minecraft:grass_block", 5),
      surface(0, 64, 1, "minecraft:grass_block", 5),
      surface(1, 64, -1, "minecraft:grass_block", 5),
      surface(1, 64, 0, "minecraft:grass_block", 5),
      surface(1, 64, 1, "minecraft:grass_block", 5)
    ],
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
    headroom: walkableY === null ? null : 4,
    occupiedRuns: walkableY === null || topBlockId === null
      ? []
      : [{ startY: walkableY, endY: walkableY, blockId: topBlockId }]
  };
}

function surface(x: number, y: number, z: number, blockId: string, headroom: number) {
  return { x, y, z, blockId, headroom };
}

function poi(category: string, kindId: string, label: string, x: number, y: number, z: number) {
  return {
    category,
    kindId,
    label,
    position: { x, y, z }
  };
}
