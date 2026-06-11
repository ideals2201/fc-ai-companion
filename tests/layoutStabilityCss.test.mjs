import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "styles.css"), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleFor(selector) {
  const matches = Array.from(css.matchAll(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`, "g")));
  assert.ok(matches.length > 0, `${selector} rule should exist`);
  return matches.map((match) => match[1]).join("\n");
}

function assertDeclaration(rule, property, expectedPattern) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  assert.ok(match, `${property} declaration should exist`);
  assert.match(match[1].trim(), expectedPattern);
}

function assertNoDeclaration(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  assert.equal(match, null, `${property} declaration should not exist`);
}

function rulesWithSelectorFragment(fragment) {
  return Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter((match) => match[1].includes(fragment))
    .map((match) => match[2]);
}

test("primary cockpit windows keep stable outer dimensions", () => {
  const equipmentLayout = ruleFor(".equipment-layout");
  assertDeclaration(equipmentLayout, "grid-template-columns", /^minmax\(260px, 310px\) minmax\(520px, 1fr\) minmax\(260px, 310px\)$/);
  assertDeclaration(equipmentLayout, "gap", /^8px$/);

  const controllerBay = ruleFor(".controller-bay");
  assertDeclaration(controllerBay, "height", /^1480px$/);
  assertDeclaration(controllerBay, "overflow", /^hidden$/);

  const centerColumn = ruleFor(".center-column");
  assertDeclaration(centerColumn, "grid-template-rows", /^620px 1460px$/);

  const tvShell = ruleFor(".tv-shell");
  assertDeclaration(tvShell, "height", /^620px$/);
  assertDeclaration(tvShell, "overflow", /^hidden$/);

  const consoleDeck = ruleFor(".console-deck");
  assertDeclaration(consoleDeck, "grid-template-rows", /^420px 360px 620px$/);
  assertDeclaration(consoleDeck, "height", /^1460px$/);
  assertDeclaration(consoleDeck, "overflow", /^hidden$/);

  const consoleMachineFrame = ruleFor(".console-machine-frame");
  assertDeclaration(consoleMachineFrame, "grid-template-rows", /^minmax\(0, 1fr\) auto$/);

  const dataDashboard = ruleFor(".data-dashboard");
  assertDeclaration(dataDashboard, "height", /^700px$/);
  assertDeclaration(dataDashboard, "overflow", /^hidden$/);

  const debugFloor = ruleFor(".debug-floor");
  assertDeclaration(debugFloor, "grid-template-rows", /^270px$/);
});

test("TV fullscreen targets only the screen frame, not the control shell", () => {
  const fullScreenFrame = ruleFor(".screen-frame:fullscreen");
  assertDeclaration(fullScreenFrame, "width", /^100vw$/);
  assertDeclaration(fullScreenFrame, "height", /^100vh$/);
  assertDeclaration(fullScreenFrame, "max-width", /^none$/);

  const fullScreenPicture = ruleFor(".screen-frame:fullscreen .screen-picture");
  assertDeclaration(fullScreenPicture, "width", /^min\(100vw, calc\(100vh \* 256 \/ 240\)\)$/);
  assertDeclaration(fullScreenPicture, "height", /^min\(100vh, calc\(100vw \* 240 \/ 256\)\)$/);

  assert.equal(css.includes(".tv-shell:fullscreen"), false, "TV shell should not enter fullscreen with controls");
});

test("training controls extend downward without turning the panel into a scroll area", () => {
  const sidePackIdentity = ruleFor(".side-training-pack-identity");
  assertDeclaration(sidePackIdentity, "place-items", /^center$/);
  assertDeclaration(sidePackIdentity, "text-align", /^center$/);
  assertNoDeclaration(sidePackIdentity, "grid-template-columns");

  const strategyControl = ruleFor(".operation-strategy-control");
  assertDeclaration(strategyControl, "gap", /^8px$/);
  assertDeclaration(strategyControl, "padding", /^10px$/);
  assertNoDeclaration(strategyControl, "overflow");

  const strategyPackageBrowser = ruleFor(".strategy-package-browser-frame");
  assertDeclaration(strategyPackageBrowser, "padding", /^9px$/);

  const strategyPackageMainGrid = ruleFor(".strategy-package-main-grid");
  assertDeclaration(strategyPackageMainGrid, "grid-template-columns", /^minmax\(260px, 0\.46fr\) minmax\(0, 1fr\)$/);

  const strategyResourceRouting = ruleFor(".strategy-resource-routing");
  assertDeclaration(strategyResourceRouting, "grid-template-columns", /^repeat\(2, minmax\(0, 1fr\)\) minmax\(88px, auto\)$/);

  const strategyPackStatusStrip = ruleFor(".strategy-pack-status-strip");
  assertDeclaration(strategyPackStatusStrip, "grid-template-columns", /^repeat\(4, minmax\(0, 1fr\)\)$/);

  const strategyOperationsResultsGrid = ruleFor(".strategy-operations-results-grid");
  assertDeclaration(strategyOperationsResultsGrid, "grid-template-columns", /^minmax\(330px, 0\.42fr\) minmax\(0, 1fr\)$/);

  const strategyCommandColumn = ruleFor(".strategy-command-column");
  assertDeclaration(strategyCommandColumn, "grid-template-rows", /^auto minmax\(0, 1fr\)$/);

  const strategyPackageSavePanel = ruleFor(".strategy-package-save-panel");
  assertDeclaration(strategyPackageSavePanel, "grid-template-columns", /^86px minmax\(0, 1fr\)$/);
  assertDeclaration(strategyPackageSavePanel, "grid-template-areas", /"scope actions"/);

  const strategyPackageActionGrid = ruleFor(".strategy-package-action-grid");
  assertDeclaration(strategyPackageActionGrid, "grid-template-columns", /^repeat\(2, minmax\(0, 1fr\)\)$/);

  const strategyPackageSaveMeta = ruleFor(".strategy-package-save-meta");
  assertDeclaration(strategyPackageSaveMeta, "grid-template-columns", /^1fr$/);

  const strategyResultBoard = ruleFor(".strategy-result-board");
  assertDeclaration(strategyResultBoard, "grid-template-columns", /^repeat\(2, minmax\(0, 1fr\)\)$/);

  const packageScope = ruleFor(".package-scope-control");
  assertDeclaration(packageScope, "min-height", /^0$/);

  const sideTrainingStrategySelector = ruleFor(".side-training-strategy-selector");
  assertDeclaration(sideTrainingStrategySelector, "grid-template-columns", /^minmax\(0, 1fr\)$/);

  const newPackageSourceSelector = ruleFor(".new-package-source-selector");
  assertDeclaration(newPackageSourceSelector, "grid-template-columns", /^1fr$/);

  const packageScopeToggleStack = ruleFor(".package-scope-toggle-stack");
  assertDeclaration(packageScopeToggleStack, "grid-template-rows", /^repeat\(2, 1fr\)$/);
});

test("active training areas use highlighted borders without dimming content", () => {
  const globalDisabled = ruleFor("button:disabled");
  assertNoDeclaration(globalDisabled, "opacity");
  assertNoDeclaration(globalDisabled, "filter");

  const queuedTrainingPanel = ruleFor(".side-training-panel.queued-training-side");
  assertDeclaration(queuedTrainingPanel, "border-color", /rgba\(126,\s*200,\s*255,\s*0\.58\)/);
  assertDeclaration(queuedTrainingPanel, "box-shadow", /rgba\(126,\s*200,\s*255,\s*0\.18\)/);
  assertNoDeclaration(queuedTrainingPanel, "opacity");
  assertNoDeclaration(queuedTrainingPanel, "filter");

  const activeTrainingPanel = ruleFor(".side-training-panel.active-training-side");
  assertDeclaration(activeTrainingPanel, "border-color", /rgba\(104,\s*227,\s*145,\s*0\.82\)/);
  assertDeclaration(activeTrainingPanel, "box-shadow", /rgba\(104,\s*227,\s*145,\s*0\.22\)/);
  assertNoDeclaration(activeTrainingPanel, "opacity");
  assertNoDeclaration(activeTrainingPanel, "filter");

  const activeTrainingControl = ruleFor(".operation-strategy-control.training-active");
  assertDeclaration(activeTrainingControl, "border-color", /rgba\(104,\s*227,\s*145,\s*0\.78\)/);
  assertDeclaration(activeTrainingControl, "box-shadow", /rgba\(104,\s*227,\s*145,\s*0\.2\)/);
  assertNoDeclaration(activeTrainingControl, "opacity");
  assertNoDeclaration(activeTrainingControl, "filter");

  for (const rule of rulesWithSelectorFragment(".training-locked")) {
    assertNoDeclaration(rule, "opacity");
    assertNoDeclaration(rule, "filter");
  }

  for (const rule of rulesWithSelectorFragment(":disabled")) {
    assertNoDeclaration(rule, "opacity");
    assertNoDeclaration(rule, "filter");
  }
});

test("non-log cockpit content is fully displayed instead of becoming a scroll window", () => {
  for (const selector of [".metric-stack", ".data-groups", ".cartridge-slot", ".slot-table-card", ".stack-list", ".input-meta"]) {
    const rule = ruleFor(selector);
    assertNoDeclaration(rule, "overflow");
    assertNoDeclaration(rule, "overflow-y");
  }

  const logLines = ruleFor(".log-lines");
  assertDeclaration(logLines, "overflow", /^auto$/);

  const romList = ruleFor(".rom-list");
  assertDeclaration(romList, "height", /^155px$/);
  assertDeclaration(romList, "max-height", /^155px$/);
  assertDeclaration(romList, "overflow", /^auto$/);

  const consoleLeft = ruleFor(".console-left");
  assertDeclaration(consoleLeft, "min-height", /^0$/);

  const cartridgeSlot = ruleFor(".cartridge-slot");
  assertDeclaration(cartridgeSlot, "min-height", /^0$/);

  const romLibraryBrowser = ruleFor(".rom-library-browser");
  assertDeclaration(romLibraryBrowser, "min-height", /^0$/);

  const romLibraryBody = ruleFor(".rom-library-body");
  assertDeclaration(romLibraryBody, "min-height", /^0$/);
  assertDeclaration(romLibraryBody, "align-items", /^start$/);

  const aiDialogue = ruleFor(".ai-dialogue");
  assertNoDeclaration(aiDialogue, "max-height");
  assertNoDeclaration(aiDialogue, "overflow");

  const microStream = ruleFor(".micro-stream");
  assertDeclaration(microStream, "max-height", /^132px$/);
  assertDeclaration(microStream, "overflow", /^auto$/);

  const statValue = ruleFor(".stat-tile strong");
  assertDeclaration(statValue, "overflow-wrap", /^anywhere$/);
  assertNoDeclaration(statValue, "text-overflow");

  const dataValue = ruleFor(".data-cell strong");
  assertDeclaration(dataValue, "overflow-wrap", /^anywhere$/);
  assertNoDeclaration(dataValue, "text-overflow");

  const codeCell = ruleFor(".micro-stream code");
  assertDeclaration(codeCell, "white-space", /^nowrap$/);
  assertDeclaration(codeCell, "overflow", /^hidden$/);
  assertDeclaration(codeCell, "text-overflow", /^ellipsis$/);
});
