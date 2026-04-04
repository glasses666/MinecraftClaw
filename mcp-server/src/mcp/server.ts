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

  server.registerTool(
    "scan_local_space",
    {
      title: "Scan Local Space",
      description: "Scan the player's nearby 3D space as occupied vertical runs, walkable surfaces, and nearby POIs.",
      inputSchema: {
        radius: z.number().int().min(1).max(12).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(16).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(16).optional().describe("How many blocks above the player to include. Default: 12.")
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ radius, down, up }) => handlers.scanLocalSpace({ radius, down, up })
  );

  server.registerTool(
    "analyze_local_space",
    {
      title: "Analyze Local Space",
      description: "Lift the nearby 3D scan into semantic regions, structures, and buildability hints.",
      inputSchema: {
        radius: z.number().int().min(1).max(12).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(16).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(16).optional().describe("How many blocks above the player to include. Default: 12.")
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ radius, down, up }) => handlers.analyzeLocalSpace({ radius, down, up })
  );

  return server;
}
