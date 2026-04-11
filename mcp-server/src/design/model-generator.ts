import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { normalizeRuntimeBlueprint, type RuntimeBlueprint } from "../builder/runtime-blueprint.js";
import type {
  DesignCandidate,
  DesignCandidateResponse,
  DesignProviderMetadata,
  LoadedDesignSnapshot
} from "./types.js";
import type { DesignGenerationHttpRequest } from "./daemon-server.js";

type FetchLike = typeof fetch;

const visualBlueprintSchema = z.object({
  legend: z.record(
    z.string(),
    z.object({
      token: z.string().min(1),
      label: z.string().min(1),
      blockIds: z.array(z.string().min(1)).min(1)
    })
  ),
  slices: z.array(
    z.object({
      y: z.number().int(),
      rows: z.array(z.string())
    })
  )
});

const modelCandidateSchema = z.object({
  candidateId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  styleTags: z.array(z.string()).default([]),
  visualBlueprint: visualBlueprintSchema,
  localBlueprintJson: z.unknown(),
  materialsRequired: z.array(
    z.object({
      itemId: z.string().min(1),
      required: z.number().int().min(1)
    })
  ).default([])
});

const modelResponseSchema = z.object({
  candidates: z.array(modelCandidateSchema).min(1)
});

export async function generateModelDesignCandidates(
  request: DesignGenerationHttpRequest,
  snapshot: LoadedDesignSnapshot,
  fetchImpl: FetchLike = fetch
): Promise<DesignCandidateResponse> {
  const provider = {
    name: request.providerProfileId,
    model: request.model
  } satisfies DesignProviderMetadata;
  const initialMessages = await buildGenerationMessages(request, snapshot);
  const firstOutput = await requestChatCompletion(request, initialMessages, fetchImpl);
  const firstAttempt = parseAndValidateResponse(firstOutput, snapshot, provider);
  if (!(firstAttempt instanceof Error)) {
    return firstAttempt;
  }

  const repairedOutput = await requestChatCompletion(
    request,
    buildRepairMessages(snapshot, firstOutput, firstAttempt.message),
    fetchImpl
  );
  const repairedAttempt = parseAndValidateResponse(repairedOutput, snapshot, provider);
  if (repairedAttempt instanceof Error) {
    throw repairedAttempt;
  }

  return repairedAttempt;
}

async function buildGenerationMessages(
  request: DesignGenerationHttpRequest,
  snapshot: LoadedDesignSnapshot
): Promise<Array<Record<string, unknown>>> {
  const systemPrompt = buildSystemPrompt(snapshot.request.promptContext.candidateCount);
  if (!request.supportsVision) {
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(snapshot) }
    ];
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: buildUserPrompt(snapshot)
    }
  ];

  for (const view of snapshot.environmentViews.views) {
    if (!view.imageFile) {
      continue;
    }

    const imagePath = path.join(snapshot.rootDir, view.imageFile);
    const base64 = await fs.readFile(imagePath, "base64");
    userContent.push({
      type: "text",
      text: `Environment image: ${view.direction}${view.summary ? ` - ${view.summary}` : ""}`
    });
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${base64}`
      }
    });
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];
}

function buildRepairMessages(
  snapshot: LoadedDesignSnapshot,
  previousOutput: string,
  validationError: string
): Array<Record<string, unknown>> {
  return [
    {
      role: "system",
      content: buildSystemPrompt(snapshot.request.promptContext.candidateCount)
    },
    {
      role: "user",
      content: [
        buildUserPrompt(snapshot),
        "",
        "Your previous output was invalid.",
        `Validation error: ${validationError}`,
        "Rewrite the full response as valid JSON only. Do not use markdown fences.",
        "Previous output:",
        previousOutput
      ].join("\n")
    }
  ];
}

async function requestChatCompletion(
  request: DesignGenerationHttpRequest,
  messages: Array<Record<string, unknown>>,
  fetchImpl: FetchLike
): Promise<string> {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (request.apiKey.length > 0) {
    headers.authorization = `Bearer ${request.apiKey}`;
  }

  const response = await fetchImpl(resolveChatCompletionsUrl(request.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: request.model,
      temperature: 0.2,
      messages
    }),
    signal: AbortSignal.timeout(90_000)
  });

  if (!response.ok) {
    throw new Error(`Provider request failed: HTTP ${response.status} ${await response.text()}`);
  }

  const body = await response.json() as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    error?: { message?: string };
  };
  if (!body.choices?.length) {
    throw new Error(body.error?.message ?? "Provider returned no choices.");
  }

  const content = body.choices[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .filter((entry) => entry?.type === "text" && typeof entry.text === "string")
      .map((entry) => entry.text)
      .join("\n");
    if (joined.trim().length > 0) {
      return joined;
    }
  }

  throw new Error("Provider returned an empty assistant message.");
}

function parseAndValidateResponse(
  rawOutput: string,
  snapshot: LoadedDesignSnapshot,
  provider: DesignProviderMetadata
): DesignCandidateResponse | Error {
  const parsedJson = parseJsonObject(rawOutput);
  if (parsedJson instanceof Error) {
    return parsedJson;
  }

  const parsed = modelResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return new Error(`Model output does not match candidate schema: ${parsed.error.issues[0]?.message ?? "unknown error"}`);
  }

  const expectedCount = snapshot.request.promptContext.candidateCount;
  if (parsed.data.candidates.length !== expectedCount) {
    return new Error(`Model returned ${parsed.data.candidates.length} candidates, expected ${expectedCount}.`);
  }

  const finalizedCandidates: DesignCandidate[] = [];
  for (const [index, candidate] of parsed.data.candidates.entries()) {
    const normalized = normalizeRuntimeBlueprint(candidate.localBlueprintJson);
    if (normalized instanceof Error) {
      return normalized;
    }

    finalizedCandidates.push({
      candidateId: candidate.candidateId ?? `candidate-${index + 1}`,
      title: candidate.title,
      description: candidate.description,
      styleTags: candidate.styleTags,
      visualBlueprint: candidate.visualBlueprint,
      localBlueprintJson: normalized,
      materialsRequired: computeMaterialRequirements(normalized),
      validation: {
        valid: true,
        errors: []
      }
    });
  }

  return {
    snapshotId: snapshot.request.snapshotId,
    provider,
    candidates: finalizedCandidates
  };
}

function buildSystemPrompt(candidateCount: number): string {
  return [
    "You are designing Minecraft buildings for a local-coordinate build system.",
    "Return JSON only. Do not wrap it in markdown or prose.",
    "All coordinates must be local selection coordinates where the minimum selected corner is (0,0,0).",
    "Never output world coordinates.",
    `Return exactly ${candidateCount} candidates.`,
    "Each candidate must include: candidateId, title, description, styleTags, visualBlueprint, localBlueprintJson, materialsRequired.",
    "localBlueprintJson must obey the declared width/depth/height and stay within bounds.",
    "Use fill and block steps for bulk structure work.",
    "Only use command steps for safe setblock patterns when stateful placement is necessary.",
    "materialsRequired must list item ids and integer counts."
  ].join("\n");
}

function buildUserPrompt(snapshot: LoadedDesignSnapshot): string {
  const promptContext = snapshot.request.promptContext;
  const environmentSummary = snapshot.environmentViews.views
    .map((view) => `${view.direction}: ${view.summary ?? "no summary"}`)
    .join("\n");
  const inventorySummary = snapshot.playerContext.inventory
    .map((entry) => `${entry.itemId} x${entry.count}`)
    .join(", ") || "empty";
  const paletteSummary = snapshot.paletteCatalog.entries
    .slice(0, 64)
    .map((entry) => `${entry.token}:${entry.itemId} (${entry.category})`)
    .join(", ");
  const installedMods = snapshot.gameContext.mods
    .map((entry) => `${entry.id}@${entry.version}`)
    .join(", ");

  return [
    `Prompt: ${promptContext.prompt}`,
    `Positive prompt: ${promptContext.positivePrompt || "(none)"}`,
    `Negative prompt: ${promptContext.negativePrompt || "(none)"}`,
    `Selection dimensions: ${snapshot.request.selection.dimensions.width}w x ${snapshot.request.selection.dimensions.height}h x ${snapshot.request.selection.dimensions.depth}d`,
    `Game mode: ${snapshot.playerContext.gameMode}`,
    `Minecraft version: ${snapshot.gameContext.minecraftVersion}`,
    `Installed mods: ${installedMods || "(none)"}`,
    `Inventory summary: ${inventorySummary}`,
    `Palette catalog: ${paletteSummary || "(none)"}`,
    "Environment summaries:",
    environmentSummary || "(none)",
    "Space context JSON:",
    JSON.stringify(snapshot.spaceContext),
    "Output contract reminder:",
    JSON.stringify({
      candidates: [
        {
          candidateId: "candidate-1",
          title: "string",
          description: "string",
          styleTags: ["string"],
          visualBlueprint: {
            legend: {
              W1: {
                token: "W1",
                label: "timber shell",
                blockIds: ["minecraft:spruce_planks"]
              }
            },
            slices: [{ y: 1, rows: ["W1 W1", "W1 ."] }]
          },
          localBlueprintJson: {
            id: "candidate-1",
            width: snapshot.request.selection.dimensions.width,
            depth: snapshot.request.selection.dimensions.depth,
            height: snapshot.request.selection.dimensions.height,
            steps: []
          },
          materialsRequired: [
            {
              itemId: "minecraft:spruce_planks",
              required: 16
            }
          ]
        }
      ]
    })
  ].join("\n");
}

function resolveChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function parseJsonObject(rawOutput: string): unknown | Error {
  const normalized = rawOutput
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Model output is not valid JSON: ${message}`);
  }
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
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([itemId, required]) => ({ itemId, required }));
}

function extractSetBlockId(commandTemplate: string): string | null {
  const match = commandTemplate.match(/setblock\s+\{x\}\s+\{y\}\s+\{z\}\s+([^\s]+)/i);
  if (!match?.[1]) {
    return null;
  }

  return match[1].replace(/\[.*$/, "");
}
