# Contra US Stage 1 Strategy Fragment Runtime Priority Draft

This is a data-design note only. It does not change runtime code and does not define TAS replay. Fragments are route knowledge and tactical hints keyed by `WorldX = CameraX + PlayerX`.

## Current Code Entry Points

- Strategy JSON loading lives in `apps/browser-cockpit/src/main.tsx` through `stageOneStrategyFiles`, `validateStageStrategyPlan`, and `planForStrategy`.
- The current public strategy JSON schema is thin: `StageStrategyPlan.segments[]` has `worldStart`, `worldEnd`, `action`, `fire`, and optional `jumpEvery`.
- Per-frame control enters through `tickFrame`: read RAM before the frame, call `applyAiInputs`, then call `nes.frame()`.
- `applyAiInputs` resolves side, control mode, strategy key, route segment, FSM, Loop Exit, raw AI buttons, Action Lock, then writes source `"ai"` buttons.
- Tactical decision lives mostly in `decideTacticalAiButtons`, which combines Route Segment, Stage 1 Script Actions, Horizon, Threat Pool, Tactical Safety, Action Lock, and Loop Exit.
- The two local failure points already have extracted helper/test shape in `contraStage1RewardTactics.ts`:
  - `findRewardStationFallingThreat`: local evidence around `WorldX 1132`.
  - `findMidWeaponTurretStallTarget`: local evidence around `WorldX 1321`.

## Recommended Data Boundary

Keep the existing five public route strategies as coarse plans. Add the fragment database as a second-stage tactical knowledge source:

1. Route plan chooses broad intent: speedrun, combat, loot, survival, guard.
2. Fragment matcher searches current `WorldX`, strategy type, RAM state, Horizon, Threat Pool, teammate state, and Loop Exit state.
3. Highest-priority matching fragment contributes a local action recommendation plus safety overrides.
4. Runtime layers still own actual final control arbitration.

This keeps route JSON user-editable and small, while moving hard-won local tactical knowledge out of scattered one-off functions.

## Runtime Priority

Recommended priority order:

1. Human emergency or hybrid human override.
2. Death, respawn, menu, and inactive 2P handling.
3. Immediate projectile/body danger from RAM Danger Layer.
4. Fragment `safetyOverrides` that match the same immediate RAM danger.
5. Active Action Lock, unless Loop Exit explicitly invalidates it.
6. Fragment `actionAdvice` for matched `WorldX` and RAM conditions.
7. Threat Pool dynamic target handling for actual active RAM objects.
8. Horizon static target pre-aim for upcoming fixed, reward, bridge, and boss objects.
9. Route Segment coarse action: advance, cautious, loot, guard, survive, hold-fire.
10. Loop Exit forced advance only when progress, score, and threat outcomes have stalled and no immediate body/projectile danger exists.

The important rule is that fragment data should inform decisions, not bypass safety. For example, the `WorldX 1320-1410` fragment can suggest down-fire and controlled right pulses, but if a real active turret enters Threat Pool, the turret aim layer must take control.

## WorldX 1110-1160 First Integration

Goal: stop the observed reward-station falling soldier death without adding another blind low-route micro patch.

Fragment: `stage1-w1110-1160-reward-station-falling-soldier`.

Suggested first runtime integration:

1. Match only when `level = 0`, `worldX` is `1110-1160`, and `playerY >= 188`.
2. Require a dynamic enemy near the player with `dx` roughly `-8..48` and `dy` roughly `-112..-16`.
3. Treat reward intent as lower priority than body-contact survival.
4. Recommend target fire, no blind jump, and short hold/slowdown.
5. Exit when `worldX > 1160`, the falling threat disappears, or a death trace is recorded.

Why this local window is narrow:

- Existing evidence points to `WorldX 1132`.
- The broader `1180-1240` lower-route area is a route-entry problem, not only a local aiming problem.
- The database includes a broader draft recovery fragment, but it should be validated separately and not treated as done.

## WorldX 1320-1410 First Integration

Goal: break the weapon-box plus rotating-turret loop at `WorldX 1321`.

Fragment: `stage1-w1320-1410-weapon-box-rotating-turret-stall`.

Suggested first runtime integration:

1. Match only when `level = 0`, `worldX` is `1320-1410`, `playerY >= 188`, and current weapon is default.
2. Require `horizon.rewardAhead.distance` in `-8..58` and `horizon.fixedAhead.distance` in `32..150`.
3. Emit one stable local intent: escape the reward/turret loop.
4. Use down-fire or target fire with controlled right pulses.
5. If `loopExit.stagnantFrames >= 90` and no score or weapon change occurred, abandon reward pursuit and force rightward progress unless immediate danger blocks it.
6. Exit when `worldX > 1410`, weapon changes, fixed target is behind the player, or Loop Exit takes ownership.

This fragment should not be implemented as "always collect reward". It should encode the tradeoff: collect if it is cheap, but do not loop indefinitely under fixed fire.

## Tests

Data validation tests:

- Validate `strategy-fragment-schema.json` is valid JSON Schema.
- Validate `stage1-fragment-examples.json` against the schema.
- Assert all fragments are ROM-bound to `gameId = contra`, `romProfileId = contra-us-good`, and `compatibilityGroup = contra-us`.
- Assert `worldWindow.end > worldWindow.start`.
- Assert required telemetry fields include `ram.worldX`, `rawAiInput`, and `lockedAiInput` for each candidate fragment.

Runtime matcher tests when code integration starts:

- Synthetic snapshot at `worldX = 1132`, `playerX = 119`, `playerY = 212`, falling enemy at `x = 125`, `y = 191` matches the first fragment.
- Same snapshot without the falling enemy does not match the first fragment.
- Synthetic snapshot at `worldX = 1321`, `playerY = 212`, default weapon, reward distance `23`, fixed distance `87` matches the second fragment.
- Same `1321` snapshot with non-default weapon does not match the second fragment.
- A projectile emergency outranks both fragments.
- A matching fragment does not override human input in hybrid mode.

Run evidence tests:

- Save trace fields listed under each fragment's `telemetry.requiredFields`.
- Require death trace on failed fragment runs.
- Require no-death local clearance for a fragment to move from `candidate` to `validated`.
- Do not mark a strategy complete until whole-run evidence exists: ROM profile, strategy version, start/end frames, deaths, kills/destruction, weapon pickups, route segment trace, input trace, RAM key state, and mode.

## Risks

- The current runtime has several hard-coded Stage 1 local patches. A fragment database can become another parallel rule system unless the matcher has a single owner and a clear priority contract.
- `WorldX 1110-1160` is probably only a symptom of the broader bridge-after route problem. Treat the broad `1040-1240` recovery fragment as draft until real run evidence confirms it.
- `WorldX 1320-1410` can regress speedrun behavior if loot intent is allowed to dominate fixed-fire survival.
- Enemy-slot interpretation remains approximate; tests should use RAM-derived enemy slot snapshots, not visual assumptions.
- 2P guard usage depends on the candidate 2P coordinate RAM map, which still needs true two-player validation.
- Fragment labels should not imply proven tactical intelligence until local and full-run traces have validated them.
