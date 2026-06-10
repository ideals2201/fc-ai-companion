# FC AI Strategy Training Standard Operating Manual

Version: 1.0.0

Status: active project standard

## 1. Position

This document is the standard operating manual for training operation strategies. It defines how strategies are trained, modified, archived, and validated.

It works with:

- `docs/STRATEGY_PROTOCOL_CORE.md`: runtime protocol and safety rules.
- `docs/STRATEGY_PACK_STANDARD.md`: distributable package rules.
- `strategy-packs/`: actual game strategy packages.
- `data/tas/`: raw TAS research files.
- `data/training/`: training-base artifacts.

Training is not the same as neural-network training by default. Current project training means: select a baseline, capture real traces, compare behavior, create or modify StrategyFragments, archive evidence, and validate in runtime.

External reference alignment:

- Gym Retro style integrations separate starting state, reward function, done condition, and memory variables. This project follows the same separation through GameProfile, TrainingScenario, Condition Registry, and ValidationReport.
- Stable-Retro style replay files prove that a compact starting state plus button sequence can be useful as training data. In this project, replay or movie input becomes trace evidence and baseline material, not a live controller.
- FCEUX `.fm2` movies preserve ROM checksum and frame-by-frame input logs. TAS-derived training must keep those sync anchors and must not align only by visible screen frame.
- FCEUX LuaBot style segmented attempts and rollback are the preferred local automation model for narrow patch search. The project should optimize one stage window at a time instead of brute-forcing a full stage.
- DAgger and DQfD style demonstration learning are used as engineering guidance: demonstrations speed up development, but AI-induced failure states must be collected and corrected before a strategy can be trusted.

## 2. Training Sources

Allowed training sources:

- Human demonstration trace.
- AI run trace.
- Human + AI hybrid trace.
- Dual-AI trace.
- TAS-derived training base.
- TAS `side-baselines.json`.
- Known failure trace.
- Local automated patch suggestion.
- AI-augmented analysis suggestion.

Training sources are inputs, not approvals. A TAS movie, human run, or AI run can create a baseline or candidate, but it cannot promote a StrategyFragment by itself.

The standard data flow is:

```text
training source -> observation/action trace -> baseline -> candidate StrategyFragment -> validation replay -> StrategyPack promotion
```

This mirrors mature retro-game training practice: replay files provide exact input demonstrations, RAM variables provide compact state observations, and scenario rules define progress, reward-like scoring, and terminal conditions. The project must keep these as separate layers so a good-looking replay cannot bypass runtime validation.

Movie or replay source rules:

- Record the source format, such as `fm2`, `bk2`, browser trace, or human capture.
- Record `romChecksum`, emulator/runtime identity, movie framecount, and input row index when available.
- Record the initial state type: power-on, reset, savestate, runtime checkpoint, or active-game entry point.
- Record per-side input separately. A two-player movie must be split into side-owned baselines before it can train 1P or 2P strategy behavior.
- Use RAM state as a validation checksum, not as the only timeline anchor. If movie framecount and RAM controller state disagree by one or more frames, keep both values and mark the offset.
- Treat missing startup frames as an Entry Point problem. Define `Init Phase` and `Active Phase` explicitly instead of guessing from screen visuals.

Every source must record:

- game profile
- ROMProfile
- stage id or scene id
- strategy type
- side ownership, when applicable
- source type
- trace window or frame window
- evidence quality

Source-specific requirements:

- Human demonstration: record controller input, structured RAM state, active side, and whether the run was manual, mixed, or assisted.
- AI run: record selected StrategyPack, strategy key, active fragments, Safety Override decisions, loop-exit state, and failure window.
- TAS-derived base: record movie file identity, ROM checksum, emulator timing metadata, movie framecount, input row index, player side split, and entry point.
- Known failure: record the pre-failure window, failure frame, post-failure state, nearby entities, input summary, and the fragment or baseline being tested.
- Automated or AI-augmented suggestion: record the source evidence ids and keep the suggestion in candidate status until validation replay passes.

## 2.1 Demonstration Learning Model

The project uses demonstration learning as an engineering workflow, not as a blind neural-network mandate.

Recommended progression:

1. Capture an expert trace from human play, TAS, or a validated strategy.
2. Convert it into `ObservationActionTrace`: structured RAM observation plus semantic input per frame or compact window.
3. Extract stable windows into baselines, such as bridge jump timing, fixed-threat clearing, reward pickup, boss entry, or teammate spacing.
4. Let AI run from the candidate baseline.
5. Archive failure windows where the AI reaches states missing from the demonstration.
6. Patch only the failing window, then validate again.

This is the project equivalent of DAgger-style dataset aggregation: do not expect one demonstration to cover all states. The AI must run, fail, collect those off-route states, and receive targeted correction.

DAgger-style correction rule:

- Do not copy a full human or TAS run into a controller script.
- Let the current strategy run until it reaches a failure, drift, stuck loop, or low-quality decision window.
- Capture a short correction window from a human, TAS baseline, validated strategy, or local patch search.
- Add the corrected window to the aggregated trace set with its preconditions and failure context.
- Re-run the strategy from before the failure window and verify that the correction survives the same scenario.

DQfD-style demonstration rule:

- Demonstration traces may seed a candidate baseline before automated exploration.
- Demonstration actions should be stored with semantic intents and raw inputs.
- A demonstration-derived candidate is useful if it improves initial behavior, but promotion still requires runtime validation and counterexample checks.

## 2.2 Reward And Terminal Design

Training scenarios must avoid single-metric reward traps.

Bad reward design:

- score only
- kills only
- rightward movement only
- reward pickup only

Required validation goals must combine:

- survival / no death loops
- stage progression
- required blocker or fixed-target handling
- loop exit
- strategy-specific objective, such as speed, combat, loot, or guard
- terminal condition, such as clear, death, game over, desync, frame cap, or stuck loop

For strategy-specific scoring:

- `survival`: death prevention and stable progression outrank speed, kills, and loot.
- `speedrun`: progress speed matters, but Safety Override and required blockers still outrank raw movement.
- `combat`: enemy and fixed-target clearing are measured, but no-death and no-loop gates still apply.
- `loot`: rewards and weapons are measured, but pickup routes cannot override immediate survival.
- `guard`: teammate survival, spacing, and screen ownership are measured alongside personal survival.

Every game Strategy Pack should define these variables in its own `training-scenarios.json` or equivalent package file. The core training standard does not hardcode game-specific variables.

Reward-farming guard:

- A strategy that gains score, kills, or rewards while failing progression must be marked `reward-farming-risk`.
- A strategy that repeats an input loop while the progress metric is stalled must fail validation even if score increases.
- A strategy that clears optional enemies but misses required blockers, fixed targets, or stage transitions must remain `candidate`.
- A reward rule must be paired with a terminal or progress rule. No package may claim validation from a reward-only metric.

## 2.3 Segmented Trial, Rollback, And Patch Search

Local automated training should use segmented search.

Segment definition:

- A segment is a small game-specific progression window, such as a WorldX range, room id range, screen range, boss phase, or checkpoint-to-checkpoint interval.
- A segment has a declared entry condition, end condition, scoring function, tie-breaker, and failure condition.
- A segment may reference known fixed targets, reward objects, pits, enemy spawn windows, or teammate spacing rules through the Condition Registry.

Attempt rules:

- Each attempt starts from the segment entry state or a verified checkpoint.
- The search space must be constrained by semantic intents and strategy type. Do not brute-force all raw buttons across long windows.
- Keep the best attempt only if it improves the declared score without violating Safety Override, Negative Constraints, ROMProfile matching, or desync checks.
- If every attempt reaches a dead end, roll back to the last validated segment and record a known failure instead of forcing a bad patch.

Patch output rules:

- Segment search outputs a candidate StrategyFragment, never a promoted strategy.
- The candidate must include `sourceTraceIds`, `segmentId`, `scoreBefore`, `scoreAfter`, `fallback_fragment_id`, and a validation plan.
- A candidate generated by automated search must be marked `Level 1 Automated`.
- If an AI model or external analysis proposes the patch, the artifact must be marked `Level 2 Augmented` until converted into schema-valid data and validated.

## 3. Training Workflow Buttons

The cockpit training window should expose these actions:

- `Select Base`: choose a baseline strategy or TAS-derived side baseline.
- `Start Capture`: begin recording runtime input and RAM state.
- `Stop`: stop capture.
- `Start Run`: start an auto-patch or AI-run training attempt.
- `Stop Run`: stop the current training attempt and close the run window.
- `Modify Strategy`: open or generate a StrategyFragment draft.
- `Archive Strategy`: save trace evidence, fragment proposal, or strategy-pack update.
- `Package Strategy`: create a distributable Strategy Pack export from selected validated or candidate artifacts.
- `Validate Replay`: replay or run validation against the chosen baseline.
- `Export`: export raw trace data.
- `Clear`: clear current capture buffer.

Buttons must not imply that training is complete. They trigger steps in a controlled training workflow.

Side-owned controls must live in each side controller bay. 1P and 2P must expose the same local actions: `Select Base`, `Start Capture`, `Stop`, `Modify Strategy`, `Archive Strategy`, `Validate Replay`, `Export`, and `Clear`. These actions must carry explicit side ownership so the archived evidence and generated fragments know whether they belong to 1P, 2P, or a shared run.

When 1P and 2P train in the same synchronized experiment, both sides must use one shared training method. The strategy category, baseline, resource pack, ROMProfile, side scope, and shared training method are configured before the training session starts. After the session starts, this configuration is locked until the session stops. This prevents one TraceEvidence window from mixing incompatible methods, packs, or strategy targets.

Auto-patch runs must arm trace capture before the first runtime frame. `Start Run` must start the emulator run and trace capture together; `Stop Run` must stop the run and close trace capture together, recording the stop reason when available. A run can end by manual stop, death, stage clear, frame cap, stuck loop, or desync, but it must never create a patch candidate without synchronized trace evidence.

Operation strategies begin only after the cockpit has reached a RAM-confirmed game screen. Strategy writes are allowed only when `runtimeStatus === "running"` and `gameplayActive === true`. A `paused`, stopped, loading, menu, attract-mode, or desynced runtime is a no-write state: the cockpit must clear AI input and leave strategy output idle.

Startup is owned by the browser cockpit, not by strategy packages. START, SELECT, one-player/two-player menu selection, pause, continue, and stop-run behavior may use a runtime `system` input source. These startup controls must not be encoded as StrategyFragment actions or strategy-pack route steps.

The Operation Strategy Control panel is reserved for cross-side work: active training scenario, current package identity, TAS baseline matching, package side scope, one-click package export, pair validation, resource-pack routing, and global evidence status. It must not be the only place to select or modify a side-owned strategy.

The Operation Strategy Control panel should sit below the TAS viewing panel. This keeps the workflow order clear: observe TAS or another baseline first, then choose resource packs, choose the active Strategy Baseline, archive evidence, and validate replay.

When the selected AI strategy changes in the controller bay, that side's training panel must update its baseline label, candidate category, archive target, and primary action. A `speedrun` strategy trains fast windows; a `combat` strategy trains target-clear fragments; a `loot` strategy trains reward routes; a `guard` strategy trains follow and protection fragments; a `survival` strategy trains death-loop and safety fixes.

Each side training panel must show the selected Strategy Pack identity prominently: `pack name (strategy category)`. The old duplicate `Baseline Strategy` tile should not be shown under it. The baseline tile should be named `Strategy Baseline` and may point to a pack-owned strategy, a TAS-derived baseline, a human demonstration baseline, or a candidate fragment. Selection is side-owned, so 1P and 2P can use different baselines.

The Operation Strategy Control panel must expose two resource slots: `1P Resource Pack` and `2P Resource Pack`. When the user selects a 1P resource pack, 2P defaults to the same pack unless 2P has explicitly selected a different pack. After 2P overrides the pack, future 1P changes must not silently overwrite 2P. A visible `Sync 2P to 1P` action may restore shared selection.

The `Strategy Baseline` selector is not TAS-only. It may choose a pack-owned strategy, a TAS baseline, a human demonstration baseline, or a candidate fragment. The selected baseline must be shown per side and must be compatible with the selected resource pack and ROMProfile.

The Operation Strategy Control panel must display practical resource information: pack name, author, status, protocol version, ROMProfile compatibility, archive target, and whether 1P/2P are synced or independent. This information is part of player trust and emotional value; it should be visible, not buried in logs.

It should also display per-strategy battle results from the selected Strategy Pack when available. The minimum player-facing result fields are kills, fixed targets destroyed, rewards collected, and clear time. These values must come from `quality.strategyResults` or an equivalent validated result artifact. If the selected package only has candidate data, the UI must show `unverified` or the localized equivalent instead of a number.

The Operation Strategy Control panel is also the correct place for package-level save and version-management actions:

- Side-owned training panels choose baselines and edit strategy behavior.
- Operation Strategy Control selects the resource pack for 1P and 2P.
- Operation Strategy Control chooses export scope with independent `1P only` and `2P only` toggles. Selecting both sides produces a combined export internally; the UI does not need a separate `1P+2P` button.
- `Save Strategy` must remain disabled until validation replay has completed for the selected scope.
- `Version History / Rollback` may be visible, but rollback can only execute against a revision that has a valid hash and restorable snapshot path.
- Draft revisions may be saved many times. Published or official revisions must be immutable snapshots; later changes create new revisions rather than overwriting old ones.

`Package Strategy` must expose side scope:

- `1P only`: export only 1P fragments, evidence, side baselines, and validation reports.
- `2P only`: export only 2P fragments, evidence, side baselines, and validation reports.
- `1P+2P`: export both sides and include the cooperation contract.

The default side scope is the current training context. If the user is training 1P, default to `1P only`. If the user is training 2P, default to `2P only`. If the active workflow is a verified two-player TAS split, human-AI validation, or dual-AI validation and both sides have usable evidence, default to `1P+2P`.

The UI must warn before packaging unverified side data. A one-click package must never silently mix a validated 1P side with an unverified 2P side and present it as a complete two-player pack.

## 4. Baseline Selection

A baseline can be:

- a default project strategy such as `survival-v0`
- a player-made strategy
- a Strategy Pack fragment
- a TAS-derived candidate fragment
- a TAS side-owned baseline from `side-baselines.json`

Baseline selection must show:

- selected pack name
- strategy type
- side, such as `1P`, `2P`, or shared
- ROMProfile compatibility
- validation status

If no validated baseline exists, the user may start from a candidate baseline, but the UI must show that it still needs validation.

## 5. Side-Owned Training

1P and 2P can train independently.

Side-owned training must record:

- selected side
- selected pack
- selected strategy type
- selected baseline window
- current input ownership
- whether the game is in one-player or two-player mode

A 2P training baseline should not be activated in a one-player game unless the workflow is explicitly preparing a two-player entry sequence.

When using a two-player TAS, split it into 1P and 2P baselines before training. Do not treat the combined TAS as one controller script.

## 6. Archive Rules

Archiving means preserving evidence or a candidate change. It does not mean the strategy is approved.

Archive targets:

- `trace-evidence/`
- `known-failures.md`
- candidate StrategyFragment draft
- `data/training/<game>/`
- validation report

Archived data should include:

- timestamp
- source type
- ROMProfile
- stage id
- side
- frame window or progression window
- input summary
- RAM state summary
- failure or success outcome

## 7. Promotion Rules

A training artifact can be promoted only after:

- it matches the intended ROMProfile
- it follows the StrategyFragment schema
- it uses declared strategy types
- it references known Condition Registry fields
- it uses semantic intents, not raw controller buttons only
- Safety Override is applied before execution
- a real runtime trace proves the behavior
- known counterexamples are checked

TAS-derived data must first become a candidate fragment. It cannot directly become a live controller.

## 8. Validation Rules

Validation must be mode-specific:

- `single-ai`
- `human-ai`
- `dual-ai`

Passing one mode does not prove another.

Validation evidence should include:

- real runtime trace
- final state
- death count
- progress metric
- fixed-target handling
- reward or weapon outcome when relevant
- loop-exit behavior
- Safety Override decisions

For current Contra work, the priority validation target is stable survival progress without death loops. Perfect clear is a later validation level and must be proven by full-stage evidence.

## 8.1 Environment-Aware Validation

Environment-Aware Validation checks whether a training artifact still works when deterministic context changes.

It must record:

- ROMProfile and checksum.
- emulator or browser runtime version when available.
- TAS movie frame and input row when TAS-derived.
- RNG state, seed range, or unknown status.
- timing window and input sampling delay.
- shadow-memory desync status.

Rules:

- If RNG is known and does not match the expected deterministic context, the run must be marked `desynced` or routed through an allowed rollback workflow.
- If SaveState rollback is used to restore deterministic context, that rollback must be recorded as evidence, not hidden.
- If deterministic context is unknown, the artifact can be trained, but it cannot claim high reproducibility.
- Validation must check Negative Constraints before promoting a candidate fragment.

## 8.2 Provenance Graph

Training evidence must preserve a Provenance Graph, not only a flat metadata note.

Each promoted StrategyFragment should record:

- fragment hash.
- parent hash.
- parent fragment id.
- source trace ids.
- TAS source ids, when applicable.
- human demonstration ids, when applicable.
- validation report ids.
- known failure ids.

This lets the project roll back a bad update and compare strategy versions without relying on manual backups.

## 9. Optimization Levels

Training artifacts should declare their source level:

- `Level 0 Manual`: written or edited by a human.
- `Level 1 Automated`: generated by local trace comparison, TAS splitting, or deterministic patch tools.
- `Level 2 Augmented`: reviewed or proposed with AI assistance.

Level 2 output must remain a proposal until it is converted into schema-valid data and verified by runtime evidence.

This keeps training efficient while preventing unverified suggestions from entering playable strategy packs.

## 9.1 Automated Training Asset Checklist

Packaging or promotion must run an automated checklist:

| Level | Name | Required Checks | Allowed Use |
| --- | --- | --- | --- |
| Level 0 | Basic | Schema format check only; no runtime guarantee. | Personal development cache only. |
| Level 1 | Runnable | Schema valid, ROMProfile matched, shadow validation completed, no desync record, Negative Constraints passed. | Test baseline library and internal candidate packs. |
| Level 2 | Expert | Level 1 plus human expert review, Provenance Graph complete, perturbation evidence, and 10 or more consecutive successful validation runs for the declared scenario. | Public sharing candidate or verified community package. |

An artifact can move down as well as up. If a later run finds desync, death loop, invalid deterministic context, or broken Negative Constraints, the package status must be downgraded or blocked.

Engineering directive:

```text
Treat strategies as code, and treat TAS traces as test cases.
```

This means:

- Strategy changes need versioning, review, validation, and rollback.
- TAS traces are baseline tests and knowledge sources, not live controllers.
- A green schema check is not enough to prove gameplay quality.
- A public package requires evidence that survives deterministic-context and negative-constraint checks.

## 10. Training Scenario Files

Training scenarios define what a training run is trying to prove. They belong to each game because variable meanings, reward-like scoring, and terminal conditions differ by game, ROM, mode, and stage.

The standard scenario file is:

```text
strategy-packs/<game-profile-id>/research/training-scenarios.json
```

Allowed references:

- `variableRefs`: Condition Registry variables used by this scenario.
- `rewardRules`: scoring rules used to compare runs or patches.
- `terminalConditions`: success conditions that stop the run.
- `failureConditions`: failure conditions that stop the run.
- `entryPoint`: boot, state, TAS window, human trace window, or runtime checkpoint.
- `syncAnchors`: ROMProfile, emulator version, movie frame, input row, RNG state, or state refs used to align replay and trace data.

Rules:

- Variables must come from the current GameProfile's Condition Registry.
- Reward rules are training scores, not universal product goals.
- Terminal conditions must be game-specific and explicit.
- Failure conditions must include death, stuck loop, unsupported ROM, and state desync when those can be detected.
- A scenario can be used for `single-ai`, `human-ai`, or `dual-ai`, but each mode must be validated separately.
- TAS-derived scenarios must preserve ROM checksum, emulator/movie metadata, and frame/input-row alignment when available.

This matches the external pattern used by mature emulator-training systems: keep variable maps and scenario goals in the game integration, while the platform only executes the declared contract.

## 11. External Training Pattern Mapping

External emulator-training projects are reference models, not runtime authorities. The project should borrow their durable engineering patterns while keeping the browser cockpit, Strategy Pack format, and FC/NES companion workflow as the local source of truth.

The required mapping is:

| External Pattern | Local System Meaning | Required Local Artifact |
| --- | --- | --- |
| Integration-style memory variables | Game-specific RAM facts are declared outside the strategy logic. | `GameProfile`, `condition-registry.json`, `ram-map.json` |
| Scenario reward and done rules | A training run must define progress, scoring, success, and failure separately. | `training-scenarios.json`, `ValidationReport` |
| Replay movie input logs | A compact start state plus per-frame inputs can seed demonstrations. | `TraceEvidence`, TAS side baselines, human demonstration traces |
| Movie header sync anchors | ROM checksum, emulator/runtime, and input timeline must be preserved. | `ROMProfile`, TAS registry, entry-point metadata |
| DAgger-style failure aggregation | AI failures after imitation are not noise; they are the next training dataset. | known failures, correction windows, candidate fragments |
| Reward-trap prevention | Score, kills, or item pickup cannot prove a strategy if progress stalls. | stuck-loop gates, progress metrics, negative constraints |
| Frame-advance emulator control | Training must advance one deterministic frame after input is selected. | headless runtime smoke, browser runtime gate, frame-indexed traces |

Implementation rules:

- Do not import an external framework as the product architecture unless it improves the local standard directly.
- Do not train from pixels when the emulator RAM state and controller state are available.
- Do not store raw button streams as final strategy behavior. Convert them into semantic intents, preconditions, and validation-backed fragments.
- Do not treat a TAS, human run, or AI run as complete proof. It is a source artifact until it survives local validation.
- Do not use one full-run reward score to approve a fragment. Approval must be tied to the declared segment, strategy type, and failure conditions.

The preferred training loop is:

```text
source trace -> side-owned baseline -> candidate fragment -> segmented validation -> failure aggregation -> revision or promotion
```

This loop allows TAS, human demonstrations, AI runs, and automated patch search to share one pipeline without pretending they are the same kind of evidence.

## 12. Training Quality Gates

A candidate is not promotable until all gates pass.

The minimum gates are:

| Gate | What It Blocks | Required Evidence |
| --- | --- | --- |
| Schema Gate | malformed package data and unsupported fields | schema validation output |
| ROM Gate | wrong game version or mapper-dependent desync | ROMProfile hash match |
| Entry Gate | startup animation, menu, or wrong checkpoint alignment | entry-point metadata and active-game RAM proof |
| Sync Gate | TAS/movie input drift and controller-state offset errors | movie framecount, input row, RAM checksum sample |
| Safety Gate | cliffs, death loops, illegal states, and Negative Constraints | Safety Override trace and failure-condition checks |
| Progress Gate | reward farming, kill farming, and stuck loops | progress metric plus stuck-loop detector |
| Strategy Gate | a fragment that works for the wrong strategy type | declared strategy taxonomy and scenario score |
| Side Gate | mixed 1P/2P ownership or wrong cooperation assumptions | side-owned trace ids and side scope |
| Perturbation Gate | brittle fragments that only work on one exact frame | small timing or state perturbation report when required |
| Regression Gate | a new candidate that breaks the current validated baseline | headless smoke or validation replay comparison |

Gate behavior:

- If a gate fails, the artifact remains `candidate` or is archived as `rejected`.
- If a gate is not applicable, the validation report must say why.
- If a gate is missing evidence, the artifact is incomplete, not passed.
- If a candidate improves one metric but fails survival, sync, or progress, it must not be promoted.
- If a candidate is rejected, keep its trace and reason so future training does not repeat the same failed idea.

Quality labels:

- `draft`: local work in progress; may be incomplete.
- `candidate`: schema-valid and testable, but not proven.
- `validated`: passed the declared scenario and gates for one mode.
- `verified`: passed repeated runs, perturbation checks, and applicable side/cooperation modes.
- `rejected`: tested and blocked by evidence.

The UI must show these labels plainly. A player should be able to tell whether a strategy is an experiment, a working local candidate, or a proven package before using it in live play.

## 13. External Source Register

Borrow patterns, not authority. External operation-training projects are source material for engineering design, but the local project standard remains the authority for runtime behavior, Strategy Pack format, safety gates, and promotion decisions.

Registered references:

| Source | Reference URL | Useful Pattern | Local Adoption |
| --- | --- | --- | --- |
| Gym Retro | https://retro.readthedocs.io/en/latest/ | Game integrations separate memory variables, scenario files, reward rules, done rules, and starting states. | Keep `GameProfile`, `condition-registry.json`, `training-scenarios.json`, and `ValidationReport` as separate artifacts. |
| Stable-Retro | https://stable-retro.farama.org/ | Replay files and starting states can seed demonstration datasets. | Treat replay or movie input as `TraceEvidence`, TAS side baselines, or human demonstration traces, not as direct live strategy control. |
| FCEUX FM2 | https://fceux.com/web/FM2.html | `.fm2` movie files preserve ROM checksum and frame-indexed controller input. | Preserve `romChecksum`, movie framecount, input row index, and entry-point metadata for TAS-derived training. |
| FCEUX Lua | https://fceux.com/web/help/LuaScripting.html | Lua can read memory, write inputs, draw debug overlays, and drive frame-advance experiments. | Use local or emulator-side automation for segmented attempts, rollback, trace capture, and failure-window diagnosis. |
| DAgger | https://www.cs.cmu.edu/~sross1/publications/Ross-AIStats11-NoRegret.pdf | Demonstration-only policies drift into states the expert trace never covered; aggregate failures from the learned policy and correct them. | Treat AI failure windows as first-class training data and require targeted correction traces before promotion. |
| Gym Retro reward-farming notes | https://openai.com/index/gym-retro/ | Reward-only objectives can create exploit loops instead of useful play. | Validate progress, survival, loop exit, and strategy-specific objectives together; never promote by score, kills, or pickups alone. |

Adoption rules:

- A source reference can justify a standard pattern, but it cannot bypass local `TraceEvidence`, `ValidationReport`, ROMProfile matching, Safety Override, or Negative Constraints.
- External movie files, emulator logs, papers, forum notes, and repos must be copied into a package `source-register.md` with date, URL, target ROMProfile, and intended use before they influence a distributable Strategy Pack.
- If an external source assumes pixel input, neural-network training, or a different emulator timing model, translate only the useful contract into local RAM-state and frame-indexed evidence.
- If an external source provides a full route or TAS, split it into side-owned baselines and candidate windows before using it for 1P, 2P, human+AI, or dual-AI training.
- If the external source is not tied to the exact ROM checksum, mark it as research-only until a compatible ROMProfile and runtime validation prove it locally.
