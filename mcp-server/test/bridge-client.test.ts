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
