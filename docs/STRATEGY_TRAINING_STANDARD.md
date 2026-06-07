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
- `Modify Strategy`: open or generate a StrategyFragment draft.
- `Archive Strategy`: save trace evidence, fragment proposal, or strategy-pack update.
- `Package Strategy`: create a distributable Strategy Pack export from selected validated or candidate artifacts.
- `Validate Replay`: replay or run validation against the chosen baseline.
- `Export`: export raw trace data.
- `Clear`: clear current capture buffer.

Buttons must not imply that training is complete. They trigger steps in a controlled training workflow.

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

## 9. Optimization Levels

Training artifacts should declare their source level:

- `Level 0 Manual`: written or edited by a human.
- `Level 1 Automated`: generated by local trace comparison, TAS splitting, or deterministic patch tools.
- `Level 2 Augmented`: reviewed or proposed with AI assistance.

Level 2 output must remain a proposal until it is converted into schema-valid data and verified by runtime evidence.

This keeps training efficient while preventing unverified suggestions from entering playable strategy packs.

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
