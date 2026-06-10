import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  const outputText = transpiled.outputText.replace(/from "\.\/([^"]+)"/g, (_match, specifier) => {
    const dependencyPath = path.join(path.dirname(modulePath), `${specifier}.ts`);
    return `from "${importTypeScriptModuleUrl(dependencyPath)}"`;
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(dataUrl);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function importTypeScriptModuleUrl(modulePath) {
  const source = fs.readFileSync(modulePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const outputText = transpiled.outputText.replace(/from "\.\/([^"]+)"/g, (_match, specifier) => {
    const dependencyPath = path.join(path.dirname(modulePath), `${specifier}.ts`);
    return `from "${importTypeScriptModuleUrl(dependencyPath)}"`;
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const {
  createContraSegmentCandidateSearchReport,
  runtimeSmokeReportToSegmentAttempt
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/contraSegmentCandidateSearch.ts"));

test("runtime smoke result is converted into a segment attempt with death and progress evidence", () => {
  const attempt = runtimeSmokeReportToSegmentAttempt({
    candidateTrial: "w1721-airborne-upper-preclear-right-fire",
    fragmentPrefix: "candidate-fragment-1p-survival-v0",
    frameCount: 14000,
    report: {
      status: "lost-active",
      reason: "gameplay-lost",
      lostActiveFrame: 12673,
      progressStallFrames: 0,
      finalSnapshot: { worldX: 82 },
      maxProgressSnapshot: { worldX: 1821 }
    }
  });

  assert.equal(attempt.attemptId, "w1721-airborne-upper-preclear-right-fire-runtime-trial");
  assert.equal(attempt.candidateFragmentId, "candidate-fragment-1p-survival-v0-w1721-airborne-upper-preclear-right-fire");
  assert.equal(attempt.deathCount, 1);
  assert.equal(attempt.frameCount, 14000);
  assert.equal(attempt.finalProgression, 82);
  assert.equal(attempt.maxProgression, 1821);
  assert.equal(attempt.progressStallFrames, 0);
  assert.equal(attempt.stuckLoop, false);
  assert.equal(attempt.runtimeEvidence.status, "lost-active");
  assert.equal(attempt.runtimeEvidence.lostActiveFrame, 12673);
});

test("contra segment candidate search report ranks headless runtime candidates without promoting them", () => {
  const report = createContraSegmentCandidateSearchReport({
    candidates: [
      {
        candidateTrial: "death-window",
        report: {
          status: "lost-active",
          lostActiveFrame: 8000,
          progressStallFrames: 0,
          finalSnapshot: { worldX: 82 },
          maxProgressSnapshot: { worldX: 1600 }
        }
      },
      {
        candidateTrial: "stable-window",
        report: {
          status: "active",
          lostActiveFrame: null,
          progressStallFrames: 20,
          finalSnapshot: { worldX: 2050 },
          maxProgressSnapshot: { worldX: 2050 }
        }
      },
      {
        candidateTrial: "stalled-window",
        report: {
          status: "stalled-active",
          lostActiveFrame: null,
          progressStallFrames: 980,
          finalSnapshot: { worldX: 1900 },
          maxProgressSnapshot: { worldX: 1900 }
        }
      }
    ],
    createdAt: "2026-06-10T10:00:00.000Z",
    frameCount: 14000,
    fragmentPrefix: "candidate-fragment-1p-survival-v0",
    gameProfileId: "contra",
    romProfileId: "contra-us-good",
    side: "1P",
    stageId: "stage-1",
    segment: {
      id: "contra-us-stage1-survival-batch-search",
      progressionMetric: "progression.primary",
      progressionStart: 1120,
      progressionEnd: 2048,
      strategyKey: "survival-v0"
    }
  });

  assert.equal(report.schema, "fc-ai-segmented-training-search-report-v1");
  assert.equal(report.bestAttempt?.attemptId, "stable-window-runtime-trial");
  assert.equal(report.bestAttempt?.gateStatus, "candidate");
  assert.equal(report.validationStatus, "missing");
  assert.deepEqual(report.rejectedAttempts.map((attempt) => attempt.attemptId), [
    "death-window-runtime-trial",
    "stalled-window-runtime-trial"
  ]);
});

test("contra segment candidate search rejects runtime execution errors", () => {
  const report = createContraSegmentCandidateSearchReport({
    candidates: [
      {
        candidateTrial: "spawn-blocked",
        report: {
          status: "error",
          reason: "spawnSync node EPERM",
          frameCount: 1200
        }
      }
    ],
    createdAt: "2026-06-10T10:05:00.000Z",
    frameCount: 1200,
    fragmentPrefix: "candidate-fragment-1p-survival-v0",
    gameProfileId: "contra",
    romProfileId: "contra-us-good",
    side: "1P",
    stageId: "stage-1",
    segment: {
      id: "contra-us-stage1-survival-batch-search",
      progressionMetric: "progression.primary",
      progressionStart: 1120,
      progressionEnd: 2048,
      strategyKey: "survival-v0"
    }
  });

  assert.equal(report.bestAttempt, null);
  assert.equal(report.rejectedAttempts[0].attemptId, "spawn-blocked-runtime-trial");
  assert.equal(report.rejectedAttempts[0].gateStatus, "rejected");
  assert.ok(report.rejectedAttempts[0].rejectionReasons.includes("desync"));
  assert.equal(report.rejectedAttempts[0].runtimeEvidence.status, "error");
});

test("contra segment candidate search CLI can dry-run candidate runtime commands", () => {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, "scripts/contra-segment-candidate-search.mjs"),
    "--dry-run",
    "--candidate=alpha-window",
    "--candidate=beta-window",
    "--frames=1234"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schema, "fc-ai-contra-segment-candidate-search-run-v1");
  assert.equal(output.dryRun, true);
  assert.equal(output.candidates.length, 2);
  assert.deepEqual(output.candidates.map((candidate) => candidate.candidateTrial), [
    "alpha-window",
    "beta-window"
  ]);
  assert.ok(output.candidates[0].command.includes("--probe=route-plan"));
  assert.ok(output.candidates[0].command.includes("--strategy=survival-v0"));
  assert.ok(output.candidates[0].command.includes("--frames=1234"));
  assert.ok(output.candidates[0].command.includes("--candidate-trial=alpha-window"));
});
