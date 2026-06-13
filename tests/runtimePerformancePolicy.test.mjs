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
