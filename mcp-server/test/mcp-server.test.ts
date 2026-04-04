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

  assert.deepEqual(toolNames, ["get_player_state", "teleport_player"]);

  const result = await client.callTool({
    name: "get_player_state",
    arguments: {}
  });

  assert.equal(result.isError, false);
  assert.match(readFirstText(result.content), /GLAsserrrr/);

  await Promise.all([client.close(), server.close()]);
});

function readFirstText(content: unknown): string {
  assert.ok(Array.isArray(content));
  const first = content[0] as { text?: string } | undefined;
  return first?.text ?? "";
}
