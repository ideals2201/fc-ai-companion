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
  createTasPlaybackGuardState,
  evaluateTasPlaybackGuard,
  isTasActivePhaseSnapshot
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/tasPlaybackGate.ts", import.meta.url));

function snapshot(overrides = {}) {
  return {
    gameOver: 0,
    p1State: 1,
    deathFlag: 0,
    playerX: 32,
    playerY: 176,
    worldX: 32,
    screen: 0,
    level: 0,
    ...overrides
  };
}

test("keeps TAS in init phase until RAM confirms active gameplay", () => {
  const state = createTasPlaybackGuardState(450);

  const menuResult = evaluateTasPlaybackGuard(snapshot({
    p1State: 0,
    playerX: 0,
    playerY: 0,
    worldX: 0
  }), state, 450);

  assert.equal(menuResult.ok, true);
  assert.equal(menuResult.phase, "init");
  assert.equal(menuResult.state.entryConfirmed, false);

  const active = snapshot();
  assert.equal(isTasActivePhaseSnapshot(active), true);
  const activeResult = evaluateTasPlaybackGuard(active, menuResult.state, 451);

  assert.equal(activeResult.ok, true);
  assert.equal(activeResult.phase, "active");
  assert.equal(activeResult.state.entryConfirmed, true);
});

test("marks raw TAS playback desynced when the player dies", () => {
  const state = {
    ...createTasPlaybackGuardState(450),
    entryConfirmed: true,
    maxWorldX: 676
  };

  const result = evaluateTasPlaybackGuard(snapshot({
    p1State: 2,
    deathFlag: 1,
    worldX: 676
  }), state, 2122);

  assert.equal(result.ok, false);
  assert.equal(result.phase, "desynced");
  assert.equal(result.reason, "player-death");
  assert.match(result.message, /frame 2122/);
  assert.match(result.message, /WorldX 676/);
});

test("marks raw TAS playback desynced when progress collapses back to spawn", () => {
  const state = {
    ...createTasPlaybackGuardState(450),
    entryConfirmed: true,
    maxWorldX: 720
  };

  const result = evaluateTasPlaybackGuard(snapshot({
    p1State: 0,
    playerX: 36,
    playerY: 176,
    worldX: 36
  }), state, 2300);

  assert.equal(result.ok, false);
  assert.equal(result.phase, "desynced");
  assert.equal(result.reason, "respawn-regression");
  assert.match(result.message, /maxWorldX 720/);
});
