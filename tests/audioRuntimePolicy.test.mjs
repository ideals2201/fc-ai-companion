import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");

test("browser audio runtime uses priming instead of playing from an empty queue", () => {
  assert.match(mainSource, /const AUDIO_PRIME_BUFFERED_SAMPLES = Math\.round\(AUDIO_SAMPLE_RATE \* 0\.12\)/, "audio should wait for a small stable buffer before playback");
  assert.match(mainSource, /let playbackPrimed = false;/, "audio runtime should track whether the output queue is primed");
  assert.match(mainSource, /if \(!playbackPrimed && buffered < AUDIO_PRIME_BUFFERED_SAMPLES\) \{[\s\S]*continue;/, "audio process should output silence without consuming samples until primed");
  assert.match(mainSource, /if \(buffered <= 0\) \{[\s\S]*playbackPrimed = false;[\s\S]*continue;/, "audio underrun should force a clean re-prime instead of repeated crackle");
});

test("browser audio runtime avoids aggressive buffer drop-to-low-latency skips", () => {
  assert.match(mainSource, /const AUDIO_TARGET_BUFFERED_SAMPLES = Math\.round\(AUDIO_SAMPLE_RATE \* 0\.16\)/, "audio target buffer should be large enough for browser timer jitter");
  assert.match(mainSource, /const AUDIO_MAX_BUFFERED_SAMPLES = Math\.round\(AUDIO_SAMPLE_RATE \* 0\.32\)/, "audio max buffer should allow short UI stalls without frequent drops");
  assert.match(mainSource, /const AUDIO_BUFFER_CAPACITY = Math\.round\(AUDIO_SAMPLE_RATE \* 0\.55\)/, "audio ring buffer should provide headroom without approaching one second latency");
});
