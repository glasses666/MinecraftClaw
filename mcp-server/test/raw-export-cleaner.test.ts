import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  cleanRawExport,
  loadRawExportSnapshot,
  type RawExportSnapshot
} from "../src/cleaning/raw-export-cleaner.js";

test("cleanRawExport removes raw noise and keeps agent-usable summaries", () => {
  const raw: RawExportSnapshot = {
    scanMeta: {
      schema_version: 1,
      scanned_at: "2026-04-04T09:43:08Z",
      player_name: "GLAsserrrr",
      player_uuid: "player-uuid",
      dimension: "minecraft:overworld",
      center: { x: 10, y: 80, z: -5 },
      local_bounds: {
        min: { x: 2, y: 76, z: -13 },
        max: { x: 17, y: 83, z: 2 }
      },
      surface_bounds: {
        min_x: -6,
        max_x: 25,
        min_z: -21,
        max_z: 10
      },
      profile: {
        local_width: 16,
        local_depth: 16,
        local_height: 8,
        surface_width: 32,
        surface_depth: 32
      }
    },
    playerState: {
      player_name: "GLAsserrrr",
      player_uuid: "player-uuid",
      dimension: "minecraft:overworld",
      block_pos: { x: 10, y: 80, z: -5 },
      exact_pos: { x: 10.5, y: 80.0, z: -4.5 },
      yaw: 90,
      pitch: -10,
      health: 20,
      food: 18,
      saturation: 2,
      on_ground: true,
      main_hand: {
        item_id: "minecraft:diamond_pickaxe",
        count: 1,
        empty: false,
        display_name: "Diamond Pickaxe",
        nbt_snbt: "{Damage:1}"
      },
      off_hand: {
        item_id: "minecraft:torch",
        count: 16,
        empty: false,
        display_name: "Torch",
        nbt_snbt: "{}"
      }
    },
    inventory: [
      {
        slot: 0,
        item_id: "minecraft:stone",
        count: 32,
        empty: false,
        display_name: "Stone",
        nbt_snbt: "{}"
      },
      {
        slot: 1,
        item_id: "minecraft:stone",
        count: 16,
        empty: false,
        display_name: "Stone",
        nbt_snbt: "{}"
      },
      {
        slot: 2,
        item_id: "minecraft:air",
        count: 0,
        empty: true,
        display_name: "Air",
        nbt_snbt: "{}"
      }
    ],
    localBlocks: [
      { x: 10, y: 80, z: -5, block_id: "minecraft:air", state_string: "Block{minecraft:air}", is_air: true },
      { x: 11, y: 80, z: -5, block_id: "minecraft:stone", state_string: "Block{minecraft:stone}", is_air: false },
      { x: 12, y: 80, z: -5, block_id: "minecraft:stone", state_string: "Block{minecraft:stone}", is_air: false },
      { x: 10, y: 81, z: -5, block_id: "minecraft:oak_planks", state_string: "Block{minecraft:oak_planks}", is_air: false },
      { x: 11, y: 81, z: -5, block_id: "minecraft:air", state_string: "Block{minecraft:air}", is_air: true }
    ],
    blockEntities: [
      { x: 10, y: 80, z: -6, block_id: "minecraft:chest", type: "net.minecraft.class_2591@abc", nbt_snbt: "{id:\"minecraft:chest\",x:10,y:80,z:-6}" },
      { x: 12, y: 81, z: -4, block_id: "minecraft:lectern", type: "net.minecraft.class_2591@def", nbt_snbt: "{id:\"minecraft:lectern\",x:12,y:81,z:-4}" }
    ],
    entities: [
      { uuid: "a", type: "minecraft:villager", name: "Villager A", block_pos: { x: 9, y: 80, z: -4 }, exact_pos: { x: 9.1, y: 80, z: -4.2 }, health: 20, nbt_snbt: "{VillagerData:{profession:\"minecraft:farmer\"},id:\"minecraft:villager\"}" },
      { uuid: "b", type: "minecraft:villager", name: "Villager B", block_pos: { x: 8, y: 80, z: -4 }, exact_pos: { x: 8.1, y: 80, z: -4.2 }, health: 20, nbt_snbt: "{VillagerData:{profession:\"minecraft:librarian\"},id:\"minecraft:villager\"}" },
      { uuid: "c", type: "minecraft:cow", name: "Cow", block_pos: { x: 14, y: 80, z: -2 }, exact_pos: { x: 14.1, y: 80, z: -2.2 }, health: 10, nbt_snbt: "{id:\"minecraft:cow\"}" }
    ],
    surfaceMap: [
      { x: 10, z: -5, surface_y: 80, block_id: "minecraft:grass_block", state_string: "Block{minecraft:grass_block}" },
      { x: 11, z: -5, surface_y: 80, block_id: "minecraft:grass_block", state_string: "Block{minecraft:grass_block}" },
      { x: 12, z: -5, surface_y: 81, block_id: "minecraft:stone", state_string: "Block{minecraft:stone}" },
      { x: 13, z: -5, surface_y: 84, block_id: "minecraft:oak_planks", state_string: "Block{minecraft:oak_planks}" }
    ]
  };

  const cleaned = cleanRawExport(raw);

  assert.deepEqual(cleaned.context, {
    rawSchemaVersion: 1,
    cleanedSchemaVersion: 1,
    scannedAt: "2026-04-04T09:43:08Z",
    dimension: "minecraft:overworld",
    center: { x: 10, y: 80, z: -5 },
    localBox: { width: 16, depth: 16, height: 8 },
    surfaceBox: { width: 32, depth: 32 }
  });

  assert.equal(cleaned.inventory.occupiedSlots, 2);
  assert.deepEqual(cleaned.inventory.totalsByItem, [
    { itemId: "minecraft:stone", totalCount: 48 }
  ]);

  assert.equal(cleaned.localEnvironment.totalBlocks, 5);
  assert.equal(cleaned.localEnvironment.airBlocks, 2);
  assert.equal(cleaned.localEnvironment.nonAirBlocks, 3);
  assert.equal(cleaned.localEnvironment.airRatio, 0.4);
  assert.deepEqual(cleaned.localEnvironment.topNonAirBlocks, [
    { blockId: "minecraft:stone", count: 2 },
    { blockId: "minecraft:oak_planks", count: 1 }
  ]);
  assert.deepEqual(cleaned.localEnvironment.yLevelProfiles, [
    {
      y: 80,
      nonAirBlocks: 2,
      dominantBlocks: [{ blockId: "minecraft:stone", count: 2 }]
    },
    {
      y: 81,
      nonAirBlocks: 1,
      dominantBlocks: [{ blockId: "minecraft:oak_planks", count: 1 }]
    }
  ]);

  assert.deepEqual(cleaned.surface.height, {
    min: 80,
    max: 84,
    range: 4,
    average: 81.25
  });
  assert.deepEqual(cleaned.surface.topBlocks, [
    { blockId: "minecraft:grass_block", count: 2 },
    { blockId: "minecraft:oak_planks", count: 1 },
    { blockId: "minecraft:stone", count: 1 }
  ]);

  assert.deepEqual(cleaned.entities.byType, [
    { entityType: "minecraft:villager", count: 2 },
    { entityType: "minecraft:cow", count: 1 }
  ]);
  assert.equal(cleaned.entities.nearby.length, 3);

  assert.deepEqual(cleaned.pointsOfInterest.byBlockId, [
    { blockId: "minecraft:chest", count: 1 },
    { blockId: "minecraft:lectern", count: 1 }
  ]);
  assert.deepEqual(cleaned.pointsOfInterest.entries, [
    {
      blockId: "minecraft:chest",
      blockPos: { x: 10, y: 80, z: -6 },
      kindId: "minecraft:chest"
    },
    {
      blockId: "minecraft:lectern",
      blockPos: { x: 12, y: 81, z: -4 },
      kindId: "minecraft:lectern"
    }
  ]);
});

test("loadRawExportSnapshot reads the expected seven raw export files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mcclaw-raw-export-"));
  const payloads = {
    "scan_meta.json": { schema_version: 1 },
    "player_state.json": { player_name: "GLAsserrrr" },
    "inventory.json": [{ slot: 0 }],
    "local_blocks.json": [{ x: 1 }],
    "block_entities.json": [{ x: 2 }],
    "entities.json": [{ uuid: "abc" }],
    "surface_map.json": [{ x: 3 }]
  };

  for (const [fileName, value] of Object.entries(payloads)) {
    await writeFile(join(directory, fileName), JSON.stringify(value), "utf8");
  }

  const snapshot = await loadRawExportSnapshot(directory);

  assert.deepEqual(snapshot, {
    scanMeta: { schema_version: 1 },
    playerState: { player_name: "GLAsserrrr" },
    inventory: [{ slot: 0 }],
    localBlocks: [{ x: 1 }],
    blockEntities: [{ x: 2 }],
    entities: [{ uuid: "abc" }],
    surfaceMap: [{ x: 3 }]
  });

  const scanMetaContents = JSON.parse(await readFile(join(directory, "scan_meta.json"), "utf8"));
  assert.deepEqual(scanMetaContents, { schema_version: 1 });
});
