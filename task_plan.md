# Task Plan: Fabric MCP Builder Bot Research

## Goal
Validate a practical MVP path for a Fabric 1.20.1 mod plus MCP server that lets an agent sense the Minecraft world and execute building tasks, starting with proving MCP connectivity first.

## Current Phase
Phase 1

## Phases
### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [ ] Document findings in findings.md
- **Status:** in_progress

### Phase 2: Parallel Research
- [ ] Investigate Fabric-side integration options
- [ ] Find reusable bot/building/pathfinding references
- [ ] Find current GitHub/Modrinth projects worth borrowing from
- **Status:** pending

### Phase 3: MVP Architecture
- [ ] Define MCP-first architecture
- [ ] Define first milestone scope
- [ ] Record decision rationale
- **Status:** pending

### Phase 4: Bootstrap Plan
- [ ] Outline project layout
- [ ] Define first implementation tasks
- [ ] Identify verification checkpoints
- **Status:** pending

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

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Parent folder is not a git repository | 1 | Initialize a repo inside the new workspace before committing artifacts |

## Notes
- Update phase status as research converges
- Prefer primary sources: Fabric docs, GitHub repos, Modrinth project pages
- Focus on MVP paths that minimize client automation complexity
