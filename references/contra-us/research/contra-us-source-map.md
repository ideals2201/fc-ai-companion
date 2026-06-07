# Contra US source map for strategy database

Research date: 2026-06-07

Scope: Contra (US) NES ROM only. This file contains source/data references for building a RAM/WorldX-driven strategy database. It does not contain ROM data and does not define a controller.

## Conclusion

The best primary source is `vermiceli/nes-contra-us`, because it confirms the exact Contra US ROM hash, exposes the annotated bank 2 enemy spawn tables, bank 7 enemy routine/property tables, and a RAM symbol map. Data Crystal is useful as an external RAM map cross-check. The Contra speedrunning technical details are useful as a behavior explanation layer, especially for screen-space coordinates, enemy spawn ordering, random soldier generation, and movement physics.

For the current strategy database, use static route/object data from `src/bank2.asm` and runtime validation fields from RAM. Do not drive gameplay from TAS input. Treat TAS/speedrun notes as route landmarks and mechanic explanations only.

## ROM version confirmation

Target ROM:

- Game: Contra (US), NES.
- Required MD5: `7BDAD8B4A7A56A634C9649D20BD3011B`.
- Source: `vermiceli/nes-contra-us` README, `Building / Prerequisites`.
- URL: https://github.com/vermiceli/nes-contra-us

The same README says the repository requires an existing legal US ROM named `baserom.nes` for rebuilding and does not include all copyrighted assets. This matches the project policy: no ROM files, no ROM download links, no derived ROM asset dump in the repo.

## Primary source index

| Source | Use | Specific file or section |
| --- | --- | --- |
| vermiceli/nes-contra-us | Primary static data and symbols | `README.md`, `src/bank2.asm`, `src/bank7.asm`, `src/ram.asm`, `docs/Enemy Routines.md`, `docs/Enemy Glossary.md`, `docs/ROM Map.md` |
| Data Crystal | RAM map cross-check | `Contra (NES)/RAM map` |
| Contra Speedrunning Wiki | Mechanics explanation | `Technical Details Contra`: Contra Levels, Random Enemies, Base Enemies, Collision Detection, Movement details |

Links:

- https://github.com/vermiceli/nes-contra-us
- https://github.com/vermiceli/nes-contra-us/blob/main/docs/Enemy%20Routines.md
- https://github.com/vermiceli/nes-contra-us/blob/main/docs/Enemy%20Glossary.md
- https://github.com/vermiceli/nes-contra-us/blob/main/docs/ROM%20Map.md
- https://datacrystal.tcrf.net/wiki/Contra_(NES)/RAM_map
- https://contra-speedrunning.fandom.com/wiki/Technical_Details_Contra

## Where the level 1 enemy/object spawn table lives

Main file:

- `src/bank2.asm`
- Pointer table: `level_enemy_screen_ptr_ptr_tbl`
- Level 1 pointer table: `level_1_enemy_screen_ptr_tbl`
- Level 1 entries: `level_1_enemy_screen_00` through `level_1_enemy_screen_0c`
- Raw line anchors observed from current upstream raw file:
  - `level_1_enemy_screen_ptr_tbl`: lines 2241-2254
  - outdoor byte format comment: lines 2256-2269
  - `level_1_enemy_screen_00`: lines 2270-2277
  - `level_1_enemy_screen_0b`: lines 2328-2334
  - `level_1_enemy_screen_0c`: lines 2336-2337

Supporting doc:

- `docs/Enemy Routines.md`
- Section: `Level Enemies` and `Data Structure / Outdoor levels`.
- It says the bank 2 pointer table has one 2-byte entry per level and each level entry points to a per-screen pointer table.
- It documents the outdoor record as `XX TT YY`, decoded as `XXXX XXXX  RRTT TTTT  YYYY YAAA`.

## Outdoor enemy record parser

For outdoor levels, each base record is 3 bytes:

| Byte | Bits | Field | Meaning |
| --- | --- | --- | --- |
| byte 0 | `XXXXXXXX` | `x_offset` | X offset / scroll threshold inside the screen table entry |
| byte 1 | `RR------` | `repeat_count` | Number of extra Y/attribute bytes after the base record |
| byte 1 | `--TTTTTT` | `enemy_type` | Enemy type code; values `00`-`0f` are shared, `10+` are level-specific |
| byte 2 | `YYYYY---` | `y_offset` | Y offset, masked with `0xf8` |
| byte 2 | `-----AAA` | `attribute` | 3-bit type-specific attribute |

Repeat handling:

- If `repeat_count == 0`, the record consumes 3 bytes.
- If `repeat_count > 0`, the record consumes `3 + repeat_count` bytes.
- Each repeated byte has the same `YYYYYAAA` layout and reuses the same `x_offset` and `enemy_type`.
- End marker is `$ff`.

Important alignment risk:

- `docs/Enemy Routines.md` notes that screen 0 has no enemies and the first entry is associated with the second screen. For strategy data, store both `screen_table_index` and a separate `runtime_screen_number_observed` once verified in emulator logs. Do not assume final absolute WorldX alignment until RAM traces confirm it.

## Level 1 static spawn table

This table is directly transcribed and decoded from `src/bank2.asm`. `world_x_estimate` should be treated as provisional until runtime screen alignment is verified.

| screen_table_index | source_label | raw_bytes | type | x | y | attr | repeat | decoded note |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 00 | `level_1_enemy_screen_00` | `10 05 60` | `05 Soldier` | 16 | 96 | 0 | 0 | runs left, does not shoot |
| 00 | `level_1_enemy_screen_00` | `40 05 60` | `05 Soldier` | 64 | 96 | 0 | 0 | runs left, does not shoot |
| 00 | `level_1_enemy_screen_00` | `50 06 c0` | `06 Sniper` | 80 | 192 | 0 | 0 | standing, shoots once per attack |
| 00 | `level_1_enemy_screen_00` | `60 02 a1` | `02 Pill Box Sensor` | 96 | 160 | 1 | 0 | weapon box, machine gun/drop attribute |
| 00 | `level_1_enemy_screen_00` | `80 05 60` | `05 Soldier` | 128 | 96 | 0 | 0 | runs left, does not shoot |
| 00 | `level_1_enemy_screen_00` | `f0 03 40` | `03 Flying Capsule` | 240 | 64 | 0 | 0 | rapid-fire drop |
| 01 | `level_1_enemy_screen_01` | `90 06 c0` | `06 Sniper` | 144 | 192 | 0 | 0 | standing, shoots one bullet at a time |
| 02 | `level_1_enemy_screen_02` | `20 12 80` | `12 Exploding Bridge` | 32 | 128 | 0 | 0 | bridge trigger/object |
| 03 | `level_1_enemy_screen_03` | `40 12 80` | `12 Exploding Bridge` | 64 | 128 | 0 | 0 | bridge trigger/object |
| 04 | `level_1_enemy_screen_04` | `00 04 a0` | `04 Rotating Gun` | 0 | 160 | 0 | 0 | shoots once per attack |
| 04 | `level_1_enemy_screen_04` | `10 06 60` | `06 Sniper` | 16 | 96 | 0 | 0 | standing, shoots once per attack |
| 04 | `level_1_enemy_screen_04` | `50 06 61` | `06 Sniper` | 80 | 96 | 1 | 0 | crouching, shoots once per attack |
| 04 | `level_1_enemy_screen_04` | `60 03 43` | `03 Flying Capsule` | 96 | 64 | 3 | 0 | spray gun drop |
| 05 | `level_1_enemy_screen_05` | `20 06 41` | `06 Sniper` | 32 | 64 | 1 | 0 | crouch and shoot one bullet |
| 05 | `level_1_enemy_screen_05` | `40 02 a2` | `02 Pill Box Sensor` | 64 | 160 | 2 | 0 | weapon box, F/drop attribute |
| 05 | `level_1_enemy_screen_05` | `80 04 80` | `04 Rotating Gun` | 128 | 128 | 0 | 0 | rotating gun |
| 06 | `level_1_enemy_screen_06` | `40 04 80` | `04 Rotating Gun` | 64 | 128 | 0 | 0 | rotating gun |
| 07 | `level_1_enemy_screen_07` | `20 07 a0` | `07 Red Turret` | 32 | 160 | 0 | 0 | turret |
| 07 | `level_1_enemy_screen_07` | `a0 07 41` | `07 Red Turret` | 160 | 64 | 1 | 0 | turret variant |
| 08 | `level_1_enemy_screen_08` | `00 02 c3` | `02 Pill Box Sensor` | 0 | 192 | 3 | 0 | weapon box, S/drop attribute |
| 08 | `level_1_enemy_screen_08` | `50 06 80` | `06 Sniper` | 80 | 128 | 0 | 0 | standing, 3-bullet behavior per source comment |
| 09 | `level_1_enemy_screen_09` | `10 43 40 b4` | `03 Flying Capsule` | 16 | 64 and 176 | 0 and 4 | 1 | two flying capsules at same X, R and repeated attr variant |
| 09 | `level_1_enemy_screen_09` | `e0 07 81` | `07 Red Turret` | 224 | 128 | 1 | 0 | turret variant |
| 0a | `level_1_enemy_screen_0a` | `c0 04 c0` | `04 Rotating Gun` | 192 | 192 | 0 | 0 | rotating gun |
| 0b | `level_1_enemy_screen_0b` | `40 04 c3` | `04 Rotating Gun` | 64 | 192 | 3 | 0 | boss-screen rotating gun |
| 0b | `level_1_enemy_screen_0b` | `a8 10 81` | `10 Bomb Turret` | 168 | 128 | 1 | 0 | boss bomb turret |
| 0b | `level_1_enemy_screen_0b` | `b1 11 b0` | `11 Plated Door` | 177 | 176 | 0 | 0 | boss wall plated door |
| 0b | `level_1_enemy_screen_0b` | `b4 06 52` | `06 Sniper` | 180 | 80 | 2 | 0 | boss-screen sniper |
| 0b | `level_1_enemy_screen_0b` | `c0 10 80` | `10 Bomb Turret` | 192 | 128 | 0 | 0 | boss bomb turret |
| 0c | `level_1_enemy_screen_0c` | `ff` | end marker | n/a | n/a | n/a | n/a | no static entries |

## Entity routine and property sources

Routine source:

- File: `src/bank7.asm`
- Shared enemy routine pointer table: `enemy_routine_ptr_tbl`
- Level-specific routine pointer table: `level_enemy_routine_ptr_tbl`
- Level 1 specific routine table: `enemy_routine_level_1`

Property source:

- File: `src/bank7.asm`
- Property table pointer: `enemy_prop_00` and following level groups.
- Property record size: 4 bytes.
- Layout:
  - byte 0: `ENEMY_STATE_WIDTH`
  - byte 1: `ENEMY_SCORE_COLLISION`; high nibble is score code, low nibble is collision/explosion code
  - byte 2: `ENEMY_HP`
  - byte 3: `ENEMY_VAR_A`

Classification recommendation:

- Keep `enemy_type` as the stable primary key within a level context.
- Keep `shared_or_level_specific` because type `10+` means different things in different levels.
- Keep `routine_table_label` and `prop_table_source` as provenance fields.
- Keep `hp_static` from property data, but allow `hp_runtime_override` because several enemies use `ENEMY_VAR_*` or weapon-strength formulas for real HP.
- Split `score_code` from `collision_code` instead of storing raw `ENEMY_SCORE_COLLISION` only.
- Store `attribute_schema` per enemy type. Do not globally interpret attribute bits beyond raw `attr`.

## RAM fields needed for WorldX strategy fragments

Primary formula for horizontal outdoor route windows:

`world_x_candidate = LEVEL_SCREEN_NUMBER * 256 + LEVEL_SCREEN_SCROLL_OFFSET + player_screen_x`

The exact player screen X field should be read from `SPRITE_X_POS` bytes 0/1 or a project wrapper field derived from it. Speedrunning technical details explicitly note that Contra stores player/enemy/bullet positions in screen space, so WorldX must combine camera/screen progress with player screen X.

Minimum runtime fields:

- `CURRENT_LEVEL` `$30`
- `LEVEL_LOCATION_TYPE` `$40`
- `LEVEL_SCROLLING_TYPE` `$41`
- `LEVEL_SCREEN_NUMBER` `$64`
- `LEVEL_SCREEN_SCROLL_OFFSET` `$65`
- `FRAME_SCROLL` `$68`
- `SOLDIER_GENERATION_ROUTINE` `$79`
- `SOLDIER_GENERATION_TIMER` `$7a`
- `SOLDIER_GENERATION_X_POS` `$7b`
- `SOLDIER_GENERATION_Y_POS` `$7c`
- `ENEMY_ATTACK_FLAG` `$8e`
- `PLAYER_X_VELOCITY` `$98-$99`
- `PLAYER_JUMP_STATUS` `$a0-$a1`
- `EDGE_FALL_CODE` `$a4-$a5`
- `PLAYER_WATER_STATE` `$b2-$b3`
- `PLAYER_DEATH_FLAG` `$b4-$b5`
- `PLAYER_AIM_DIR` `$c2-$c3`
- `SPRITE_Y_POS` `$031a`, first 2 bytes are players
- `SPRITE_X_POS` `$0334`, first 2 bytes are players
- Enemy arrays from `$04b8` through `$05e8`, 16 slots each.

## Strategy fragment fields

Recommended fragment data shape:

- `game`: `contra`
- `rom_region`: `US`
- `rom_md5`: `7BDAD8B4A7A56A634C9649D20BD3011B`
- `level_index`: zero-based source index and one-based display stage number
- `screen_table_index`
- `runtime_screen_number_observed`
- `world_x_start`
- `world_x_end`
- `x_offset`
- `y_offset`
- `route_landmark`
- `static_spawn_ids`
- `enemy_types_expected`
- `enemy_slots_runtime`
- `danger_tags`
- `loot_tags`
- `terrain_tags`
- `recommended_policy`: examples `advance`, `jump`, `fall_through`, `stop_and_clear`, `boss_wall`
- `input_constraints`: facts such as `must_not_jump`, `hold_right_allowed`, `crouch_safe`, `water_state_sensitive`
- `success_condition`: RAM-observable state, not screenshot text
- `abort_condition`: RAM-observable state, such as death flag or bad scroll state
- `source_refs`
- `verification_status`: `static_source_only`, `ram_trace_verified`, or `rejected`

## Current strategy system ingestion priority

1. ROM identity and source provenance.
2. RAM field dictionary for camera, player, enemy slots, and soldier generation.
3. Level 1 static spawn table from `src/bank2.asm`.
4. Entity taxonomy for shared enemies and level 1 enemies.
5. WorldX fragment schema with provisional `screen_table_index` and unverified `runtime_screen_number_observed`.
6. Random soldier generation metadata as a separate dynamic hazard layer, not merged into static spawn tables.
7. Boss-screen fragment fields after static stage 1 route windows are trace-verified.

## Risks and unverified items

- Screen table index versus runtime `LEVEL_SCREEN_NUMBER` alignment must be verified with emulator RAM/action logs.
- `x_offset` should be treated as source-table offset/trigger position until traces confirm exact spawn WorldX semantics.
- Some HP values are static initialization values, not real effective HP. Bosses and invulnerable states often use `ENEMY_VAR_*` or special routines.
- `ENEMY_SCORE_COLLISION` is compact and should not be overinterpreted without `score_codes_tbl` and collision-box table validation.
- Random soldier generation is frame/RNG/weapon/loop dependent. It should become a dynamic hazard prediction layer, not deterministic route data.
- Data Crystal RAM map and vermiceli `src/ram.asm` broadly align, but project code should use one canonical local schema and mark source provenance.
