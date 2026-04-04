import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { MinecraftClawBridgeClient } from "../src/bridge/client.js";

test("MinecraftClawBridgeClient.getPlayerState reads player position from the mod bridge", async () => {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/player") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          status: "ok",
          player: {
            name: "GLAsserrrr",
            dimension: "minecraft:overworld",
            position: { x: 26, y: 269, z: 13 },
            exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
            yaw: -94.5,
            pitch: -4.5
          }
        })
      );
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const client = new MinecraftClawBridgeClient({
    host: "127.0.0.1",
    port: (address as AddressInfo).port,
    timeoutMs: 5_000
  });

  const player = await client.getPlayerState();

  assert.deepEqual(player, {
    name: "GLAsserrrr",
    dimension: "minecraft:overworld",
    position: { x: 26, y: 269, z: 13 },
    exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
    yaw: -94.5,
    pitch: -4.5
  });

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("MinecraftClawBridgeClient.teleportPlayer sends absolute teleport coordinates to the mod bridge", async () => {
  let receivedBody = "";
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/player/teleport") {
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        receivedBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            status: "ok",
            player: {
              name: "GLAsserrrr",
              dimension: "minecraft:overworld",
              position: { x: 40, y: 270, z: -8 },
              exactPosition: { x: 40, y: 270, z: -8 },
              yaw: 0,
              pitch: 0
            }
          })
        );
      });
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const client = new MinecraftClawBridgeClient({
    host: "127.0.0.1",
    port: (address as AddressInfo).port,
    timeoutMs: 5_000
  });

  const player = await client.teleportPlayer({ x: 40, y: 270, z: -8 });

  assert.deepEqual(JSON.parse(receivedBody), {
    x: 40,
    y: 270,
    z: -8
  });
  assert.equal(player.position.x, 40);
  assert.equal(player.position.y, 270);
  assert.equal(player.position.z, -8);

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("MinecraftClawBridgeClient.scanLocalSpace requests a compressed local 3D space model", async () => {
  let receivedBody = "";
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/space/local") {
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        receivedBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            status: "ok",
            space: sampleLocalSpace()
          })
        );
      });
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const client = new MinecraftClawBridgeClient({
    host: "127.0.0.1",
    port: (address as AddressInfo).port,
    timeoutMs: 5_000
  });

  const space = await client.scanLocalSpace({ radius: 4, down: 4, up: 6 });

  assert.deepEqual(JSON.parse(receivedBody), {
    radius: 4,
    down: 4,
    up: 6
  });
  assert.equal(space.summary.sampledColumns, 81);
  assert.equal(space.columns[0]?.x, 26);
  assert.equal(space.walkableSurfaces[0]?.y, 269);

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("MinecraftClawBridgeClient.placeBlock sends typed placement requests to the mod bridge", async () => {
  let receivedBody = "";
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/world/block/place") {
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        receivedBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            status: "ok",
            result: sampleActionResult("place_block", 1, "minecraft:gold_block")
          })
        );
      });
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const client = new MinecraftClawBridgeClient({
    host: "127.0.0.1",
    port: (address as AddressInfo).port,
    timeoutMs: 5_000
  });

  const result = await client.placeBlock({ x: 40, y: 270, z: -8, blockId: "minecraft:gold_block" });

  assert.deepEqual(JSON.parse(receivedBody), {
    x: 40,
    y: 270,
    z: -8,
    blockId: "minecraft:gold_block"
  });
  assert.equal(result.action, "place_block");
  assert.equal(result.changedBlocks, 1);
  assert.equal(result.blockId, "minecraft:gold_block");

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("MinecraftClawBridgeClient.runCommand sends raw commands to the mod bridge", async () => {
  let receivedBody = "";
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/world/command") {
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        receivedBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            status: "ok",
            result: {
              action: "run_command",
              success: true,
              dimension: "minecraft:overworld",
              changedBlocks: 0,
              command: "time set day",
              commandResult: 1,
              message: "Executed command: time set day"
            }
          })
        );
      });
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const client = new MinecraftClawBridgeClient({
    host: "127.0.0.1",
    port: (address as AddressInfo).port,
    timeoutMs: 5_000
  });

  const result = await client.runCommand({ command: "time set day" });

  assert.deepEqual(JSON.parse(receivedBody), {
    command: "time set day"
  });
  assert.equal(result.action, "run_command");
  assert.equal(result.command, "time set day");
  assert.equal(result.commandResult, 1);

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("MinecraftClawBridgeClient.getInventory reads the current player inventory from the mod bridge", async () => {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/player/inventory") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          status: "ok",
          inventory: sampleInventory()
        })
      );
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const client = new MinecraftClawBridgeClient({
    host: "127.0.0.1",
    port: (address as AddressInfo).port,
    timeoutMs: 5_000
  });

  const inventory = await client.getInventory();

  assert.equal(inventory.playerName, "GLAsserrrr");
  assert.equal(inventory.selectedHotbarSlot, 2);
  assert.equal(inventory.slots[0]?.itemId, "minecraft:stone");

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

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
        { blockId: "minecraft:grass_block", count: 28 },
        { blockId: "minecraft:oak_planks", count: 8 }
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
      {
        x: 26,
        y: 269,
        z: 13,
        blockId: "minecraft:grass_block",
        headroom: 6
      }
    ],
    pointsOfInterest: [
      {
        category: "entity",
        kindId: "minecraft:villager",
        label: "Villager",
        position: { x: 24, y: 269, z: 11 }
      }
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
      max: { x: 40, y: 270, z: -8 }
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
