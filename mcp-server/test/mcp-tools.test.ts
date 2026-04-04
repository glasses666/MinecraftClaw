import test from "node:test";
import assert from "node:assert/strict";

import { createToolHandlers } from "../src/mcp/tools.js";

test("createToolHandlers exposes get_player_state as MCP-friendly structured content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    teleportPlayer: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 40, y: 270, z: -8 },
      exactPosition: { x: 40, y: 270, z: -8 },
      yaw: 0,
      pitch: 0
    }),
    scanLocalSpace: async () => sampleLocalSpace()
  });

  const result = await handlers.getPlayerState();

  assert.deepEqual(result.structuredContent, {
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }
  });
  assert.match(readFirstText(result.content), /GLAsserrrr/);
  assert.match(readFirstText(result.content), /26,269,13/);
});

test("createToolHandlers validates teleport input before calling the bridge", async () => {
  let called = false;
  const handlers = createToolHandlers({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    teleportPlayer: async () => {
      called = true;
      throw new Error("should not be called");
    },
    scanLocalSpace: async () => sampleLocalSpace()
  });

  const result = await handlers.teleportPlayer({
    x: Number.NaN,
    y: 270,
    z: -8
  });

  assert.equal(called, false);
  assert.equal(result.isError, true);
  assert.match(readFirstText(result.content), /finite numbers/);
});

test("createToolHandlers exposes scan_local_space as structured local space content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    teleportPlayer: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 40, y: 270, z: -8 },
      exactPosition: { x: 40, y: 270, z: -8 },
      yaw: 0,
      pitch: 0
    }),
    scanLocalSpace: async () => sampleLocalSpace()
  });

  const result = await handlers.scanLocalSpace({ radius: 4, down: 4, up: 6 });

  assert.equal(result.isError, false);
  assert.deepEqual(result.structuredContent, {
    space: sampleLocalSpace()
  });
  assert.match(readFirstText(result.content), /81 columns/);
  assert.match(readFirstText(result.content), /19 walkable surfaces/);
});

function readFirstText(content: unknown): string {
  assert.ok(Array.isArray(content));
  const first = content[0] as { text?: string } | undefined;
  return first?.text ?? "";
}

function sampleLocalSpace() {
  return {
    schemaVersion: 1,
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    },
    bounds: {
      min: { x: 22, y: 265, z: 9 },
      max: { x: 30, y: 275, z: 17 }
    },
    parameters: {
      radius: 4,
      down: 4,
      up: 6
    },
    summary: {
      sampledColumns: 81,
      sampledBlocks: 891,
      occupiedBlocks: 222,
      airBlocks: 662,
      fluidBlocks: 7,
      walkableSurfaceCount: 19,
      topBlockCounts: [
        { blockId: "minecraft:grass_block", count: 28 }
      ]
    },
    columns: [
      {
        x: 26,
        z: 13,
        highestOccupiedY: 269,
        topBlockId: "minecraft:grass_block",
        walkableY: 269,
        headroom: 6,
        occupiedRuns: [
          { startY: 265, endY: 268, blockId: "minecraft:stone" },
          { startY: 269, endY: 269, blockId: "minecraft:grass_block" }
        ]
      }
    ],
    walkableSurfaces: [
      { x: 26, y: 269, z: 13, blockId: "minecraft:grass_block", headroom: 6 }
    ],
    pointsOfInterest: [
      { category: "entity", kindId: "minecraft:villager", label: "Villager", position: { x: 24, y: 269, z: 11 } }
    ]
  };
}
