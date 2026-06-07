import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const candidateProposalPath = "data/training/contra/tas_bases/contra-j-good/candidate-fragments/candidate-fragment-1p-survival-v0-tas-boss-approach-platform-capture.json";
const evidencePath = "data/training/contra/tas_bases/contra-j-good/trace-evidence/candidate-1p-survival-v0-tas-boss-approach-platform-capture.json";
const sideBaselinesPath = "data/training/contra/tas_bases/contra-j-good/side-baselines.json";
const trainingBasePath = "data/training/contra/tas_bases/contra-j-good/training-base.json";

async function importTypeScriptModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const {
  createCandidateStrategyFragmentProposal
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyFragmentProposal.ts", import.meta.url));

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
  assert.ok(
    trainingBase.derivedArtifacts.candidateFragments.includes(candidateProposalPath),
    "training-base should index TAS-derived candidate fragment proposals"
  );
});

test("Contra Japan TAS boss approach evidence has a generated candidate StrategyFragment proposal", () => {
  const evidence = readJson(evidencePath);
  const sideBaselines = readJson(sideBaselinesPath);
  const baseline = sideBaselines.baselines.find((candidate) => (
    candidate.side === "1P" && candidate.windowId === "boss-approach-platform-capture"
  ));
  assert.ok(baseline, "matching 1P TAS side baseline should exist");

  const expected = createCandidateStrategyFragmentProposal({
    evidence,
    tasSideBaseline: baseline,
    tasSideBaselinePath: sideBaselinesPath
  });
  const proposal = readJson(candidateProposalPath);

  assert.deepEqual(proposal, expected);
  assert.equal(proposal.fragment.status, "candidate");
  assert.ok(proposal.fragment.strategyTypes.includes("platform-capture"));
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.equal("buttons" in proposal.fragment.actionAdvice, false);
});
