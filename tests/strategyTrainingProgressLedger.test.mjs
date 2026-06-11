import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerScriptPath = path.join(repoRoot, "scripts", "strategy-training-progress.mjs");
const progressArtifactPath = path.join(repoRoot, "strategy-packs", "contra", "stages", "stage-1", "training-progress.json");
const scriptSource = fs.readFileSync(ledgerScriptPath, "utf8");
const progressArtifact = JSON.parse(fs.readFileSync(progressArtifactPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "strategy-packs", "contra", "manifest.json"), "utf8"));

const {
  appendRuntimeTrainingReport,
  formatSecondsForProgress,
  inferRuntimeReportDeaths,
  summarizeTrainingProgress
} = await import(`file://${ledgerScriptPath.replace(/\\/g, "/")}`);

function metric(value, status = "candidate") {
  return { value, status };
}

test("strategy training progress artifact is append-only and stage scoped", () => {
  assert.equal(progressArtifact.schemaVersion, "1.1.0");
  assert.equal(progressArtifact.romProfileId, "contra-j-good");
  assert.equal(progressArtifact.packId, "contra-stage1-strategy-v0");
  assert.equal(progressArtifact.stageId, "stage-1");
  assert.equal(progressArtifact.policy.appendOnlyRuns, true);
  assert.equal(progressArtifact.policy.timeUnit, "seconds");
  assert.equal(progressArtifact.policy.exactRomValidationRequired, true);
  assert.equal(progressArtifact.policy.tasIsEvidenceNotController, true);
  assert.equal(progressArtifact.policy.failureRunsMustBeRecorded, true);
  assert.ok(Array.isArray(progressArtifact.runs));
  assert.ok(progressArtifact.stageSummary["stage-1"], "stage-level training summary should be recorded");
  assert.equal(progressArtifact.stageSummary["stage-1"].dataMode, "measured-ledger-only");
  assert.equal(progressArtifact.stageSummary["stage-1"].historicalEstimate, null);
  assert.ok(progressArtifact.progressByStrategy["survival-v0"]);
});

test("contra pack exposes stage-scoped training progress ledgers for all eight stages", () => {
  const expectedProgressPaths = Array.from(
    { length: 8 },
    (_, index) => `stages/stage-${index + 1}/training-progress.json`
  );

  assert.deepEqual(manifest.files.trainingProgress, expectedProgressPaths);

  for (let stageNumber = 1; stageNumber <= 8; stageNumber += 1) {
    const stageId = `stage-${stageNumber}`;
    const progressPath = path.join(repoRoot, "strategy-packs", "contra", "stages", stageId, "training-progress.json");
    assert.equal(fs.existsSync(progressPath), true, `${stageId} training progress ledger should exist`);

    const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
    assert.equal(progress.schemaVersion, "1.1.0");
    assert.equal(progress.packId, manifest.packId);
    assert.equal(progress.gameProfileId, "contra");
    assert.equal(progress.romProfileId, "contra-j-good");
    assert.equal(progress.stageId, stageId);
    assert.equal(progress.policy.appendOnlyRuns, true);
    assert.equal(progress.policy.summaryDerivedFromRuns, true);
    assert.equal(progress.policy.timeUnit, "seconds");
    assert.equal(progress.policy.exactRomValidationRequired, true);
    assert.equal(progress.policy.tasIsEvidenceNotController, true);
    assert.equal(progress.policy.failureRunsMustBeRecorded, true);
    assert.ok(progress.stageSummary[stageId], `${stageId} should have a matching stage summary`);
    assert.ok(progress.progressByStrategy["survival-v0"], `${stageId} should expose survival progress`);
    assert.ok(Array.isArray(progress.runs), `${stageId} should expose append-only runs`);
    assert.deepEqual(
      Object.keys(progress.strategyDescriptions).sort(),
      [...manifest.strategySlots].sort(),
      `${stageId} should describe every strategy slot`
    );

    for (const strategyKey of manifest.strategySlots) {
      assert.ok(progress.progressByStrategy[strategyKey], `${stageId} should expose ${strategyKey} progress`);
      assert.ok(progress.strategyDescriptions[strategyKey], `${stageId} should expose ${strategyKey} description`);
      for (const metricName of [
        "kills",
        "fixedTargetsDestroyed",
        "rewardsCollected",
        "clearTimeFrames",
        "clearTimeSeconds",
        "maxProgress"
      ]) {
        assert.ok(
          metricName in progress.progressByStrategy[strategyKey].summary,
          `${stageId} ${strategyKey} should expose ${metricName}`
        );
      }
    }

    if (stageNumber > 1) {
      assert.equal(progress.status, "unstarted");
      assert.equal(progress.runs.length, 0, `${stageId} should not fake historical runs`);
      assert.equal(progress.stageSummary[stageId].summary.trainingRuns.value, null);
      assert.equal(progress.progressByStrategy["survival-v0"].summary.trainingRuns.value, null);
    }
  }
});

test("ledger appends a runtime report and recomputes human-time summary", () => {
  const progress = {
    schemaVersion: "1.0.0",
    packId: "contra-stage1-strategy-v0",
    stageId: "stage-1",
    policy: { timeUnit: "seconds", frameRate: 60 },
    progressByStrategy: {
      "survival-v0": {
        status: "candidate",
        summary: {
          trainingRuns: metric(30),
          deaths: { value: null, status: "unverified" },
          trainingTimeSeconds: metric(233.33),
          clearProgress: {
            value: "W2366 / W2960",
            status: "candidate",
            maxWorldX: 2366,
            targetWorldX: 2960
          }
        }
      }
    },
    runs: [
      {
        runId: "existing",
        strategyKey: "survival-v0",
        side: "1P",
        frames: 14000,
        durationSeconds: 233.33,
        runCount: 30,
        maxWorldX: 2366,
        targetWorldX: 2960,
        deaths: null,
        status: "candidate"
      }
    ]
  };
  const report = {
    schema: "fc-ai-headless-runtime-smoke-v1",
    source: { kind: "headless-jsnes-runtime-smoke", tasIsController: false },
    status: "active",
    reason: "gameplay-detected",
    frameCount: 1200,
    strategyKey: "survival-v0",
    maxProgressSnapshot: { worldX: 2500, deathFlag: 0 },
    finalSnapshot: { worldX: 2480, deathFlag: 0 },
    rom: { headerlessMd5: "test-rom" }
  };

  const updated = appendRuntimeTrainingReport(progress, report, {
    now: "2026-06-11T08:00:00.000Z",
    runId: "new-run",
    side: "1P",
    targetWorldX: 2960
  });

  assert.equal(updated.runs.length, 2);
  assert.equal(updated.runs[1].runId, "new-run");
  assert.equal(updated.runs[1].durationSeconds, 20);
  assert.equal(updated.runs[1].activeFrame, null);
  assert.equal(updated.runs[1].lostActiveFrame, null);
  assert.equal(updated.runs[1].maxWorldX, 2500);
  assert.equal(updated.runs[1].finalWorldX, 2480);
  assert.equal(updated.stageSummary["stage-1"].summary.trainingRuns.value, 31);
  assert.equal(updated.stageSummary["stage-1"].summary.knownDeaths.value, 0);
  assert.equal(updated.stageSummary["stage-1"].summary.unknownDeathRuns.value, 30);
  assert.equal(updated.stageSummary["stage-1"].summary.recordedRunTimeSeconds.value, 253.33);
  assert.equal(updated.stageSummary["stage-1"].summary.clearProgress.value, "W2500 / W2960");
  assert.equal(updated.stageSummary["stage-1"].summary.clearTimeSeconds.value, null);
  assert.equal(updated.progressByStrategy["survival-v0"].summary.trainingRuns.value, 31);
  assert.equal(updated.progressByStrategy["survival-v0"].summary.trainingTimeSeconds.value, 253.33);
  assert.equal(updated.progressByStrategy["survival-v0"].summary.clearProgress.value, "W2500 / W2960");
  assert.equal(updated.progressByStrategy["survival-v0"].summary.deaths.value, null);
});

test("ledger appends runtime reports to the selected stage instead of hard-coding stage 1", () => {
  const progress = {
    schemaVersion: "1.0.0",
    packId: "contra-stage1-strategy-v0",
    stageId: "stage-2",
    policy: { timeUnit: "seconds", frameRate: 60 },
    stageSummary: {
      "stage-2": {
        status: "unstarted",
        dataMode: "measured-ledger-only",
        summary: {
          trainingRuns: metric(null, "unverified"),
          knownDeaths: metric(null, "unverified"),
          unknownDeathRuns: metric(null, "unverified"),
          recordedRunTimeSeconds: metric(null, "unverified"),
          clearProgress: metric(null, "unverified"),
          clearTimeSeconds: metric(null, "unverified"),
          clearTimeFrames: metric(null, "unverified")
        }
      }
    },
    progressByStrategy: {},
    runs: []
  };
  const report = {
    schema: "fc-ai-headless-runtime-smoke-v1",
    source: { kind: "headless-jsnes-runtime-smoke", tasIsController: false },
    status: "active",
    reason: "gameplay-detected",
    frameCount: 600,
    strategyKey: "survival-v0",
    maxProgressSnapshot: { worldX: 120, deathFlag: 0 },
    finalSnapshot: { worldX: 120, deathFlag: 0 }
  };

  const updated = appendRuntimeTrainingReport(progress, report, {
    now: "2026-06-11T09:00:00.000Z",
    runId: "stage-2-run",
    side: "1P",
    stageId: "stage-2",
    targetWorldX: 2000
  });

  assert.equal(updated.stageId, "stage-2");
  assert.equal(updated.runs[0].stageId, "stage-2");
  assert.equal(updated.stageSummary["stage-2"].summary.trainingRuns.value, 1);
  assert.equal(updated.stageSummary["stage-2"].summary.clearProgress.value, "W120 / W2000");
  assert.equal(updated.stageSummary["stage-1"], undefined);
});

test("ledger prefers no-death progress over post-death max progress", () => {
  const progress = {
    schemaVersion: "1.1.0",
    packId: "test-pack",
    gameProfileId: "contra",
    romProfileId: "contra-j-good",
    stageId: "stage-1",
    policy: {},
    stageSummary: {},
    progressByStrategy: {
      "survival-v0": {
        status: "candidate",
        summary: {
          clearProgress: { targetWorldX: 3300 }
        }
      }
    },
    runs: []
  };
  const report = {
    schema: "fc-ai-headless-runtime-smoke-v1",
    source: { kind: "headless-jsnes-runtime-smoke", tasIsController: false },
    status: "lost-active",
    reason: "gameplay-lost",
    frameCount: 5000,
    lostActiveFrame: 2500,
    strategyKey: "survival-v0",
    maxNoDeathProgressSnapshot: { frame: 2499, worldX: 1762, deathFlag: 0 },
    maxProgressSnapshot: { frame: 4200, worldX: 2160, deathFlag: 1 },
    finalSnapshot: { frame: 5000, worldX: 82, deathFlag: 1 }
  };

  const updated = appendRuntimeTrainingReport(progress, report, {
    now: "2026-06-11T08:00:00.000Z",
    runId: "death-after-progress",
    side: "1P",
    targetWorldX: 3300
  });

  assert.equal(updated.runs[0].maxWorldX, 1762);
  assert.equal(updated.runs[0].maxWorldFrame, 2499);
  assert.equal(updated.progressByStrategy["survival-v0"].summary.clearProgress.value, "W1762 / W3300");
});

test("death inference is conservative", () => {
  assert.equal(inferRuntimeReportDeaths({ lostActiveSnapshot: { deathFlag: 1 } }), 1);
  assert.equal(inferRuntimeReportDeaths({ status: "active", finalSnapshot: { deathFlag: 0 } }), 0);
  assert.equal(inferRuntimeReportDeaths({ status: "lost-active", reason: "gameplay-lost", finalSnapshot: { deathFlag: 0 } }), null);
});

test("summary keeps clear progress and elapsed seconds as facts", () => {
  const summary = summarizeTrainingProgress([
    { strategyKey: "survival-v0", runCount: 1, durationSeconds: 10, maxWorldX: 100, targetWorldX: 2960, deaths: 0 },
    { strategyKey: "survival-v0", runCount: 1, durationSeconds: 20, maxWorldX: 120, targetWorldX: 2960, deaths: 0 }
  ], "survival-v0");
  assert.equal(summary.trainingRuns.value, 2);
  assert.equal(summary.deaths.value, 0);
  assert.equal(summary.trainingTimeSeconds.value, 30);
  assert.equal(summary.clearProgress.value, "W120 / W2960");
});

test("ledger script can wrap headless runtime without changing the smoke script into a writer", () => {
  assert.match(scriptSource, /spawnSync/);
  assert.match(scriptSource, /headless-runtime-smoke\.mjs/);
  assert.match(scriptSource, /buildStageSummary/);
  assert.match(scriptSource, /historicalEstimate/);
  assert.match(scriptSource, /replace\(\/\^\\uFEFF\/,\s*""\)/);
  assert.match(scriptSource, /--report=/);
  assert.match(scriptSource, /--dry-run/);
  assert.match(scriptSource, /writeFileSync/);
  assert.equal(formatSecondsForProgress(233.333), 233.33);
});
