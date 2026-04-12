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
const PROVIDER_REQUEST_TIMEOUT_MS = 240_000;
const PROVIDER_MAX_TOKENS = 2_048;

const strictStringArraySchema = z.array(z.string().min(1));

const stringArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return [value];
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }
  return value;
}, strictStringArraySchema);

const materialsRequiredSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const itemId = typeof record.itemId === "string"
          ? record.itemId
          : typeof record.item === "string"
            ? record.item
            : typeof record.blockId === "string"
              ? record.blockId
              : null;
        if (!itemId) {
          return null;
        }
        const requiredValue =
          typeof record.required === "number" ? record.required
            : typeof record.count === "number" ? record.count
              : typeof record.quantity === "number" ? record.quantity
                : 1;
        return {
          itemId,
          required: requiredValue
        };
      })
      .filter((entry): entry is { itemId: string; required: number } => entry !== null);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([itemId, required]) => ({
      itemId,
      required
    }));
  }
  return value;
}, z.array(
  z.object({
    itemId: z.string().min(1),
    required: z.coerce.number().int().min(1)
  })
));

const visualBlueprintSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!("legend" in record) || !("slices" in record)) {
    return undefined;
  }
  return value;
}, z.object({
  legend: z.record(z.string(), z.object({
    token: z.string().min(1),
    label: z.string().min(1),
    blockIds: z.preprocess((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === "string") {
        return [value];
      }
      if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>);
      }
      return value;
    }, strictStringArraySchema.min(1))
  })),
  slices: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>);
    }
    return value;
  }, z.array(
    z.object({
      y: z.number().int(),
      rows: z.array(z.string())
    })
  ))
}).optional());

const modelCandidateSchema = z.object({
  candidateId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  styleTags: stringArraySchema.default([]),
  visualBlueprint: visualBlueprintSchema.optional(),
  localBlueprintJson: z.unknown(),
  materialsRequired: materialsRequiredSchema.default([])
});

const modelResponseSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return { candidates: value };
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (!("candidates" in record) && ("candidateId" in record || "title" in record || "localBlueprintJson" in record)) {
      return { candidates: [value] };
    }
  }
  return value;
}, z.object({
  candidates: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>);
    }
    return value;
  }, z.array(modelCandidateSchema).min(1))
}));

export async function generateModelDesignCandidates(
  request: DesignGenerationHttpRequest,
  snapshot: LoadedDesignSnapshot,
  fetchImpl: FetchLike = fetch
): Promise<DesignCandidateResponse> {
  const provider = {
    name: request.providerProfileId,
    model: request.model
  } satisfies DesignProviderMetadata;
  const expectedCount = snapshot.request.promptContext.candidateCount;
  const finalizedCandidates: DesignCandidate[] = [];

  for (let index = 0; index < expectedCount; index += 1) {
    const initialMessages = await buildGenerationMessages(request, snapshot, index, finalizedCandidates);
    const firstOutput = await requestChatCompletion(request, initialMessages, fetchImpl);
    const firstAttempt = parseAndValidateCandidates(firstOutput, snapshot);

    let parsedCandidates = firstAttempt;
    if (parsedCandidates instanceof Error) {
      const repairedOutput = await requestChatCompletion(
        request,
        buildRepairMessages(snapshot, firstOutput, parsedCandidates.message, index, finalizedCandidates),
        fetchImpl
      );
      const repairedAttempt = parseAndValidateCandidates(repairedOutput, snapshot);
      if (repairedAttempt instanceof Error) {
        throw new Error(`${repairedAttempt.message}\nRaw output excerpt:\n${truncateForError(repairedOutput)}`);
      }
      parsedCandidates = repairedAttempt;
    }

    const firstCandidate = parsedCandidates[0];
    if (!firstCandidate) {
      throw new Error(`Model returned no candidate for slot ${index + 1}.`);
    }

    finalizedCandidates.push({
      ...firstCandidate,
      candidateId: `candidate-${index + 1}`
    });
  }

  return {
    snapshotId: snapshot.request.snapshotId,
    provider,
    candidates: finalizedCandidates
  };
}

async function buildGenerationMessages(
  request: DesignGenerationHttpRequest,
  snapshot: LoadedDesignSnapshot,
  candidateIndex: number,
  existingCandidates: DesignCandidate[]
): Promise<Array<Record<string, unknown>>> {
  const systemPrompt = buildSystemPrompt();
  if (!request.supportsVision) {
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(snapshot, candidateIndex, existingCandidates) }
    ];
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: buildUserPrompt(snapshot, candidateIndex, existingCandidates)
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
  validationError: string,
  candidateIndex: number,
  existingCandidates: DesignCandidate[]
): Array<Record<string, unknown>> {
  return [
    {
      role: "system",
      content: buildSystemPrompt()
    },
    {
      role: "user",
      content: [
        buildUserPrompt(snapshot, candidateIndex, existingCandidates),
        "",
        "Your previous output was invalid.",
        `Validation error: ${validationError}`,
        "Rewrite the response as a single candidate JSON object only. Do not use markdown fences.",
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
      temperature: 0.1,
      max_tokens: PROVIDER_MAX_TOKENS,
      response_format: {
        type: "json_object"
      },
      messages
    }),
    signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS)
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

function parseAndValidateCandidates(
  rawOutput: string,
  snapshot: LoadedDesignSnapshot
): DesignCandidate[] | Error {
  const parsedJson = parseJsonObject(rawOutput);
  if (parsedJson instanceof Error) {
    return parsedJson;
  }

  const parsed = modelResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path?.length ? firstIssue.path.join(".") : "root";
    return new Error(`Model output does not match candidate schema at ${path}: ${firstIssue?.message ?? "unknown error"}`);
  }

  const finalizedCandidates: DesignCandidate[] = [];
  for (const [index, candidate] of parsed.data.candidates.entries()) {
    const normalized = normalizeRuntimeBlueprint(
      normalizeModelBlueprintInput(candidate.localBlueprintJson, candidate.candidateId ?? `candidate-${index + 1}`)
    );
    if (normalized instanceof Error) {
      return normalized;
    }

    finalizedCandidates.push({
      candidateId: candidate.candidateId ?? `candidate-${index + 1}`,
      title: candidate.title,
      description: candidate.description,
      styleTags: candidate.styleTags,
      visualBlueprint: candidate.visualBlueprint ?? buildFallbackVisualBlueprint(snapshot.spaceContext.legend, normalized),
      localBlueprintJson: normalized,
      materialsRequired: computeMaterialRequirements(normalized),
      validation: {
        valid: true,
        errors: []
      }
    });
  }

  return finalizedCandidates;
}

function normalizeModelBlueprintInput(input: unknown, fallbackId: string): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const record = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = {
    ...record,
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : fallbackId
  };

  if (!Array.isArray(record.steps)) {
    return normalized;
  }

  normalized.steps = record.steps.map((step) => normalizeModelBlueprintStep(step));
  return normalized;
}

function normalizeModelBlueprintStep(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const record = { ...(input as Record<string, unknown>) };
  const blockId = typeof record.blockId === "string"
    ? record.blockId
    : typeof record.block === "string"
      ? record.block
      : undefined;

  if (blockId) {
    record.blockId = blockId;
  }

  if (record.kind === "block" && !("at" in record)) {
    const x = typeof record.x === "number" ? record.x : undefined;
    const y = typeof record.y === "number" ? record.y : undefined;
    const z = typeof record.z === "number" ? record.z : undefined;
    if (x !== undefined && y !== undefined && z !== undefined) {
      record.at = { x, y, z };
    }
  }

  return record;
}

function buildSystemPrompt(): string {
  return [
    "You are designing Minecraft buildings for a local-coordinate build system.",
    "Return JSON only. Do not wrap it in markdown or prose.",
    "All coordinates must be local selection coordinates where the minimum selected corner is (0,0,0).",
    "Never output world coordinates.",
    "Return exactly one candidate.",
    "Return either a single candidate object or an object with a single-item candidates array.",
    "Each candidate must include: candidateId, title, description, and localBlueprintJson.",
    "styleTags, visualBlueprint, and materialsRequired are optional.",
    "localBlueprintJson must obey the declared width/depth/height and stay within bounds.",
    "localBlueprintJson.steps must be a non-empty array.",
    "Keep localBlueprintJson.steps concise: target 6-16 steps and never exceed 24 steps.",
    "Use fill and block steps for bulk structure work.",
    "Do not repeat identical steps or duplicate fills over the same region.",
    "Only use command steps for safe setblock patterns when stateful placement is necessary."
  ].join("\n");
}

function buildUserPrompt(
  snapshot: LoadedDesignSnapshot,
  candidateIndex: number,
  existingCandidates: DesignCandidate[]
): string {
  const promptContext = snapshot.request.promptContext;
  const environmentSummary = snapshot.environmentViews.views
    .map((view) => `${view.direction}: ${view.summary ?? "no summary"}`)
    .join("\n");
  const inventorySummary = snapshot.playerContext.inventory
    .map((entry) => `${entry.itemId} x${entry.count}`)
    .slice(0, 12)
    .join(", ") || "empty";
  const paletteSummary = snapshot.paletteCatalog.entries
    .slice(0, 24)
    .map((entry) => `${entry.token}:${entry.itemId} (${entry.category})`)
    .join(", ");
  const existingTitles = existingCandidates.map((candidate) => candidate.title).join("; ");
  const sliceSummary = snapshot.spaceContext.slices
    .slice(0, 3)
    .map((slice) => `y=${slice.y}: ${slice.rows.slice(0, 4).join(" | ")}`)
    .join("\n");

  return [
    `Prompt: ${promptContext.prompt}`,
    `Positive prompt: ${promptContext.positivePrompt || "(none)"}`,
    `Negative prompt: ${promptContext.negativePrompt || "(none)"}`,
    `Generate candidate slot ${candidateIndex + 1} of ${snapshot.request.promptContext.candidateCount}.`,
    existingTitles.length > 0 ? `Already generated candidate titles to stay distinct from: ${existingTitles}` : "No previous candidates yet.",
    `Selection dimensions: ${snapshot.request.selection.dimensions.width}w x ${snapshot.request.selection.dimensions.height}h x ${snapshot.request.selection.dimensions.depth}d`,
    `Game mode: ${snapshot.playerContext.gameMode}`,
    `Inventory summary: ${inventorySummary}`,
    `Palette catalog: ${paletteSummary || "(none)"}`,
    "Environment summaries:",
    environmentSummary || "(none)",
    "Selection slice summary:",
    sliceSummary || "(none)",
    "Output contract reminder:",
    JSON.stringify({
      candidateId: `candidate-${candidateIndex + 1}`,
      title: "string",
      description: "string",
      localBlueprintJson: {
        id: `candidate-${candidateIndex + 1}`,
        width: snapshot.request.selection.dimensions.width,
        depth: snapshot.request.selection.dimensions.depth,
        height: snapshot.request.selection.dimensions.height,
        steps: [
          {
            kind: "fill",
            from: { x: 1, y: 1, z: 1 },
            to: { x: 3, y: 1, z: 3 },
            blockId: "minecraft:spruce_planks"
          }
        ]
      }
    }),
    "Important: do not fill the entire selection solid. Produce a plausible house massing with interior air and openings where appropriate.",
    "Important: prefer larger merged fill steps over many tiny steps.",
    "Important: keep the blueprint concise, ideally under 16 steps.",
    "Important: do not repeat outer candidate fields inside localBlueprintJson.",
    "Important: stay within x:0.." + (snapshot.request.selection.dimensions.width - 1)
      + ", y:0.." + (snapshot.request.selection.dimensions.height - 1)
      + ", z:0.." + (snapshot.request.selection.dimensions.depth - 1) + "."
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
    const extracted = extractFirstBalancedJsonObject(normalized);
    if (extracted !== null) {
      try {
        return JSON.parse(extracted);
      } catch {
        // fall through to the original parse error below
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Model output is not valid JSON: ${message}`);
  }
}

function truncateForError(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 1200) {
    return normalized;
  }
  return `${normalized.slice(0, 1200)}...`;
}

function extractFirstBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char !== "}") {
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return text.slice(start, index + 1);
    }
  }

  return null;
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

function buildFallbackVisualBlueprint(
  sourceLegend: Record<string, { token: string; label: string; blockIds: string[] }>,
  blueprint: RuntimeBlueprint
) {
  const legend: Record<string, { token: string; label: string; blockIds: string[] }> = {
    ".": sourceLegend["."] ?? {
      token: ".",
      label: "air",
      blockIds: ["minecraft:air"]
    }
  };

  const blockTokenMap = new Map<string, string>([["minecraft:air", "."]]);
  let nextTokenIndex = 1;
  const occupancy = new Map<string, string>();

  for (const step of blueprint.steps) {
    if (step.kind === "fill") {
      const token = tokenForBlockId(step.blockId);
      for (let x = Math.min(step.from.x, step.to.x); x <= Math.max(step.from.x, step.to.x); x += 1) {
        for (let y = Math.min(step.from.y, step.to.y); y <= Math.max(step.from.y, step.to.y); y += 1) {
          for (let z = Math.min(step.from.z, step.to.z); z <= Math.max(step.from.z, step.to.z); z += 1) {
            occupancy.set(keyOf(x, y, z), token);
          }
        }
      }
      continue;
    }

    if (step.kind === "block") {
      occupancy.set(keyOf(step.at.x, step.at.y, step.at.z), tokenForBlockId(step.blockId));
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

  function tokenForBlockId(blockId: string): string {
    const existing = blockTokenMap.get(blockId);
    if (existing) {
      return existing;
    }

    const token = inferLegendToken(blockId, nextTokenIndex);
    nextTokenIndex += 1;
    blockTokenMap.set(blockId, token);
    legend[token] = {
      token,
      label: blockId.replace(/^minecraft:/, "").replace(/_/g, " "),
      blockIds: [blockId]
    };
    return token;
  }
}

function extractSetBlockId(commandTemplate: string): string | null {
  const match = commandTemplate.match(/setblock\s+\{x\}\s+\{y\}\s+\{z\}\s+([^\s]+)/i);
  if (!match?.[1]) {
    return null;
  }

  return match[1].replace(/\[.*$/, "");
}

function tokenForCommand(commandTemplate: string): string {
  const blockId = extractSetBlockId(commandTemplate);
  if (blockId === null) {
    return "D1";
  }
  return inferLegendToken(blockId, 1);
}

function inferLegendToken(blockId: string, fallbackIndex: number): string {
  if (blockId.includes("glass")) {
    return `G${fallbackIndex}`;
  }
  if (blockId.includes("lantern") || blockId.includes("light")) {
    return `L${fallbackIndex}`;
  }
  if (blockId.includes("door") || blockId.includes("trapdoor")) {
    return `D${fallbackIndex}`;
  }
  if (blockId.includes("log") || blockId.includes("wood") || blockId.includes("planks") || blockId.includes("slab")) {
    return `W${fallbackIndex}`;
  }
  if (blockId.includes("stone") || blockId.includes("brick") || blockId.includes("cobble")) {
    return `S${fallbackIndex}`;
  }
  return `B${fallbackIndex}`;
}

function keyOf(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
