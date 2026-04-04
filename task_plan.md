# Task Plan: Fabric MCP Builder Bot Research

## Goal
Validate a practical MVP path for a Fabric 1.20.1 mod plus MCP server that lets an agent sense the Minecraft world and execute building tasks, starting with proving MCP connectivity first.

## Current Phase
Phase 4

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
- **Status:** in_progress

### Phase 5: Delivery
- [ ] Summarize recommended direction
- [ ] Provide concrete next steps
- [ ] Hand off research artifacts
- **Status:** pending

## Key Questions
1. What is the lowest-risk way to connect a Fabric mod to an MCP tool surface?
2. Which existing Minecraft bot/building projects are reusable references versus dead ends?
3. What should the first end-to-end MVP prove before adding navigation and construction complexity?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use a connectivity-first MVP | Proves the mod can expose world state and accept tool calls before investing in pathfinding and autonomous building |
| Use parallel research agents | The Fabric integration path, reference bots, and reusable mods are largely independent research threads |
| Use a Fabric mod plus external MCP server split | This isolates Minecraft internals from MCP protocol concerns and creates a testable seam |
| Treat Carpet/WorldEdit/Litematica-family projects as reference layers, not a single dependency stack | No existing project cleanly solves the full goal end-to-end on Fabric 1.20.1 |
| Use Node/TypeScript for the external MCP server | The MCP SDK is mature there and the localhost bridge will be easier to iterate outside the mod JVM |
| Start with command-based smoke tests in the Fabric mod | This validates the mod-side sensing path before adding the localhost bridge |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Parent folder is not a git repository | 1 | Initialize a repo inside the new workspace before committing artifacts |
| Gradle wrapper download timed out at 10 seconds | 1 | Increased `networkTimeout` to 120000 in `gradle-wrapper.properties` |
| Fabric Gradle build fails under Java 26 with `Unsupported class file major version 70` | 1 | Need to run the build under Java 21 or 17 instead of the system default Java 26 |

## Notes
- Update phase status as research converges
- Prefer primary sources: Fabric docs, GitHub repos, Modrinth project pages
- Focus on MVP paths that minimize client automation complexity
