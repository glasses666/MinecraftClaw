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

  server.registerTool(
    "place_block",
    {
      title: "Place Block",
      description: "Place a block by namespaced block id at an absolute block position in the current dimension.",
      inputSchema: {
        x: z.number().int().describe("Absolute block X coordinate."),
        y: z.number().int().describe("Absolute block Y coordinate."),
        z: z.number().int().describe("Absolute block Z coordinate."),
        blockId: z.string().min(3).describe("Minecraft block id such as minecraft:oak_planks.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ x, y, z, blockId }) => handlers.placeBlock({ x, y, z, blockId })
  );

  server.registerTool(
    "break_block",
    {
      title: "Break Block",
      description: "Clear a block position by replacing the current block with air.",
      inputSchema: {
        x: z.number().int().describe("Absolute block X coordinate."),
        y: z.number().int().describe("Absolute block Y coordinate."),
        z: z.number().int().describe("Absolute block Z coordinate.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ x, y, z }) => handlers.breakBlock({ x, y, z })
  );

  server.registerTool(
    "fill_box",
    {
      title: "Fill Box",
      description: "Fill an axis-aligned box with a block id in the current dimension.",
      inputSchema: {
        x1: z.number().int().describe("First corner X."),
        y1: z.number().int().describe("First corner Y."),
        z1: z.number().int().describe("First corner Z."),
        x2: z.number().int().describe("Second corner X."),
        y2: z.number().int().describe("Second corner Y."),
        z2: z.number().int().describe("Second corner Z."),
        blockId: z.string().min(3).describe("Minecraft block id such as minecraft:glass.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ x1, y1, z1, x2, y2, z2, blockId }) => handlers.fillBox({ x1, y1, z1, x2, y2, z2, blockId })
  );

  server.registerTool(
    "clear_box",
    {
      title: "Clear Box",
      description: "Fill an axis-aligned box with air in the current dimension.",
      inputSchema: {
        x1: z.number().int().describe("First corner X."),
        y1: z.number().int().describe("First corner Y."),
        z1: z.number().int().describe("First corner Z."),
        x2: z.number().int().describe("Second corner X."),
        y2: z.number().int().describe("Second corner Y."),
        z2: z.number().int().describe("Second corner Z.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ x1, y1, z1, x2, y2, z2 }) => handlers.clearBox({ x1, y1, z1, x2, y2, z2 })
  );

  server.registerTool(
    "run_command",
    {
      title: "Run Command",
      description: "Execute a raw server command with high permission level. Do not include the leading slash.",
      inputSchema: {
        command: z.string().min(1).describe("Server command text, with or without a leading slash.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ command }) => handlers.runCommand({ command })
  );

  return server;
}
