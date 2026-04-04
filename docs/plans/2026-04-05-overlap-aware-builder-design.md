# Overlap-Aware Builder Design

## Goal
Add a thin planning layer between `scan_local_space` and block placement so MinecraftClaw stops inserting houses into existing structures.

## Scope
- Detect whether a whole building volume overlaps any occupied runs
- Detect POIs inside the build bounds before construction
- Choose a clear floating placement when no grounded flat site is available nearby
- Express one medium cozy cabin as a reusable execution blueprint

## Design
The new builder layer lives in `mcp-server`, not in the Fabric mod. The bridge already exposes enough local 3D data to reason about placement: per-column occupied runs, walkable surfaces, and POIs. The planner uses that compressed model to evaluate a full house-sized bounding box instead of checking a handful of anchor blocks.

`assessBlueprintPlacement` computes:
- build bounds from a candidate origin and blueprint dimensions
- overlapping occupied block count by intersecting the bounds with each column's occupied runs
- POI overlap inside the final volume
- a clear/non-clear verdict plus machine-readable reasons

`findFloatingPlacement` searches the current scan bounds for a valid origin, preferring:
1. zero overlap
2. zero POI collision
3. the fewest supporting columns underneath the footprint
4. shorter travel distance from the player

This ordering matters. It keeps the next house out of the existing sky-village structure instead of merely stacking it above the densest part of the current platform.

## Blueprint
`COZY_CABIN_V1` is a compact medium cabin:
- 7x8 footprint
- spruce floor and porch
- oak walls with stripped oak corner posts
- dark oak roof slab layer
- glass windows
- spruce door
- red bed, chest, crafting table, lanterns

The exterior direction and cozy material mix were guided by common starter-house and cottage tutorials emphasizing warm wood, stone/wood simplicity, lantern lighting, and compact useful interiors.

## Verification
- Red-first tests cover overlap detection, non-overlapping site selection, and absolute build plan emission
- Live build should only proceed when the selected placement reports zero occupied-volume overlap and zero POI overlap
