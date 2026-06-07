import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const roadmapPath = new URL("../strategy-packs/contra/clearance-roadmap.json", import.meta.url);
const manifestPath = new URL("../strategy-packs/contra/manifest.json", import.meta.url);

const roadmap = JSON.parse(fs.readFileSync(roadmapPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

test("Contra clearance roadmap tracks every stage without pretending validation", () => {
  assert.equal(roadmap.schemaVersion, "1.0.0");
  assert.equal(roadmap.gameProfileId, "contra");
  assert.equal(roadmap.runtimePolicy.tasIsController, false);
  assert.equal(roadmap.runtimePolicy.romFileNotIncluded, true);
  assert.equal(roadmap.runtimePolicy.userMustProvideOwnRom, true);
  assert.ok(roadmap.stages.length >= 8, "Contra roadmap should reserve the full game stage set");

  for (const stage of roadmap.stages) {
    assert.notEqual(stage.validationStatus, "validated", `${stage.stageId} must not be validated without real runtime evidence`);
    const coverageByKey = new Map(stage.strategyCoverage.map((entry) => [entry.strategyKey, entry]));
    for (const strategyKey of manifest.strategyKeys) {
      const coverage = coverageByKey.get(strategyKey);
      assert.ok(coverage, `${stage.stageId} should track ${strategyKey}`);
      assert.match(coverage.clearanceGoal, /no-death|fewest-death/);
      assert.ok(["candidate", "gap"].includes(coverage.status), `${stage.stageId}/${strategyKey} should remain candidate or gap`);
    }
  }
});

test("Contra clearance roadmap links Stage 1 to the candidate matrix and marks later stages as gaps", () => {
  const stage1 = roadmap.stages.find((stage) => stage.stageId === "stage-1");
  assert.equal(stage1?.matrixPath, "strategy-packs/contra/stages/stage-1/strategy-clearance-matrix.json");
  assert.equal(stage1?.validationStatus, "candidate");

  for (const stage of roadmap.stages.filter((entry) => entry.stageId !== "stage-1")) {
    assert.equal(stage.validationStatus, "gap", `${stage.stageId} should stay a gap until TAS/trace evidence exists`);
    assert.ok(stage.nextEvidenceRequired.includes("real runtime trace"), `${stage.stageId} should require real runtime trace`);
  }
});
