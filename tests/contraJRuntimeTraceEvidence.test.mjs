import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const candidateProposalPath = "data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json";
const evidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json";
const recoveryEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-mid-fixed-recovery-death-worldx2087.json";
const sideBaselinesPath = "data/training/contra/tas_bases/contra-j-good/side-baselines.json";

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

test("Contra Japan AI mid fixed-threat death is archived as standard runtime TraceEvidence", () => {
  const evidence = readJson(evidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.side, "1P");
  assert.equal(evidence.fragmentId, "candidate-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068");
  assert.equal(evidence.failureId, "contra-j-stage1-w2068-mid-fixed-threat-death");
  assert.equal(evidence.routeClass, "training:survival-v0:ai-run-mid-fixed-threat");
  assert.equal(evidence.source.kind, "browser-ai-botrun");
  assert.equal(evidence.source.tasIsController, false);
  assert.equal(evidence.sourceRunId, "post-fragment-j-check-20260608");
  assert.match(evidence.sourceUrl, /rom=contra-j%2FContra%20\(J\)\.nes/);

  assert.deepEqual(evidence.progressionWindow, {
    metric: "progression.primary",
    start: 1444,
    end: 2073,
    unit: "ContraWorldPixels"
  });
  assert.equal(evidence.sampleCount, 900);
  assert.equal(evidence.startWorldX, 1447);
  assert.equal(evidence.endWorldX, 2068);
  assert.equal(evidence.maxWorldX, 2073);
  assert.equal(evidence.death.worldX, 2068);
  assert.equal(evidence.death.playerX, 123);
  assert.equal(evidence.death.playerY, 134);
  assert.equal(evidence.death.input, "down+B");
  assert.equal(evidence.branchOutcome, "route-class-failed-stop");
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.reason, "death-count");
  assert.equal(evidence.sourceReport.frameCount, 3986);
  assert.equal(evidence.sourceReport.finalWorldX, 2068);
  assert.equal(evidence.sourceReport.primaryThreat, "slot15:type0x07@118,160/hp6");
  assert.equal(evidence.inputSummary["up+right+B"], 293);
  assert.ok(evidence.topEnemies.some((enemy) => enemy.fixed && enemy.hp === 240));
  assert.match(evidence.interpretation, /not pass/i);
});

test("Contra Japan AI fixed-threat failure has a TAS-derived candidate correction proposal", () => {
  const evidence = readJson(evidencePath);
  const sideBaselines = readJson(sideBaselinesPath);
  const baseline = sideBaselines.baselines.find((candidate) => (
    candidate.side === "1P" && candidate.windowId === "fixed-threat-route"
  ));
  assert.ok(baseline, "matching 1P fixed-threat TAS side baseline should exist");

  const expected = createCandidateStrategyFragmentProposal({
    evidence,
    tasSideBaseline: baseline,
    tasSideBaselinePath: sideBaselinesPath
  });
  const proposal = readJson(candidateProposalPath);

  assert.deepEqual(proposal, expected);
  assert.equal(proposal.fragment.status, "candidate");
  assert.ok(proposal.fragment.strategyTypes.includes("fixed-threat-hp-lock"));
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.equal(proposal.fragment.source.traceEvidence.branchOutcome, "route-class-failed-stop");
  assert.equal("buttons" in proposal.fragment.actionAdvice, false);
});

test("Contra Japan mid fixed-threat recovery run is archived when it still dies", () => {
  const evidence = readJson(recoveryEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.fragmentId, "candidate-1p-survival-v0-mid-fixed-recovery-death-worldx2087");
  assert.equal(evidence.failureId, "contra-j-stage1-w2087-mid-fixed-recovery-death");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-mid-fixed-threat-recovery");
  assert.equal(evidence.sourceRunId, "mid-fixed-recovery-check-20260608");
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.finalWorldX, 2087);
  assert.equal(evidence.sourceReport.lastInput, "right+A+B");
  assert.equal(evidence.sourceReport.primaryThreat, "slot14:type0x07@232,64/hp8");
  assert.equal(evidence.sampleCount, 900);
  assert.equal(evidence.death.worldX, 2087);
  assert.equal(evidence.death.input, "right+A+B");
  assert.equal(evidence.branchOutcome, "route-class-failed-stop");
  assert.ok(evidence.inputSummary["right+A+B"] > 60);
  assert.match(evidence.interpretation, /still dies/i);
});
