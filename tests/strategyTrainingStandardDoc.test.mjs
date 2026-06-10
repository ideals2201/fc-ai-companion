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
    "## 10. Training Scenario Files",
    "## 11. External Training Pattern Mapping",
    "## 12. Training Quality Gates"
  ].forEach((heading) => assert.ok(source.includes(heading), `${heading} should be documented`));

  assert.match(source, /Select Base/, "training standard should define the baseline-selection action");
  assert.match(source, /Modify Strategy/, "training standard should define strategy modification");
  assert.match(source, /Archive Strategy/, "training standard should define strategy archival");
  assert.match(source, /Package Strategy/, "training standard should define one-click strategy packaging");
  assert.match(source, /current training context/i, "training standard should define packaging default scope");
  assert.match(source, /Validate Replay/, "training standard should define validation replay");
  assert.match(source, /side controller bay/i, "training standard should place side-owned controls in each controller bay");
  assert.match(source, /shared training method/i, "training standard should require one shared method for a synchronized training session");
  assert.match(source, /configuration is locked/i, "training standard should lock baseline, method, pack, strategy, and side scope after training starts");
  assert.match(source, /Start Run/i, "training standard should define a run-start action for auto-patch training");
  assert.match(source, /Stop Run/i, "training standard should define a run-stop action for auto-patch training");
  assert.match(source, /arm trace capture before the first runtime frame/i, "training standard should require auto-patch runs to synchronize capture before running");
  assert.match(source, /runtimeStatus === "running"/, "training standard should require the emulator to be running before strategy writes");
  assert.match(source, /gameplayActive === true/, "training standard should require RAM-confirmed gameplay before strategy writes");
  assert.match(source, /paused/i, "training standard should define pause as a no-write state");
  assert.match(source, /clear AI input/i, "training standard should clear AI input outside the run gate");
  assert.match(source, /Operation Strategy Control/, "training standard should reserve operation strategy control for cross-side work");
  assert.match(source, /1P Resource Pack/, "training standard should define the 1P resource-pack slot");
  assert.match(source, /2P Resource Pack/, "training standard should define the 2P resource-pack slot");
  assert.match(source, /side-baselines\.json/, "training standard should cover TAS side baselines");
  assert.match(source, /real runtime trace/i, "training standard should require real runtime traces");
  assert.match(source, /training-scenarios\.json/, "training standard should define scenario files");
  assert.match(source, /variableRefs/, "training standard should keep variables game-profile owned");
  assert.match(source, /rewardRules/, "training standard should define scoring rules");
  assert.match(source, /terminalConditions/, "training standard should define terminal success rules");
  assert.match(source, /failureConditions/, "training standard should define terminal failure rules");
  assert.match(source, /Environment-Aware Validation/, "training standard should define environment-aware validation");
  assert.match(source, /Provenance Graph/, "training standard should define provenance graph training evidence");
  assert.match(source, /Negative Constraints/, "training standard should enforce negative constraints before packaging");
  assert.match(source, /Automated Training Asset Checklist/, "training standard should include the automated training asset checklist in English");
  assert.match(source, /Level 0/, "training standard should define Level 0 asset quality");
  assert.match(source, /Level 1/, "training standard should define Level 1 asset quality");
  assert.match(source, /Level 2/, "training standard should define Level 2 asset quality");
  assert.match(source, /Treat strategies as code, and treat TAS traces as test cases/, "training standard should preserve the engineering directive in English");
  assert.match(source, /Integration-style memory variables/, "training standard should map external integration patterns to local modules");
  assert.match(source, /Replay movie input logs/, "training standard should map replay and TAS input logs to local training artifacts");
  assert.match(source, /DAgger-style failure aggregation/, "training standard should map DAgger-style correction to our trace workflow");
  assert.match(source, /Reward-trap prevention/, "training standard should map RL reward-trap lessons to validation gates");
  assert.match(source, /Frame-advance emulator control/, "training standard should map frame-advance bot loops to local runtime execution");
  assert.match(source, /A candidate is not promotable until all gates pass/, "training standard should state the promotion gate explicitly");
});

test("strategy training standard records external operation-training references as source material", () => {
  const source = fs.readFileSync(docPath, "utf8");

  assert.match(source, /## 13\. External Source Register/, "training standard should keep a source register for borrowed operation-training patterns");
  assert.match(source, /Gym Retro/, "source register should cite Gym Retro style game integrations");
  assert.match(source, /https:\/\/retro\.readthedocs\.io\/en\/latest\//, "source register should include the Gym Retro docs URL");
  assert.match(source, /Stable-Retro/, "source register should cite Stable-Retro replay material");
  assert.match(source, /https:\/\/stable-retro\.farama\.org\//, "source register should include the Stable-Retro docs URL");
  assert.match(source, /FCEUX FM2/, "source register should cite the FM2 movie format");
  assert.match(source, /https:\/\/fceux\.com\/web\/FM2\.html/, "source register should include the FCEUX FM2 URL");
  assert.match(source, /FCEUX Lua/, "source register should cite FCEUX Lua scripting");
  assert.match(source, /https:\/\/fceux\.com\/web\/help\/LuaScripting\.html/, "source register should include the FCEUX Lua URL");
  assert.match(source, /DAgger/, "source register should cite DAgger as failure-state aggregation guidance");
  assert.match(source, /Ross-AIStats11-NoRegret\.pdf/, "source register should include the DAgger paper URL");
  assert.match(source, /OpenAI retro-movies/, "source register should cite demonstration movie datasets");
  assert.match(source, /https:\/\/github\.com\/openai\/retro-movies/, "source register should include the retro-movies URL");
  assert.match(source, /TASVideos emulator requirements/, "source register should cite deterministic replay requirements");
  assert.match(source, /https:\/\/tasvideos\.org\/EmulatorResources\/Requirements/, "source register should include the TASVideos emulator requirements URL");
  assert.match(source, /TASVideos console verification/, "source register should cite movie-input dump and verification practices");
  assert.match(source, /https:\/\/tasvideos\.org\/ConsoleVerification\/Guide/, "source register should include the TASVideos console verification URL");
  assert.match(source, /Borrow patterns, not authority/, "source register should state that external projects are references rather than product authority");
});
