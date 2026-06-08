import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proposalPath = "data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster.json";
const draftPath = "data/training/contra/runtime_runs/contra-j-good/runtime-fragments/draft-fragment-1p-combat-v0-boss-approach-high-air-cluster.json";
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
  createStrategyFragmentDraftFromProposal
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyFragmentProposal.ts", import.meta.url));

test("Contra Japan high-air candidate is converted into an unvalidated runtime fragment draft", () => {
  const proposal = readJson(proposalPath);
  const draft = readJson(draftPath);
  const handoffManifest = readJson(handoffManifestPath);

  const expected = createStrategyFragmentDraftFromProposal({
    createdAt: "2026-06-08T22:15:00.000+08:00",
    draftId: "draft-fragment-1p-combat-v0-boss-approach-high-air-cluster",
    proposal,
    sourceProposalPath: proposalPath
  });

  assert.deepEqual(draft, expected);
  assert.equal(draft.schema, "fc-ai-strategy-fragment-draft-v1");
  assert.equal(draft.status, "candidate-unvalidated");
  assert.equal(draft.runtimeUse, "training-fragment-draft");
  assert.equal(draft.validation.status, "missing");
  assert.equal(draft.sourceProposal.tasIsController, false);
  assert.equal(draft.fragment.actionAdvice.parameters.prohibitedRouteClass, "runtime-patch:stage-one-boss-approach-high-air-contact");
  assert.ok(draft.fragment.safetyOverrides.includes("rejected-route-class-guard"));
  assert.equal("buttons" in draft.fragment.actionAdvice, false);
  assert.ok(
    handoffManifest.runtimeFragmentDraftRefs.includes(draftPath),
    "handoff manifest should index the runtime fragment draft"
  );
});
