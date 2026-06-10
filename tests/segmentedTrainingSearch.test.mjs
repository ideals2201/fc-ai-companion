import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

async function importTypeScriptModule(modulePath) {
  const source = fs.readFileSync(modulePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  createSegmentedTrainingSearchReport,
  rankSegmentAttempt
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/segmentedTrainingSearch.ts"));

test("segmented training ranks safe progress above death, stall, and reward-only loops", () => {
  const segment = {
    id: "contra-us-stage1-w1205-reward-station",
    progressionMetric: "progression.primary",
    progressionStart: 1120,
    progressionEnd: 1280,
    strategyKey: "survival-v0"
  };

  const safeProgress = rankSegmentAttempt({
    attemptId: "right-up-fire-stand-adjust",
    candidateFragmentId: "candidate-fragment-1p-survival-v0-w1205-stand-adjust",
    deathCount: 0,
    desynced: false,
    finalProgression: 1268,
    fixedTargetsDestroyed: 0,
    frameCount: 420,
    maxProgression: 1272,
    progressStallFrames: 12,
    rewardsCollected: 0,
    scoreDelta: 0,
    stuckLoop: false
  }, segment);

  const death = rankSegmentAttempt({
    attemptId: "force-right",
    candidateFragmentId: "candidate-fragment-1p-survival-v0-w1205-force-right",
    deathCount: 1,
    desynced: false,
    finalProgression: 82,
    fixedTargetsDestroyed: 0,
    frameCount: 300,
    maxProgression: 1206,
    progressStallFrames: 0,
    rewardsCollected: 0,
    scoreDelta: 0,
    stuckLoop: false
  }, segment);

  const rewardLoop = rankSegmentAttempt({
    attemptId: "farm-score",
    candidateFragmentId: "candidate-fragment-1p-survival-v0-w1205-farm-score",
    deathCount: 0,
    desynced: false,
    finalProgression: 1154,
    fixedTargetsDestroyed: 0,
    frameCount: 800,
    maxProgression: 1205,
    progressStallFrames: 180,
    rewardsCollected: 1,
    scoreDelta: 500,
    stuckLoop: true
  }, segment);

  assert.equal(safeProgress.gateStatus, "candidate");
  assert.ok(safeProgress.score > death.score);
  assert.ok(safeProgress.score > rewardLoop.score);
  assert.equal(death.gateStatus, "rejected");
  assert.ok(death.rejectionReasons.includes("death"));
  assert.equal(rewardLoop.gateStatus, "rejected");
  assert.ok(rewardLoop.rejectionReasons.includes("stuck-loop"));
  assert.ok(rewardLoop.riskTags.includes("reward-farming-risk"));
});

test("segmented training search report keeps the winner as candidate evidence, not validated", () => {
  const report = createSegmentedTrainingSearchReport({
    createdAt: "2026-06-10T09:00:00.000Z",
    gameProfileId: "contra",
    romProfileId: "contra-us-good",
    side: "1P",
    stageId: "stage-1",
    segment: {
      id: "contra-us-stage1-w1205-reward-station",
      progressionMetric: "progression.primary",
      progressionStart: 1120,
      progressionEnd: 1280,
      strategyKey: "survival-v0"
    },
    attempts: [
      {
        attemptId: "baseline",
        candidateFragmentId: "candidate-fragment-1p-survival-v0-w1205-baseline",
        deathCount: 0,
        desynced: false,
        finalProgression: 1154,
        fixedTargetsDestroyed: 0,
        frameCount: 800,
        maxProgression: 1205,
        progressStallFrames: 994,
        rewardsCollected: 0,
        scoreDelta: 0,
        stuckLoop: true
      },
      {
        attemptId: "stand-adjust",
        candidateFragmentId: "candidate-fragment-1p-survival-v0-w1205-stand-adjust",
        deathCount: 0,
        desynced: false,
        evidenceRef: "data/training/contra/runtime_runs/contra-us-good/trace-evidence/w1205-stand-adjust.json",
        finalProgression: 1268,
        fixedTargetsDestroyed: 0,
        frameCount: 420,
        maxProgression: 1272,
        progressStallFrames: 12,
        rewardsCollected: 0,
        scoreDelta: 0,
        stuckLoop: false
      }
    ]
  });

  assert.equal(report.schema, "fc-ai-segmented-training-search-report-v1");
  assert.equal(report.status, "candidate-search");
  assert.equal(report.validationStatus, "missing");
  assert.equal(report.bestAttempt?.attemptId, "stand-adjust");
  assert.equal(report.bestAttempt?.gateStatus, "candidate");
  assert.deepEqual(report.requiredPromotionEvidence, [
    "TraceEvidence",
    "ValidationReport",
    "mode-specific runtime replay"
  ]);
  assert.ok(report.rejectedAttempts.some((attempt) => attempt.attemptId === "baseline"));
  assert.equal(report.rejectedAttempts[0].gateStatus, "rejected");
});

test("segmented training search report preserves sync anchors and deterministic context", () => {
  const report = createSegmentedTrainingSearchReport({
    createdAt: "2026-06-10T09:10:00.000Z",
    gameProfileId: "contra",
    romProfileId: "contra-us-good",
    side: "1P",
    stageId: "stage-1",
    segment: {
      id: "contra-us-stage1-w1205-reward-station",
      progressionMetric: "progression.primary",
      progressionStart: 1120,
      progressionEnd: 1280,
      strategyKey: "survival-v0"
    },
    syncAnchors: {
      runtime: "browser-headless-jsnes",
      inputClock: "nes.frame-before-step",
      initialStateType: "runtime-checkpoint",
      movieFramecount: null,
      inputRowIndex: null,
      knownInputRamOffsetFrames: 0
    },
    deterministicContext: {
      rngStatus: "unknown",
      inputSamplingDelayFrames: 0,
      perturbationRequired: true
    },
    attempts: []
  });

  assert.equal(report.syncAnchors.runtime, "browser-headless-jsnes");
  assert.equal(report.syncAnchors.inputClock, "nes.frame-before-step");
  assert.equal(report.syncAnchors.initialStateType, "runtime-checkpoint");
  assert.equal(report.deterministicContext.rngStatus, "unknown");
  assert.equal(report.deterministicContext.perturbationRequired, true);
  assert.deepEqual(report.promotionGates.map((gate) => gate.id), [
    "trace-evidence",
    "validation-report",
    "mode-specific-runtime-replay",
    "deterministic-context",
    "negative-constraints"
  ]);
  assert.ok(report.promotionGates.every((gate) => gate.status === "missing"));
});
