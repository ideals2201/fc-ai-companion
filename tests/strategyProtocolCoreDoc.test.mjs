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
