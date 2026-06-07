import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

const {
  parseTraceCaptureConfig,
  shouldKeepTraceSample,
  shouldStopTraceCapture
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/traceCaptureControl.ts", import.meta.url));

function sample(worldX, overrides = {}) {
  return {
    gameplayActive: true,
    ram: {
      worldX,
      p1State: 1,
      deathFlag: 0,
      ...overrides.ram
    },
    ...overrides
  };
}

test("parses a targeted record window from URL params", () => {
  const config = parseTraceCaptureConfig("?autoload=1&autorun=1&record=stage1-boss&recordStart=2600&recordEnd=2960");

  assert.equal(config?.id, "stage1-boss");
  assert.equal(config?.startWorldX, 2600);
  assert.equal(config?.endWorldX, 2960);
  assert.equal(config?.stopOnEnd, true);
  assert.equal(config?.stopOnDeath, true);
});

test("keeps only samples inside the targeted record window", () => {
  const config = parseTraceCaptureConfig("?record=stage1-boss&recordStart=2600&recordEnd=2960");

  assert.equal(shouldKeepTraceSample(sample(2599), config), false);
  assert.equal(shouldKeepTraceSample(sample(2600), config), true);
  assert.equal(shouldKeepTraceSample(sample(2800), config), true);
  assert.equal(shouldKeepTraceSample(sample(2961), config), false);
  assert.equal(shouldKeepTraceSample(sample(2800), null), true);
});

test("stops targeted recording after the window or on death after capture started", () => {
  const config = parseTraceCaptureConfig("?record=stage1-boss&recordStart=2600&recordEnd=2960");

  assert.equal(shouldStopTraceCapture(sample(2500), config, false), false);
  assert.equal(shouldStopTraceCapture(sample(2961), config, false), false);
  assert.equal(shouldStopTraceCapture(sample(2961), config, true), true);
  assert.equal(shouldStopTraceCapture(sample(2800, { ram: { p1State: 2, deathFlag: 1 } }), config, true), true);
});
