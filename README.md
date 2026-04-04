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

## Current Milestone

`M1 - MCP Round Trip`

The first milestone proves end-to-end connectivity:

1. the Fabric mod starts successfully
2. the mod exposes a minimal control surface
3. the MCP server can call into that surface
4. a caller can read player state and perform one small test action

## Planned Initial Tools

- `ping`
- `get_player_state`
- `scan_area`
- `place_test_block`
