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
  assertDeclaration(centerColumn, "grid-template-rows", /^620px 850px$/);

  const tvShell = ruleFor(".tv-shell");
  assertDeclaration(tvShell, "height", /^620px$/);
  assertDeclaration(tvShell, "overflow", /^hidden$/);

  const consoleDeck = ruleFor(".console-deck");
  assertDeclaration(consoleDeck, "height", /^850px$/);
  assertDeclaration(consoleDeck, "overflow", /^hidden$/);

  const dataDashboard = ruleFor(".data-dashboard");
  assertDeclaration(dataDashboard, "height", /^700px$/);
  assertDeclaration(dataDashboard, "overflow", /^hidden$/);

  const debugFloor = ruleFor(".debug-floor");
  assertDeclaration(debugFloor, "grid-template-rows", /^270px$/);
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
  assertDeclaration(romList, "height", /^170px$/);
  assertDeclaration(romList, "max-height", /^170px$/);
  assertDeclaration(romList, "overflow", /^auto$/);

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
