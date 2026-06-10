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
