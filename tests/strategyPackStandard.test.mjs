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
    "strategy-packs/contra/research/training-scenarios.json",
    "strategy-packs/contra/stages/stage-1/stage-plan.json",
    "strategy-packs/contra/stages/stage-1/fragments.json",
    "strategy-packs/contra/stages/stage-1/validation-report.md",
    "strategy-packs/contra/stages/stage-1/known-failures.md",
    "strategy-packs/contra/stages/stage-1/trace-evidence",
    "strategy-packs/contra/schemas/manifest.schema.json",
    "strategy-packs/contra/schemas/runtime-api.schema.json",
    "strategy-packs/contra/schemas/training-scenarios.schema.json",
    "data/training/contra/tas_bases/contra-j-good/training-base.json",
    "data/training/contra/tas_bases/contra-j-good/side-baselines.json",
    "strategy-packs/contra/docs/source-register.md"
  ].forEach(assertExists);
});

test("contra manifest binds the pack to standard 1.0 and candidate status", () => {
  const manifest = readJson("strategy-packs/contra/manifest.json");

  assert.equal(manifest.schemaVersion, "1.0.0");
  assert.equal(manifest.packId, "contra-stage1-strategy-v0");
  assert.equal(manifest.displayName.zh, "魂斗罗第一关策略包 V0");
  assert.equal(manifest.displayName.en, "Contra Stage 1 Strategy Pack V0");
  assert.equal(manifest.author.displayName, "理想");
  assert.equal(manifest.provenance.creator.displayName, "理想");
  assert.equal(manifest.provenance.latestModifier.displayName, "00号游戏管家");
  assert.ok(manifest.provenance.revisions.length >= 2, "manifest should retain revision history");
  assert.equal(manifest.provenance.revisions[0].revisionId, "contra-stage1-strategy-v0-r001");
  assert.equal(manifest.provenance.revisions.at(-1).validationStatus, "candidate");
  assert.equal(manifest.provenance.revisions.at(-1).snapshotPath, null, "candidate metadata-only revision should not pretend to be rollback-ready");
  assert.equal(manifest.identity.avatarAsset.kind, "preset");
  assert.equal(manifest.identity.avatarAsset.preset, "blue-warrior");
  assert.equal(manifest.gameProfileId, "contra");
  assert.deepEqual(manifest.romProfileIds, ["contra-us-good", "contra-j-good"]);
  assert.equal(manifest.sideScope, "shared");
  assert.deepEqual(manifest.strategySlots, ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"], "current official pack should preserve the five standard category slots");
  assert.deepEqual(manifest.strategyKeys, ["survival-v0", "speedrun-v0"], "current official pack should expose only the survival and speedrun candidate strategies");
  assert.equal(manifest.status, "candidate");
  assert.equal(manifest.standards.strategyProtocol, "1.0.0");
  assert.equal(manifest.files.gameProfile, "game-profile.json");
  assert.equal(manifest.files.conditionRegistry, "research/condition-registry.json");
  assert.equal(manifest.files.trainingScenarios, "research/training-scenarios.json");
  assert.equal(manifest.files.stages[0], "stages/stage-1/stage-plan.json");
  assert.deepEqual(manifest.files.tasTrainingBases, [
    "data/training/contra/tas_bases/contra-j-good/training-base.json"
  ]);
  assert.deepEqual(manifest.files.tasSideBaselines, [
    "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  ]);
});

test("contra manifest exposes per-strategy battle result placeholders without pretending validation", () => {
  const manifest = readJson("strategy-packs/contra/manifest.json");

  assert.ok(manifest.quality.strategyResults, "manifest should expose per-strategy battle result data");

  for (const strategyKey of manifest.strategyKeys) {
    const result = manifest.quality.strategyResults[strategyKey];
    assert.ok(result, `${strategyKey} should have a result record`);
    assert.equal(result.status, "candidate", `${strategyKey} should stay candidate until verified`);
    assert.equal(result.metrics.kills.value, null, `${strategyKey} kills should not be faked`);
    assert.equal(result.metrics.fixedTargetsDestroyed.value, null, `${strategyKey} fixed-target count should not be faked`);
    assert.equal(result.metrics.rewardsCollected.value, null, `${strategyKey} reward count should not be faked`);
    assert.equal(result.metrics.clearTimeFrames.value, null, `${strategyKey} clear time should not be faked`);
    assert.equal(result.metrics.kills.status, "unverified");
    assert.equal(result.metrics.fixedTargetsDestroyed.status, "unverified");
    assert.equal(result.metrics.rewardsCollected.status, "unverified");
    assert.equal(result.metrics.clearTimeFrames.status, "unverified");
  }
});

test("contra training scenarios declare game-specific variables and terminal conditions", () => {
  const scenariosFile = readJson("strategy-packs/contra/research/training-scenarios.json");
  const conditionRegistry = readJson("strategy-packs/contra/research/condition-registry.json");
  const knownRefs = new Set(Object.keys(conditionRegistry.refs));

  assert.equal(scenariosFile.schemaVersion, "1.0.0");
  assert.equal(scenariosFile.gameProfileId, "contra");
  assert.ok(scenariosFile.scenarios.length >= 1);

  for (const scenario of scenariosFile.scenarios) {
    assert.ok(scenario.scenarioId, "scenario should have an id");
    assert.ok(Array.isArray(scenario.variableRefs), `${scenario.scenarioId} should define variableRefs`);
    assert.ok(Array.isArray(scenario.rewardRules), `${scenario.scenarioId} should define rewardRules`);
    assert.ok(Array.isArray(scenario.terminalConditions), `${scenario.scenarioId} should define terminalConditions`);
    assert.ok(Array.isArray(scenario.failureConditions), `${scenario.scenarioId} should define failureConditions`);

    for (const variable of scenario.variableRefs) {
      assert.ok(knownRefs.has(variable.ref), `${scenario.scenarioId} variable ${variable.ref} should exist in condition registry`);
    }
  }
});

test("contra stage 1 fragments use protocol 1.0 structure instead of legacy route fields", () => {
  const fragmentsFile = readJson("strategy-packs/contra/stages/stage-1/fragments.json");
  const strategyTypesFile = readJson("strategy-packs/contra/research/strategy-types.json");
  const declaredStrategyTypes = new Set([
    ...strategyTypesFile.genericTypes,
    ...strategyTypesFile.customTypes.map((type) => type.id)
  ]);

  assert.equal(fragmentsFile.schemaVersion, "1.0.0");
  assert.equal(fragmentsFile.gameProfileId, "contra");
  assert.equal(fragmentsFile.romProfileId, "contra-us-good");
  assert.ok(fragmentsFile.fragments.length >= 5);

  for (const fragment of fragmentsFile.fragments) {
    assert.ok(fragment.progressionWindow, `${fragment.id} should define progressionWindow`);
    for (const strategyType of fragment.strategyTypes) {
      assert.ok(declaredStrategyTypes.has(strategyType), `${fragment.id} strategy type ${strategyType} should be declared`);
    }
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
