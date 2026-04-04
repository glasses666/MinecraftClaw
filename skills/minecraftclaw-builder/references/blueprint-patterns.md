# Blueprint Patterns

## Purpose

This reference explains how MinecraftClaw blueprints should be authored so the planner can assess and execute them safely.

## Step Types

### `fill`
Use for:
- floors
- walls
- posts
- roof slabs or flat shells

Prefer one `fill` over many single-block placements when the region is rectangular.

### `block`
Use for:
- windows
- accent blocks
- containers
- decorative single blocks

### `command`
Use for blocks whose state matters:
- doors
- beds
- lanterns
- campfires
- stairs/slabs with exact facing if needed

## Shape Guidelines

- Keep `width`, `depth`, and `height` exact and honest.
- Include overhangs in the footprint if they affect collision.
- First versions should stay under roughly `9x9x7` unless there is a strong reason to go bigger.
- Prefer cozy, legible silhouettes over noisy detail.

## Safety Rules

- If a structure has a roof overhang, account for it in `width`/`depth`.
- If the build uses a multi-block stateful object, emit it with `command` steps.
- If the structure introduces new interior POIs, expect them to appear in verification scans.

## Aesthetic Bias

For this repo, current blueprints should favor:
- warm wood palettes
- lantern lighting
- compact useful interiors
- readable silhouettes from a distance
- a slight handcrafted feel rather than perfect cubes
