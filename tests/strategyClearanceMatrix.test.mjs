import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const matrixPath = new URL("../strategy-packs/contra/stages/stage-1/strategy-clearance-matrix.json", import.meta.url);
const manifestPath = new URL("../strategy-packs/contra/manifest.json", import.meta.url);

const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

test("stage 1 clearance matrix covers every declared strategy key separately", () => {
  assert.equal(matrix.schemaVersion, "1.0.0");
  assert.equal(matrix.gameProfileId, "contra");
  assert.equal(matrix.stageId, "stage-1");
  assert.equal(matrix.status, "candidate");
  assert.equal(matrix.runtimePolicy.tasIsController, false);
  assert.equal(matrix.runtimePolicy.romFileNotIncluded, true);
  assert.equal(matrix.runtimePolicy.userMustProvideOwnRom, true);

  const entriesByKey = new Map(matrix.strategyClearance.map((entry) => [entry.strategyKey, entry]));
  for (const strategyKey of manifest.strategyKeys) {
    const entry = entriesByKey.get(strategyKey);
    assert.ok(entry, `${strategyKey} should have a clearance entry`);
    assert.ok(["candidate", "candidate-unvalidated"].includes(entry.validationStatus), `${strategyKey} should stay candidate until real runtime validation`);
    assert.match(entry.clearanceGoal, /no-death|fewest-death/, `${strategyKey} should declare a no-death or fewest-death goal`);
    assert.ok(entry.evidencePlan.some((item) => item.sourceKind === "tas-side-baseline" || item.sourceKind === "trace-evidence" || item.status === "gap"), `${strategyKey} should cite TAS, trace evidence, or an explicit evidence gap`);
  }
});

test("stage 1 clearance matrix keeps TAS as evidence, not a controller", () => {
  for (const entry of matrix.strategyClearance) {
    assert.notEqual(entry.controllerSource, "tas", `${entry.strategyKey} must not use TAS as a live controller`);
    for (const plan of entry.evidencePlan) {
      if (plan.sourceKind === "tas-side-baseline") {
        assert.match(plan.path, /^data\/training\/contra\/tas_bases\/contra-j-good\/side-baselines\.json$/, "TAS baseline evidence should use the split side-baselines artifact");
        assert.equal(plan.runtimeUse, "training-evidence-only");
      }
    }
  }
});
