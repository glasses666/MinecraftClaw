# MinecraftClaw Context Capture Handoff

## Scope
This handoff covers the current state of the **phase-1 context capture pipeline**:

- `Aether Architect's Wand` selection
- white 3D selection frame
- selection-local snapshot generation
- local snapshot file layout
- local design daemon snapshot reader
- candidate generation and blueprint validation

It does **not** cover:

- candidate preview rendering
- in-game candidate switching UI
- build jobs
- survival material consumption
- real PNG environment screenshots

## Current Status

Phase 1 is structurally complete and verified at the code/build level.

The current closed loop is:

`wand selection -> selection snapshot -> snapshot files on disk -> design daemon reads snapshot -> returns 3 valid design candidates`

Two commits define the latest state:

- `7952576 feat: add design snapshot capture pipeline`
- `d6d3ee6 fix: capture snapshots on sneaking block use`

Branch:

- `codex/fabric-mcp-research`

## What Was Verified

### Build and test verification

These passed before handoff:

- `cd mcp-server && npm test`
- `cd mcp-server && npm run build`
- `./gradlew --gradle-user-home .gradle-home :mod:build`
- `./gradlew --gradle-user-home .gradle-home :mod:test --tests '*WandInteractionPlannerTest'`

### In-game live verification

Live testing was done in Prism instance:

- `/Users/dracoglasser/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix（codex）`

Verified working:

- wand can be injected into player inventory
- left click sets first corner
- right click sets second corner
- sneaking right click now triggers snapshot capture instead of overwriting second corner
- snapshot directory is written successfully
- snapshot files are complete and readable

Latest verified snapshot:

- `/Users/dracoglasser/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix（codex）/minecraft/minecraftclaw/design-snapshots/20260408T031404Z-glasserrrr`

## Important Behavioral Fix

The most recent bug fixed was this:

- before fix: sneaking right click on a block hit `UseBlockCallback` first and overwrote the second selection corner
- after fix: if the player is sneaking and a complete selection already exists, block right click resolves to `CAPTURE_SNAPSHOT`

Relevant files:

- [MinecraftClawClientMod.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/client/MinecraftClawClientMod.java)
- [WandInteractionPlanner.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/client/WandInteractionPlanner.java)
- [WandInteractionPlannerTest.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/test/java/io/openclaw/minecraftclaw/client/WandInteractionPlannerTest.java)

## Snapshot Layout

Each snapshot directory currently contains:

- `request.json`
- `space-context.json`
- `environment-views.json`
- `player-context.json`
- `game-context.json`
- `palette-catalog.json`

Current snapshot contract:

- absolute selection bounds are stored in `request.json`
- all design-space geometry uses **selection-local coordinates**
- local origin rule is always `selection_min_corner`
- `space-context.json` stores selection-local `y` slices
- `environment-views.json` currently stores **directional summaries**, not raster images
- `player-context.json` currently stores `gameMode` and aggregated inventory only
- `palette-catalog.json` stores a broad `BlockItem` catalog with compressed tokens

## Key Files

### Mod side

- [MinecraftClawItems.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/MinecraftClawItems.java)
- [MinecraftClawMod.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/MinecraftClawMod.java)
- [MinecraftClawClientMod.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/client/MinecraftClawClientMod.java)
- [SelectionState.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/client/SelectionState.java)
- [SelectionVolume.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/selection/SelectionVolume.java)
- [SelectionLimits.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/selection/SelectionLimits.java)
- [DesignSnapshotCaptureService.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/snapshot/DesignSnapshotCaptureService.java)
- [DesignSnapshotWriter.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/main/java/io/openclaw/minecraftclaw/snapshot/DesignSnapshotWriter.java)

### Design daemon side

- [types.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/src/design/types.ts)
- [snapshot.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/src/design/snapshot.ts)
- [candidate-generator.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/src/design/candidate-generator.ts)
- [cli.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/src/design/cli.ts)
- [runtime-blueprint.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/src/builder/runtime-blueprint.ts)

### Tests

- [design-daemon.test.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/test/design-daemon.test.ts)
- [runtime-blueprint.test.ts](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server/test/runtime-blueprint.test.ts)
- [SelectionVolumeTest.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/test/java/io/openclaw/minecraftclaw/selection/SelectionVolumeTest.java)
- [DesignSnapshotWriterTest.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/test/java/io/openclaw/minecraftclaw/snapshot/DesignSnapshotWriterTest.java)
- [WandInteractionPlannerTest.java](/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mod/src/test/java/io/openclaw/minecraftclaw/client/WandInteractionPlannerTest.java)

## Known Limitations

### 1. Environment views are summaries, not real screenshots

This is the biggest intentional simplification still left in phase 1.

Current behavior:

- `environment-views.json` contains four directional summaries
- no PNGs are produced
- no camera manipulation or framebuffer capture is implemented

This means the design pipeline can reason about rough outside context, but it cannot yet see actual scene composition.

### 2. Snapshot retention is developer-friendly, not safe by default

Current behavior:

- snapshots remain on disk
- nothing is auto-deleted
- nothing is encrypted

This was intentionally left in a development-friendly state.

### 3. `player-context.json` is incomplete

Current behavior:

- includes `gameMode`
- includes aggregated inventory
- does not yet include exact player position / yaw / pitch

### 4. Palette catalog is broad but naive

Current behavior:

- all `BlockItem`s are collected
- categories are coarse
- compression is token-based, but not yet optimized for LLM attention efficiency

### 5. No candidate preview system yet

The daemon can return 3 valid candidates, but they are not yet rendered back in-game as spectral previews.

## Recommended Next Step

Do **not** jump to build jobs or survival construction yet.

The next step should be:

### Recommended

Implement **real 4-direction environment screenshot capture** and extend `environment-views.json` to include image file paths.

Reason:

- current context is structurally correct but visually weak
- screenshot capture is the next largest information gain
- it should be done before candidate preview and before prompt tightening

### Suggested phase-2 target

`real environment screenshots -> enriched snapshot contract -> daemon consumes image references`

## Security Direction

This was discussed and should be preserved for the next session:

- keep real screenshots in **development mode** for debugging
- later introduce a `safe_mode` that auto-cleans snapshot artifacts after candidate generation
- encryption is desirable later, but should not block the screenshot implementation

Recommended order:

1. real screenshot capture
2. retention policy / dev vs safe mode
3. optional encryption

## Commands That Were Useful

### Build and test

```bash
cd /Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/mcp-server
npm test
npm run build
```

```bash
cd /Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot
./gradlew --gradle-user-home .gradle-home :mod:build
./gradlew --gradle-user-home .gradle-home :mod:test --tests '*WandInteractionPlannerTest'
```

### Install jar into Prism codex instance

```bash
cp mod/build/libs/minecraftclaw-0.1.0.jar "$HOME/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix（codex）/minecraft/mods/minecraftclaw-0.1.0.jar"
```

### Check live bridge

```bash
node -e "fetch('http://127.0.0.1:47127/player').then(async r=>{console.log(r.status);console.log(await r.text())})"
```

### Force wand into hotbar

```bash
node -e "fetch('http://127.0.0.1:47127/world/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:'item replace entity GLAsserrrr hotbar.0 with minecraftclaw:aether_architects_wand 1'})}).then(async r=>{console.log(r.status);console.log(await r.text())})"
```

## Session Resume Prompt

If continuing in a fresh session, the next assistant should assume:

- phase-1 context capture is done
- latest working branch is `codex/fabric-mcp-research`
- latest relevant commits are `7952576` and `d6d3ee6`
- live wand selection and snapshot capture were verified in Prism
- the next task is to replace environment summaries with real directional screenshots without bloating the snapshot pipeline
