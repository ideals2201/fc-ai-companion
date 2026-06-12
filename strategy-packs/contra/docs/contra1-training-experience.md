# Contra 1 Operation Strategy Training Experience

Created: 2026-06-11

Scope: Contra Japan, local ROM profile `contra-j-good`, browser/jsnes runtime, headless jsnes validation, one-player strategy pack.

This document is the durable training-experience ledger for the current Contra strategy package. It stores reusable engineering lessons, accepted constraints, and current evidence so strategy work can continue without relying on conversation context.

## Engineering Rules

- Program-core identifiers, runtime keys, data contracts, tests, and strategy-pack documents use English.
- Chinese text belongs in UI locale catalogs or explicitly bilingual display fields.
- A strategy fragment is not accepted because it looks reasonable. It is accepted only when an exact-ROM runtime trace proves the target result.
- TAS, walkthroughs, maps, and external notes are planning input. They are not live controller logic until converted into fragments and validated locally.
- Survival is the mother route. Speed, combat, loot, and guard branches should inherit from a zero-death survival route, then alter only the branch-specific objective.

## Training Cadence

- Run training in bounded phases: stop after roughly 20 minutes or 12 candidates, whichever comes first.
- Every phase must leave a durable summary before the next search begins: accepted facts, rejected facts, best no-death `worldX`, death point, route/weapon state, and the next search boundary.
- Apply each phase summary to all strategy categories. Survival facts define the base route; combat, loot, guard, and speed tactics may reuse only facts that are compatible with their objective and exact ROM state.
- Failed candidates are still training data, but only as rejection evidence. Do not promote them to validated fragments or clear claims.
- Formal training-progress updates must go through `scripts/strategy-training-progress.mjs`; runtime reports remain local unless promoted into ledger, docs, schemas, or tests.
- Stop repeating a local search window after two adjacent phase summaries show no progress in `maxNoDeathWorldX`, boss HP, route state, weapon state, or reproducibility.

## Source Anchors

- NES controller input model: https://www.nesdev.org/wiki/Controller_reading
- Contra TAS and technical resource index: https://tasvideos.org/GameResources/NES/Contra
- Contra US annotated disassembly, useful only as a comparison reference: https://github.com/vermiceli/nes-contra-us
- Contra NES weapon behavior reference: https://strategywiki.org/wiki/Contra_%28NES%29/Weapons
- Contra NES Stage 1 reference: https://strategywiki.org/wiki/Contra_%28NES%29/Stage_1
- Contra Stage 1 enemy/boss overview: https://contra.fandom.com/wiki/Contra_Stage_1
- Contra NES GameFAQs walkthrough notes: https://gamefaqs.gamespot.com/nes/563399-contra/faqs/10508
- NES map reference: https://nesmaps.com/maps/Contra/Contra.html
- FCEUX Lua scripting reference: https://fceux.com/web/help/LuaScripting.html
- FCEUX LuaBot concept reference: https://documentation.help/FCEUX/%7B10AC9AD4-75EE-41A9-A67E-8136B6746C2E%7D.htm
- Gym Retro reference: https://openai.com/index/gym-retro/
- Stable-Retro reference: https://stable-retro.farama.org/index.html
- Imitation learning reference: https://underactuated.mit.edu/imitation.html
- Contra PPO example reference: https://github.com/vietnh1009/Contra-PPO-pytorch/
- Gym Contra example reference: https://github.com/lossv/gym_contra
- Local comparison note: `D:/2026TEST/contra-ai/strategy-packs/contra/docs/contra1-training-experience.md`

The local comparison note targets Contra Japan plus FCEUX Lua. It is relevant to the current target, but every coordinate and pass/fail claim still requires browser/jsnes replay before promotion. Its transferable value is the training method: exact ROM validation, bounded trace windows, survival-first branching, and weapon-aware turbo policy.

## Current Local Evidence

Current package:

```text
packId: contra-stage1-strategy-v0
romProfileId: contra-j-good
strategy: survival-v0
target: Stage 1 survival clear
ledger: strategy-packs/contra/stages/stage-1/training-progress.json
runtimeEvidence: data/training/contra/runtime_runs/contra-j-good/
tasBase: data/training/contra/tas_bases/contra-j-good/
```

Current Japanese recorded state:

```text
status: candidate, not clear
validatedStage1Clear: false
best survival-v0 evidence: reaches WorldX 3208, then loses at the Stage 1 boss wall with default rifle
best combat-v0 evidence: progressed to WorldX 2174, later high-air patch regressed to WorldX 2160
clearTime: unverified
kills/fixedTargets/rewards: unverified
```

Legacy US note:

```text
The previous contra-us-good ledger and W3208/W3163 boss-wall blocker evidence are historical comparison data only.
They must not be used as the current Japanese training target unless replayed against contra-j-good.
```

Current interpretation:

- The Japanese pack already has TAS baselines and several failed runtime traces.
- Current priority is not full-run repetition. It is segment-first training from exact Japanese state windows.
- Every new run must use `contra-j-good` ROM hashes and write evidence under `data/training/contra/runtime_runs/contra-j-good/`.
- US evidence can inspire hypotheses only after an explicit Japanese replay confirms the same condition.
- As of 2026-06-12, late Stage 1 movement blockers from W1471 through W2939 have verified route patches. The remaining Stage 1 survival blocker is boss-wall destruction/survival at W3208 while arriving with `weapon = 0`.

## Turbo Fire Policy

Fire control must be frame-based. It must not be implemented as asynchronous key spam.

Weapon firing is a verified-control problem, not a cosmetic rapid-fire feature.

Hard rule:

- The controller layer may decide `B` only from current weapon, active player bullet slots, target opportunity, and safety state.
- A map trick, walkthrough note, or TAS observation may propose a firing cadence, but it remains a hypothesis until an exact-ROM trace validates it.
- Do not promote global turbo as a pack-wide behavior. Every fire cadence belongs to a weapon profile or a validated fragment.

Candidate fire periods:

- Period 2, width 1: about 30 press edges per second. Aggressive; can saturate bullet slots.
- Period 3, width 1: about 20 press edges per second. Good experimental default.
- Period 4, width 1: about 15 press edges per second. Strong human rapid-fire baseline.
- Period 5, width 1: about 12 press edges per second. Conservative fallback.

Weapon-specific policy:

| Weapon | Policy | Notes |
| --- | --- | --- |
| Default rifle | Edge pulse | Do not hold B forever; pulse only when useful and bullet slots allow it. |
| Machine gun | Hold B | Native auto fire makes artificial pulse unnecessary. |
| Spread | Controlled pulse | Avoid blind fastest pulse because on-screen pellets affect output. |
| Fireball | Slow pulse | Use deliberate shots for fixed targets and safe lanes. |
| Laser | No turbo release | Do not pulse-release laser. Repeated fire can waste or interrupt useful beam behavior. |
| R upgrade | Projectile-speed model | Treat as faster projectile travel, not a controller-mode replacement. |

Current conclusion:

- Global turbo is not accepted as a pack-wide default.
- Weapon-aware fire control is useful and should be implemented in the route/controller layer.
- Boss-gate fixed-target logic should use pulse fire for default rifle when holding B prevents new shots.

## Strategy Pack Training Method

1. Stabilize `survival-v0` first.

   The route must clear Stage 1 with zero deaths before other strategies inherit from it.

2. Branch from survival only after survival is stable.

   `speedrun-v0`, `combat-v0`, `loot-v0`, and `guard-v0` may reuse survival-safe windows, then change the objective.

3. Validate with bounded headless runs.

   Use targeted windows for fast feedback, then a full run only after the local blocker moves or clears.

4. Promote fragments only from verified outcomes.

   A fragment candidate needs objective proof: target HP reduced/destroyed, death flag zero, no desync, and replay consistency.

5. Retest controller-layer changes broadly.

   Controller assist changes affect all strategies. After changing fire or jump cadence, rerun at least survival and the most relevant branch.

6. Keep water recovery as fallback unless measured faster.

   A route may recover from water, but speed branches should not rely on water unless clear time improves and death count remains zero.

7. Record failed runs.

   Failed runs are training data. Every intentional failure replay must be stored with status, reason, max progress, deaths, ROM hash, candidate config, and blocker notes. Failure evidence is required for prioritized failure replay.

8. Keep package data v1.1.0-compatible.

   Every strategy package and per-stage progress ledger must preserve standard fields for strategy descriptions, per-stage metrics, run facts, provenance, validation status, and battle results. Unknown values remain `null` / `unverified`; they must not be filled with estimates unless explicitly marked as migration estimates.

## Additional Training Techniques To Absorb

These methods are useful for this project, but they must be adapted to the current deterministic strategy-pack architecture.

### 1. TAS-style branch search

TAS construction relies on save states, frame advance, reruns, and keeping the best input branch. This maps well to our current fragment search model.

Application:

- Treat every blocker as a short deterministic search window.
- Keep a pre-window state, test several action overlays, and accept only the branch that advances the target condition without death.
- Store rejected branches with failure reason so the same bad action is not retried blindly.
- Use TAS data as route knowledge and candidate input windows, not as the live AI controller.

Why this matters:

- It is more sample-efficient than full neural training for small deterministic blockers.
- It creates inspectable strategy fragments that can be distributed in a strategy pack.

### 2. Imitation learning from demonstrations

Behavior cloning means learning a policy from expert demonstrations. For this project, the lightweight version is not a neural model first; it is fragment mining from human/TAS traces.

Application:

- Record human or TAS input plus RAM state.
- Segment the trace by `worldX`, player state, enemy slots, weapon, and objective.
- Extract reusable fragments such as `bridge_surface_jump`, `boss_gate_down_fire`, or `weapon_capsule_pickup`.
- Replay extracted fragments against the exact ROM before accepting them.

Why this matters:

- Human demonstrations are useful for discovering intent and safe timing.
- Direct copy is unsafe if the start state differs. Every fragment needs preconditions and fallback behavior.

### 3. Curriculum training

Curriculum learning trains easier tasks before harder tasks. Our equivalent is route-window progression.

Application:

- Do not train full Stage 1 from power-on for every edit.
- Train and validate local windows in order: start, first bridge, second bridge, upper platform, boss entry, boss gate.
- A later window is opened only after earlier windows have a stable baseline.
- The full-stage run is the final validation, not the first debugging tool.

Why this matters:

- It reduces wasted runtime.
- It makes failure location explicit.

### 4. Prioritized failure replay

Reinforcement-learning systems often improve sample efficiency by replaying important failures more often. Our strategy-pack version is a failure queue.

Application:

- Store every death/stall/desync as a failure record with RAM snapshot, frame, input, route segment, enemy slots, and reason.
- Rank failures by current blocker priority.
- Re-run the highest-priority failure window after every relevant patch.
- Do not spend runtime on already-solved windows unless a controller-layer change may have regressed them.
- Failed runs must still update the strategy pack ledger. A failed run can lower confidence, reveal the next blocker, and document what not to retry.

Why this matters:

- It prevents the system from endlessly replaying easy early-stage sections.
- It directly addresses the current W3208 blocker.

### 5. Hybrid rule engine before neural training

Retro-game RL projects use Gym/Retro, PPO, DQN, and large action spaces, but these are expensive and often produce opaque policies. Our near-term product needs reliable, inspectable strategy packs.

Application:

- Keep the current rule/fragment engine as the primary strategy format.
- Use neural/RL experiments later as proposal generators only.
- Any model-generated behavior must be converted into standard fragments and pass replay validation before it enters a strategy package.

Why this matters:

- Strategy packs must be portable, inspectable, and shareable.
- A black-box policy is not enough for our companion-player product.

### 6. Emulator runtime comparison

FCEUX Lua gives strong tooling for direct emulator control, memory hooks, and lag-frame handling. Browser/jsnes gives product-platform integration. Both are useful, but they should not be mixed without exact ROM and timing checks.

Application:

- Use FCEUX for deep trace research and possible save-state branch search.
- Use browser/jsnes for product behavior and UI integration.
- Any FCEUX-discovered fragment must be replayed in browser/jsnes before promotion to the browser strategy pack.

Why this matters:

- A fragment that clears in FCEUX can still desync in jsnes if timing, mapper, input alignment, or initialization differs.
- The distributed strategy pack must state which runtime validated each fragment.

## Stage 1 Public Walkthrough Lessons

Public walkthroughs are not direct strategy fragments, but several repeated ideas map cleanly to our AI strategy design.

### Opening and first weapon sensor

Useful public advice:

- Move forward while firing.
- Shoot diagonally down early to remove lower soldiers and open the first weapon sensor.
- Machine Gun is useful because it allows holding `B`.
- Rapid Fire is useful, but it should be modeled as a weapon/projectile improvement rather than blind controller spam.

Strategy translation:

- Opening route should use forward fire with bullet-slot awareness.
- When a lower fixed/object target is present, prefer a known stance window instead of reacting late after contact.
- The route should value weapon pickups when they do not break survival timing.

### Bridges

Useful public advice:

- Bridge explosions on NES do not directly damage the player.
- Walking across exploding bridges causes the player to fall.
- Jump repeatedly or time jumps to stay on the upper path.
- Soldiers can charge during the bridge sequence, so diagonal/down fire during jumps may be needed.

Strategy translation:

- Bridge logic should be a `WorldX` jump-window fragment, not a generic enemy reaction.
- The survival route may recover from water, but the speed route should learn a bridge-surface route.
- Bridge fragments need preloaded jump timing and should temporarily reduce "stop for every enemy" behavior.
- If airborne with lower-lane enemies, use controlled down-fire or diagonal fire while continuing the bridge route.

### Mid-stage turret and Spread route

Useful public advice:

- Staying on the upper path can avoid some turret pressure.
- Snipers hiding in grass should be shot when they stand up.
- The flying capsule contains Spread and is easier to reach from the top path.
- Spread can clear large enemy groups quickly.
- If Spread is missed, a later weapon sensor can provide another chance.

Strategy translation:

- `loot-v0` should prioritize Spread only when the route remains safe.
- `survival-v0` should not overfit to needing Spread; it must still clear with default weapon.
- Snipers and turrets should be semantic target classes in the threat pool, not just raw enemy slots.
- Reward pickup fragments need a fallback if the player is in water or on the lower path.

### Later ledges and Rapid Fire

Useful public advice:

- Continue on upper ledges when possible.
- Later item capsules include Laser and Rapid Fire.
- If the player already has Spread, avoid unnecessary Laser pickup.
- Rapid Fire is valuable when compatible with current weapon and route.

Strategy translation:

- Weapon-choice policy should prefer `Spread + Rapid` for survival/combat when safely obtainable.
- Laser pickup should be rejected by default for survival unless a specific fragment proves it useful.
- Fire cadence must depend on current weapon. Laser is the important exception.

### Boss gate

Useful public advice:

- Before focusing on the core, eliminate the sniper perched above the machine when possible.
- Destroy rotating guns / turrets before concentrating on cannons and the core.
- Safe play can use crouch-fire from top-left or middle ledge positions that are beyond turret fire.
- Attacking from the closest small platform can work, but it is risky if turret shots or body enemies reach the player.

Strategy translation:

- The current lower-lane close-core route at W3208 is strategically weak.
- Boss-gate survival should prefer a safe station that clears upper sniper/turret pressure before core damage.
- Fixed targets need HP monitoring and target persistence.
- Safety override must beat boss-wall `hold-fire`; if a body enemy overlaps the player, the AI must break station before continuing fixed-target fire.
- A good boss-gate fragment should include: station entry, fixed-target priority order, weapon-aware fire cadence, body-threat escape, and retry/fallback.

Validation boundary:

- These public tips are hypotheses only.
- A boss-gate safe-station rule is accepted only after a browser/jsnes `contra-j-good` trace proves zero death and improved target progress.
- If a fragment fails, record the failure in the strategy-pack progress ledger and keep the failed report under `data/training/contra/runtime_runs/contra-j-good/`.

## Stage 1 Training Notes

Known Stage 1 concepts:

- Start with forward fire, but avoid default-rifle bullet-slot saturation.
- Bridge jumps should use fixed WorldX windows only when exact-ROM traces prove repeatability.
- Fixed threats should be handled with HP monitoring and stance selection, not only enemy count.
- Boss-wall and late-stage station ideas from US evidence are hypotheses only until reproduced in `contra-j-good`.
- Standing close to a high-HP fixed target while holding right and B is unsafe unless nearby body threats are suppressed.
- Public walkthroughs support a safer boss-gate plan: clear top sniper/turrets first, use safe crouch/ledge stations, then destroy the core.
- If the route reaches the boss gate with only the default rifle, use pulse fire rather than continuous `B` hold.
- If Spread and Rapid are available, boss-gate strategy can be more aggressive, but still needs body-threat escape.

Current Stage 1 branch status:

| Strategy | Status | Evidence |
| --- | --- | --- |
| survival-v0 | Candidate, not clear | Current Japanese survival evidence reaches W3208 with default weapon, but boss-wall clear is not validated. |
| speedrun-v0 | Candidate material only | TAS-derived opening candidate exists, no validated clear. |
| combat-v0 | Candidate, not clear | Progressed through several blockers to W2174, but high-air cluster remains unsolved. |
| loot-v0 | Candidate material only | Matrix run died at W1943; must inherit survival once stable. |
| guard-v0 | Candidate material only | Matrix run died at W2038; needs 2P/co-op validation before promotion. |

## Immediate Work Queue

1. Switch all new training commands and `.env.local` to `contra-j-good`.
2. Use saved jsnes states to resume from Japanese failure windows instead of replaying the full opening every time.
3. Repair the strategy-pack progress ledger so it is valid JSON and can store per-run v1.1.0 fields for Japanese evidence.
4. Re-run the known Japanese blockers: survival W2087 and combat W2174/W2160.
5. Test weapon-aware fire periods only inside verified Japanese windows; Laser remains no-turbo.
6. Record every intentional run through `scripts/strategy-training-progress.mjs`; do not use ad-hoc help commands that write ledger data.
7. Promote no Stage 1 fragment until it proves zero-death clear or advances the current blocker with clear evidence.

## 2026-06-11 Contra Japan Stage 1 Boss Wall Evidence

ROM profile:

- Game: Contra Japan, `contra-j-good`.
- ROM: `D:\Ai-Play\ROM\contra-j\Contra (J).nes`.
- MD5: `0e40bc1b049c16c5d7246cc28399cb5d`.
- Headerless MD5: `d306c54ccfdf5cb4f8ec588f19b3e33d`.
- SHA256: `6ba53139fa88b8de1ae527c438bda6f1541d1ee7df26d63dec5164a32d166bfe`.

Validated segment evidence:

- Start state: `data/training/contra/runtime_runs/contra-j-good/states/debug-w8130-after-cluster.json`.
- Candidate overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-w1465-chain-w2939-early-entry-jump_right_fire-2896.json`.
- Stable report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/debug-w8130-after-revert-w3182-experiment.utf8.json`.
- Latest run id: `contra-j-stage1-boss-wall-directional-20260611`.
- Result: segment no longer dies at the earlier W3194-W3200 falling-body contact windows, reaches max `WorldX 3208`, then records a gameplay loss around frame `8415` and recovers control later.

Accepted lessons:

- Boss-wall falling bodies need directional handling, not a single generic retreat.
- Forward falling body corridor near W3194-W3200 should bias `up + right + fire`.
- Rear falling body corridor near W3194-W3200 should also bias `up + right + fire`; moving left repeats the contact path.
- Upper station rear overlap near W3204-W3212 should bias `up + left + fire`, but only for active body hazards.
- Enemy-slot residue with `routine == 0` must not trigger upper-station rear-overlap overrides.
- PowerShell `>` can emit UTF-16 JSON. Convert reports to UTF-8 or use UTF-8 output before passing them into ledger scripts.

Rejected lessons:

- Do not use a broad full-bullet-slot retreat/release-fire rule at the upper boss-wall station. It regressed the route to an earlier W3150/W8230 body-contact death.
- Do not widen the upper-entry close-body window from W3183 to W3180 without new evidence. It also regressed the route to the same earlier failure.
- Do not solve the W8415 failure by adding another simple single-frame left/right dodge first. The trace shows bullet-slot and station timing problems, so the next fix should be phase-level fire cadence or station scheduling.

Next boss-wall work:

- Add a boss-wall phase scheduler around W3204-W3208 that controls position and fire cadence together.
- Use weapon and bullet-slot state as inputs; do not hold continuous fire blindly with the default rifle.
- Test candidate station plans from the saved state instead of replaying the whole opening.
- Every failed candidate run must be written into the training ledger with v1.1.0 fields.

## 2026-06-12 Contra Japan Segment Training Evidence

Runtime scope:

- ROM profile: `contra-j-good`.
- Runtime: browser/jsnes headless route-plan probe.
- Strategy: `survival-v0`, 1P.
- Ledger: `strategy-packs/contra/stages/stage-1/training-progress.json`.
- Evidence directory: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/`.

Accepted movement fragments:

- `stage-one-w1465-grounded-stall-right-up-fire`: breaks the W1471 grounded loop where the old input kept crouching and firing without advancing.
- `stage-one-weapon-gate-air-carry`: expanded the W2148-W2172 air-carry Y range to cover the real W2160 high-air contact state.
- `stage-one-boss-approach-mid-platform-edge-jump`: converts the W2438-W2700 boss-approach platform chain into a 14-frame / 1-frame jump pulse while holding right + fire. Long-hold jump was rejected because it changed the trajectory and died near W2619.
- `stage-one-boss-approach-late-edge-jump`: jumps through the W2812-W2842 late boss-approach edge.
- `stage-one-boss-approach-entry-jump`: jumps through the W2896-W2964 boss-entry approach and reaches the boss wall.

Current best result:

- Report: `survival-v0-w2896-entry-jump-patch-segment-20260612.json`.
- Result: reaches W3208 with `weapon = 0`.
- Loss: boss wall remains uncleared; death occurs around W3199-W3208 under close body pressure.

Boss-wall candidate findings:

- Narrow late overlays tested: `up_fire`, `neutral_fire`, `right_fire`, `right_up_fire`, `duck_fire`, `right_duck_fire`, `left_fire`, `left_jump_fire`, `jump_right_fire`.
- Best survival delay: `up_fire` / `neutral_fire` survived until frame 8779, but core HP stayed at 32.
- Right-moving or broad right-up overlays regressed entrance safety or produced recovered-after-loss traces without core progress.
- Conclusion: do not keep patching the W3208 boss wall while arriving with default rifle only. The boss wall needs either verified weapon acquisition before entry or a boss phase scheduler that uses bullet-slot state, fixed-target HP, and body-threat escape together.

Bounded 2026-06-12 unattended boss-wall batch:

- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-stage1-boss-wall-bounded-batch-20260612.json`.
- Candidate limit: 12 segment-first candidates, no blind full-run.
- Start states: `jp-stage1-w3120-boss-entry-20260612.json` and `jp-stage1-w3208-boss-core-contact-20260612.json`.
- Result: no Stage 1 clear, no boss-wall clear, no no-death progress beyond W3208.
- Best representative failure: `jp-s1-bw-core-air-up-low-duck-bounded-20260612`, recorded in the official Stage 1 ledger.
- Best failure facts: `maxWorldX = 3208`, lost at frame 8597 from W3204 low-lane body contact, `weapon = 0`, core HP still 31.
- Rejected entry candidates from W3120: early right-up/up/neutral/pulse station plans lost before W3208 at W3156-W3175.
- Rejected core candidates from W3208: air left-up/up/neutral/right-up/left-fire/left-jump variants either died before useful core damage or stalled at W3208 and then died.
- Do not promote these overlays as validated fragments. They are comparison evidence proving that simple local stance overlays are insufficient.

Zero-death 2026-06-12 boss-wall phase replay batch:

- Scope: `survival-v0`, 1P, Contra Japan `contra-j-good`, saved-state segment replay only.
- Start states: `jp-stage1-w3120-boss-entry-20260612.json` and `jp-stage1-w3208-boss-core-contact-20260612.json`.
- Headless infrastructure accepted: `headless-runtime-smoke.mjs` now refreshes a full RAM snapshot after `--start-state` restore, because saved state files store compact report snapshots without full `enemies`. The same script can emit boss-wall phase telemetry and can disable the phase scheduler with `--boss-wall-phase=off`.
- Strategy result: no Stage 1 clear, no boss-wall clear, and no no-death progress beyond W3208.
- Ledger run: `jp-s1-zero-death-bosswall-rejected-batch-20260612`.
- Representative ledger evidence: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-phase-w3208-final-current-20260612.json`.
- Representative facts: phase enabled, max no-death progress W3208, lost active at frame 8128 after falling back to W3142, last phase decision `station-crowd-gate-clear` with `down`.
- Baseline comparison: `jp-s1-w3208-route-plan-phase-off-20260612` lost active at frame 7974 and also did not exceed W3208.
- Rejected phase candidate from W3120: `jp-s1-phase-from-w3120-20260612` died before the best point, max W3188.
- Rejected W3208 force overlays: `jp-s1-w3208-force-right-up-20260612`, `jp-s1-w3208-force-right-fire-20260612`, `jp-s1-w3208-force-neutral-fire-20260612`, `jp-s1-w3208-force-up-fire-20260612`, `jp-s1-w3208-force-right-duck-20260612`, `jp-s1-w3208-turn-jump-right-20260612`, `jp-s1-w3208-turn-early-right-20260612`, and `jp-s1-w3208-landing-jump-right-20260612`.
- `jp-s1-w3208-turn-early-right-20260612` reported `recovered-after-loss`; reject it because the loss happened before the later recovery and it does not satisfy zero-death validation.
- A temporary recovery-bypass phase logic trial died earlier at frame 8023 and was not retained as strategy logic.
- Do not treat any result in this batch as accepted strategy progress. The only accepted work is replay infrastructure and rejection evidence.

Next high-value route work:

- Reopen weapon acquisition before the boss. TAS/jsnes evidence points to useful windows near W344 and W1591, but every pickup must be validated in the single-player `survival-v0` state.
- Treat late W2260-W2368 weapon rescue as rejected unless a new RAM trace proves a weapon transition.
- Record every failed weapon or boss candidate in the v1.1.0 training ledger.
- If continuing default-rifle boss work, wire/test the existing boss-wall phase scheduler in headless replay before creating more stance-only overlays.

## 2026-06-11 Contra Japan Stage 1 Weapon Route Evidence

Headless runtime evidence:

- Current route state before late weapon gate: `data/training/contra/runtime_runs/contra-j-good/states/debug-w2247-before-weapon-gate.json`.
- Late weapon-gate batch: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-stage1-weapon-gate-candidate-batch-20260611.json`.
- Training ledger run: `contra-j-stage1-weapon-gate-late-window-rejected-20260611`.
- Result: W2260-W2368 stance-only changes did not change `weapon` from `0`; most variants lost active near W2390. Treat late weapon-gate rescue as rejected.

TAS evidence:

- Replay script: `scripts/headless-fm2-replay.mjs`.
- Synchronized evidence source: `data/tas/contra/contra-j-good/mars608,aiqiyou5-contra-nes-2players.fm2`.
- 2P TAS 1P weapon changes in jsnes replay:
  - frame 746 / movie row 745 / W344: `weapon 0 -> 1`.
  - frame 1999 / movie row 1998 / W1591: `weapon 1 -> 3` (Spread).
  - frame 3410 / movie row 3409 / W2990: `weapon 3 -> 19`.
- The 2P TAS is useful as route evidence, but it is not a single-player controller script. Some pickups are enabled by two-player spacing and the second controller's fire.
- The current 1P TAS file desyncs early in jsnes, so it is not accepted as direct controller evidence until alignment is repaired.

Accepted lessons:

- Do not keep patching the W3208 boss-wall point while arriving with default rifle only.
- Weapon acquisition must be validated before the boss wall. The useful windows are earlier than W2260, especially W300-W390 and W1500-W1630.
- For solo `survival-v0`, a TAS-derived pickup must be revalidated under the single-player spawn/camera state; two-player TAS input cannot be copied directly.
- A reward route fragment is accepted only when RAM confirms a nonzero `weapon` transition and the subsequent route survives.

Rejected lessons:

- W2260-W2368 `right_duck_fire`, `right_up_fire`, `neutral_fire`, `pulse_right_fire`, and simple split-stance overlays did not pick up a weapon.
- W300-W390 right-hold and right-fire overlays did not reproduce the 2P TAS pickup in solo route state; the single-player enemy table differs.

Next weapon-route work:

- Build a bounded candidate search around W300-W390 and W1500-W1630 using saved states once available.
- Track reward pickup by RAM transition, not by visual assumption or enemy-slot labels.
- Keep all failed weapon-route runs in the v1.1.0 ledger so future training avoids repeated late-window rescue attempts.

## 2026-06-12 Contra Japan Weapon16 Segment Evidence

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger runs: `jp-s1-w674-weapon16-left-jump-accepted-20260612` and `jp-s1-w1210-weapon16-jump-right-rejected-20260612`.
- Runtime batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w674-weapon16-escape-batch-20260612.json`.
- Saved continuation state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1461-weapon16-20260612.json`.

Accepted facts:

- Earlier W300-W390 opening overlays can produce a live `weapon = 16` state by W674, but the old route immediately died near W674 and lost the weapon on recovery.
- From saved state `jp-stage1-w674-weapon16-predeath-20260612.json`, the only accepted W674 escape candidate in this batch was `left_jump_fire`.
- `jp-s1-w674-weapon16-escape-left-jump-fire-20260612` reached no-death W1210 with `weapon = 16` preserved. This is accepted as a segment fragment only, not as a Stage 1 clear.
- From saved state `jp-stage1-w1210-weapon16-20260612.json`, `jump_right_fire` over W1160-W1235 improved the no-death weapon route to W1461 with `weapon = 16`.
- Follow-up W1450/W1715 batches did not validate a clear fragment, but they moved the reproducible no-death weapon16 analysis state forward to W1753.

Rejected facts:

- W674 variants `neutral_fire`, `left_fire`, `left_up_fire`, `right_fire`, `right_up_fire`, `jump_right_fire`, `pulse_jump_right_fire`, and `right_duck_fire` all died or lost active after the saved W674 state.
- W300 pickup reconnect batch `jp-s1-w300-pickup-reconnect-rejected-20260612` tested 12 candidates from `stage1-start-1200.json`, combining W300-W390 pickup overlays with the accepted W674 `left_jump_fire` escape plus old W760/W1160/W1440/W1830 weapon16 connectors.
- Best no-death result in that batch was `rightup-300-390` to W1504 with `weapon = 16`; it then lost active at frame 9771 and only reached W1631 after recovery with `weapon = 0`, so it is rejected for zero-death promotion.
- The W300-W390 pickup is real RAM evidence, but stance-only reconnect from W300 to the current W674/W1500 route is exhausted for now. Future pickup work must alter the W1500-W1830 phase or create a new saved-state branch before repeating W300 opening variants.
- W1504 contact-phase batch `jp-s1-w1504-contact-phase-reconnect-rejected-20260612` saved the W300 branch at W1504/weapon16 and tested immediate jump, duck, left, right, neutral, up-fire, and staged duck/jump variants.
- The W1504 state is too late: the player is already grounded near a same-lane type5 contact. Best zero-death progress was only W1505 with `weapon = 16`; any later W1914-W2035 progress happened after loss and weapon reset.
- Do not use `jp-stage1-w1504-weapon16-from-w300-20260612.json` as a future reconnect anchor. Move the branch point before W1496 or change the earlier enemy/object phase before trying W1500-W1830 again.
- W1499 precontact batch `jp-s1-w1499-precontact-phase-shaping-rejected-20260612` confirms that the W300 branch can escape the long W1499 crouch/stall. Right/right-fire/jump-right style breakout variants move no-death weapon16 progress to W1785.
- This is local branch progress only: all tested variants then die around W1786 to a same-lane type1 contact or recover after loss with `weapon = 0`. The saved continuation state is `jp-stage1-w1785-weapon16-from-w1499-20260612.json`.
- W1785 contact separation batch `jp-s1-w1785-contact-separation-rejected-20260612` tested 12 forced direction/fire overlays from `jp-stage1-w1785-weapon16-from-w1499-20260612.json`.
- The W1785 state is already too late: every contact-frame override lost active at frame 9317, with no zero-death progress beyond W1785. Later W1914/W1928/W2178 progress happened after death and weapon reset, so it is rejected for all strategy categories.
- Do not repeat W1499 breakout-only variants or W1785 contact-frame swaps; the next useful segment is W1750-W1780 preclear/phase shaping while preserving `weapon = 16`.
- The W1210 `jump_right_fire` connector is not accepted as a clear fragment because it later lost active at frame 4931, even though it produced the current best saved weapon16 continuation state.
- Recovered-after-loss progress after a weapon-route death must not be counted as zero-death route progress; the useful value is the saved no-death W1461 state.
- W1450 immediate Spread-window batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-weapon16-spread-window-batch-20260612.json`.
- W1450 variants `baseline`, `neutral_fire`, `up_fire`, `right_fire`, `right_up_fire`, `right_duck_fire`, `duck_fire`, `jump_right_fire`, `left_jump_fire`, `left_fire`, `pulse_right_fire`, and `pulse_jump_right_fire` produced no accepted fragment. `pulse_right_fire-5x2` is useful only as rejected evidence because it reached no-death W1722 with `weapon = 16`, then died at frame 5467.
- W1715 danger-window batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1715-weapon16-danger-window-batch-20260612.json`.
- W1715 variants `right_fire`, `right_up_fire`, `right_duck_fire`, `duck_fire`, `up_fire`, `neutral_fire`, `jump_right_fire`, `pulse_jump_right_fire`, `left_fire`, `left_jump_fire`, and `left` did not clear the danger window. The baseline route reached no-death W1753 with `weapon = 16`, then died at frame 5604, so it is recorded as rejected ledger run `jp-s1-w1715-weapon16-danger-window-rejected-20260612`.

## 2026-06-12 Contra Japan W1753-W2390 Weapon16 Continuation

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Starting state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Formal ledger run: `jp-s1-w1753-weapon16-w2390-window-rejected-20260612`.
- Best representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-weapon16-w2309-jump-2248-2368-20260612.json`.
- Saved continuation state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2390-weapon16-20260612.json`.

Accepted facts:

- The W1753 baseline route still dies at W1753/W1760 because it backs left into a same-lane body window.
- A no-left W1753 batch carried `weapon = 16` to no-death W2178, then died at a low-lane pit/body window.
- Adding a W2132-W2188 `jump_right_fire` pit jump carried `weapon = 16` to no-death W2309, then died at W2310.
- Extending the W2250-W2368 window with `jump_right_fire` carried `weapon = 16` to no-death W2390 before a low pit/edge death at frame 6260.
- The new best weapon16 analysis state is W2390, but it is not a clear fragment and does not improve the all-route Stage 1 best of W3208.

Rejected facts:

- W2250-W2368 `right_fire`, `right_up_fire`, neutral/left brake variants, and late W2368-W2440 pulse or release-then-jump variants did not beat W2390 as no-death progress.
- Pulse-jump variants can report post-death progress as high as W2726 after recovery, but this is rejected for zero-death training and must not be promoted.
- W2390 trace shows the second failure is a low pit/edge window after entering `boss-approach-survive`, not a boss-wall clear attempt.
- Holding A continuously through W2248-W2368 does not produce a reliable second jump after W2368; future candidates need a route-level terrain/window fix rather than another stance-only overlay.

## 2026-06-12 Contra Japan W2390-W2838 Weapon16 Boss-Approach Chain

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-weapon16-w2838-landfix-rejected-20260612`.
- Best representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-weapon16-w2824-landfix-rightfire-2735-2790-20260612.json`.
- Saved continuation states: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2726-weapon16-20260612.json`, `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2824-weapon16-20260612.json`, and `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2838-weapon16-20260612.json`.

Accepted facts:

- Splitting the W2248-W2440 movement into W2248-W2334 `jump_right_fire`, W2334-W2352 `right_fire` release, and W2352-W2440 `jump_right_fire` fixed the W2390 low-fall blocker.
- Adding W2688-W2735 `jump_right_fire` avoided the W2726 close-body contact and pushed the no-death weapon16 branch to W2824.
- Adding a W2735-W2790 `right_fire` landing fix pushed the no-death weapon16 branch to W2838.
- The best current weapon16 branch still preserves `weapon = 16`, but it remains below the all-route Stage 1 best W3208 and is not a clear fragment.

Rejected facts:

- W2726 local rescue from `jp-stage1-w2726-weapon16-20260612.json` is too late; all tested local actions died immediately at W2727.
- W2780-W2860 extended jump, pulse jump, right-up fire, and W2808-W2835 late brake candidates did not beat W2824.
- W2735-W2790 neutral, left-fire, and left-jump landing fixes regressed or died earlier; only right-carry variants reached W2838.
- W2838 trace shows the route is already in an unrecoverable low fall at Y231 with no nearby contact threat; pressing A at that point does not start a jump.

Next weapon16 work:

- Rebuild the W2735-W2838 platform-chain trajectory from an earlier W2688/W2726 trace; W2838 itself is too late to rescue.
- No single-player RAM trace in this batch confirmed a Spread upgrade; `weapon` stayed `16` through the best no-death state.
- Accept a candidate only if RAM confirms `weapon` improves or remains useful and the segment stays zero-death.
- Do not promote any weapon16 or Spread route to the strategy pack unless it reconnects to the boss approach without deaths.

## 2026-06-12 Contra Japan W2838-W2939 Weapon16 Pulse Repress

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-weapon16-w2939-pulse-rejected-20260612`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-weapon16-w2838-release-repress-batch-20260612.summary.json`.
- Best representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-w2939-pulse-predeath-trace-20260612.json`.
- Saved continuation state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2939-weapon16-20260612.json`.

Accepted facts:

- The W2735-W2790 `right_fire` landing fix alone reaches W2838 but holds A across the later landing window; W2805-W2838 shows `jumpState = 0` with A pressed and no accepted jump.
- Delaying the second jump by simply extending `right_fire` through W2798, W2804, W2808, W2812, W2816, or W2820 did not improve over W2838.
- Adding W2790-W2804 `right_fire` release followed by W2804-W2884 `pulse_jump_right_fire` produced a reproducible no-death W2939 state with `weapon = 16`.
- The best candidate remains below the all-route Stage 1 best W3208 and is not a boss-wall clear or Stage 1 clear.

Rejected facts:

- W2790-W2804 and W2790-W2812 neutral release variants still died at W2838; W2790-W2820 neutral stalled at W2814.
- W2790-W2804 and W2790-W2812 left-fire brake variants stalled around W2800 and are not useful for zero-death progress.
- The W2939 trace dies at W2940/Y236 from a low-fall window before the boss wall; nearby enemies are above or distant enough that this is not direct body-contact evidence.

Next weapon16 work:

- Continue from the saved W2939 state only for inspection; do not treat it as a local rescue point unless the first action can happen before W2940.
- Rebuild the W2884-W2940 descent with a shorter or later pulse window, or add a pre-W2920 release/repress pattern that lands before Y230.
- If a candidate reaches W2960+ no-death, re-enable boss-wall-specific validation and compare against the existing W3208 all-route branch.

## 2026-06-12 Contra Japan W2939 Local And Descent Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2939-local-descent-sweep-rejected-20260612`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2939-local-and-descent-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2939-rightfire2884-2964-20260612.json`.

Accepted facts:

- The saved W2939 state is one frame before the W2940/Y236 loss, but local `right_fire`, `jump_right_fire`, `right_up_fire`, and `left_jump_fire` all still died immediately.
- Extending the W2804 pulse window to W2908 or W2924 did not change the no-death ceiling; both still lost at W2940/Y236.
- Forcing W2884-W2964 `right_fire`, `jump_right_fire`, or `right_up_fire` also failed to exceed no-death W2939.
- W2884-W2920 or W2884-W2935 right-fire followed by a later jump did not recover the descent.

Rejected facts:

- W2939 is not a usable local rescue point for the tested one-frame inputs.
- The W2939 blocker is not solved by simply preserving right movement or by holding jump after W2884.
- All tested variants reported post-death max progress around W2942, but zero-death progress remains W2939 and must not be promoted.

Next weapon16 work:

- Move the search earlier than W2884 and alter the W2804-W2884 arc itself, not the final W2939 frame.
- Focus on lower-amplitude pulse timing or earlier release/repress combinations that enter W2918-W2935 at a lower fall speed or higher platform contact margin.
- Keep boss-wall validation disabled until a candidate reaches W2960+ without death.

## 2026-06-12 Contra Japan W2941 P8 Arc Increment

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2941-p8-arc-rejected-20260612`.
- Arc batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2939-earlier-arc-batch-20260612.summary.json`.
- Post-control batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2941-post-batch-20260612.summary.json`.
- Repro trace report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2941-p8-repro-trace-20260612.json`.
- Saved continuation state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2941-weapon16-20260612.json`.

Accepted facts:

- Changing the W2804-W2884 arc from p6/w1 to p8/w1 `pulse_jump_right_fire` reproducibly advanced the weapon16 branch from no-death W2939 to no-death W2941.
- The W2941 candidate still preserves `weapon = 16`, but it immediately loses at W2942/Y236 and is not a boss-wall clear or Stage 1 clear.
- The W2941 save state is useful for inspection only unless a future route can alter the approach before W2942.

Rejected facts:

- Earlier/later W2804-W2884 p6 variants, p4/p5/p7/p10 single-frame pulses, and p6/p8 two-frame pulse variants did not beat W2941; p8/w2 tied W2941 but did not improve it.
- Adding W2884-W2964 `right_fire`, `jump_right_fire`, p6/p8 pulse, or split right-then-jump controls after the p8 arc did not exceed W2941.
- Extending the p8 pulse through W2896, W2910, W2924, or W2936 also stayed at W2941, so the remaining blocker is still an earlier terrain/height curve issue rather than a late one-button rescue.

Next weapon16 work:

- Search before W2804 or rebuild the W2735-W2884 trajectory so the player reaches W2918-W2942 with more vertical margin.
- Treat W2941 as a measured incremental candidate, not as validated strategy-pack clear evidence.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2945 P12 Pre-Arc Increment

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-p12-prearc-rejected-20260612`.
- Pre-arc batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2941-prearc-batch-20260612.summary.json`.
- Repro trace report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-p12-repro-trace-20260612.json`.
- Saved continuation state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2945-weapon16-20260612.json`.

Accepted facts:

- Replacing the W2735-W2884 setup with W2735-W2784 `right_fire` followed by W2784-W2884 p12/w1 `pulse_jump_right_fire` advanced the weapon16 branch from W2941 to reproducible no-death W2945.
- The W2945 candidate still preserves `weapon = 16`, but it loses at W2946/Y236 and is not a boss-wall clear or Stage 1 clear.
- The new best weapon16 continuation state is W2945, still below the all-route Stage 1 best W3208.

Rejected facts:

- Starting the p8 pulse at W2790 regressed to W2824, so the jump cannot begin too early from the W2735 platform chain.
- Delayed p8 starts at W2796, W2798, W2800, W2808, and W2812 tied W2941 but did not improve it.
- W2688 jump-release variants ending at W2720, W2728, or W2744 did not change the W2941 ceiling.
- W2784 p10/w1 regressed to W2935, and W2784 p8/w2 only tied W2941; p12/w1 is the only accepted pre-arc improvement in this batch.

Next weapon16 work:

- Continue around the W2735-W2784 release and W2784-W2884 p12 pulse family, varying pulse width and exit timing before testing W2884+ controls again.
- Accept only zero-death candidates that exceed W2945 or reach W2960+ for boss-wall validation.
- Keep W2945 saved state as inspection evidence, not as a local rescue point, because the next loss happens at W2946/Y236.

## 2026-06-12 Contra Japan W2945 P12 Neighbor And Post-Control Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-p12-neighbor-post-sweep-rejected-20260612`.
- P12-neighbor batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-p12-neighbor-batch-20260612.summary.json`.
- Post-control batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-post-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-post-rightfire2910-2964-20260612.json`.

Accepted facts:

- The W2945 p12/w1 pre-arc candidate remains reproducible, but none of the neighbor or post-control variants improved it.
- The representative W2910-W2964 `right_fire` post-control overlay still lost at W2946/Y236 with `weapon = 16`.

Rejected facts:

- W2784-W2884 p12/w2, p12/w3, p15/w1, W2780 start, W2788 start, early W2876 exit, and W2896/W2910 extensions all tied W2945 but did not improve it.
- W2784-W2884 p11, p13, p14, and p16 variants regressed to W2938-W2941 or lower.
- W2910-W2964 `right_fire`, `jump_right_fire`, p12/p8 pulse, split right-then-jump, W2925 low stance, and W2935 left-jump escape variants all failed to exceed W2945.

Next weapon16 work:

- Stop treating W2910+ as a local rescue window for this route class; the W2946/Y236 loss persists after direct post-control overrides.
- Move the next search earlier, especially W2688-W2735 jump shape and W2735-W2784 platform release, to enter the p12 pulse with more vertical margin.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2945 Entry-Shape Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-entryshape-sweep-rejected-20260612`.
- Entry-shape batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-entryshape-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-entryshape-jump2688-2730-right2730-2784-p12-20260612.json`.

Accepted facts:

- W2688 jump-end variants at W2730, W2738, W2748, and W2756 did not improve the p12 route, but they did preserve the current W2945 ceiling.
- The best p12 route remains W2735-W2784 `right_fire` followed by W2784-W2884 p12/w1 `pulse_jump_right_fire`.

Rejected facts:

- Adding a W2735-W2784 second jump at W2750, W2760, or W2770 regressed to W2828-W2848 low-fall deaths.
- Short pre-p12 pulses from W2760-W2784 also regressed to W2838-W2844.
- Starting the main p12 pulse at W2776 produced recovered-after-loss evidence only and is rejected for zero-death training.
- Starting the p12 pulse at W2792 tied W2945 but did not improve it.

Next weapon16 work:

- Do not use W2735-W2784 second-jump or early-pulse variants for this route class.
- The remaining useful space is likely W2804-W2884 height shaping after the W2784 release, or a different earlier platform-capture route before W2688.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2945 Grounded Late-Jump Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-grounded-latejump-sweep-rejected-20260612`.
- Valid batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-grounded-latejump-fromw1753-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-grounded-latejump-p12to2872-jump2872-2896-20260612-fromw1753.json`.
- Invalid comparison batch: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-grounded-latejump-batch-20260612.summary.json`.

Accepted facts:

- The valid batch must start from `jp-stage1-w1753-weapon16-20260612.json`; power-on runs with the same 5200-frame budget only reached W1409 and are not comparable W2945 evidence.
- Twelve W2860-W2905 variants around the late grounded frame were tested from the W1753 weapon16 continuation.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.
- W2872/W2876 forced late-jump variants and W2868 late p6/p10 pulse variants only tied W2945.

Rejected facts:

- Forcing jump too early at W2864 or W2868 regressed to W2937-W2941.
- Releasing A through W2880 before forcing jump produced a lower visual Y at W2941 but still died at W2940/Y236, so that shape is not progress.
- Skipping the W2861 pulse and restarting at W2869 regressed to W2942 or tied W2945 only when p12 was preserved.
- W2860-W2905 late grounded jump is exhausted for this route class unless an earlier platform-capture route changes the entry state.

Next weapon16 work:

- Move earlier than W2784, especially the W2688-W2735 platform capture and the W2735-W2784 release.
- Do not spend more candidates on W2860-W2905 late forced jumps for the current p12 arc.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2945 Early-Capture Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-earlycapture-sweep-rejected-20260612`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-earlycapture-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-earlycapture-jump2686-2735-p12-20260612.json`.

Accepted facts:

- The valid batch starts from `jp-stage1-w1753-weapon16-20260612.json`, matching the W2945 p12 route evidence.
- Twelve W2644-W2784 early-capture candidates were tested around pre-capture control and W2680-W2688 platform-jump timing.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960.
- Starting the platform jump at W2686 instead of W2688 tied W2945 and is the only non-regressing early-start variant in this batch.

Rejected facts:

- Starting the platform jump at W2680 regressed to W2838.
- Starting at W2682 or W2684 died around W2730 and is not a viable earlier-capture route.
- Forcing W2644-W2688 right/right-up/right-duck pre-capture produced post-death max progress as high as W3208, but zero-death progress was capped at W2724; those traces are rejected for 0-death training.
- Early jump before W2686 and forced pre-capture right movement are exhausted for this route class.

Next weapon16 work:

- Keep W2686/W2688 platform jump as the viable start boundary for the current p12 route.
- The remaining useful space is narrower: W2730-W2784 release timing without second-jump/early-pulse regression, or a different pre-W2644 capture route.
- Continue rejecting any report whose max progress occurs after death, even if post-death replay reaches W3208.

## 2026-06-12 Contra Japan W2945 Last-Frame Escape Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-lastframe-escape-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2945-weapon16-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-lastframe-escape-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-lastframe-neutralfire-20260612.json`.

Accepted facts:

- The W2945 save state is a precise pre-death inspection point: W2945/Y230, `screen = 11`, `weapon = 16`, `deathFlag = 0`.
- Baseline replay from this state loses active on the next frame at W2946/Y236.
- Twelve direct last-frame controls were tested from the same saved state: left, left-fire, left-up-fire, left-jump-fire, left-duck-fire, neutral-fire, up-fire, duck-fire, right-duck-fire, right-up-fire, right-fire, and jump-right-fire.

Rejected facts:

- No last-frame direct input exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.
- Left-biased inputs changed the death x-position to W2944, but still died on the next frame at Y236.
- Neutral, up, duck, right, and jump-right variants still died at W2946/Y236.
- The W2945 pre-death frame is already unrecoverable for single-frame direction/fire/jump control.

Next weapon16 work:

- Do not spend more candidates on direct W2945 last-frame rescue.
- Future candidates must change the route before W2945, preferably before the W2784-W2884 p12 arc or by finding a different pre-W2644 platform-capture entry.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2945 Pre-W2644 Shape Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2945-prew2644-shape-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Base overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-s1-w2941-prearc-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-prew2644-shape-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2945-prew2644-pulse2440-2644-p18w1-20260612.json`.

Accepted facts:

- Twelve candidates modified only W2440-W2644 before returning to the same W2688 platform capture and W2784-W2884 p12 baseline.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960.
- The best no-death result in this batch was W2594 from the W2440-W2644 p18/w1 pulse candidate, still far below the current W2945 route.

Rejected facts:

- Forced jumps after the W2440 landing, including W2440, W2480, W2520, W2560, and W2600 starts, mostly died around W2496/Y236.
- W2440-W2644 p18/p20 pulse shaping improved over immediate W2496 deaths but still failed at W2594/W2550 no-death.
- Right-duck, right-up, neutral, and left-brake shaping after W2440 regressed to W2495 or as low as W2441 no-death.
- W2390 and W2726 saved states were confirmed as pre-death inspection states, not useful search starts.

Next weapon16 work:

- Do not spend more candidates on W2440-W2644 forced shape changes for the current p12 route class.
- Move the next search before the W2352-W2440 second jump, or rebuild the pre-W1753 route so the W2440 landing state is different.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2352 Prejump Boundary Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2352-prejump-boundary-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Base overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-s1-w2941-prearc-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Baseline trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2352-2440-baseline-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2352-prejump-boundary-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2352-prejump-jump1-short2328-20260612.json`.

Accepted facts:

- The W2248-W2440 trace confirms the current route lands at W2402/Y164, then re-enters a default jump around W2444 before the later boss-approach fall.
- Twelve candidates shifted the first jump end, W2330-W2358 A-release window, second-jump start/end, neutral/left release, and second-jump pulse timing.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.
- The best candidate only reproduced W2945 with `weapon = 16`, then lost active at W2946/Y236.

Rejected facts:

- Earlier second-jump starts at W2346, W2348, and W2350 died around W2371-W2375 before reconnecting to the platform chain.
- Later second-jump starts and longer first-jump variants reached only W2593 no-death, below the already rejected W2945 route.
- Second-jump pulse variants reached only W2482 no-death.
- Neutral and left release variants regressed to W2341/W2335 no-death and are not useful for zero-death routing.

Next weapon16 work:

- Treat immediate W2248-W2440 jump-boundary tuning as exhausted for the current route class.
- Move the next search earlier than W2248, especially the W2132-W2188 pit approach and the pre-W1753 weapon route state.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2132 Pit-Approach Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2132-pitapproach-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Base overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-s1-w2941-prearc-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Baseline trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2132-2248-baseline-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2132-pitapproach-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2132-pitapproach-pulse2132-2248-p10w2-20260612.json`.

Accepted facts:

- The baseline trace shows the W2132 takeoff from W2132/Y148 with `weapon = 16`, close fixed and soldier pressure around W2167-W2188, and a W2248 landing before the already rejected W2248-W2440 boundary chain.
- Twelve candidates modified only the W2132-W2248 approach while returning to the same W2248/W2334/W2352 and W2688/W2735/W2784 route chain.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960.
- The best no-death result in this batch was W2494/Y227 from the W2132-W2248 p10/w2 pulse-jump candidate.

Rejected facts:

- Early W2124 takeoff and no-jump right/right-up carry died near W2178/Y229-Y234.
- Fixed release variants around W2170-W2188 mostly regressed to W2404 no-death.
- Sparse p14/w1 pulse reached only W2330 no-death; W2170-W2188 double-jump reached only W2309.
- Forcing right-fire after W2188 still regressed to W2404 and did not preserve the W2945 route.

Next weapon16 work:

- Treat W2132-W2248 local pit-approach tuning as exhausted for the current route class.
- Move the next search before W2132, especially W2068-W2112 fixed-threat/descent shaping.
- Consider rebuilding the pre-W1753 weapon route state rather than adding more local rescue overlays after W2132.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W2068 Entry-Shape Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2068-entryshape-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Base overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-s1-w2941-prearc-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Baseline trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2068-2112-baseline-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2068-entryshape-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2068-entryshape-pulse2068-2132-p10w2-20260612.json`.

Accepted facts:

- The baseline trace shows the W2026 pit-exit jump/recoil area, the W2068 high fixed-target platform jump, and W2112-W2132 descent into the already rejected W2132 pit-approach window.
- Twelve candidates modified only W2000-W2132 while returning to the same W2132/W2248/W2352 and W2688/W2735/W2784 chain.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960.
- The W2068-W2132 p10/w2 pulse and W2096-W2132 right-up variants only reproduced W2945 before losing at W2946/Y236.

Rejected facts:

- W2000-W2048 and W2026-W2068 right-fire or pulse suppressions died around W2030.
- W2048-W2112 fixed-threat aim and extended-jump variants died around W2110.
- W2020-W2068 forced right-jump died around W2178.
- No local W2000-W2132 entry-shape variant changed the later W2945 death into a W2960+ boss-wall candidate.

Next weapon16 work:

- Treat W2000-W2132 local entry-shape tuning as exhausted for the current route class.
- Move the next search before W2000, likely W1753-W2000 route-state shaping or a different pre-W1753 weapon route state.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W1753-W2000 Route-State Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-2000-routestate-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Base overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-s1-w2941-prearc-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Baseline trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-2000-baseline-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-2000-routestate-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-2000-routestate-rightfire1980-2006-20260612.json`.

Accepted facts:

- The baseline trace confirms that the current weapon16 p12 route reaches W2945 no-death, then loses at W2946/Y236.
- Twelve candidates modified only the pre-W2000 route state before returning to the same W2132/W2248/W2352 and W2688/W2735/W2784 p12 chain.
- No candidate exceeded W2945 or reached W2960 for boss-wall validation.
- W1980-W2006 right-fire, right-up, p12/w2 pulse, and right-duck variants only reproduced W2945 before losing at W2946/Y236.

Rejected facts:

- W1887-W1911 right-fire and right-duck replacements regressed the route to W2838/W2839 losses.
- W1887 neutral fire, W1887 early jump, delayed W1911 jump, and W1904 prejump variants died before W2005.
- Suppressing the W1960 second jump reached only W2014; delaying that jump to W1968 reached only W2178.
- W1753-W2000 local route-state tuning does not change the later W2945 death into a W2960+ boss-wall candidate.

Next weapon16 work:

- Treat local W1753-W2000 route-state shaping as exhausted for the current weapon16 p12 route class.
- Rebuild before the W1753 saved state, or use the external Contra Japan package only as a proposal source for new live `contra-j-good` replay candidates.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W1461 Immediate Escape Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1461-immediate-escape-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1461-weapon16-20260612.json`.
- Base overlay: `data/training/contra/runtime_runs/contra-j-good/candidate-overlays/jp-s1-w2941-prearc-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Baseline trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1461-1630-baseline-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1461-immediate-escape-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1461-immediate-escape-left-up-fire-20260612.json`.

Accepted facts:

- The W1461 baseline trace confirms this saved state is a pre-death inspection point: the default continuation loses active on the next frame around W1462/Y163, then can recover only after weapon loss.
- Twelve immediate-escape candidates tested left, left-fire, left-up-fire, left-jump-fire, neutral/up/duck fire, right variants, jump-right, and p6/w2 pulse before returning to the W1753/W2132/W2688/W2784 p12 chain.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.
- The best no-death distance was `left_up_fire` at W1914/Y196 with `weapon = 16`, but it stalled active for 2965 frames and never reconnected to the accepted W2945 p12 route.

Rejected facts:

- The `left` candidate reached W1802 no-death, then lost active at W1803/Y196.
- `left_fire` and `left_jump_fire` reached only W1726 no-death, then lost active at W1727/Y212.
- Neutral, up, duck, right, jump-right, and p6/w2 pulse variants either lost active immediately around W1462/Y163 or recovered only after the loss state, so they are invalid as zero-death continuations.
- W1461 immediate escape does not provide a viable branch for the current zero-death Stage 1 route.

Next weapon16 work:

- Treat W1461 as a diagnostic pre-death state, not a continuation start.
- Rebuild the route before W1461, especially the W1210-W1450 weapon16 approach and enemy-cycle control.
- Keep external Contra Japan package claims as proposal sources only until reproduced through live `contra-j-good` headless/FCEUX evidence.

## 2026-06-12 Contra Japan W1450 Pulse5x2 W1722 Escape Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1450-pulse5x2-w1722-escape-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1450-weapon16-20260612.json`.
- Base overlay: W1450-W1510 `pulse_right_fire` with `firePeriod = 5`, `fireWidth = 2`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w1722-escape-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w1722-jump1718-1748-20260612.json`.

Accepted facts:

- The W1450-W1510 p5/w2 right-fire pulse remains the best known W1450 local variant: it preserves `weapon = 16` and reaches the W1722 contact blocker before death.
- Twelve second-stage overlays tested W1718-W1748 jump-right, jump-only, right-duck, duck, right-fire, right-up, up-fire, left-fire, left-jump, p6/w2 pulse-jump, p10/w2 pulse-jump, and left-duck actions.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.
- The best second-stage result reached W1733/Y196 with `weapon = 16`, then lost active at W1734. This is a small local improvement over W1722, but not a viable continuation.

Rejected facts:

- Jump, jump-only, right-fire, right-up, and pulse-jump variants all tied W1733 no-death, then died at W1734/Y196 or W1734/Y188.
- Duck, right-duck, and left-duck avoided immediate death but stalled at W1718 and did not cross the blocker.
- Up-fire, left-fire, and left-jump died or recovered after loss at W1718, so post-loss progress is rejected.
- Local W1722 rescue is too late for this route class; the enemy-cycle formation must be changed before W1718 or the route must be rebuilt before W1450.

Next weapon16 work:

- Move the next search to W1510-W1718 formation shaping, not W1722 last-moment rescue.
- Test whether earlier fire cadence or short right/left spacing changes can prevent slot6 from arriving at same-lane contact around W1734.
- Keep the W1450 p5/w2 pulse as a useful proposal source only until a follow-up branch exceeds W1753 no-death without stalling.

## 2026-06-12 Contra Japan W1450 Pulse5x2 W1510-W1718 Formation Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1450-pulse5x2-formation-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1450-weapon16-20260612.json`.
- Base overlay: W1450-W1510 `pulse_right_fire` with `firePeriod = 5`, `fireWidth = 2`.
- Formation trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-formation-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-formation-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-formation-jump1648-1718-20260612.json`.

Accepted facts:

- The trace confirms that W1722 last-frame rescue is too late for this route class; formation has to change before W1718.
- Twelve candidates tested W1600-W1718 right-fire, right-up, right-duck, p4/w2 and p8/w4 pulse-right, W1648-W1718 jump-right and p8/w2 pulse-jump, W1668-W1738 p10/w2 pulse-jump, W1600-W1668 up-fire, W1648-W1688 left-up, and W1668-W1718 left/right actions.
- The best local formation result was W1648-W1718 `jump_right_fire` or p8/w2 `pulse_jump_right_fire`: no-death `weapon = 16` progress advanced from W1733 to W2178.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.

Rejected facts:

- The two best W1648-W1718 jump variants both lost active at W2179/Y235, so they are not accepted as Stage 1 clear evidence.
- Right-fire, right-up, and pulse-right variants reached W1758 no-death but lost around W1728; post-loss W2390/W2758 progress is rejected.
- Right-duck and left-up variants stalled before reconnecting.
- Up-fire, left-fire, p10/w2 pulse-jump, and right-only variants regressed to W1600-W1679 no-death or died after loss recovery.

Next weapon16 work:

- Treat W1510-W1718 formation shaping as locally useful but not sufficient for the current route class.
- Move the next search to the new W2178 low/fall blocker, especially W2132-W2180 landing shape from the W1648 jump route.
- Alternatively rebuild before W1450 if the W2178 low/fall death proves tied to the p5/w2 branch geometry.
- Do not count post-loss W2390/W2758 recovery as progress.

## 2026-06-12 Contra Japan W1450 Pulse5x2 W2178 Lowfall Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1450-pulse5x2-w2178-lowfall-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1450-weapon16-20260612.json`.
- Base overlays: W1450-W1510 `pulse_right_fire` p5/w2 plus W1648-W1718 `jump_right_fire`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2178-lowfall-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2178-lowfall-pulseupjump2112-2188-p12w3-20260612.json`.

Accepted facts:

- Twelve lowfall candidates tested W2112-W2200 jump-right, W2096-W2188 pulse-jump cadence, W2112-W2188 pulse-up-jump, right/right-up/right-duck, left-fire, and jump-only variants.
- The best local result was W2112-W2188 `pulse_up_jump_right` p12/w3: no-death `weapon = 16` progress advanced from W2178 to W2327.
- W2132-W2188 `jump_right_fire` and `jump_right` reached W2309, while pulse-jump fire variants reached W2226.
- No candidate exceeded the existing W2945 zero-death ceiling or reached W2960 for boss-wall validation.

Rejected facts:

- The best W2327 candidate lost active at W2328/Y232 and only recovered post-loss to W2390; this is rejected as clear evidence.
- The W2309 jump variants lost at W2310/Y233.
- Static right, right-up, right-duck, and early/late jump variants repeated the W2178/W2179 fall death.
- Left-fire regressed the no-death distance to W2161 and its post-loss W2608 recovery is rejected.

Next weapon16 work:

- Treat W2132-W2188 jump shaping as locally useful, but insufficient for the current W1450 branch.
- Move the next search to W2309-W2328 landing and fixed-target timing only if using the W2112-W2188 pulse-up-jump route.
- Otherwise rebuild the route before W1450 or use an external Japan package proposal to seed a different live `contra-j-good` W1450 approach.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W1450 Pulse5x2 W2328 Landing Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1450-pulse5x2-w2328-landing-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1450-weapon16-20260612.json`.
- Base overlays: W1450-W1510 `pulse_right_fire` p5/w2, W1648-W1718 `jump_right_fire`, and W2112-W2188 `pulse_up_jump_right` p12/w3.
- Trace report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2328-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2328-landing-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2328-landing-jump2288-2348-20260612.json`.

Accepted facts:

- The trace shows the best W2327 route descending from Y139 to Y225, then dying at W2328/Y232; this is still before boss-wall logic.
- Twelve candidates tested W2288-W2360 jump-right, jump-only, pulse-jump, pulse-up-jump, right-up, right-fire, right-duck, duck-fire, and left-duck landing/fixed-target actions.
- No candidate exceeded the W2327 no-death ceiling or reached W2960 for boss-wall validation.
- The current W2328 blocker cannot be solved by simply overwriting local W2288-W2348 inputs after the W2112-W2188 pulse-up-jump branch.

Rejected facts:

- Jump-right, jump-only, pulse-jump, pulse-up-jump, right-up, right-fire, right-duck, and duck-fire variants all repeated the W2328/Y232 death.
- Left-duck changed vertical position but regressed: no-death remained capped at W2327/Y61 and then lost at W2322/Y74.
- Post-loss recovery remains rejected and must not be counted as route progress.
- This local rescue window is exhausted for the current branch.

Next weapon16 work:

- Do not spend more attempts only changing W2288-W2348 actions on this branch.
- Move the next search earlier into the W2112-W2188 arc shape, especially pulse phase and jump-release cadence that determines descent into W2327.
- If W2112-W2188 arc search cannot exceed W2327, rebuild before W1450 using a different live `contra-j-good` approach.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan W1450 Pulse5x2 W2112-W2240 Arc Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1450-pulse5x2-w2112-arc-sweep-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1450-weapon16-20260612.json`.
- Base overlays: W1450-W1510 `pulse_right_fire` p5/w2 plus W1648-W1718 `jump_right_fire`.
- Arc trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2112-2328-arc-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2112-arc-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1450-pulse5x2-w2112-arc-pulseup2088-2168-p12w3-20260612.json`.

Accepted facts:

- The arc trace shows the current best W2112-W2188 p12/w3 route descending from W2272/Y42 through W2327/Y225, then dying at W2328/Y232 before boss-wall logic.
- Twelve candidates varied W2088-W2240 `pulse_up_jump_right` start/end windows and p10/p12/p14/p16 cadence, plus W2112-W2240 `pulse_jump_right_fire` and W2096-W2188 hold-jump.
- No candidate exceeded the W2327 no-death ceiling or reached W2960 for boss-wall validation.
- Ten pulse-up variants reproduced the W2328/Y232 death, proving the current W1450 branch is insensitive to these local pulse phase changes.

Rejected facts:

- `pulse_jump_right_fire` from W2112-W2240 regressed to W2226/Y77.
- W2096-W2188 hold-jump regressed to W2178/Y230.
- The W2088-W2240 arc window is now locally exhausted for this branch.
- Post-loss recovery remains rejected and must not be counted as route progress.

Next weapon16 work:

- Stop iterating W2112-W2240 arc-only variants for the current W1450 p5/w2 branch.
- Rebuild before W1450, especially the W1210-W1450 weapon16 approach and enemy-cycle state.
- Use the external Contra Japan package only as a proposal source for a different live `contra-j-good` W1450 approach, then revalidate through headless runtime.
- Keep boss-wall validation disabled until a zero-death candidate reaches W2960+.

## 2026-06-12 Contra Japan External Boss Window Conversion Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-extboss-source-bosswall-sweep-rejected-20260612`.
- Proposal source: external package `contra-jp-operation-strategy-pack-v0-0.1.0-20260612-090640`, Stage 1 boss fragments.
- Source idea translated: FCEUX proposal windows around `D+B`, `R+D`, and `R+U+B` for rotating-gun/plated-door pressure.
- Start states: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w3120-boss-entry-20260612.json` and `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w3208-boss-core-contact-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-extboss-source-bosswall-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-extboss-w3208-rduck60-rup120-20260612.json`.

Accepted facts:

- Twelve candidate overlays were tested: six from W3120 boss entry and six from W3208 core-contact state.
- No candidate exceeded the existing W3208 no-death ceiling or reached W3300.
- No candidate reduced boss fixed-target HP before death; the representative W3208 run still shows core HP 31.
- The best W3208 candidate survived until lostActiveFrame 8158, then lost at W3201/Y196.
- The best W3120 candidate reached only W3171 before loss.

Rejected facts:

- The external package's FCEUX `D+B -> R+D -> R+U+B` boss action window does not directly transfer to the current jsnes `contra-j-good` W3120/W3208 states.
- Simple crouch/fire and right-up boss-wall overlays remain insufficient with default rifle and current enemy-cycle state.
- Phase-on plus the same translated overlay did not improve over phase-off results.
- The external package remains proposal material only; it is not validated live-controller evidence for this pack.

Training cadence rule:

- Stop after roughly 20 minutes or 12 candidates, whichever comes first, and write a factual phase summary.
- Every phase summary must list accepted facts, rejected facts, best no-death `worldX`, death point, and the next search boundary.
- Do not continue sweeping a local window after two adjacent phase summaries show no progress in `maxNoDeathWorldX`, boss HP, or route state.
- Runtime artifacts stay local unless promoted through ledger/docs/tests; failed candidates are still useful only as rejection evidence.

Next boss-wall work:

- Do not spend the next phase on more direct translations of this external boss window.
- Rebuild boss entry station before W3208 or change the route state by improving weapon acquisition before the boss.
- If using the external package again, mine earlier route-state or weapon-route ideas instead of copying the final boss action string.

## 2026-06-12 Contra Japan W1534 Spread Window Live Rejection Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1534-spread-window-live-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/debug-w1590-before-spread-window.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1534-spread-window-live-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1534-spread-window-pulseright1500-1688-p8w4-20260612.json`.

Accepted facts:

- The W1534 saved state is a real single-player `contra-j-good` state near the TAS W1591 weapon-change clue, but it starts with `weapon = 0`, not the TAS `weapon = 1` precondition.
- Twelve live overlays tested W1500-W1688 up-fire, right-up fire, right fire, crouch fire, pulse-right fire, jump-right fire, and split jump/right-up variants.
- No candidate produced any RAM-confirmed weapon transition; `maxObservedWeapon` stayed `0` for the whole batch.
- Best zero-death local progress was W2178 from `pulse_right_fire` p8/w4, still below the existing weapon16 W2945 branch and below the all-route W3208 ceiling.

Rejected facts:

- Treat this specific W1534 single-player saved state as rejected for direct Spread conversion.
- The TAS W1591 clue does not transfer without first recreating its earlier weapon/camera/enemy-cycle preconditions.
- Static up/neutral/duck variants either stalled around W1500-W1579 or lost active before reconnecting.
- Right/right-up/jump variants advanced locally but died around W1690-W2179 and never improved route state.

Training rule:

- Do not spend another phase on W1500-W1688 direct fire-angle overlays from `debug-w1590-before-spread-window.json`.
- If revisiting the W1591 TAS idea, first rebuild the earlier W300-W390 pickup route so RAM enters this window with the correct nonzero weapon state.
- Candidate-search summaries must enter the ledger through `scripts/strategy-training-progress.mjs`; batch runs must preserve candidate count, death count, and best no-death progress instead of being collapsed to a single run.

## 2026-06-12 Contra Japan W1210-W1460 Weapon16 Prestate Rebuild Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1210-prew1450-rebuild-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1210-weapon16-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1210-prew1450-rebuild-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1210-prew1450-jump1440-1495-20260612.json`.

Accepted facts:

- Twelve candidates changed the W1160-W1235 and W1420-W1495 weapon16 setup before the previous W1450/W1461 blocker.
- The old W1210 connector only reached no-death W1461. This batch proved the prestate is locally movable: several candidates exceeded W1461 with `weapon = 16`.
- Best local candidate was W1440-W1495 `jump_right_fire`, reaching no-death W1833 with `weapon = 16` before losing active at W1834/Y192.
- Other locally useful variants reached W1816, W1757, W1682, W1554, W1533, W1472, or W1463 before loss.

Rejected facts:

- No candidate survived the 5000-frame probe.
- No candidate reached W2390, W2945, W2960, or the W3208 all-route ceiling.
- W1440 stance-only variants mostly shifted the same failure forward without producing a reconnectable route state.
- Post-loss W2004-W2726 progress is rejected because the weapon is lost after death.

Next weapon16 work:

- Do not repeat W1440-W1495 stance-only sweeps from the W1210 state.
- Inspect the W1757-W1834 loss geometry from the best candidates, especially the W1440 jump branch and W1420 right-up branch.
- If the W1834 loss is already unrecoverable locally, move the search earlier than W1420 or rebuild the W1210 entry state from W674 with different enemy-cycle timing.

## 2026-06-12 Contra Japan W1830 Close-Body Micro Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1830-close-body-micro-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1210-weapon16-20260612.json`.
- Diagnostic trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1833-precontact-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1830-close-body-micro-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1830-closebody-pulseright1818p4w2-20260612.json`.

Accepted facts:

- The W1833 trace proves the immediate loss source: from F5632 onward a same-lane soldier approaches while the route keeps `uprightb` fixed-target fire; the evasive `upleftab` response starts only at F5640 and is too late.
- Twelve candidates preserved the W1210/W1440 weapon16 setup and changed only the W1808-W1850 close-body response.
- No candidate survived the 5000-frame probe, reached W2390, or reconnected to the previous W2945/W3208 branches.
- The best local candidate was W1818-W1845 `pulse_right_fire` p4/w2, which advanced no-death weapon16 progress to W2178 before losing active at W2179/Y235.
- Five additional variants made only minimal local progress to W1834/W1835; neutral, duck-only, left-fire, left-jump, and pulse-jump variants did not exceed the prior W1833 ceiling.

Rejected facts:

- W1830 stance-only corrections are not enough to create a validated route; all 12 candidates are rejected as clear candidates.
- The W1830 close-body blocker is locally suppressible with horizontal pulse fire, but the resulting route state still dies before the weapon-gate reconnect.
- Post-loss progress remains rejected even when the runtime later reports larger `maxWorldX`.

Next weapon16 work:

- Do not repeat W1818-W1850 horizontal/duck/jump stance variants from the current W1210/W1440 setup.
- Inspect the W2178/W2179 death geometry from `jp-s1-w1830-closebody-pulseright1818p4w2-20260612`.
- If W2179 is another close-body timing problem, test a new 20-minute/12-candidate phase around W2130-W2185; if it is a route-state dead end, rebuild before W1808 instead of extending the same micro patch.

## 2026-06-12 Contra Japan W2178 Lowfall Rescue Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2178-lowfall-rescue-rejected-20260612`.
- Base candidate: `jp-s1-w1830-closebody-pulseright1818p4w2-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1210-weapon16-20260612.json`.
- Diagnostic trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2178-lowfall-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2178-lowfall-rescue-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2178-lowfall-pulseup2100-2175-p12w3-20260612.json`.

Accepted facts:

- The W2178 trace proves the immediate loss source: the current route falls into a low-body/object contact at W2179/Y235 while still using right/right-up fire.
- Twelve candidates preserved the W1210/W1440/W1830 connector and varied only W2100-W2196 jump, right-jump, pulse-jump, pulse-up-jump, and fire timing.
- No candidate survived the 5000-frame probe or reconnected to the previous W2945/W3208 branches.
- The best local candidate was W2100-W2175 `pulse_up_jump_right` p12/w3, which advanced no-death `weapon = 16` progress to W2726 before losing active at W2727/Y93.
- W2140-W2196 `jump_right_fire` also moved local progress to W2698; W2132-W2188 jump/pulse-up families typically reached W2309 or W2192.

Rejected facts:

- There were zero accepted candidates. All W2100-W2196 variants are rejected as clear candidates because they eventually died.
- Static right-fire/right-up and early jump-fire variants repeated the W2178/W2179 lowfall death.
- W2100-W2175 pulse-up jump is a useful connector candidate only; it is not validated route progress until W2727 is resolved and the route reconnects.

Next weapon16 work:

- Do not repeat W2132-W2188 rescue variants for this branch.
- Inspect the W2698-W2727 contact geometry from the W2100-W2175 p12/w3 branch.
- Accept the next branch only if it stays zero-death beyond W2726 and starts reconnecting toward W2945/W2960; otherwise rebuild before W2100.

## 2026-06-12 Contra Japan W2726 Contact Rescue Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2726-contact-rescue-rejected-20260612`.
- Base candidate: `jp-s1-w2178-lowfall-pulseup2100-2175-p12w3-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1210-weapon16-20260612.json`.
- Diagnostic trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2726-contact-trace-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2726-contact-rescue-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2726-contact-pulsejumpfire2688-2735-p12w3-20260612.json`.
- Follow-up trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2831-landing-trace-20260612.json`.

Accepted facts:

- The W2726 trace proves the immediate loss source: the W2178 lowfall branch reaches W2726/Y91 with `weapon = 16`, then loses at W2727/Y93 to a near front body/object.
- Twelve candidates preserved the W1210/W1830/W2178 route and varied only W2672-W2748 contact handling: jump-right, pulse-jump, right-fire, right-up, right-duck, neutral-fire, and left-up variants.
- No candidate stayed alive for the full 5000-frame probe, reached W2945/W2960, or exceeded the all-route W3208 ceiling.
- The best local candidate was W2688-W2735 `pulse_jump_right_fire` p12/w3, which advanced no-death `weapon = 16` progress from W2726 to W2831.
- The follow-up W2831 trace shows the new loss as a low landing/platform failure at W2832/Y236, not a boss-wall or clear state.

Rejected facts:

- There were zero accepted clear or reconnect candidates. All 12 candidates are rejected as Stage 1 clear evidence because they ended in death.
- W2688-W2735 static right-fire, right-up, and right-duck variants regressed to W2707.
- Starting jump-fire too early at W2672 regressed to W2724; starting at W2700 repeated the old W2726/W2727 loss.
- Neutral-fire and left-up variants held position or backed up around W2688 and did not create a viable platform entry.
- The W2688-W2735 p12/w3 pulse-jump is local connector evidence only; it must not be reused by combat, loot, guard, or speed branches unless a later phase proves a zero-death reconnect.

Next weapon16 work:

- Do not repeat W2688-W2735 contact-only stance variants for this branch.
- Test W2735-W2884 platform-capture/reconnect shaping from the W2831 connector, especially right-fire release followed by a pulse-jump arc, because earlier validated notes show this window can matter for W2945-class routes.
- If W2735-W2884 shaping cannot produce zero-death progress beyond W2831, rebuild before W2688 instead of extending the same late landing patch.

## 2026-06-12 Contra Japan W2831 Platform Reconnect Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2831-platform-reconnect-rejected-20260612`.
- Base candidate: `jp-s1-w2726-contact-pulsejumpfire2688-2735-p12w3-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1210-weapon16-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2831-platform-reconnect-batch-20260612.summary.json`.
- Representative report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2831-platform-right2735-2784-pulse2784-2884-p12w1-20260612.json`.
- Diagnostic trace: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2838-platform-trace-from-w1210-20260612.json`.

Accepted facts:

- Twelve candidates preserved the W1210/W1830/W2178/W2726 connector and varied only W2735-W2884 platform-capture/reconnect shaping.
- The batch retested the previously useful W2735-W2784 `right_fire` release followed by W2784-W2884 `pulse_jump_right_fire` p12/w1, plus p6/p8/p12 neighbors, delayed starts, neutral release, full right-fire, and full jump-fire.
- No candidate stayed alive for the full 5000-frame probe, reached W2945/W2960, or exceeded the all-route W3208 ceiling.
- The best local candidate was W2735-W2784 `right_fire` followed by W2784-W2884 `pulse_jump_right_fire` p12/w1, which advanced no-death `weapon = 16` progress from W2831 to W2838.
- The W2838 trace shows the loss at W2839/Y234 while grounded, with a nearby moving object at dx -56/dy -1. This is a low platform/landing death, not boss-wall validation.

Rejected facts:

- There were zero accepted clear or reconnect candidates. All 12 candidates are rejected as Stage 1 clear evidence because they ended in death.
- The W1210-derived branch does not inherit the earlier W1753-derived W2945 route state even when replaying the known W2735-W2784 plus W2784-W2884 p12/w1 shape.
- Neutral release regressed to W2754, and a full W2735-W2884 p12/w1 pulse repeated the W2831/W2832 death.
- All right-release plus pulse variants tied at W2838/W2839 and did not approach W2945.

Next weapon16 work:

- Do not repeat W2735-W2884 release/pulse variants from the current W1210/W1830/W2178/W2726 branch.
- Rebuild before W2688 or before W2100 to change the platform entry state rather than extending the late landing patch.
- If mining old W2945 evidence, treat it as route-state evidence from the W1753 branch only; it is not validated for the W1210 branch until a live replay reaches W2945 again.

## 2026-06-12 Contra Japan W1753 Route-State Transplant Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-routestate-transplant-rejected-20260612`.
- Base candidate: `jp-s1-w2831-platform-right2735-2784-pulse2784-2884-p12w1-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1210-weapon16-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-route-state-transplant-batch-20260612.summary.json`.

Accepted facts:

- The old W2945 route used W1750-W1768 `right_duck_fire` followed by W1764-W1815 `right_fire`, then a different W2132-W2440 jump chain before the late W2735-W2884 release/pulse shape.
- Twelve candidates preserved the current W1210 weapon16 setup and tested direct W1750-W1815 transplant variants: old right-duck/right-fire, extended right-fire, pulse-right, right-up, jump, pulse-jump, neutral-fire, and a full old W1750-W2884 route transplant.
- No candidate exceeded W2838 with zero deaths, reconnected to W2945, reached W2960 boss-wall validation, or improved the all-route W3208 ceiling.
- The best candidate reached only W2309 and still died; several direct transplant variants tied at W2309, while pure right-fire regressed to W2128, jump/pulse-jump regressed to W1777, neutral-fire regressed to W1769, and full old-route transplant reached W2235.

Rejected facts:

- Directly transplanting the old W1750-W1815 route-state window into the current W1210 branch is rejected.
- The W1210-derived route cannot be fixed by copying the old W1753 route fragment alone; it changes the W2100/W2688 connector phase and fails earlier than the current W2838 branch.
- The older W2945 route remains useful as comparison evidence only until a live contra-j-good replay re-creates that state from the current branch.

Next weapon16 work:

- Do not repeat W1750-W1815 transplant sweeps from the current W1210 branch.
- If rebuilding before W2100, use a new saved-state phase model instead of direct fragment copying.
- The next bounded phase should either rebuild before W2688 from a trace-proven state difference, or return to the older W1753-derived saved states and test whether they can be made reproducible without mixing them into the W1210 branch.

## 2026-06-12 Contra Japan W2939 Boss-Entry Rescue Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2939-boss-entry-rescue-rejected-20260612`.
- Start states checked: `jp-stage1-w2939-weapon16-20260612.json`, `jp-stage1-w2941-weapon16-20260612.json`, `jp-stage1-w2945-weapon16-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2939-boss-entry-rescue-batch-20260612.summary.json`.

Accepted facts:

- The W2939, W2941, and W2945 weapon16 saved states all lose active on the next resumed frame under the normal route-plan probe.
- Twelve W2939 rescue candidates tested immediate left-jump, left-fire, up-fire, right-up, jump-right, pulse-jump, right-duck, duck, neutral, right-fire, pulse-right, and pulse-up-jump entry actions.
- No candidate exceeded W2939, reached W2960 boss-wall entry, approached W3208, or produced a usable zero-death segment.
- This proves the W2939-W2945 saved states are pre-loss evidence rather than practical rescue anchors.

Rejected facts:

- Do not treat W2939, W2941, or W2945 as reusable boss-entry start states for future candidate batches.
- The older W1753-derived branch cannot be advanced by starting directly from these terminal saved states.
- The W3208 global best remains separate boss-wall evidence from a different state and is not reproduced by the W2939 rescue class.

Next weapon16 work:

- Start any older-branch boss-entry reconstruction earlier than W2939.
- Prefer a trace-proven state before the low-lane fall/contact collapse instead of one-frame pre-loss snapshots.
- If the next phase uses W2945-class evidence, first prove the chosen saved state survives at least several frames without a candidate overlay, then test boss-wall actions.

## 2026-06-12 Contra Japan W2764 Boss-Wall Contact Rescue Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2764-bosswall-contact-rescue-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Baseline report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-anchor-baseline-jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-bosswall-contact-rescue-batch-20260612.summary.json`.

Accepted facts:

- W2764 is a usable reconstruction anchor: unlike W2939/W2941/W2945, it survives under the normal route-plan probe and reaches W3188 before losing active.
- The baseline loss at W3188/W3164 is boss-wall contact pressure: same-lane soldiers close on the player while core/fixed targets remain alive.
- Twelve candidates varied only W3148-W3225 boss-wall contact handling: right-up, right, jump-right, duck/right-duck, left bailout, up/neutral fire, pulse-jump, pulse-up-jump, and staged right-up/jump recovery.
- The best local candidates, W3148-W3225 `pulse_jump_right_fire` p8/w2 and `pulse_up_jump_right` p10/w2, reproduced W3208 but still died.
- At W3208 the best candidates still have `weapon = 0`, core HP 32, fixed targets alive, and close same-lane body pressure. This is a reproduced ceiling, not a clear candidate.

Rejected facts:

- No candidate stayed zero-death beyond W3188 or exceeded the formal W3208 ceiling.
- Full-window right-up/right/jump/duck variants regressed to W3175 or W3156.
- Left bailout moved the collision class but still died around W3159/W3179.
- W2764 is useful as a boss-wall reconstruction anchor, but W3148-W3225 whole-window action swaps are rejected as clear evidence.

Next weapon16/default-weapon boss-wall work:

- Keep W2764 as the preferred reconstruction anchor over W2939/W2941/W2945.
- Do not repeat broad W3148-W3225 action swaps.
- The next phase should start from the W3208 reproduction candidate and test narrower W3188-W3210 contact/body separation or fixed-target damage timing, with explicit checks for core HP reduction and close-soldier clearance.

## 2026-06-12 Contra Japan W3188 Narrow Contact Sweep

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger runs: `jp-s1-w2764-w3188-narrow-contact-rejected-20260612`, `jp-s1-w3188-precore-breakout-patch-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-w3188-narrow-contact-batch-20260612.summary.json`.
- Patch validation report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-w3188-breakout-patch-runtime-20260612.json`.

Accepted facts:

- The W3188 baseline death is a grounded same-lane body contact: slot 7 closes from `dx=18, dy=-14` at frame 8002 to `dx=8, dy=2` at frame 8011 while player remains around `playerX=116`.
- Widening the grounded contact breakout window to include `playerY <= 170` changes the live decision at W3188 from `A+B` to `Left+A+B`.
- That patch delays loss from frame 8012 to 8015, but it does not improve no-death progress beyond W3188; the player slides back to W3184 and still dies with fixed targets intact.
- Twelve forced W3180-W3198 overlays tested `up_fire`, `left_up_fire`, `neutral_fire`, `left_fire`, pure left/right, `right_up_fire`, `right_fire`, `duck_fire`, `left_duck_fire`, `jump_right_fire`, and `left_jump_fire`.
- Every narrow forced overlay still died. Several reproduced W3208, but only as a death ceiling, not as zero-death progress.

Rejected facts:

- W3180-W3198 narrow forced overlays are rejected as clear evidence.
- The W3188 single-frame `Left+A+B` breakout is insufficient by itself; it only delays the collision.
- Do not count W3208 from this batch as progress, because all W3208 reproductions include death.

Next boss-wall work:

- Do not repeat W3180-W3198 single-action forced overlays.
- The next bounded phase should test boss-wall phase crowd-gate continuation after the W3188 left breakout, especially whether station-crowd contact needs a horizontal jump/fire continuation instead of reverting to `down+B`.
- If that fails, move the search earlier than W3180 and change station spacing before slot 7 enters same-lane contact.

## 2026-06-12 Contra Japan W3184 Forced Continuation Diagnostic

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2764-w3184-forced-continuation-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-w3184-forced-continuation-20260612.summary.json`.
- Diagnostic mode: `--force-candidate-overlay`, targeting W3184-W3212 after the W3188 breakout.

Accepted facts:

- The previous patch changed the W3188 contact response to `Left+A+B`, but the follow-up phase still returned to `down+B` at frame 8014 and lost active on the next frame.
- Twelve forced continuation candidates replaced that post-breakout crowd-gate action with right-up fire, jump-right fire, pulse jump-right fire, pulse up-jump-right, right fire, up fire, neutral fire, left-up fire, left-jump fire, jump-right without fire, and pulse right fire.
- Right-up, jump-right, pulse-jump, and right-fire continuations can delay the loss to frame 8084, but they still do not exceed W3208 with zero deaths.
- `pulse_right_fire` produced recovered-after-loss behavior and final W555 after death, so it is rejected as invalid for 0-death strategy training.
- The core remains effectively unsolved in this branch: W3208 reproductions still carry death evidence and fixed/core HP pressure remains the practical blocker.

Rejected facts:

- Replacing `down+B` with a forced post-breakout continuation is rejected as a standalone fix.
- Do not treat delayed loss at frame 8084 as progress; no candidate met the no-death acceptance gate.
- Do not repeat W3184-W3212 continuation-only overlays from the W2764 anchor unless the entry spacing or fixed/core HP state has changed first.

Next boss-wall work:

- Move the next search earlier than W3180 to alter soldier slot timing before the same-lane collapse.
- Prefer candidates that reduce fixed/core HP or change player station height before W3184, then replay the W3188/W3208 segment without forced overlay.
- Keep W2764 as the reconstruction anchor, but stop spending batches on post-contact continuation alone.

## 2026-06-12 Contra Japan W3184 Lower-Forward Jump Patch

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w3184-lower-forward-jump-patch-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Runtime report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-w3184-lower-forward-jump-patch-runtime-20260612.json`.

Accepted facts:

- The W3184 frame 8014 phase decision previously saw slot 7 at `dx=9, dy=10` but still selected `station-crowd-gate-clear` with `down+B`.
- The phase rule now treats W3180+ low-position lower-forward body pressure as `station-crowd-contact-jump`, while preserving the earlier W3159 lower-crowd down-fire case.
- Targeted phase tests pass for both the old down-fire case and the new W3184 jump case.
- Runtime validation delays the normal phase loss from frame 8015 to frame 8021.

Rejected facts:

- The patch is not progress evidence: max no-death progress remains W3188, final progress collapses to W82 after death, and fixed targets remain alive.
- This confirms the W3184 lower-forward jump is only a safety correction, not a boss-wall clear path.

Next boss-wall work:

- Do not spend another batch on W3184 jump/no-jump selection alone.
- Use the patch as a guardrail, then rebuild the earlier entry so fixed/core HP or crowd timing changes before W3184.
- Any future accepted candidate must exceed W3208 without death, not merely delay the frame of death.

## 2026-06-12 Contra Japan W3100 Precontact Shaping Diagnostic

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2764-w3100-precontact-shaping-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-w3100-precontact-shaping-20260612.summary.json`.
- Diagnostic mode: `--force-candidate-overlay`, targeting W3100-W3184 before the W3188 same-lane collapse.

Accepted facts:

- Twelve forced precontact candidates tested early right-up fire, up fire, neutral fire, right fire, pulse right fire, jump-right fire, pulse jump-right fire, left-fire/left-up pre-retreat followed by right-up re-entry, and fixed-target priority guards.
- No candidate produced accepted zero-death progress beyond W3208.
- The best local no-death value remained W3208 only on pulse-jump variants that still died.
- Left pre-retreat variants avoided immediate death but stalled at W3100 and therefore failed the forward-progress gate.
- Several early fire/right variants regressed to W3175 or W3156 with fixed targets still alive, proving they do not improve the boss-wall state.

Rejected facts:

- W3100-W3184 forced station shaping is rejected as a standalone strategy class from the W2764 anchor.
- Do not repeat early right-up/up/right/neutral fire sweeps in this same window.
- Do not use left pre-retreat unless it includes a proven forward-progress recovery; stalling alive is not a stage-clear candidate.

Next boss-wall work:

- The next useful window must start before W3100 or use a different anchor that enters boss-wall with improved weapon or fixed-target HP state.
- Prioritize routes that change the target state before W2764 or preserve weapon16 into boss-wall, because default-weapon boss-wall tuning is repeatedly converging to death at W3188/W3208.
- Keep W3100 shaping reports as rejected evidence, not candidate fragments for validation.

## Cross-Training Checkpoint Rule

Use this rule for all Contra strategy training categories, not only `survival-v0`:

- Work in bounded batches of about 20 minutes or at most 12 candidate overlays, whichever comes first.
- Each batch must name one hypothesis, one start state, one candidate window, and explicit accept/reject criteria before running candidates.
- Accepted evidence requires zero deaths and either stage clear, boss-wall clear, or no-death progress beyond the current official ledger ceiling.
- Local connector evidence can be useful for the next batch, but it must stay marked as rejected unless it exceeds the official no-death ceiling or clears the stage.
- Every batch must save the best candidate, rejected candidates, and next-window recommendation in the formal ledger or strategy docs before starting the next batch.
- Runtime reports, overlays, segment-search reports, and states remain local analysis artifacts unless deliberately promoted into the strategy-pack standard.

## 2026-06-12 Contra Japan W1753/W1914 Weapon16 Reconnect Diagnostic

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-w1914-weapon16-reconnect-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-w1914-weapon16-reconnect-20260612.summary.json`.
- Diagnostic mode: `--force-candidate-overlay`, targeting weapon16 W1880-W1948 after the current route stalls around W1914.

Accepted facts:

- Current baseline from W1753 is not an immediate death: it can remain active with weapon16 and no deaths, but stalls around W1913/W1914 instead of reconnecting to the later route.
- Twelve forced reconnect candidates tested right, right-fire, right-duck-fire, right-up-fire, jump-right, jump-right-fire, pulse jump-right-fire, pulse up-jump-right, neutral fire, and staged duck/right-up exits.
- No candidate cleared, reached boss-wall validation, or exceeded the official W3208 no-death ledger ceiling.
- The best local connector was `pulse_jump_right_fire` p8/w2 across W1880-W1948; it advanced no-death weapon16 progress to W2178 before dying at W2179/Y234.
- Simple right/right-fire variants can pass W1914 but tend to die earlier around W1943/Y234 or later reconnect only after death.

Rejected facts:

- W1880-W1948 right-force reconnect is rejected as a standalone strategy class.
- Do not promote the later final progress from recovered-after-loss candidates; it occurs after death and is invalid for 0-death training.
- Do not repeat W1914 right/right-fire/duck/jump-only overlays unless the W2178 lowfall geometry is changed first.

Next weapon16 work:

- Treat W1753 -> W2178 via p8/w2 pulse jump-right-fire as connector evidence only.
- The next bounded phase should target W2178/W2179 lowfall/blocker geometry from the W1753-derived connector, not another W1914 reconnect sweep.
- If W2178 cannot be made stable, rebuild the pre-W1880 route state rather than reusing one-frame pre-loss W2939/W2945 states.

## 2026-06-12 Contra Japan W2178 Lowfall Geometry Diagnostic

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-w2178-lowfall-geometry-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Inherited connector: W1880-W1948 `pulse_jump_right_fire` p8/w2 from `jp-s1-w1753-w1914-weapon16-reconnect-rejected-20260612`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-w2178-lowfall-geometry-20260612.summary.json`.

Accepted facts:

- The W2178 death is a lowfall/grounded contact with a non-fixed object behind and below the player: at frame 6182 the object is around `dx=-24, dy=3`, then death occurs at W2179/Y234 as it crosses to `dy=-2`.
- The old route input before tracing was `up+right+B`; the forced overlay batch confirmed the jump guard can apply because the pre-loss input becomes `A+Right+B`.
- Twelve candidates tested W2148-W2196 jump-right-fire, jump-right, early jump, dense p4/p6/p8 pulse jump, pulse up-jump, right/right-fire, right-duck-fire, and staged right-fire then jump.
- All candidates died at the same W2179/Y234 contact and none exceeded the prior local W2178 connector or the official W3208 no-death ceiling.

Rejected facts:

- W2160-W2196 jump-only and right-force geometry is rejected as a standalone repair.
- The failure is not an overlay guard mismatch; input changed as intended but the collision still resolves before the jump can escape.
- Do not repeat late lowfall A/right/jump pulse variants from the same W1753 connector.

Next weapon16 work:

- Rebuild before W2148 so the object phase at W2178 changes before the player reaches Y229/Y234.
- Prefer earlier object-clear or spacing candidates over another local jump action at the death frame.
- If earlier rebuild cannot alter the object phase, return to a different weapon16 saved-state branch rather than continuing late W2178 geometry.

## 2026-06-12 Contra Japan W1948 Phase-Shaping Diagnostic

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1753-w1948-phase-shaping-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1753-weapon16-20260612.json`.
- Inherited connector: W1880-W1948 `pulse_jump_right_fire` p8/w2 from `jp-s1-w1753-w1914-weapon16-reconnect-rejected-20260612`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1753-w1948-phase-shaping-20260612.summary.json`.

Accepted facts:

- Twelve candidates tested W1948-W2160 neutral fire, right fire, right-up fire, duck fire, right-duck fire, p3/w1 and p5/w2 pulse right fire, p10/w2 pulse jump-right-fire, p10/w3 pulse up-jump-right, and staged left/neutral/right fire into jump-right-fire.
- No candidate cleared, stayed deathless beyond W2178, produced a local connector, or exceeded the official W3208 no-death ceiling.
- The best local result was W1948-W2148 `pulse_jump_right_fire` p10/w2, which reached only W2024 before death at W2025/Y236 with weapon16 still present.
- Neutral/duck phase-shift variants died immediately around W1948/Y164, while forward fire variants consistently died around W2016/Y236 or W2025/Y236.

Rejected facts:

- W1948-W2160 direct phase shaping is rejected as a standalone repair for the W1753-derived weapon16 branch.
- This batch regresses before the previously observed W2178 connector, so it is not useful even as local connector evidence.
- Do not spend another batch on W1948+ neutral/right/up/duck/pulse overlays unless the W1880 entry state changes first.

Cross-strategy application:

- `survival-v0`: keep official best at W3208; do not promote any W1948 phase-shaping fragment.
- `combat-v0` and `loot-v0`: do not inherit these W1948 actions, because they reduce survival progress before creating any weapon or fixed-target advantage.
- `guard-v0`: treat W1948+ direct action overrides as unsafe guard behavior for this branch.
- `speedrun-v0`: ignore this branch until the survival route can clear, because it loses time and dies before the boss-wall route.

Next weapon16 work:

- If continuing the W1753-derived weapon16 branch, move the search before W1880 so the connector enters W1948 with different object/enemy phase.
- Otherwise, prioritize the later W2764/W3208 boss-wall route and seek a way to enter it with better weapon or fixed-target HP state.
- Keep W1948 phase-shaping as rejected evidence only; it is not a candidate fragment.

## 2026-06-12 Contra Japan W2960 Entry-Shape Diagnostic

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2764-w2960-entryshape-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-w2960-entryshape-20260612.summary.json`.
- Diagnostic mode: forced W2960-W3100 entry-shaping before the boss-wall station.

Accepted facts:

- Twelve candidates tested right-up, up, neutral, right, duck, right-duck, jump-right-fire, p8/w2 and p12/w3 pulse jump, p5/w2 pulse right fire, and two left pre-retreat plus right-up re-entry variants.
- No candidate cleared, stayed deathless beyond W3208, or improved the official Stage 1 ceiling.
- The best local result was W2960-W3100 `pulse_jump_right_fire` p12/w3: it reached W3206 before losing active at W3207/Y119.
- Earlier right/right-up/right-duck entry variants died around W3069/W3070, while up/neutral/duck and left pre-retreat variants regressed to W2960.

Rejected facts:

- W2960-W3100 default-weapon forced entry shaping is rejected as a standalone boss-wall repair from the W2764 anchor.
- Do not repeat W2960-W3100 single-action right/up/duck/fire sweeps unless the route before W2764 changes first.
- The near-tie W3206 p12/w3 result is still rejected because it carries death evidence and does not exceed the official W3208 no-death ledger ceiling.

Next boss-wall work:

- Change the route before W2764 or preserve weapon16 into boss-wall instead of spending another batch on default-weapon entry actions.
- If an earlier branch reaches W2960+ with weapon16 or better fixed-target HP state, validate it through the boss-wall phase instead of comparing only forced overlays.
- Keep W2764 as a useful reconstruction anchor for regression checks, not as the only source for future clear attempts.

## 2026-06-12 Contra Japan External Fixed-Target Sequence Transfer

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w2764-external-fixed-target-sequence-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w2764-platform-before-late-jump-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w2764-external-fixed-target-sequence-20260612.summary.json`.
- Source evidence: external FCEUX fragments `stage1_rotating_gun_x390_y24_fixed_target_destroyed`, `stage1_plated_door_x404_y22_fixed_target_destroyed`, and speed `stage1-speed-boss-bodyline-x128-reset-projectile-7000-20260611`.

Accepted facts:

- The external FCEUX package is useful as proposal evidence, but its fixed-target action windows do not directly transfer to the browser/jsnes W2764 anchor.
- Twelve forced jsnes overlays translated the external rotating-gun/plated-door sequence into W2880-W3072 duck-fire, right-duck-fire, right-up-fire, bodyline x128 clamp, late left-dodge, and precontact pulse-jump variants.
- No candidate cleared Stage 1, exceeded W3208 with zero deaths, or produced a promotable fixed/core HP state.
- The best candidate was the late-shift duck/right-duck/right-up sequence. It reproduced W3208 only with death, losing near W3195/Y151 while fixed durable HP remained.
- `leftdodge-then-rup` stayed alive but stalled at W3009, so it is rejection evidence rather than local progress.

Rejected facts:

- Do not directly copy the external FCEUX preferred action windows into jsnes as fixed WorldX overlays from W2764.
- Do not promote bodyline x128 clamp experiments from this batch; the best clamp died before W3208 and later recovered only after loss.
- Do not spend another batch on W2880-W3072 duck/right-duck/right-up sequence shifts unless the entry state, weapon state, or boss-wall phase ownership changes first.

Cross-strategy application:

- `survival-v0`: official best remains W3208; external boss fixed-target fragments remain proposal evidence only.
- `combat-v0`: fixed-target destruction order is still strategically useful, but this exact W2764 transfer is not safe enough to inherit.
- `speedrun-v0`: external speed bodyline x128 is not accepted for browser/jsnes until a zero-death exact-ROM replay reproduces it.
- `loot-v0` and `guard-v0`: do not inherit the clamp or left-dodge actions because they either die, stall, or depend on a different runtime phase.

Next boss-wall work:

- Stop translating external FCEUX boss windows as raw WorldX action overlays from W2764.
- Prefer extracting earlier state differences from the external successful route: weapon, player Y, player X, target HP, and projectile/body phase before W2764.
- A future transfer attempt should first prove that jsnes can enter W2880+ with a comparable state; only then retest fixed-target order.

## 2026-06-12 Contra Japan W1830 External Red-Turret Transfer

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w1830-external-redturret-transfer-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w1830-weapon16-precontact-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w1830-external-redturret-transfer-20260612.summary.json`.
- Source evidence: external FCEUX fragment `stage1_red_turret_x274_y8_fixed_target_destroyed`.

Accepted facts:

- The cross-training checkpoint rule was applied: one bounded 12-candidate batch, one start state, one hypothesis, and explicit accept/reject criteria before promotion.
- The tested hypothesis was that the external red-turret fixed-target action sequence might change the W2178 lowfall/body phase after the current W1830 weapon16 connector.
- Twelve jsnes candidates translated the fragment's R+A+B/R+U+B/R+B style sequence into W1952-W2069 forced overlays while preserving the W1830 close-body pulse-right-fire connector.
- No candidate cleared, reached boss-wall validation, exceeded the official W3208 no-death ceiling, or improved the current local W2178 branch.
- Best no-death progress was W2014 with `weapon = 16`; fixed HP was still present at the best snapshot.

Rejected facts:

- Direct external red-turret sequence transfer from the current W1830 weapon16 state is rejected.
- The best variants died around W2015/Y228, while pre-fire/up/duck variants often died earlier around W1934 or W1982.
- Recovered-after-loss progress from `pre-rightfire-then-seq` and `duckfire-then-rup` is invalid for zero-death training.
- This batch regresses below the W2178 local connector and far below the W3208 official ceiling.

Cross-strategy application:

- `survival-v0`: keep official best at W3208; do not promote this red-turret transfer.
- `combat-v0`: the fixed-target destruction concept remains useful, but this exact W1830 jsnes transfer is unsafe.
- `loot-v0`: do not inherit this sequence as a weapon/reward route, because it creates earlier deaths before any validated reward advantage.
- `guard-v0`: treat this transfer as unsafe guard behavior from the current W1830 state.
- `speedrun-v0`: ignore this route class; it regresses progress and adds no clear-time evidence.

Next weapon16 work:

- Do not repeat W1952-W2069 red-turret sequence overlays from `jp-stage1-w1830-weapon16-precontact-20260612.json`.
- If using this external fragment again, first change the pre-W1830 route state and prove the branch survives past W2178 with zero deaths.
- Prefer extracting state differences from the external clear route before W1830, not just copying the fixed-target action window.

## 2026-06-12 Contra Japan W674 Entry-Phase Rebuild

Runtime scope:

- Strategy: `survival-v0`, 1P, `contra-j-good`.
- Formal ledger run: `jp-s1-w674-entryphase-rebuild-rejected-20260612`.
- Start state: `data/training/contra/runtime_runs/contra-j-good/states/jp-stage1-w674-weapon16-predeath-20260612.json`.
- Batch report: `data/training/contra/runtime_runs/contra-j-good/segment-search-reports/jp-s1-w674-entryphase-rebuild-20260612.summary.json`.
- Baseline fragment preserved: W674-W725 `left_jump_fire`, the only previously accepted weapon16 escape from this saved state.

Accepted facts:

- The batch tested the next earlier boundary after W1210/W1450/W1830 local repair failed: keep the W674 escape, then change W760-W1160 bridge/entry phase before the W1210/W1830 weapon16 connectors.
- Twelve candidates varied W760-W1160 right-fire, right-up-fire, neutral fire, pulse-right-fire, left-delay recovery, jump-right-fire, pulse-jump, late duck-fire, and dense fire pulse patterns.
- No candidate cleared, reached boss-wall validation, exceeded the official W3208 no-death ceiling, or exceeded the W2178 local weapon16 branch baseline.
- The best no-death result was `jp-s1-w674-entryphase-rebuild-20260612-rightfire-760-930`, reaching W2026/screen 7 with `weapon = 16` before loss around W2023/Y156.
- Zero-death active or stalled variants (`pulseright-p5-760-930`, `rightup-930-1160`, `neutral-760-930`, `duckfire-930-1080-rightfire-1080-1160`) ended below W1500 and are not useful local connectors.

Rejected facts:

- W760-W1160 bridge/entry phase overlays from the current W674 predeath state are rejected.
- The old W674 escape plus W1160/W1440/W1830 connector chain regressed to W1717/W1702 and did not reproduce the earlier W2178 local branch under the longer 5200-frame probe.
- Right-fire/right-up-fire W760-W930 improved over the baseline-chain candidate but still died before W2178, so it is not accepted even as local connector evidence.
- Post-loss max progress such as W2726 is ignored for zero-death training.

Cross-strategy application:

- `survival-v0`: keep official best at W3208; W674 entry-phase rebuild does not advance the mother route.
- `combat-v0`: do not inherit W760-W930 right-fire/right-up-fire as a combat fixed-target route, because it dies before reconnecting.
- `loot-v0`: do not reuse this branch for weapon/reward collection until the W674 pickup state itself changes.
- `guard-v0`: do not use the left-delay or duck-fire variants; they either die early or stall below W1500.
- `speedrun-v0`: ignore this branch; it regresses clear progress and adds no speed evidence.

Next weapon16 work:

- Stop spending batches on W760-W1160 phase overlays from the current W674 state.
- The next useful weapon16 search must rebuild before W674, especially the earlier W300-W390 pickup route that creates the W674 weapon16 state.
- A future W674 attempt should first prove the new W674 snapshot differs in enemy/object/bullet phase before replaying W1210/W1830 connectors.
