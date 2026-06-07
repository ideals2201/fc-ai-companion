import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "styles.css"), "utf8");
const registrySource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "tasRegistry.ts"), "utf8");

test("TAS window can apply recommended baselines to either player side", () => {
  assert.match(registrySource, /export function tasBaselineLabel/, "registry should expose individual baseline labels");
  assert.match(mainSource, /type TasStrategyBaseline/, "main runtime should receive TAS baseline ids with type safety");
  assert.match(mainSource, /onApplyBaseline: \(baseline: TasStrategyBaseline, side: PlayerSide\) => void/, "TAS window should expose baseline application");
  assert.match(mainSource, /applyTasBaselineToSide/, "runtime should implement the side-specific baseline application");
  assert.match(mainSource, /onApplyBaseline\(baseline, "1P"\)/, "TAS window should allow applying a baseline to 1P");
  assert.match(mainSource, /onApplyBaseline\(baseline, "2P"\)/, "TAS window should allow applying a baseline to 2P");
  assert.match(mainSource, /baseline === "special-reference"/, "special-reference should not be applied as a live runtime strategy");
});

test("TAS window exposes the machine-readable training base path", () => {
  assert.match(mainSource, /tasEntry\?\.trainingBasePath/, "TAS detail should display the training base artifact path");
  assert.match(mainSource, /tas\.artifact/, "TAS UI should label the artifact path");
  assert.match(cssSource, /\.tas-baseline-actions\s*\{/, "baseline action buttons should have stable compact styling");
});

test("TAS playback status is attached to the window title", () => {
  assert.match(mainSource, /className="tas-header-status"/, "TAS status should sit next to the TAS window title");
  assert.match(mainSource, /movies\.length/, "TAS title status should include the number of matched movies");
  assert.doesNotMatch(mainSource, /className="tas-status-line"/, "TAS status should not consume a separate bottom row");
  assert.match(cssSource, /\.tas-header-status\s*\{/, "title-level TAS status should have compact header styling");
});

test("pilot controller bays enter a visible locked TAS replay state", () => {
  assert.match(mainSource, /tasLocked: boolean/, "PilotPanel should receive an explicit TAS lock state");
  assert.match(mainSource, /tasPlaybackState\.status === "playing"/, "runtime should derive TAS lock from active playback");
  assert.match(mainSource, /controller-bay[\s\S]*tas-locked/, "controller bay should expose a TAS locked CSS class");
  assert.match(mainSource, /disabled=\{tasLocked\}/, "mode buttons should be disabled while TAS owns input");
  assert.match(mainSource, /tas\.controllerLock/, "pilot bay should show a TAS ownership label");
  assert.match(mainSource, /tas\.inputLocked/, "pilot bay should explain that human input is locked");
  assert.match(cssSource, /\.controller-bay\.tas-locked\s*\{/, "TAS locked bays should have visible styling");
  assert.match(cssSource, /\.tas-input-lock\s*\{/, "TAS lock notice should have stable styling");
});
