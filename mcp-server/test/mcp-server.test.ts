import test from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMinecraftClawMcpServer } from "../src/mcp/server.js";

test("createMinecraftClawMcpServer registers sensing, player, and admin world-action tools", async () => {
  const server = createMinecraftClawMcpServer({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async ({ x, y, z }) => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x, y, z },
      exactPosition: { x, y, z },
      yaw: -94.5,
      pitch: -4.5
    }),
    scanLocalSpace: async () => sampleLocalSpace(),
    placeBlock: async () => sampleActionResult("place_block", 1, "minecraft:gold_block"),
    fillBox: async () => sampleActionResult("fill_box", 8, "minecraft:glass"),
    runCommand: async () => ({
      action: "run_command",
      success: true,
      dimension: "minecraft:overworld",
      changedBlocks: 0,
      command: "time set day",
      commandResult: 1,
      message: "Executed command: time set day"
    })
  });

  const client = new Client({ name: "minecraftclaw-test-client", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport)
  ]);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();

  assert.deepEqual(toolNames, [
    "analyze_build_site",
    "analyze_local_space",
    "break_block",
    "build_from_blueprint",
    "build_structure",
    "clear_box",
    "fill_box",
    "get_inventory",
    "get_player_state",
    "give_item",
    "place_block",
    "plan_build",
    "preview_blueprint",
    "project_local_space",
    "run_command",
    "scan_local_space",
    "scan_voxel_slices",
    "set_time",
    "set_weather",
    "summon_entity",
    "teleport_player"
  ]);

  const result = await client.callTool({
    name: "get_player_state",
    arguments: {}
  });

  assert.equal(result.isError, false);
  assert.match(readFirstText(result.content), /GLAsserrrr/);

  const scan = await client.callTool({
    name: "scan_local_space",
    arguments: { radius: 4, down: 4, up: 6 }
  });

  assert.equal(scan.isError, false);
  assert.match(readFirstText(scan.content), /81 columns/);

  const analysis = await client.callTool({
    name: "analyze_local_space",
    arguments: { radius: 4, down: 4, up: 6 }
  });

  assert.equal(analysis.isError, false);
  assert.match(readFirstText(analysis.content), /scene/i);

  const projection = await client.callTool({
    name: "project_local_space",
    arguments: { radius: 4, down: 4, up: 6 }
  });

  assert.equal(projection.isError, false);
  assert.match(readFirstText(projection.content), /projection/i);

  const placement = await client.callTool({
    name: "place_block",
    arguments: { x: 40, y: 270, z: -8, blockId: "minecraft:gold_block" }
  });

  assert.equal(placement.isError, false);
  assert.match(readFirstText(placement.content), /gold_block/);

  const plan = await client.callTool({
    name: "plan_build",
    arguments: {
      blueprintId: "cozy_cabin_v1",
      placementMode: "floating",
      radius: 4,
      down: 4,
      up: 6
    }
  });

  assert.equal(plan.isError, false);
  assert.match(readFirstText(plan.content), /cozy_cabin_v1/);

  const inventory = await client.callTool({
    name: "get_inventory",
    arguments: {}
  });

  assert.equal(inventory.isError, false);
  assert.match(readFirstText(inventory.content), /filled slots/);

  await Promise.all([client.close(), server.close()]);
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
      max: { x: 30, y: 281, z: 17 }
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

function sampleActionResult(action: string, changedBlocks: number, blockId: string) {
  return {
    action,
    success: true,
    dimension: "minecraft:overworld",
    changedBlocks,
    blockId,
    primaryPosition: { x: 40, y: 270, z: -8 },
    bounds: {
      min: { x: 40, y: 270, z: -8 },
      max: { x: 41, y: 271, z: -7 }
    },
    message: `Applied ${blockId}`
  };
}

function sampleInventory() {
  return {
    playerName: "GLAsserrrr",
    selectedHotbarSlot: 2,
    slots: [
      { slot: 0, itemId: "minecraft:stone", count: 64, displayName: "Stone" },
      { slot: 1, itemId: "minecraft:glass", count: 32, displayName: "Glass" }
    ]
  };
}
