import type {
  BlockPosition,
  LocalSpaceSnapshot,
  SpacePointOfInterest,
  WalkableSurface
} from "../bridge/client.js";

export type SceneKind = "settlement" | "built" | "cultivated" | "natural" | "mixed";
export type RegionKind = "settlement_core" | "cultivated_patch" | "built_platform" | "tree_cover" | "natural_ground";
export type StructureKind = "bed_cluster" | "villager_presence" | "workstation" | "storage" | "cultivated_land" | "tree_canopy";
export type BuildabilityStatus = "suitable" | "constrained" | "blocked";

export interface BuildCandidateAnchor extends BlockPosition {
  blockId: string;
  headroom: number;
  flatnessScore: number;
}

export interface SpaceModelRegion {
  id: string;
  kind: RegionKind;
  bounds: {
    min: BlockPosition;
    max: BlockPosition;
  };
  walkableSurfaceCount: number;
  averageY: number;
  dominantBlockIds: string[];
  poiCount: number;
}

export interface SpaceModelStructure {
  kind: StructureKind;
  confidence: number;
  anchor: BlockPosition;
  evidence: string[];
}

export interface LocalSpaceModel {
  schemaVersion: number;
  sourceSpaceSchemaVersion: number;
  player: LocalSpaceSnapshot["player"];
  bounds: LocalSpaceSnapshot["bounds"];
  summary: {
    dominantSceneKind: SceneKind;
    occupancyRatio: number;
    walkableRatio: number;
    topSurfaceBlocks: string[];
  };
  regions: SpaceModelRegion[];
  structures: SpaceModelStructure[];
  buildability: {
    status: BuildabilityStatus;
    reasons: string[];
    candidateAnchors: BuildCandidateAnchor[];
  };
}

const MODEL_SCHEMA_VERSION = 1;
const SETTLEMENT_POI_MARKERS = ["villager", "bed", "lectern", "chest", "lootr_chest"];
const SETTLEMENT_REGION_MARKERS = ["villager", "bed", "lectern"];
const WORKSTATION_MARKERS = ["lectern", "composter", "smithing", "cartography", "grindstone", "loom", "stonecutter"];
const STORAGE_MARKERS = ["chest", "barrel", "shulker", "lootr_chest"];

export function buildSpaceModel(space: LocalSpaceSnapshot): LocalSpaceModel {
  const walkableIndex = new Map(space.walkableSurfaces.map((surface) => [surfaceKey(surface), surface] as const));
  const regions = clusterWalkableRegions(space);
  const structures = detectStructures(space);
  const candidateAnchors = pickCandidateAnchors(space, walkableIndex);
  const buildability = evaluateBuildability(space, regions, structures, candidateAnchors);

  return {
    schemaVersion: MODEL_SCHEMA_VERSION,
    sourceSpaceSchemaVersion: space.schemaVersion,
    player: space.player,
    bounds: space.bounds,
    summary: {
      dominantSceneKind: classifyScene(space, regions, structures),
      occupancyRatio: ratio(space.summary.occupiedBlocks, space.summary.sampledBlocks),
      walkableRatio: ratio(space.summary.walkableSurfaceCount, space.summary.sampledColumns),
      topSurfaceBlocks: space.summary.topBlockCounts.slice(0, 5).map((entry) => entry.blockId)
    },
    regions,
    structures,
    buildability
  };
}

function clusterWalkableRegions(space: LocalSpaceSnapshot): SpaceModelRegion[] {
  const surfaces = [...space.walkableSurfaces];
  const byKey = new Map(surfaces.map((surface) => [surfaceKey(surface), surface] as const));
  const visited = new Set<string>();
  const regions: SpaceModelRegion[] = [];

  for (const surface of surfaces) {
    const key = surfaceKey(surface);
    if (visited.has(key)) {
      continue;
    }

    const queue = [surface];
    const cluster: WalkableSurface[] = [];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        continue;
      }

      cluster.push(current);
      for (const neighbor of adjacentWalkableSurfaces(current, byKey)) {
        const neighborKey = surfaceKey(neighbor);
        if (visited.has(neighborKey)) {
          continue;
        }
        visited.add(neighborKey);
        queue.push(neighbor);
      }
    }

    const pois = poisNearCluster(space.pointsOfInterest, cluster);
    const kind = classifyRegion(cluster, pois);
    const xs = cluster.map((surface) => surface.x);
    const ys = cluster.map((surface) => surface.y);
    const zs = cluster.map((surface) => surface.z);
    const blockCounts = countBlockIds(cluster.map((surface) => surface.blockId));

    regions.push({
      id: `${kind}_${regions.length + 1}`,
      kind,
      bounds: {
        min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
        max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) }
      },
      walkableSurfaceCount: cluster.length,
      averageY: average(ys),
      dominantBlockIds: sortCounts(blockCounts).slice(0, 3).map((entry) => entry[0]),
      poiCount: pois.length
    });
  }

  return regions.sort((left, right) => right.walkableSurfaceCount - left.walkableSurfaceCount);
}

function detectStructures(space: LocalSpaceSnapshot): SpaceModelStructure[] {
  const structures: SpaceModelStructure[] = [];
  const villagers = space.pointsOfInterest.filter((poi) => hasMarker(poi.kindId, ["villager"]));
  const beds = space.pointsOfInterest.filter((poi) => hasMarker(poi.kindId, ["bed"]));
  const workstations = space.pointsOfInterest.filter((poi) => hasMarker(poi.kindId, WORKSTATION_MARKERS));
  const storage = space.pointsOfInterest.filter((poi) => hasMarker(poi.kindId, STORAGE_MARKERS));
  const cultivatedSurfaces = space.walkableSurfaces.filter((surface) => isCultivatedBlock(surface.blockId));
  const treeSurfaces = space.walkableSurfaces.filter((surface) => isTreeBlock(surface.blockId));

  if (beds.length >= 2) {
    structures.push({
      kind: "bed_cluster",
      confidence: 0.92,
      anchor: averagePosition(beds.map((poi) => poi.position)),
      evidence: beds.slice(0, 3).map((poi) => poi.kindId)
    });
  }

  if (villagers.length >= 1) {
    structures.push({
      kind: "villager_presence",
      confidence: villagers.length >= 2 ? 0.95 : 0.78,
      anchor: averagePosition(villagers.map((poi) => poi.position)),
      evidence: villagers.slice(0, 3).map((poi) => poi.label)
    });
  }

  if (workstations.length >= 1) {
    structures.push({
      kind: "workstation",
      confidence: 0.88,
      anchor: averagePosition(workstations.map((poi) => poi.position)),
      evidence: workstations.slice(0, 3).map((poi) => poi.kindId)
    });
  }

  if (storage.length >= 1) {
    structures.push({
      kind: "storage",
      confidence: 0.82,
      anchor: averagePosition(storage.map((poi) => poi.position)),
      evidence: storage.slice(0, 3).map((poi) => poi.kindId)
    });
  }

  if (cultivatedSurfaces.length >= 3) {
    structures.push({
      kind: "cultivated_land",
      confidence: 0.84,
      anchor: averagePosition(cultivatedSurfaces),
      evidence: [...new Set(cultivatedSurfaces.slice(0, 3).map((surface) => surface.blockId))]
    });
  }

  if (treeSurfaces.length >= 3) {
    structures.push({
      kind: "tree_canopy",
      confidence: 0.8,
      anchor: averagePosition(treeSurfaces),
      evidence: [...new Set(treeSurfaces.slice(0, 3).map((surface) => surface.blockId))]
    });
  }

  return structures;
}

function pickCandidateAnchors(
  space: LocalSpaceSnapshot,
  walkableIndex: Map<string, WalkableSurface>
): BuildCandidateAnchor[] {
  return space.walkableSurfaces
    .filter((surface) => !isCultivatedBlock(surface.blockId) && !isTreeBlock(surface.blockId))
    .filter((surface) => !isNearSettlementPoi(surface, space.pointsOfInterest))
    .map((surface) => ({
      ...surface,
      flatnessScore: calculateFlatness(surface, walkableIndex)
    }))
    .filter((surface) => surface.flatnessScore >= 0.25)
    .sort((left, right) =>
      right.flatnessScore - left.flatnessScore ||
      right.headroom - left.headroom ||
      manhattanDistance(left, space.player.position) - manhattanDistance(right, space.player.position) ||
      left.x - right.x ||
      left.z - right.z
    )
    .slice(0, 5)
    .map((surface) => ({
      x: surface.x,
      y: surface.y,
      z: surface.z,
      blockId: surface.blockId,
      headroom: surface.headroom,
      flatnessScore: Number(surface.flatnessScore.toFixed(3))
    }));
}

function evaluateBuildability(
  space: LocalSpaceSnapshot,
  regions: SpaceModelRegion[],
  structures: SpaceModelStructure[],
  candidateAnchors: BuildCandidateAnchor[]
) {
  const reasons: string[] = [];
  const hasSettlementRegion = regions.some((region) => region.kind === "settlement_core");
  const hasVillagers = structures.some((structure) => structure.kind === "villager_presence");
  const hasBeds = structures.some((structure) => structure.kind === "bed_cluster");
  const hasCultivatedRegion = regions.some((region) => region.kind === "cultivated_patch");

  if (hasSettlementRegion || (hasVillagers && hasBeds)) {
    reasons.push("settlement_poi_density");
  }

  if (hasCultivatedRegion) {
    reasons.push("cultivated_surface_present");
  }

  if (space.summary.fluidBlocks > 0) {
    reasons.push("nearby_fluid");
  }

  if (candidateAnchors.length === 0) {
    reasons.push("no_flat_build_anchor");
  }

  let status: BuildabilityStatus = "suitable";
  if (reasons.includes("settlement_poi_density")) {
    status = "blocked";
  } else if (reasons.length > 0) {
    status = "constrained";
  }

  return {
    status,
    reasons,
    candidateAnchors
  };
}

function classifyScene(
  space: LocalSpaceSnapshot,
  regions: SpaceModelRegion[],
  structures: SpaceModelStructure[]
): SceneKind {
  const counts = countBlockIds(space.walkableSurfaces.map((surface) => surface.blockId));
  const total = Math.max(space.walkableSurfaces.length, 1);
  const builtShare = shareByPredicate(counts, total, isBuiltBlock);
  const cultivatedShare = shareByPredicate(counts, total, isCultivatedBlock);
  const treeShare = shareByPredicate(counts, total, isTreeBlock);
  const hasSettlementRegion = regions.some((region) => region.kind === "settlement_core");
  const hasVillagerPresence = structures.some((structure) => structure.kind === "villager_presence");
  const hasBeds = structures.some((structure) => structure.kind === "bed_cluster");

  if (hasSettlementRegion || (hasVillagerPresence && hasBeds)) {
    return "settlement";
  }

  if (cultivatedShare >= 0.45) {
    return "cultivated";
  }

  if (builtShare >= 0.45) {
    return "built";
  }

  if (treeShare >= 0.4 || builtShare + cultivatedShare <= 0.25) {
    return "natural";
  }

  return "mixed";
}

function classifyRegion(cluster: WalkableSurface[], pois: SpacePointOfInterest[]): RegionKind {
  const counts = countBlockIds(cluster.map((surface) => surface.blockId));
  const total = Math.max(cluster.length, 1);
  const settlementPoiCount = pois.filter((poi) => hasMarker(poi.kindId, SETTLEMENT_REGION_MARKERS)).length;
  const builtShare = shareByPredicate(counts, total, isBuiltBlock);
  const cultivatedShare = shareByPredicate(counts, total, isCultivatedBlock);
  const treeShare = shareByPredicate(counts, total, isTreeBlock);

  if (cultivatedShare >= 0.35 || pois.some((poi) => hasMarker(poi.kindId, ["composter"]))) {
    return "cultivated_patch";
  }

  if (treeShare >= 0.4) {
    return "tree_cover";
  }

  if (settlementPoiCount >= 2 || (settlementPoiCount >= 1 && builtShare >= 0.25)) {
    return "settlement_core";
  }

  if (builtShare >= 0.4) {
    return "built_platform";
  }

  return "natural_ground";
}

function adjacentWalkableSurfaces(
  surface: WalkableSurface,
  byKey: Map<string, WalkableSurface>
): WalkableSurface[] {
  const neighbors: WalkableSurface[] = [];
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (const [dx, dz] of offsets) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const neighbor = byKey.get(`${surface.x + dx},${surface.y + dy},${surface.z + dz}`);
      if (neighbor !== undefined) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

function poisNearCluster(pois: SpacePointOfInterest[], cluster: WalkableSurface[]): SpacePointOfInterest[] {
  return pois.filter((poi) =>
    cluster.some((surface) =>
      Math.abs(surface.x - poi.position.x) <= 2 &&
      Math.abs(surface.y - poi.position.y) <= 2 &&
      Math.abs(surface.z - poi.position.z) <= 2
    )
  );
}

function isNearSettlementPoi(surface: WalkableSurface, pois: SpacePointOfInterest[]): boolean {
  return pois.some((poi) =>
    hasMarker(poi.kindId, SETTLEMENT_POI_MARKERS) &&
    Math.abs(surface.x - poi.position.x) <= 2 &&
    Math.abs(surface.y - poi.position.y) <= 2 &&
    Math.abs(surface.z - poi.position.z) <= 2
  );
}

function calculateFlatness(surface: WalkableSurface, walkableIndex: Map<string, WalkableSurface>): number {
  let matches = 0;
  let samples = 0;

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      if (dx === 0 && dz === 0) {
        continue;
      }

      samples += 1;
      const neighbor = walkableIndex.get(`${surface.x + dx},${surface.y},${surface.z + dz}`);
      if (neighbor !== undefined) {
        matches += 1;
      }
    }
  }

  return samples === 0 ? 0 : matches / samples;
}

function average(values: number[]): number {
  return Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(2));
}

function averagePosition(points: Array<BlockPosition | WalkableSurface>): BlockPosition {
  const x = Math.round(points.reduce((sum, point) => sum + point.x, 0) / Math.max(points.length, 1));
  const y = Math.round(points.reduce((sum, point) => sum + point.y, 0) / Math.max(points.length, 1));
  const z = Math.round(points.reduce((sum, point) => sum + point.z, 0) / Math.max(points.length, 1));
  return { x, y, z };
}

function countBlockIds(blockIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const blockId of blockIds) {
    counts.set(blockId, (counts.get(blockId) ?? 0) + 1);
  }
  return counts;
}

function sortCounts(counts: Map<string, number>): Array<[string, number]> {
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function shareByPredicate(
  counts: Map<string, number>,
  total: number,
  predicate: (blockId: string) => boolean
): number {
  let matched = 0;
  for (const [blockId, count] of counts.entries()) {
    if (predicate(blockId)) {
      matched += count;
    }
  }
  return matched / total;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function manhattanDistance(left: BlockPosition, right: BlockPosition): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y) + Math.abs(left.z - right.z);
}

function surfaceKey(surface: Pick<WalkableSurface, "x" | "y" | "z">): string {
  return `${surface.x},${surface.y},${surface.z}`;
}

function hasMarker(value: string, markers: string[]): boolean {
  return markers.some((marker) => value.includes(marker));
}

function isCultivatedBlock(blockId: string): boolean {
  return hasMarker(blockId, ["farmland", "composter", "crop", "wheat", "carrots", "potatoes", "beetroots"]);
}

function isTreeBlock(blockId: string): boolean {
  return hasMarker(blockId, ["leaves", "_log", "mangrove_roots", "sapling"]);
}

function isBuiltBlock(blockId: string): boolean {
  return hasMarker(blockId, [
    "planks",
    "stairs",
    "slab",
    "fence",
    "trapdoor",
    "terracotta",
    "wool",
    "brick",
    "glass",
    "cobblestone",
    "stone_bricks",
    "door"
  ]);
}
