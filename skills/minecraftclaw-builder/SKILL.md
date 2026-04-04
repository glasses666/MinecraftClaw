---
name: minecraftclaw-builder
description: Use when working in the MinecraftClaw repo to scan live Minecraft space, plan safe structure placement, avoid overlap with existing builds or POIs, add or reuse blueprints, and execute in-game construction through the MCP server.
---

# MinecraftClaw Builder

## Overview

Use this skill when the task is "build something in the live Minecraft world" rather than just "edit mod code."

The current builder stack already supports:
- live space scans through the MinecraftClaw MCP server
- whole-volume overlap checks against occupied runs and POIs
- reusable blueprints in `mcp-server/src/builder/planner.ts`
- execution through `fill_box`, `place_block`, and `run_command`

## Workflow

1. Inspect the current build primitives in `mcp-server/src/builder/planner.ts`.
   Existing blueprints are listed in `references/blueprints.md`.

2. Read the live scene first.
   Use `scan_local_space` or `analyze_local_space` before proposing a build site.

3. Never build directly from anchor points alone.
   Always evaluate the full structure footprint and volume.
   If you are adding a new structure, use the same pattern as `assessBlueprintPlacement(...)`.

4. If the planned volume overlaps occupied runs or POIs, stop and ask the user whether overlap is acceptable.
   Default behavior should be non-destructive.

5. Prefer placements with:
   - zero occupied-volume overlap
   - zero POI overlap
   - the fewest supporting columns under the footprint
   - reasonable distance from the player

6. Execute from a generated absolute plan, not ad hoc coordinates.
   Use `buildExecutionPlan(...)` so the final build is reproducible.

7. Verify after construction.
   Re-scan the same area and confirm the new structure's POIs and bounds match the plan.

## New Blueprints

When adding a new build:
- write or update tests in `mcp-server/test/build-planner.test.ts` first
- keep the first version compact and stylistically coherent
- prefer `fill` steps for shell geometry, `block` steps for accents, and `command` steps for stateful blocks like doors, beds, lanterns, campfires
- keep dimensions explicit in the blueprint so placement checks stay deterministic

Read `references/blueprint-patterns.md` before adding a new structure type.

## Live Execution Notes

- For one-off live building, importing from `dist/src/builder/planner.js` is safer than importing raw TypeScript in a Node eval snippet.
- If MCP calls return `fetch failed`, confirm the game bridge is listening on `127.0.0.1:47127` before debugging the tool layer.
- If the selected Prism instance is already running older code, stage the new jar and wait for the next launch rather than touching the user's process.

## Current Limits

- The planner currently prefers detached floating placements; grounded site planning is still primitive.
- Overlap handling is advisory logic in the MCP layer, not yet a dedicated MCP `plan_build` / `confirm_build` tool pair.
- Blueprint quality is only as good as the authored step list; this is not a schematic importer yet.
