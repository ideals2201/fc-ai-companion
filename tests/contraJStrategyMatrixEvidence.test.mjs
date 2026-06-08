import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const matrixCases = [
  {
    path: "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-survival-v0-death-worldx2087.json",
    strategy: "survival-v0",
    runId: "matrix-survival-20260608",
    worldX: 2087,
    score: 2400,
    input: "up+B"
  },
  {
    path: "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-speedrun-v0-death-worldx625.json",
    strategy: "speedrun-v0",
    runId: "matrix-speedrun-20260608",
    worldX: 625,
    score: 1800,
    input: "down+right+A+B"
  },
  {
    path: "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-combat-v0-death-worldx286.json",
    strategy: "combat-v0",
    runId: "matrix-combat-detail-20260608",
    worldX: 286,
    score: 100,
    input: "A+B"
  },
  {
    path: "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-loot-v0-death-worldx1943.json",
    strategy: "loot-v0",
    runId: "matrix-loot-20260608",
    worldX: 1943,
    score: 4300,
    input: "right+A+B"
  },
  {
    path: "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-guard-v0-death-worldx2038.json",
    strategy: "guard-v0",
    runId: "matrix-guard-20260608",
    worldX: 2038,
    score: 4700,
    input: "B"
  }
];

function readJson(path) {
  return JSON.parse(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
}

test("Contra Japan strategy matrix archives every standard strategy botrun as TraceEvidence", () => {
  for (const expected of matrixCases) {
    const evidence = readJson(expected.path);

    assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
    assert.equal(evidence.gameProfileId, "contra");
    assert.equal(evidence.romProfileId, "contra-j-good");
    assert.equal(evidence.stageId, "stage-1");
    assert.equal(evidence.strategyKey, expected.strategy);
    assert.equal(evidence.sourceRunId, expected.runId);
    assert.equal(evidence.sourceReport.botStatus, "death");
    assert.equal(evidence.sourceReport.finalWorldX, expected.worldX);
    assert.equal(evidence.sourceReport.finalScore, expected.score);
    assert.equal(evidence.death.worldX, expected.worldX);
    assert.equal(evidence.death.input, expected.input);
    assert.equal(evidence.branchOutcome, "strategy-matrix-failed-stop");
    assert.equal(evidence.source.tasIsController, false);
  }
});
