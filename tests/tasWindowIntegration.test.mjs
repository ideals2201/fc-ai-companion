import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "styles.css"), "utf8");
const registrySource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "tasRegistry.ts"), "utf8");

test("TAS window can generate side-owned training baselines instead of applying live strategies", () => {
  assert.match(registrySource, /recommendedBaselines: TasStrategyBaseline\[\]/, "registry should still describe recommended strategy categories");
  assert.match(mainSource, /onGenerateBaseline: \(movieId: string, side: PlayerSide\) => void/, "TAS window should expose side-owned baseline generation");
  assert.match(mainSource, /generateTasBaselineForSide/, "runtime should generate or select side-owned TAS baselines");
  assert.match(mainSource, /onGenerateBaseline\(selectedMovie\.id, "1P"\)/, "TAS window should allow generating a 1P training baseline");
  assert.match(mainSource, /onGenerateBaseline\(selectedMovie\.id, "2P"\)/, "TAS window should allow generating a 2P training baseline");
  assert.doesNotMatch(mainSource, /changeStrategyModel\(side, strategy\)/, "TAS baseline actions should not directly switch live AI strategies");
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

test("TAS window uses a visible framed module surface", () => {
  assert.match(cssSource, /\.tas-window\s*\{[\s\S]*border: 1px solid rgba\(126, 200, 255, 0\.26\)/, "TAS module should have a visible blue hardware frame");
  assert.match(cssSource, /\.tas-window\s*\{[\s\S]*box-shadow: 0 0 0 1px rgba\(0,0,0,0\.32\) inset/, "TAS module should be visually separated from the surrounding console surface");
});

test("TAS browser separates file selection from Chinese detail and watch modes", () => {
  assert.match(mainSource, /const movieFileLabel = .*movie\.fileName/, "TAS list should use the file name as the compact label");
  assert.match(mainSource, /<div className="tas-sidebar">[\s\S]*className="tas-movie-list"[\s\S]*className="tas-control-row"/, "TAS file list and playback buttons should live in the left sidebar");
  assert.match(mainSource, /<div className="tas-detail">[\s\S]*className="tas-mode-strip"[\s\S]*className="tas-commentary"/, "watch-mode buttons should live with the right-side explanation");
  assert.match(mainSource, /<strong>\{movieFileLabel\(movie\)\}<\/strong>/, "TAS list items should only render the file label");
  assert.doesNotMatch(mainSource, /className=\{movie\.id === selectedMovieId \? "tas-movie-item active" : "tas-movie-item"\}[\s\S]*<small>\{movieSubtitle\(movie\)\}<\/small>/, "TAS list should not duplicate Chinese subtitles");
  assert.match(mainSource, /className="tas-subtitle-row"[\s\S]*movieSubtitle\(selectedMovie\)[\s\S]*selectedMovie\.fileName/, "right-side detail should show bilingual title and file name");
  assert.match(cssSource, /\.tas-sidebar\s*\{/, "TAS sidebar should have dedicated layout");
  assert.match(cssSource, /\.tas-mode-strip\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/, "watch-mode buttons should be compact beside the explanation");
  assert.match(cssSource, /\.tas-control-row\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/, "playback buttons should be a 2x2 matrix under the list");
  assert.match(cssSource, /\.tas-movie-list\s*\{[\s\S]*height:\s*132px/, "TAS movie list should be tall enough for several files");
});

test("TAS detail facts use compact label colon value rows", () => {
  assert.match(mainSource, /className="tas-fact-label"[\s\S]*\{t\(language, "tas\.source"\)\}：[\s\S]*className="tas-fact-value"[\s\S]*selectedMovie\.sourceNote/, "source should render as 来源：value in one compact fact row");
  assert.match(mainSource, /className="tas-fact-label"[\s\S]*\{t\(language, "tas\.trainingBase"\)\}：[\s\S]*recommendationLabel\(selectedMovie\)/, "training base should render as label colon value");
  assert.doesNotMatch(mainSource, /<span>\{t\(language, "tas\.source"\)\}<\/span>\s*<b>\{selectedMovie\.sourceNote\}<\/b>/, "TAS detail should not split labels and values into two vertical rows");
  assert.match(cssSource, /\.tas-fact-row\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\)/, "TAS fact rows should keep label and value on one line");
  assert.match(cssSource, /\.tas-fact-label\s*\{[\s\S]*white-space:\s*nowrap/, "TAS fact labels should stay compact");
});

test("ROM TAS matching does not auto-enter or visually select TAS playback", () => {
  assert.match(mainSource, /messageKey:\s*entry \? "matched-available" : "no-match-current"/, "ROM matching should report TAS availability instead of auto-selection");
  assert.match(mainSource, /setSelectedTasMovieId\(""\)/, "ROM matching should not silently select a TAS movie");
  assert.match(mainSource, /className=\{movie\.id === selectedMovieId \? "tas-movie-item active" : "tas-movie-item"\}/, "TAS movie active styling should require explicit user selection");
  assert.doesNotMatch(mainSource, /messageKey:\s*defaultMovie \? "auto-selected"/, "old auto-selected TAS state should not remain");
});

test("pilot controller bays enter a visible locked TAS replay state", () => {
  assert.match(mainSource, /tasLocked: boolean/, "PilotPanel should receive an explicit TAS lock state");
  assert.match(mainSource, /tasPlaybackState\.status === "playing"/, "runtime should derive TAS lock from active playback");
  assert.match(mainSource, /controller-bay[\s\S]*tas-locked/, "controller bay should expose a TAS locked CSS class");
  assert.match(mainSource, /const locked = tasLocked \|\| trainingLocked/, "mode buttons should use a unified controller-lock source");
  assert.match(mainSource, /disabled=\{locked\}/, "mode buttons should be disabled while TAS or training owns input");
  assert.match(mainSource, /tas\.controllerLock/, "pilot bay should show a TAS ownership label");
  assert.match(mainSource, /tas\.inputLocked/, "pilot bay should explain that human input is locked");
  assert.match(cssSource, /\.controller-bay\.tas-locked\s*\{/, "TAS locked bays should have visible styling");
  assert.match(cssSource, /\.tas-input-lock\s*\{/, "TAS lock notice should have stable styling");
});
