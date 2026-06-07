import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docPath = path.join(repoRoot, "docs", "STRATEGY_TRAINING_STANDARD.md");

test("strategy training standard document defines the training workflow", () => {
  assert.equal(fs.existsSync(docPath), true, "docs/STRATEGY_TRAINING_STANDARD.md should exist");

  const source = fs.readFileSync(docPath, "utf8");

  [
    "# FC AI Strategy Training Standard Operating Manual",
    "## 1. Position",
    "## 2. Training Sources",
    "## 3. Training Workflow Buttons",
    "## 4. Baseline Selection",
    "## 5. Side-Owned Training",
    "## 6. Archive Rules",
    "## 7. Promotion Rules",
    "## 8. Validation Rules",
    "## 9. Optimization Levels",
    "## 10. Training Scenario Files"
  ].forEach((heading) => assert.ok(source.includes(heading), `${heading} should be documented`));

  assert.match(source, /Select Base/, "training standard should define the baseline-selection action");
  assert.match(source, /Modify Strategy/, "training standard should define strategy modification");
  assert.match(source, /Archive Strategy/, "training standard should define strategy archival");
  assert.match(source, /Package Strategy/, "training standard should define one-click strategy packaging");
  assert.match(source, /current training context/i, "training standard should define packaging default scope");
  assert.match(source, /Validate Replay/, "training standard should define validation replay");
  assert.match(source, /side-baselines\.json/, "training standard should cover TAS side baselines");
  assert.match(source, /real runtime trace/i, "training standard should require real runtime traces");
  assert.match(source, /training-scenarios\.json/, "training standard should define scenario files");
  assert.match(source, /variableRefs/, "training standard should keep variables game-profile owned");
  assert.match(source, /rewardRules/, "training standard should define scoring rules");
  assert.match(source, /terminalConditions/, "training standard should define terminal success rules");
  assert.match(source, /failureConditions/, "training standard should define terminal failure rules");
});
