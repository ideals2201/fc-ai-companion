import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = "data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

test("Contra US W1205 segmented search baseline archives the current stall without validating it", () => {
  const report = readJson(reportPath);
  assert.equal(report.schema, "fc-ai-segmented-training-search-report-v1");
  assert.equal(report.gameProfileId, "contra");
  assert.equal(report.romProfileId, "contra-us-good");
  assert.equal(report.segment.id, "contra-us-stage1-w1205-reward-station");
  assert.equal(report.segment.strategyKey, "survival-v0");
  assert.equal(report.status, "candidate-search");
  assert.equal(report.validationStatus, "missing");
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
  assert.equal(report.bestAttempt, null);
  assert.deepEqual(report.requiredPromotionEvidence, [
    "TraceEvidence",
    "ValidationReport",
    "mode-specific runtime replay"
  ]);

  const baseline = report.attempts.find((attempt) => attempt.attemptId === "survival-v0-route-plan-baseline");
  assert.ok(baseline, "baseline smoke attempt should be archived");
  assert.equal(baseline.gateStatus, "rejected");
  assert.ok(baseline.rejectionReasons.includes("stuck-loop"));
  assert.ok(baseline.riskTags.includes("progress-stall-risk"));
  assert.equal(baseline.maxProgression, 1205);
  assert.equal(baseline.finalProgression, 1154);

  const fallingPriority = report.attempts.find((attempt) => attempt.attemptId === "falling-threat-priority-candidate-trial");
  assert.ok(fallingPriority, "falling-threat priority trial should be archived as a rejected candidate");
  assert.equal(fallingPriority.gateStatus, "rejected");
  assert.ok(fallingPriority.rejectionReasons.includes("death"));
  assert.equal(fallingPriority.maxProgression, 1759);
  assert.equal(fallingPriority.finalProgression, 1174);
  assert.equal(fallingPriority.runtimeEvidence.candidateTrial, "w1205-falling-threat-priority");
  assert.equal(fallingPriority.runtimeEvidence.status, "recovered-after-loss");

  const contactInterrupt = report.attempts.find((attempt) => attempt.attemptId === "falling-threat-contact-interrupt-candidate-trial");
  assert.ok(contactInterrupt, "contact interrupt trial should be archived as a rejected candidate");
  assert.equal(contactInterrupt.gateStatus, "rejected");
  assert.ok(contactInterrupt.rejectionReasons.includes("death"));
  assert.equal(contactInterrupt.maxProgression, 1211);
  assert.equal(contactInterrupt.finalProgression, 82);
  assert.equal(contactInterrupt.runtimeEvidence.candidateTrial, "w1205-falling-threat-contact-interrupt");
  assert.equal(contactInterrupt.runtimeEvidence.status, "lost-active");

  const jumpPreload = report.attempts.find((attempt) => attempt.attemptId === "contact-jump-preload-candidate-trial");
  assert.ok(jumpPreload, "contact jump preload trial should be archived as a rejected candidate");
  assert.equal(jumpPreload.gateStatus, "rejected");
  assert.ok(jumpPreload.rejectionReasons.includes("death"));
  assert.equal(jumpPreload.maxProgression, 1201);
  assert.equal(jumpPreload.finalProgression, 82);
  assert.equal(jumpPreload.runtimeEvidence.candidateTrial, "w1205-contact-jump-preload");
  assert.equal(jumpPreload.runtimeEvidence.status, "lost-active");
});
