import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const candidateProposalPath = "data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-matrix-1p-speedrun-v0-death-worldx625.json";
const draftPath = "data/training/contra/runtime_runs/contra-j-good/runtime-fragments/draft-fragment-matrix-1p-speedrun-v0-death-worldx625.json";
const sideBaselinesPath = "data/training/contra/tas_bases/contra-j-good/side-baselines.json";
const speedrunEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-speedrun-v0-death-worldx625.json";
const stagePlanPath = "strategy-packs/contra/stages/stage-1/stage-plan.json";
const clearanceMatrixPath = "strategy-packs/contra/stages/stage-1/strategy-clearance-matrix.json";

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
  createCandidateStrategyFragmentProposal,
  createStrategyFragmentDraftFromProposal
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyFragmentProposal.ts", import.meta.url));

function speedrunOpeningBaseline() {
  const sideBaselines = readJson(sideBaselinesPath);
  const baseline = sideBaselines.baselines.find((candidate) => (
    candidate.side === "1P" && candidate.windowId === "opening-active"
  ));
  assert.ok(baseline, "matching 1P opening-active TAS side baseline should exist");
  return baseline;
}

test("Contra Japan speedrun candidate reuses TAS opening baseline plus matrix failure evidence", () => {
  const evidence = readJson(speedrunEvidencePath);
  const expected = createCandidateStrategyFragmentProposal({
    evidence,
    tasSideBaseline: speedrunOpeningBaseline(),
    tasSideBaselinePath: sideBaselinesPath
  });
  const proposal = readJson(candidateProposalPath);

  assert.deepEqual(proposal, expected);
  assert.equal(proposal.fragment.status, "candidate");
  assert.equal(proposal.fragment.id, "candidate-fragment-matrix-1p-speedrun-v0-death-worldx625");
  assert.equal(proposal.fragment.source.traceEvidence.fragmentId, "matrix-1p-speedrun-v0-death-worldx625");
  assert.equal(proposal.fragment.source.traceEvidence.branchOutcome, "strategy-matrix-failed-stop");
  assert.equal(proposal.fragment.source.tasSideBaseline.windowId, "opening-active");
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.ok(proposal.fragment.strategyTypes.includes("speed"));
  assert.equal(proposal.fragment.actionAdvice.parameters.routeClass, "strategy-matrix:speedrun-v0");
  assert.equal(proposal.fragment.actionAdvice.parameters.sourceKind, "tas-side-baseline-plus-trace-evidence");
  assert.equal("buttons" in proposal.fragment.actionAdvice, false);
});

test("Contra Japan speedrun reusable candidate has an unvalidated runtime draft", () => {
  const proposal = readJson(candidateProposalPath);
  const expected = createStrategyFragmentDraftFromProposal({
    createdAt: "2026-06-09T01:30:00.000+08:00",
    proposal,
    sourceProposalPath: candidateProposalPath
  });
  const draft = readJson(draftPath);

  assert.deepEqual(draft, expected);
  assert.equal(draft.status, "candidate-unvalidated");
  assert.equal(draft.runtimeUse, "training-fragment-draft");
  assert.equal(draft.sourceProposal.path, candidateProposalPath);
  assert.equal(draft.sourceProposal.fragmentId, proposal.fragment.id);
  assert.equal(draft.sourceProposal.tasIsController, false);
  assert.equal(draft.validation.required, "real-runtime-trace");
  assert.equal(draft.validation.status, "missing");
  assert.deepEqual(draft.validation.reportRefs, []);
});

test("speedrun-v0 package index exposes the reusable candidate without claiming validation", () => {
  const stagePlan = readJson(stagePlanPath);
  const clearanceMatrix = readJson(clearanceMatrixPath);
  const speedrunExport = stagePlan.runtimeExports.find((candidate) => candidate.strategyKey === "speedrun-v0");
  const speedrunClearance = clearanceMatrix.strategyClearance.find((candidate) => candidate.strategyKey === "speedrun-v0");

  assert.ok(speedrunExport, "stage plan should contain speedrun-v0 runtime export");
  assert.deepEqual(speedrunExport.candidateFragments, [candidateProposalPath]);
  assert.deepEqual(speedrunExport.runtimeFragmentDrafts, [draftPath]);
  assert.deepEqual(speedrunExport.trainingEvidence, [speedrunEvidencePath, sideBaselinesPath]);
  assert.equal(speedrunExport.validationStatus, "candidate-unvalidated");
  assert.match(speedrunExport.description, /TAS\/FCEUX baseline candidate/);

  assert.ok(speedrunClearance, "clearance matrix should contain speedrun-v0");
  assert.equal(speedrunClearance.validationStatus, "candidate-unvalidated");
  assert.ok(
    speedrunClearance.evidencePlan.some((entry) => entry.sourceKind === "candidate-fragment" && entry.path === candidateProposalPath),
    "clearance matrix should index the reusable speedrun candidate fragment"
  );
  assert.ok(
    speedrunClearance.evidencePlan.some((entry) => entry.sourceKind === "runtime-fragment-draft" && entry.path === draftPath),
    "clearance matrix should index the unvalidated speedrun runtime draft"
  );
});
