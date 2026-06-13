import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");

test("browser runtime bounds long trace recording memory", () => {
  assert.match(mainSource, /const traceSampleRetentionLimit = 60 \* 60 \* 10;/, "trace capture should retain a bounded ten minute runtime window");
  assert.match(
    mainSource,
    /function retainRecentTraceSamples\(samples: PlayTraceSample\[\]\) \{[\s\S]*if \(samples\.length <= traceSampleRetentionLimit\) return;[\s\S]*samples\.splice\(0, samples\.length - traceSampleRetentionLimit\);[\s\S]*\}/,
    "trace capture should trim the mutable sample buffer instead of growing forever"
  );
  assert.match(
    mainSource,
    /traceSamplesRef\.current\.push\(traceSample\);\s*retainRecentTraceSamples\(traceSamplesRef\.current\);/,
    "runtime loop should trim recorded trace samples immediately after appending"
  );
  assert.match(
    mainSource,
    /setTraceSampleSnapshot\(traceSamplesRef\.current\.slice\(-traceSampleRetentionLimit\)\);/,
    "stopping capture should not copy an unbounded trace array into React state"
  );
});

test("TAS guard status refreshes are throttled during playback", () => {
  assert.match(mainSource, /const tasGuardUiFrameRef = useRef\(0\);/, "runtime should track the last TAS guard UI refresh frame");
  assert.match(mainSource, /const tasGuardUiPhaseRef = useRef<TasPlaybackUiState\["phase"\]>\("init"\);/, "runtime should track phase changes separately from every playback frame");
  assert.match(
    mainSource,
    /const shouldRefreshTasGuardUi = !guardResult\.ok\s*\|\| tasPlaybackRef\.current\.frameIndex - tasGuardUiFrameRef\.current >= 10\s*\|\| guardResult\.phase !== tasGuardUiPhaseRef\.current;/,
    "TAS guard UI should refresh on errors, phase changes, or a ten frame cadence"
  );
  assert.match(
    mainSource,
    /if \(shouldRefreshTasGuardUi\) \{[\s\S]*tasGuardUiFrameRef\.current = tasPlaybackRef\.current\.frameIndex;[\s\S]*tasGuardUiPhaseRef\.current = guardResult\.phase;[\s\S]*setTasPlaybackState/,
    "TAS guard should avoid setState on every emulated frame"
  );
});

test("runtime input publishing skips unchanged button states", () => {
  assert.match(
    mainSource,
    /function sameButtonState\(left: ButtonState, right: ButtonState\) \{[\s\S]*return buttonNames\.every\(\(button\) => left\[button\] === right\[button\]\);[\s\S]*\}/,
    "runtime should compare button states before publishing them to React"
  );
  assert.match(
    mainSource,
    /const finalButtonsChanged = !sameButtonState\(previous, next\);/,
    "final button recomputation should detect unchanged aggregate input"
  );
  assert.match(
    mainSource,
    /if \(finalButtonsChanged\) \{[\s\S]*finalButtonsRef\.current = \{[\s\S]*setButtonStates/,
    "runtime should only refresh visible button state when aggregate input changed"
  );
  assert.match(
    mainSource,
    /if \(sameButtonState\(sourceButtonsRef\.current\[side\]\[source\], next\)\) return;/,
    "source input publication should skip identical per-frame AI button states"
  );
  assert.match(
    mainSource,
    /if \(current\[side\] === nextLabel\) return current;/,
    "last input labels should not be rewritten when the visible label is unchanged"
  );
});
