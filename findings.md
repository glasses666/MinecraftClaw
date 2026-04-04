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

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Start with a server-authoritative execution model | It is more deterministic and easier to validate than raw client input automation |
| Delay full player-like control | Vision, camera, and input loops add complexity before core MCP plumbing is proven |
| Use existing MCP servers as protocol references, not as direct implementation bases | They validate tool shapes and interaction patterns, but they operate on external bots instead of inside a Fabric mod |
| Treat WorldEdit and Litematica as blueprint/build references | They solve schematic representation and bulk placement better than hand-rolled building logic |
| Use a localhost RPC bridge between mod and MCP server | This keeps MCP concerns out of the Fabric runtime and makes the boundary easier to test and replace |
| Defer real-player camera and UI control to an optional later client companion | The server already exposes enough state to prove end-to-end sensing and action execution |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Fresh workspace had no git history | Will initialize a local repo before committing planning artifacts |

## Resources
- Workspace: /Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot
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

## Visual/Browser Findings
- User screenshot shows a Fabric 1.20.1 setup baseline with LWJGL 3 3.3.1, Minecraft 1.20.1, Intermediary Mappings 1.20.1, and Fabric Loader 0.17.2

---
*Update this file after every 2 view/browser/search operations*
