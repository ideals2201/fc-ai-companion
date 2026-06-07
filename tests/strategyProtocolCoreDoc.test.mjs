import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docPath = path.join(repoRoot, "docs", "STRATEGY_PROTOCOL_CORE.md");

test("strategy protocol core separates game-specific training variables from the common protocol", () => {
  assert.equal(fs.existsSync(docPath), true, "docs/STRATEGY_PROTOCOL_CORE.md should exist");

  const source = fs.readFileSync(docPath, "utf8");

  assert.match(source, /TrainingScenario/, "core protocol should define TrainingScenario as the scenario contract");
  assert.match(source, /variableRefs/, "TrainingScenario should reference game-declared variables");
  assert.match(source, /rewardRules/, "TrainingScenario should define reward-like scoring rules");
  assert.match(source, /terminalConditions/, "TrainingScenario should define terminal success conditions");
  assert.match(source, /failureConditions/, "TrainingScenario should define terminal failure conditions");
  assert.match(source, /每个游戏必须声明自己的变量、奖励和终止条件/, "core protocol should keep variables, rewards, and terminal conditions game-specific");
});

test("strategy protocol core defines robustness and portability extensions", () => {
  const source = fs.readFileSync(docPath, "utf8");

  assert.match(source, /Intention-to-Input Mapping/, "core protocol should define semantic intention-to-input mapping");
  assert.match(source, /Deterministic-Context/, "core protocol should define deterministic context");
  assert.match(source, /rngSeedRange/, "deterministic context should record RNG seed ranges");
  assert.match(source, /timingWindow/, "deterministic context should record timing windows");
  assert.match(source, /JUMP_OVER_PIT/, "core protocol should give an intention example instead of direct button scripting");
  assert.match(source, /Perturbation Testing/, "core protocol should require perturbation testing for robustness");
  assert.match(source, /Strategy Versioning Tree/, "core protocol should define strategy version trees");
  assert.match(source, /parentFragmentId/, "strategy fragments should record parent fragment lineage");
  assert.match(source, /Provenance Graph/, "core protocol should define provenance graph requirements");
  assert.match(source, /parent_hash/, "strategy snapshots should record parent hash");
  assert.match(source, /Memory Mirroring Proxy/, "core protocol should define the memory mirroring proxy");
  assert.match(source, /Negative Constraints/, "core protocol should define negative constraints");
  assert.match(source, /Behavior Primitives/, "core protocol should define cross-game behavior primitives");
  assert.match(source, /AVOID_PROJECTILE/, "behavior primitives should include projectile avoidance");
  assert.match(source, /INTERCEPT_TARGET/, "behavior primitives should include target interception");
  assert.match(source, /MAPS_TO/, "behavior primitives should support game-specific mapping");
  assert.match(source, /safety_tolerance/, "strategy fragments should define safety tolerance");
  assert.match(source, /fallback_fragment_id/, "strategy fragments should define fallback fragment id");
  assert.match(source, /taxonomy/, "strategy fragments should define taxonomy");
  assert.match(source, /preconditions_snapshot/, "strategy fragments should define precondition snapshots");
});
