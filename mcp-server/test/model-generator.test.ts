import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

import { generateModelDesignCandidates } from "../src/design/model-generator.js";
import type { DesignGenerationHttpRequest } from "../src/design/daemon-server.js";
import { loadDesignSnapshot } from "../src/design/snapshot.js";

test("model generator omits authorization when api key is empty and retries once on invalid json", async () => {
  const fixture = await createSnapshotFixture();
  const providerCalls: Array<{ authorization?: string; body: any }> = [];
  let callCount = 0;
  const providerServer = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }

    const raw = await readBody(request);
    providerCalls.push({
      authorization: request.headers.authorization,
      body: JSON.parse(raw)
    });
    callCount += 1;

    const content = callCount === 1 ? "not-json" : JSON.stringify({ candidates: buildModelCandidates() });
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      id: "chatcmpl-test",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content
          }
        }
      ]
    }));
  });

  await new Promise<void>((resolve) => providerServer.listen(0, "127.0.0.1", resolve));
  const address = providerServer.address();
  assert.ok(address && typeof address !== "string");

  try {
    const snapshot = await loadDesignSnapshot(fixture.rootDir);
    const result = await generateModelDesignCandidates(
      {
        ...sampleRequest(fixture.rootDir),
        baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}/v1`,
        apiKey: "",
        supportsVision: false
      },
      snapshot
    );

    assert.equal(providerCalls.length, 2);
    assert.equal(providerCalls[0]?.authorization, undefined);
    assert.equal(providerCalls[0]?.body.model, "gpt-4.1-mini");
    assert.equal(typeof providerCalls[0]?.body.messages[1]?.content, "string");
    assert.equal(result.candidates.length, 3);
    assert.equal(result.provider.model, "gpt-4.1-mini");
  } finally {
    await new Promise<void>((resolve, reject) => providerServer.close((error) => error ? reject(error) : resolve()));
  }
});

test("model generator includes image inputs when vision is enabled", async () => {
  const fixture = await createSnapshotFixture();
  let capturedBody: any = null;
  const providerServer = createServer(async (request, response) => {
    capturedBody = JSON.parse(await readBody(request));
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      id: "chatcmpl-test",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ candidates: buildModelCandidates() })
          }
        }
      ]
    }));
  });

  await new Promise<void>((resolve) => providerServer.listen(0, "127.0.0.1", resolve));
  const address = providerServer.address();
  assert.ok(address && typeof address !== "string");

  try {
    const snapshot = await loadDesignSnapshot(fixture.rootDir);
    await generateModelDesignCandidates(
      {
        ...sampleRequest(fixture.rootDir),
        baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}/v1`,
        supportsVision: true
      },
      snapshot
    );

    const userContent = capturedBody.messages[1].content;
    assert.ok(Array.isArray(userContent));
    assert.ok(userContent.some((entry: any) => entry.type === "image_url"));
  } finally {
    await new Promise<void>((resolve, reject) => providerServer.close((error) => error ? reject(error) : resolve()));
  }
});

function sampleRequest(snapshotDir: string): DesignGenerationHttpRequest {
  return {
    snapshotDir,
    snapshotId: "snap_test_01",
    providerProfileId: "profile-openai-local",
    providerType: "openai-compatible",
    baseUrl: "http://127.0.0.1:11434/v1",
    apiKey: "test-key",
    model: "gpt-4.1-mini",
    supportsVision: false
  };
}

function buildModelCandidates() {
  return [0, 1, 2].map((index) => ({
    candidateId: `candidate-${index + 1}`,
    title: `Candidate ${index + 1}`,
    description: "A generated design candidate.",
    styleTags: ["compact", "coastal"],
    visualBlueprint: {
      legend: {
        W1: {
          token: "W1",
          label: "spruce planks",
          blockIds: ["minecraft:spruce_planks"]
        }
      },
      slices: [
        {
          y: 1,
          rows: [
            "W1 W1 W1",
            "W1 . W1",
            "W1 W1 W1"
          ]
        }
      ]
    },
    localBlueprintJson: {
      id: `candidate-${index + 1}`,
      width: 12,
      depth: 12,
      height: 10,
      steps: [
        {
          kind: "fill",
          from: { x: 1, y: 1, z: 1 },
          to: { x: 3, y: 1, z: 3 },
          blockId: "minecraft:spruce_planks"
        }
      ]
    },
    materialsRequired: [
      {
        itemId: "minecraft:spruce_planks",
        required: 9
      }
    ]
  }));
}

async function createSnapshotFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "minecraftclaw-model-generator-"));
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
      }
    )
  );
  await fs.writeFile(path.join(rootDir, "space-context.json"), JSON.stringify({ legend: {}, slices: [] }));
  await fs.writeFile(path.join(rootDir, "player-context.json"), JSON.stringify({ gameMode: "survival", inventory: [] }));
  await fs.writeFile(path.join(rootDir, "game-context.json"), JSON.stringify({ minecraftVersion: "1.20.1", mods: [] }));
  await fs.writeFile(path.join(rootDir, "palette-catalog.json"), JSON.stringify({ entries: [] }));
  await fs.writeFile(
    path.join(rootDir, "environment-views.json"),
    JSON.stringify({
      views: [
        { direction: "north", summary: "A grassy slope behind the plot.", imageFile: "environment-north.png" },
        { direction: "top-down", summary: "Top-down overview of the plot.", imageFile: "environment-top-down.png" }
      ]
    })
  );
  await fs.writeFile(path.join(rootDir, "environment-north.png"), Buffer.from("north-image"));
  await fs.writeFile(path.join(rootDir, "environment-top-down.png"), Buffer.from("top-image"));
  return { rootDir };
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
