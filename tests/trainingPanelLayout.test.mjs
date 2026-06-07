import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "styles.css"), "utf8");

test("1P and 2P controller bays include side-owned training panels", () => {
  assert.match(mainSource, /type SideTrainingState/, "training state should be explicit and per side");
  assert.match(mainSource, /type SideTrainingActions/, "side training controls should be modeled as per-side actions");
  assert.match(mainSource, /function SideTrainingPanel/, "controller bay should render a side training panel");
  assert.match(mainSource, /training: SideTrainingState/, "Pilot should carry its own training state");
  assert.match(mainSource, /packDisplayName: string/, "side training state should expose the selected strategy pack name");
  assert.match(mainSource, /strategyCategoryLabel: string/, "side training state should expose the selected strategy category");
  assert.match(mainSource, /strategyBaselineLabel: string/, "side training state should expose the selected strategy baseline");
  assert.match(mainSource, /<SideTrainingPanel[\s\S]*training=\{pilot\.training\}/, "PilotPanel should place training inside the controller bay");
  assert.match(mainSource, /className="side-training-pack-identity"/, "side training panel should prominently show strategy pack identity");
  assert.match(mainSource, /<strong>\{training\.packDisplayName\} \(\{training\.strategyCategoryLabel\}\)<\/strong>/, "pack name and strategy category should be rendered as one prominent centered identity");
  assert.match(mainSource, /training\.strategyBaseline/, "side training panel should use Strategy Baseline instead of the old TAS-only baseline label");
  assert.doesNotMatch(mainSource, /t\(language, "training\.baselineStrategy"\)/, "side training panel should not render the duplicated baseline-strategy field");
  assert.match(mainSource, /className="side-training-workflow-actions"/, "side training panel should own strategy workflow actions");
  assert.match(mainSource, /className="side-training-capture-actions"/, "side training panel should own trace capture actions");
  assert.match(mainSource, /onSideTrainingSelectBaseline/, "baseline selection should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingModifyStrategy/, "strategy modification should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingArchiveStrategy/, "strategy archival should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingValidateStrategy/, "validation should be routed with side ownership");
  assert.match(mainSource, /onSideTraceStart/, "trace capture should be available from each side training panel");
  assert.match(cssSource, /\.side-training-panel\s*\{/, "side training panel should have stable styling");
  assert.match(cssSource, /\.training-stat-grid\s*\{/, "side training metrics should be compact grid cards");
  assert.match(cssSource, /\.side-training-workflow-actions\s*\{/, "side workflow buttons should have stable layout");
  assert.match(cssSource, /\.side-training-capture-actions\s*\{/, "side capture buttons should have stable layout");
});

test("center column includes a global training console for shared evidence and validation", () => {
  assert.match(mainSource, /type GlobalTrainingState/, "global training state should be separate from side panels");
  assert.match(mainSource, /strategyPackLabel: string/, "global training state should carry a visible strategy-pack label");
  assert.match(mainSource, /ACTIVE_STRATEGY_PACK/, "training UI should display the active strategy pack identity");
  assert.match(mainSource, /function OperationStrategyControl/, "center column should render a shared operation strategy control");
  assert.match(mainSource, /globalTraining=\{globalTraining\}/, "center column should pass global training state into the host console");
  assert.match(mainSource, /<OperationStrategyControl[\s\S]*training=\{globalTraining\}/, "host console should place operation strategy control in the center column");
  assert.match(mainSource, /<TasWindow[\s\S]*\/>\s*<OperationStrategyControl/s, "operation strategy control should sit below the TAS viewing window");
  assert.match(mainSource, /className="training-pack-banner"/, "operation strategy control should show the strategy pack name prominently");
  assert.doesNotMatch(mainSource, /function OperationStrategyControl[\s\S]*t\(language, "training\.strategyBaseline"\)/, "operation strategy control should not duplicate the side-owned strategy baseline selector");
  assert.doesNotMatch(mainSource, /function OperationStrategyControl[\s\S]*t\(language, "training\.tasBase"\)[\s\S]*training\.tasBaseLabel/, "operation strategy control should not present TAS as the only base type");
  assert.doesNotMatch(mainSource, /function OperationStrategyControl[\s\S]*training\.scenarioLabel/, "operation strategy control should not show detailed training-scenario status");
  assert.doesNotMatch(mainSource, /function OperationStrategyControl[\s\S]*training\.optimizationLevel/, "operation strategy control should not show internal optimization level status");
  assert.match(cssSource, /\.operation-strategy-control\s*\{/, "operation strategy control should have stable styling");
  assert.match(cssSource, /\.training-pack-banner\s*\{/, "strategy-pack banner should have stable emotional-value styling");
  assert.match(mainSource, /className="strategy-result-board"/, "operation strategy control should show strategy result data");
  assert.match(mainSource, /training\.strategyResults/, "operation strategy control should label strategy result data");
  assert.match(mainSource, /training\.resultKills/, "strategy result cards should include kill data");
  assert.match(mainSource, /training\.resultFixed/, "strategy result cards should include fixed-target data");
  assert.match(mainSource, /training\.resultRewards/, "strategy result cards should include reward data");
  assert.match(mainSource, /training\.resultTime/, "strategy result cards should include clear-time data");
  assert.match(mainSource, /training\.resultUnverified/, "unverified result data should be visibly marked");
});

test("operation strategy control keeps only shared strategy-training workflow actions", () => {
  assert.match(mainSource, /training\.saveStrategy/, "training console should expose gated strategy saving");
  assert.match(mainSource, /training\.validateStrategy/, "training console should expose validation or replay");
  assert.doesNotMatch(mainSource, /<GlobalTrainingConsole[\s\S]*onTrainingSelectBaseline=/, "global console should not receive side-owned baseline selection");
  assert.doesNotMatch(mainSource, /<GlobalTrainingConsole[\s\S]*onTrainingModifyStrategy=/, "global console should not receive side-owned strategy modification");
  assert.doesNotMatch(mainSource, /<GlobalTrainingConsole[\s\S]*onTrainingArchiveStrategy=/, "global console should not receive side-owned strategy archival");
  assert.match(mainSource, /onTrainingValidateStrategy/, "validate action should be wired to runtime state or logging");
  assert.match(mainSource, /onTrainingSaveStrategy/, "save action should be wired to runtime state or logging");
  assert.match(mainSource, /onTrainingSavePathSelected/, "save path selection should be wired");
  assert.match(cssSource, /\.strategy-package-save-panel\s*\{/, "save workflow should have its own stable layout");
});

test("operation strategy control surfaces resource routing and package side scope", () => {
  assert.match(mainSource, /type StrategyPackageSideScope/, "package side scope should be modeled explicitly");
  assert.doesNotMatch(mainSource, /scenarioLabel: string/, "operation strategy control should not carry detailed scenario label");
  assert.doesNotMatch(mainSource, /scenarioStats/, "operation strategy control should not carry detailed scenario metric counts");
  assert.match(mainSource, /packageSideScope: StrategyPackageSideScope/, "global training state should carry selected package side scope");
  assert.match(mainSource, /strategyExportName: string/, "global training state should carry the editable strategy name");
  assert.match(mainSource, /validationReplayComplete: boolean/, "global training state should carry validation replay gate status");
  assert.match(mainSource, /savePathLabel: string/, "global training state should expose selected save path label");
  assert.match(mainSource, /setPackageSideScope/, "package side scope should be user-selectable");
  assert.match(mainSource, /togglePackageSideScope/, "package side toggles should route through a logged state change");
  assert.match(mainSource, /nextPackageSideScope/, "package side toggles should support click-again cancellation");
  assert.match(mainSource, /packageScopeHasSide/, "package side buttons should derive active state from the side set");
  assert.doesNotMatch(mainSource, /className="training-scenario-strip"/, "operation strategy control should not show scenario identity");
  assert.doesNotMatch(mainSource, /className="training-scenario-metrics"/, "operation strategy control should not show scenario metric counts");
  assert.match(mainSource, /className="package-scope-control"/, "training console should show package-scope control");
  assert.match(mainSource, /className="package-scope-toggle-stack"/, "1P and 2P package side buttons should be stacked");
  assert.match(mainSource, /training\.package1P/, "scope control should include 1P only");
  assert.match(mainSource, /training\.package2P/, "scope control should include 2P only");
  assert.doesNotMatch(mainSource, /function OperationStrategyControl[\s\S]*training\.packageBoth/, "operation strategy control should not render a 1P+2P button");
  assert.match(mainSource, /training\.packageName/, "operation strategy control should show the editable strategy name field");
  assert.match(mainSource, /className="strategy-save-name-field"/, "strategy name should be edited in a dedicated field");
  assert.match(mainSource, /className="hidden-save-directory-input"/, "save strategy should open a directory chooser");
  assert.match(mainSource, /disabled=\{!training\.validationReplayComplete \|\| traceRecording\}/, "save strategy should stay disabled until validation replay completes");
  assert.match(mainSource, /<div className="strategy-package-save-panel"[\s\S]*<\/div>\s*<div className="strategy-result-section"/, "battle result data should sit below the save workflow");
  assert.match(cssSource, /\.package-scope-control\s*\{/, "package scope control should have stable layout");
});

test("operation strategy control supports side-specific resource packs and baseline choices", () => {
  assert.match(mainSource, /type StrategyResourcePackId/, "resource pack ids should be explicit");
  assert.match(mainSource, /strategyResourcePacksBySide/, "1P and 2P should carry their own selected resource packs");
  assert.match(mainSource, /p2StrategyResourceOverridden/, "2P should be able to override the 1P resource pack");
  assert.match(mainSource, /changeStrategyResourcePack/, "resource pack selection should be wired");
  assert.match(mainSource, /setStrategyResourcePacksBySide\(\(current\) => \(\{ \.\.\.current, "1P": packId, "2P": p2StrategyResourceOverridden \? current\["2P"\] : packId \}\)\)/, "selecting a 1P pack should default 2P to the same pack until 2P overrides");
  assert.match(mainSource, /className="strategy-resource-routing"/, "operation strategy control should show 1P and 2P resource routing");
  assert.match(mainSource, /className="strategy-resource-info"/, "operation strategy control should show resource information");
  assert.match(mainSource, /training\.resourcePack1P/, "1P resource selector should be labeled");
  assert.match(mainSource, /training\.resourcePack2P/, "2P resource selector should be labeled");
  assert.match(mainSource, /training\.resourceCreator/, "resource info should show pack creator");
  assert.match(mainSource, /training\.resourceLatestModifier/, "resource info should show latest modifier");
  assert.match(mainSource, /training\.resourceRevisions/, "resource info should show revision count");
  assert.match(mainSource, /training\.versionHistory/, "operation strategy control should expose version history and rollback entry");
  assert.match(mainSource, /training\.rollbackUnavailable/, "rollback should be gated when no restorable snapshot exists");
  assert.match(mainSource, /training\.sync2PTo1P/, "2P should be able to resync with 1P");
  assert.doesNotMatch(mainSource, /function OperationStrategyControl[\s\S]*onStrategyBaselineChoiceChange/, "baseline choice controls should stay in the side training panel");
});

test("side baseline selection does not expose TAS until it has been extracted and archived", () => {
  const handlerMatch = mainSource.match(/const onSideTrainingSelectBaseline = useCallback\(\(side: PlayerSide\) => \{([\s\S]*?)\}, \[appendLog\]\);/);
  assert.ok(handlerMatch, "side baseline selection handler should exist");
  const handlerSource = handlerMatch[1];
  assert.match(mainSource, /TAS 基准必须先在 TAS 观赏窗口完成分离抽取并归档后才会加入候选列表末尾/, "side baseline selection should explain the TAS extraction gate");
  assert.doesNotMatch(handlerSource, /setSelectedTasMovieId/, "selecting a side baseline should not silently select a raw TAS movie");
  assert.doesNotMatch(handlerSource, /identifyTasForRom/, "raw TAS matching should not make TAS baselines immediately selectable");
});

test("side training panels derive their target from the selected AI strategy", () => {
  assert.match(mainSource, /function trainingProfileForStrategy/, "training target should be derived from the selected strategy key");
  assert.match(mainSource, /function strategyTrainingCandidateCount/, "candidate counts should be strategy-aware");
  assert.match(mainSource, /case "survival-v0"/, "survival strategy should have its own training profile");
  assert.match(mainSource, /case "speedrun-v0"/, "speedrun strategy should have its own training profile");
  assert.match(mainSource, /case "combat-v0"/, "combat strategy should have its own training profile");
  assert.match(mainSource, /case "loot-v0"/, "loot strategy should have its own training profile");
  assert.match(mainSource, /case "guard-v0"/, "guard strategy should have its own training profile");
  assert.match(mainSource, /archiveTarget: .*strategyKey/s, "archive target should include the selected strategy key");
});
