# Fabric MCP Connectivity Design

## Goal

Prove that a Fabric 1.20.1 mod can expose world sensing and action execution to an external MCP server in a stable, deterministic way. The first milestone is not autonomous house building. It is a successful end-to-end connection where an MCP tool can query player/world state and trigger a small test action inside Minecraft.

## Recommended Architecture

Use a 2-process architecture.

- `Fabric mod`
  Runs inside Minecraft and owns all direct access to `ServerWorld`, players, blocks, entities, chunk state, and execution on the server thread.
- `Local bridge`
  A very small localhost RPC boundary. This can be TCP, WebSocket, or Unix socket later. For the MVP, plain localhost JSON over TCP is enough.
- `External MCP server`
  Exposes tools to the agent and translates tool calls into bridge requests to the mod.

This split keeps MCP protocol concerns outside the Minecraft JVM and avoids trying to embed a full MCP server inside the mod runtime. It also gives you a stable seam for testing. You can simulate tool calls without an LLM, and you can replace the agent or MCP stack later without rewriting the Fabric-side world logic.

## Why This Is The Right First Step

The lowest-risk implementation path is server-authoritative. Fabric explicitly documents that there is always a logical server, even in singleplayer. That means you can build a sensing and execution core against server-side APIs instead of starting with raw keyboard, mouse, camera, and UI automation.

If you begin with "agent plays like a human client," you immediately inherit brittle problems:

- visual perception
- camera aiming
- UI/inventory automation
- timing jitter
- client desync
- server anticheat or claim edge cases

Those are real later-stage problems, but they are not required to prove MCP connectivity. A server-side execution core lets you validate the control plane first, then add optional client-side augmentation only where the server cannot provide enough context.

## MVP Tool Surface

The first MCP tool surface should be deliberately small:

- `ping`
  Verifies the bridge is up and the mod is reachable.
- `get_player_state`
  Returns player name, dimension, position, yaw/pitch, health, hunger, selected slot, and basic inventory summary.
- `scan_area`
  Returns a compact summary of blocks and entities around a target position. Keep this semantic and bounded rather than dumping raw chunk data.
- `place_test_block`
  Attempts to place a known block at a given coordinate and returns the outcome plus any reason for failure.

This is enough to prove all critical edges:

- tool call reaches MCP
- MCP reaches bridge
- bridge reaches Fabric mod
- mod reads world state
- mod mutates world state safely on the server thread
- structured response makes it back to the caller

## Fabric-Side Design

The Fabric mod should expose two internal subsystems:

### 1. Sense Service

Responsible for:

- player lookup and binding
- world reads through `ServerWorld`
- local area scans
- heightmap queries for future site selection
- entity summaries

Output should be compact JSON-like DTOs, not raw Minecraft internals. The agent should receive normalized names, positions, block IDs, tags, occupancy, and environmental descriptors.

### 2. Action Service

Responsible for:

- queued actions
- server-thread execution
- basic validation
- structured success/failure responses

Early actions should be tiny and deterministic. Avoid full multi-step construction in v1. A single block placement or block break smoke test is enough.

## Reference Stack

Use these projects as references rather than direct foundations:

- `Fabric Carpet`
  Best reference for server-side control primitives and automation-adjacent patterns.
- `Carpet TIS Addition`
  Best reference for fake-player-style action semantics if later milestones need "agent as player" behavior.
- `WorldEdit`
  Best reference for bulk world mutation and structure execution.
- `Lite2Edit`
  Useful if later you want `.litematic` to server-side execution.
- `Litematica Printer`
  Good source for block placement ordering and edge-case handling, but not a good runtime base.
- `Baritone`
  Strong navigation reference, but client-oriented and not the right first foundation for MCP connectivity.

## First Implementation Milestone

Milestone name: `M1 - MCP Round Trip`

Success criteria:

1. Minecraft launches with the Fabric mod.
2. The mod starts a localhost bridge on world/server start.
3. An external MCP server exposes at least `ping` and `get_player_state`.
4. Calling the MCP tool returns live in-game data from the running instance.
5. A test action such as `place_test_block` succeeds at least once and returns a structured result.

Non-goals for M1:

- autonomous pathfinding
- blueprint generation
- full house construction
- screenshot-based perception
- inventory optimization
- multiplayer permissions compatibility

## Suggested Automation Flow Later

After M1 works, the automation runner should look like this:

1. `scan_area`
2. `find_build_site`
3. `generate_blueprint`
4. `validate_materials`
5. `execute_blueprint_stepwise`
6. `recover_or_retry`

But do not build that now. The correct order is:

1. prove connectivity
2. prove sensing
3. prove single-step action
4. prove queued multi-step action
5. only then add planning-heavy building workflows

## Risks

- The bridge must never mutate world state off the server thread.
- Fake players may behave differently under protection mods.
- Large scans can become noisy and too token-heavy for the agent.
- If you bind to a real player later, respawn and dimension changes must rebind cleanly.

## Recommendation

Build the MVP around a server-side Fabric core and an external MCP server. Do not start with direct client automation. If M1 succeeds, then the project is viable and worth expanding into movement, site selection, and building.
