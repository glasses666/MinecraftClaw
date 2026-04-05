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
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 40, y: 270, z: -8 },
      exactPosition: { x: 40, y: 270, z: -8 },
      yaw: 0,
      pitch: 0
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
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => {
      called = true;
      throw new Error("should not be called");
    },
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

  const result = await handlers.teleportPlayer({
    x: Number.NaN,
    y: 270,
    z: -8
  });

  assert.equal(called, false);
  assert.equal(result.isError, true);
  assert.match(readFirstText(result.content), /finite numbers/);
});

test("createToolHandlers exposes scan_local_space as structured local space content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 40, y: 270, z: -8 },
      exactPosition: { x: 40, y: 270, z: -8 },
      yaw: 0,
      pitch: 0
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

  const result = await handlers.scanLocalSpace({ radius: 4, down: 4, up: 6 });

  assert.equal(result.isError, false);
  assert.deepEqual(result.structuredContent, {
    space: sampleLocalSpace()
  });
  assert.match(readFirstText(result.content), /81 columns/);
  assert.match(readFirstText(result.content), /19 walkable surfaces/);
});

test("createToolHandlers exposes analyze_local_space as semantic space-model content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 26, y: 269, z: 13 },
      exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
      yaw: -94.5,
      pitch: -4.5
    }),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => ({
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 40, y: 270, z: -8 },
      exactPosition: { x: 40, y: 270, z: -8 },
      yaw: 0,
      pitch: 0
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

  const result = await handlers.analyzeLocalSpace({ radius: 4, down: 4, up: 6 });
  const model = (result.structuredContent as { model?: { summary?: { dominantSceneKind?: string } } } | undefined)?.model;

  assert.equal(result.isError, false);
  assert.equal(model?.summary?.dominantSceneKind, "natural");
  assert.match(readFirstText(result.content), /scene/i);
  assert.match(readFirstText(result.content), /buildability/i);
});

test("createToolHandlers exposes analyze_build_site as a symbolic terrain brief", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleGroundedBuildSpace(),
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

  const result = await handlers.analyzeBuildSite({ radius: 12, down: 6, up: 12 });
  const brief = (result.structuredContent as { site?: { summary?: { siteKind?: string }, symbolMaps?: { surface?: { rows?: string[] } } } }).site;

  assert.equal(result.isError, false);
  assert.equal(brief?.summary?.siteKind, "rocky_plateau");
  assert.ok((brief?.symbolMaps?.surface?.rows?.length ?? 0) >= 5);
  assert.match(readFirstText(result.content), /site/i);
  assert.match(readFirstText(result.content), /foundation/i);
});

test("createToolHandlers exposes project_local_space as orthographic projection content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleGroundedBuildSpace(),
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

  const result = await handlers.projectLocalSpace({
    radius: 12,
    down: 6,
    up: 12,
    x1: 202,
    y1: 70,
    z1: 92,
    x2: 214,
    y2: 76,
    z2: 102
  });

  assert.equal(result.isError, false);
  const projection = (result.structuredContent as { projection?: { topView?: { width?: number }, northElevation?: { height?: number } } }).projection;
  assert.ok((projection?.topView?.width ?? 0) >= 10);
  assert.ok((projection?.northElevation?.height ?? 0) >= 1);
  assert.match(readFirstText(result.content), /projection/i);
});

test("createToolHandlers exposes scan_voxel_slices as non-empty symbolic Y layers", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleGroundedBuildSpace(),
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

  const result = await handlers.scanVoxelSlices({
    radius: 12,
    down: 6,
    up: 12,
    x1: 202,
    y1: 70,
    z1: 92,
    x2: 214,
    y2: 76,
    z2: 102,
    cropMode: "focus"
  });

  assert.equal(result.isError, false);
  const slices = (result.structuredContent as {
    slices?: {
      summary?: { nonEmptySliceCount?: number; width?: number };
      slices?: Array<{ rows: string[] }>;
    }
  }).slices;
  assert.ok((slices?.summary?.nonEmptySliceCount ?? 0) >= 1);
  assert.ok((slices?.summary?.width ?? 0) >= 10);
  assert.ok(slices?.slices?.some((slice) => slice.rows.some((row) => /[SWG]/.test(row))));
  assert.match(readFirstText(result.content), /slices/i);
});

test("createToolHandlers exposes plan_build as a grounded build plan with bounds and support metrics", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleGroundedBuildSpace(),
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

  const result = await handlers.planBuild({
    blueprintId: "ridge_lantern_lodge_v1",
    placementMode: "grounded",
    radius: 12,
    down: 6,
    up: 12
  });

  assert.equal(result.isError, false);
  const plan = (result.structuredContent as { plan?: { blueprintId?: string; placementMode?: string; supportRatio?: number } }).plan;
  assert.equal(plan?.blueprintId, "ridge_lantern_lodge_v1");
  assert.equal(plan?.placementMode, "grounded");
  assert.ok((plan?.supportRatio ?? 0) >= 0.9);
  assert.match(readFirstText(result.content), /ridge_lantern_lodge_v1/);
});

test("createToolHandlers exposes place_block with structured world-action content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
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

  const result = await handlers.placeBlock({ x: 40, y: 270, z: -8, blockId: "minecraft:gold_block" });

  assert.equal(result.isError, false);
  assert.equal((result.structuredContent as { result?: { action?: string } }).result?.action, "place_block");
  assert.match(readFirstText(result.content), /minecraft:gold_block/);
});

test("createToolHandlers maps clear_box to fill_box with minecraft:air", async () => {
  let receivedFillRequest: unknown;
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleLocalSpace(),
    placeBlock: async () => sampleActionResult("place_block", 1, "minecraft:gold_block"),
    fillBox: async (request) => {
      receivedFillRequest = request;
      return sampleActionResult("fill_box", 27, request.blockId);
    },
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

  const result = await handlers.clearBox({ x1: 0, y1: 64, z1: 0, x2: 2, y2: 66, z2: 2 });

  assert.equal(result.isError, false);
  assert.deepEqual(receivedFillRequest, {
    x1: 0,
    y1: 64,
    z1: 0,
    x2: 2,
    y2: 66,
    z2: 2,
    blockId: "minecraft:air"
  });
  assert.equal((result.structuredContent as { result?: { action?: string; blockId?: string } }).result?.action, "clear_box");
});

test("createToolHandlers rejects malformed block identifiers before calling the bridge", async () => {
  let called = false;
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleLocalSpace(),
    placeBlock: async () => {
      called = true;
      return sampleActionResult("place_block", 1, "minecraft:gold_block");
    },
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

  const result = await handlers.placeBlock({ x: 40, y: 270, z: -8, blockId: "Gold Block" });

  assert.equal(called, false);
  assert.equal(result.isError, true);
  assert.match(readFirstText(result.content), /blockId/);
});

test("createToolHandlers exposes run_command as structured command execution content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
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

  const result = await handlers.runCommand({ command: "time set day" });

  assert.equal(result.isError, false);
  assert.equal((result.structuredContent as { result?: { action?: string } }).result?.action, "run_command");
  assert.match(readFirstText(result.content), /time set day/);
});

test("createToolHandlers exposes get_inventory as structured inventory content", async () => {
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
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

  const result = await handlers.getInventory();

  assert.equal(result.isError, false);
  assert.equal((result.structuredContent as { inventory?: { playerName?: string } }).inventory?.playerName, "GLAsserrrr");
  assert.match(readFirstText(result.content), /2 filled slots/);
});

test("createToolHandlers exposes summon_entity as a command-backed typed tool", async () => {
  let receivedCommand: string | undefined;
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleLocalSpace(),
    placeBlock: async () => sampleActionResult("place_block", 1, "minecraft:gold_block"),
    fillBox: async () => sampleActionResult("fill_box", 8, "minecraft:glass"),
    runCommand: async ({ command }) => {
      receivedCommand = command;
      return {
        action: "run_command",
        success: true,
        dimension: "minecraft:overworld",
        changedBlocks: 0,
        command,
        commandResult: 1,
        message: `Executed command: ${command}`
      };
    }
  });

  const result = await handlers.summonEntity({ entityId: "minecraft:cow", x: 10, y: 70, z: 20 });

  assert.equal(result.isError, false);
  assert.equal(receivedCommand, "summon minecraft:cow 10 70 20");
  assert.match(readFirstText(result.content), /minecraft:cow/);
});

test("createToolHandlers exposes give_item as a command-backed typed tool", async () => {
  let receivedCommand: string | undefined;
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleLocalSpace(),
    placeBlock: async () => sampleActionResult("place_block", 1, "minecraft:gold_block"),
    fillBox: async () => sampleActionResult("fill_box", 8, "minecraft:glass"),
    runCommand: async ({ command }) => {
      receivedCommand = command;
      return {
        action: "run_command",
        success: true,
        dimension: "minecraft:overworld",
        changedBlocks: 0,
        command,
        commandResult: 1,
        message: `Executed command: ${command}`
      };
    }
  });

  const result = await handlers.giveItem({ itemId: "minecraft:diamond", count: 3 });

  assert.equal(result.isError, false);
  assert.equal(receivedCommand, "give GLAsserrrr minecraft:diamond 3");
  assert.match(readFirstText(result.content), /minecraft:diamond/);
});

test("createToolHandlers exposes set_time and set_weather as command-backed typed tools", async () => {
  const receivedCommands: string[] = [];
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleLocalSpace(),
    placeBlock: async () => sampleActionResult("place_block", 1, "minecraft:gold_block"),
    fillBox: async () => sampleActionResult("fill_box", 8, "minecraft:glass"),
    runCommand: async ({ command }) => {
      receivedCommands.push(command);
      return {
        action: "run_command",
        success: true,
        dimension: "minecraft:overworld",
        changedBlocks: 0,
        command,
        commandResult: 1,
        message: `Executed command: ${command}`
      };
    }
  });

  const timeResult = await handlers.setTime({ time: "day" });
  const weatherResult = await handlers.setWeather({ weather: "rain", durationSeconds: 30 });

  assert.equal(timeResult.isError, false);
  assert.equal(weatherResult.isError, false);
  assert.deepEqual(receivedCommands, ["time set day", "weather rain 30"]);
});

test("createToolHandlers exposes build_structure as an executable plan over fill, block, and command primitives", async () => {
  const fillRequests: unknown[] = [];
  const blockRequests: unknown[] = [];
  const commandRequests: string[] = [];
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleGroundedBuildSpace(),
    placeBlock: async (request) => {
      blockRequests.push(request);
      return sampleActionResult("place_block", 1, request.blockId);
    },
    fillBox: async (request) => {
      fillRequests.push(request);
      return sampleActionResult("fill_box", 8, request.blockId);
    },
    runCommand: async ({ command }) => {
      commandRequests.push(command);
      return {
        action: "run_command",
        success: true,
        dimension: "minecraft:overworld",
        changedBlocks: 0,
        command,
        commandResult: 1,
        message: `Executed command: ${command}`
      };
    }
  });

  const result = await handlers.buildStructure({
    blueprintId: "ridge_lantern_lodge_v1",
    placementMode: "grounded",
    radius: 12,
    down: 6,
    up: 12
  });

  assert.equal(result.isError, false);
  const build = (result.structuredContent as { build?: { blueprintId?: string; executedStepCount?: number; totalChangedBlocks?: number } }).build;
  assert.equal(build?.blueprintId, "ridge_lantern_lodge_v1");
  assert.ok((build?.executedStepCount ?? 0) >= 20);
  assert.ok((build?.totalChangedBlocks ?? 0) >= fillRequests.length + blockRequests.length);
  assert.ok(fillRequests.length >= 8);
  assert.ok(blockRequests.length >= 3);
  assert.ok(commandRequests.length >= 5);
  assert.match(readFirstText(result.content), /Built ridge_lantern_lodge_v1/);
});

test("createToolHandlers previews and builds a runtime blueprint without library registration", async () => {
  const fillRequests: unknown[] = [];
  const blockRequests: unknown[] = [];
  const commandRequests: string[] = [];
  const handlers = createToolHandlers({
    getPlayerState: async () => samplePlayer(),
    getInventory: async () => sampleInventory(),
    teleportPlayer: async () => samplePlayer(),
    scanLocalSpace: async () => sampleGroundedBuildSpace(),
    placeBlock: async (request) => {
      blockRequests.push(request);
      return sampleActionResult("place_block", 1, request.blockId);
    },
    fillBox: async (request) => {
      fillRequests.push(request);
      return sampleActionResult("fill_box", 8, request.blockId);
    },
    runCommand: async ({ command }) => {
      commandRequests.push(command);
      return {
        action: "run_command",
        success: true,
        dimension: "minecraft:overworld",
        changedBlocks: 0,
        command,
        commandResult: 1,
        message: `Executed command: ${command}`
      };
    }
  });

  const preview = await handlers.previewBlueprint({
    blueprint: sampleRuntimeBlueprint(),
    placementMode: "grounded",
    radius: 12,
    down: 6,
    up: 12,
    minSupportRatio: 0.75,
    maxSurfaceVariance: 1
  });
  const build = await handlers.buildFromBlueprint({
    blueprint: sampleRuntimeBlueprint(),
    placementMode: "grounded",
    radius: 12,
    down: 6,
    up: 12,
    minSupportRatio: 0.75,
    maxSurfaceVariance: 1
  });

  assert.equal(preview.isError, false);
  assert.match(readFirstText(preview.content), /runtime_cliff_test/);
  const previewPlan = (preview.structuredContent as { preview?: { plan?: { blueprintId?: string } } }).preview?.plan;
  assert.equal(previewPlan?.blueprintId, "runtime_cliff_test");

  assert.equal(build.isError, false);
  assert.match(readFirstText(build.content), /runtime_cliff_test/);
  assert.ok(fillRequests.length >= 3);
  assert.ok(commandRequests.length >= 3);
  assert.ok(blockRequests.length >= 2);
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

function sampleGroundedBuildSpace() {
  const columns = [];
  const walkableSurfaces = [];

  for (let x = 198; x <= 220; x += 1) {
    for (let z = 86; z <= 108; z += 1) {
      const onShelf = x >= 202 && x <= 214 && z >= 92 && z <= 102;
      const y = onShelf ? 70 : 68;
      const blockId = onShelf ? "minecraft:stone" : "minecraft:grass_block";

      columns.push({
        x,
        z,
        highestOccupiedY: y,
        topBlockId: blockId,
        walkableY: y,
        headroom: 10,
        occupiedRuns: [{ startY: y, endY: y, blockId }]
      });
      walkableSurfaces.push({ x, y, z, blockId, headroom: 10 });
    }
  }

  return {
    schemaVersion: 1,
    player: {
      name: "GLAsserrrr",
      dimension: "minecraft:overworld",
      position: { x: 212, y: 76, z: 95 },
      exactPosition: { x: 212.5, y: 76.0, z: 95.5 },
      yaw: 32,
      pitch: -8
    },
    bounds: {
      min: { x: 198, y: 64, z: 86 },
      max: { x: 220, y: 88, z: 108 }
    },
    parameters: {
      radius: 12,
      down: 6,
      up: 12
    },
    summary: {
      sampledColumns: columns.length,
      sampledBlocks: columns.length * 25,
      occupiedBlocks: columns.length,
      airBlocks: columns.length * 24,
      fluidBlocks: 0,
      walkableSurfaceCount: walkableSurfaces.length,
      topBlockCounts: [
        { blockId: "minecraft:stone", count: 143 },
        { blockId: "minecraft:grass_block", count: columns.length - 143 }
      ]
    },
    columns,
    walkableSurfaces,
    pointsOfInterest: []
  };
}

function samplePlayer() {
  return {
    name: "GLAsserrrr",
    dimension: "minecraft:overworld",
    position: { x: 26, y: 269, z: 13 },
    exactPosition: { x: 26.7674, y: 269.5, z: 13.2385 },
    yaw: -94.5,
    pitch: -4.5
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

function sampleRuntimeBlueprint() {
  return {
    id: "runtime_cliff_test",
    width: 5,
    depth: 6,
    height: 5,
    steps: [
      {
        kind: "fill",
        from: { x: 0, y: 0, z: 0 },
        to: { x: 4, y: 0, z: 5 },
        blockId: "minecraft:stone_bricks"
      },
      {
        kind: "fill",
        from: { x: 1, y: 1, z: 1 },
        to: { x: 3, y: 3, z: 4 },
        blockId: "minecraft:oak_planks"
      },
      {
        kind: "fill",
        from: { x: 2, y: 2, z: 2 },
        to: { x: 2, y: 3, z: 3 },
        blockId: "minecraft:air"
      },
      { kind: "block", at: { x: 1, y: 2, z: 1 }, blockId: "minecraft:glass_pane" },
      { kind: "block", at: { x: 3, y: 2, z: 1 }, blockId: "minecraft:glass_pane" },
      {
        kind: "command",
        commandTemplate: "setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false]",
        offset: { x: 2, y: 1, z: 1 }
      },
      {
        kind: "command",
        commandTemplate: "setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false]",
        offset: { x: 2, y: 2, z: 1 }
      },
      {
        kind: "command",
        commandTemplate: "setblock {x} {y} {z} minecraft:lantern[hanging=true]",
        offset: { x: 2, y: 4, z: 2 }
      }
    ]
  };
}
