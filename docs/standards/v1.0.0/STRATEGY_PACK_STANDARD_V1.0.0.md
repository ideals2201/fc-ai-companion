# FC AI Strategy Pack Standard

Version: 1.0.0

Status: active project standard

## 1. Position

This document defines how FC/NES AI operation strategy packs are packaged, distributed, selected, validated, and archived.

This is an output standard, not a training-method standard. A Strategy Pack author may use manual route design, TAS analysis, FCEUX Lua, browser RAM traces, Python tools, reinforcement learning, supervised learning, large-model analysis, or any other method. The method is acceptable as long as the delivered package follows this file, declares its source provenance, and passes the required validation gates.

It does not replace `docs/STRATEGY_PROTOCOL_CORE.md`. The core protocol defines runtime semantics, condition references, intent fusion, safety hierarchy, RNG metadata, and API contracts. This document defines the product form of a distributable Strategy Pack.

It also does not require `docs/STRATEGY_TRAINING_STANDARD.md`. That file describes this project's preferred internal training workflow. External experts can ignore that workflow when creating packages for this platform, provided their final Strategy Pack satisfies this standard.

A Strategy Pack is a data product. It can be produced by the project team, another developer, a player, a TAS-derived training pipeline, or a future automated optimizer. A pack must not include commercial ROM files.

## 1.1 External Expert System Generation Contract

This file is the single entry standard for any external expert system that wants to generate Strategy Packs compatible with this platform.

An external expert system does not need to know this project's internal UI, training workflow, source code, or conversation history. It only needs to produce a folder or `.zip` that satisfies this document.

The generated package must answer these questions through files, not through private explanation:

- What game is this package for?
- Which exact ROM versions does it support?
- Which player side or sides does it support?
- Which strategy categories are included?
- What actions, conditions, entities, RAM variables, and stages does it reference?
- Which fragments are callable by the runtime?
- Which validation evidence proves or limits the claims?
- Who created it, who modified it, and what version is this?
- What license and redistribution constraints apply?

The minimum acceptable output is:

```text
<strategy-pack-root>/
  manifest.json
  README.md
  game-profile.json
  rom-profiles/
    <rom-profile-id>.json
  research/
    condition-registry.json
    action-map.json
    entity-taxonomy.json
    ram-map.json
    strategy-types.json
  stages/
    <stage-id>/
      stage-plan.json
      fragments.json
      training-progress.json
      validation-report.md
      known-failures.md
      trace-evidence/
```

Optional but recommended output:

```text
<strategy-pack-root>/
  schemas/
    manifest.schema.json
    fragments.schema.json
    runtime-api.schema.json
  assets/
    preview.png
    avatar.png
  stages/<stage-id>/runtime-reports/
  stages/<stage-id>/candidate-configs/
```

The package is importable if the minimum files exist, the package does not include ROM files, and `manifest.json` passes the identity and compatibility rules below.

The package is selectable if its `gameProfileId`, `romProfileIds`, `strategyKeys`, and `sideScope` are compatible with the loaded game.

The package is callable if its stage fragments reference only declared conditions, actions, entities, and strategy types.

The package is validated only if the declared mode and stage have runtime evidence. If evidence is missing, the package can still be useful, but its status must remain `research` or `candidate`.

The package must include its data ledger. The standard does not care whether the ledger was produced by manual play, TAS conversion, local scripts, FCEUX Lua, reinforcement learning, large-model analysis, or another expert system. The standard only requires the final data to be present, honest, and machine-readable.

Minimum required data groups:

- identity data: `manifest.json`, author, revision, status, license, package version.
- ROM compatibility data: `rom-profiles/<rom-profile-id>.json`, checksums, mapper, region, runtime assumptions.
- game interpretation data: `game-profile.json`, `condition-registry.json`, `action-map.json`, `entity-taxonomy.json`, `ram-map.json`, `strategy-types.json`.
- strategy execution data: `stage-plan.json`, `fragments.json`, declared strategy categories, side scope, cooperation contract when applicable.
- training and progress data: `training-progress.json` for every stage, even when the stage is unstarted.
- battle result data: `quality.strategyResults` in `manifest.json`, plus stage-level metrics in `training-progress.json`.
- validation data: `validation-report.md`, `known-failures.md`, and trace evidence for any measured or validated claim.
- user-facing usage data: `README.md` with supported ROM, strategies, status, limits, and no-ROM redistribution notice.

Platform data usage:

- The package browser reads `manifest.json` for name, author, version, status, ROM compatibility, strategy categories, and battle summaries.
- The 1P/2P resource slots read `manifest.json` plus stage `training-progress.json` to show selected pack state and per-side readiness.
- The runtime reads `game-profile.json`, `rom-profiles/`, `condition-registry.json`, `action-map.json`, `entity-taxonomy.json`, `ram-map.json`, `stage-plan.json`, and `fragments.json`.
- The training panel reads `training-progress.json` to show run count, death count, elapsed human time, max progress, clear state, and per-strategy status.
- The Operation Strategy Control panel reads `quality.strategyResults` and stage summaries for kills, fixed targets, rewards, clear time, and completion status.
- The validator reads ROMProfile data, validation reports, known failures, and trace evidence.

External reference alignment:

- FCEUX `.fm2` movies store headers, ROM checksum, emulator settings, and a frame-by-frame input log. Strategy Packs that consume TAS-derived data must preserve these sync anchors.
- TAS movie format guidance emphasizes that headers must document settings that affect sync, including emulator version, ROM filename, ROM checksum, flags, and comments.
- Gym Retro integrations use memory variable maps plus scenario files for reward and done conditions. Strategy Packs should adopt the same idea for validation scenarios, even when the runtime is browser-first instead of Python-first.
- Behavior-tree systems use blackboard data and reusable nodes. In this project, `condition-registry.json` is the blackboard contract, and StrategyFragments should reference semantic conditions rather than hardcoded RAM addresses.

## 2. Required Package Identity

Every Strategy Pack must provide `manifest.json` as its entry file.

Required identity fields:

- `schemaVersion`
- `packId`
- `displayName.zh`
- `displayName.en`
- `author.displayName`
- `provenance.creator`
- `provenance.latestModifier`
- `provenance.revisions`
- `packVersion`
- `gameProfileId`
- `romProfileIds`
- `sideScope`
- `strategyKeys`
- `supportedModes`
- `status`
- `standards.strategyProtocol`
- `files`
- `quality.strategyResults`
- `license`

The `displayName` is player-facing. It should be visible in the training window to create ownership and emotional value, for example: `魂斗罗第一关策略包 V0 · 0.1.0 · candidate`.

`author.displayName` is the visible author name. Community and player-made packs must show this field in the training window and in exported package previews.

`provenance.creator` records who first created the pack. `provenance.latestModifier` records who last changed the pack. The Operation Strategy Control panel should show both fields because they answer different user questions: who made the original asset, and who touched the current version most recently.

`provenance.revisions[]` is the full modification chain. Every saved revision should record:

- `revisionId`
- `version`
- `modifiedBy.displayName`
- `modifiedAt`
- `summary`
- `changeType`
- `validationStatus`
- `hash`
- `parentHash`, when the revision is derived from an earlier revision
- `snapshotPath`, when the revision can be restored

The standard does not limit how many times a draft Strategy Pack can be modified. Limiting edit count would slow down training. The standard limits promotion quality instead:

- Draft revisions may be saved frequently.
- Candidate revisions must keep schema-valid files and clear provenance.
- Public, validated, or official revisions must be immutable snapshots. Later changes must create a new `packVersion` or `revisionId`; they must not overwrite the already distributed snapshot.

Rollback is snapshot-based, not author-based. The UI may show author and modifier names, but rollback can only target a revision that has a valid `hash`, compatible `ROMProfile`, and restorable `snapshotPath`. A revision that only contains text history is audit evidence, not a rollback target.

The training window may expose an editable `trainingWindowName`. Its default value is the localized `displayName`. If the user changes the name only for a training session, store it as a local training-session override. If the user exports it as a new product, write the confirmed name back into `manifest.json` as the new `displayName`.

Packs may declare an optional `identity.avatarAsset`. The avatar can be a preset, such as `blue-warrior`, or a package-local asset path under `assets/`. The avatarAsset represents strategy-pack identity and author flavor. It must not silently replace the actual 1P/2P role avatar unless the UI clearly marks that the role is using this pack persona.

The `packId` is machine-facing. It must stay stable across versions unless the package becomes a different product.

`quality.strategyResults` records player-facing battle results for each strategy key. It is not a marketing text field; it is validation metadata. The recommended minimum metrics are:

- `kills`
- `fixedTargetsDestroyed`
- `rewardsCollected`
- `clearTimeFrames`
- `clearTimeSeconds`
- `deaths`
- `maxProgress`
- `stageAttempts`
- `trainingTimeSeconds`

Each metric must carry both `value` and `status`. If a strategy has not been proven by trace evidence, set `value` to `null` and `status` to `unverified`. Do not invent kill counts, fixed-target destruction counts, reward counts, or clear time. Candidate packs may display these fields in the Operation Strategy Control panel, but they must visibly mark unverified data.

Example:

```json
{
  "quality": {
    "strategyResults": {
      "survival-v0": {
        "status": "candidate",
        "metrics": {
          "kills": { "value": null, "status": "unverified" },
          "fixedTargetsDestroyed": { "value": null, "status": "unverified" },
          "rewardsCollected": { "value": null, "status": "unverified" },
          "clearTimeFrames": { "value": null, "status": "unverified" },
          "clearTimeSeconds": { "value": null, "status": "unverified" },
          "deaths": { "value": null, "status": "unverified" },
          "maxProgress": { "value": null, "status": "unverified" },
          "stageAttempts": { "value": null, "status": "unverified" },
          "trainingTimeSeconds": { "value": null, "status": "unverified" }
        }
      }
    }
  }
}
```

Metric status values:

- `unverified`: data is unknown or only declared by the author.
- `candidate`: data comes from a trace or run but has not passed validation.
- `measured`: data was measured from a recorded run.
- `validated`: data passed the declared validation gate for the stage and mode.

Unknown values must use `null`. A numeric zero is allowed only when the system actually measured zero.

## 2.1 Required Training And Battle Data Ledger

Every stage directory must include `training-progress.json`. This is a data ledger, not a training-method prescription. It records what happened, how far the strategy got, and which claims are backed by evidence.

`training-progress.json` must exist even when no training has started. In that case, use `status: "unstarted"` and keep unknown metrics as `null`.

Stage coverage must be explicit. If a game has known stages, the package should declare each stage as one of:

- `supported`: callable fragments and at least candidate evidence exist.
- `training`: fragments exist, but validation is still in progress.
- `unstarted`: the package plans to cover this stage, but no useful evidence exists yet.
- `out-of-scope`: this package intentionally does not cover the stage.

This rule prevents missing files from being confused with failed training. A full-game package for an eight-stage game should therefore expose stage 1 through stage 8 in its coverage data, even if some stages are still `unstarted`.

Minimum structure:

```json
{
  "schemaVersion": "1.0.0",
  "stageId": "stage-1",
  "updatedAt": "2026-06-11T00:00:00+08:00",
  "coverage": {
    "stageStatus": "unstarted",
    "targetScope": "full-game",
    "declaredStages": [
      { "stageId": "stage-1", "status": "unstarted" }
    ]
  },
  "summary": {
    "status": "unstarted",
    "strategyKeys": {
      "survival": {
        "attempts": { "value": null, "status": "unverified" },
        "deaths": { "value": null, "status": "unverified" },
        "trainingTimeSeconds": { "value": null, "status": "unverified" },
        "maxProgress": { "value": null, "status": "unverified" },
        "clearTimeFrames": { "value": null, "status": "unverified" },
        "clearTimeSeconds": { "value": null, "status": "unverified" },
        "kills": { "value": null, "status": "unverified" },
        "fixedTargetsDestroyed": { "value": null, "status": "unverified" },
        "rewardsCollected": { "value": null, "status": "unverified" }
      }
    }
  },
  "runs": []
}
```

Each `runs[]` entry should include:

- `runId`
- `strategyKey`
- `side`
- `source`, such as `manual`, `tas-derived`, `ai-run`, `expert-system`, `automated`, or `augmented`
- `startedAt`
- `runCount`
- `frames`
- `durationSeconds`
- `maxProgress`
- `targetProgress`
- `deaths`
- `kills`
- `fixedTargetsDestroyed`
- `rewardsCollected`
- `clearTimeFrames`
- `clearTimeSeconds`
- `status`
- `runtimeReportPath`
- `candidateConfigPath`
- `notes`

The ledger is cumulative. Switching strategies or packages must not erase past evidence. New work appends a new run or revision and updates the summary only when the new evidence is stronger or more recent.

`quality.strategyResults` is the compact player-facing summary. `training-progress.json` is the factual stage ledger. If the two conflict, the validator must treat the stage ledger and trace evidence as authoritative and downgrade the package summary.

## 2.2 Required README Usage Contract

`README.md` must explain how another person or system should use the package. It must include:

- package name and version
- author and latest modifier
- supported game profile
- supported ROMProfile ids and checksums
- supported sides: 1P, 2P, shared, or 1P+2P
- included strategy categories
- stage coverage and current status
- battle result summary
- validation evidence summary
- known limitations and failure cases
- whether source artifacts such as TAS, human demonstration, or AI runs are included
- clear notice that no commercial ROM file is included

`sideScope` declares which player sides this package export contains:

- `1p-only`: player-facing label `1P only`.
- `2p-only`: player-facing label `2P only`.
- `1p-2p`: player-facing label `1P+2P`.
- `shared`: fragments are not side-owned and can be selected by either side.

A one-click package export must choose one of these scopes. The recommended default is the current training context: active 1P training exports `1P only`, active 2P training exports `2P only`, and verified two-side training exports `1P+2P`.

Combined `1P+2P` packages must include a cooperation contract. They must not hide that one side is unverified.

## 3. Required Directory Structure

A distributable Strategy Pack should use this structure:

```text
strategy-packs/<game-profile-id>/
  manifest.json
  README.md
  game-profile.json
  rom-profiles/
    <rom-profile-id>.json
  research/
    condition-registry.json
    action-map.json
    entity-taxonomy.json
    ram-map.json
    strategy-types.json
    training-scenarios.json
  schemas/
    manifest.schema.json
    fragments.schema.json
    runtime-api.schema.json
  stages/
    <stage-id>/
      stage-plan.json
      fragments.json
      training-progress.json
      validation-report.md
      known-failures.md
      trace-evidence/
```

Source artifacts may live outside the package root, but `manifest.json` must index any artifact needed to understand or validate the package through fields such as `files.tasTrainingBases`, `files.tasSideBaselines`, `files.humanDemonstrations`, `files.aiRuns`, or a future source-artifact field.

`training-scenarios.json` is recommended for any pack that claims validation. It should define goal variables, reward-like scoring, terminal conditions, and failure conditions for each validated stage or scene.

Source artifacts indexed by the package should be separated by role:

- `files.rawTAS`: raw external TAS or movie files copied into the local research archive. These are reference inputs only.
- `files.tasTrainingBases`: extracted TAS-derived baselines, side splits, entry points, and frame windows.
- `files.humanDemonstrations`: human demonstration traces that can become baselines.
- `files.aiRuns`: AI run traces, including failed runs.
- `files.knownFailures`: failure-window evidence used to block or refine fragments.
- `files.validationReports`: replay or runtime validation reports used for promotion.

The package must never present raw TAS, raw human demonstration, or raw AI input as a validated playable StrategyFragment. They are source material. Promotion requires a schema-valid candidate fragment plus validation evidence.

Replay and movie artifacts must preserve synchronization anchors when available:

- source format, such as `fm2`, `bk2`, browser trace, or runtime trace.
- ROM checksum and ROMProfile id.
- emulator/runtime identity.
- movie framecount and input row index.
- initial state type: power-on, reset, savestate, checkpoint, or active-game entry point.
- side split for 1P and 2P.
- known input/RAM offset, if detected.

Strategy Packs may index source files, derived baselines, or compact summaries, but they must not require redistribution of copyrighted ROM files. If a source movie or TAS archive cannot be redistributed, the pack should store metadata and a local import slot instead of embedding the file.

Validation scenarios must include enough information to detect reward traps and dead loops:

- progress metric
- survival or death condition
- stuck-loop condition
- desync condition, when applicable
- required blocker or fixed-target condition, when applicable
- strategy-specific score fields, such as kills, fixed-target destruction, rewards, clear time, teammate survival, or route completion

If a Strategy Pack claims to support training or validation but does not include `training-scenarios.json`, the UI must mark its validation scenario as `missing` or `unconfigured`.

When exporting side-owned packages, the package should also index side artifacts in `manifest.json`:

```json
{
  "sideScope": "1p-2p",
  "sideArtifacts": {
    "1p": {
      "fragments": ["stages/stage-1/fragments.1p.json"],
      "evidence": ["stages/stage-1/trace-evidence/1p-survival.json"],
      "tasSideBaselines": ["data/training/contra/tas_bases/contra-j-good/side-baselines.json"]
    },
    "2p": {
      "fragments": ["stages/stage-1/fragments.2p.json"],
      "evidence": ["stages/stage-1/trace-evidence/2p-guard.json"],
      "tasSideBaselines": ["data/training/contra/tas_bases/contra-j-good/side-baselines.json"]
    }
  }
}
```

The example paths are illustrative. A real pack must use its own `gameProfileId`, `romProfileId`, stage ids, and artifact paths.

## 4. Strategy Taxonomy

All packs should support the common base taxonomy when applicable:

- `survival`: keep the player alive, avoid death loops, clear required blockers.
- `speedrun`: advance quickly while preserving minimum safety.
- `combat`: prioritize enemy and fixed-threat clearing.
- `loot`: prioritize weapon, reward, and resource pickup.
- `guard`: protect another player, avoid screen drag, support shared threats.

Packs may add custom strategy types, but every custom type must be declared in `research/strategy-types.json`.

Fragments must not use undeclared strategy types. This is what lets different programs, different players, and different UI surfaces select and compare packs consistently.

## 5. Side-Owned Pack Selection

The platform should allow 1P and 2P to use different Strategy Packs.

Valid side-owned selection requires:

- Same `gameProfileId`.
- Compatible `romProfileId` or exact same loaded ROMProfile.
- Same `stageId` when a stage plan is active.
- Compatible `standards.strategyProtocol`.
- Compatible runtime input model.

Example combinations:

- 1P uses `speedrun`, 2P uses `guard`.
- 1P uses `loot`, 2P uses `combat`.
- 1P uses a player-made route pack, 2P uses a project survival pack.

The UI should show each side's selected pack name and strategy type. The side controller bay should show `pack name (strategy category)` prominently. The Operation Strategy Control panel should additionally show a 1P resource slot and a 2P resource slot.

Default selection rule:

- Selecting a 1P resource pack defaults 2P to the same pack when 2P has not been manually overridden.
- Selecting a different 2P resource pack marks 2P as independent.
- A visible sync action can restore 2P to the 1P resource pack.
- The platform must not silently overwrite an explicitly selected 2P pack.

The resource slot must show practical package information: display name, author, status, protocol version, ROMProfile compatibility, archive path, and validation status when known.

Package export rules:

- `1P only` exports only 1P-owned fragments, baselines, evidence, and validation status.
- `2P only` exports only 2P-owned fragments, baselines, evidence, and validation status.
- `1P+2P` exports both sides plus the cooperation contract and pair validation report.
- The default export scope follows the current training context, not a hardcoded global setting.
- If one side is missing validation, the export status must remain `candidate` or lower for that side.

## 6. Coop Compatibility Contract

Different packs can create interesting companion behavior, but they can also conflict.

Each pack intended for human-AI or dual-AI use should declare a cooperation contract. At minimum, the contract should describe:

- screen-push policy
- follow-distance policy
- reward priority policy
- fixed-target ownership policy
- boss/fixed-threat shared-fire policy
- recovery behavior when one side dies or falls behind
- loop-exit behavior

The platform should rate a pair of packs before dual-player use:

- `compatible`: safe to combine.
- `warning`: playable but may conflict.
- `blocked`: should not be combined without manual override.

This prevents combinations such as a fast pack dragging the screen while a survival pack waits behind.

## 7. Source And Baseline Artifacts

Source artifacts are route knowledge and validation evidence. They are not live AI controllers and they do not prescribe how the author trained the Strategy Pack.

Allowed source and baseline artifacts:

- raw TAS archive reference under `data/tas/<game>/<rom-profile>/`
- `training-base.json`
- `side-baselines.json`
- candidate fragment proposals
- trace comparison reports
- human demonstration traces
- AI run traces
- expert-authored route notes

`side-baselines.json` is the preferred way to split a two-player TAS into 1P and 2P operation baselines. It should record:

- `movieId`
- `side`
- `frameWindow`
- `rangeSemantics`
- pressed-frame ratio
- per-button counts
- dominant input patterns
- intent hints
- promotion target
- acceptance checks

Any source-derived fragment must pass Safety Override review and real runtime trace validation before entering a callable Strategy Pack.

## 8. Validation Gates

A Strategy Pack must not be treated as production-ready unless it passes these gates:

- ROMProfile hash match.
- Schema validation.
- Condition Registry references exist.
- Action map intents exist.
- Safety Override is evaluated before fragment execution.
- Real runtime trace evidence exists.
- Known failure counterexamples are recorded.
- Mode-specific validation is explicit.
- Training scenario goals and terminal conditions are declared.

Mode-specific validation cannot be shared blindly. Passing `single-ai` does not prove `human-ai` or `dual-ai`.

Validation scenarios should define:

- progress score
- death penalty
- loop or stuck penalty
- reward pickup score, when relevant
- fixed-threat clear score, when relevant
- terminal success conditions
- terminal failure conditions

Source provenance requirements:

- The package must declare whether each callable fragment came from a human author, TAS/movie data, human demonstration, AI run, automated optimizer, large-model analysis, or another source.
- The package must not depend on an undeclared local training workflow to be understood or validated.
- Automated or AI-assisted sources must be marked as proposals until runtime validation passes.
- Any source that improves score but fails progress, survival, or loop-exit checks must be marked `reward-farming-risk`.

### 8.1 Trust Pipeline

Every imported or exported community Strategy Pack should pass a three-level trust pipeline.

Level 1 structural integrity:

- ZIP or folder structure is valid.
- `manifest.json` exists and matches schema.
- required files are present.
- ROMProfile checksum is declared.
- no commercial ROM file is embedded.
- sideScope and sideArtifacts are internally consistent.

Level 2 sandbox validation:

- run the declared scenario in a sandboxed runtime or headless validator.
- reject or downgrade packs that crash, desync, enter a dead loop within the minimum frame window, or reference undeclared conditions.
- record ValidationReport output as package evidence.
- keep all generated candidates in `candidate` status until a replay or runtime validation passes.

Level 3 social or expert proof:

- record successful validation count.
- record mode coverage: single-ai, human-ai, dual-ai.
- record reviewer or community rating when available.
- do not treat popularity as validation unless runtime evidence also exists.

The trust pipeline is a gate, not a marketing label. A package with attractive metadata but weak evidence remains candidate or research material.

## 9. Distribution Levels

Strategy Pack status values:

- `research`: reference material only.
- `candidate`: schema-valid and useful for testing, not proven.
- `validated`: has real runtime evidence for declared modes.
- `production`: stable enough for ordinary users.
- `deprecated`: kept for history, not recommended.

Generated or optimized packs should also record their source level:

- `manual`: human-authored.
- `automated`: local trace or TAS pipeline generated.
- `augmented`: generated or reviewed with AI assistance.

Distribution should include clear status, evidence, ROMProfile, and license notes so users know what the package can and cannot do.
