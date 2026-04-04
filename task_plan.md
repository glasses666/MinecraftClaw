# Task Plan: Fabric MCP Builder Bot Space Reconstruction

## Goal
Extend the verified Fabric 1.20.1 + MCP bridge so the agent can reconstruct and semantically interpret the player's nearby 3D space, not just read player position and teleport.

## Current Phase
Phase 10

## Phases
### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Parallel Research
- [x] Investigate Fabric-side integration options
- [x] Find reusable bot/building/pathfinding references
- [x] Find current GitHub/Modrinth projects worth borrowing from
- **Status:** complete

### Phase 3: MVP Architecture
- [x] Define MCP-first architecture
- [x] Define first milestone scope
- [x] Record decision rationale
- **Status:** complete

### Phase 4: Bootstrap Plan
- [x] Outline project layout
- [x] Define first implementation tasks
- [x] Identify verification checkpoints
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize recommended direction
- [x] Provide concrete next steps
- [x] Hand off research artifacts
- **Status:** complete

### Phase 6: Space Model Design
- [x] Define the first real-time local space model shape
- [x] Decide which 3D signals are essential for agent reasoning
- [x] Record tradeoffs between raw voxels and compressed structure
- **Status:** complete

### Phase 7: Space Model Implementation
- [x] Add a mod-side local space scan endpoint on the bridge
- [x] Add an MCP tool that returns structured local space data
- [x] Verify the tool against the live Prism instance
- **Status:** complete

### Phase 8: Testing & Verification
- [x] Add red-first tests for the mod bridge and MCP tool
- [x] Run local builds and tests
- [x] Check the live scan against the in-game scene
- **Status:** complete

### Phase 9: Delivery
- [x] Summarize the live local space model behavior
- [x] Explain what the agent currently sees around the player
- [x] Commit and push the milestone
- **Status:** complete

### Phase 10: Semantic Space Model
- [x] Define a minimal semantic layer above local-space scans
- [x] Add a new MCP tool that returns regions, structures, and buildability
- [x] Verify the semantic analysis against the live game session
- [ ] Commit and push the milestone
- **Status:** in_progress

## Key Questions
1. What compressed local-space representation gives the agent the most 3D understanding per token?
2. Which parts of the nearby scene should be surfaced as walkable surfaces, occupancy runs, and POIs?
3. How should the scan be parameterized so resolution can increase without exploding payload size?
4. Which semantic signals are stable enough to expose before doing larger-area world stitching?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use a connectivity-first MVP | Proves the mod can expose world state and accept tool calls before investing in pathfinding and autonomous building |
| Use parallel research agents | The Fabric integration path, reference bots, and reusable mods are largely independent research threads |
| Use a Fabric mod plus external MCP server split | This isolates Minecraft internals from MCP protocol concerns and creates a testable seam |
| Treat Carpet/WorldEdit/Litematica-family projects as reference layers, not a single dependency stack | No existing project cleanly solves the full goal end-to-end on Fabric 1.20.1 |
| Use Node/TypeScript for the external MCP server | The MCP SDK is mature there and the localhost bridge will be easier to iterate outside the mod JVM |
| Start with command-based smoke tests in the Fabric mod | This validates the mod-side sensing path before adding the localhost bridge |
| Use the PrismLauncher Java 17 runtime as the canonical build JVM | It matches the working 1.20.1 instance and avoids Java 26 incompatibilities |
| Treat unrelated client-mod crashes separately from MinecraftClaw | The first launch failure came from `dynamiccrosshaircompat`, not from MinecraftClaw |
| Add a real-time `scan_local_space` MCP tool instead of extending raw export first | The user wants live 3D understanding, and the bridge is already verified end-to-end |
| Prefer compressed 3D columns plus walkable surfaces over raw block dumps | This preserves spatial structure while keeping the payload small enough for agent use |
| Add semantic interpretation in the MCP server before changing the mod scan format | This preserves the stable bridge contract and lets heuristics evolve faster than JVM-side world access code |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Parent folder is not a git repository | 1 | Initialize a repo inside the new workspace before committing artifacts |
| Gradle wrapper download timed out at 10 seconds | 1 | Increased `networkTimeout` to 120000 in `gradle-wrapper.properties` |
| Fabric Gradle build fails under Java 26 with `Unsupported class file major version 70` | 1 | Need to run the build under Java 21 or 17 instead of the system default Java 26 |
| Prism test launch crashed before mod initialization | 1 | Identified `dynamiccrosshaircompat` as the first hard error and disabled it for retest |
| `JoinWorldOnLaunch` was set but not honored | 1 | The instance had `OverrideMiscellaneous=false`; live bridge tests proceeded after the world was entered manually/through the running session |
| `tsx --test` passed but `tsc` failed on `structuredContent` typing | 1 | Narrowed the test-side type explicitly before rebuilding the MCP server |

## Notes
- Update phase status as research converges
- Prefer primary sources: Fabric docs, GitHub repos, Modrinth project pages
- Focus on MVP paths that minimize client automation complexity
- Keep the live space model useful to an agent before optimizing for larger-area scans
