import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const basePath = path.join(repoRoot, "data", "training", "contra", "tas_bases", "contra-j-good", "training-base.json");

test("Contra Japan TAS training base is a machine-readable standard artifact", () => {
  assert.equal(fs.existsSync(basePath), true, "training-base.json should exist");

  const trainingBase = JSON.parse(fs.readFileSync(basePath, "utf8"));

  assert.equal(trainingBase.schemaVersion, "1.0.0");
  assert.equal(trainingBase.gameProfileId, "contra");
  assert.equal(trainingBase.romProfileId, "contra-j-good");
  assert.equal(trainingBase.romChecksum.fm2Base64, "0wbFTM/fXLT47FiPGbPjPQ==");
  assert.equal(trainingBase.role, "tas-training-base");
  assert.equal(trainingBase.runtimePolicy.tasIsController, false);
  assert.equal(trainingBase.runtimePolicy.requiresStrategyPackPromotion, true);
  assert.equal(trainingBase.movies.length, 4);
  assert.ok(trainingBase.movies.some((movie) => movie.recommendedBaselines.includes("survival-v0")));
  assert.equal(trainingBase.movies.find((movie) => movie.id === "contra-j-2p-any-percent")?.entrySyncStatus, "verified-user");
  assert.equal(trainingBase.movies.find((movie) => movie.id === "contra-j-2p-low-percent")?.entrySyncStatus, "verified-user");
  assert.ok(trainingBase.candidateFragments.length >= 4);

  for (const fragment of trainingBase.candidateFragments) {
    assert.equal(fragment.status, "candidate");
    assert.equal(fragment.source.kind, "tas");
    assert.equal(fragment.source.romProfileId, "contra-j-good");
    assert.ok(Array.isArray(fragment.strategyTypes));
    assert.ok(fragment.strategyTypes.length > 0);
    assert.ok(Array.isArray(fragment.acceptanceChecks));
    assert.ok(fragment.acceptanceChecks.includes("real-runtime-trace-required"));
    assert.ok(fragment.acceptanceChecks.includes("safety-override-required"));
  }
});
