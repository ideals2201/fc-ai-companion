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
