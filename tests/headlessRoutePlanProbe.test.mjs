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
  decideHeadlessRoutePlanProbeButtons
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/headlessRoutePlanProbe.ts", import.meta.url));

function snapshot(overrides = {}) {
  return {
    enemies: [],
    jumpState: 0,
    level: 0,
    playerX: 48,
    playerY: 100,
    weapon: 0,
    worldX: 48,
    ...overrides
  };
}

test("headless route-plan probe advances and pulse-fires speedrun start route", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 620,
    routeSegment: {
      id: "start-run",
      action: "advance",
      fire: "pulse",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot()
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.left, false);
});

test("headless route-plan probe jumps on configured grounded rhythm", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 300,
    routeSegment: {
      id: "rhythm",
      action: "advance",
      fire: "pulse",
      jumpEvery: 150,
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot()
  });

  assert.equal(buttons.a, true);
});

test("headless route-plan probe survival reacts to close threats instead of blind running", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 901,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 66, y: 104 }
      ]
    })
  });

  assert.equal(buttons.right, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.a, true);
});

test("headless route-plan probe holds fire in boss-wall route segment", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 3200,
    routeSegment: {
      id: "boss-wall",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({ playerY: 170, worldX: 3020 })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.down, true);
});

test("headless route-plan probe carries right while down-firing airborne close lower soldiers", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 878,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      jumpState: 1,
      playerX: 128,
      playerY: 80,
      worldX: 176,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 125, y: 100 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe applies controlled advance after a survival stall", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 6000,
    progressStallFrames: 1200,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      playerX: 128,
      playerY: 164,
      worldX: 271,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 161, y: 174 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe bails left from direct body overlap during survival", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 4626,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      playerX: 128,
      playerY: 164,
      worldX: 275,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 134, y: 151 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
});
