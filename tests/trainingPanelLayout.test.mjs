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
  assert.match(mainSource, /function SideTrainingPanel/, "controller bay should render a side training panel");
  assert.match(mainSource, /training: SideTrainingState/, "Pilot should carry its own training state");
  assert.match(mainSource, /<SideTrainingPanel training=\{pilot\.training\}/, "PilotPanel should place training inside the controller bay");
  assert.match(cssSource, /\.side-training-panel\s*\{/, "side training panel should have stable styling");
  assert.match(cssSource, /\.training-stat-grid\s*\{/, "side training metrics should be compact grid cards");
});

test("center column includes a global training console for shared evidence and validation", () => {
  assert.match(mainSource, /type GlobalTrainingState/, "global training state should be separate from side panels");
  assert.match(mainSource, /function GlobalTrainingConsole/, "center column should render a shared training console");
  assert.match(mainSource, /globalTraining=\{globalTraining\}/, "center column should pass global training state into the host console");
  assert.match(mainSource, /<GlobalTrainingConsole[\s\S]*training=\{globalTraining\}/, "host console should place global training under the console controls");
  assert.match(cssSource, /\.training-console\s*\{/, "global training console should have stable styling");
  assert.match(cssSource, /\.training-console-grid\s*\{/, "global training console should expose compact status tiles");
});
