---
name: minecraftclaw-builder
description: Use when working in the MinecraftClaw repo to scan live Minecraft space, plan safe structure placement, avoid overlap with existing builds or POIs, add or reuse blueprints, and execute in-game construction through the MCP server.
---

# MinecraftClaw Builder

## Overview

Use this skill when the task is "build something in the live Minecraft world" rather than just "edit mod code."
Read `references/mcp-workflow.md` for the exact tool sequence and payload shapes.
Read `references/blueprints.md` when choosing an existing structure.
Read `references/blueprint-templates.md` when authoring a new grounded or floating blueprint.

## Workflow

1. Confirm the live target.
   Start with `get_player_state`.
   If MCP is down, stop and confirm the bridge on `127.0.0.1:47127` is alive before touching code.

2. Read the scene before choosing a build.
   Use `analyze_local_space` for semantic context.
   Use `scan_local_space` when you need exact columns, walkable surfaces, or POIs.

3. Pick the planner mode before the blueprint.
   Use `grounded` for terrain, cliffs, plateaus, roads, and settlements.
   Use `floating` only for intentional sky structures.

4. Plan before building.
   Use `plan_build` with `blueprintId` and `placementMode`.
   Do not jump straight to `build_structure` unless the plan is already known to be safe.

5. Treat overlap as a user-facing decision.
   If `plan_build` reports overlap with occupied volume or POIs, stop and ask.
   Default behavior is non-destructive.

6. Execute reproducibly.
   Use `build_structure` for full blueprint execution.
   Use `place_block`, `fill_box`, or `run_command` only for targeted touch-ups after the main build.

7. Verify in-world.
   Re-run `scan_local_space` or `analyze_local_space` over the same area and confirm the new structure matches the intended footprint and style.

## New Blueprints

When adding a new build:
- write or update tests in `mcp-server/test/build-planner.test.ts` first
- keep the first version compact and stylistically coherent
- prefer `fill` steps for shell geometry, `block` steps for accents, and `command` steps for stateful blocks like doors, beds, lanterns, campfires
- keep dimensions explicit in the blueprint so placement checks stay deterministic

Read `references/blueprint-patterns.md` before adding a new structure type.
Grounded structures should expose an honest footprint and work with `findGroundedPlacement(...)`.
Floating structures should keep their occupied volume clear and work with `findFloatingPlacement(...)`.

## Live Execution Notes

- The preferred tool path is `analyze_local_space -> plan_build -> build_structure -> verify`.
- Use grounded builds to fit the biome and materials already present in the scene.
- Keep new houses aligned with the environment instead of dropping generic starter cubes onto the terrain.
- If the selected Prism instance is already running older code, stage the new jar and wait for the next launch rather than touching the user's process.

## Current Limits

- `plan_build` and `build_structure` cover the current reusable workflow, but overlap approval is still a caller policy rather than a separate `confirm_build` tool.
- Blueprint quality is only as good as the authored step list; this is not a schematic importer yet.
