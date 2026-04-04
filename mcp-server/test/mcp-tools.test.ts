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
