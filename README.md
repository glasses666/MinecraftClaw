# MinecraftClaw

MinecraftClaw is an OpenClaw-style control stack for Minecraft.

The repository is organized as a small monorepo:

- `mod/`: Fabric 1.20.1 mod that owns world sensing and server-side action execution
- `mcp-server/`: external MCP server that exposes tools to an agent and talks to the mod over a localhost bridge
- `docs/`: design notes and implementation planning

## Bootstrap Status

The repository now contains:

- a Fabric 1.20.1 Gradle module with command-based smoke tests
- a TypeScript MCP server workspace
- the first bridge configuration test
- raw world snapshot export on player join and via command
- a first-pass MCP-side raw export cleaner
- live local-space scanning and semantic local-space analysis

### Fabric smoke-test commands

- `/mcclaw_ping`
- `/mcclaw_player_state`
- `/mcclaw_dump_raw`

### Raw export bootstrap

The current Fabric bootstrap writes a raw environment snapshot when a player joins a world.

The export is written under:

- `minecraft/minecraftclaw/exports/<timestamp>-<player>/`

Each export directory contains:

- `scan_meta.json`
- `player_state.json`
- `inventory.json`
- `local_blocks.json`
- `block_entities.json`
- `entities.json`
- `surface_map.json`

This is intentionally uncleaned raw data so the next step can be driven by real output shape instead of guesses.

### First-pass cleaning

The MCP server now includes a first-pass cleaner that reduces the raw export into an agent-friendly summary:

- context and player state are kept intact
- empty inventory slots are removed
- local blocks are compressed into non-air counts and thin `y`-level profiles
- surface data is compressed into height stats and dominant block counts
- raw SNBT is removed from default entity and POI summaries

Reference artifacts:

- `docs/plans/2026-04-04-raw-export-cleaning-design.md`
- `output/jupyter-notebook/minecraftclaw-raw-export-profiling.ipynb`
- `output/cleaned-exports/20260404T094308Z-glasserrrr.cleaned.json`

## Current Milestone

`M2 - Local Semantic Space Model`

The current milestone proves end-to-end local scene understanding:

1. the Fabric mod exposes a stable localhost bridge
2. the MCP server can read player state, move the player, and scan nearby 3D space
3. the MCP server can lift that scan into regions, structures, and buildability hints
4. a caller can verify the semantic model against the live game scene

## Current MCP Tools

- `get_player_state`
- `teleport_player`
- `scan_local_space`
- `analyze_local_space`
