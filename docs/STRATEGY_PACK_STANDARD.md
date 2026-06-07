# FC AI Strategy Pack Standard

Version: 1.0.0

Status: active project standard

## 1. Position

This document defines how FC/NES AI operation strategy packs are packaged, distributed, selected, trained, validated, and archived.

It does not replace `docs/STRATEGY_PROTOCOL_CORE.md`. The core protocol defines runtime semantics, condition references, intent fusion, safety hierarchy, RNG metadata, and API contracts. This document defines the product form of a distributable Strategy Pack.

A Strategy Pack is a data product. It can be produced by the project team, another developer, a player, a TAS-derived training pipeline, or a future automated optimizer. A pack must not include commercial ROM files.

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
          "clearTimeFrames": { "value": null, "status": "unverified" }
        }
      }
    }
  }
}
```

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
      validation-report.md
      known-failures.md
      trace-evidence/
```

TAS-derived or training artifacts may live outside the package root, but `manifest.json` must index them through `files.tasTrainingBases`, `files.tasSideBaselines`, or a future training artifact field.

`training-scenarios.json` is recommended for any pack that claims validation. It should define goal variables, reward-like scoring, terminal conditions, and failure conditions for each validated stage or scene.

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

## 7. TAS-Derived Training Artifacts

TAS data is route knowledge and training evidence. It is not a live AI controller.

Allowed TAS-derived artifacts:

- raw TAS archive reference under `data/tas/<game>/<rom-profile>/`
- `training-base.json`
- `side-baselines.json`
- candidate fragment proposals
- trace comparison reports

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

Any TAS-derived fragment must pass Safety Override review and real runtime trace validation before entering a callable Strategy Pack.

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
