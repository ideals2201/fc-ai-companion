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
  assert.match(mainSource, /strategyKey: AiStrategyKey/, "side training state should carry the selected strategy key");
  assert.match(mainSource, /strategyCategoryOptions: Array<\{ key: AiStrategyKey; label: string \}>/, "side training state should expose selectable strategy categories");
  assert.match(mainSource, /strategyBaselineLabel: string/, "side training state should expose the selected strategy baseline");
  assert.match(mainSource, /selectedForTraining: boolean/, "side training state should know whether it is the focused training side");
  assert.match(mainSource, /trainingStatusLabel: string/, "side training state should expose queued vs active status");
  assert.match(mainSource, /baselineOptions: SideTrainingBaselineOption\[\]/, "side training state should expose selectable baseline options");
  assert.match(mainSource, /selectedBaselineId: string/, "side training state should carry the selected baseline id");
  assert.match(mainSource, /trainingMethodOptions: SideTrainingMethodOption\[\]/, "side training state should expose selectable training methods");
  assert.match(mainSource, /selectedTrainingMethod: SideTrainingMethod/, "side training state should carry the selected training method");
  assert.match(mainSource, /<SideTrainingPanel[\s\S]*training=\{pilot\.training\}/, "PilotPanel should place training inside the controller bay");
  assert.match(mainSource, /className="side-training-pack-identity"/, "side training panel should prominently show strategy pack identity");
  assert.match(mainSource, /className=\{sideTrainingPanelClassName\(training\)\}/, "side training panel should distinguish queued and active training states");
  assert.match(mainSource, /className=\{sideTrainingTitleClassName\(training\)\}/, "side training title should distinguish queued and active training states");
  assert.match(mainSource, /className="side-training-status"/, "side training panel should visibly label queued vs active status");
  assert.match(mainSource, /onSideTrainingFocus/, "side training title should route focus selection with side ownership");
  assert.match(mainSource, /selectorClassName\("side-strategy-category-selector"/, "side training panel should allow changing the trained strategy category");
  assert.match(mainSource, /training\.strategyCategoryOptions\.map/, "side training strategy selector should list package strategy categories");
  assert.match(mainSource, /onSideTrainingStrategyChange/, "training strategy category changes should be routed with side ownership");
  assert.match(mainSource, /disabled=\{!sideTrainingActive\}/, "side training strategy buttons should unlock only during that side's active session");
  assert.match(mainSource, /<strong>\{training\.packDisplayName\} \(\{training\.strategyCategoryLabel\}\)<\/strong>/, "pack name and strategy category should be rendered as one prominent centered identity");
  assert.match(mainSource, /training\.strategyBaseline/, "side training panel should use Strategy Baseline instead of the old TAS-only baseline label");
  assert.doesNotMatch(mainSource, /t\(language, "training\.baselineStrategy"\)/, "side training panel should not render the duplicated baseline-strategy field");
  assert.match(mainSource, /selectorClassName\("side-baseline-selector"/, "side training panel should render a real baseline selector");
  assert.match(mainSource, /training\.baselineOptions\.map/, "side baseline selector should list available baselines");
  assert.match(mainSource, /selectorClassName\("side-training-method-selector"/, "side training panel should render training method controls");
  assert.match(mainSource, /training\.trainingMethodOptions\.map/, "side training method selector should list available methods");
  assert.match(mainSource, /className="side-training-context-actions"/, "side training panel should expose only contextual actions");
  assert.doesNotMatch(mainSource, /className="side-training-workflow-actions"/, "side training panel should not keep the old permanent workflow row");
  assert.doesNotMatch(mainSource, /className="side-training-capture-actions"/, "side training panel should not keep the old permanent capture row");
  assert.match(mainSource, /onSideTrainingSelectBaseline/, "baseline selection should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingBaselineChange/, "baseline choice should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingMethodChange/, "training method selection should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingModifyStrategy/, "strategy modification should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingArchiveStrategy/, "strategy archival should be routed with side ownership");
  assert.match(mainSource, /onSideTrainingValidateStrategy/, "validation should be routed with side ownership");
  assert.match(mainSource, /onSideTraceStart/, "trace capture should be available from each side training panel");
  assert.match(cssSource, /\.side-training-panel\s*\{/, "side training panel should have stable styling");
  assert.match(cssSource, /\.side-training-panel\.queued-training-side\s*\{/, "queued training panel should have selected-but-not-active styling");
  assert.match(cssSource, /\.side-training-panel\.active-training-side\s*\{/, "active training panel should have active border styling");
  assert.match(cssSource, /\.side-training-title-button\s*\{/, "side training title button should have stable styling");
  assert.doesNotMatch(mainSource, /className="training-stat-grid"/, "side training panel should not show debug metric cards");
  assert.doesNotMatch(mainSource, /className="training-note-grid"/, "side training panel should not show debug note cards");
  assert.match(cssSource, /\.side-baseline-selector\s*\{/, "side baseline selector should have stable layout");
  assert.match(cssSource, /\.side-training-method-selector\s*\{/, "training method selector should have stable layout");
  assert.match(cssSource, /\.side-training-context-actions\s*\{/, "side contextual buttons should have stable layout");
});

test("center column includes a global training console for shared evidence and validation", () => {
  assert.match(mainSource, /type GlobalTrainingState/, "global training state should be separate from side panels");
  assert.match(mainSource, /strategyPackLabel: string/, "global training state should carry a visible strategy-pack label");
  assert.match(mainSource, /trainingSessionActive: boolean/, "global training state should carry whole-module training session status");
  assert.match(mainSource, /trainingSessionLabel: string/, "global training state should expose a visible training session label");
  assert.match(mainSource, /ACTIVE_STRATEGY_PACK/, "training UI should display the active strategy pack identity");
  assert.match(mainSource, /function OperationStrategyControl/, "center column should render a shared operation strategy control");
  assert.match(mainSource, /globalTraining=\{globalTraining\}/, "center column should pass global training state into the host console");
  assert.match(mainSource, /<OperationStrategyControl[\s\S]*training=\{globalTraining\}/, "host console should place operation strategy control in the center column");
  assert.match(mainSource, /<TasWindow[\s\S]*\/>\s*<OperationStrategyControl/s, "operation strategy control should sit below the TAS viewing window");
  assert.match(mainSource, /className="training-pack-banner"/, "operation strategy control should show the strategy pack name prominently");
  assert.match(mainSource, /className="training-session-control"/, "operation strategy control should expose whole-module start and stop training controls");
  assert.match(mainSource, /training\.trainingSessionActive \? "operation-strategy-control training-active" : "operation-strategy-control"/, "operation strategy control should visibly mark active training sessions");
  assert.match(mainSource, /const locked = tasLocked \|\| trainingLocked/, "mode controls should be locked by TAS or active side training");
  assert.match(mainSource, /const strategyControlsLocked = tasLocked \|\| trainingLocked/, "top strategy buttons should be locked by TAS or active side training");
  assert.match(mainSource, /disabled=\{strategyControlsLocked\}/, "top strategy buttons should be disabled while training owns strategy selection");
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

test("side training sessions are independent and only lock their own play area", () => {
  assert.match(mainSource, /selectedTrainingSides/, "1P and 2P training selection should be modeled as independent side flags");
  assert.match(mainSource, /activeTrainingSides/, "active training should be tracked per side instead of one global selected side");
  assert.doesNotMatch(mainSource, /selectedTrainingSide === "1P"/, "1P and 2P training panels must not be mutually exclusive");
  assert.doesNotMatch(mainSource, /selectedTrainingSide === "2P"/, "2P training should not depend on a single selected side");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["1P"\]\.trainingSessionActive\}/, "1P training should lock only the 1P game area");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["2P"\]\.trainingSessionActive\}/, "2P training should lock only the 2P game area");
  assert.match(mainSource, /const trainingSessionActive = activeTrainingSides\["1P"\] \|\| activeTrainingSides\["2P"\]/, "global training status should summarize side sessions");
  assert.match(mainSource, /const canStartTrainingSession = \(\["1P", "2P"\] as PlayerSide\[\]\)\.some/, "training start should be available when any selected side is not active");
  assert.match(mainSource, /const sidesToStart = \(\["1P", "2P"\] as PlayerSide\[\]\)\.filter\(\(side\) => selectedTrainingSides\[side\] && !activeTrainingSides\[side\]\)/, "training start should collect every selected inactive side independently");
  assert.match(mainSource, /for \(const side of sidesToStart\) \{\s*startSideTraining\(side\);?\s*\}/, "starting training should activate every selected side without forcing 1P/2P exclusivity");
  assert.match(mainSource, /setActiveTrainingSides\(\(current\) => \(\{ \.\.\.current, \[side\]: true \}\)\)/, "per-side training start should preserve other active side locks");
  assert.match(mainSource, /setActiveTrainingSides\(\{ "1P": false, "2P": false \}\)/, "stopping training should release every side training lock");
});

test("selected training sides are queued until the start button activates them", () => {
  assert.match(mainSource, /function sideTrainingPanelClassName/, "panel class should be derived from queued and active training state");
  assert.match(mainSource, /training\.trainingSessionActive \? "side-training-panel active-training-side" : training\.selectedForTraining \? "side-training-panel queued-training-side" : "side-training-panel"/, "selected inactive sides should be queued, not active");
  assert.match(mainSource, /training\.trainingSessionActive \? "side-training-title-button active" : training\.selectedForTraining \? "side-training-title-button queued" : "side-training-title-button"/, "selected inactive titles should use queued styling");
  assert.match(mainSource, /selectedForTraining\s*\?\s*language === "en-US" \? "Queued to start" : "已选择，待启动"/, "selected inactive side should show a clear queued label");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["1P"\]\.trainingSessionActive\}/, "top 1P game controls should lock only after 1P training starts");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["2P"\]\.trainingSessionActive\}/, "top 2P game controls should lock only after 2P training starts");
});

test("side training panels expose direct per-side training start controls", () => {
  assert.match(mainSource, /onSideTrainingStart: \(side: PlayerSide\) => void/, "side actions should include an explicit start command");
  assert.match(mainSource, /const sideStartLabel = language === "en-US" \? `Start \$\{training\.side\} Training` : `启动\$\{training\.side\}训练`/, "side panels should label the direct start action by side");
  assert.match(mainSource, /onClick=\{\(\) => actions\.onSideTrainingStart\(training\.side\)\}/, "side start button should activate its own side");
  assert.match(mainSource, /disabled=\{training\.trainingSessionActive\}/, "side start should be disabled once that side is already training");
  assert.match(mainSource, /startSideTraining\(side\)/, "side start action should reuse the same activation path as global training");
});

test("operation strategy control keeps only shared strategy-training workflow actions", () => {
  assert.match(mainSource, /onTrainingSessionStart/, "training console should expose whole-module training start");
  assert.match(mainSource, /onTrainingSessionStop/, "training console should expose whole-module training stop");
  assert.match(mainSource, /function trainingControlModeForSelection/, "training session start should derive control mode from baseline and training method");
  assert.match(mainSource, /setActiveTrainingSides/, "starting and stopping training should update side-owned training sessions");
  assert.match(mainSource, /canStartTrainingSession/, "training start should be gated by side-owned session state");
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

test("side baseline selection uses archived TAS side-baselines without turning TAS into a controller", () => {
  const handlerMatch = mainSource.match(/const onSideTrainingSelectBaseline = useCallback\(\(side: PlayerSide\) => \{([\s\S]*?)\}, \[appendLog, selectedSideBaselineIds, uiLanguage\]\);/);
  assert.ok(handlerMatch, "side baseline selection handler should exist");
  const handlerSource = handlerMatch[1];
  assert.match(mainSource, /side-baselines\.json/, "side baseline choices should import the standard TAS side-baseline artifact");
  assert.match(mainSource, /TAS_SIDE_BASELINE_ARTIFACTS/, "side baseline choices should come from archived TAS side-baseline artifacts");
  assert.match(mainSource, /function tasSideBaselineArtifactOptions/, "TAS side-baseline artifacts should be converted into UI baseline options");
  assert.match(mainSource, /function tasBaselineOptionsForSide/, "side baseline choices should be side-filtered");
  assert.match(mainSource, /function findTasSideBaselineOption/, "side baseline choices should resolve archived baseline options");
  assert.match(handlerSource, /findTasSideBaselineOption/, "select baseline should report the archived selected option");
  assert.doesNotMatch(handlerSource, /setSelectedTasMovieId/, "selecting a side baseline should not silently select a raw TAS movie");
  assert.doesNotMatch(handlerSource, /identifyTasForRom/, "raw TAS matching should not make TAS baselines immediately selectable");
  assert.doesNotMatch(mainSource, /const TAS_SIDE_BASELINE_CATALOG = \[/, "TAS baseline UI should not be maintained as a separate hardcoded list");
});

test("human demonstration is a baseline source, not a training method", () => {
  const baselineCatalogMatch = mainSource.match(/const SIDE_BASELINE_CATALOG[\s\S]*?\] as const satisfies readonly SideTrainingBaselineOption\[\];/);
  assert.ok(baselineCatalogMatch, "side baseline catalog should exist");
  const baselineCatalogSource = baselineCatalogMatch[0];
  assert.match(baselineCatalogSource, /human-demo-new/, "new human demonstration should be selectable as a baseline source");
  assert.match(baselineCatalogSource, /sourceKind: "human-demo"/, "human demonstration baseline should be typed as a source asset");
  assert.match(baselineCatalogSource, /ai-run-new/, "new AI run should be selectable as a baseline source");
  assert.match(baselineCatalogSource, /sourceKind: "ai-run"/, "AI run baseline should be typed as a source asset");
  assert.doesNotMatch(baselineCatalogSource, /human-demo-latest/, "recent human demos should not appear until a real archived demo exists");
  assert.doesNotMatch(baselineCatalogSource, /ai-run-latest/, "recent AI runs should not appear until a real archived run exists");

  const methodOptionsMatch = mainSource.match(/const SIDE_TRAINING_METHOD_OPTIONS[\s\S]*?\] as const satisfies readonly SideTrainingMethodOption\[\];/);
  assert.ok(methodOptionsMatch, "side training method options should exist");
  const methodOptionsSource = methodOptionsMatch[0];
  assert.match(methodOptionsSource, /auto-patch/, "automatic run patch should be a training method");
  assert.match(methodOptionsSource, /model-analysis/, "model analysis should be a training method");
  assert.match(methodOptionsSource, /human-assist/, "human assist should be a training method");
  assert.match(methodOptionsSource, /manual-edit/, "manual edit should be a training method");
  assert.doesNotMatch(methodOptionsSource, /human-demo-new/, "human demonstration should not be modeled as a training method");
});

test("side training baseline and method controls unlock only for valid active states", () => {
  assert.match(mainSource, /function isNewRunBaseline/, "new human and new AI run baselines should have a shared direct-run predicate");
  assert.match(mainSource, /const sideTrainingActive = training\.trainingSessionActive/, "side panel should derive control availability from its own active session");
  assert.match(mainSource, /const directRunBaseline = isNewRunBaseline\(training\.selectedBaselineId\)/, "side panel should detect direct human or AI run baselines");
  assert.match(mainSource, /disabled=\{!sideTrainingActive\}[\s\S]*value=\{training\.selectedBaselineId\}/, "strategy baseline selection should be disabled after training stops");
  assert.match(mainSource, /disabled=\{!sideTrainingActive \|\| directRunBaseline\}/, "training method choices should be disabled for inactive sides and direct new-run baselines");
  assert.match(mainSource, /const showDirectRunActions = directRunBaseline/, "direct new-run baselines should expose start/archive actions without requiring a method");
  assert.match(mainSource, /className=\{selectorClassName\("side-training-method-selector", !sideTrainingActive \|\| directRunBaseline\)\}/, "disabled method selector should have dark inactive styling");
  assert.match(mainSource, /className=\{selectorClassName\("side-baseline-selector", !sideTrainingActive\)\}/, "disabled baseline selector should have dark inactive styling");
  assert.match(mainSource, /disabled=\{!sideTrainingActive \|\| actions\.traceRecording\}/, "direct start action should be gated by side training activity");
});

test("direct training baselines synchronize side play mode while training owns input", () => {
  assert.match(mainSource, /function trainingControlModeForSelection/, "training baseline should choose the side play mode");
  assert.match(mainSource, /if \(baselineId === "human-demo-new"\) return "human"/, "new human demonstration baseline should switch the side to human input");
  assert.match(mainSource, /if \(baselineId === "ai-run-new"\) return "ai"/, "new AI run baseline should switch the side to AI input");
  assert.match(mainSource, /changeControlMode\(side, trainingControlModeForSelection\(baselineId, selectedSideTrainingMethods\[side\]\)\)/, "changing a baseline during active training should synchronize the side play mode");
  assert.match(mainSource, /const mode = trainingControlModeForSelection\(selectedSideBaselineIds\[side\], selectedSideTrainingMethods\[side\]\);[\s\S]*changeControlMode\(side, mode\)/, "starting training should synchronize every active side to its baseline mode");
});

test("side training panels derive their target from the selected AI strategy", () => {
  assert.match(mainSource, /function trainingProfileForStrategy/, "training target should be derived from the selected strategy key");
  assert.match(mainSource, /function strategyTrainingCandidateCount/, "candidate counts should be strategy-aware");
  assert.match(mainSource, /const onSideTrainingStrategyChange = useCallback/, "training panel should have a dedicated strategy-category change handler");
  assert.match(mainSource, /onSideTrainingStrategyChange[\s\S]*changeStrategyModel\(side, strategy\)/, "training strategy changes should update the top AI strategy selection");
  assert.match(mainSource, /case "survival-v0"/, "survival strategy should have its own training profile");
  assert.match(mainSource, /case "speedrun-v0"/, "speedrun strategy should have its own training profile");
  assert.match(mainSource, /case "combat-v0"/, "combat strategy should have its own training profile");
  assert.match(mainSource, /case "loot-v0"/, "loot strategy should have its own training profile");
  assert.match(mainSource, /case "guard-v0"/, "guard strategy should have its own training profile");
  assert.match(mainSource, /archiveTarget: .*strategyKey/s, "archive target should include the selected strategy key");
});

test("side training archive produces standard trace evidence for packaging", () => {
  assert.match(mainSource, /createSideTrainingTraceEvidence/, "side training archival should use the standard trace-evidence helper");
  assert.match(mainSource, /sideTrainingTraceEvidence/, "latest side-owned evidence should be kept in runtime state");
  assert.match(mainSource, /setSideTrainingTraceEvidence/, "archival should update the side-owned evidence state");
  assert.match(mainSource, /selectedSideBaselineIds\[side\]/, "archival should attach the selected baseline id");
  assert.match(mainSource, /strategyModels\[side\]/, "archival should attach the selected strategy key");
  assert.match(mainSource, /romMetadata\?\.romProfileId/, "archival should attach the loaded ROM profile id");
  assert.match(mainSource, /data-testid="side-training-evidence-json"/, "browser tests should be able to inspect the latest side training evidence");
  assert.match(mainSource, /data-testid="side-training-evidence-1p-json"/, "1P evidence should be inspectable separately");
  assert.match(mainSource, /data-testid="side-training-evidence-2p-json"/, "2P evidence should be inspectable separately");
});

test("strategy package save consumes archived side training evidence", () => {
  assert.match(mainSource, /createStrategyPackageEvidenceExport/, "save workflow should use the standard package evidence export helper");
  assert.match(mainSource, /createStrategyPackageValidationReport/, "validation replay should be converted into a standard validation report");
  assert.match(mainSource, /strategyPackageValidationReport/, "package save should retain the latest validation report object");
  assert.match(mainSource, /evidenceBySide:\s*sideTrainingTraceEvidence/, "package save should consume the latest side-owned archived evidence");
  assert.match(mainSource, /validationReport:\s*strategyPackageValidationReport/, "package save should consume the standard validation report");
  assert.match(mainSource, /validationReplayComplete/, "package save should stay behind validation replay");
  assert.match(mainSource, /downloadStrategyPackageEvidenceExport/, "package save should download or persist the evidence export payload");
  assert.match(mainSource, /data-testid="strategy-package-evidence-export-json"/, "browser tests should be able to inspect the latest package evidence export");
  assert.match(mainSource, /data-testid="strategy-package-validation-report-json"/, "browser tests should be able to inspect the latest validation report");
  assert.doesNotMatch(mainSource, /new Blob\(\[rom/i, "package save must not include ROM bytes");
});
