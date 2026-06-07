# FC AI Companion Standardized Operation Manual

This manual standardizes how a Contra operation strategy moves from TAS reference material to side-owned training, archived evidence, validation replay, and package export.

## 1. Scope

This process applies to FC/NES browser cockpit strategy development under the current Strategy Protocol 1.0 rules.

Current Contra status:

- `strategy-packs/contra/stages/stage-1/strategy-clearance-matrix.json` defines Stage 1 candidate coverage.
- `strategy-packs/contra/clearance-roadmap.json` defines the full-game stage roadmap.
- Stage 2 through Stage 8 are evidence gaps until TAS-derived baselines and real runtime traces are archived.

No output may be marked `validated` until real runtime trace evidence and validation replay prove it.

## 2. TAS Extraction

TAS Extraction converts an FM2 movie into training evidence inputs. It does not create live controller authority.

Required inputs:

- Exact ROM profile match.
- FM2 movie identity.
- Frame window or progression window.
- Side ownership: `1P`, `2P`, or explicitly shared.
- Intended strategy categories such as `survival-v0`, `speedrun-v0`, `combat-v0`, `loot-v0`, or `guard-v0`.

Rules:

- TAS must not be used as a live controller.
- TAS windows must be split into Side Baseline artifacts before training.
- TAS-derived data remains `candidate` until real runtime trace validation exists.
- Any TAS-derived fragment must support recovery when real RAM state diverges from the movie route.

Current source artifacts:

- `data/training/contra/tas_bases/contra-j-good/training-base.json`
- `data/training/contra/tas_bases/contra-j-good/side-baselines.json`

## 3. Side Baseline

A Side Baseline is a side-owned training reference. It may come from:

- Strategy pack fragments.
- TAS side-baselines.
- Human demonstration.
- AI run evidence.

Each baseline must record:

- `gameProfileId`
- `romProfileId`
- `stageId`
- `side`
- source type
- frame or progression window
- strategy category
- acceptance checks

For Contra, the cockpit must show side-owned baselines in the 1P and 2P training panels. A 2P baseline must not silently activate in a one-player runtime.

## 4. Training Session

Training Session is where the cockpit turns baseline evidence into side-owned runtime behavior.

Required operation:

1. Select the strategy category for the side.
2. Select the baseline for the side.
3. Start that side's training session.
4. Run the browser cockpit with RAM-driven behavior.
5. Record the runtime trace.
6. Stop training and archive evidence.

The training session owns input only after it is explicitly started. Selecting a side is a queued state, not active controller ownership.

## 5. TraceEvidence

TraceEvidence is the standard archive for real runtime proof.

Required fields:

- schema: `fc-ai-strategy-trace-evidence-v1`
- game profile
- ROM profile
- stage id
- side
- selected strategy key
- selected baseline id
- input summary
- enemy summary
- progression window
- branch outcome
- death or no-death result

TraceEvidence may prove:

- candidate window completion
- death counterexample
- route-class failure
- insufficient evidence

TraceEvidence does not by itself make a strategy `validated`. It feeds validation replay.

## 6. Validation Replay

Validation Replay verifies that archived evidence can be reproduced by the current strategy package.

Required checks:

- ROM profile still matches.
- Selected stage and side still match.
- Negative constraints are checked.
- TAS is not acting as controller.
- Runtime input is produced by the strategy pack and cockpit logic.
- Result is recorded as candidate, candidate failure, or validated only when the standard allows it.

Validation Replay must write a `ValidationReport` artifact with schema `fc-ai-strategy-validation-report-v1`.

Required report gates:

- `replay.complete` must be true.
- `replay.desynced` must be false.
- `replay.deathCount` must be 0 for a no-death package save.
- The report `romProfileIds` must cover every selected side TraceEvidence ROM profile.
- The report `evidenceRefs` must include every selected side TraceEvidence path.
- Any death, desync, incomplete replay, or ROMProfile mismatch blocks package save.

`Save Strategy` must remain blocked until Validation Replay is complete and a passing `ValidationReport` exists for the selected side scope.

## 7. Package Evidence Export

Package Evidence Export creates a distributable evidence payload for a strategy pack save.

Required export contents:

- `manifest.side-artifacts.patch.json`
- selected side `ValidationReport` files
- selected side TraceEvidence files
- TAS side-baseline path references, when used
- ROM policy
- validation status

Rules:

- ROM file must not be bundled.
- `romFileNotIncluded` must be true.
- `userMustProvideOwnRom` must be true.
- Missing selected-side TraceEvidence blocks package save.
- Missing or failed ValidationReport blocks package save.
- If any selected side is unvalidated, export status remains `candidate`.

Current implementation entry:

- `apps/browser-cockpit/src/strategyPackageEvidence.ts`
- `createStrategyPackageEvidenceExport()`

## 8. Contra Strategy Categories

Every Contra stage tracks the same strategy keys:

- `survival-v0`: no-death first, fewest-death fallback.
- `speedrun-v0`: fast clear after survival is stable.
- `combat-v0`: clear enemies and fixed threats.
- `loot-v0`: collect high-value rewards without sacrificing survival.
- `guard-v0`: support human-AI or dual-AI spacing and protection.

Each category must be trained and validated separately. A single successful survival route does not validate speedrun, combat, loot, or guard.

## 9. Full-Clear Workflow

The full-clear workflow is stage-gated:

1. Stage 1 candidate matrix.
2. Stage 1 real runtime trace validation.
3. Stage 2 TAS extraction and side-baseline split.
4. Stage 2 matrix and trace validation.
5. Repeat through Stage 8.
6. Run full-game validation replay.
7. Export candidate or validated package according to evidence status.

Until every stage has real runtime trace evidence, the full-game strategy remains `candidate-and-gap`.

## 10. Save Points

After each stable operation point:

- Run the focused test.
- Run `npm test`.
- Run `npm run build`.
- Record evidence in the task board or decision log.
- Save a version point before starting the next stage or strategy category.
