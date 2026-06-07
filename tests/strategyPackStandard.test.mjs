import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contraPackRoot = path.join(repoRoot, "strategy-packs", "contra");
const publicStage1Root = path.join(
  repoRoot,
  "apps",
  "browser-cockpit",
  "public",
  "strategies",
  "contra",
  "stage1"
);

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function assertExists(relativePath) {
  assert.equal(
    fs.existsSync(path.join(repoRoot, relativePath)),
    true,
    `${relativePath} should exist`
  );
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("contra strategy pack has the required 1.0 directory structure", () => {
  [
    "strategy-packs/contra/manifest.json",
    "strategy-packs/contra/game-profile.json",
    "strategy-packs/contra/rom-profiles/contra-us-good.json",
    "strategy-packs/contra/rom-profiles/contra-j-good.json",
    "strategy-packs/contra/research/ram-map.json",
    "strategy-packs/contra/research/condition-registry.json",
    "strategy-packs/contra/research/entity-taxonomy.json",
    "strategy-packs/contra/research/action-map.json",
    "strategy-packs/contra/research/strategy-types.json",
    "strategy-packs/contra/stages/stage-1/stage-plan.json",
    "strategy-packs/contra/stages/stage-1/fragments.json",
    "strategy-packs/contra/stages/stage-1/validation-report.md",
    "strategy-packs/contra/stages/stage-1/known-failures.md",
    "strategy-packs/contra/stages/stage-1/trace-evidence",
    "strategy-packs/contra/schemas/manifest.schema.json",
    "strategy-packs/contra/schemas/runtime-api.schema.json",
    "data/training/contra/tas_bases/contra-j-good/training-base.json",
    "strategy-packs/contra/docs/source-register.md"
  ].forEach(assertExists);
});

test("contra manifest binds the pack to standard 1.0 and candidate status", () => {
  const manifest = readJson("strategy-packs/contra/manifest.json");

  assert.equal(manifest.schemaVersion, "1.0.0");
  assert.equal(manifest.packId, "contra-stage1-strategy-v0");
  assert.equal(manifest.gameProfileId, "contra");
  assert.deepEqual(manifest.romProfileIds, ["contra-us-good", "contra-j-good"]);
  assert.equal(manifest.status, "candidate");
  assert.equal(manifest.standards.strategyProtocol, "1.0.0");
  assert.equal(manifest.files.gameProfile, "game-profile.json");
  assert.equal(manifest.files.conditionRegistry, "research/condition-registry.json");
  assert.equal(manifest.files.stages[0], "stages/stage-1/stage-plan.json");
  assert.deepEqual(manifest.files.tasTrainingBases, [
    "data/training/contra/tas_bases/contra-j-good/training-base.json"
  ]);
});

test("contra stage 1 fragments use protocol 1.0 structure instead of legacy route fields", () => {
  const fragmentsFile = readJson("strategy-packs/contra/stages/stage-1/fragments.json");

  assert.equal(fragmentsFile.schemaVersion, "1.0.0");
  assert.equal(fragmentsFile.gameProfileId, "contra");
  assert.equal(fragmentsFile.romProfileId, "contra-us-good");
  assert.ok(fragmentsFile.fragments.length >= 5);

  for (const fragment of fragmentsFile.fragments) {
    assert.ok(fragment.progressionWindow, `${fragment.id} should define progressionWindow`);
    assert.ok(Array.isArray(fragment.conditions), `${fragment.id} should define conditions`);
    assert.ok(fragment.actionAdvice?.intent, `${fragment.id} should define actionAdvice.intent`);
    assert.ok(Array.isArray(fragment.safetyOverrides), `${fragment.id} should define safetyOverrides`);
    assert.ok(Array.isArray(fragment.exitConditions), `${fragment.id} should define exitConditions`);
    assert.ok(fragment.telemetry?.requiredRefs, `${fragment.id} should define telemetry.requiredRefs`);
    assert.equal("worldStart" in fragment, false, `${fragment.id} should not use worldStart`);
    assert.equal("worldEnd" in fragment, false, `${fragment.id} should not use worldEnd`);
    assert.equal("buttons" in (fragment.actionAdvice ?? {}), false, `${fragment.id} should not use direct buttons`);
  }
});

test("runtime public route files are generated from the standard contra pack", () => {
  const stagePlan = readJson("strategy-packs/contra/stages/stage-1/stage-plan.json");
  const expectedSourceVersion = `${stagePlan.gameProfileId}:${stagePlan.romProfileId}:${stagePlan.strategyPackVersion}`;

  for (const fileName of fs.readdirSync(publicStage1Root).filter((name) => name.endsWith(".json"))) {
    const route = JSON.parse(fs.readFileSync(path.join(publicStage1Root, fileName), "utf8"));
    assert.equal(route.generatedFrom, "strategy-packs/contra");
    assert.equal(route.sourceVersion, expectedSourceVersion);
    assert.equal(route.gameId, "contra");
    assert.equal(route.romProfileId, "contra-us-good");
  }
});

test("contra stage 1 trace evidence files bind failures to machine-readable proof", () => {
  const evidenceDir = path.join(contraPackRoot, "stages", "stage-1", "trace-evidence");
  const knownFailures = readText("strategy-packs/contra/stages/stage-1/known-failures.md");
  const evidenceFiles = fs.readdirSync(evidenceDir).filter((name) => name.endsWith(".json"));

  assert.ok(evidenceFiles.length >= 1, "stage 1 should have at least one trace evidence file");

  for (const fileName of evidenceFiles) {
    const evidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, fileName), "utf8"));
    assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1", `${fileName} should use trace evidence schema v1`);
    assert.equal(evidence.gameProfileId, "contra", `${fileName} should bind to contra`);
    assert.equal(evidence.romProfileId, "contra-us-good", `${fileName} should bind to the verified US ROM profile`);
    assert.equal(evidence.stageId, "stage-1", `${fileName} should bind to stage 1`);
    assert.ok(evidence.fragmentId, `${fileName} should identify the affected fragment`);
    assert.ok(evidence.routeClass, `${fileName} should identify the route class`);
    assert.ok(evidence.progressionWindow?.metric, `${fileName} should define the progression metric`);
    assert.ok(evidence.sampleCount > 0, `${fileName} should include real samples`);
    assert.ok(evidence.branchOutcome, `${fileName} should classify the branch outcome`);
    if (evidence.failureId) {
      assert.ok(knownFailures.includes(evidence.failureId), `${fileName} failureId should appear in known-failures.md`);
    }
  }
});
