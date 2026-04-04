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
    })
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
    }
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

function readFirstText(content: unknown): string {
  assert.ok(Array.isArray(content));
  const first = content[0] as { text?: string } | undefined;
  return first?.text ?? "";
}
