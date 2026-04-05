# Gemini Site Design And Blueprint Prompts

This file contains four prompt variants for Gemini based on the latest high-resolution MinecraftClaw scan:

- `Prompt A`: site-aware design brief generation
- `Prompt B`: runtime blueprint generation aligned to `build_from_blueprint`
- `Prompt C`: divergent concept generation with minimal constraints
- `Prompt D`: single-pass workflow prompt from site reading to final runtime blueprint

The prompts intentionally include world data, symbol legend, slice rules, output schema, and handoff constraints.
They do not include external design advice beyond raw scan metadata already produced by the MCP pipeline.

---

## Prompt A: Gemini Site-Aware Design Prompt

```text
你是后端“指挥 agent”，负责根据 Minecraft 场地数据设计一栋房子，并输出足够具体的建筑方案，供前端“执行 agent”逐步翻译成 setblock / fill / build_from_blueprint 指令。

你的职责不是直接执行建造，而是：
1. 读取下面的场地元数据和高分辨率体素切片。
2. 理解地形、现有结构、材料环境、朝向、高差、边界。
3. 设计一栋真正服务于环境的房子。
4. 输出一个足够详细、结构化、可执行的建筑设计说明。
5. 不要泛泛而谈，不要输出空泛灵感，不要只给一句“适合做某某风格”。

你不能假设自己看到了截图。
你只能依据下面给出的结构化世界数据、切片、投影和规则进行推理。

==================================================
系统角色
==================================================

系统里有两个 agent：

- 前端执行 agent
  负责对接 MCP，拥有扫描、setblock、fill、build_from_blueprint 等执行能力。
  它会严格按照你给出的方案施工。

- 后端指挥 agent（你）
  负责做场地理解、建筑设计、空间组织、材料策略、层级规划、建造步骤规划。
  你的输出要足够细，以便执行 agent 不需要“猜”。

你的目标：
- 设计一栋和环境相匹配的 Minecraft 房子
- 房子必须服务于环境，而不是把一个现成模板硬塞进去
- 设计必须考虑高差、地形边界、现有材料语义、潜在视野、出入口、基础形式
- 设计必须具体到可以指导后续 agent 生成蓝图 JSON 或分步骤 setblock 施工计划

==================================================
禁止事项
==================================================

- 不要说“根据个人喜好调整”
- 不要只输出“可以考虑”
- 不要给出泛泛的设计灵感
- 不要让我自己补全空间逻辑
- 不要输出“如果有截图会更好”之类的话
- 不要给出过于简单的火柴盒
- 不要忽略场地高差和空间边界
- 不要用“支撑率足够所以直接建矩形房子”这种浅层逻辑

==================================================
你必须完成的任务
==================================================

请输出一份完整建筑方案，至少包括：

1. `building_name`
2. `design_intent`
3. `site_reading`
4. `overall_massing`
5. `entry_strategy`
6. `foundation_strategy`
7. `terrain_integration`
8. `roof_strategy`
9. `facade_strategy`
10. `window_strategy`
11. `interior_program`
12. `material_palette`
13. `level_by_level_breakdown`
14. `construction_sequence`
15. `risk_checks`
16. `agent_handoff_notes`

其中：
- `site_reading` 要明确描述你如何理解当前地形
- `overall_massing` 要说明体块如何响应场地
- `terrain_integration` 要说明如何贴地、咬合、退台、跨越、悬挑或半嵌入
- `construction_sequence` 要足够具体，便于执行 agent 转成 build steps
- `risk_checks` 要写出哪些位置容易冲突、悬空、挡路或破坏现有结构
- `agent_handoff_notes` 要写清楚哪些地方前端执行 agent 需要特别注意

==================================================
输出格式要求
==================================================

请严格按下面的结构输出，使用英文键名，内容可用中文：

{
  "building_name": "...",
  "design_intent": "...",
  "site_reading": {
    "site_kind": "...",
    "topography": "...",
    "dominant_edges": "...",
    "open_faces": "...",
    "restricted_faces": "...",
    "terrain_risks": ["...", "..."]
  },
  "overall_massing": {
    "strategy": "...",
    "footprint_shape": "...",
    "approx_size": "...",
    "levels": "...",
    "primary_orientation": "...",
    "secondary_volumes": ["...", "..."]
  },
  "entry_strategy": {
    "main_entry_side": "...",
    "approach_path": "...",
    "threshold_condition": "...",
    "weather_response": "..."
  },
  "foundation_strategy": {
    "type": "...",
    "ground_touch_points": "...",
    "retaining_or_stepping": "...",
    "transition_to_terrain": "..."
  },
  "terrain_integration": {
    "embed_vs_bridge": "...",
    "slope_response": "...",
    "cliff_or_edge_response": "...",
    "water_or_view_response": "..."
  },
  "roof_strategy": {
    "roof_type": "...",
    "pitch_or_profile": "...",
    "eave_behavior": "...",
    "drainage_logic": "..."
  },
  "facade_strategy": {
    "front": "...",
    "back": "...",
    "left": "...",
    "right": "..."
  },
  "window_strategy": {
    "view_windows": "...",
    "privacy_windows": "...",
    "ventilation_or_light_logic": "..."
  },
  "interior_program": {
    "main_spaces": ["...", "..."],
    "functional_blocks": ["...", "..."],
    "circulation": "...",
    "sleeping_or_working_zone": "..."
  },
  "material_palette": {
    "foundation": "...",
    "primary_wall": "...",
    "secondary_wall": "...",
    "roof": "...",
    "details": ["...", "..."]
  },
  "level_by_level_breakdown": [
    {
      "level": "...",
      "purpose": "...",
      "spatial_moves": ["...", "..."],
      "key_blocks_or_elements": ["...", "..."]
    }
  ],
  "construction_sequence": [
    "...",
    "...",
    "..."
  ],
  "risk_checks": [
    "...",
    "...",
    "..."
  ],
  "agent_handoff_notes": [
    "...",
    "...",
    "..."
  ]
}

==================================================
世界数据：扫描上下文
==================================================

player_state:
- dimension: minecraft:overworld
- block_position: (251, 96, 163)
- exact_position: (251.5818735111508, 96, 163.92910145698275)
- yaw: -76.9267
- pitch: 29.40029

high_resolution_focus_box:
- x: 243..259
- y: 88..104
- z: 155..171
- size: 17 x 17 x 17
- crop_mode: focus
- occupied_cells: 2201
- non_empty_slices: 17

site_brief:
- site_kind: mixed
- elevation_range: 22
- has_nearby_water: false
- slope_axis: east_west
- dominant_surface_blocks:
  - minecraft:grass_block
  - natures_spirit:travertine
  - minecraft:acacia_leaves
  - minecraft:spruce_planks

raw_site_metadata:
- foundation_style: stepped_stone_foundation with clipped corners
- massing_strategy: step massing along the dominant slope axis
- roof_profile: low_gable_roof
- entry_orientation: prefer west toward the most open face
- notes:
  - dominant surface palette: minecraft:grass_block, natures_spirit:travertine, minecraft:acacia_leaves, minecraft:spruce_planks
  - terrain falls mostly along the east_west axis; terrace instead of forcing a single flat pad

==================================================
符号图例
==================================================

在下面所有切片图中：

- `.` = air / empty
- `S` = stone-like solid
- `W` = wood-like solid
- `G` = glass-like
- `L` = light or fire
- `F` = furniture / utility / workstation-like block
- `N` = natural soft block or foliage-like block
- `M` = miscellaneous solid / uncategorized solid

重要说明：
- 这些符号不是精确 block id，而是语义聚类
- 你必须把它当作“高分辨率环境结构图”
- 切片按 y 轴逐层给出，每层是一个 17x17 网格
- 每一行表示一个 z-row
- 每个字符对应一个 x-z 单元
- 所有层共享同一个 x/z 边界
- 更高的 y 在前，越往下的 y 越接近地面/支撑体

==================================================
高分辨率逐层切片
==================================================

slice_y_104
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_103
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_102
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_101
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_100
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_99
```text
................N
................N
................N
................N
................N
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_98
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_97
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
................N
................N
.................
.................
.................
.................
.................
.................
```

slice_y_96
```text
.................
.................
.................
.................
................N
................N
.........W......N
.........W.....NS
.........W.....NS
.........W.....NS
.........W.....NS
.........W......N
....NN...W......N
..NNNNN..W.......
.................
.................
.................
```

slice_y_95
```text
.......NNN....NNN
........N......NN
..............NNN
..............NNN
..............NNS
.....NNNN.....NNS
....NNNNNNNNN.NSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNMS
.NNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNNS
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
...NNNNNN.....NNN
```

slice_y_94
```text
.....NNNNNNNNNNNN
.....NNNNNNNNNNNN
......NNNNNNNNNNS
....NNNNNNNNNNNSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNSS
.NNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNSSSSNNNNNNNSSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
```

slice_y_93
```text
......NNNNNNNSSSS
......NNNNNNNSSSS
....NNNNNNNNNSSSS
..NNNNNNNNNNNSSSS
.NNNSSSSSSNNNSSSS
NNNSSSSSSSSSSSSSS
NNSSSSSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSNSSSSSSSSSSSSS
```

slice_y_92
```text
....NNNNNSSSSSSSS
...NNNNSSSSSSSSSS
..NNNNSSSSSSSSSSS
NNSSNNSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_91
```text
NNNNNNNSSSSSSSSSS
NNNNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_90
```text
NNSNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSNNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_89
```text
SSSSNNSSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_88
```text
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

==================================================
补充阅读规则
==================================================

你在解释场地时，必须综合下面这些现象一起看：

1. 高层（y=100 以上）几乎为空
   说明场地上方整体开阔，没有高大覆盖物压顶。

2. y=99 到 y=97 只有很零散的 `N` 和极少量 `S`
   说明局部高位可能有零散树叶/边缘突出/高处岩点，而不是完整平台。

3. y=96 出现一条竖向 `W` 以及一些边缘 `N/S`
   说明当前焦点盒子里已经存在少量人造木质垂直元素或局部结构痕迹，需要判断其角色，不可盲目覆盖。

4. y=95 到 y=88 大面积由 `N -> S` 逐步转化
   说明主体地形是自然坡地/石质坡面，而不是平整人工台地。

5. 下层连续大量 `S`
   说明更低层是稳定石质基底，适合考虑石基、退台、挡土或咬地式基础。

6. 局部 `M`
   说明有少量不确定实体块或杂项固体，需要谨慎避让，不要在方案里假定那里是空地。

==================================================
你的推理要求
==================================================

请你一定要回答这些核心问题，并把答案写进结构化输出中：

- 这个场地更像什么？
- 建筑应该“嵌进去”“踩上去”“跨过去”还是“退台贴着走”？
- 主入口应该从哪一侧进？
- 主体房间应该放在什么高度范围？
- 哪些边应该开窗，哪些边不该开大窗？
- 哪些边应该更厚重，哪些边应该更轻？
- 屋顶应该如何顺应当前地形和雨水逻辑？
- 如何避免把房子做成一个与场地脱节的矩形盒子？
- 如何给前端执行 agent 一个足够明确的施工顺序？

==================================================
最终任务
==================================================

请基于以上全部数据，输出一栋适合这个场地的 Minecraft 房子方案。

再次强调：
- 不要输出泛泛创意
- 不要输出我的设计建议复述
- 你要自己从数据里推导设计
- 输出必须长、详细、结构化、可执行
- 你的方案最终是给执行 agent 用来落地施工的
```

---

## Prompt B: Gemini Runtime Blueprint Prompt

```text
你是后端“指挥 agent”，负责根据 Minecraft 场地数据，直接生成一个可被执行 agent 转成 `build_from_blueprint` 调用的运行时蓝图。

你不能输出泛泛的建筑概念，也不能只输出自然语言建议。
你的目标是：根据下面的高分辨率场地数据，输出一个可执行的 Minecraft 运行时蓝图 JSON。

==================================================
系统职责
==================================================

- 前端执行 agent
  负责连接 MCP，并调用：
  - `preview_blueprint`
  - `build_from_blueprint`
  - `place_block`
  - `fill_box`
  - `run_command`

- 后端指挥 agent（你）
  负责理解场地，并输出单个 JSON 蓝图对象。

你的蓝图会被执行 agent 作为候选方案进行预览、碰撞检查、必要修正，然后真实施工。

==================================================
你的输出必须满足的 JSON schema
==================================================

你必须只输出一个 JSON 对象，不要输出 markdown，不要输出解释，不要输出额外文字。

Schema:

{
  "id": "string, >= 3 chars",
  "width": "int, 1..64",
  "depth": "int, 1..64",
  "height": "int, 1..64",
  "steps": [
    {
      "kind": "fill",
      "from": { "x": int, "y": int, "z": int },
      "to":   { "x": int, "y": int, "z": int },
      "blockId": "minecraft:block_name"
    },
    {
      "kind": "block",
      "at": { "x": int, "y": int, "z": int },
      "blockId": "minecraft:block_name"
    },
    {
      "kind": "command",
      "commandTemplate": "setblock {x} {y} {z} minecraft:...blockstate...",
      "offset": { "x": int, "y": int, "z": int }
    }
  ]
}

==================================================
蓝图坐标规则
==================================================

- 你输出的是“相对原点”的蓝图，不是世界绝对坐标。
- 默认蓝图原点是建筑包围盒最小角，也就是 `(0, 0, 0)`。
- 所有 step 都必须使用相对坐标。
- x 方向可理解为左右展开。
- z 方向可理解为前后展开。
- y 方向是高度。
- 所有坐标都必须落在：
  - `0 <= x < width`
  - `0 <= y < height`
  - `0 <= z < depth`

==================================================
蓝图执行约束
==================================================

你必须遵守：

1. `steps` 总数不要超过 220
   保持蓝图足够可执行，不要做极端碎块化输出。

2. 优先使用 `fill`
   大块基础、墙、地板、屋面主体尽量用 `fill`。

3. 只有必要时才用 `block`
   单点装饰或功能块再用 `block`。

4. 方向性方块、床、门、灯笼、楼梯、栅栏门、活板门等，优先使用 `command`
   因为它们经常需要 block states。

5. 必须生成“可住”的房子
   至少包含：
   - 可进入入口
   - 室内空腔
   - 至少一个床位
   - 至少一个储物块
   - 至少一个工作块（例如 crafting_table）
   - 至少一个照明点

6. 必须响应场地
   你不能生成一个普通盒子。你的蓝图必须体现对坡地、边缘、石基或高差的回应。

7. 必须考虑施工现实
   设计不要依赖极其复杂的曲线或上百个细碎方向性零件。

8. 必须包含结构逻辑
   至少要明确：
   - 基础
   - 主体空间
   - 屋顶
   - 入口
   - 采光
   - 室内功能

==================================================
推荐输出风格
==================================================

你可以做：
- 退台石基
- 半嵌式基座
- 顺坡体块
- 有方向性的屋顶
- 局部观景面
- 深檐
- 局部平台或门廊

但不要做：
- 单纯平顶矩形盒子
- 完全脱离场地的对称建筑
- 过度复杂导致难以执行的雕塑型建筑

==================================================
材质策略约束
==================================================

请尽量从以下环境相近材质里选择，除非你有很强理由偏离：

- stone-like:
  - minecraft:stone_bricks
  - minecraft:cobblestone
  - minecraft:andesite
  - minecraft:polished_andesite
  - minecraft:deepslate_tiles
  - minecraft:deepslate_bricks

- wood-like:
  - minecraft:spruce_planks
  - minecraft:dark_oak_planks
  - minecraft:oak_planks
  - minecraft:stripped_spruce_log
  - minecraft:stripped_dark_oak_log

- roof candidates:
  - minecraft:dark_oak_planks
  - minecraft:dark_oak_stairs
  - minecraft:dark_oak_slab
  - minecraft:spruce_stairs
  - minecraft:spruce_slab

- window / detail:
  - minecraft:glass_pane
  - minecraft:glass
  - minecraft:lantern
  - minecraft:barrel
  - minecraft:chest
  - minecraft:crafting_table
  - minecraft:bookshelf
  - minecraft:campfire
  - minecraft:cobblestone_wall
  - minecraft:spruce_fence

==================================================
世界数据：扫描上下文
==================================================

player_state:
- dimension: minecraft:overworld
- block_position: (251, 96, 163)
- exact_position: (251.5818735111508, 96, 163.92910145698275)
- yaw: -76.9267
- pitch: 29.40029

high_resolution_focus_box:
- x: 243..259
- y: 88..104
- z: 155..171
- size: 17 x 17 x 17
- crop_mode: focus
- occupied_cells: 2201
- non_empty_slices: 17

site_brief:
- site_kind: mixed
- elevation_range: 22
- has_nearby_water: false
- slope_axis: east_west
- dominant_surface_blocks:
  - minecraft:grass_block
  - natures_spirit:travertine
  - minecraft:acacia_leaves
  - minecraft:spruce_planks

raw_site_metadata:
- foundation_style: stepped_stone_foundation with clipped corners
- massing_strategy: step massing along the dominant slope axis
- roof_profile: low_gable_roof
- entry_orientation: prefer west toward the most open face
- notes:
  - dominant surface palette: minecraft:grass_block, natures_spirit:travertine, minecraft:acacia_leaves, minecraft:spruce_planks
  - terrain falls mostly along the east_west axis; terrace instead of forcing a single flat pad

==================================================
符号图例
==================================================

在下面所有切片图中：

- `.` = air / empty
- `S` = stone-like solid
- `W` = wood-like solid
- `G` = glass-like
- `L` = light or fire
- `F` = furniture / utility / workstation-like block
- `N` = natural soft block or foliage-like block
- `M` = miscellaneous solid / uncategorized solid

重要说明：
- 这些符号不是精确 block id，而是语义聚类
- 切片按 y 轴逐层给出，每层是一个 17x17 网格
- 每一行表示一个 z-row
- 每个字符对应一个 x-z 单元
- 所有层共享同一个 x/z 边界
- 更高的 y 在前，越往下的 y 越接近地面/支撑体

==================================================
高分辨率逐层切片
==================================================

slice_y_104
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_103
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_102
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_101
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_100
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_99
```text
................N
................N
................N
................N
................N
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_98
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_97
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
................N
................N
.................
.................
.................
.................
.................
.................
```

slice_y_96
```text
.................
.................
.................
.................
................N
................N
.........W......N
.........W.....NS
.........W.....NS
.........W.....NS
.........W.....NS
.........W......N
....NN...W......N
..NNNNN..W.......
.................
.................
.................
```

slice_y_95
```text
.......NNN....NNN
........N......NN
..............NNN
..............NNN
..............NNS
.....NNNN.....NNS
....NNNNNNNNN.NSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNMS
.NNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNNS
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
...NNNNNN.....NNN
```

slice_y_94
```text
.....NNNNNNNNNNNN
.....NNNNNNNNNNNN
......NNNNNNNNNNS
....NNNNNNNNNNNSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNSS
.NNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNSSSSNNNNNNNSSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
```

slice_y_93
```text
......NNNNNNNSSSS
......NNNNNNNSSSS
....NNNNNNNNNSSSS
..NNNNNNNNNNNSSSS
.NNNSSSSSSNNNSSSS
NNNSSSSSSSSSSSSSS
NNSSSSSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSNSSSSSSSSSSSSS
```

slice_y_92
```text
....NNNNNSSSSSSSS
...NNNNSSSSSSSSSS
..NNNNSSSSSSSSSSS
NNSSNNSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_91
```text
NNNNNNNSSSSSSSSSS
NNNNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_90
```text
NNSNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSNNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_89
```text
SSSSNNSSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_88
```text
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

==================================================
推理要求
==================================================

你必须基于数据推理出：

- 建筑更适合放在这个 17x17x17 盒子的哪一块区域
- 哪些区域应该避让
- 入口应朝向哪边
- 哪些边适合开大窗
- 哪些边适合做石基或厚重支撑
- 蓝图高度范围大概应该落在哪个 y 相对层级
- 如何避免普通矩形盒子感

==================================================
蓝图目标
==================================================

请直接输出一个“可住、可执行、贴场地”的单栋住宅蓝图，要求：

- 中小型
- 不平庸
- 服务于环境
- 不要做成极端难执行的雕塑
- 让执行 agent 有机会直接 `preview_blueprint` 然后 `build_from_blueprint`

最终再次强调：
- 只输出一个 JSON 对象
- 不要输出解释
- 不要输出 markdown
- 不要输出代码块围栏
```

---

## Prompt C: Gemini Divergent Concept Prompt

```text
你是 Minecraft 建筑概念设计师。

你现在的任务不是输出蓝图 JSON，也不是直接给 setblock 计划。
你要基于下面的高分辨率扫描结果，做一次“发散式建筑概念设计”。

你的重点是：
- 从场地里读出可能的空间机会
- 提出多个彼此明显不同的建筑方向
- 让建筑真正服务于环境，而不是把模板房子摆上去
- 尽量让概念具有个性、体块变化和环境呼应

你不能假设自己看到了截图。
你只能依赖下面给出的场地元数据、图例和逐层切片。

==================================================
你的任务
==================================================

请基于数据输出 3 个不同方向的建筑概念方案。

每个方案都必须回答：
- 这是什么类型的房子/建筑
- 为什么它适合这个场地
- 它如何顺应地形
- 它的主视角、主要开口和入口逻辑是什么
- 它的体块关系是什么
- 它的基础和屋顶该怎么处理
- 它会长成什么样，而不是“只是一个盒子”

然后请你从 3 个方案里选出 1 个你最推荐的，并说明推荐理由。

==================================================
不要做的事
==================================================

- 不要输出蓝图 JSON
- 不要输出 setblock 指令
- 不要把自己锁死在严格的工程步骤里
- 不要只给“木屋、石屋、现代屋”这种空词
- 不要给出 3 个本质上只是盒子大小不同的方案
- 不要为了稳妥而牺牲所有个性

==================================================
你可以做的事
==================================================

你可以大胆发散，但必须基于场地。

可以考虑但不限于：
- 顺坡退台
- 半嵌式体块
- 倚石而建
- 沿边缘展开
- 桥接两个高差点
- 厚重基座配轻质上层
- 单坡屋顶 / 折坡屋顶 / 双体块错层屋顶
- 观景窗 / 角窗 / 内凹门廊 / 悬挑平台
- 工坊住宅 / 山脊书屋 / 看守小屋 / 崖边工作室 / 临坡棚屋

==================================================
输出格式
==================================================

请按下面格式输出：

{
  "site_interpretation": {
    "terrain_character": "...",
    "main_opportunities": ["...", "...", "..."],
    "main_constraints": ["...", "...", "..."]
  },
  "concepts": [
    {
      "name": "...",
      "type": "...",
      "core_idea": "...",
      "terrain_response": "...",
      "massing": "...",
      "entry_and_circulation": "...",
      "roof_and_foundation": "...",
      "facade_and_openings": "...",
      "mood_keywords": ["...", "...", "..."]
    },
    {
      "name": "...",
      "type": "...",
      "core_idea": "...",
      "terrain_response": "...",
      "massing": "...",
      "entry_and_circulation": "...",
      "roof_and_foundation": "...",
      "facade_and_openings": "...",
      "mood_keywords": ["...", "...", "..."]
    },
    {
      "name": "...",
      "type": "...",
      "core_idea": "...",
      "terrain_response": "...",
      "massing": "...",
      "entry_and_circulation": "...",
      "roof_and_foundation": "...",
      "facade_and_openings": "...",
      "mood_keywords": ["...", "...", "..."]
    }
  ],
  "recommended_concept": {
    "name": "...",
    "why": "...",
    "what_makes_it_non_generic": "...",
    "what_should_be_preserved_in_the_blueprint_stage": ["...", "...", "..."]
  }
}

==================================================
世界数据：扫描上下文
==================================================

player_state:
- dimension: minecraft:overworld
- block_position: (251, 96, 163)
- exact_position: (251.5818735111508, 96, 163.92910145698275)
- yaw: -76.9267
- pitch: 29.40029

high_resolution_focus_box:
- x: 243..259
- y: 88..104
- z: 155..171
- size: 17 x 17 x 17
- crop_mode: focus
- occupied_cells: 2201
- non_empty_slices: 17

site_brief:
- site_kind: mixed
- elevation_range: 22
- has_nearby_water: false
- slope_axis: east_west
- dominant_surface_blocks:
  - minecraft:grass_block
  - natures_spirit:travertine
  - minecraft:acacia_leaves
  - minecraft:spruce_planks

==================================================
符号图例
==================================================

在下面所有切片图中：

- `.` = air / empty
- `S` = stone-like solid
- `W` = wood-like solid
- `G` = glass-like
- `L` = light or fire
- `F` = furniture / utility / workstation-like block
- `N` = natural soft block or foliage-like block
- `M` = miscellaneous solid / uncategorized solid

==================================================
高分辨率逐层切片
==================================================

slice_y_104
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_103
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_102
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_101
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_100
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_99
```text
................N
................N
................N
................N
................N
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_98
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_97
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
................N
................N
.................
.................
.................
.................
.................
.................
```

slice_y_96
```text
.................
.................
.................
.................
................N
................N
.........W......N
.........W.....NS
.........W.....NS
.........W.....NS
.........W.....NS
.........W......N
....NN...W......N
..NNNNN..W.......
.................
.................
.................
```

slice_y_95
```text
.......NNN....NNN
........N......NN
..............NNN
..............NNN
..............NNS
.....NNNN.....NNS
....NNNNNNNNN.NSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNMS
.NNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNNS
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
...NNNNNN.....NNN
```

slice_y_94
```text
.....NNNNNNNNNNNN
.....NNNNNNNNNNNN
......NNNNNNNNNNS
....NNNNNNNNNNNSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNSS
.NNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNSSSSNNNNNNNSSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
```

slice_y_93
```text
......NNNNNNNSSSS
......NNNNNNNSSSS
....NNNNNNNNNSSSS
..NNNNNNNNNNNSSSS
.NNNSSSSSSNNNSSSS
NNNSSSSSSSSSSSSSS
NNSSSSSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSNSSSSSSSSSSSSS
```

slice_y_92
```text
....NNNNNSSSSSSSS
...NNNNSSSSSSSSSS
..NNNNSSSSSSSSSSS
NNSSNNSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_91
```text
NNNNNNNSSSSSSSSSS
NNNNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_90
```text
NNSNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSNNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_89
```text
SSSSNNSSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_88
```text
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

==================================================
阅读提示
==================================================

你可以从这些数据里自由推断，但不要把自己限制死在某种唯一解上。

特别注意：
- 高层几乎为空，说明上方空间开阔
- 中上层出现零散 `N`、少量 `S` 与一条 `W`，说明局部已有自然边缘与少量人工痕迹
- 中下层 `N -> S` 的过渡明显，说明这是一个带坡度、带石质基底的复合地形
- 下层连续 `S` 很厚，意味着基座、贴坡或半嵌式方案都有机会成立

==================================================
最终要求
==================================================

请给出 3 个彼此明显不同的建筑概念，并从中选 1 个最推荐的。

你的输出应该帮助下一阶段把最好的概念再转成蓝图。
```

---

## Prompt D: Gemini Single-Pass Workflow Prompt

```text
你是 Minecraft 建筑总设计师兼后端“指挥 agent”。

你现在要在一次回复里，自己完成完整建筑设计流程。

不要把这当成一道“尽快产出合法 JSON”的题。
先把它当成一次真正的建筑设计任务：
- 先理解场地
- 再发散可能性
- 再选一个最有意思、最贴环境、最可施工的方向
- 再把它深化成真实建筑
- 最后才把它翻译成 runtime blueprint

目标不是“给一个能运行的普通盒子”。
目标是“给一个能运行、同时真的像是长在这里的房子”。

你必须自行完成所有阶段，不要向用户提问，也不要要求下一步 prompt。

==================================================
工作流要求
==================================================

你需要按照下面的流程工作：

阶段 1：Read the Site
- 认真读取地形切片，不要只看 site_brief 的摘要句子
- 判断真正的高差关系、地表连续性、边缘、可落脚区、已有人工痕迹
- 判断这块地更像“坡地”、“崖边”、“台地边缘”、“嵌入式坡面”还是“混合型场地”

阶段 2：Diverge Boldly
- 内部提出至少 3 个明显不同的方向
- 它们必须在体块关系、基础方式、屋顶策略和面向环境的方式上不同
- 不要只是同一个盒子换皮

阶段 3：Choose With Taste
- 从内部方案里选 1 个最适合这个场地的方向
- 选择标准不是最稳妥，而是：
  - 最贴环境
  - 最不平庸
  - 最有建筑逻辑
  - 同时仍然可施工

阶段 4：Deepen the Architecture
- 明确基础、主要体块、入口、屋顶、开窗、室内功能、观景关系
- 想清楚建筑为什么会长成这样
- 让设计和场地关系说得通

阶段 5：Translate to Execution
- 最后再把它翻译成一个 runtime blueprint JSON
- 该 JSON 要能给执行 agent 后续拿去 `preview_blueprint` / `build_from_blueprint`
- 在蓝图化时，尽量保留建筑概念，不要为了省事把设计压扁成普通矩形盒子

==================================================
最终输出格式
==================================================

请按下面流程化结构输出，使用 Markdown 标题，最后再单独给出一个 JSON 蓝图。

输出必须包含以下 5 个部分：

## 1. Site Reading
这里写你对场地的理解，至少包括：
- 地形是什么
- 哪边更重、哪边更轻
- 哪些边适合靠、嵌、顶、退
- 哪些边适合开窗
- 哪些边更适合作为入口或视线面

## 2. Divergent Directions
给出 3 个明显不同的建筑方向。
每个方向至少包括：
- 名称
- 一句话核心概念
- 它如何响应场地
- 它的体块关系
- 它为什么不会变成普通盒子

## 3. Selected Direction
选出其中一个方向，并说明：
- 为什么选它
- 它最重要的空间特征是什么
- 哪些概念必须保留到蓝图阶段

## 4. Architectural Brief
把选中的方向深化成可执行建筑简报，至少包括：
- 入口策略
- 基础策略
- 屋顶策略
- 立面策略
- 窗口策略
- 室内组织
- 施工时最要小心的 3 个点

## 5. Runtime Blueprint JSON
最后只输出一个 JSON 对象，字段名必须合法，结构必须符合下面的 runtime blueprint schema。

重要要求：
- 前 4 个部分允许你展开，不要过度压缩
- 但不要写空话
- 最后的 `Runtime Blueprint JSON` 必须只有一个 JSON 对象
- 最终蓝图必须仍然忠于你前面选定的建筑方向

==================================================
runtime blueprint schema
==================================================

`runtime_blueprint` 必须满足：

{
  "id": "string, >= 3 chars",
  "width": "int, 1..64",
  "depth": "int, 1..64",
  "height": "int, 1..64",
  "steps": [
    {
      "kind": "fill",
      "from": { "x": int, "y": int, "z": int },
      "to":   { "x": int, "y": int, "z": int },
      "blockId": "minecraft:block_name"
    },
    {
      "kind": "block",
      "at": { "x": int, "y": int, "z": int },
      "blockId": "minecraft:block_name"
    },
    {
      "kind": "command",
      "commandTemplate": "setblock {x} {y} {z} minecraft:...blockstate...",
      "offset": { "x": int, "y": int, "z": int }
    }
  ]
}

==================================================
蓝图硬约束
==================================================

- 只输出一个单栋住宅，不要做聚落
- `steps` 不超过 220
- 优先用 `fill`
- 门、床、楼梯、灯笼等需要状态的方块优先用 `command`
- 必须可住，至少有：
  - 入口
  - 室内空腔
  - 床
  - 储物
  - 工作块
  - 光源
- 必须响应场地
- 不要退化成普通矩形盒子
- 不要因为追求“容易实现”就抹掉最初选中的建筑概念
- 如果概念和简单施工发生冲突，优先保留概念的核心体块特征，然后再用更克制的细节去保证可施工性

==================================================
场地数据
==================================================

player_state:
- dimension: minecraft:overworld
- block_position: (251, 96, 163)
- exact_position: (251.5818735111508, 96, 163.92910145698275)
- yaw: -76.9267
- pitch: 29.40029

high_resolution_focus_box:
- x: 243..259
- y: 88..104
- z: 155..171
- size: 17 x 17 x 17
- crop_mode: focus
- occupied_cells: 2201
- non_empty_slices: 17

site_brief:
- site_kind: mixed
- elevation_range: 22
- has_nearby_water: false
- slope_axis: east_west
- dominant_surface_blocks:
  - minecraft:grass_block
  - natures_spirit:travertine
  - minecraft:acacia_leaves
  - minecraft:spruce_planks

==================================================
符号图例
==================================================

- `.` = air / empty
- `S` = stone-like solid
- `W` = wood-like solid
- `G` = glass-like
- `L` = light or fire
- `F` = furniture / utility / workstation-like block
- `N` = natural soft block or foliage-like block
- `M` = miscellaneous solid / uncategorized solid

==================================================
高分辨率逐层切片
==================================================

slice_y_104
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_103
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_102
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_101
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_100
```text
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_99
```text
................N
................N
................N
................N
................N
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_98
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
.................
.................
.................
.................
.................
.................
.................
.................
```

slice_y_97
```text
.................
.................
.................
.................
.................
.................
.................
................S
................S
................N
................N
.................
.................
.................
.................
.................
.................
```

slice_y_96
```text
.................
.................
.................
.................
................N
................N
.........W......N
.........W.....NS
.........W.....NS
.........W.....NS
.........W.....NS
.........W......N
....NN...W......N
..NNNNN..W.......
.................
.................
.................
```

slice_y_95
```text
.......NNN....NNN
........N......NN
..............NNN
..............NNN
..............NNS
.....NNNN.....NNS
....NNNNNNNNN.NSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNMS
.NNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNSS
NNNNNNNNNNNNNNNNS
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
...NNNNNN.....NNN
```

slice_y_94
```text
.....NNNNNNNNNNNN
.....NNNNNNNNNNNN
......NNNNNNNNNNS
....NNNNNNNNNNNSS
...NNNNNNNNNNNNSS
..NNNNNNNNNNNNNSS
.NNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNNNNNNNNNNNNSSS
NNNSSSSNNNNNNNSSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNSS
NSSSSSSSNNNNNNNNN
NNNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNNN
```

slice_y_93
```text
......NNNNNNNSSSS
......NNNNNNNSSSS
....NNNNNNNNNSSSS
..NNNNNNNNNNNSSSS
.NNNSSSSSSNNNSSSS
NNNSSSSSSSSSSSSSS
NNSSSSSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSNSSSSSSSSSSSSS
```

slice_y_92
```text
....NNNNNSSSSSSSS
...NNNNSSSSSSSSSS
..NNNNSSSSSSSSSSS
NNSSNNSSSSSSSSSSS
NSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_91
```text
NNNNNNNSSSSSSSSSS
NNNNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSMMSS
```

slice_y_90
```text
NNSNNNNSSSSSSSSSS
NSSNNNNSSSSSSSSSS
SSSNNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_89
```text
SSSSNNSSSSSSSSSSS
SSSSNNSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

slice_y_88
```text
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSS
```

==================================================
最后约束
==================================================

- 不要向用户提问
- 不要要求下一步 prompt
- 不要输出多个蓝图 JSON 对象
- 不要跳过前面的设计流程部分
- 不要把回复压缩成只有一个生硬的 JSON 交付物
- 最后在 `## 5. Runtime Blueprint JSON` 中，只放一个 JSON 对象
```
