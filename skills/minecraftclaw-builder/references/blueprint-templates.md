# Blueprint Templates

## Grounded House Template

Use when the structure should sit on terrain and read as part of the biome.

Palette bias:
- stone, tuff, cobblestone, or brick for the base
- spruce, dark oak, or oak for the shell
- lanterns, campfires, fences, trapdoors for warmth

Checklist:
- honest footprint in `width` and `depth`
- enclosed interior with at least one real entry point
- windows at eye level
- one or two clear utility POIs
- roof silhouette that reads from a distance

Skeleton:

```ts
export const TERRAIN_HOUSE_V1: StructureBlueprint = {
  id: "terrain_house_v1",
  width: 9,
  depth: 7,
  height: 7,
  steps: [
    fill({ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 6 }, "minecraft:stone_bricks"),
    fill({ x: 1, y: 1, z: 1 }, { x: 7, y: 4, z: 5 }, "minecraft:spruce_planks"),
    fill({ x: 2, y: 2, z: 2 }, { x: 6, y: 4, z: 4 }, "minecraft:air"),
    block({ x: 6, y: 2, z: 2 }, "minecraft:chest"),
    command("setblock {x} {y} {z} minecraft:spruce_door[facing=south,half=lower]", { x: 4, y: 1, z: 1 })
  ]
};
```

## Floating Structure Template

Use when the structure is intentionally suspended and should avoid all existing supports.

Palette bias:
- lighter decks
- exposed posts
- lantern-heavy lighting
- readable canopy or roof outline

Checklist:
- open sides or intentional air exposure
- small footprint
- no accidental terrain collision
- decorative focal point in the center

Skeleton:

```ts
export const SKY_STRUCTURE_V1: StructureBlueprint = {
  id: "sky_structure_v1",
  width: 7,
  depth: 7,
  height: 6,
  steps: [
    fill({ x: 1, y: 0, z: 1 }, { x: 5, y: 0, z: 5 }, "minecraft:spruce_planks"),
    fill({ x: 1, y: 1, z: 1 }, { x: 1, y: 4, z: 1 }, "minecraft:stripped_oak_log"),
    fill({ x: 1, y: 5, z: 1 }, { x: 5, y: 5, z: 5 }, "minecraft:dark_oak_planks"),
    command("setblock {x} {y} {z} minecraft:lantern[hanging=true]", { x: 3, y: 4, z: 3 })
  ]
};
```

## Style Selection

- Rocky ridge, cliff, stony plateau: grounded lodge with stone base and darker roof
- Meadow, flat grass, warm village edge: compact cabin with porch
- Sky island, bridge network, open void: gazebo or watch platform
