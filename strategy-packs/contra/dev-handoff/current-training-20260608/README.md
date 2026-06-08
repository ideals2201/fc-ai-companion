# Contra Stage 1 Current Training Handoff 2026-06-08

Status: `candidate-research`.

This handoff package summarizes the current trained operation strategy state for `contra-j-good` Stage 1 so another developer can continue work without re-discovering the same branch history.

It does not claim Stage 1 clearance. It does not claim full-game clearance. It is a development package that preserves the current evidence, rejected branch, candidate fragments, and next training path.

TAS is not a controller. TAS-derived files are used only as training evidence and side-owned baseline references. The runtime controller remains the RAM-driven strategy/cockpit logic.

ROM is not included. The receiver must provide their own compatible ROM and pass the ROMProfile hash match before using these artifacts.

## Contents

- `handoff-manifest.json`: machine-readable index for the current strategy coverage, evidence refs, candidate fragments, and developer entry points.
- `next-development-plan.md`: practical continuation instructions.
- Existing strategy source refs:
  - `strategy-packs/contra/manifest.json`
  - `strategy-packs/contra/stages/stage-1/fragments.json`
  - `strategy-packs/contra/stages/stage-1/strategy-clearance-matrix.json`
- Existing training refs:
  - `data/training/contra/tas_bases/contra-j-good/training-base.json`
  - `data/training/contra/tas_bases/contra-j-good/side-baselines.json`
  - `data/training/contra/runtime_runs/contra-j-good/trace-evidence/`

## Current Evidence Summary

The current strategy matrix has five candidate strategy keys:

- `survival-v0`: dies at `WorldX 2087`.
- `speedrun-v0`: dies at `WorldX 625`.
- `combat-v0`: best current runtime progress is `WorldX 2174`, then the high-air contact branch regressed to `WorldX 2160` and is rejected.
- `loot-v0`: dies at `WorldX 1943`.
- `guard-v0`: dies at `WorldX 2038`.

All of these are real runtime evidence entries. None of them is a clearance proof.

## Current Development Boundary

Do not resume blind coordinate patching around `WorldX 2150-2174`.

The next useful task is to build a TAS/human state-action fragment for the boss-approach high-air enemy cluster, then validate it with a real runtime trace and a schema-bound `ValidationReport`.

## Minimum Checks Before Continuing

Run these before editing strategy behavior:

```powershell
git status --short
node --test tests\contraJRuntimeTraceEvidence.test.mjs
node --test tests\contraStrategyDevHandoffPackage.test.mjs
npm test
npm run build
```

Also scan for forbidden packaged assets before sharing:

```powershell
rg --files strategy-packs\contra\dev-handoff\current-training-20260608 -g "*.nes" -g "*.fds" -g "*.unf" -g "*.unif" -g "*.rom" -g "*.bin" -g "*.zip" -g "*.7z" -g "*.rar"
```
