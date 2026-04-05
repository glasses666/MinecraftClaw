import type { BlockPosition, LocalSpaceSnapshot } from "../bridge/client.js";

export interface SliceBounds {
  min: BlockPosition;
  max: BlockPosition;
}

export interface VoxelSlice {
  y: number;
  rows: string[];
}

export interface LocalSpaceVoxelSlices {
  schemaVersion: number;
  sourceSpaceSchemaVersion: number;
  focusBounds: SliceBounds;
  occupiedBounds: SliceBounds | null;
  legend: Record<string, string>;
  slices: VoxelSlice[];
  summary: {
    width: number;
    depth: number;
    height: number;
    occupiedCells: number;
    nonEmptySliceCount: number;
  };
}

export function buildVoxelSlices(
  space: LocalSpaceSnapshot,
  focusBounds?: SliceBounds
): LocalSpaceVoxelSlices {
  const focus = clampBounds(focusBounds ?? space.bounds, space.bounds);
  const voxels = new Map<string, string>();
  let occupiedBounds: SliceBounds | null = null;

  for (const column of space.columns) {
    if (column.x < focus.min.x || column.x > focus.max.x || column.z < focus.min.z || column.z > focus.max.z) {
      continue;
    }

    for (const run of column.occupiedRuns) {
      const startY = Math.max(run.startY, focus.min.y);
      const endY = Math.min(run.endY, focus.max.y);
      if (startY > endY) {
        continue;
      }

      for (let y = startY; y <= endY; y += 1) {
        voxels.set(key(column.x, y, column.z), run.blockId);
        occupiedBounds = extendBounds(occupiedBounds, { x: column.x, y, z: column.z });
      }
    }
  }

  const bounds = occupiedBounds ?? focus;
  const slices: VoxelSlice[] = [];

  for (let y = bounds.max.y; y >= bounds.min.y; y -= 1) {
    const rows: string[] = [];
    let occupiedCells = 0;

    for (let z = bounds.min.z; z <= bounds.max.z; z += 1) {
      let row = "";
      for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
        const blockId = voxels.get(key(x, y, z));
        const symbol = blockId === undefined ? "." : classifyBlock(blockId);
        if (symbol !== ".") {
          occupiedCells += 1;
        }
        row += symbol;
      }
      rows.push(row);
    }

    if (occupiedCells > 0) {
      slices.push({ y, rows });
    }
  }

  return {
    schemaVersion: 1,
    sourceSpaceSchemaVersion: space.schemaVersion,
    focusBounds: focus,
    occupiedBounds,
    legend: {
      ".": "empty",
      "S": "stone-like",
      "W": "wood-like",
      "G": "glass-like",
      "L": "light-or-fire",
      "F": "furniture-or-utility",
      "N": "natural-soft",
      "M": "miscellaneous-solid"
    },
    slices,
    summary: {
      width: bounds.max.x - bounds.min.x + 1,
      depth: bounds.max.z - bounds.min.z + 1,
      height: bounds.max.y - bounds.min.y + 1,
      occupiedCells: voxels.size,
      nonEmptySliceCount: slices.length
    }
  };
}

function classifyBlock(blockId: string): string {
  if (/(stone|cobblestone|tuff|brick|slab|wall|deepslate|travertine)/.test(blockId)) {
    return "S";
  }
  if (/(planks|log|wood|fence|door|trapdoor|bookshelf)/.test(blockId)) {
    return "W";
  }
  if (/glass/.test(blockId)) {
    return "G";
  }
  if (/(lantern|campfire|torch|glowstone|shroomlight)/.test(blockId)) {
    return "L";
  }
  if (/(bed|chest|crafting_table|barrel|lectern|furnace|smoker|loom)/.test(blockId)) {
    return "F";
  }
  if (/(grass|dirt|sand|gravel|leaves|water|mud)/.test(blockId)) {
    return "N";
  }
  return "M";
}

function clampBounds(bounds: SliceBounds, spaceBounds: LocalSpaceSnapshot["bounds"]): SliceBounds {
  return {
    min: {
      x: Math.max(bounds.min.x, spaceBounds.min.x),
      y: Math.max(bounds.min.y, spaceBounds.min.y),
      z: Math.max(bounds.min.z, spaceBounds.min.z)
    },
    max: {
      x: Math.min(bounds.max.x, spaceBounds.max.x),
      y: Math.min(bounds.max.y, spaceBounds.max.y),
      z: Math.min(bounds.max.z, spaceBounds.max.z)
    }
  };
}

function extendBounds(current: SliceBounds | null, point: BlockPosition): SliceBounds {
  if (current === null) {
    return { min: { ...point }, max: { ...point } };
  }

  return {
    min: {
      x: Math.min(current.min.x, point.x),
      y: Math.min(current.min.y, point.y),
      z: Math.min(current.min.z, point.z)
    },
    max: {
      x: Math.max(current.max.x, point.x),
      y: Math.max(current.max.y, point.y),
      z: Math.max(current.max.z, point.z)
    }
  };
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
