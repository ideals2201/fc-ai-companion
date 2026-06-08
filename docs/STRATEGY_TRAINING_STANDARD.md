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

Every source must record:

- game profile
- ROMProfile
- stage id or scene id
- strategy type
- side ownership, when applicable
- source type
- trace window or frame window
- evidence quality

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

## 9.1 训练资产自动化分级检查表

Packaging or promotion must run an automated checklist:

| Level | Name | Required Checks | Allowed Use |
| --- | --- | --- | --- |
| Level 0 | 初级 | Schema format check only; no runtime guarantee. | Personal development cache only. |
| Level 1 | 可运行 | Schema valid, ROMProfile matched, shadow validation completed, no desync record, Negative Constraints passed. | Test baseline library and internal candidate packs. |
| Level 2 | 专家级 | Level 1 plus human expert review, Provenance Graph complete, perturbation evidence, and 10 or more consecutive successful validation runs for the declared scenario. | Public sharing candidate or verified community package. |

An artifact can move down as well as up. If a later run finds desync, death loop, invalid deterministic context, or broken Negative Constraints, the package status must be downgraded or blocked.

Engineering directive:

```text
将策略视为代码，将 TAS 轨迹视为测试用例。
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
