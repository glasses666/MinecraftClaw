import type { LocalSpaceSnapshot } from "../bridge/client.js";

export interface BuildSiteBrief {
  schemaVersion: 1;
  sourceSpaceSchemaVersion: number;
  player: LocalSpaceSnapshot["player"];
  bounds: LocalSpaceSnapshot["bounds"];
  summary: {
    siteKind: "rocky_riverside_slope" | "rocky_plateau" | "riverside_plain" | "built_edge" | "mixed";
    elevationRange: number;
    hasNearbyWater: boolean;
    slopeAxis: "north_south" | "east_west" | "mixed" | "flat";
    dominantSurfaceBlocks: string[];
  };
  symbolMaps: {
    surface: {
      legend: Record<string, string>;
      rows: string[];
    };
    height: {
      legend: Record<string, string>;
      rows: string[];
    };
  };
  recommendations: {
    foundationStyle: string;
    massingStrategy: string;
    roofProfile: string;
    entryOrientation: string;
    notes: string[];
  };
}

export function buildSiteBrief(space: LocalSpaceSnapshot): BuildSiteBrief {
  const columnsByKey = new Map(space.columns.map((column) => [`${column.x},${column.z}`, column] as const));
  const width = space.bounds.max.x - space.bounds.min.x + 1;
  const depth = space.bounds.max.z - space.bounds.min.z + 1;
  const surfaceRows: string[] = [];
  const heightRows: string[] = [];
  const heightValues = space.columns
    .map((column) => column.walkableY ?? column.highestOccupiedY)
    .filter((value): value is number => typeof value === "number");
  const minY = heightValues.length > 0 ? Math.min(...heightValues) : space.player.position.y;
  const maxY = heightValues.length > 0 ? Math.max(...heightValues) : space.player.position.y;

  for (let z = space.bounds.min.z; z <= space.bounds.max.z; z += 1) {
    let surfaceRow = "";
    let heightRow = "";

    for (let x = space.bounds.min.x; x <= space.bounds.max.x; x += 1) {
      const column = columnsByKey.get(`${x},${z}`);
      surfaceRow += classifySurfaceSymbol(column?.topBlockId ?? null);
      heightRow += classifyHeightSymbol(column?.walkableY ?? column?.highestOccupiedY ?? null, minY, maxY);
    }

    surfaceRows.push(surfaceRow);
    heightRows.push(heightRow);
  }

  const topBlocks = space.summary.topBlockCounts.slice(0, 4).map((entry) => entry.blockId);
  const hasNearbyWater = space.summary.fluidBlocks > 0 || topBlocks.some((blockId) => /water/.test(blockId));
  const rockLikeColumns = space.columns.filter((column) => isStoneLike(column.topBlockId)).length;
  const builtColumns = space.columns.filter((column) => isBuiltLike(column.topBlockId)).length;
  const slopeAxis = inferSlopeAxis(space);
  const elevationRange = maxY - minY;
  const siteKind = inferSiteKind({
    hasNearbyWater,
    rockLikeColumns,
    builtColumns,
    totalColumns: width * depth,
    elevationRange
  });

  return {
    schemaVersion: 1,
    sourceSpaceSchemaVersion: space.schemaVersion,
    player: space.player,
    bounds: space.bounds,
    summary: {
      siteKind,
      elevationRange,
      hasNearbyWater,
      slopeAxis,
      dominantSurfaceBlocks: topBlocks
    },
    symbolMaps: {
      surface: {
        legend: {
          "~": "water or liquid edge",
          "R": "stone-like ground",
          "G": "soil / grass / gravel ground",
          "B": "built surface or timber",
          "T": "tree or foliage",
          ".": "empty / unknown"
        },
        rows: surfaceRows
      },
      height: {
        legend: {
          "0-9A": "relative elevation bands from low to high",
          ".": "no sampled walkable height"
        },
        rows: heightRows
      }
    },
    recommendations: {
      foundationStyle: recommendFoundationStyle(siteKind, elevationRange),
      massingStrategy: recommendMassing(siteKind, slopeAxis),
      roofProfile: recommendRoofProfile(siteKind, hasNearbyWater),
      entryOrientation: recommendEntryOrientation(space),
      notes: buildNotes(siteKind, hasNearbyWater, slopeAxis, topBlocks)
    }
  };
}

function classifySurfaceSymbol(blockId: string | null): string {
  if (!blockId) {
    return ".";
  }
  if (blockId.includes("water")) {
    return "~";
  }
  if (blockId.includes("leaves") || blockId.includes("log")) {
    return "T";
  }
  if (isStoneLike(blockId)) {
    return "R";
  }
  if (isBuiltLike(blockId)) {
    return "B";
  }
  if (blockId.includes("grass") || blockId.includes("dirt") || blockId.includes("gravel") || blockId.includes("sand")) {
    return "G";
  }
  return "B";
}

function classifyHeightSymbol(value: number | null, minY: number, maxY: number): string {
  if (value === null) {
    return ".";
  }

  const palette = "0123456789A";
  const range = Math.max(1, maxY - minY);
  const index = Math.min(palette.length - 1, Math.round(((value - minY) / range) * (palette.length - 1)));
  return palette[index] ?? "0";
}

function inferSlopeAxis(space: LocalSpaceSnapshot): BuildSiteBrief["summary"]["slopeAxis"] {
  const columnsByKey = new Map(space.columns.map((column) => [`${column.x},${column.z}`, column] as const));
  let xDelta = 0;
  let zDelta = 0;

  for (const column of space.columns) {
    const east = columnsByKey.get(`${column.x + 1},${column.z}`);
    const south = columnsByKey.get(`${column.x},${column.z + 1}`);
    if (east?.walkableY !== null && east?.walkableY !== undefined && column.walkableY !== null && column.walkableY !== undefined) {
      xDelta += Math.abs(east.walkableY - column.walkableY);
    }
    if (south?.walkableY !== null && south?.walkableY !== undefined && column.walkableY !== null && column.walkableY !== undefined) {
      zDelta += Math.abs(south.walkableY - column.walkableY);
    }
  }

  if (xDelta === 0 && zDelta === 0) {
    return "flat";
  }
  if (Math.abs(xDelta - zDelta) <= Math.max(2, (xDelta + zDelta) * 0.1)) {
    return "mixed";
  }
  return zDelta > xDelta ? "north_south" : "east_west";
}

function inferSiteKind(input: {
  hasNearbyWater: boolean;
  rockLikeColumns: number;
  builtColumns: number;
  totalColumns: number;
  elevationRange: number;
}): BuildSiteBrief["summary"]["siteKind"] {
  const rockRatio = input.totalColumns === 0 ? 0 : input.rockLikeColumns / input.totalColumns;
  const builtRatio = input.totalColumns === 0 ? 0 : input.builtColumns / input.totalColumns;

  if (input.hasNearbyWater && rockRatio >= 0.3 && input.elevationRange >= 2) {
    return "rocky_riverside_slope";
  }
  if (!input.hasNearbyWater && rockRatio >= 0.25 && input.elevationRange <= 2) {
    return "rocky_plateau";
  }
  if (input.hasNearbyWater && rockRatio < 0.3) {
    return "riverside_plain";
  }
  if (builtRatio >= 0.35) {
    return "built_edge";
  }
  return "mixed";
}

function recommendFoundationStyle(siteKind: BuildSiteBrief["summary"]["siteKind"], elevationRange: number): string {
  if (siteKind === "rocky_riverside_slope") {
    return "terraced_stone_foundation with retaining edges";
  }
  if (siteKind === "rocky_plateau" || elevationRange >= 2) {
    return "stepped_stone_foundation with clipped corners";
  }
  if (siteKind === "riverside_plain") {
    return "pier_and_plinth_foundation above damp ground";
  }
  return "low_masonry_foundation";
}

function recommendMassing(siteKind: BuildSiteBrief["summary"]["siteKind"], slopeAxis: BuildSiteBrief["summary"]["slopeAxis"]): string {
  if (siteKind === "rocky_riverside_slope") {
    return "step massing along the slope with one cantilevered view edge";
  }
  if (slopeAxis === "north_south" || slopeAxis === "east_west") {
    return "step massing along the dominant slope axis";
  }
  return "compact asymmetric massing with one pushed-out facade";
}

function recommendRoofProfile(siteKind: BuildSiteBrief["summary"]["siteKind"], hasNearbyWater: boolean): string {
  if (siteKind === "rocky_riverside_slope") {
    return "split_shed_roof with deep eaves";
  }
  if (hasNearbyWater) {
    return "steep_shed_roof for rain runoff";
  }
  return "low_gable_roof";
}

function recommendEntryOrientation(space: LocalSpaceSnapshot): string {
  const north = averageHeadroom(space, (surface) => surface.z < space.player.position.z);
  const south = averageHeadroom(space, (surface) => surface.z > space.player.position.z);
  const east = averageHeadroom(space, (surface) => surface.x > space.player.position.x);
  const west = averageHeadroom(space, (surface) => surface.x < space.player.position.x);
  const scored: Array<[string, number]> = [
    ["north", north],
    ["south", south],
    ["east", east],
    ["west", west]
  ];
  scored.sort((left, right) => right[1] - left[1]);
  return `prefer ${scored[0]?.[0] ?? "south"} toward the most open face`;
}

function buildNotes(
  siteKind: BuildSiteBrief["summary"]["siteKind"],
  hasNearbyWater: boolean,
  slopeAxis: BuildSiteBrief["summary"]["slopeAxis"],
  topBlocks: string[]
): string[] {
  const notes = [`dominant surface palette: ${topBlocks.join(", ") || "unknown"}`];
  if (hasNearbyWater) {
    notes.push("water nearby: favor view-oriented windows, deep eaves, and raised thresholds");
  }
  if (siteKind === "rocky_riverside_slope") {
    notes.push("blend the lower mass into rock with stone retaining walls instead of a flat box plinth");
  }
  if (slopeAxis !== "flat") {
    notes.push(`terrain falls mostly along the ${slopeAxis} axis; terrace instead of forcing a single flat pad`);
  }
  return notes;
}

function averageHeadroom(
  space: LocalSpaceSnapshot,
  predicate: (surface: LocalSpaceSnapshot["walkableSurfaces"][number]) => boolean
): number {
  const matches = space.walkableSurfaces.filter(predicate);
  if (matches.length === 0) {
    return 0;
  }

  return matches.reduce((sum, surface) => sum + surface.headroom, 0) / matches.length;
}

function isStoneLike(blockId: string | null): boolean {
  return !!blockId && /(stone|cobble|brick|andesite|diorite|granite|tuff|deepslate|slate)/.test(blockId);
}

function isBuiltLike(blockId: string | null): boolean {
  return !!blockId && /(planks|slab|stairs|fence|glass|door|trapdoor|terracotta|wool|bookshelf|crafting_table|furnace|chest)/.test(blockId);
}
