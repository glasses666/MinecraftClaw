import test from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMinecraftClawMcpServer } from "../src/mcp/server.js";

test("createMinecraftClawMcpServer registers player-state and teleport tools", async () => {
  const server = createMinecraftClawMcpServer({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    teleportPlayer: async ({ x, y, z }) => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x, y, z },
      exactPosition: { x, y, z },
      yaw: -94.5,
      pitch: -4.5
    }),
    scanLocalSpace: async () => sampleLocalSpace()
  });

  const client = new Client({ name: "minecraftclaw-test-client", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport)
  ]);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();

  assert.deepEqual(toolNames, ["get_player_state", "scan_local_space", "teleport_player"]);

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
