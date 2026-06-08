# Next Development Plan

This package is for continuing Contra Stage 1 strategy development from the current evidence state.

## Start Here

1. Read `CLI_HANDOFF.md`.
2. Read `docs/20_STANDARDIZED_OPERATION_MANUAL.md`.
3. Read `strategy-packs/contra/dev-handoff/current-training-20260608/handoff-manifest.json`.
4. Read `data/training/contra/runtime_runs/contra-j-good/README.md`.
5. Run:

```powershell
node --test tests\contraJRuntimeTraceEvidence.test.mjs
node --test tests\contraStrategyDevHandoffPackage.test.mjs
npm test
npm run build
```

## Current Best Evidence

The current `combat-v0` branch moved the opening blocker from `WorldX 286` to a boss-approach high-air failure at `WorldX 2174`.

The follow-up boss-approach high-air contact patch regressed the branch to `WorldX 2160`, so it is archived as rejected evidence. Do not resume blind coordinate patching in this window.

The first comparative candidate proposal is now indexed at:

```text
data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster.json
```

The first schema-converted runtime fragment draft is now indexed at:

```text
data/training/contra/runtime_runs/contra-j-good/runtime-fragments/draft-fragment-1p-combat-v0-boss-approach-high-air-cluster.json
```

## Recommended Next Technical Task

Wire the boss-approach high-air runtime draft into a focused runtime test harness:

- Source window: boss-approach high-air enemy cluster around `WorldX 2112-2174`.
- Source evidence:
  - `candidate-1p-combat-v0-spread-turret-suppression-death-worldx2112.json`
  - `candidate-1p-combat-v0-boss-approach-early-pit-jump-death-worldx2174.json`
  - `candidate-1p-combat-v0-boss-approach-high-air-contact-death-worldx2160.json`
- Baseline source:
  - `data/training/contra/tas_bases/contra-j-good/side-baselines.json`
- Required output:
  - focused runtime behavior test
  - `tasIsController: false`
  - semantic `actionAdvice`, not direct button playback
  - `TraceEvidence`
  - `ValidationReport`

## Guardrails

- TAS remains evidence only.
- ROM is not bundled.
- Candidate status remains candidate until real runtime validation passes.
- A route class that regresses must be archived and stopped.
- A strategy category is not validated by another category's run.

## Save Point Rule

After a stable feature point:

```powershell
node --test tests\contraJRuntimeTraceEvidence.test.mjs
node --test tests\contraStrategyDevHandoffPackage.test.mjs
npm test
npm run build
```

Then save a version with a concise commit message.
