import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const dependencySource = fs.readFileSync(new URL("../apps/browser-cockpit/src/contraStage1RewardTactics.ts", import.meta.url), "utf8");
  const dependency = ts.transpileModule(dependencySource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dependencyUrl = `data:text/javascript;base64,${Buffer.from(dependency.outputText).toString("base64")}`;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const outputText = transpiled.outputText.replace(/from "\.\/contraStage1RewardTactics"/g, `from "${dependencyUrl}"`);
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
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

test("headless route-plan probe bails right when direct body overlap is on the left side", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1603,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 177,
      playerX: 128,
      playerY: 188,
      worldX: 630,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 124, y: 185 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe uses the opening low fixed-threat route fragment before W288 contact", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1466,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      playerX: 128,
      playerY: 107,
      worldX: 286,
      enemies: [
        { fixed: false, hp: 1, kind: "object", threat: true, type: 0x01, x: 150, y: 178 },
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 142, y: 149 },
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 163, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, false);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe carries right through the early bridge low-lane contact window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1810,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      playerX: 127,
      playerY: 212,
      worldX: 588,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 121, y: 185 },
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 156, y: 185 },
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 180, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe advances through the early bridge low fixed-threat stall before soldiers arrive", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1560,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 589,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 180, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe keeps a low firing posture at the early bridge fixed-body window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1600,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 196,
      worldX: 624,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 145, y: 196 },
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 167, y: 148 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe does not override direct overlap safety in the bridge fixed-body window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1602,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 196,
      worldX: 632,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 137, y: 196 }
      ]
    })
  });

  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe advances away from an early bridge fixed target after passing it", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1640,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 148,
      worldX: 647,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 122, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, true);
});
