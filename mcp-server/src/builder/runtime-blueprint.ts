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

  return parsed.data;
}
