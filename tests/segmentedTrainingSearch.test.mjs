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

test("W1205 vertical fixed-target station attempt is archived as rejected evidence", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "vertical-fixed-station-candidate-trial");

  assert.ok(attempt, "W1205 vertical station candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1205-vertical-fixed-station");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 4581);
});

test("W1205 post-upper recovery attempt is archived despite progress gain", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "post-upper-recovery-candidate-trial");

  assert.ok(attempt, "W1205 post-upper recovery candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1205-post-upper-recovery");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 2802);
  assert.equal(attempt.maxProgression, 1555);
});

test("W1205 post-upper safe recovery attempt is archived after W1360 death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "post-upper-safe-recovery-candidate-trial");

  assert.ok(attempt, "W1205 post-upper safe recovery candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1205-post-upper-safe-recovery");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 7114);
  assert.equal(attempt.maxProgression, 1497);
});

test("W1360 station crowd escape attempt is archived after W1726 death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1360-right-under-station-crowd-candidate-trial");

  assert.ok(attempt, "W1360 station-crowd candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1360-right-under-station-crowd");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9079);
  assert.equal(attempt.maxProgression, 1758);
});

test("W1726 danger low-side body attempt is archived after W1660 regression death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1726-danger-low-side-body-candidate-trial");

  assert.ok(attempt, "W1726 danger low-side body candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1726-danger-low-side-body");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 10410);
  assert.equal(attempt.maxProgression, 2001);
});

test("W1660 retreat-regression guard attempt is archived after left-edge body death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1660-retreat-regression-guard-candidate-trial");

  assert.ok(attempt, "W1660 retreat-regression candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1660-retreat-regression-guard");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9867);
  assert.equal(attempt.runtimeEvidence.status, "recovered-after-loss");
  assert.equal(attempt.maxProgression, 1820);
});

test("W1641 left-edge right-jump attempt is archived after late jump death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1641-left-edge-right-jump-candidate-trial");

  assert.ok(attempt, "W1641 left-edge right-jump candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1641-left-edge-right-jump");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9862);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1930);
});

test("W1648 left-edge precompression advance attempt is archived after W1678 death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1648-left-edge-precompression-advance-candidate-trial");

  assert.ok(attempt, "W1648 precompression candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1648-left-edge-precompression-advance");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 11000);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1931);
});

test("W1664 same-lane preclear pulse attempt is archived after earlier overhead death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1664-same-lane-preclear-pulse-candidate-trial");

  assert.ok(attempt, "W1664 same-lane preclear-pulse candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1664-same-lane-preclear-pulse");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9862);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1930);
});

test("W1658 overhead guard preclear attempt is archived after recovered loss", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1658-overhead-guard-preclear-candidate-trial");

  assert.ok(attempt, "W1658 overhead guard preclear candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1658-overhead-guard-preclear");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 10193);
  assert.equal(attempt.runtimeEvidence.status, "recovered-after-loss");
  assert.equal(attempt.maxProgression, 1825);
  assert.ok(attempt.riskTags.includes("progress-stall-risk"));
});

test("W1726 grounded overhead duck advance attempt is archived after earlier route regression", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1726-grounded-overhead-duck-advance-candidate-trial");

  assert.ok(attempt, "W1726 grounded overhead duck advance candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1726-grounded-overhead-duck-advance");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 10744);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1784);
  assert.equal(attempt.finalProgression, 82);
});

test("W1440 descent lower-body right carry attempt is archived after same-frame death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1440-descent-lower-body-right-carry-candidate-trial");

  assert.ok(attempt, "W1440 descent lower-body right-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1440-descent-lower-body-right-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9414);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1790);
  assert.equal(attempt.finalProgression, 82);
});

test("W1454 airborne fixed-contact right carry attempt is archived after same-frame death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1454-airborne-fixed-contact-right-carry-candidate-trial");

  assert.ok(attempt, "W1454 fixed-contact right-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1454-airborne-fixed-contact-right-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9414);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1790);
  assert.equal(attempt.finalProgression, 82);
  assert.ok(attempt.riskTags.includes("late-route-formation-risk"));
});

test("W1454 airborne fixed-contact pulse carry attempt is archived after same-frame death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1454-airborne-fixed-contact-pulse-carry-candidate-trial");

  assert.ok(attempt, "W1454 fixed-contact pulse-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1454-airborne-fixed-contact-pulse-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9414);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1790);
  assert.equal(attempt.finalProgression, 82);
  assert.ok(attempt.riskTags.includes("shot-slot-timing-risk"));
});

test("W1456 air-route hold-right attempt is archived after moving the first loss to W1735", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1456-air-route-hold-right-candidate-trial");

  assert.ok(attempt, "W1456 air-route hold-right candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1456-air-route-hold-right");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 11978);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1751);
  assert.equal(attempt.finalProgression, 1757);
  assert.ok(attempt.riskTags.includes("route-formation-progress-gain"));
  assert.ok(attempt.trialNote.includes("moved the first loss"));
});

test("W1735 danger-stack right carry attempt is archived after same-frame death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1735-danger-stack-right-carry-candidate-trial");

  assert.ok(attempt, "W1735 danger-stack right-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1735-danger-stack-right-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 11978);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1751);
  assert.equal(attempt.finalProgression, 1761);
  assert.ok(attempt.riskTags.includes("late-contact-fix-too-late"));
});

test("W1735 same-lane right carry attempt is archived after contact persists", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1735-same-lane-right-carry-candidate-trial");

  assert.ok(attempt, "W1735 same-lane right-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1735-same-lane-right-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 11978);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1751);
  assert.equal(attempt.finalProgression, 1721);
  assert.ok(attempt.riskTags.includes("same-frame-fix-too-late"));
  assert.ok(attempt.trialNote.includes("move earlier than the last active frame"));
});

test("W1751 precontact right-fire attempt is archived after progress gain but later retreat death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1751-precontact-right-fire-candidate-trial");

  assert.ok(attempt, "W1751 precontact right-fire candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1751-precontact-right-fire");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 11978);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1755);
  assert.equal(attempt.finalProgression, 1761);
  assert.ok(attempt.riskTags.includes("route-formation-progress-gain"));
  assert.ok(attempt.riskTags.includes("late-retreat-contact-risk"));
  assert.ok(attempt.trialNote.includes("W1755"));
});

test("W1755 descent right-fire carry attempt is archived after later reentry retreat death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1755-descent-right-fire-carry-candidate-trial");

  assert.ok(attempt, "W1755 descent right-fire carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1755-descent-right-fire-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 12402);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1933);
  assert.equal(attempt.finalProgression, 82);
  assert.ok(attempt.riskTags.includes("route-formation-progress-gain"));
  assert.ok(attempt.riskTags.includes("reentry-left-retreat-risk"));
  assert.ok(attempt.trialNote.includes("W1765"));
});

test("W1765 reentry right-fire carry attempt is archived after same-lane contact death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1765-reentry-right-fire-carry-candidate-trial");

  assert.ok(attempt, "W1765 reentry right-fire carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1765-reentry-right-fire-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 12409);
  assert.equal(attempt.runtimeEvidence.status, "recovered-after-loss");
  assert.equal(attempt.maxProgression, 1960);
  assert.equal(attempt.finalProgression, 1923);
  assert.ok(attempt.riskTags.includes("route-formation-progress-gain"));
  assert.ok(attempt.riskTags.includes("same-lane-reentry-contact-risk"));
  assert.ok(attempt.trialNote.includes("slot5"));
});

test("W1765 rear-contact duck carry attempt is archived after left-edge regression death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1765-rear-contact-duck-carry-candidate-trial");

  assert.ok(attempt, "W1765 rear-contact duck carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1765-rear-contact-duck-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 12546);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1820);
  assert.equal(attempt.finalProgression, 82);
  assert.ok(attempt.riskTags.includes("rear-contact-duck-regression"));
  assert.ok(attempt.riskTags.includes("left-edge-contact-regression"));
  assert.ok(attempt.trialNote.includes("W1700"));
});

test("W1678 forward-body duck carry attempt is archived after stall", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1678-forward-body-duck-carry-candidate-trial");

  assert.ok(attempt, "W1678 duck-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["stuck-loop"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1678-forward-body-duck-carry");
  assert.equal(attempt.runtimeEvidence.status, "stalled-active");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, null);
  assert.equal(attempt.maxProgression, 1744);
});

test("W1678 forward-body level carry attempt is archived after early same-lane death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1678-forward-body-level-carry-candidate-trial");

  assert.ok(attempt, "W1678 level-carry candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1678-forward-body-level-carry");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9260);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1812);
});

test("W1678 low-stack jump clear attempt is archived after same-lane death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1678-low-stack-jump-clear-candidate-trial");

  assert.ok(attempt, "W1678 low-stack jump-clear candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1678-low-stack-jump-clear");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9254);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1812);
});

test("W1678 upper-body jump-edge attempt is archived after same-lane death", () => {
  const reportPath = path.join(
    repoRoot,
    "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json"
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const attempt = report.rejectedAttempts.find((entry) => entry.attemptId === "w1678-upper-body-jump-edge-candidate-trial");

  assert.ok(attempt, "W1678 upper-body jump-edge candidate should be kept as rejected evidence");
  assert.equal(attempt.gateStatus, "rejected");
  assert.deepEqual(attempt.rejectionReasons, ["death"]);
  assert.equal(attempt.runtimeEvidence.candidateTrial, "w1678-upper-body-jump-edge");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 9264);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.maxProgression, 1812);
});
