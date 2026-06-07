# Contra US Stage 1 Survival Strategy Run Log

Last updated: 2026-06-07 10:48 CST

## ROM Target

- Game: Contra (USA)
- Local ROM: `D:\Ai-Play\ROM\contra_us_test.nes`
- MD5: `7BDAD8B4A7A56A634C9649D20BD3011B`
- SHA1: `C9EA66BB7CB30AD5343F1721B1D4D3219859319B`
- Reason: USA ROM has an annotated disassembly target match and enough public RAM/TAS references for practical implementation.

## Survival Strategy Definition

`survival-v0` is not passive avoidance.

Current product definition:

1. Avoid death first.
2. Destroy fixed enemies that affect route safety: turrets, gates, boss parts, wall cores.
3. Acquire key weapons when they reduce survival risk, especially Spread.
4. Kill normal enemies only when they will collide, block a jump point, or interrupt fixed-target combat.
5. If current fire can resolve a threat, do not retreat.
6. Use WorldX tactical fragments for bridges, turrets, rewards, and boss approach.

## Current Runtime Model

- Browser platform reads jsnes RAM every frame.
- AI writes controller input before `nes.frame()`.
- Route key is `WorldX = CameraX + PlayerX`.
- TAS is treated as a route knowledge database, not as the live controller.

## Validated Tests

- `node --test tests/contraBossWall.test.mjs` passed 44 Boss wall tests after current changes.
- `npm run check` passed 79 tests and production build after current changes.

## Implemented Stage 1 Tactical Fragments

Source:

- `apps/browser-cockpit/src/contraStage1RewardTactics.ts`
- Tests: `tests/contraStage1RewardTactics.test.mjs`

Fragments:

1. `reward-station-falling-threat`
   - Window: level 0, `WorldX 1040-1180`, low route.
   - Problem fixed: falling soldier killed AI near `WorldX 1132`.
   - Action: jump/up-fire instead of standing with plain B.

2. `mid-weapon-turret-breakout`
   - Window: level 0, `WorldX 1288-1412`, default weapon, weapon box plus turret ahead.
   - Problem fixed: crouch-fire loop near `WorldX 1321-1353`.
   - Action: clear down lock, force right movement and jump when urgent.

3. `stage-one-close-body-threat`
   - Window: level 0, `WorldX 1040-2100`.
   - Problem fixed: same-lane body collision near `WorldX 1990`.
   - Action: air-strafe/up-fire for same-lane enemy contact.

4. `stage-one-red-turret-low-threat`
   - Window: level 0, `WorldX 1760-1848`, red turret entry.
   - Problem fixed: low soldier collision near `WorldX 1802`.
   - Action: down-fire plus right advance; prevents `up+left` reaction.

5. `stage-one-spread-rush`
   - Window: level 0, `WorldX 1960-2068`, default weapon, Spread reward ahead.
   - Problem fixed: left retreat and loss of rhythm near Spread weapon box.
   - Action: force right/down/fire and prevent left retreat.

## Current Fast Test Progress

Fast tests used `?autoload=1&botrun=1&botframes=...`.

Observed progression:

1. Before reward-station fix: death near `WorldX 1132`.
2. After first fix: death/stall near `WorldX 1353`.
3. After mid-turret breakout: reached `WorldX 1990`.
4. After close-body/red-turret fixes: reached `WorldX 2018-2031`.
5. After Spread rush and jump override fix: reached `WorldX 2097`.

Earlier known failure:

- Death: `WorldX 2097`
- Player: `x128 / y236`
- Input: `right+A+B`
- Weapon: default
- Score: 2700
- Interpretation: Spread rush moved past old left-retreat failure, but post-Spread area fails because AI falls too low and late jump rhythm is not recovered.

Latest known failure:

- Botrun: `codex-horizontalclear-1780800431358`
- Status: `death`
- Reason: `death-count`
- Frame: `5750`
- Death: `WorldX 3208`
- Player: `x136 / y188`
- Input: `right+B`
- Score: `3500`
- Boss defeated: `0`
- Boss core: `slot 13 / type 0x11 / hp 27 / x161 / y176`
- Closest body threat: `slot 10 / type 0x01 / hp 1 / x139 / y188 / dx +3 / dy 0`
- Interpretation: Boss wall is no longer a single threshold bug. Three local micro-fixes were tested around the same failure class: core-priority aiming, left breakout, and horizontal close-body fire. The run still dies at the same boss-wall landing/contact zone. Continuing to widen thresholds is low quality.

## Next Required Patch

Do not continue single-point threshold patches at `WorldX 3208`.

Required next work is a Boss wall phase controller:

1. `approach-station`: enter boss wall without arriving too low or inside body-spawn lane.
2. `clear-body-threat`: if close body threats occupy player lane, clear them before core/turret station fire.
3. `fixed-target-damage`: once lane is clear, hold a stable firing station and verify HP deltas on core/turrets.
4. `bailout-reposition`: if HP is not dropping or body threat repeats, leave the station and re-enter instead of looping in place.
5. `success-exit`: exit only when `bossDefeated` or equivalent barrier-cleared state is confirmed.

The previous `spread-exit-jump` failure remains valid historical evidence, but current real runs have moved farther and now prioritize the Boss wall controller.

## Process Rule

Every new strategy change must update this log or a more specific strategy fragment file. Do not rely on chat context because compression can remove important decisions.

If the same branch objective fails three times without real progress, stop local patching and upgrade the problem to a stage/phase strategy design. Dispatch or implementation must return a fixed evidence report before the work is accepted.

## 2026-06-07 Boss Wall Anti-Loop Update

Implemented and verified in code:

- Low-lane boss wall bailout:
  - Window: `WorldX 3204-3224`, `PlayerX 128-146`, `PlayerY >= 188`.
  - Action: leave the body-spawn lane instead of continuing fixed-target fire.
- Airborne low-lane bailout:
  - Same body-spawn lane, while descending or airborne.
  - Action: `left + B`, no right input.
- Upper-lane swarm bailout:
  - Window: `WorldX 3204-3224`, `PlayerX 132-146`, `PlayerY 132-168`.
  - Trigger: nearby dynamic threat count >= 4 while fixed targets remain.
  - Action: `up + left + B`.
- Upper-lane overextended station guard:
  - Window: `WorldX 3198-3224`, `PlayerX >= 128`, `PlayerY 124-150`, fixed target HP >= 8.
  - Action: retreat left from the high-risk station instead of walking deeper right.
- Action Lock override:
  - Boss wall bailout input now overrides stale movement/aim locks.

Verification:

- `node --test tests/contraBossWall.test.mjs`: 48/48 passed.
- `npm run check`: 83 tests passed and production build passed.

Real botrun evidence:

- `20260607110752-air-bailout`: still died at Boss wall, but low-lane death moved to upper-lane death.
  - Death: frame `5729`, `WorldX 3208`, `x136/y138`, input `up+right+B`.
  - Last alive: frame `5728`, `WorldX 3207`, `x135/y138`, input `up+left+B`.
- `20260607111229-upper-swarm-bailout`: died earlier at Boss wall entrance after left bailout was triggered.
  - Death: frame `5658`, `WorldX 3203`, `x131/y142`, input `up+left+B`.
  - Fixed targets remained high HP: core `hp31`, side turrets `hp16/hp16`.
- `20260607111526-upper-contact-earlier`: same failure class repeated.
  - Death: frame `5658`, `WorldX 3203`, `x131/y142`, input `up+left+B`.

Conclusion:

Do not continue same-position micro-threshold patching at the Boss wall. The current evidence shows that the AI enters the Boss wall with default weapon and high-HP fixed targets still alive, then gets surrounded before meaningful HP damage is produced.

Next required work:

1. Add a pre-entry fixed-target suppression station before `WorldX 3200`.
2. Verify whether the first-stage weapon reward route must be mandatory for `survival-v0`.
3. Add fixed-target HP delta monitoring: if turret/core HP does not drop within a bounded frame window, force reposition or switch aim mode.
4. Only resume full botrun after the above has a failing test and a clear expected telemetry outcome.

## 2026-06-07 Boss Wall Local Patch Freeze Confirmed

Additional real botrun evidence after the anti-loop update:

- `20260607-core-forecast-focused`
  - Status: `death`
  - Frame: `5649`
  - Death: `WorldX 3196`, `x124/y162`, input `left+B`
  - Last alive: `WorldX 3197`, `x125/y165`, input `left+B`
  - Fixed targets: core `hp32`, turrets `hp16/hp16`
- `20260607-falling-convergence-focused`
  - Status: `death`
  - Frame: `5649`
  - Death: `WorldX 3196`, `x124/y162`, input `left+B`
  - Last alive: `WorldX 3197`, `x125/y165`, input `up+B`
  - Fixed targets still full HP.
- `20260607-hp-gate-focused`
  - Status: `death`
  - Frame: `5700`
  - Death: `WorldX 3208`, `x136/y196`, input `up+B`
  - Fixed targets still full HP.
- `20260607-lowlane-retreat-gate`
  - Status: `death`
  - Frame: `5653`
  - Death: `WorldX 3198`, `x126/y171`, input `left+B`
  - Last alive: `WorldX 3199`, `x127/y174`, input `none`
  - Fixed targets still full HP.

Implemented tests during this investigation:

- Core collision forecast blocks right carry before body collision.
- Falling soldier convergence freezes horizontal movement when fixed targets remain.
- High-HP crowded low-lane gate prevents jumping into the body-spawn lane.

Conclusion:

This branch has now repeated the same Boss wall failure class after multiple input-layer changes. The current blocker is not one missing dodge frame. The AI enters the Boss wall with default weapon and no fixed-target HP reduction, then body spawns overrun the station.

Do not continue local Boss wall threshold patching.

Required next design:

1. Move the solution upstream into `survival-v0` route planning.
2. Make fixed-target HP-delta verification mandatory before deeper Boss wall entry.
3. Build a bounded pre-entry station controller with explicit states: `enter_station`, `damage_fixed_target`, `verify_hp_delta`, `reposition`, `enter_wall_only_after_hp_drop`.
4. Re-check the weapon route. Spread or another weapon may need to be a survival requirement, not optional loot.

## 2026-06-07 Boss Wall Phase Controller Evidence

Implemented during this pass:

- Added `contraStage1BossWallPhase.ts`.
- Added phase states: `idle`, `enter-station`, `damage-fixed-target`, `reposition`, `cleared`.
- Added fixed-target HP total monitoring.
- Added same-lane fixed target preference so pre-entry fire does not aim down at the lower core when same-height turrets are available.
- Added phase safety override handoff for contact/bailout actions.
- Added containment clamp so safety actions cannot keep pushing right into deep Boss wall entry while fixed HP is still blocking.

Focused tests:

- `node --test tests/contraBossWallPhase.test.mjs`: `7/7` passed after the fix.
- `node --test tests/contraBossWall.test.mjs`: `56/56` passed after the fix.

Real botrun evidence:

- `20260607-phase-controller-focused`
  - Status: `death`.
  - Frame: `5568`.
  - Death: `WorldX 3159`, `x111/y132`, input `down+right+B`.
  - Fixed HP still full: core `hp32`, turrets `hp16/hp16`, lower asset `hp7`.
  - Finding: phase controller was active, but it aimed down and bypassed contact safety.
- `20260607-phase-safety-focused`
  - Status: `death`.
  - Frame: `5653`.
  - Death: `WorldX 3198`, `x126/y171`, input `left+B`.
  - Recent trace showed the safety layer allowed `up/right+B` around `WorldX 3208` with fixed HP still `71`.
  - Finding: contact safety worked, but still pushed the player deeper before any fixed-target damage.
- `20260607-phase-containment-focused`
  - Status: `death`.
  - Frame: `5711`.
  - Death: `WorldX 3153`, `x81/y189`, input `B`.
  - Recent trace showed retreat to the low lane with fixed HP still `71`, then same-position body contact at `x81/y189`.
  - Finding: containment prevented deep entry but created a different failure mode: the route retreats/falls to the low lane and cannot recover.

No-dead-loop decision:

Stop running more Boss wall local input tests in this branch. Three real botruns after the phase-controller work all prove the same architectural blocker: fixed-target HP remains full, and the route lacks a reliable upper-lane pre-entry station plus weapon/HP-delta closure.

Required next implementation:

1. Move Boss wall handling upstream into a route-level upper-lane station plan before the low-lane fall becomes possible.
2. Treat fixed-target HP reduction as a gate. Do not allow Boss wall entry or repeated bailout until HP delta is observed.
3. Re-evaluate mandatory weapon acquisition for `survival-v0`. Default weapon may be insufficient for a stable survival route.
4. Add runtime phase telemetry before the next botrun so reports show phase, HP total, no-damage frames, and clamp reason directly.

## 2026-06-07 Boss Wall Telemetry And Recovery Check

Implemented during this pass:

- Added `BossWallPhaseTelemetry`.
- Runtime debug reports now expose `bossWallPhase`.
- Death trace samples now expose per-side `bossWallPhase`.
- Added upper-station recovery behavior when phase `reposition` has retreated left of the station.
- Added low-lane recovery behavior when phase `reposition` has already fallen to the low lane.

Focused tests:

- `node --test tests/contraBossWallPhase.test.mjs`: `10/10` passed.
- `node --test tests/contraBossWall.test.mjs`: `56/56` passed.
- `npm run build --workspace @fc-ai/browser-cockpit`: passed.

Real botrun evidence:

- `20260607-boss-telemetry-check`
  - Status: `death`.
  - Death: frame `5711`, `WorldX 3153`, `x81/y189`, input `B`.
  - Runtime telemetry:
    - `phase`: `reposition`
    - `fixedHpTotal`: `72`
    - `noDamageFrames`: `157`
    - `primaryTarget`: core slot `13`, type `0x11`, `hp32`
  - Finding: telemetry works and proves the phase was stuck in no-damage reposition while low-lane death happened.
- `20260607-boss-recovery-check`
  - Status: `death`.
  - Death: frame `5705`, `WorldX 3172`, `x100/y134`, input `A+B`.
  - Runtime telemetry:
    - `phase`: `enter-station`
    - `fixedHpTotal`: `70`
    - `noDamageFrames`: `31`
    - `primaryTarget`: turret slot `15`, type `0x10`, `hp15`
  - Finding: recovery changed the failure class and produced real fixed-target HP damage (`72 -> 70`), but station recovery is still unsafe because multiple infantry overlap the recovery lane.

No-dead-loop decision:

Do not patch the frame `5705` death by widening one more contact threshold. The next root problem is now station crowd control: before re-entering the upper station, the route must clear or wait out nearby dynamic threats instead of jumping in place through a dense infantry cluster.

Required next implementation:

1. Add a Boss wall `station-crowd-gate` condition to the phase controller.
2. When fixed HP is still high and close dynamic enemies occupy the recovery lane, prioritize local clearing or hold/reposition before station entry.
3. Preserve HP-delta telemetry and require every future botrun to report phase, HP total, no-damage frames, primary target, and close dynamic threats.

## 2026-06-07 Station Crowd Gate And No-Loop Check

Implemented during this pass:

- Added Boss wall `stationCrowdGate` telemetry with close dynamic threat slots.
- Added `station-crowd-gate-clear` to prevent station re-entry while the recovery lane is crowded.
- Added `shouldBypassAiActionLockForBossWallPhase` so the gate is not overwritten by generic Action Lock.
- Moved station crowd gate ownership before Boss wall micro safety overrides.
- Added a narrow `station-crowd-contact-jump` branch for head/body contact pressure.

Focused tests:

- `node --test tests/contraBossWallPhase.test.mjs`: `14/14` passed.
- `node --test tests/contraBossWall.test.mjs`: `56/56` passed.
- `npm run build --workspace @fc-ai/browser-cockpit`: passed.

Real botrun evidence:

- `20260607-station-crowd-gate-check`
  - Status: `death`.
  - Death: frame `5747`, `WorldX 3176`, `x104/y149`, input `up+right+B`.
  - Runtime: `stationCrowdGate.active=true`, but Action Lock still reported `evade:9`.
  - Finding: the gate was detected, but generic lock/micro arbitration still allowed rightward entry.
- `20260607-crowd-gate-bypass-lock-check`
  - Status: `death`.
  - Death: same frame class, `WorldX 3176`, `x104/y149`, input `up+right+B`.
  - Runtime: `actionLock=idle`, proving Action Lock bypass worked.
  - Finding: raw AI input still came from Boss wall micro override before the phase gate.
- `20260607-phase-gate-before-micro-check`
  - Status: `death`.
  - Death: frame `5666`, `WorldX 3183`, `x111/y164`, input `B`.
  - Runtime: `actionLock=idle`, `rawAiInput=B`, `stationCrowdGate.active=true`, `fixedHpTotal=72`.
  - Finding: gate ownership works, but the AI stalls at a bad upper-lane station without damaging fixed targets.
- `20260607-crowd-contact-jump-check`
  - Status: `death`.
  - Death: frame `5666`, `WorldX 3183`, `x111/y149`, input `B`.
  - Recent samples show contact jump triggered at frame `5662` with `up+a+b`, but fixed HP stayed `72` and the overhead threat still killed the player.
  - Finding: this is no longer an Action Lock or single-frame contact miss. The station itself is invalid for a stable default-weapon survival route.

No-dead-loop decision:

Stop adding local Boss wall contact thresholds at `WorldX 3176-3183`. The repeated evidence now points to a route-level station design problem: `survival-v0` reaches the Boss wall with default weapon, enters a crowded station, and fails to produce fixed-target HP damage.

Required next implementation:

1. Redesign the Boss wall station as a route-level state, not a reactive crowd gate.
2. Choose a safer fixed-target damage station that can actually reduce turret/core HP before dense infantry overlap.
3. Gate Boss wall entry on observed fixed-target HP delta.
4. Re-evaluate whether `survival-v0` must route through the Spread weapon before Boss wall.

## 2026-06-07 Default-Weapon Boss Wall Pulse Fire Check

Implemented during this pass:

- Added default-weapon B-button pulse fire to the Boss wall phase controller.
- Added tests proving fixed-target station and station-crowd clearing release B on pulse frames.
- Added close lower station-crowd down-fire for the pre-entry station.
- Expanded station crowd gate boundary from `playerX < 112` to `playerX <= 112`.

Focused tests:

- `node --test tests/contraBossWallPhase.test.mjs`: `18/18` passed.
- `node --test tests/contraBossWall.test.mjs`: `56/56` passed.
- `npm run build --workspace @fc-ai/browser-cockpit`: passed.

Real botrun evidence:

- `20260607-boss-phase-pulse-fire-check`
  - Status: `death`.
  - Death: frame `5765`, `WorldX 3159`, `x87/y132`, input `B`.
  - Fixed HP changed from the previous full `72` to `69`.
  - Score reached `4000`.
  - Finding: B-pulse fire is effective; default weapon can damage the left Boss-wall turret, but the route still dies to station crowd before stabilizing.
- `20260607-boss-phase-downfire-check`
  - Status: `death`.
  - Death: frame `5648`, `WorldX 3183`, `x111/y156`, input `B`.
  - Fixed HP `71`.
  - Finding: close lower-crowd down-fire did not solve the unsafe station.
- `20260607-boss-station-boundary-gate-check`
  - Status: `death`.
  - Death: frame `5648`, `WorldX 3184`, `x112/y152`, input `B`.
  - Fixed HP `71`.
  - Station crowd gate became active at the boundary and produced `down+B` samples before death.
  - Finding: the boundary gate works, but default-weapon Boss-wall station still fails.

No-dead-loop decision:

Stop adding more Boss wall station contact, aim, or boundary thresholds for the default-weapon route. The branch objective has now repeated after the tactical adjustment: fixed HP starts dropping, but the player still dies in the same station class before clearance.

Required next implementation:

1. Shift `survival-v0` route priority to mandatory weapon acquisition before Boss wall.
2. Treat Spread or another stronger weapon as a survival prerequisite until a default-weapon clear is proven.
3. Preserve Boss-wall pulse fire and telemetry because they are useful once the route reaches the wall with a better weapon.

## 2026-06-07 Mandatory Weapon Gate And Boss Approach Platform Check

Implemented during this pass:

- Added a Stage 1 mandatory weapon gate for `survival-v0` before Boss approach.
- Added `weapon-gate-survive` to the generated Stage 1 survival runtime route.
- Added close-body handling around `WorldX 2760-2860` so lower soldiers are cleared with aim/fire instead of stale jump lock.
- Added an early Boss-approach platform jump patch around `WorldX 2798-2828`.

Focused verification:

- `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
- `npm test`: `115/115` passed.
- `npm run build`: passed.

Real botrun evidence:

- `20260607-mandatory-spread-gate-check`
  - Status: `death`.
  - Death: frame `5144`, `WorldX 2809`, `x128/y176`, route `boss-approach-survive`, input `A+B`.
  - Final weapon: `4`.
  - Finding: mandatory weapon route works enough to replace the old default-weapon Boss-wall branch with a new Boss-approach issue.
- `20260607-boss-approach-close-body-check`
  - Status: `death`.
  - Death: frame `5179`, `WorldX 2839`, `x128/y234`, input `up+right+B`.
  - Finding: close-body patch passed the previous `WorldX 2809` death, but exposed a platform/fall failure.
- `20260607-boss-platform-jump-check`
  - Status: `death`.
  - Death: frame `5179`, `WorldX 2839`, `x128/y234`, final weapon `4`.
  - Trace: player was already falling from `WorldX 2788/y133`; by `WorldX 2798/y146` the route had not established a stable landing/jump state, and the death repeated at `WorldX 2839`.
  - Finding: the remaining failure is not a simple late-jump threshold. The platform rhythm before Boss approach is wrong, so widening the same local jump window would be a dead loop.

No-dead-loop decision:

Stop local threshold tuning for the `WorldX 2839` Boss-approach fall. The next change must be route-level: rebuild the pre-Boss platform rhythm so the AI enters this section from a stable ground/jump state before fighting or aiming upward.

Required next implementation:

1. Add a pre-Boss platform rhythm segment before `WorldX 2788`.
2. Treat the `WorldX 2788-2839` path as a route-state transition, not a reactive single-jump patch.
3. Preserve the mandatory weapon gate because it successfully changes the blocker from default-weapon Boss wall to an earlier route-control problem.

## 2026-06-07 Pre-Boss High-Platform Branch Stop

Implemented during this pass:

- Added `stage-one-boss-approach-high-edge-jump` for the high-platform edge around `WorldX 2776-2786`.
- Added `stage-one-boss-approach-high-air-carry` so close-body logic cannot cancel rightward carry during the high jump arc.

Focused verification:

- `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
- `npm test`: `117/117` passed.
- `npm run build`: passed.

Real botrun evidence:

- `20260607-boss-high-edge-jump-check`
  - Status: `death`.
  - Death moved from `WorldX 2839/y234` to `WorldX 2854/y236`.
  - Trace: high-edge jump changed the arc; at `WorldX 2788` the player was now high (`y93`) instead of already low/falling.
  - Finding: the edge jump was effective, but the landing still failed.
- `20260607-boss-high-air-carry-check`
  - Status: `death`.
  - Death remained `WorldX 2854/y236`, final weapon `4`, input `down+right+B`.
  - Trace: rightward carry was preserved through the air arc, so the remaining failure is not caused by right input being cancelled.

No-dead-loop decision:

Stop tuning the `WorldX 2776-2864` high-platform jump/carry branch. The branch repeated after the route-level edge jump and after the arbitration fix. The next solution must not be another local jump/carry threshold in this same high arc.

Required next implementation:

1. Replace the high-platform jump branch with a different pre-Boss route design, likely a lower/mid-platform capture route or a stateful route patch based on recorded human input.
2. Keep the mandatory weapon gate and Boss-wall HP telemetry.
3. Do not run another botrun at this same `WorldX 2854` fall unless the route class changes.

## 2026-06-07 Strategy Learning Pipeline Switch

Implemented during this pass:

- Added `apps/browser-cockpit/src/strategyTraceEvidence.ts` as a pure trace-evidence module.
- Added `tests/strategyTraceEvidence.test.mjs` to lock the evidence schema and branch-outcome classification.
- Added `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-boss-high-air-carry-failure.json`.
- Updated strategy-pack standard tests so trace-evidence files must bind to `contra-us-good`, Stage 1, a fragment id, a route class, and a known failure id when applicable.

Machine-readable evidence:

- Evidence file: `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-boss-high-air-carry-failure.json`.
- Source run: `20260607-boss-high-air-carry-check`.
- Window: `WorldX 2500-2960`.
- Samples: `731`.
- Death: frame `5194`, `WorldX 2854`, `x128/y236`, input `down+right+B`.
- Branch outcome: `route-class-failed-stop`.

Method decision:

Stop using repeated local coordinate patches as the learning method. Future strategy work must follow:

`trace capture -> trace evidence -> fragment extraction -> runtime fragment execution -> one real botrun -> evidence feedback`.

The immediate next runtime change must use a different route class, not another high-platform jump/carry threshold.

## 2026-06-07 Mid-Platform Capture Branch Stop

Implemented during this pass:

- Added `stage-one-boss-approach-mid-platform-capture` as a distinct capture patch after the failed high-air-carry route.
- The patch deliberately does not trigger at the high-edge takeoff state, so it is a separate route-class experiment rather than another high-jump threshold.

Focused verification:

- `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
- `npm test`: `122/122` passed.
- `npm run build`: passed.

Real botrun evidence:

- `20260607-mid-platform-capture-check`
  - Status: `death`.
  - Death changed from `WorldX 2854/y236` to `WorldX 2836/y236`.
  - Final input: `up+right`.
  - Last alive: frame `5193`, `WorldX 2835`, `x123/y229`, input `down+left+B`.
  - Evidence file: `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-mid-platform-capture-failure.json`.

No-dead-loop decision:

Stop local left/right correction tuning for this falling capture window. The branch had a real effect, but it still misses the platform and dies. Another horizontal correction tweak would be the same failure class.

Required next implementation:

1. Use a targeted human frame trace for `WorldX 2600-2960`, or switch to a lower-route state fragment.
2. Add a short-segment recording entry so the owner can demonstrate only the Boss-approach platform zone instead of replaying the whole stage.
3. Do not run another pre-Boss platform botrun until the route source changes.

## 2026-06-07 Lower-Platform Edge Trigger Branch Stop

Implemented during this pass:

- Changed `stage-one-boss-approach-platform-jump` so it no longer holds A during the pre-landing fall.
- The patch only re-triggers A around the lower-platform contact window instead of widening the old jump window.

Focused verification:

- `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
- `npm run build --workspace @fc-ai/browser-cockpit`: passed.

Real botrun evidence:

- `lower-platform-edge-trigger-1780817803410`
  - Status: `death`.
  - Death: frame `5179`, `WorldX 2839`, `x128/y234`, input `up+right+B`.
  - Trace: A was released during the pre-landing fall and re-triggered from `WorldX 2814-2828`, but `jumpState` stayed `0` and the player still fell through the same death class.
  - Evidence file: `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-lower-platform-edge-trigger-failure.json`.

No-dead-loop decision:

Stop local tuning for the `WorldX 2814-2828` lower-platform A-edge branch. The failure is not simply caused by holding A too early or missing an A edge. The route source is wrong or incomplete.

Required next implementation:

1. Collect a frame-level human trace for `WorldX 2600-2960`, not just event summaries.
2. Convert the successful human segment into a state-action fragment under the StrategyPack.
3. If human trace is unavailable, switch to a different verified route class or spawn/table-derived segment before the next botrun.
