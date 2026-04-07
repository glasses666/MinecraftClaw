import { normalizeRuntimeBlueprint, type RuntimeBlueprint } from "../builder/runtime-blueprint.js";
import type {
  DesignCandidate,
  DesignCandidateResponse,
  DesignProviderRequest,
  LoadedDesignSnapshot,
  PaletteLegendEntry
} from "./types.js";

export function generateDesignCandidates(
  snapshot: LoadedDesignSnapshot,
  provider: DesignProviderRequest
): DesignCandidateResponse {
  const candidates = buildSeedCandidates(snapshot).map((candidate) => {
    const normalized = normalizeRuntimeBlueprint(candidate.localBlueprintJson);
    if (normalized instanceof Error) {
      return {
        ...candidate,
        validation: {
          valid: false,
          errors: [normalized.message]
        }
      };
    }

    return {
      ...candidate,
      localBlueprintJson: normalized,
      materialsRequired: computeMaterialRequirements(normalized),
      validation: {
        valid: true,
        errors: []
      }
    };
  });

  return {
    snapshotId: snapshot.request.snapshotId,
    provider: {
      name: provider.providerName,
      model: provider.modelName
    },
    candidates
  };
}

function buildSeedCandidates(snapshot: LoadedDesignSnapshot): DesignCandidate[] {
  const { width, height, depth } = snapshot.request.selection.dimensions;
  const baseY = 1;
  const candidates = [
    {
      id: "compact-cliff-study",
      title: "Compact Cliff Study",
      description: "A compact study hut pressed into the selected volume with a front viewing face.",
      styleTags: ["compact", "cliffside", "reading_nook"],
      footprintWidth: clamp(Math.min(width - 2, 6), 4, width),
      footprintDepth: clamp(Math.min(depth - 2, 6), 4, depth),
      buildHeight: clamp(Math.min(height - 2, 5), 4, height)
    },
    {
      id: "lookout-cabin",
      title: "Lookout Cabin",
      description: "A slightly wider lookout cabin with a framed front edge and dense rear mass.",
      styleTags: ["lookout", "cabin", "warm"],
      footprintWidth: clamp(Math.min(width - 2, 8), 5, width),
      footprintDepth: clamp(Math.min(depth - 2, 7), 5, depth),
      buildHeight: clamp(Math.min(height - 2, 6), 4, height)
    },
    {
      id: "terrace-retreat",
      title: "Terrace Retreat",
      description: "A terraced retreat with a broader base and a compact sleeping loft volume.",
      styleTags: ["terrace", "retreat", "layered"],
      footprintWidth: clamp(Math.min(width - 2, 9), 5, width),
      footprintDepth: clamp(Math.min(depth - 2, 8), 5, depth),
      buildHeight: clamp(Math.min(height - 2, 6), 4, height)
    }
  ];

  return candidates.map((seed, index) => {
    const minX = index === 0 ? 1 : Math.max(1, Math.floor((width - seed.footprintWidth) / 2));
    const minZ = Math.max(1, Math.floor((depth - seed.footprintDepth) / 2));
    const maxX = Math.min(width - 2, minX + seed.footprintWidth - 1);
    const maxZ = Math.min(depth - 2, minZ + seed.footprintDepth - 1);
    const roofY = Math.min(height - 1, baseY + seed.buildHeight);
    const wallTopY = Math.max(baseY + 2, roofY - 1);
    const doorX = minX + 1;
    const centerX = Math.min(maxX, minX + Math.floor(seed.footprintWidth / 2));
    const centerZ = minZ + Math.floor(seed.footprintDepth / 2);

    const blueprint: RuntimeBlueprint = {
      id: seed.id,
      width,
      depth,
      height,
      steps: [
        {
          kind: "fill",
          from: { x: minX, y: baseY, z: minZ },
          to: { x: maxX, y: baseY, z: maxZ },
          blockId: index === 2 ? "minecraft:stone_bricks" : "minecraft:spruce_planks"
        },
        {
          kind: "fill",
          from: { x: minX, y: baseY + 1, z: minZ },
          to: { x: maxX, y: wallTopY, z: minZ },
          blockId: "minecraft:spruce_planks"
        },
        {
          kind: "fill",
          from: { x: minX, y: baseY + 1, z: maxZ },
          to: { x: maxX, y: wallTopY, z: maxZ },
          blockId: "minecraft:spruce_planks"
        },
        {
          kind: "fill",
          from: { x: minX, y: baseY + 1, z: minZ + 1 },
          to: { x: minX, y: wallTopY, z: maxZ - 1 },
          blockId: "minecraft:stripped_spruce_log"
        },
        {
          kind: "fill",
          from: { x: maxX, y: baseY + 1, z: minZ + 1 },
          to: { x: maxX, y: wallTopY, z: maxZ - 1 },
          blockId: "minecraft:glass"
        },
        {
          kind: "fill",
          from: { x: minX + 1, y: baseY + 1, z: minZ + 1 },
          to: { x: maxX - 1, y: wallTopY, z: maxZ - 1 },
          blockId: "minecraft:air"
        },
        {
          kind: "fill",
          from: { x: minX, y: roofY, z: minZ },
          to: { x: maxX, y: roofY, z: maxZ },
          blockId: index === 1 ? "minecraft:dark_oak_planks" : "minecraft:spruce_slab"
        },
        {
          kind: "command",
          commandTemplate: "setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false]",
          offset: { x: doorX, y: baseY + 1, z: minZ }
        },
        {
          kind: "command",
          commandTemplate: "setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false]",
          offset: { x: doorX, y: baseY + 2, z: minZ }
        },
        {
          kind: "command",
          commandTemplate: "setblock {x} {y} {z} minecraft:lantern[hanging=true]",
          offset: { x: centerX, y: roofY, z: centerZ }
        }
      ]
    };

    return {
      candidateId: seed.id,
      title: seed.title,
      description: seed.description,
      styleTags: seed.styleTags,
      visualBlueprint: buildVisualBlueprint(snapshot.spaceContext.legend, blueprint),
      localBlueprintJson: blueprint,
      materialsRequired: [],
      validation: {
        valid: false,
        errors: []
      }
    };
  });
}

function buildVisualBlueprint(
  sourceLegend: Record<string, PaletteLegendEntry>,
  blueprint: RuntimeBlueprint
) {
  const legend: Record<string, PaletteLegendEntry> = {
    ".": sourceLegend["."] ?? {
      token: ".",
      label: "air",
      blockIds: ["minecraft:air"]
    },
    W1: {
      token: "W1",
      label: "timber shell",
      blockIds: ["minecraft:spruce_planks", "minecraft:stripped_spruce_log", "minecraft:dark_oak_planks", "minecraft:spruce_slab"]
    },
    G1: {
      token: "G1",
      label: "glass face",
      blockIds: ["minecraft:glass"]
    },
    L1: {
      token: "L1",
      label: "lantern",
      blockIds: ["minecraft:lantern"]
    }
  };

  const occupancy = new Map<string, string>();
  for (const step of blueprint.steps) {
    if (step.kind === "fill") {
      for (let x = Math.min(step.from.x, step.to.x); x <= Math.max(step.from.x, step.to.x); x += 1) {
        for (let y = Math.min(step.from.y, step.to.y); y <= Math.max(step.from.y, step.to.y); y += 1) {
          for (let z = Math.min(step.from.z, step.to.z); z <= Math.max(step.from.z, step.to.z); z += 1) {
            occupancy.set(keyOf(x, y, z), tokenForBlock(step.blockId));
          }
        }
      }
      continue;
    }

    if (step.kind === "block") {
      occupancy.set(keyOf(step.at.x, step.at.y, step.at.z), tokenForBlock(step.blockId));
      continue;
    }

    occupancy.set(keyOf(step.offset.x, step.offset.y, step.offset.z), tokenForCommand(step.commandTemplate));
  }

  const interestingLayers = [0, Math.floor(blueprint.height / 2), blueprint.height - 1]
    .map((y) => clamp(y, 0, blueprint.height - 1))
    .filter((value, index, values) => values.indexOf(value) === index);

  return {
    legend,
    slices: interestingLayers.map((y) => ({
      y,
      rows: Array.from({ length: blueprint.depth }, (_, z) =>
        Array.from({ length: blueprint.width }, (_, x) => occupancy.get(keyOf(x, y, z)) ?? ".").join(" ")
      )
    }))
  };
}

function tokenForBlock(blockId: string): string {
  if (blockId.includes("glass")) {
    return "G1";
  }
  return "W1";
}

function tokenForCommand(commandTemplate: string): string {
  return commandTemplate.includes("lantern") ? "L1" : "W1";
}

function computeMaterialRequirements(blueprint: RuntimeBlueprint) {
  const counts = new Map<string, number>();

  for (const step of blueprint.steps) {
    if (step.kind === "fill") {
      if (step.blockId === "minecraft:air") {
        continue;
      }
      const blockCount =
        (Math.abs(step.to.x - step.from.x) + 1) *
        (Math.abs(step.to.y - step.from.y) + 1) *
        (Math.abs(step.to.z - step.from.z) + 1);
      counts.set(step.blockId, (counts.get(step.blockId) ?? 0) + blockCount);
      continue;
    }

    if (step.kind === "block") {
      counts.set(step.blockId, (counts.get(step.blockId) ?? 0) + 1);
      continue;
    }

    const blockId = extractSetBlockId(step.commandTemplate);
    if (blockId !== null && blockId !== "minecraft:air") {
      counts.set(blockId, (counts.get(blockId) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, required]) => ({ itemId, required }));
}

function extractSetBlockId(commandTemplate: string): string | null {
  const match = commandTemplate.match(/setblock\s+\{x\}\s+\{y\}\s+\{z\}\s+([^\s]+)/i);
  if (!match?.[1]) {
    return null;
  }

  return match[1].replace(/\[.*$/, "");
}

function keyOf(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
