import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proposalPath = "data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster.json";
const bestEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-boss-approach-early-pit-jump-death-worldx2174.json";
const rejectedEvidencePath = "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-boss-approach-high-air-contact-death-worldx2160.json";
const sideBaselinesPath = "data/training/contra/tas_bases/contra-j-good/side-baselines.json";
const handoffManifestPath = "strategy-packs/contra/dev-handoff/current-training-20260608/handoff-manifest.json";

function fullPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(fullPath(relativePath), "utf8"));
}

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

const {
  createComparativeStrategyFragmentProposal
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyFragmentProposal.ts", import.meta.url));

test("Contra Japan boss-approach high-air cluster has a comparative candidate fragment proposal", () => {
  const proposal = readJson(proposalPath);
  const bestEvidence = readJson(bestEvidencePath);
  const rejectedEvidence = readJson(rejectedEvidencePath);
  const sideBaselines = readJson(sideBaselinesPath);
  const handoffManifest = readJson(handoffManifestPath);

  assert.equal(proposal.schema, "fc-ai-strategy-fragment-proposal-v1");
  assert.equal(proposal.schemaVersion, "1.0.0");
  assert.equal(proposal.fragment.id, "candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster");
  assert.equal(proposal.fragment.status, "candidate");
  assert.ok(proposal.fragment.strategyTypes.includes("combat"));
  assert.ok(proposal.fragment.strategyTypes.includes("recovery"));
  assert.deepEqual(proposal.fragment.progressionWindow, {
    metric: "progression.primary",
    start: 2040,
    end: 2174,
    unit: "ContraWorldPixels",
    strictEnd: true
  });

  assert.equal(proposal.fragment.source.traceEvidence.fragmentId, bestEvidence.fragmentId);
  assert.equal(proposal.fragment.source.traceEvidence.branchOutcome, "route-class-progressed-failed-stop");
  assert.equal(proposal.fragment.source.rejectedTraceEvidence[0].fragmentId, rejectedEvidence.fragmentId);
  assert.equal(proposal.fragment.source.rejectedTraceEvidence[0].branchOutcome, "route-class-regressed-failed-stop");
  assert.equal(proposal.fragment.source.rejectedTraceEvidence[0].routeClass, "runtime-patch:stage-one-boss-approach-high-air-contact");
  assert.equal(proposal.fragment.source.tasSideBaseline.path, sideBaselinesPath);
  assert.equal(proposal.fragment.source.tasSideBaseline.windowId, "boss-approach-platform-capture");
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.ok(sideBaselines.baselines.some((baseline) => baseline.side === "1P" && baseline.windowId === "boss-approach-platform-capture"));

  assert.equal(proposal.fragment.actionAdvice.parameters.prohibitedRouteClass, "runtime-patch:stage-one-boss-approach-high-air-contact");
  assert.equal(proposal.fragment.actionAdvice.parameters.requiredValidation, "real-runtime-trace");
  assert.ok(proposal.fragment.safetyOverrides.includes("rejected-route-class-guard"));
  assert.ok(proposal.fragment.safetyOverrides.includes("tas-desync-guard"));
  assert.equal("buttons" in proposal.fragment.actionAdvice, false);

  assert.ok(
    handoffManifest.candidateFragmentRefs.includes(proposalPath),
    "current handoff package should index the high-air cluster candidate proposal"
  );
});

test("Contra Japan boss-approach high-air cluster proposal is generated from current evidence and TAS baseline", () => {
  const proposal = readJson(proposalPath);
  const bestEvidence = readJson(bestEvidencePath);
  const rejectedEvidence = readJson(rejectedEvidencePath);
  const sideBaselines = readJson(sideBaselinesPath);
  const baseline = sideBaselines.baselines.find((candidate) => (
    candidate.side === "1P" && candidate.windowId === "boss-approach-platform-capture"
  ));

  assert.ok(baseline, "1P boss-approach platform-capture TAS baseline should exist");

  const expected = createComparativeStrategyFragmentProposal({
    evidence: bestEvidence,
    rejectedEvidence: [rejectedEvidence],
    id: "candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster",
    label: "Boss approach high-air cluster candidate",
    progressionWindow: {
      metric: "progression.primary",
      start: 2040,
      end: 2174,
      unit: "ContraWorldPixels",
      strictEnd: true
    },
    strategyTypes: ["survival", "combat", "recovery"],
    tasSideBaseline: baseline,
    tasSideBaselinePath: sideBaselinesPath
  });

  assert.deepEqual(proposal, expected);
});
