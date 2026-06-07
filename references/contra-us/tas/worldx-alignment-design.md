# WorldX Alignment Design for Contra TAS Research

Last checked: 2026-06-07

Scope: design notes only. This file describes how to convert public TAS route evidence into RAM-aligned WorldX strategy fragments. It is not an implementation, and it does not include ROMs, TAS files, full input logs, or direct replay instructions.

## Core Decision

Use TAS as a route knowledge source, not as a controller.

The target runtime is the browser Contra USA runtime. It reads RAM every frame, writes the chosen controller state, then advances the emulator one frame. A TAS movie was authored against a specific ROM, emulator, sync settings, and input timing model. Those conditions do not match the browser runtime closely enough to replay blindly.

Therefore the pipeline should produce:

- route landmarks,
- WorldX ranges,
- tactical preconditions,
- action intentions,
- safety guards,
- fallback behavior,
- confidence labels.

It should not produce:

- direct per-frame replay scripts,
- raw TAS input streams in strategy files,
- assumptions that Japan ROM frame timing equals USA ROM timing.

## Version Match Baseline

Target ROM:

- Name: `Contra (U) [!].nes`
- Region: USA
- MD5: `7bdad8b4a7a56a634c9649d20bd3011b`
- SHA1: `c9ea66bb7cb30ad5343f1721b1d4d3219859319b`
- Public hash source: https://tasvideos.org/18G and https://tasvideos.org/Games/18/Versions/View/2884?returnUrl=%2F675M

Current best public FCEUX FM2 sources are mostly Japan ROM variants:

- `Contra (Japan).nes`
- `Contra (J).nes`

Regional differences that matter:

- Japan/Famicom version uses VRC2 and has extra cutscenes, map screens, background animation, and extra cheat/sound features.
- USA version uses a different mapper/resource layout.
- Public regional-difference notes report minor enemy behavior adjustments in overseas versions.

Practical conclusion:

- Do not align by global frame number.
- Do not reuse exact transition timing.
- Do not assume RNG equality.
- Do align by RAM-observed gameplay state and route landmarks.

## Data Inputs

### TAS Metadata

From `tas-source-candidates.json`:

- source URL,
- movie/user-file/submission id,
- game version,
- emulator,
- format,
- frame count,
- goal/category,
- quality label,
- version match label.

### TAS-Derived Trace

If later local analysis is authorized, a temporary trace can be generated outside committed references:

```text
frame
stage
roomOrMode
cameraX
player1X
player1Y
player1State
player1Weapon
player1Lives
player2X
player2Y
player2State
player2Weapon
bossHp
enemySlotsSummary
rng
inputSummary
landmarkFlags
```

The trace should collapse into derived segment facts before any project-facing artifact is committed.

### Browser USA Runtime Trace

The browser runtime should produce an equivalent RAM trace around each candidate segment:

```text
browserFrame
stage
roomOrMode
cameraX
playerX
playerY
playerState
weapon
lives
bossHp
enemySlotsSummary
rngOrUnknown
finalInputMask
humanInputMask
aiIntent
landmarkFlags
```

The important invariant is that RAM is read before final controller write and before `nes.frame()`.

## WorldX Definition

For horizontal stages:

```text
WorldX = CameraX + PlayerX
```

Use WorldX as the main route coordinate. It is more stable than screen X and more useful than raw frame count.

For non-horizontal base stages, WorldX may be absent or less meaningful. Use a different route key:

```text
BaseKey = stage + corridor/room id + depth/progress + door/boss/object flags
```

The segment model should allow both:

- `coordinateType: "worldx"`
- `coordinateType: "base-room"`

## Segment Schema

A derived strategy fragment should look conceptually like this:

```text
id
sourceEvidence
versionMatch
confidence
coordinateType
stage
range
preconditions
routeIntent
preferredActionPattern
ramGuards
successSignals
abortSignals
fallback
notes
```

Recommended fields:

- `sourceEvidence`: TASVideos URLs and movie ids, not copied TAS files.
- `versionMatch`: `target-match`, `region-mismatch`, or `unknown`.
- `confidence`: `confirmed-us`, `probable`, `hypothesis`, or `unsafe`.
- `preconditions`: weapon, player state, lives, scroll state, boss state.
- `routeIntent`: jump, advance, duck, climb, dodge, damage boss, preserve weapon, revive P2, etc.
- `preferredActionPattern`: high-level rhythm, not a per-frame input list.
- `ramGuards`: state checks required before applying the tactic.
- `successSignals`: RAM changes that show the tactic worked.
- `abortSignals`: danger or desync state.
- `fallback`: safer local behavior if conditions are not met.

## Alignment Algorithm

### 1. Source Filtering

Classify each source before analysis:

- `target-match`: USA ROM hash or page version matches target.
- `region-mismatch`: Japan or Europe ROM.
- `unknown`: user file requires header inspection.
- `obsolete-secondary`: old route or format, useful only for coarse comparison.

Only `target-match` traces can be used for strong timing claims. `region-mismatch` traces can suggest route ideas but must be validated on USA runtime logs.

### 2. Landmark Extraction

Detect strong landmarks first:

- power-on/title start,
- player gains control,
- stage start,
- major scroll lock,
- weapon pickup,
- boss object spawn,
- boss HP begins changing,
- boss death,
- stage clear,
- death,
- respawn,
- 2P revive,
- base door/room transition.

These landmarks split the run into manageable windows.

### 3. Coarse Segment Matching

For horizontal stages, match by:

```text
stage + WorldX bucket + playerY bucket + scrollLock + weapon + landmark flags
```

For base stages, match by:

```text
stage + room/corridor + depth/progress + object flags + boss/enemy state
```

Use monotonic matching: later source segments should not align to earlier target runtime progress unless the game state explicitly loops or respawns.

### 4. Fine Alignment

Inside a coarse window, compare feature vectors:

```text
position: WorldX/playerY or base progress
movement: standing/running/jumping/falling/climbing/dead
combat: weapon, firing cadence, projectile count, bossHp delta
danger: enemy slots, bullets, collision risk
state: lives, invulnerability, respawn, scroll lock
```

Dynamic Time Warping or another monotonic sequence alignment can be used during research, but the exported segment should still be human-readable and RAM-guarded.

### 5. Segment Validation on USA ROM

Each candidate segment needs at least one USA browser trace result:

- `confirmed-us`: same route intent works on target ROM under RAM guards.
- `probable`: state pattern looks equivalent, but not enough repeated validation.
- `hypothesis`: source-derived only, not yet verified.
- `unsafe`: version drift, RNG drift, enemy behavior, or control timing breaks the tactic.

Only `confirmed-us` or clearly labeled `probable` segments should be considered for active strategy selection.

## What Can Migrate

Likely migratable after USA validation:

- horizontal route order,
- jump locations expressed as WorldX windows,
- crouch/dodge/climb concepts,
- weapon preference,
- spread-gun and low-power tactical ideas,
- boss damage cadence principle,
- 2P spacing and revive concepts,
- route landmarks and major state transitions.

Useful Contra resource-page facts:

- Stage 3 jump glitch can alter jump height with precise directional timing.
- Boss HP can drop at most 1 HP per frame, so boss strategy is about registering damage continuously rather than only firing as fast as possible.
- Contra resource notes include RNG and boss RAM details that can guide trace features.

## What Must Not Migrate Directly

Do not migrate directly:

- global frame numbers,
- controller input streams,
- title/cutscene transition timing,
- exact RNG manipulation,
- exact enemy spawn or slot assumptions from Japan ROM,
- exact 2P death/respawn timing,
- emulator-specific lag or sync behavior,
- Famtasia FMV assumptions into FCEUX/BizHawk/browser timing,
- any route segment not validated against USA RAM logs.

## Minimal Toolchain Design

### 1. Source Index

Input: public web pages.

Output: `tas-source-candidates.json`.

Purpose: identify what to inspect later without storing movie files.

### 2. Local Movie Inspector

Input: locally obtained TAS movie files only if later authorized.

Output: temporary metadata and summarized input phases.

Rules:

- verify header hash and game version,
- classify format,
- avoid committing full input stream,
- delete or isolate temporary files outside project references unless explicitly authorized.

### 3. Trace Collector

Input: emulator runtime plus legal local ROM.

Output: temporary RAM trace.

For project use, prefer the browser runtime trace because it matches the actual product loop.

### 4. Landmark and Segment Extractor

Input: RAM trace plus summarized input phases.

Output: candidate route fragments.

Important: output should describe intent and RAM guards, not replay input.

### 5. USA Validation Pass

Input: candidate route fragment and Contra USA browser trace.

Output: validation label and notes.

Promote only validated fragments into active strategy data.

## Risk Register

- Region mismatch: current best FM2 routes are mostly Japan ROM, while target is USA.
- Emulator mismatch: FCEUX/BizHawk/Famtasia/browser JSNES do not guarantee identical lag or input timing.
- RNG drift: Contra RNG can depend on timing; frame drift can change enemy behavior.
- RAM-map drift: Japan and USA memory behavior can be similar but must not be assumed identical.
- Overfitting risk: direct TAS-derived micro-input creates brittle behavior that fails under human mixed-mode or minor desync.
- Policy risk: storing movie files, ROMs, or full input logs in repo would violate the intended reference boundary.

## Recommended First Validation Target

Start with Stage 1 horizontal route segments:

1. Early movement and first weapon capsule decision.
2. First jump/dodge windows as WorldX ranges.
3. Pre-boss approach.
4. Stage 1 boss damage cadence.

Reasons:

- Stage 1 has the clearest WorldX interpretation.
- It gives early evidence for Japan-to-USA route transfer quality.
- It exercises movement, weapon, enemy, and boss alignment without needing later-stage state setup.

