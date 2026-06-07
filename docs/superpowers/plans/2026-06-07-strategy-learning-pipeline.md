# Strategy Learning Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every human, AI, or TAS-derived run produce standard evidence that can be converted into reusable FC/NES strategy fragments.

**Architecture:** Add a focused trace-evidence module outside the main UI, then expose browser botrun evidence through existing hidden JSON outputs. Keep the runtime RAM-driven. Do not add another local coordinate patch until the trace evidence for the failed route class is captured and documented.

**Tech Stack:** TypeScript browser runtime, Node test runner, JSON strategy packs, Markdown project docs.

---

## File Structure

- `apps/browser-cockpit/src/strategyTraceEvidence.ts`
  - Pure functions for slicing play traces by progression window and producing compact evidence records.
- `tests/strategyTraceEvidence.test.mjs`
  - TDD coverage for evidence slicing, death extraction, and branch-stop classification.
- `strategy-packs/contra/stages/stage-1/trace-evidence/`
  - Stored evidence files for Stage 1 strategy work.
- `references/contra-us/strategy-db/stage1-survival-run-log.md`
  - Human-readable run log updates.
- `docs/04_TASK_BOARD.md`
  - Current execution status.
- `docs/05_DECISION_LOG.md`
  - Method decision: switch from coordinate patching to trace-evidence pipeline.

## Task 1: Trace Evidence Pure Module

**Files:**
- Create: `apps/browser-cockpit/src/strategyTraceEvidence.ts`
- Test: `tests/strategyTraceEvidence.test.mjs`

- [ ] **Step 1: Write the failing test**

Add a test that builds synthetic samples covering `WorldX 2500-2960`, one death at `WorldX 2854`, one fixed target, one infantry kill, and final input `down+right+B`. Assert that the evidence record reports the window, sample count, max WorldX, death, top enemy, and no-loop classification.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/strategyTraceEvidence.test.mjs
```

Expected: fail because `strategyTraceEvidence.ts` does not exist or exports are missing.

- [ ] **Step 3: Write minimal implementation**

Create pure functions:

- `createStrategyTraceEvidence(samples, options)`
- `classifyBranchOutcome(evidence)`
- `traceInputLabel(input)`

The evidence schema must include:

- `schema: "fc-ai-strategy-trace-evidence-v1"`
- `gameProfileId`
- `romProfileId`
- `stageId`
- `fragmentId`
- `routeClass`
- `progressionWindow`
- `sampleCount`
- `startWorldX`
- `endWorldX`
- `maxWorldX`
- `death`
- `topEnemies`
- `inputSummary`
- `branchOutcome`

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
node --test tests/strategyTraceEvidence.test.mjs
```

Expected: pass.

## Task 2: Contra Stage 1 Evidence Artifact

**Files:**
- Create: `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-boss-high-air-carry-failure.json`
- Modify: `strategy-packs/contra/stages/stage-1/known-failures.md`
- Modify: `references/contra-us/strategy-db/stage1-survival-run-log.md`

- [ ] **Step 1: Extract current browser botrun JSON**

Read the hidden `bot-run-report-json` and `death-trace-json` from the current local browser page.

- [ ] **Step 2: Write the evidence artifact**

Use the new pure module shape. The artifact must record that `routeClass` is `high-platform-jump-carry`, death is `WorldX 2854 / y236`, and branch outcome is `route-class-failed-stop`.

- [ ] **Step 3: Update docs**

Update known failures and run log to point to the JSON evidence file.

## Task 3: Strategy Pack Validation

**Files:**
- Modify: `tests/strategyPackStandard.test.mjs`

- [ ] **Step 1: Write a failing validation test**

Require every `known-failures.md` failure id referenced by Stage 1 fragments to have either a matching trace evidence file or a documented failure line.

- [ ] **Step 2: Run validation test to verify it fails if evidence is missing**

Run:

```powershell
node --test tests/strategyPackStandard.test.mjs
```

- [ ] **Step 3: Implement the minimal validation update**

Make the test check `strategy-packs/contra/stages/stage-1/trace-evidence/*.json` for `failureId` fields.

- [ ] **Step 4: Run validation test to verify it passes**

Run:

```powershell
node --test tests/strategyPackStandard.test.mjs
```

## Task 4: Runtime Next Route Gate

**Files:**
- Modify: `apps/browser-cockpit/src/contraStage1RewardTactics.ts`
- Modify: `tests/contraStage1RewardTactics.test.mjs`
- Modify: `apps/browser-cockpit/src/main.tsx`

- [ ] **Step 1: Write a failing test for mid/low platform capture intent**

The test should prove that the failed high-platform carry window is not extended. A new function should return a `stage-one-boss-approach-mid-platform-capture` patch only for a distinct mid/low route state, not for the already disproved high arc.

- [ ] **Step 2: Implement the minimal patch**

Add one route-class replacement patch. It must override the high jump/carry branch only when the player state matches the new mid/low route state.

- [ ] **Step 3: Run focused tests**

Run:

```powershell
node --test tests/contraStage1RewardTactics.test.mjs
```

## Task 5: One Real Botrun

**Files:**
- Modify: `references/contra-us/strategy-db/stage1-survival-run-log.md`
- Modify: `docs/04_TASK_BOARD.md`
- Modify: `docs/05_DECISION_LOG.md`

- [ ] **Step 1: Run exactly one botrun for the new route class**

Use a new run id. Do not rerun the same failed route class.

- [ ] **Step 2: Record the result**

If it passes the old blocker, continue to the next blocker. If it dies in the same class, stop and document. Do not stack another local threshold patch.

## Self-Review

- The plan covers trace capture, evidence storage, validation, runtime route replacement, and one real botrun.
- The plan does not require direct ROM redistribution.
- The plan keeps Contra coordinates in the Contra pack and docs, not in the generic standard.
- The plan avoids placeholders and defines concrete commands.
