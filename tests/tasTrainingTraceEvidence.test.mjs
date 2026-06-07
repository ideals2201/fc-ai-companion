import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const evidencePath = "data/training/contra/tas_bases/contra-j-good/trace-evidence/candidate-1p-survival-v0-tas-boss-approach-platform-capture.json";
const trainingBasePath = "data/training/contra/tas_bases/contra-j-good/training-base.json";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

test("Contra Japan TAS boss approach runtime trace is archived as standard training evidence", () => {
  const evidence = readJson(evidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.side, "1P");
  assert.equal(evidence.fragmentId, "candidate-1p-survival-v0-tas-boss-approach-platform-capture");
  assert.equal(evidence.routeClass, "training:survival-v0:tas-boss-approach-platform-capture");
  assert.equal(evidence.source?.kind, "tas-training-window");
  assert.equal(evidence.source?.tasIsController, false);
  assert.equal(evidence.source?.movieId, "contra-j-2p-any-percent");
  assert.equal(evidence.source?.windowId, "boss-approach-platform-capture");
  assert.deepEqual(evidence.source?.tasFrameWindow, [2500, 3600]);
  assert.equal(evidence.sourceRunId, "tas-boss-approach-platform-capture");
  assert.match(evidence.sourceUrl, /rom=contra-j%2FContra%20\(J\)\.nes/);

  assert.deepEqual(evidence.progressionWindow, {
    metric: "progression.primary",
    start: 2500,
    end: 2960,
    unit: "ContraWorldPixels"
  });
  assert.equal(evidence.sampleCount, 466);
  assert.equal(evidence.startWorldX, 2500);
  assert.equal(evidence.endWorldX, 2960);
  assert.equal(evidence.maxWorldX, 2960);
  assert.equal(evidence.death, null);
  assert.equal(evidence.branchOutcome, "window-complete");
  assert.equal(evidence.sourceReport.deathTraceCount, 0);
  assert.equal(evidence.sourceReport.firstFrame, 2914);
  assert.equal(evidence.sourceReport.lastFrame, 3379);
  assert.equal(evidence.inputSummary.right, 364);
  assert.equal(evidence.inputSummary["right+B"], 55);
  assert.ok(evidence.topEnemies.some((enemy) => enemy.fixed && enemy.hp === 240));
  assert.match(evidence.interpretation, /not validated/i);
});

test("Contra Japan TAS training base indexes archived trace evidence", () => {
  const trainingBase = readJson(trainingBasePath);

  assert.ok(
    trainingBase.derivedArtifacts.traceEvidence.includes(evidencePath),
    "training-base should index TAS-derived training trace evidence"
  );
});
