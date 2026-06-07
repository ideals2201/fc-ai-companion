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
  assertDeclaration(consoleDeck, "grid-template-rows", /^auto 420px auto 360px 520px$/);
  assertDeclaration(consoleDeck, "height", /^1460px$/);
  assertDeclaration(consoleDeck, "overflow", /^hidden$/);

  const dataDashboard = ruleFor(".data-dashboard");
  assertDeclaration(dataDashboard, "height", /^700px$/);
  assertDeclaration(dataDashboard, "overflow", /^hidden$/);

  const debugFloor = ruleFor(".debug-floor");
  assertDeclaration(debugFloor, "grid-template-rows", /^270px$/);
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

  const trainingPackBanner = ruleFor(".training-pack-banner");
  assertDeclaration(trainingPackBanner, "min-height", /^38px$/);

  const strategyResourceRouting = ruleFor(".strategy-resource-routing");
  assertDeclaration(strategyResourceRouting, "grid-template-columns", /^repeat\(2, minmax\(0, 1fr\)\) minmax\(88px, auto\)$/);

  const strategyResourceInfo = ruleFor(".strategy-resource-info");
  assertDeclaration(strategyResourceInfo, "grid-template-columns", /^repeat\(6, minmax\(0, 1fr\)\)$/);

  const strategyPackageSavePanel = ruleFor(".strategy-package-save-panel");
  assertDeclaration(strategyPackageSavePanel, "grid-template-columns", /^96px minmax\(0, 1fr\) minmax\(0, 1\.1fr\) minmax\(0, 1fr\) minmax\(0, 1fr\)$/);

  const strategyResultBoard = ruleFor(".strategy-result-board");
  assertDeclaration(strategyResultBoard, "grid-template-columns", /^repeat\(5, minmax\(0, 1fr\)\)$/);

  const packageScope = ruleFor(".package-scope-control");
  assertDeclaration(packageScope, "min-height", /^82px$/);

  const packageScopeToggleStack = ruleFor(".package-scope-toggle-stack");
  assertDeclaration(packageScopeToggleStack, "grid-template-rows", /^repeat\(2, 1fr\)$/);
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
  assertDeclaration(romList, "height", /^240px$/);
  assertDeclaration(romList, "max-height", /^240px$/);
  assertDeclaration(romList, "overflow", /^auto$/);

  const consoleLeft = ruleFor(".console-left");
  assertDeclaration(consoleLeft, "min-height", /^420px$/);

  const cartridgeSlot = ruleFor(".cartridge-slot");
  assertDeclaration(cartridgeSlot, "min-height", /^380px$/);

  const romLibraryBrowser = ruleFor(".rom-library-browser");
  assertDeclaration(romLibraryBrowser, "min-height", /^310px$/);

  const romLibraryBody = ruleFor(".rom-library-body");
  assertDeclaration(romLibraryBody, "min-height", /^240px$/);

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
