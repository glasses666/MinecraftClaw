import { z } from "zod";

const blockPositionSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int()
});

const fillStepSchema = z.object({
  kind: z.literal("fill"),
  from: blockPositionSchema,
  to: blockPositionSchema,
  blockId: z.string().min(3)
});

const blockStepSchema = z.object({
  kind: z.literal("block"),
  at: blockPositionSchema,
  blockId: z.string().min(3)
});

const commandStepSchema = z.object({
  kind: z.literal("command"),
  commandTemplate: z.string().min(3),
  offset: blockPositionSchema
});

export const runtimeBlueprintSchema = z.object({
  id: z.string().min(3),
  width: z.number().int().min(1).max(64),
  depth: z.number().int().min(1).max(64),
  height: z.number().int().min(1).max(64),
  steps: z.array(z.union([fillStepSchema, blockStepSchema, commandStepSchema])).min(1).max(512)
});

export type RuntimeBlueprint = z.infer<typeof runtimeBlueprintSchema>;

export function normalizeRuntimeBlueprint(input: unknown): RuntimeBlueprint | Error {
  const parsed = runtimeBlueprintSchema.safeParse(input);

  if (!parsed.success) {
    const detail = parsed.error.issues[0]?.message ?? "unknown blueprint error";
    return new Error(`Invalid runtime blueprint: ${detail}`);
  }

  const blueprint = parsed.data;

  for (const step of blueprint.steps) {
    if (step.kind === "fill") {
      if (!isWithinBounds(step.from, blueprint) || !isWithinBounds(step.to, blueprint)) {
        return new Error(`Invalid runtime blueprint: fill step exceeds declared bounds for ${blueprint.id}`);
      }
      continue;
    }

    if (step.kind === "block") {
      if (!isWithinBounds(step.at, blueprint)) {
        return new Error(`Invalid runtime blueprint: block step exceeds declared bounds for ${blueprint.id}`);
      }
      continue;
    }

    if (!isWithinBounds(step.offset, blueprint)) {
      return new Error(`Invalid runtime blueprint: command step exceeds declared bounds for ${blueprint.id}`);
    }

    if (!isSafeCommandTemplate(step.commandTemplate)) {
      return new Error(`Invalid runtime blueprint: unsafe command template for ${blueprint.id}`);
    }
  }

  return blueprint;
}

function isWithinBounds(
  position: { x: number; y: number; z: number },
  blueprint: RuntimeBlueprint
): boolean {
  return (
    position.x >= 0 &&
    position.x < blueprint.width &&
    position.y >= 0 &&
    position.y < blueprint.height &&
    position.z >= 0 &&
    position.z < blueprint.depth
  );
}

function isSafeCommandTemplate(commandTemplate: string): boolean {
  const normalized = commandTemplate.trim().toLowerCase();

  if (!normalized.startsWith("setblock ")) {
    return false;
  }

  const forbiddenFragments = ["fill ", "clone ", "execute ", "summon ", "tp ", "kill ", "function ", "data "];
  return !forbiddenFragments.some((fragment) => normalized.includes(fragment));
}
