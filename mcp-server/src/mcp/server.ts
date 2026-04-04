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
  const runtimeBlueprintStepSchema = z.union([
    z.object({
      kind: z.literal("fill"),
      from: z.object({ x: z.number().int(), y: z.number().int(), z: z.number().int() }),
      to: z.object({ x: z.number().int(), y: z.number().int(), z: z.number().int() }),
      blockId: z.string().min(3)
    }),
    z.object({
      kind: z.literal("block"),
      at: z.object({ x: z.number().int(), y: z.number().int(), z: z.number().int() }),
      blockId: z.string().min(3)
    }),
    z.object({
      kind: z.literal("command"),
      commandTemplate: z.string().min(3),
      offset: z.object({ x: z.number().int(), y: z.number().int(), z: z.number().int() })
    })
  ]);
  const runtimeBlueprintSchema = z.object({
    id: z.string().min(3).describe("Runtime blueprint identifier."),
    width: z.number().int().min(1).max(64).describe("Blueprint width in blocks."),
    depth: z.number().int().min(1).max(64).describe("Blueprint depth in blocks."),
    height: z.number().int().min(1).max(64).describe("Blueprint height in blocks."),
    steps: z.array(runtimeBlueprintStepSchema).min(1).max(512).describe("Relative fill/block/command steps.")
  });

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
    "get_inventory",
    {
      title: "Get Inventory",
      description: "Read the current player's non-empty inventory slots from the local MinecraftClaw mod bridge.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => handlers.getInventory()
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
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12.")
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
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12.")
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
    "analyze_build_site",
    {
      title: "Analyze Build Site",
      description: "Compress the nearby terrain into symbol maps and site-aware building recommendations.",
      inputSchema: {
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12.")
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ radius, down, up }) => handlers.analyzeBuildSite({ radius, down, up })
  );

  server.registerTool(
    "project_local_space",
    {
      title: "Project Local Space",
      description: "Project the scanned local space into top and elevation views so the agent can reason about silhouette and massing.",
      inputSchema: {
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12."),
        x1: z.number().int().optional().describe("Optional first X bound for the projection focus box."),
        y1: z.number().int().optional().describe("Optional first Y bound for the projection focus box."),
        z1: z.number().int().optional().describe("Optional first Z bound for the projection focus box."),
        x2: z.number().int().optional().describe("Optional second X bound for the projection focus box."),
        y2: z.number().int().optional().describe("Optional second Y bound for the projection focus box."),
        z2: z.number().int().optional().describe("Optional second Z bound for the projection focus box.")
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ radius, down, up, x1, y1, z1, x2, y2, z2 }) =>
      handlers.projectLocalSpace({ radius, down, up, x1, y1, z1, x2, y2, z2 })
  );

  server.registerTool(
    "plan_build",
    {
      title: "Plan Build",
      description: "Plan a floating or grounded structure placement against the live scanned space without modifying the world.",
      inputSchema: {
        blueprintId: z.string().min(3).describe("Blueprint id such as cozy_cabin_v1 or ridge_lantern_lodge_v1."),
        placementMode: z.enum(["floating", "grounded"]).optional().describe("Placement strategy. Defaults to grounded."),
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12."),
        clearanceAboveSurface: z.number().min(0).max(8).optional().describe("Floating builds only: extra clearance above the highest occupied support."),
        minSupportRatio: z.number().min(0).max(1).optional().describe("Grounded builds only: minimum supported footprint ratio."),
        maxSurfaceVariance: z.number().int().min(0).max(8).optional().describe("Grounded builds only: maximum tolerated Y variance under the footprint.")
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ blueprintId, placementMode, radius, down, up, clearanceAboveSurface, minSupportRatio, maxSurfaceVariance }) =>
      handlers.planBuild({ blueprintId, placementMode, radius, down, up, clearanceAboveSurface, minSupportRatio, maxSurfaceVariance })
  );

  server.registerTool(
    "preview_blueprint",
    {
      title: "Preview Blueprint",
      description: "Preview a runtime blueprint against the scanned site without modifying the world.",
      inputSchema: {
        blueprint: runtimeBlueprintSchema.describe("Runtime blueprint object with relative steps."),
        placementMode: z.enum(["floating", "grounded"]).optional().describe("Placement strategy. Defaults to grounded."),
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12."),
        clearanceAboveSurface: z.number().min(0).max(8).optional().describe("Floating builds only: extra clearance above the highest occupied support."),
        minSupportRatio: z.number().min(0).max(1).optional().describe("Grounded builds only: minimum supported footprint ratio."),
        maxSurfaceVariance: z.number().int().min(0).max(8).optional().describe("Grounded builds only: maximum tolerated Y variance under the footprint.")
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ blueprint, placementMode, radius, down, up, clearanceAboveSurface, minSupportRatio, maxSurfaceVariance }) =>
      handlers.previewBlueprint({ blueprint, placementMode, radius, down, up, clearanceAboveSurface, minSupportRatio, maxSurfaceVariance })
  );

  server.registerTool(
    "build_structure",
    {
      title: "Build Structure",
      description: "Plan and execute a structure blueprint at a valid floating or grounded site.",
      inputSchema: {
        blueprintId: z.string().min(3).describe("Blueprint id such as cozy_cabin_v1 or ridge_lantern_lodge_v1."),
        placementMode: z.enum(["floating", "grounded"]).optional().describe("Placement strategy. Defaults to grounded."),
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12."),
        clearanceAboveSurface: z.number().min(0).max(8).optional().describe("Floating builds only: extra clearance above the highest occupied support."),
        minSupportRatio: z.number().min(0).max(1).optional().describe("Grounded builds only: minimum supported footprint ratio."),
        maxSurfaceVariance: z.number().int().min(0).max(8).optional().describe("Grounded builds only: maximum tolerated Y variance under the footprint."),
        allowOverlap: z.boolean().optional().describe("Force the build even if the selected plan reports overlap. Defaults to false.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ blueprintId, placementMode, radius, down, up, clearanceAboveSurface, minSupportRatio, maxSurfaceVariance, allowOverlap }) =>
      handlers.buildStructure({
        blueprintId,
        placementMode,
        radius,
        down,
        up,
        clearanceAboveSurface,
        minSupportRatio,
        maxSurfaceVariance,
        allowOverlap
      })
  );

  server.registerTool(
    "build_from_blueprint",
    {
      title: "Build From Blueprint",
      description: "Plan and execute a runtime blueprint without registering it in the server code first.",
      inputSchema: {
        blueprint: runtimeBlueprintSchema.describe("Runtime blueprint object with relative steps."),
        placementMode: z.enum(["floating", "grounded"]).optional().describe("Placement strategy. Defaults to grounded."),
        radius: z.number().int().min(1).max(20).optional().describe("Horizontal scan radius in blocks around the player. Default: 8."),
        down: z.number().int().min(1).max(24).optional().describe("How many blocks below the player to include. Default: 8."),
        up: z.number().int().min(1).max(24).optional().describe("How many blocks above the player to include. Default: 12."),
        clearanceAboveSurface: z.number().min(0).max(8).optional().describe("Floating builds only: extra clearance above the highest occupied support."),
        minSupportRatio: z.number().min(0).max(1).optional().describe("Grounded builds only: minimum supported footprint ratio."),
        maxSurfaceVariance: z.number().int().min(0).max(8).optional().describe("Grounded builds only: maximum tolerated Y variance under the footprint."),
        allowOverlap: z.boolean().optional().describe("Force the build even if the selected plan reports overlap. Defaults to false.")
      },
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ blueprint, placementMode, radius, down, up, clearanceAboveSurface, minSupportRatio, maxSurfaceVariance, allowOverlap }) =>
      handlers.buildFromBlueprint({
        blueprint,
        placementMode,
        radius,
        down,
        up,
        clearanceAboveSurface,
        minSupportRatio,
        maxSurfaceVariance,
        allowOverlap
      })
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

  server.registerTool(
    "summon_entity",
    {
      title: "Summon Entity",
      description: "Summon an entity at absolute block coordinates.",
      inputSchema: {
        entityId: z.string().min(3).describe("Minecraft entity id such as minecraft:cow."),
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
    async ({ entityId, x, y, z }) => handlers.summonEntity({ entityId, x, y, z })
  );

  server.registerTool(
    "set_time",
    {
      title: "Set Time",
      description: "Set world time using a preset or absolute time value.",
      inputSchema: {
        time: z.union([z.string(), z.number().int().nonnegative()]).describe("One of day, night, noon, midnight, or a non-negative tick value.")
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ time }) => handlers.setTime({ time })
  );

  server.registerTool(
    "set_weather",
    {
      title: "Set Weather",
      description: "Set weather and an optional duration in seconds.",
      inputSchema: {
        weather: z.enum(["clear", "rain", "thunder"]).describe("Weather state."),
        durationSeconds: z.number().int().positive().optional().describe("Optional weather duration in seconds.")
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ weather, durationSeconds }) => handlers.setWeather({ weather, durationSeconds })
  );

  server.registerTool(
    "give_item",
    {
      title: "Give Item",
      description: "Give an item stack to the current player or a named target.",
      inputSchema: {
        itemId: z.string().min(3).describe("Minecraft item id such as minecraft:diamond."),
        count: z.number().int().positive().optional().describe("Stack count to give. Default: 1."),
        target: z.string().min(1).optional().describe("Optional target selector/name. Defaults to the current player.")
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ itemId, count, target }) => handlers.giveItem({ itemId, count, target })
  );

  return server;
}
