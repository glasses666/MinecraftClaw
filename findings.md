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

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Start with a server-authoritative execution model | It is more deterministic and easier to validate than raw client input automation |
| Delay full player-like control | Vision, camera, and input loops add complexity before core MCP plumbing is proven |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Fresh workspace had no git history | Will initialize a local repo before committing planning artifacts |

## Resources
- Workspace: /Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot

## Visual/Browser Findings
- User screenshot shows a Fabric 1.20.1 setup baseline with LWJGL 3 3.3.1, Minecraft 1.20.1, Intermediary Mappings 1.20.1, and Fabric Loader 0.17.2

---
*Update this file after every 2 view/browser/search operations*
