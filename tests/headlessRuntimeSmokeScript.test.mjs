import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const scriptSource = fs.readFileSync(new URL("../scripts/headless-runtime-smoke.mjs", import.meta.url), "utf8");

test("headless runtime smoke script reads local ROM configuration without embedding ROM data", () => {
  assert.match(scriptSource, /FC_AI_COMPANION_ROM_PATH/);
  assert.match(scriptSource, /headlessRuntimeCore\.ts/);
  assert.match(scriptSource, /stageOneStrategyPlan\.ts/);
  assert.doesNotMatch(scriptSource, /writeFileSync|createWriteStream/);
  assert.doesNotMatch(scriptSource, /\.nes["']/);
});

test("headless runtime smoke report keeps TAS as evidence-only, not controller", () => {
  assert.match(scriptSource, /tasIsController:\s*false/);
  assert.match(scriptSource, /runtimeStartupButtons/);
});

test("headless runtime smoke can optionally probe direct controller writes", () => {
  assert.match(scriptSource, /--strategy=/);
  assert.match(scriptSource, /--probe=right-b/);
  assert.match(scriptSource, /probeInput/);
  assert.match(scriptSource, /routeSegment/);
  assert.match(scriptSource, /lost-active/);
});
