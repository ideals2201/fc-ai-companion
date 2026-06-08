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
  assert.match(mainSource, /trainingToggleLabel: string/, "side training state should expose a readable start/stop label on the title");
  assert.match(mainSource, /strategyBaselineLabel: string/, "side training state should expose the selected strategy baseline");
  assert.match(mainSource, /selectedForTraining: boolean/, "side training state should know whether it is the focused training side");
  assert.match(mainSource, /trainingStatusLabel: string/, "side training state should expose queued vs active status");
  assert.match(mainSource, /baselineOptions: SideTrainingBaselineOption\[\]/, "side training state should expose selectable baseline options");
  assert.match(mainSource, /selectedBaselineId: string/, "side training state should carry the selected baseline id");
  assert.match(mainSource, /trainingMethodOptions: SideTrainingMethodOption\[\]/, "side training state should expose selectable training methods");
  assert.match(mainSource, /selectedTrainingMethod: SideTrainingMethod/, "side training state should carry the selected training method");
  assert.match(mainSource, /trainingConfigLocked: boolean/, "side training state should expose whether baseline and method settings are locked");
  assert.match(mainSource, /trainingRunActive: boolean/, "side training state should expose whether its run is currently recording");
  assert.match(mainSource, /trainingRunStatusLabel: string/, "side training state should expose visible run status");
  assert.match(mainSource, /<SideTrainingPanel[\s\S]*training=\{pilot\.training\}/, "PilotPanel should place training inside the controller bay");
  assert.match(mainSource, /className="side-training-pack-identity"/, "side training panel should prominently show strategy pack identity");
  assert.match(mainSource, /className=\{sideTrainingPanelClassName\(training\)\}/, "side training panel should distinguish queued and active training states");
  assert.match(mainSource, /className=\{sideTrainingTitleClassName\(training\)\}/, "side training title should distinguish queued and active training states");
  assert.match(mainSource, /className="side-training-status"/, "side training panel should visibly label queued vs active status");
  assert.match(mainSource, /onSideTrainingToggle/, "side training title should route per-side training start and stop");
  assert.match(mainSource, /className="side-training-title-strategy"/, "side training title should show the current top-level AI strategy category");
  assert.doesNotMatch(mainSource, /strategyCategoryOptions/, "side training panel should not duplicate the top-level AI strategy selector");
  assert.doesNotMatch(mainSource, /selectorClassName\("side-strategy-category-selector"/, "side training panel should not render its own strategy category selector");
  assert.doesNotMatch(mainSource, /onSideTrainingStrategyChange/, "side training panel should not own strategy category changes");
  assert.match(mainSource, /<strong>\{training\.packDisplayName\}<\/strong>/, "pack identity should remain visible without duplicating the strategy selector");
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
  assert.match(mainSource, /onSideTrainingRunToggle/, "auto-patch run start and stop should be routed with side ownership");
  assert.match(cssSource, /\.side-training-panel\s*\{/, "side training panel should have stable styling");
  assert.match(cssSource, /\.side-training-panel\.queued-training-side\s*\{/, "queued training panel should have selected-but-not-active styling");
  assert.match(cssSource, /\.side-training-panel\.active-training-side\s*\{/, "active training panel should have active border styling");
  assert.match(cssSource, /\.side-training-title-button\s*\{/, "side training title button should have stable styling");
  assert.doesNotMatch(mainSource, /className="training-stat-grid"/, "side training panel should not show debug metric cards");
  assert.doesNotMatch(mainSource, /className="training-note-grid"/, "side training panel should not show debug note cards");
  assert.match(cssSource, /\.side-training-title-strategy\s*\{/, "strategy category on the title should have stable styling");
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
  assert.match(mainSource, /className="training-session-control"/, "operation strategy control should expose shared training status");
  assert.match(mainSource, /training\.trainingSessionActive \? "operation-strategy-control training-active" : "operation-strategy-control"/, "operation strategy control should visibly mark active training sessions");
  assert.match(mainSource, /const locked = tasLocked \|\| trainingLocked/, "mode controls should be locked by TAS or active side training");
  assert.match(mainSource, /const strategyControlsLocked = tasLocked \|\| trainingLocked/, "top strategy buttons should be locked by TAS or active side training");
  assert.match(mainSource, /disabled=\{strategyControlsLocked \|\| strategyUnavailable\}/, "top strategy buttons should be disabled while training owns strategy selection or the pack lacks that strategy");
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

test("side training title toggles independent sessions and only locks its own play area", () => {
  assert.match(mainSource, /selectedTrainingSides/, "1P and 2P training selection should be modeled as independent side flags");
  assert.match(mainSource, /activeTrainingSides/, "active training should be tracked per side instead of one global selected side");
  assert.doesNotMatch(mainSource, /selectedTrainingSide === "1P"/, "1P and 2P training panels must not be mutually exclusive");
  assert.doesNotMatch(mainSource, /selectedTrainingSide === "2P"/, "2P training should not depend on a single selected side");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["1P"\]\.trainingSessionActive\}/, "1P training should lock only the 1P game area");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["2P"\]\.trainingSessionActive\}/, "2P training should lock only the 2P game area");
  assert.match(mainSource, /const trainingSessionActive = activeTrainingSides\["1P"\] \|\| activeTrainingSides\["2P"\]/, "global training status should summarize side sessions");
  assert.match(mainSource, /const toggleSideTraining = useCallback\(\(side: PlayerSide\) => \{[\s\S]*activeTrainingSides\[side\][\s\S]*stopSideTraining\(side\)[\s\S]*startSideTraining\(side\)/, "training title should toggle the matching side between active and inactive");
  assert.match(mainSource, /setActiveTrainingSides\(\(current\) => \(\{ \.\.\.current, \[side\]: true \}\)\)/, "per-side training start should preserve other active side locks");
  assert.match(mainSource, /setActiveTrainingSides\(\(current\) => \(\{ \.\.\.current, \[side\]: false \}\)\)/, "per-side training stop should preserve other active side locks");
  assert.doesNotMatch(mainSource, /setActiveTrainingSides\(\{ "1P": false, "2P": false \}\)/, "training stop should not be a global all-sides control");
});

test("selected training sides are ready until the title activates them", () => {
  assert.match(mainSource, /function sideTrainingPanelClassName/, "panel class should be derived from queued and active training state");
  assert.match(mainSource, /training\.trainingSessionActive \? "side-training-panel active-training-side" : training\.selectedForTraining \? "side-training-panel queued-training-side" : "side-training-panel"/, "selected inactive sides should be queued, not active");
  assert.match(mainSource, /training\.trainingSessionActive \? "side-training-title-button active" : training\.selectedForTraining \? "side-training-title-button queued" : "side-training-title-button"/, "selected inactive titles should use queued styling");
  assert.match(mainSource, /selectedForTraining\s*\?\s*language === "en-US" \? "Ready" : "待训练"/, "selected inactive side should show a ready label because the title is the start control");
  assert.doesNotMatch(mainSource, /Queued to start/, "side training should no longer describe a separate start-button queue");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["1P"\]\.trainingSessionActive\}/, "top 1P game controls should lock only after 1P training starts");
  assert.match(mainSource, /trainingLocked=\{sideTrainingStates\["2P"\]\.trainingSessionActive\}/, "top 2P game controls should lock only after 2P training starts");
});

test("side training panels use the Training title as the per-side start stop control", () => {
  assert.match(mainSource, /trainingToggleLabel: string/, "side training state should expose an accessible title toggle label");
  assert.match(mainSource, /onSideTrainingToggle: \(side: PlayerSide\) => void/, "side actions should include one title toggle command");
  assert.match(mainSource, /aria-pressed=\{training\.trainingSessionActive\}/, "the Training title should behave like an active-session toggle");
  assert.match(mainSource, /aria-label=\{training\.trainingToggleLabel\}/, "the Training title should describe whether it starts or stops this side");
  assert.match(mainSource, /onClick=\{\(\) => actions\.onSideTrainingToggle\(training\.side\)\}/, "clicking the Training title should toggle its own side");
  assert.match(mainSource, /className="side-training-title-strategy"/, "the Training title should show the current strategy category");
  assert.doesNotMatch(mainSource, /className="side-training-start-button"/, "side panels should not render a separate training start button");
  assert.doesNotMatch(mainSource, /sideStartLabel/, "side panels should not keep a separate start-button label");
  assert.doesNotMatch(mainSource, /onSideTrainingStart: \(side: PlayerSide\) => void/, "side actions should not expose a separate start button command");
});

test("operation strategy control keeps only shared strategy-training workflow actions", () => {
  assert.doesNotMatch(mainSource, /onTrainingSessionStart/, "training console should not expose a separate whole-module training start button");
  assert.doesNotMatch(mainSource, /onTrainingSessionStop/, "training console should not expose a separate whole-module training stop button");
  assert.match(mainSource, /function trainingControlModeForSelection/, "training session start should derive control mode from baseline and training method");
  assert.match(mainSource, /setActiveTrainingSides/, "starting and stopping training should update side-owned training sessions");
  assert.doesNotMatch(mainSource, /canStartTrainingSession/, "global training state should not keep a start-button gate");
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

test("strategy buttons are derived from the selected resource pack manifest", () => {
  assert.match(mainSource, /const currentPackStrategyKeys = \["survival-v0", "speedrun-v0"\] as const satisfies readonly AiStrategyKey\[\]/, "official Contra pack should expose only the two current selectable candidate strategy keys");
  assert.match(mainSource, /const standardStrategyCategoryKeys = \["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"\] as const satisfies readonly AiStrategyKey\[\]/, "official Contra pack should keep the five standard strategy category slots visible");
  assert.match(mainSource, /\{ key: "speedrun-v0", label: "快速推进候选", description: "TAS\/FCEUX 基准待训练，未验证通关" \}/, "speedrun should be labeled as an unvalidated TAS/FCEUX-baseline candidate, not a learned FCEUX controller");
  assert.match(mainSource, /if \(strategyKey === "speedrun-v0"\) return "快速推进候选"/, "pilot status should not imply speedrun is already validated");
  assert.match(mainSource, /strategySlots:\s*standardStrategyCategoryKeys/, "official Contra pack should display all standard category slots");
  assert.match(mainSource, /strategyKeys:\s*currentPackStrategyKeys/, "official Contra pack should consume the current mainline strategy keys");
  assert.match(mainSource, /strategyKeys:\s*\["personal-v0"\]/, "personal draft pack should expose personal strategy only after it is represented as a pack key");
  assert.match(mainSource, /strategySlots: readonly AiStrategyKey\[\]/, "resource pack metadata should require declared strategy slots");
  assert.match(mainSource, /strategyKeys: readonly AiStrategyKey\[\]/, "resource pack metadata should require declared strategy keys");
  assert.match(mainSource, /type ResourcePackStrategyOption = \{ key: AiStrategyKey; available: boolean \}/, "strategy button options should expose whether the package contains the strategy");
  assert.match(mainSource, /function strategyOptionsForResourcePack\(resourcePackId: StrategyResourcePackId\): ResourcePackStrategyOption\[\]/, "strategy buttons should be derived from the selected resource pack");
  assert.match(mainSource, /function coerceStrategyForResourcePack\(strategyKey: AiStrategyKey, resourcePackId: StrategyResourcePackId\)/, "current strategy should be coerced when switching packs");
  assert.match(mainSource, /strategyResourcePackId: StrategyResourcePackId/, "Pilot should carry the selected resource pack id for button rendering");
  assert.match(mainSource, /const strategyButtons = strategyOptionsForResourcePack\(pilot\.strategyResourcePackId\)/, "PilotPanel should render buttons for the pilot's selected resource pack");
  assert.match(mainSource, /strategyButtons\.map/, "PilotPanel should map dynamic strategy buttons instead of a hardcoded global list");
  assert.match(mainSource, /const strategyUnavailable = !option\.available/, "PilotPanel should virtualize strategies that are not distributed with the current package");
  assert.match(mainSource, /disabled=\{strategyControlsLocked \|\| strategyUnavailable\}/, "unavailable package strategies should be visible but disabled");
  assert.match(mainSource, /strategyUnavailable \? "strategy-button unavailable"/, "unavailable package strategies should use a dimmed button class");
  assert.match(mainSource, /coerceStrategyForResourcePack\(current\[side\], packId\)/, "changing a side resource pack should coerce that side's current strategy");
  assert.match(mainSource, /coerceStrategyForResourcePack\(current\["2P"\], packId\)/, "1P pack changes should coerce synced 2P strategy when 2P follows 1P");
  assert.doesNotMatch(mainSource, /const cockpitAiStrategyOptions = aiStrategyOptions\.filter/, "cockpit strategy choices should not be a hardcoded global whitelist");
  assert.doesNotMatch(mainSource, /\["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0", "personal-v0"\]\.includes\(option\.key\)/, "personal-v0 must not be merged into the official pack's strategy buttons");
  assert.match(cssSource, /\.strategy-button\.unavailable\s*\{/, "unavailable strategy buttons should have stable dimmed styling");
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
  assert.match(mainSource, /const sideTrainingConfigurable = training\.selectedForTraining && !training\.trainingConfigLocked/, "side panel should allow configuration only before a training session starts");
  assert.match(mainSource, /const directRunBaseline = isNewRunBaseline\(training\.selectedBaselineId\)/, "side panel should detect direct human or AI run baselines");
  assert.match(mainSource, /disabled=\{!sideTrainingConfigurable\}[\s\S]*value=\{training\.selectedBaselineId\}/, "strategy baseline selection should be configured before training starts and locked during training");
  assert.match(mainSource, /disabled=\{!sideTrainingConfigurable \|\| directRunBaseline\}/, "training method choices should be configured before training starts and locked during training");
  assert.match(mainSource, /const showDirectRunActions = directRunBaseline/, "direct new-run baselines should expose start/archive actions without requiring a method");
  assert.match(mainSource, /className=\{selectorClassName\("side-training-method-selector", !sideTrainingConfigurable \|\| directRunBaseline\)\}/, "locked method selector should have dark inactive styling");
  assert.match(mainSource, /className=\{selectorClassName\("side-baseline-selector", !sideTrainingConfigurable\)\}/, "locked baseline selector should have dark inactive styling");
  assert.match(mainSource, /disabled=\{!sideTrainingActive \|\| actions\.traceRecording\}/, "direct start action should be gated by side training activity");
});

test("direct training baselines synchronize side play mode while training owns input", () => {
  assert.match(mainSource, /function trainingControlModeForSelection/, "training baseline should choose the side play mode");
  assert.match(mainSource, /if \(baselineId === "human-demo-new"\) return "human"/, "new human demonstration baseline should switch the side to human input");
  assert.match(mainSource, /if \(baselineId === "ai-run-new"\) return "ai"/, "new AI run baseline should switch the side to AI input");
  assert.match(mainSource, /if \(activeTrainingSides\[side\]\) \{[\s\S]*baseline change blocked because training is active/, "baseline changes should be blocked after training starts");
  assert.match(mainSource, /const mode = trainingControlModeForSelection\(selectedSideBaselineIds\[side\], selectedTrainingMethod\);[\s\S]*changeControlMode\(side, mode\)/, "starting training should synchronize every active side to its locked baseline mode");
});

test("dual AI training uses one shared method and locks it after start", () => {
  assert.match(mainSource, /const \[selectedTrainingMethod, setSelectedTrainingMethod\] = useState<SideTrainingMethod>/, "training method should be shared by both sides for a single experiment session");
  assert.doesNotMatch(mainSource, /selectedSideTrainingMethods/, "training method should not be stored as independent 1P and 2P methods");
  assert.match(mainSource, /setSelectedTrainingMethod\(option\.key\)/, "changing method from either side should update the shared method");
  assert.match(mainSource, /if \(trainingSessionActive\) \{[\s\S]*method change blocked because training is active/, "method changes should be blocked once any training side starts");
  assert.match(mainSource, /buildSideTrainingStateV2\("1P"[\s\S]*selectedTrainingMethod/, "1P panel should receive the shared training method");
  assert.match(mainSource, /buildSideTrainingStateV2\("2P"[\s\S]*selectedTrainingMethod/, "2P panel should receive the shared training method");
});

test("auto-patch run start synchronizes capture and exposes a stop run control", () => {
  assert.match(mainSource, /trainingRunActiveSides/, "auto-patch run state should be tracked per training side");
  assert.match(mainSource, /const trainingRunActive = trainingRunActiveSides\["1P"\] \|\| trainingRunActiveSides\["2P"\]/, "global run status should summarize side run state");
  assert.match(mainSource, /const startSideTrainingRun = useCallback\(\(side: PlayerSide\) => \{[\s\S]*startTraceRecording\(\)[\s\S]*setRunning\(true\)/, "starting an auto-patch run should begin trace capture and run the emulator together");
  assert.match(mainSource, /const stopSideTrainingRun = useCallback\(\(side: PlayerSide\) => \{[\s\S]*stopTraceRecording\(\)[\s\S]*setRunning\(false\)/, "stopping an auto-patch run should stop capture and pause the run together");
  assert.match(mainSource, /onSideTrainingRunToggle: \(side: PlayerSide\) => void/, "side actions should expose one auto-patch run toggle");
  assert.match(mainSource, /training\.trainingRunActive \? "停止跑局" : "开始跑局"/, "auto-patch UI should show start or stop run from the same control");
  assert.match(mainSource, /actions\.onSideTrainingRunToggle\(training\.side\)/, "auto-patch run button should call the run toggle");
});

test("strategy input only writes after gameplay starts and stops on pause", () => {
  assert.match(mainSource, /function strategyRuntimeCanWrite/, "runtime should centralize the strategy write gate");
  assert.match(mainSource, /function runtimeStartupButtons/, "browser runtime should own menu start/select input outside the strategy pack");
  assert.match(mainSource, /setSourceButtons\("1P", "system", startupButtons\)/, "startup input should use the system source instead of the AI strategy source");
  assert.match(mainSource, /runtimeStatus === "running" && gameplayActive/, "strategy write gate should require both running status and active gameplay");
  assert.match(mainSource, /const applyAiInputs = useCallback\(\(snapshot: GameRamSnapshot \| null, active: boolean, runtimeStatus: RuntimeStatus\) => \{/, "AI input writer should receive runtime status explicitly");
  assert.match(mainSource, /if \(!strategyRuntimeCanWrite\(runtimeStatus, active\)\) \{[\s\S]*setSourceButtons\(side, "ai", createButtonState\(\)\)/, "AI input writer should clear AI buttons when paused, stopped, or outside gameplay");
  assert.match(mainSource, /if \(!snapshot \|\| !gameplayActive\) return next;/, "strategy decisions should not press START or SELECT before gameplay is active");
  assert.match(mainSource, /applyAiInputs\(beforeSnapshot, gameplayActiveRef\.current, runningRef\.current \? "running" : "paused"\)/, "frame loop should pass current run status into the AI write gate");
  assert.match(mainSource, /runtimeStatus: runtimeStatus === "running" \? "running" : "paused"/, "training trace samples should not label paused frames as running");
});

test("botrun stop path clears runtime inputs before publishing the final paused report", () => {
  assert.match(mainSource, /runningRef\.current = false;\s*clearRuntimeOwnedInputs\(\);/, "botrun completion should clear AI/TAS/system inputs before reporting paused state");
  assert.match(mainSource, /const terminalRuntime = lastRuntime;/, "botrun should preserve the last active frame separately for evidence review");
  assert.match(mainSource, /runtimeStatus: statusValue === "error" \? "error" : "paused"[\s\S]*buttons: finalButtonsRef\.current\["1P"\][\s\S]*rawAiButtons: lastRawAiButtonsRef\.current\["1P"\][\s\S]*lockedAiButtons: lastLockedAiButtonsRef\.current\["1P"\]/, "final botrun runtime should be rebuilt from cleared runtime-owned inputs");
  assert.match(mainSource, /terminalRuntime,/, "botrun report should export the last active runtime separately from the final paused runtime");
});

test("side training panels derive their target from the locked top AI strategy", () => {
  assert.match(mainSource, /function trainingProfileForStrategy/, "training target should be derived from the selected strategy key");
  assert.match(mainSource, /function strategyTrainingCandidateCount/, "candidate counts should be strategy-aware");
  assert.doesNotMatch(mainSource, /const onSideTrainingStrategyChange = useCallback/, "training panel should not have a second strategy-category change handler");
  assert.match(mainSource, /strategyModels\["1P"\]/, "1P training state should derive from the top 1P AI strategy selection");
  assert.match(mainSource, /strategyModels\["2P"\]/, "2P training state should derive from the top 2P AI strategy selection");
  assert.match(mainSource, /const strategyControlsLocked = tasLocked \|\| trainingLocked/, "top AI strategy controls should lock while that side is training");
  assert.match(mainSource, /disabled=\{strategyControlsLocked \|\| strategyUnavailable\}/, "training should prevent strategy category switching while unavailable pack slots stay disabled");
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
  assert.match(mainSource, /baselineSourceKind:\s*selectedBaselineOption\?\.sourceKind \?\? "strategy-pack"/, "archival should record whether evidence came from a pack, TAS side baseline, human demo, or AI run");
  assert.match(mainSource, /trainingMethod:\s*selectedTrainingMethod/, "archival should record the active shared training method");
  assert.match(mainSource, /romMetadata\?\.romProfileId/, "archival should attach the loaded ROM profile id");
  assert.match(mainSource, /data-testid="side-training-evidence-json"/, "browser tests should be able to inspect the latest side training evidence");
  assert.match(mainSource, /data-testid="side-training-evidence-1p-json"/, "1P evidence should be inspectable separately");
  assert.match(mainSource, /data-testid="side-training-evidence-2p-json"/, "2P evidence should be inspectable separately");
});

test("strategy package save consumes archived side training evidence", () => {
  assert.match(mainSource, /createStrategyPackageEvidenceExport/, "save workflow should use the standard package evidence export helper");
  assert.match(mainSource, /createCandidateStrategyFragmentProposal/, "save workflow should create candidate fragment proposals from TAS baselines plus TraceEvidence");
  assert.match(mainSource, /createStrategyPackageValidationReport/, "validation replay should be converted into a standard validation report");
  assert.match(mainSource, /strategyPackageValidationReport/, "package save should retain the latest validation report object");
  assert.match(mainSource, /candidateFragmentProposals:/, "package save should include candidate fragment proposals when evidence has a TAS side baseline");
  assert.match(mainSource, /evidenceBySide:\s*sideTrainingTraceEvidence/, "package save should consume the latest side-owned archived evidence");
  assert.match(mainSource, /validationReport:\s*strategyPackageValidationReport/, "package save should consume the standard validation report");
  assert.match(mainSource, /validationReplayComplete/, "package save should stay behind validation replay");
  assert.match(mainSource, /downloadStrategyPackageEvidenceExport/, "package save should download or persist the evidence export payload");
  assert.match(mainSource, /data-testid="strategy-package-evidence-export-json"/, "browser tests should be able to inspect the latest package evidence export");
  assert.match(mainSource, /data-testid="strategy-package-validation-report-json"/, "browser tests should be able to inspect the latest validation report");
  assert.doesNotMatch(mainSource, /new Blob\(\[rom/i, "package save must not include ROM bytes");
});
