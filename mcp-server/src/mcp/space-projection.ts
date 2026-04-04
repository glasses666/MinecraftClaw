import type { BlockPosition, LocalSpaceSnapshot } from "../bridge/client.js";

export interface ProjectionBounds {
  min: BlockPosition;
  max: BlockPosition;
}

export interface ProjectionPlane {
  width: number;
  height: number;
  rows: string[];
}

export interface LocalSpaceProjection {
  schemaVersion: number;
  sourceSpaceSchemaVersion: number;
  focusBounds: ProjectionBounds;
  occupiedBounds: ProjectionBounds | null;
  topView: ProjectionPlane;
  northElevation: ProjectionPlane;
  westElevation: ProjectionPlane;
  legend: Record<string, string>;
  summary: {
    occupiedColumns: number;
    occupiedCells: number;
    width: number;
    depth: number;
    height: number;
  };
}

export function projectLocalSpace(
  space: LocalSpaceSnapshot,
  focusBounds?: ProjectionBounds
): LocalSpaceProjection {
  const focus = clampBounds(focusBounds ?? space.bounds, space.bounds);
  const voxels = new Map<string, string>();
  let occupiedBounds: ProjectionBounds | null = null;

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
  const topView = renderTopView(voxels, bounds);
  const northElevation = renderNorthElevation(voxels, bounds);
  const westElevation = renderWestElevation(voxels, bounds);

  return {
    schemaVersion: 1,
    sourceSpaceSchemaVersion: space.schemaVersion,
    focusBounds: focus,
    occupiedBounds,
    topView,
    northElevation,
    westElevation,
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
    summary: {
      occupiedColumns: countOccupiedColumns(voxels, bounds),
      occupiedCells: voxels.size,
      width: bounds.max.x - bounds.min.x + 1,
      depth: bounds.max.z - bounds.min.z + 1,
      height: bounds.max.y - bounds.min.y + 1
    }
  };
}

function renderTopView(voxels: Map<string, string>, bounds: ProjectionBounds): ProjectionPlane {
  const rows: string[] = [];

  for (let z = bounds.min.z; z <= bounds.max.z; z += 1) {
    let row = "";
    for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
      row += visibleFromTop(voxels, bounds, x, z);
    }
    rows.push(row);
  }

  return {
    width: bounds.max.x - bounds.min.x + 1,
    height: bounds.max.z - bounds.min.z + 1,
    rows
  };
}

function renderNorthElevation(voxels: Map<string, string>, bounds: ProjectionBounds): ProjectionPlane {
  const rows: string[] = [];

  for (let y = bounds.max.y; y >= bounds.min.y; y -= 1) {
    let row = "";
    for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
      row += visibleFromNorth(voxels, bounds, x, y);
    }
    rows.push(row);
  }

  return {
    width: bounds.max.x - bounds.min.x + 1,
    height: bounds.max.y - bounds.min.y + 1,
    rows
  };
}

function renderWestElevation(voxels: Map<string, string>, bounds: ProjectionBounds): ProjectionPlane {
  const rows: string[] = [];

  for (let y = bounds.max.y; y >= bounds.min.y; y -= 1) {
    let row = "";
    for (let z = bounds.min.z; z <= bounds.max.z; z += 1) {
      row += visibleFromWest(voxels, bounds, z, y);
    }
    rows.push(row);
  }

  return {
    width: bounds.max.z - bounds.min.z + 1,
    height: bounds.max.y - bounds.min.y + 1,
    rows
  };
}

function visibleFromTop(voxels: Map<string, string>, bounds: ProjectionBounds, x: number, z: number): string {
  for (let y = bounds.max.y; y >= bounds.min.y; y -= 1) {
    const blockId = voxels.get(key(x, y, z));
    if (blockId !== undefined) {
      return classifyBlock(blockId);
    }
  }

  return ".";
}

function visibleFromNorth(voxels: Map<string, string>, bounds: ProjectionBounds, x: number, y: number): string {
  for (let z = bounds.max.z; z >= bounds.min.z; z -= 1) {
    const blockId = voxels.get(key(x, y, z));
    if (blockId !== undefined) {
      return classifyBlock(blockId);
    }
  }

  return ".";
}

function visibleFromWest(voxels: Map<string, string>, bounds: ProjectionBounds, z: number, y: number): string {
  for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
    const blockId = voxels.get(key(x, y, z));
    if (blockId !== undefined) {
      return classifyBlock(blockId);
    }
  }

  return ".";
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

function clampBounds(bounds: ProjectionBounds, spaceBounds: LocalSpaceSnapshot["bounds"]): ProjectionBounds {
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

function extendBounds(current: ProjectionBounds | null, point: BlockPosition): ProjectionBounds {
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

function countOccupiedColumns(voxels: Map<string, string>, bounds: ProjectionBounds): number {
  let count = 0;
  for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
    for (let z = bounds.min.z; z <= bounds.max.z; z += 1) {
      for (let y = bounds.min.y; y <= bounds.max.y; y += 1) {
        if (voxels.has(key(x, y, z))) {
          count += 1;
          break;
        }
      }
    }
  }
  return count;
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
