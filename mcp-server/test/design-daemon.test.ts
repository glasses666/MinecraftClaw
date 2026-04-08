import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { generateDesignCandidates } from "../src/design/candidate-generator.js";
import { loadDesignSnapshot } from "../src/design/snapshot.js";

test("loadDesignSnapshot reads a request.json plus referenced context files", async () => {
  const fixture = await createSnapshotFixture();
  const snapshot = await loadDesignSnapshot(fixture.rootDir);

  assert.equal(snapshot.request.snapshotId, "snap_test_01");
  assert.equal(snapshot.request.selection.dimensions.width, 12);
  assert.equal(snapshot.spaceContext.slices.length, 2);
  assert.equal(snapshot.environmentViews.views.length, 5);
  assert.equal(snapshot.environmentViews.views[0]?.imageFile, "environment-north.png");
  assert.equal(snapshot.environmentViews.views[4]?.imageFile, "environment-top-down.png");
  assert.equal(snapshot.gameContext.mods[0]?.id, "minecraft");
});

test("generateDesignCandidates returns three validated local-coordinate candidates", async () => {
  const fixture = await createSnapshotFixture();
  const snapshot = await loadDesignSnapshot(fixture.rootDir);
  const response = generateDesignCandidates(snapshot, {
    providerName: "local-stub",
    modelName: "baseline-design-synth"
  });

  assert.equal(response.snapshotId, "snap_test_01");
  assert.equal(response.provider.name, "local-stub");
  assert.equal(response.provider.model, "baseline-design-synth");
  assert.equal(response.candidates.length, 3);

  for (const candidate of response.candidates) {
    assert.equal(candidate.validation.valid, true);
    assert.ok(candidate.title.length > 3);
    assert.ok(candidate.visualBlueprint.slices.length >= 1);
    assert.ok(candidate.localBlueprintJson.width <= snapshot.request.selection.dimensions.width);
    assert.ok(candidate.localBlueprintJson.depth <= snapshot.request.selection.dimensions.depth);
    assert.ok(candidate.localBlueprintJson.height <= snapshot.request.selection.dimensions.height);
    assert.ok(candidate.materialsRequired.every((entry) => !entry.itemId.includes("[")));
  }
});

async function createSnapshotFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "minecraftclaw-design-snapshot-"));
  await fs.writeFile(
    path.join(rootDir, "request.json"),
    JSON.stringify(
      {
        snapshotId: "snap_test_01",
        selection: {
          absoluteBounds: {
            min: { x: 100, y: 64, z: 200 },
            max: { x: 111, y: 73, z: 211 }
          },
          dimensions: { width: 12, height: 10, depth: 12 },
          localOriginRule: "selection_min_corner"
        },
        promptContext: {
          prompt: "Build a cozy cliffside reading hut",
          positivePrompt: "warm, wood-heavy, compact",
          negativePrompt: "no second floor",
          candidateCount: 3
        },
        files: {
          spaceContext: "space-context.json",
          environmentViews: "environment-views.json",
          playerContext: "player-context.json",
          gameContext: "game-context.json",
          paletteCatalog: "palette-catalog.json"
        }
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(rootDir, "space-context.json"),
    JSON.stringify(
      {
        legend: {
          ".": { token: ".", label: "air", blockIds: ["minecraft:air"] },
          S1: { token: "S1", label: "stone", blockIds: ["minecraft:stone"] },
          N1: { token: "N1", label: "grass", blockIds: ["minecraft:grass_block"] }
        },
        slices: [
          { y: 0, rows: ["S1 S1 S1", "S1 N1 S1", "S1 S1 S1"] },
          { y: 1, rows: [". . .", ". . .", ". . ."] }
        ],
        projections: {
          top: ["S1 S1 S1", "S1 N1 S1", "S1 S1 S1"]
        }
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(rootDir, "environment-views.json"),
    JSON.stringify(
      {
        views: [
          { direction: "north", summary: "open sky and distant water", imageFile: "environment-north.png" },
          { direction: "east", summary: "rocky slope", imageFile: "environment-east.png" },
          { direction: "south", summary: "forest edge", imageFile: "environment-south.png" },
          { direction: "west", summary: "grassy drop", imageFile: "environment-west.png" },
          { direction: "top-down", summary: "selection footprint overview", imageFile: "environment-top-down.png" }
        ]
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(rootDir, "player-context.json"),
    JSON.stringify(
      {
        gameMode: "survival",
        inventory: [{ itemId: "minecraft:spruce_planks", count: 64 }],
        playerPosition: { x: 104, y: 68, z: 205 }
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(rootDir, "game-context.json"),
    JSON.stringify(
      {
        minecraftVersion: "1.20.1",
        mods: [{ id: "minecraft", version: "1.20.1" }]
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(rootDir, "palette-catalog.json"),
    JSON.stringify(
      {
        entries: [
          { token: "S1", itemId: "minecraft:stone", category: "stone_like" },
          { token: "W1", itemId: "minecraft:spruce_planks", category: "wood_like" }
        ]
      },
      null,
      2
    )
  );

  return { rootDir };
}
