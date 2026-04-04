import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ToolDependencies } from "./tools.js";
import { createToolHandlers } from "./tools.js";

export function createMinecraftClawMcpServer(dependencies: ToolDependencies): McpServer {
  const server = new McpServer({
    name: "minecraftclaw-mcp-server",
    version: "0.1.0"
  });
  const handlers = createToolHandlers(dependencies);

  server.registerTool(
    "get_player_state",
    {
      title: "Get Player State",
      description: "Read the current Minecraft player state from the local MinecraftClaw mod bridge.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => handlers.getPlayerState()
  );

  server.registerTool(
    "teleport_player",
    {
      title: "Teleport Player",
      description: "Teleport the current player to absolute coordinates in the current dimension.",
      inputSchema: {
        x: z.number().finite().describe("Absolute world X coordinate."),
        y: z.number().finite().describe("Absolute world Y coordinate."),
        z: z.number().finite().describe("Absolute world Z coordinate.")
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ x, y, z }) => handlers.teleportPlayer({ x, y, z })
  );

  return server;
}
