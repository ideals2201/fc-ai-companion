import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

async function importTypeScriptModule(modulePath) {
  const source = fs.readFileSync(modulePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  routeActionOverlayPatch
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/routeActionOverlay.ts"));

function snapshot(overrides = {}) {
  return {
    enemies: [],
    jumpState: 209,
    level: 0,
    playerX: 60,
    playerY: 160,
    weapon: 0,
    worldX: 1765,
    ...overrides
  };
}

test("route action overlay matches WorldX, player guard, airborne state, and enemy relative lane", () => {
  const patch = routeActionOverlayPatch(snapshot({
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", threat: true, type: 5, x: 70, y: 150 }
    ]
  }), {
    id: "matrix-w1765-right-up-fire",
    action: "right_up_fire",
    guard: {
      airborne: true,
      enemy: {
        dx: [-12, 18],
        dy: [-24, 12],
        fixed: false,
        hpMin: 1,
        kind: "enemy"
      },
      playerX: [40, 80],
      playerY: [140, 180],
      worldX: [1758, 1784]
    }
  }, 12000);

  assert.deepEqual(patch, {
    a: false,
    b: true,
    down: false,
    left: false,
    reason: "overlay:matrix-w1765-right-up-fire:right_up_fire",
    right: true,
    up: true
  });
});

test("route action overlay rejects mismatched guards instead of leaking actions", () => {
  const patch = routeActionOverlayPatch(snapshot({
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", threat: true, type: 5, x: 118, y: 150 }
    ],
    worldX: 1700
  }), {
    id: "matrix-w1765-right-up-fire",
    action: "right_up_fire",
    guard: {
      airborne: true,
      enemy: {
        dx: [-12, 18],
        dy: [-24, 12],
        fixed: false,
        hpMin: 1,
        kind: "enemy"
      },
      worldX: [1758, 1784]
    }
  }, 12000);

  assert.equal(patch, null);
});

test("route action overlay can turn around and fire at a rear close threat", () => {
  const patch = routeActionOverlayPatch(snapshot({
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", threat: true, type: 1, x: 92, y: 223 }
    ],
    jumpState: 0,
    playerX: 128,
    playerY: 230,
    worldX: 2390
  }), {
    id: "w2390-rear-close-left-fire",
    action: "left_fire",
    guard: {
      enemy: {
        dx: [-48, -16],
        dy: [-16, 8],
        fixed: false,
        hpMin: 1,
        kind: "enemy"
      },
      playerX: [120, 132],
      playerY: [206, 236],
      worldX: [2370, 2400]
    }
  }, 15000);

  assert.deepEqual(patch, {
    a: false,
    b: true,
    down: false,
    left: true,
    reason: "overlay:w2390-rear-close-left-fire:left_fire",
    right: false,
    up: false
  });
});

test("route action overlay can retreat while aiming down for fixed target station search", () => {
  const patch = routeActionOverlayPatch(snapshot({
    enemies: [
      { fixed: true, hp: 8, kind: "durable", threat: true, type: 4, x: 155, y: 192 }
    ],
    jumpState: 0,
    playerX: 128,
    playerY: 132,
    worldX: 2965
  }), {
    id: "jp-w2965-left-duck-fire-station-search",
    action: "left_duck_fire",
    guard: {
      enemy: {
        dx: [24, 36],
        dy: [52, 68],
        fixed: true,
        hpMin: 1,
        kind: "durable",
        type: 4
      },
      grounded: true,
      playerX: [120, 132],
      playerY: [124, 140],
      worldX: [2965, 2972]
    }
  }, 7780);

  assert.deepEqual(patch, {
    a: false,
    b: true,
    down: true,
    left: true,
    reason: "overlay:jp-w2965-left-duck-fire-station-search:left_duck_fire",
    right: false,
    up: false
  });
});

test("route action overlay can express pure right movement and right jump without firing", () => {
  const leftPatch = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 132,
    worldX: 2965
  }), {
    id: "jp-w2965-retreat-to-duck-station",
    action: "left",
    guard: {
      playerX: [101, 132],
      playerY: [124, 140],
      worldX: [2965, 2972]
    }
  }, 7780);

  assert.deepEqual(leftPatch, {
    a: false,
    b: false,
    down: false,
    left: true,
    reason: "overlay:jp-w2965-retreat-to-duck-station:left",
    right: false,
    up: false
  });

  const rightPatch = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2366
  }), {
    id: "w2366-right-carry",
    action: "right",
    guard: {
      playerX: [120, 132],
      playerY: [188, 236],
      worldX: [2366, 2392]
    }
  }, 13200);

  assert.deepEqual(rightPatch, {
    a: false,
    b: false,
    down: false,
    left: false,
    reason: "overlay:w2366-right-carry:right",
    right: true,
    up: false
  });

  const jumpRightPatch = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2366
  }), {
    id: "w2366-jump-right-carry",
    action: "jump_right",
    guard: {
      playerX: [120, 132],
      playerY: [188, 236],
      worldX: [2366, 2392]
    }
  }, 13200);

  assert.deepEqual(jumpRightPatch, {
    a: true,
    b: false,
    down: false,
    left: false,
    reason: "overlay:w2366-jump-right-carry:jump_right",
    right: true,
    up: false
  });
});

test("route action overlay can pulse right jump for water or ledge recovery", () => {
  const overlay = {
    id: "w2366-pulse-jump-right-carry",
    action: "pulse_jump_right",
    pulse: {
      jumpPeriod: 6,
      jumpWidth: 2
    },
    guard: {
      playerX: [120, 132],
      playerY: [188, 236],
      worldX: [2366, 2392]
    }
  };

  const pulseOn = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2366
  }), overlay, 13200);
  const pulseOff = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2366
  }), overlay, 13202);

  assert.equal(pulseOn.a, true);
  assert.equal(pulseOn.right, true);
  assert.equal(pulseOn.b, false);
  assert.equal(pulseOff.a, false);
  assert.equal(pulseOff.right, true);
  assert.equal(pulseOff.b, false);
});

test("route action overlay can pulse right jump while keeping fire held", () => {
  const overlay = {
    id: "w2458-pulse-jump-right-fire",
    action: "pulse_jump_right_fire",
    pulse: {
      jumpPeriod: 8,
      jumpWidth: 2
    },
    guard: {
      playerX: [120, 132],
      playerY: [144, 236],
      worldX: [2430, 2490]
    }
  };

  const pulseOn = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 164,
    worldX: 2458
  }), overlay, 13200);
  const pulseOff = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 164,
    worldX: 2458
  }), overlay, 13202);

  assert.equal(pulseOn.a, true);
  assert.equal(pulseOn.b, true);
  assert.equal(pulseOn.down, false);
  assert.equal(pulseOn.right, true);
  assert.equal(pulseOff.a, false);
  assert.equal(pulseOff.b, true);
  assert.equal(pulseOff.down, false);
  assert.equal(pulseOff.right, true);
});

test("route action overlay can pulse up-right jump for climb or swim recovery", () => {
  const overlay = {
    id: "w2366-pulse-up-jump-right-carry",
    action: "pulse_up_jump_right",
    pulse: {
      jumpPeriod: 6,
      jumpWidth: 2
    },
    guard: {
      playerX: [120, 132],
      playerY: [188, 236],
      worldX: [2366, 2392]
    }
  };

  const pulseOn = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2366
  }), overlay, 13200);
  const pulseOff = routeActionOverlayPatch(snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2366
  }), overlay, 13202);

  assert.equal(pulseOn.a, true);
  assert.equal(pulseOn.right, true);
  assert.equal(pulseOn.up, true);
  assert.equal(pulseOn.b, false);
  assert.equal(pulseOff.a, false);
  assert.equal(pulseOff.right, true);
  assert.equal(pulseOff.up, true);
  assert.equal(pulseOff.b, false);
});

test("route action overlay can pulse fire as a data primitive", () => {
  const overlay = {
    id: "matrix-w1765-pulse-right",
    action: "pulse_right_fire",
    pulse: {
      firePeriod: 6,
      fireWidth: 2
    },
    guard: {
      airborne: true,
      worldX: [1758, 1784]
    }
  };

  assert.equal(routeActionOverlayPatch(snapshot(), overlay, 12).b, true);
  assert.equal(routeActionOverlayPatch(snapshot(), overlay, 14).b, false);
});

test("route action overlay can constrain candidates to a frame window", () => {
  const overlay = {
    id: "boss-wall-frame-window",
    action: "left_up_fire",
    guard: {
      frame: [8400, 8410],
      worldX: [3208, 3208]
    }
  };

  assert.equal(routeActionOverlayPatch(snapshot({ worldX: 3208 }), overlay, 8399), null);
  assert.equal(routeActionOverlayPatch(snapshot({ worldX: 3208 }), overlay, 8400)?.left, true);
  assert.equal(routeActionOverlayPatch(snapshot({ worldX: 3208 }), overlay, 8411), null);
});
