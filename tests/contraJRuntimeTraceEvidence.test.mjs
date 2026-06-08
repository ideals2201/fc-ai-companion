import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const candidateProposalPath = "data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json";
const combatOpeningStallEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-opening-low-fixed-stall-worldx286.json";
const combatOpeningRightDownDeathEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-opening-right-down-death-worldx290.json";
const combatOpeningRightOnlyDeathEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-opening-right-only-death-worldx290.json";
const combatOpeningDescentCarryDeathEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-opening-descent-carry-death-worldx626.json";
const combatBridgeLowFixedCrowdDeathEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-bridge-low-fixed-crowd-death-worldx1943.json";
const evidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json";
const highStationEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-mid-fixed-high-station-death-worldx2087.json";
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

test("Contra Japan high fixed-threat station run is archived when it still dies", () => {
  const evidence = readJson(highStationEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.fragmentId, "candidate-1p-survival-v0-mid-fixed-high-station-death-worldx2087");
  assert.equal(evidence.failureId, "contra-j-stage1-w2087-mid-fixed-high-station-death");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-mid-fixed-threat-high-station");
  assert.equal(evidence.sourceRunId, "mid-fixed-high-station-check-20260608b");
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.finalWorldX, 2087);
  assert.equal(evidence.sourceReport.finalScore, 2400);
  assert.equal(evidence.sourceReport.lastInput, "up+B");
  assert.equal(evidence.sourceReport.actionLock, "aim-fire:6");
  assert.equal(evidence.sourceReport.primaryThreat, "slot14:type0x07@232,64/hp8");
  assert.equal(evidence.sampleCount, 900);
  assert.equal(evidence.death.worldX, 2087);
  assert.equal(evidence.death.input, "up+B");
  assert.equal(evidence.death.lastAlive.input, "none");
  assert.equal(evidence.branchOutcome, "route-class-failed-stop");
  assert.ok(evidence.inputSummary["up+B"] > 140);
  assert.match(evidence.interpretation, /still dies/i);
});

test("Contra Japan combat opening low fixed-threat patch is archived when it stalls", () => {
  const evidence = readJson(combatOpeningStallEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.strategyKey, "combat-v0");
  assert.equal(evidence.fragmentId, "candidate-1p-combat-v0-opening-low-fixed-stall-worldx286");
  assert.equal(evidence.failureId, "contra-j-stage1-combat-w286-opening-low-fixed-stall");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-opening-low-fixed-threat");
  assert.equal(evidence.source.previousFailureEvidence, "data/training/contra/runtime_runs/contra-j-good/trace-evidence/matrix-1p-combat-v0-death-worldx286.json");
  assert.equal(evidence.sourceRunId, "combat-opening-low-fixed-check-20260608");
  assert.equal(evidence.source.tasIsController, false);
  assert.equal(evidence.sourceReport.botStatus, "stopped");
  assert.equal(evidence.sourceReport.reason, "max-frames");
  assert.equal(evidence.sourceReport.deaths, 0);
  assert.equal(evidence.sourceReport.finalWorldX, 286);
  assert.equal(evidence.sourceReport.lastInput, "down+B");
  assert.equal(evidence.sourceReport.primaryThreat, "slot13:type0x06@163,196/hp1");
  assert.equal(evidence.stall.worldX, 286);
  assert.equal(evidence.stall.input, "down+B");
  assert.equal(evidence.branchOutcome, "route-class-stalled-stop");
  assert.ok(evidence.topEnemies.some((enemy) => enemy.type === 6 && enemy.hp === 1 && enemy.fixed));
  assert.match(evidence.interpretation, /not validated/i);
});

test("Contra Japan combat opening right-down variant is archived when it dies", () => {
  const evidence = readJson(combatOpeningRightDownDeathEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.strategyKey, "combat-v0");
  assert.equal(evidence.fragmentId, "candidate-1p-combat-v0-opening-right-down-death-worldx290");
  assert.equal(evidence.failureId, "contra-j-stage1-combat-w290-opening-right-down-death");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-opening-low-fixed-threat-right-down");
  assert.equal(evidence.source.runtimePatchVariant, "right-down-fire");
  assert.equal(evidence.sourceRunId, "combat-opening-right-down-check-20260608");
  assert.equal(evidence.source.tasIsController, false);
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.reason, "death-count");
  assert.equal(evidence.sourceReport.deaths, 1);
  assert.equal(evidence.sourceReport.finalWorldX, 290);
  assert.equal(evidence.sourceReport.lastInput, "down+right+B");
  assert.equal(evidence.sourceReport.primaryThreat, "slot13:type0x06@159,196/hp1");
  assert.equal(evidence.sampleCount, 900);
  assert.equal(evidence.gameplaySampleCount, 312);
  assert.equal(evidence.death.worldX, 290);
  assert.equal(evidence.death.lastAlive.input, "down+right+B");
  assert.equal(evidence.branchOutcome, "route-class-failed-stop");
  assert.ok(evidence.inputSummary["down+right+B"] > 40);
  assert.match(evidence.interpretation, /rejects direct promotion/i);
});

test("Contra Japan combat opening right-only variant is archived when descent still kills it", () => {
  const evidence = readJson(combatOpeningRightOnlyDeathEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.strategyKey, "combat-v0");
  assert.equal(evidence.fragmentId, "candidate-1p-combat-v0-opening-right-only-death-worldx290");
  assert.equal(evidence.failureId, "contra-j-stage1-combat-w290-opening-right-only-death");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-opening-low-fixed-threat-right-only");
  assert.equal(evidence.source.runtimePatchVariant, "right-only");
  assert.equal(evidence.sourceRunId, "combat-opening-right-only-check-20260608");
  assert.equal(evidence.source.tasIsController, false);
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.reason, "death-count");
  assert.equal(evidence.sourceReport.finalWorldX, 290);
  assert.equal(evidence.sourceReport.lastInput, "right");
  assert.equal(evidence.death.lastAlive.input, "right");
  assert.equal(evidence.lastTwentyFramePattern.dominantInput, "down+A+B before late right-only recovery");
  assert.equal(evidence.branchOutcome, "route-class-failed-stop");
  assert.ok(evidence.inputSummary["down+A+B"] > 20);
  assert.match(evidence.interpretation, /opening descent carry/i);
});

test("Contra Japan combat opening descent-carry patch is archived when it progresses to the bridge blocker", () => {
  const evidence = readJson(combatOpeningDescentCarryDeathEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.strategyKey, "combat-v0");
  assert.equal(evidence.fragmentId, "candidate-1p-combat-v0-opening-descent-carry-death-worldx626");
  assert.equal(evidence.failureId, "contra-j-stage1-combat-w626-bridge-low-fixed-threat-death");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-opening-low-fixed-threat-descent-carry");
  assert.equal(evidence.source.runtimePatchVariant, "descent-carry-right-only");
  assert.equal(evidence.source.previousFailureEvidence, combatOpeningRightOnlyDeathEvidencePath);
  assert.equal(evidence.source.tasIsController, false);
  assert.equal(evidence.sourceRunId, "combat-opening-descent-carry-y-check-20260608");
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.reason, "death-count");
  assert.equal(evidence.sourceReport.finalWorldX, 626);
  assert.equal(evidence.sourceReport.finalScore, 1700);
  assert.equal(evidence.sourceReport.finalWeapon, 16);
  assert.equal(evidence.sourceReport.lastInput, "down+right+A+B");
  assert.equal(evidence.sourceReport.routeSegment, "bridge-clear");
  assert.equal(evidence.sourceReport.primaryThreat, "slot15:type0x06@143,196/hp1");
  assert.equal(evidence.sampleCount, 900);
  assert.equal(evidence.gameplaySampleCount, 900);
  assert.equal(evidence.death.worldX, 626);
  assert.equal(evidence.death.lastAlive.worldX, 625);
  assert.equal(evidence.death.input, "down+right+A+B");
  assert.equal(evidence.branchOutcome, "route-class-progressed-failed-stop");
  assert.ok(evidence.progressionDelta.worldX >= 336);
  assert.ok(evidence.inputSummary["right+B"] > 170);
  assert.ok(evidence.topEnemies.some((enemy) => enemy.slot === 15 && enemy.type === 6 && enemy.fixed));
  assert.match(evidence.interpretation, /not validated/i);
  assert.match(evidence.interpretation, /WorldX 626/i);
});

test("Contra Japan combat bridge low fixed crowd patch is archived when it progresses to the danger blocker", () => {
  const evidence = readJson(combatBridgeLowFixedCrowdDeathEvidencePath);

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.gameProfileId, "contra");
  assert.equal(evidence.romProfileId, "contra-j-good");
  assert.equal(evidence.stageId, "stage-1");
  assert.equal(evidence.strategyKey, "combat-v0");
  assert.equal(evidence.fragmentId, "candidate-1p-combat-v0-bridge-low-fixed-crowd-death-worldx1943");
  assert.equal(evidence.failureId, "contra-j-stage1-combat-w1943-danger-clear-fall-death");
  assert.equal(evidence.routeClass, "runtime-patch:stage-one-bridge-low-fixed-crowd");
  assert.equal(evidence.source.runtimePatchVariant, "bridge-low-fixed-crowd-down-fire");
  assert.equal(evidence.source.previousFailureEvidence, combatOpeningDescentCarryDeathEvidencePath);
  assert.equal(evidence.source.tasIsController, false);
  assert.equal(evidence.sourceRunId, "combat-bridge-low-fixed-crowd-check-20260608");
  assert.equal(evidence.sourceReport.botStatus, "death");
  assert.equal(evidence.sourceReport.reason, "death-count");
  assert.equal(evidence.sourceReport.finalWorldX, 1943);
  assert.equal(evidence.sourceReport.finalScore, 4500);
  assert.equal(evidence.sourceReport.finalWeapon, 16);
  assert.equal(evidence.sourceReport.lastInput, "right+A+B");
  assert.equal(evidence.sourceReport.routeSegment, "danger-clear");
  assert.equal(evidence.sampleCount, 900);
  assert.equal(evidence.gameplaySampleCount, 900);
  assert.equal(evidence.death.worldX, 1943);
  assert.equal(evidence.death.lastAlive.worldX, 1942);
  assert.equal(evidence.branchOutcome, "route-class-progressed-failed-stop");
  assert.ok(evidence.progressionDelta.worldX >= 1317);
  assert.ok(evidence.inputSummary["up+right+B"] > 450);
  assert.ok(evidence.topEnemies.some((enemy) => enemy.slot === 10 && enemy.type === 2 && enemy.fixed && enemy.hp === 240));
  assert.match(evidence.interpretation, /not validated/i);
  assert.match(evidence.interpretation, /WorldX 1943/i);
});
