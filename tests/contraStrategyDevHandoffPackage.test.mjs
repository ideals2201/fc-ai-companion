import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handoffRoot = "strategy-packs/contra/dev-handoff/current-training-20260608";
const handoffManifestPath = `${handoffRoot}/handoff-manifest.json`;
const handoffReadmePath = `${handoffRoot}/README.md`;
const nextPlanPath = `${handoffRoot}/next-development-plan.md`;

function fullPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(fullPath(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(fullPath(relativePath), "utf8");
}

function assertExists(relativePath) {
  assert.equal(fs.existsSync(fullPath(relativePath)), true, `${relativePath} should exist`);
}

function listFilesRecursive(relativeRoot) {
  const root = fullPath(relativeRoot);
  const results = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else {
        results.push(path.relative(repoRoot, entryPath).replaceAll(path.sep, "/"));
      }
    }
  };
  walk(root);
  return results;
}

test("Contra current training handoff package has safe distributable identity", () => {
  assertExists(handoffManifestPath);
  assertExists(handoffReadmePath);
  assertExists(nextPlanPath);

  const manifest = readJson(handoffManifestPath);
  const readme = readText(handoffReadmePath);
  const packageFiles = listFilesRecursive(handoffRoot);

  assert.equal(manifest.schema, "fc-ai-strategy-dev-handoff-package-v1");
  assert.equal(manifest.schemaVersion, "1.0.0");
  assert.equal(manifest.packageId, "contra-stage1-current-training-20260608");
  assert.equal(manifest.packId, "contra-stage1-strategy-v0");
  assert.equal(manifest.gameProfileId, "contra");
  assert.deepEqual(manifest.romProfileIds, ["contra-j-good"]);
  assert.equal(manifest.status, "candidate-research");
  assert.equal(manifest.runtimePolicy.tasIsController, false);
  assert.equal(manifest.runtimePolicy.tasUse, "training-evidence-only");
  assert.equal(manifest.runtimePolicy.romFileNotIncluded, true);
  assert.equal(manifest.runtimePolicy.userMustProvideOwnRom, true);
  assert.equal(manifest.runtimePolicy.claimsFullClearance, false);
  assert.equal(manifest.runtimePolicy.claimsStage1Clearance, false);

  assert.match(readme, /candidate-research/i);
  assert.match(readme, /does not claim Stage 1 clearance/i);
  assert.match(readme, /TAS is not a controller/i);
  assert.match(readme, /ROM is not included/i);

  const forbiddenExtensions = /\.(nes|fds|unf|unif|rom|bin|zip|7z|rar)$/i;
  assert.deepEqual(
    packageFiles.filter((file) => forbiddenExtensions.test(file)),
    [],
    "handoff package must not contain ROM or archive files"
  );
});

test("Contra current training handoff indexes every strategy category with real evidence", () => {
  const manifest = readJson(handoffManifestPath);
  const expectedStrategyKeys = ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"];

  assert.deepEqual(
    manifest.strategyCoverage.map((entry) => entry.strategyKey).sort(),
    expectedStrategyKeys.sort()
  );

  for (const strategyKey of expectedStrategyKeys) {
    const coverage = manifest.strategyCoverage.find((entry) => entry.strategyKey === strategyKey);
    assert.ok(coverage, `${strategyKey} coverage should exist`);
    assert.equal(coverage.validationStatus, "candidate");
    assert.equal(coverage.clearanceClaim, "not-cleared");
    assert.ok(coverage.evidenceRefs.length >= 1, `${strategyKey} should have evidence refs`);
    assert.ok(coverage.nextDevelopmentAction, `${strategyKey} should describe next action`);

    for (const evidencePath of coverage.evidenceRefs) {
      assertExists(evidencePath);
      const evidence = readJson(evidencePath);
      assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1", `${evidencePath} should use trace evidence v1`);
      assert.equal(evidence.gameProfileId, "contra", `${evidencePath} should bind contra`);
      assert.equal(evidence.romProfileId, "contra-j-good", `${evidencePath} should bind contra-j-good`);
      assert.equal(evidence.stageId, "stage-1", `${evidencePath} should bind stage-1`);
      assert.equal(evidence.source.tasIsController, false, `${evidencePath} must not use TAS as controller`);
      assert.ok(evidence.branchOutcome, `${evidencePath} should classify outcome`);
    }
  }
});

test("Contra current training handoff records the combat branch chain and rejected blocker", () => {
  const manifest = readJson(handoffManifestPath);
  const combat = manifest.strategyCoverage.find((entry) => entry.strategyKey === "combat-v0");

  assert.ok(combat, "combat-v0 coverage should exist");
  assert.equal(combat.bestRuntimeProgress.worldX, 2174);
  assert.equal(
    combat.bestRuntimeProgress.evidencePath,
    "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-boss-approach-early-pit-jump-death-worldx2174.json"
  );
  assert.ok(
    combat.rejectedEvidenceRefs.includes(
      "data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-boss-approach-high-air-contact-death-worldx2160.json"
    ),
    "combat-v0 should preserve the rejected high-air contact regression"
  );
  assert.equal(combat.routeChain.length, 9);
  assert.equal(combat.routeChain.at(-1).outcome, "regressed-and-rejected");
  assert.match(combat.nextDevelopmentAction, /TAS\/human state-action/i);
  assert.match(combat.nextDevelopmentAction, /route-class redesign/i);
});

test("Contra current training handoff includes candidate fragments without validating TAS control", () => {
  const manifest = readJson(handoffManifestPath);

  assert.ok(manifest.candidateFragmentRefs.length >= 2, "handoff should include current candidate fragment refs");

  for (const fragmentPath of manifest.candidateFragmentRefs) {
    assertExists(fragmentPath);
    const proposal = readJson(fragmentPath);
    assert.equal(proposal.schema, "fc-ai-strategy-fragment-proposal-v1", `${fragmentPath} should be a candidate proposal`);
    assert.equal(proposal.fragment.status, "candidate", `${fragmentPath} should remain candidate`);
    assert.equal(
      proposal.fragment.source.tasSideBaseline.tasIsController,
      false,
      `${fragmentPath} must keep TAS as evidence, not controller`
    );
    assert.equal("buttons" in proposal.fragment.actionAdvice, false, `${fragmentPath} should use semantic actionAdvice`);
  }
});

test("Contra current training handoff gives another developer concrete continuation commands and files", () => {
  const manifest = readJson(handoffManifestPath);
  const nextPlan = readText(nextPlanPath);

  assert.ok(manifest.developerEntryPoints.length >= 5, "handoff should list concrete developer entry points");
  for (const entry of manifest.developerEntryPoints) {
    assertExists(entry.path);
    assert.ok(entry.purpose, `${entry.path} should explain purpose`);
  }

  assert.match(nextPlan, /npm test/i);
  assert.match(nextPlan, /npm run build/i);
  assert.match(nextPlan, /node --test tests\\contraJRuntimeTraceEvidence\.test\.mjs/i);
  assert.match(nextPlan, /boss-approach high-air/i);
  assert.match(nextPlan, /do not resume blind coordinate patching/i);
});
