export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface SurfacePosition {
  x: number;
  z: number;
  surface_y: number;
  block_id: string;
  state_string?: string;
}

export interface RawExportSnapshot {
  scanMeta: {
    schema_version: number;
    scanned_at: string;
    player_name: string;
    player_uuid: string;
    dimension: string;
    center: Position3D;
    local_bounds: {
      min: Position3D;
      max: Position3D;
    };
    surface_bounds: {
      min_x: number;
      max_x: number;
      min_z: number;
      max_z: number;
    };
    profile: {
      local_width: number;
      local_depth: number;
      local_height: number;
      surface_width: number;
      surface_depth: number;
    };
  };
  playerState: {
    player_name: string;
    player_uuid: string;
    dimension: string;
    block_pos: Position3D;
    exact_pos: Position3D;
    yaw: number;
    pitch: number;
    health: number;
    food: number;
    saturation: number;
    on_ground: boolean;
    main_hand: RawInventoryStack;
    off_hand: RawInventoryStack;
  };
  inventory: RawInventoryEntry[];
  localBlocks: RawBlockEntry[];
  blockEntities: RawBlockEntityEntry[];
  entities: RawEntityEntry[];
  surfaceMap: SurfacePosition[];
}

export interface RawInventoryStack {
  item_id: string;
  count: number;
  empty: boolean;
  display_name: string;
  nbt_snbt: string;
}

export interface RawInventoryEntry extends RawInventoryStack {
  slot: number;
}

export interface RawBlockEntry {
  x: number;
  y: number;
  z: number;
  block_id: string;
  state_string: string;
  is_air: boolean;
}

export interface RawBlockEntityEntry {
  x: number;
  y: number;
  z: number;
  block_id: string;
  type: string;
  nbt_snbt: string;
}

export interface RawEntityEntry {
  uuid: string;
  type: string;
  name: string;
  block_pos: Position3D;
  exact_pos: Position3D;
  health?: number;
  nbt_snbt: string;
}

export interface CleanedExport {
  context: {
    rawSchemaVersion: number;
    cleanedSchemaVersion: number;
    scannedAt: string;
    dimension: string;
    center: Position3D;
    localBox: {
      width: number;
      depth: number;
      height: number;
    };
    surfaceBox: {
      width: number;
      depth: number;
    };
  };
  player: {
    name: string;
    uuid: string;
    blockPos: Position3D;
    exactPos: Position3D;
    yaw: number;
    pitch: number;
    health: number;
    food: number;
    saturation: number;
    onGround: boolean;
    hands: {
      mainHandItemId: string;
      offHandItemId: string;
    };
  };
  inventory: {
    totalSlots: number;
    occupiedSlots: number;
    stacks: Array<{
      slot: number;
      itemId: string;
      count: number;
      displayName: string;
    }>;
    totalsByItem: Array<{
      itemId: string;
      totalCount: number;
    }>;
  };
  localEnvironment: {
    totalBlocks: number;
    airBlocks: number;
    nonAirBlocks: number;
    airRatio: number;
    topNonAirBlocks: Array<{
      blockId: string;
      count: number;
    }>;
    yLevelProfiles: Array<{
      y: number;
      nonAirBlocks: number;
      dominantBlocks: Array<{
        blockId: string;
        count: number;
      }>;
    }>;
  };
  surface: {
    sampleCount: number;
    height: {
      min: number;
      max: number;
      range: number;
      average: number;
    };
    topBlocks: Array<{
      blockId: string;
      count: number;
    }>;
  };
  entities: {
    total: number;
    byType: Array<{
      entityType: string;
      count: number;
    }>;
    nearby: Array<{
      entityType: string;
      name: string;
      blockPos: Position3D;
      health?: number;
    }>;
  };
  pointsOfInterest: {
    total: number;
    byBlockId: Array<{
      blockId: string;
      count: number;
    }>;
    entries: Array<{
      blockId: string;
      blockPos: Position3D;
      kindId: string;
    }>;
  };
}

const TOP_BLOCK_LIMIT = 12;
const TOP_Y_LEVEL_BLOCK_LIMIT = 6;

export async function loadRawExportSnapshot(directory: string): Promise<RawExportSnapshot> {
  const [
    scanMeta,
    playerState,
    inventory,
    localBlocks,
    blockEntities,
    entities,
    surfaceMap
  ] = await Promise.all([
    readJsonFile(join(directory, "scan_meta.json")),
    readJsonFile(join(directory, "player_state.json")),
    readJsonFile(join(directory, "inventory.json")),
    readJsonFile(join(directory, "local_blocks.json")),
    readJsonFile(join(directory, "block_entities.json")),
    readJsonFile(join(directory, "entities.json")),
    readJsonFile(join(directory, "surface_map.json"))
  ]);

  return {
    scanMeta,
    playerState,
    inventory,
    localBlocks,
    blockEntities,
    entities,
    surfaceMap
  } as RawExportSnapshot;
}

export function cleanRawExport(raw: RawExportSnapshot): CleanedExport {
  const nonEmptyStacks = raw.inventory.filter((entry) => !entry.empty);
  const nonAirBlocks = raw.localBlocks.filter((entry) => !entry.is_air);
  const airBlocks = raw.localBlocks.length - nonAirBlocks.length;
  const surfaceHeights = raw.surfaceMap.map((entry) => entry.surface_y);

  return {
    context: {
      rawSchemaVersion: raw.scanMeta.schema_version,
      cleanedSchemaVersion: 1,
      scannedAt: raw.scanMeta.scanned_at,
      dimension: raw.scanMeta.dimension,
      center: raw.scanMeta.center,
      localBox: {
        width: raw.scanMeta.profile.local_width,
        depth: raw.scanMeta.profile.local_depth,
        height: raw.scanMeta.profile.local_height
      },
      surfaceBox: {
        width: raw.scanMeta.profile.surface_width,
        depth: raw.scanMeta.profile.surface_depth
      }
    },
    player: {
      name: raw.playerState.player_name,
      uuid: raw.playerState.player_uuid,
      blockPos: raw.playerState.block_pos,
      exactPos: raw.playerState.exact_pos,
      yaw: raw.playerState.yaw,
      pitch: raw.playerState.pitch,
      health: raw.playerState.health,
      food: raw.playerState.food,
      saturation: raw.playerState.saturation,
      onGround: raw.playerState.on_ground,
      hands: {
        mainHandItemId: raw.playerState.main_hand.item_id,
        offHandItemId: raw.playerState.off_hand.item_id
      }
    },
    inventory: {
      totalSlots: raw.inventory.length,
      occupiedSlots: nonEmptyStacks.length,
      stacks: nonEmptyStacks.map((entry) => ({
        slot: entry.slot,
        itemId: entry.item_id,
        count: entry.count,
        displayName: entry.display_name
      })),
      totalsByItem: toSortedCounts(
        sumBy(nonEmptyStacks, (entry) => entry.item_id, (entry) => entry.count),
        "itemId"
      ).map((entry) => ({
        itemId: entry.id,
        totalCount: entry.count
      }))
    },
    localEnvironment: {
      totalBlocks: raw.localBlocks.length,
      airBlocks,
      nonAirBlocks: nonAirBlocks.length,
      airRatio: roundTo(nonAirBlocks.length === 0 && raw.localBlocks.length === 0 ? 0 : airBlocks / raw.localBlocks.length, 4),
      topNonAirBlocks: toSortedCounts(
        sumBy(nonAirBlocks, (entry) => entry.block_id, () => 1),
        "blockId"
      ).slice(0, TOP_BLOCK_LIMIT).map((entry) => ({
        blockId: entry.id,
        count: entry.count
      })),
      yLevelProfiles: summarizeYLevels(nonAirBlocks)
    },
    surface: {
      sampleCount: raw.surfaceMap.length,
      height: {
        min: Math.min(...surfaceHeights),
        max: Math.max(...surfaceHeights),
        range: Math.max(...surfaceHeights) - Math.min(...surfaceHeights),
        average: roundTo(surfaceHeights.reduce((sum, value) => sum + value, 0) / surfaceHeights.length, 2)
      },
      topBlocks: toSortedCounts(
        sumBy(raw.surfaceMap, (entry) => entry.block_id, () => 1),
        "blockId"
      ).slice(0, TOP_BLOCK_LIMIT).map((entry) => ({
        blockId: entry.id,
        count: entry.count
      }))
    },
    entities: {
      total: raw.entities.length,
      byType: toSortedCounts(
        sumBy(raw.entities, (entry) => entry.type, () => 1),
        "entityType"
      ).map((entry) => ({
        entityType: entry.id,
        count: entry.count
      })),
      nearby: raw.entities.map((entry) => ({
        entityType: entry.type,
        name: entry.name,
        blockPos: entry.block_pos,
        ...(entry.health === undefined ? {} : { health: entry.health })
      }))
    },
    pointsOfInterest: {
      total: raw.blockEntities.length,
      byBlockId: toSortedCounts(
        sumBy(raw.blockEntities, (entry) => entry.block_id, () => 1),
        "blockId"
      ).map((entry) => ({
        blockId: entry.id,
        count: entry.count
      })),
      entries: raw.blockEntities.map((entry) => ({
        blockId: entry.block_id,
        blockPos: { x: entry.x, y: entry.y, z: entry.z },
        kindId: extractSnbtId(entry.nbt_snbt) ?? entry.block_id
      }))
    }
  };
}

function summarizeYLevels(nonAirBlocks: RawBlockEntry[]): CleanedExport["localEnvironment"]["yLevelProfiles"] {
  const grouped = new Map<number, RawBlockEntry[]>();
  for (const entry of nonAirBlocks) {
    const existing = grouped.get(entry.y);
    if (existing) {
      existing.push(entry);
    } else {
      grouped.set(entry.y, [entry]);
    }
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([y, entries]) => ({
      y,
      nonAirBlocks: entries.length,
      dominantBlocks: toSortedCounts(
        sumBy(entries, (entry) => entry.block_id, () => 1),
        "blockId"
      ).slice(0, TOP_Y_LEVEL_BLOCK_LIMIT).map((entry) => ({
        blockId: entry.id,
        count: entry.count
      }))
    }));
}

function extractSnbtId(snbt: string): string | undefined {
  const match = /id:"([^"]+)"/.exec(snbt);
  return match?.[1];
}

function sumBy<T>(items: T[], keySelector: (item: T) => string, valueSelector: (item: T) => number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keySelector(item);
    totals.set(key, (totals.get(key) ?? 0) + valueSelector(item));
  }
  return totals;
}

function toSortedCounts(
  counts: Map<string, number>,
  _label: string
): Array<{ id: string; count: number }> {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));
}

function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}
import { readFile } from "node:fs/promises";
import { join } from "node:path";
