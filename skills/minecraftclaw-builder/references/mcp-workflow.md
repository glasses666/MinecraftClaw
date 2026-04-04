# MCP Workflow

## Default Sequence

1. `get_player_state`
   Confirm the active instance, dimension, and current coordinates.

2. `analyze_local_space`
   Read the scene kind, buildability, and region hints.

3. `plan_build`
   Pick a blueprint and a placement mode.
   Default to `grounded` unless the structure is intentionally suspended.

4. `build_structure`
   Execute the plan only after the plan looks clear.

5. `scan_local_space`
   Re-scan the same area to verify the footprint and POIs.

## Tool Roles

### `analyze_local_space`

Use when you need:
- terrain fit
- scene semantics
- buildability hints
- candidate grounded anchors

### `plan_build`

Use when you need:
- a reproducible placement
- overlap checks across the full structure volume
- support metrics for grounded sites
- a safe preflight before touching the world

Common fields:
- `blueprintId`
- `placementMode`
- `radius`
- `down`
- `up`
- `clearanceAboveSurface`
- `minSupportRatio`
- `maxSurfaceVariance`

### `build_structure`

Use when the plan is acceptable and you want the whole blueprint executed through MCP.

Common fields:
- everything from `plan_build`
- `allowOverlap`

### Low-level tools

Use these only for repairs or one-off accents:
- `place_block`
- `fill_box`
- `clear_box`
- `run_command`

## Placement Guidance

### `grounded`

Use for:
- houses
- workshops
- towers
- cliff lodges
- road-adjacent structures

Tune with:
- `minSupportRatio`
- `maxSurfaceVariance`

### `floating`

Use for:
- sky gazebos
- suspended bridges
- intentional air builds

Tune with:
- `clearanceAboveSurface`

## Failure Policy

- If MCP returns `fetch failed`, the bridge is down.
- If `plan_build` cannot find a site, widen the scan or choose a smaller blueprint.
- If the selected plan overlaps occupied volume or POIs, stop and ask the user before forcing the build.
