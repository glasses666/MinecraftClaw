import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import {
  createDesignDaemonServer,
  type DesignGenerationHttpRequest
} from "../src/design/daemon-server.js";

test("design daemon rejects generate requests without a matching bearer token", async () => {
  const fixture = await createSnapshotFixture();
  const server = createDesignDaemonServer({
    token: "test-token"
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const response = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/design/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(sampleRequest(fixture.rootDir))
  });

  assert.equal(response.status, 401);
  assert.match(await response.text(), /unauthorized/i);

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("design daemon loads the snapshot and returns provider-tagged candidates", async () => {
  const fixture = await createSnapshotFixture();
  let receivedBody: DesignGenerationHttpRequest | null = null;
  const server = createDesignDaemonServer({
    token: "test-token",
    generateCandidates: async (request, snapshot) => {
      receivedBody = request;
      return {
        snapshotId: snapshot.request.snapshotId,
        provider: {
          name: request.providerProfileId,
          model: request.model
        },
        candidates: [
          {
            candidateId: "candidate-1",
            title: "Northlight Cabin",
            description: "Test candidate",
            styleTags: ["compact"],
            visualBlueprint: {
              legend: {},
              slices: []
            },
            localBlueprintJson: {
              id: "candidate-1",
              width: snapshot.request.selection.dimensions.width,
              depth: snapshot.request.selection.dimensions.depth,
              height: snapshot.request.selection.dimensions.height,
              steps: []
            },
            materialsRequired: [],
            validation: {
              valid: true,
              errors: []
            }
          }
        ]
      };
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const response = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/design/generate`, {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json"
    },
    body: JSON.stringify(sampleRequest(fixture.rootDir))
  });

  assert.equal(response.status, 200);
  assert.deepEqual(receivedBody, sampleRequest(fixture.rootDir));
  assert.deepEqual(await response.json(), {
    snapshotId: "snap_test_01",
    provider: {
      name: "profile-openai-local",
      model: "gpt-4.1-mini"
    },
    candidates: [
      {
        candidateId: "candidate-1",
        title: "Northlight Cabin",
        description: "Test candidate",
        styleTags: ["compact"],
        visualBlueprint: {
          legend: {},
          slices: []
        },
        localBlueprintJson: {
          id: "candidate-1",
          width: 12,
          depth: 12,
          height: 10,
          steps: []
        },
        materialsRequired: [],
        validation: {
          valid: true,
          errors: []
        }
      }
    ]
  });

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("design daemon rejects generation requests when the snapshot id does not match the snapshot contents", async () => {
  const fixture = await createSnapshotFixture();
  const server = createDesignDaemonServer({
    token: "test-token"
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");

  const response = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/design/generate`, {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      ...sampleRequest(fixture.rootDir),
      snapshotId: "snap_wrong"
    })
  });

  assert.equal(response.status, 400);
  assert.match(await response.text(), /snapshot id/i);

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function sampleRequest(snapshotDir: string): DesignGenerationHttpRequest {
  return {
    snapshotDir,
    snapshotId: "snap_test_01",
    providerProfileId: "profile-openai-local",
    providerType: "openai-compatible",
    baseUrl: "http://127.0.0.1:11434/v1",
    apiKey: "test-key",
    model: "gpt-4.1-mini"
  };
}

async function createSnapshotFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "minecraftclaw-design-daemon-http-"));
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
          S1: { token: "S1", label: "stone", blockIds: ["minecraft:stone"] }
        },
        slices: [
          { y: 0, rows: ["S1 S1", "S1 S1"] }
        ]
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
          { direction: "north", summary: "open sky", imageFile: "environment-north.png" }
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
        inventory: [{ itemId: "minecraft:spruce_planks", count: 64 }]
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
          { token: "S1", itemId: "minecraft:stone", category: "stone_like" }
        ]
      },
      null,
      2
    )
  );

  return { rootDir };
}
