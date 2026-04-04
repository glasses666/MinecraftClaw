# Findings & Decisions

## Requirements
- Minecraft 1.20.1
- Fabric mod target
- Agent should be able to sense nearby environment
- Agent should eventually build structures at requested positions
- First milestone is proving MCP connectivity works
- External references from GitHub or mod sites are welcome
- Research should be parallelized

## Research Findings
- Workspace renamed to reflect the chosen direction: Fabric + MCP + builder bot
- The first milestone is not autonomous building; it is verified connectivity between a mod-side capability surface and an MCP server/tool layer
- Fabric's official networking docs confirm there is always a logical server, even in singleplayer, and custom payloads are the standard bridge for client/server communication inside a mod
- The strongest low-risk architecture is a 2-process split: a Fabric mod on the logical server owns sensing and actions, while an external MCP server exposes tools and talks to the mod over a localhost RPC bridge
- A good connectivity-first MVP surface is only four tools: `ping`, `get_player_state`, `scan_area`, and `place_test_block`
- Fabric lifecycle and tick events are sufficient to host an action queue and deterministic execution loop without client input automation
- Baritone has explicit Fabric support for Minecraft 1.20.1 and remains the strongest pathfinding reference, but it is oriented around bot navigation rather than MCP exposure
- WorldEdit has an active Fabric target and mature schematic/copy-paste model, making it the best reference for structure placement and bulk block operations
- Litematica supports 1.20.1 through 1.20.6 on Fabric and is useful as a schematic ecosystem reference, but it is client-side and not a full autonomous execution solution
- Fake Players has a current Fabric 1.20.1 build, but it requires both client and server, so it is a weaker foundation than a pure server-authoritative approach
- Carpet TIS Addition recently added a rule to make fake player ticking closer to real players, which is useful as a behavior reference if fake players become part of later milestones
- Existing MCP-for-Minecraft servers such as `FundamentalLabs/minecraft-mcp` and `gerred/mcpmc` prove the MCP interaction model, but both are based on Mineflayer rather than Fabric internals
- Fabric Carpet is the strongest server-side control reference, and Carpet TIS Addition is the strongest fake-player action semantics reference for later "agent as player" milestones
- Lite2Edit and SchemPaste are promising references for converting schematics into server-side paste/build execution
- The first implementation slice now exists as a monorepo scaffold with `mod/` and `mcp-server/`
- The MCP server side is bootstrapped with Node/TypeScript, the official MCP SDK dependency, and a tested bridge configuration module
- The Fabric side is bootstrapped with two smoke-test commands: `/mcclaw_ping` and `/mcclaw_player_state`
- `mcp-server` tests and TypeScript build pass locally
- `:mod:build` is currently blocked by the environment defaulting to Java 26; this stack needs Java 21 or 17
- Building with PrismLauncher's bundled Java 17 runtime succeeds for `:mod:build`
- The actual 1.20.1 Prism test instance is `乌托邦探险之旅3.5fix`
- `minecraftclaw-0.1.0.jar` was installed into that instance's `mods/` directory successfully
- The first client launch with MinecraftClaw installed failed because of `dynamiccrosshaircompat`, not because of MinecraftClaw
- After disabling `dynamiccrosshaircompat`, `latest.log` showed `MinecraftClaw initialized`, confirming MinecraftClaw itself loads cleanly in the client pack
- MinecraftClaw is currently only a Fabric-side smoke-test mod; it does not yet expose a localhost bridge or real MCP connection
- MinecraftClaw now has a verified localhost bridge and a live MCP tool surface for `get_player_state` and `teleport_player`
- The live bridge successfully listened on `127.0.0.1:47127` inside the Prism test instance
- The real MCP client read player state successfully and teleported the player back to `26,269,13`
- A direct teleport to `40,270,-8` later resolved to `40,261,-8` when read back, showing the game clamps the final standing location to valid world geometry
- The next implementation slice should be a real-time local 3D space model, not another file export pipeline
- A compressed per-column representation with vertical occupied runs and walkable surfaces is the best current compromise between fidelity and token cost
- `scan_local_space` is now implemented end-to-end through the live bridge and MCP tool surface
- The live scan returns a structured local model containing bounds, per-column occupied runs, walkable surfaces, and POIs
- The live sample at `radius=4, down=4, up=6` returned 81 columns, 891 sampled blocks, 193 occupied blocks, 38 walkable surfaces, and 2 POIs
- The current nearby scene is clearly a built platform or rooftop area rather than natural terrain: acacia stairs, pink terracotta, spruce fences, cyan wool, trapdoors, stripped acacia logs, and lectern/chest POIs dominate the sample
- The player was at `26,268,13` with `yaw=6.2999635` and `pitch=27.000015` during the live scan
- The next semantic layer can be built entirely in `mcp-server` on top of `scan_local_space`; the mod bridge does not need to change for `space_model_v1`
- `analyze_local_space` now derives semantic `regions`, `structures`, and `buildability` from the compressed local scan
- Live semantic analysis on the running game returned `scene=mixed`, `buildability=constrained`, one dominant `natural_ground` region, a detected `cultivated_land` structure, and several flat build anchors on spruce-plank/grass surfaces
- Region classification works better when settlement-core detection is stricter than global buildability detection; otherwise nearby beds/chests over-classify cultivated patches as pure settlement
- The next step toward “权限拉满” is not fake-player input automation; it is an admin-grade action surface on top of the existing bridge
- The current admin action slice is: `place_block`, `break_block`, `fill_box`, `clear_box`, and `run_command`
- The mod-side bridge only needed three new primitives: place block, fill box, and execute command; `break_block` and `clear_box` are MCP-side aliases to air placement/fill
- `run_command` acts as the unrestricted escape hatch, so typed block-edit tools can stay stable and ergonomic instead of trying to model every Minecraft command variant
- The Prism instance that appears to be reserved for Codex work is `/Users/dracoglasser/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix（codex）`
- The next admin-control slice is split by runtime boundary: `get_inventory` needs a new mod bridge endpoint, but `summon_entity`, `set_time`, `set_weather`, and `give_item` can be typed MCP wrappers over the existing command executor
- The MCP surface now includes `get_inventory`, `summon_entity`, `set_time`, `set_weather`, and `give_item`
- Inventory export is intentionally narrow: only non-empty slots are surfaced, with stable slot index, item id, count, custom-name flag, and damage/max-damage metadata
- When debugging live MCP calls, the SDK returned `isError=true` with text `Failed to read player state: fetch failed`; the real issue was bridge unavailability, not a malformed success payload
- A missing listener on `127.0.0.1:47127` is enough to explain the live failure; the selected Prism instance had already exited by the time the new wrappers were exercised
- The next failure mode after “can place blocks” was site selection, not raw construction: a house can look coherent and still intersect an existing bridge/platform if only anchor points are checked
- The new planner fixes that by evaluating the whole build volume against occupied runs and POIs before any block is placed
- `COZY_CABIN_V1` is the first reusable medium blueprint: 7x8 footprint, porch, oak/spruce shell, dark-oak roof, windows, door, bed, chest, crafting table, and lanterns
- The planner now prefers the fewest supporting columns under the footprint, which biases it toward detached empty air instead of stacking the next house above the current village platform
- Live verification built a non-overlapping cabin at `27,279,-2` with zero occupied-volume overlap and zero POI overlap before construction
- A second blueprint is now proven through the same flow: `SKY_GAZEBO_V1` built successfully at `28,283,-9` with zero overlap and only the expected new barrel/campfire POIs
- The building workflow is now stable enough to package as a reusable skill: `dist/minecraftclaw-builder.skill`

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Start with a server-authoritative execution model | It is more deterministic and easier to validate than raw client input automation |
| Delay full player-like control | Vision, camera, and input loops add complexity before core MCP plumbing is proven |
| Use existing MCP servers as protocol references, not as direct implementation bases | They validate tool shapes and interaction patterns, but they operate on external bots instead of inside a Fabric mod |
| Treat WorldEdit and Litematica as blueprint/build references | They solve schematic representation and bulk placement better than hand-rolled building logic |
| Use a localhost RPC bridge between mod and MCP server | This keeps MCP concerns out of the Fabric runtime and makes the boundary easier to test and replace |
| Defer real-player camera and UI control to an optional later client companion | The server already exposes enough state to prove end-to-end sensing and action execution |
| Use a monorepo with `mod/` and `mcp-server/` | It keeps the control plane and game integration in one repository while preserving a clean runtime boundary |
| Use a repo-local npm cache and Gradle home | It avoids sandbox and permission issues with user-global caches during local verification |
| Create a reusable build-troubleshooting skill from the bootstrap session | The build path involved enough environment-specific failures that preserving the recovery workflow will save time on future sessions |
| Treat the mod bridge as the canonical live sensing path | It is already validated in-game and is a better base for iterative spatial tooling than disk export files |
| Build `space_model_v1` around occupied vertical runs, walkable surfaces, and POIs | This is a more agent-usable abstraction of nearby 3D space than a full raw block grid |
| Use bounded scan parameters with defaults `radius=8, down=8, up=12` | This raises local resolution while keeping payload size deterministic and safe for MCP clients |
| Represent each `(x,z)` column as occupied vertical runs instead of raw block rows | Run-length compression preserves 3D structure and cuts token cost sharply |
| Keep semantic space interpretation in TypeScript for now | The MCP layer can evolve heuristics quickly without changing the Fabric bridge contract |
| Separate region classification from buildability classification | Regions should describe the local geometry itself, while buildability can be stricter because of nearby POIs and social/functional constraints |
| Implement the first “full power” slice as typed world actions plus `run_command` | This gives near-admin-complete control without making routine placement/fill flows depend on raw chat commands |
| Keep common high-impact actions typed even when `run_command` could express them | Typed tools give the agent a narrower, more stable API surface and reduce prompt overhead |
| Return only non-empty inventory slots from the bridge | Empty-slot spam adds no planning value and wastes payload budget |
| Evaluate whole-blueprint bounds before construction instead of only checking candidate anchors | Anchor-only checks miss collisions with bridges, roofs, and walkways that cut through the house volume |
| Prefer detached empty-air placements over “technically clear” stacked placements | A build volume can be collision-free yet still feel visually merged with the structure below |
| Prove planner reuse with at least one non-house structure | A second blueprint shows the system is a general build workflow, not a one-off cabin script |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Fresh workspace had no git history | Will initialize a local repo before committing planning artifacts |
| `npm` could not write to the user's global cache | Switched npm operations to a repo-local `.npm-cache` |
| Gradle wrapper files were initially copied to the wrong location | Moved them into `gradle/wrapper/` |
| Gradle wrapper download timed out with the default 10s timeout | Increased wrapper `networkTimeout` to 120000 |
| Fabric Gradle build fails on Java 26 | Must run Gradle under Java 21 or 17 |
| Prism client pack crashed on first retest with MinecraftClaw installed | Root cause was `dynamiccrosshaircompat` mixin failure, so the mod was temporarily moved to `mods.disabled` |
| Prism `JoinWorldOnLaunch` setting did not take effect automatically | `OverrideMiscellaneous` is false in `instance.cfg`, so the config line alone is not authoritative |
| Live `/space/local` initially returned `404` | The running Prism instance was still on the older installed jar; copying the rebuilt jar and relaunching fixed it |
| `tsc` failed even though `tsx --test` passed | The test needed an explicit type narrowing for `structuredContent.model` before the production build would compile |
| New code cannot affect the already running MC process without restart | The updated jar can be staged into the selected instance, but Fabric will only load it on the next launch |
| Debugging the new typed wrappers initially looked like an SDK shape issue | Inspecting the raw `callTool` result showed the real problem was an MCP error result caused by a dead bridge listener |
| The selected Prism instance was no longer running during live wrapper verification | `lsof` showed nothing listening on `127.0.0.1:47127`, and `latest.log` ended with a normal save-and-exit sequence |
| The first built cabin overlapped the visible village structure despite looking coherent | The old build flow only filtered anchor points and did not reason about the full building envelope |
| Pure “clear volume” scoring still picked sites above the existing platform | Ranking now minimizes the number of occupied support columns underneath the footprint before distance |
| A builder workflow without packaging would stay trapped in the current thread | Captured the process as `minecraftclaw-builder` so future sessions can reuse it directly |

## Resources
- Workspace: /Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot
- GitHub repo: https://github.com/glasses666/MinecraftClaw
- Packaged skill: /Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/dist/minecraftclaw-build-guide.skill
- Fabric networking docs: https://docs.fabricmc.net/develop/networking
- Fabric command basics: https://docs.fabricmc.net/develop/commands/basics
- ServerLifecycleEvents: https://maven.fabricmc.net/docs/fabric-api-0.92.1%2B1.20.1/net/fabricmc/fabric/api/event/lifecycle/v1/ServerLifecycleEvents.html
- ServerTickEvents: https://maven.fabricmc.net/docs/fabric-api-0.92.5%2B1.20.1/net/fabricmc/fabric/api/event/lifecycle/v1/ServerTickEvents.StartTick.html
- FakePlayer API: https://maven.fabricmc.net/docs/fabric-api-0.92.1%2B1.20.1/net/fabricmc/fabric/api/entity/FakePlayer.html
- ServerPlayerInteractionManager: https://maven.fabricmc.net/docs/yarn-1.20.1%2Bbuild.1/net/minecraft/server/network/ServerPlayerInteractionManager.html
- ServerWorld: https://maven.fabricmc.net/docs/yarn-1.20.1%2Bbuild.2/net/minecraft/server/world/ServerWorld.html
- Heightmap.Type: https://maven.fabricmc.net/docs/yarn-1.20%2Bbuild.1/net/minecraft/world/Heightmap.Type.html
- Fabric Carpet repo: https://github.com/gnembon/fabric-carpet
- Baritone repo: https://github.com/cabaletta/baritone
- WorldEdit repo: https://github.com/EngineHub/WorldEdit
- EngineHub Modrinth page: https://modrinth.com/organization/enginehub/mods
- WorldEdit Modrinth page: https://modrinth.com/mod/worldedit
- Lite2Edit repo: https://github.com/Erik-Donath/Lite2Edit
- Lite2Edit Modrinth page: https://modrinth.com/mod/lite2edit
- Litematica Modrinth page: https://modrinth.com/mod/litematica
- Syncmatica repo: https://github.com/sakura-ryoko/syncmatica
- Syncmatica 1.20.1 release: https://modrinth.com/mod/syncmatica/version/JxB3gBzc
- Litematica Printer repo: https://github.com/aria1th/litematica-printer
- Litematica Printer 1.20.1 release: https://modrinth.com/mod/litematica-printer/version/3.2.1%2B1.20.1
- SchemPaste Modrinth page: https://modrinth.com/mod/schempaste
- Fake Players 1.20.1 Fabric version: https://modrinth.com/mod/fake-players/version/2.0.4-1.20.1-fabric
- Carpet TIS Addition 1.20.1 version: https://modrinth.com/mod/carpet-tis-addition/version/mc1.20.1-v1.56.1
- Carpet TIS Addition per-tick player actions: https://modrinth.com/mod/carpet-tis-addition/version/v1.70.0-mc1.20.1
- Fundamental Labs Minecraft MCP: https://github.com/FundamentalLabs/minecraft-mcp
- MCPMC: https://github.com/gerred/mcpmc
- MCP SDK npm package: https://www.npmjs.com/package/@modelcontextprotocol/sdk
- PrismLauncher instance log: /Users/dracoglasser/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix/minecraft/logs/latest.log
- Live bridge endpoint: http://127.0.0.1:47127
- New live tool: `scan_local_space`
- New semantic tool: `analyze_local_space`
- New admin tools: `place_block`, `break_block`, `fill_box`, `clear_box`, `run_command`
- New extended admin tools: `get_inventory`, `summon_entity`, `set_time`, `set_weather`, `give_item`
- New builder primitives: `assessBlueprintPlacement`, `findFloatingPlacement`, `buildExecutionPlan`, `COZY_CABIN_V1`
- New blueprint: `SKY_GAZEBO_V1`
- New packaged skill: `/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot/dist/minecraftclaw-builder.skill`

## Visual/Browser Findings
- User screenshot shows a Fabric 1.20.1 setup baseline with LWJGL 3 3.3.1, Minecraft 1.20.1, Intermediary Mappings 1.20.1, and Fabric Loader 0.17.2

---
*Update this file after every 2 view/browser/search operations*
