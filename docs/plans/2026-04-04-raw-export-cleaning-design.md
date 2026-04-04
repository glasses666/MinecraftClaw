# MinecraftClaw Raw Export Cleaning Design

## Goal

Turn the first-pass Fabric raw export into a compact, stable summary that an agent can consume without being flooded by voxel noise or giant SNBT blobs.

This cleaning layer belongs on the MCP side first. The raw export remains the truth source; the cleaned summary becomes the agent-facing view.

## Real Sample Findings

Sample source:

- `20260404T094308Z-glasserrrr`

Observed shape from the first real export:

- `local_blocks.json`: `2048` entries
- `surface_map.json`: `1024` entries
- `entities.json`: `4` entries
- `block_entities.json`: `4` entries
- `inventory.json`: player inventory empty in this sample

Important signals:

- `local_blocks.json` is `73.78%` air, so direct voxel export is too noisy for default agent use.
- `surface_map.json` captures larger terrain structure much more cheaply than the full 3D local block box.
- `entities.json` and `block_entities.json` are low-cardinality but each row carries large `nbt_snbt` payloads.
- `block_entities.json.type` is not a stable public identifier in practice; `block_id` and SNBT `id` are the useful fields.
- The sample terrain is vertically irregular: surface height range is `201`, so naive “flat enough to build” assumptions would be wrong.

## First-Pass Cleaning Rules

### Keep

- Full player pose and survival state
- Scan context: dimension, center, scan box sizes, timestamps
- Non-empty inventory stacks and totals by item
- Aggregate non-air local block counts
- Thin per-`y` profiles for local non-air blocks
- Surface height summary and dominant surface blocks
- Nearby entities as lightweight rows
- Block-entity / POI positions with compact identifiers

### Drop or Compress

- Drop air rows from the cleaned local block summary
- Drop raw `state_string` from the top-level cleaned summary
- Drop raw `nbt_snbt` from default cleaned entities and POIs
- Drop empty inventory slots from the main inventory summary
- Do not expose raw 3D voxel lists by default in the main agent payload

### Derived Replacements

- Replace raw voxel lists with:
  - `totalBlocks`
  - `airBlocks`
  - `nonAirBlocks`
  - `airRatio`
  - `topNonAirBlocks`
  - `yLevelProfiles`
- Replace raw surface grid with:
  - `sampleCount`
  - `height.min`
  - `height.max`
  - `height.range`
  - `height.average`
  - `topBlocks`
- Replace raw block entity `type` with parsed SNBT `id` when available

## Cleaned Schema v1

```json
{
  "context": {
    "rawSchemaVersion": 1,
    "cleanedSchemaVersion": 1,
    "scannedAt": "2026-04-04T09:43:08Z",
    "dimension": "minecraft:overworld",
    "center": { "x": 26, "y": 269, "z": 13 },
    "localBox": { "width": 16, "depth": 16, "height": 8 },
    "surfaceBox": { "width": 32, "depth": 32 }
  },
  "player": {
    "name": "GLAsserrrr",
    "uuid": "...",
    "blockPos": { "x": 26, "y": 269, "z": 13 },
    "exactPos": { "x": 26.76, "y": 269.5, "z": 13.23 },
    "yaw": -94.5,
    "pitch": -4.5,
    "health": 20,
    "food": 20,
    "saturation": 4,
    "onGround": true,
    "hands": {
      "mainHandItemId": "minecraft:air",
      "offHandItemId": "minecraft:air"
    }
  },
  "inventory": {
    "totalSlots": 41,
    "occupiedSlots": 0,
    "stacks": [],
    "totalsByItem": []
  },
  "localEnvironment": {
    "totalBlocks": 2048,
    "airBlocks": 1511,
    "nonAirBlocks": 537,
    "airRatio": 0.7378,
    "topNonAirBlocks": [],
    "yLevelProfiles": []
  },
  "surface": {
    "sampleCount": 1024,
    "height": {
      "min": 91,
      "max": 292,
      "range": 201,
      "average": 217.34
    },
    "topBlocks": []
  },
  "entities": {
    "total": 4,
    "byType": [],
    "nearby": []
  },
  "pointsOfInterest": {
    "total": 4,
    "byBlockId": [],
    "entries": []
  }
}
```

## Why This Shape

- It preserves the agent’s ability to reason about location, terrain roughness, nearby actors, and available materials.
- It reduces token waste caused by air blocks and giant SNBT fields.
- It remains deterministic and easy to test.
- It leaves room for later optional detail tools such as:
  - `get_local_voxels`
  - `get_surface_grid`
  - `get_entity_nbt`
  - `get_block_entity_nbt`

## Next Iteration

- Validate this schema on at least three different environments:
  - open plains
  - dense forest
  - player-made settlement
- Add buildability heuristics only after multiple sample exports confirm stable signals
- Expose the cleaned summary as the default MCP read tool and keep raw detail behind opt-in tools
