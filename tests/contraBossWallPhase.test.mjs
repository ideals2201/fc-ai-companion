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
  applyBossWallPhaseContainmentClamp,
  createBossWallPhaseState,
  describeBossWallPhaseTelemetry,
  decideBossWallPhaseAction,
  shouldBypassAiActionLockForBossWallPhase,
  shouldUseBossWallPhaseSafetyOverride,
  updateBossWallPhaseState
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/contraStage1BossWallPhase.ts", import.meta.url));

function enemy(overrides = {}) {
  return {
    slot: 13,
    type: 0x11,
    hp: 32,
    x: 161,
    y: 176,
    routine: 2,
    vx: 0,
    vy: 0,
    kind: "durable",
    threat: true,
    fixed: true,
    priority: 9,
    ...overrides
  };
}

function snapshot(overrides = {}) {
  return {
    level: 0,
    bossDefeated: 0,
    worldX: 3188,
    playerX: 118,
    playerY: 128,
    jumpState: 0,
    weapon: 0,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128 }),
      enemy({ slot: 15, type: 0x10, hp: 16, x: 153, y: 128 })
    ],
    ...overrides
  };
}

test("Boss wall phase starts a fixed-target damage station before deep entry", () => {
  const state = updateBossWallPhaseState(createBossWallPhaseState(), snapshot(), 5400);
  const decision = decideBossWallPhaseAction(snapshot(), state, 5400);

  assert.equal(state.phase, "damage-fixed-target");
  assert.equal(state.fixedHpTotal, 64);
  assert.equal(decision?.phase, "damage-fixed-target");
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
});

test("Boss wall phase pulses default weapon fire at fixed targets", () => {
  const snap = snapshot({
    weapon: 0
  });
  const state = updateBossWallPhaseState(createBossWallPhaseState(), snap, 5400);
  const firing = decideBossWallPhaseAction(snap, state, 5404);
  const release = decideBossWallPhaseAction(snap, state, 5405);

  assert.equal(firing?.reason, "fixed-hp-damage-station");
  assert.equal(firing?.buttons.b, true);
  assert.equal(release?.reason, "fixed-hp-damage-station");
  assert.equal(release?.buttons.b, false);
  assert.equal(release?.buttons.left, false);
  assert.equal(release?.buttons.right, false);
});

test("Boss wall phase pulses default weapon fire while clearing station crowd", () => {
  const snap = snapshot({
    worldX: 3172,
    playerX: 100,
    playerY: 134,
    jumpState: 0,
    weapon: 0,
    enemies: [
      enemy({ slot: 15, type: 0x10, hp: 15, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 6, type: 0x01, hp: 1, x: 106, y: 127, fixed: false, kind: "object", priority: 1 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 100, y: 161, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 70,
    lastFixedHpTotal: 70,
    noDamageFrames: 31,
    lastFrame: 5705,
    attempts: 1
  };
  const firing = decideBossWallPhaseAction(snap, state, 5708);
  const release = decideBossWallPhaseAction(snap, state, 5711);

  assert.equal(firing?.reason, "station-crowd-gate-clear");
  assert.equal(firing?.buttons.b, true);
  assert.equal(release?.reason, "station-crowd-gate-clear");
  assert.equal(release?.buttons.b, false);
  assert.equal(release?.buttons.right, false);
});

test("Boss wall phase resets ineffective-fire timer when fixed target HP drops", () => {
  const first = updateBossWallPhaseState(createBossWallPhaseState(), snapshot(), 5400);
  const stalled = updateBossWallPhaseState(first, snapshot(), 5450);
  const damaged = updateBossWallPhaseState(stalled, snapshot({
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 30, x: 161, y: 176 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128 }),
      enemy({ slot: 15, type: 0x10, hp: 16, x: 153, y: 128 })
    ]
  }), 5451);

  assert.equal(stalled.noDamageFrames, 50);
  assert.equal(damaged.fixedHpTotal, 62);
  assert.equal(damaged.noDamageFrames, 0);
  assert.equal(damaged.phase, "damage-fixed-target");
});

test("Boss wall phase repositions when fixed target HP does not drop in time", () => {
  const first = updateBossWallPhaseState(createBossWallPhaseState(), snapshot(), 5400);
  const stalled = updateBossWallPhaseState(first, snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196
  }), 5480);
  const decision = decideBossWallPhaseAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196
  }), stalled, 5480);

  assert.equal(stalled.phase, "reposition");
  assert.equal(stalled.noDamageFrames >= 60, true);
  assert.equal(decision?.phase, "reposition");
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.b, true);
});

test("Boss wall phase prevents deeper entry when fixed targets are still full HP", () => {
  const state = updateBossWallPhaseState(createBossWallPhaseState(), snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196
  }), 5638);
  const decision = decideBossWallPhaseAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196
  }), state, 5638);

  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.b, true);
});

test("Boss wall phase aims at same-lane fixed target instead of lower core before entry", () => {
  const snap = snapshot({
    worldX: 3159,
    playerX: 111,
    playerY: 132,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 185, y: 176, priority: 9 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 201, y: 128, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 16, x: 177, y: 128, priority: 9 })
    ]
  });
  const state = updateBossWallPhaseState(createBossWallPhaseState(), snap, 5568);
  const decision = decideBossWallPhaseAction(snap, state, 5568);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.up, false);
});

test("Boss wall phase yields to contact and bailout safety overrides", () => {
  assert.equal(shouldUseBossWallPhaseSafetyOverride("ground-contact-jump"), true);
  assert.equal(shouldUseBossWallPhaseSafetyOverride("ground-contact-fire"), true);
  assert.equal(shouldUseBossWallPhaseSafetyOverride("ground-low-projectile-jump"), true);
  assert.equal(shouldUseBossWallPhaseSafetyOverride("boss-wall-bailout"), true);
  assert.equal(shouldUseBossWallPhaseSafetyOverride("air-contact-hold"), true);
  assert.equal(shouldUseBossWallPhaseSafetyOverride("ground-fixed-fire"), false);
  assert.equal(shouldUseBossWallPhaseSafetyOverride("air-carry"), false);
});

test("Boss wall phase clamps safety actions that push deeper while fixed HP is untouched", () => {
  const snap = snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 152,
    jumpState: 49
  });
  const state = {
    phase: "reposition",
    fixedHpTotal: 71,
    lastFixedHpTotal: 71,
    noDamageFrames: 90,
    lastFrame: 5629,
    attempts: 1
  };
  const raw = {
    up: true,
    down: false,
    left: false,
    right: true,
    select: false,
    start: false,
    b: true,
    a: false
  };
  const clamped = applyBossWallPhaseContainmentClamp(snap, state, raw);

  assert.equal(clamped.b, true);
  assert.equal(clamped.up, true);
  assert.equal(clamped.right, false);
  assert.equal(clamped.left, true);
});

test("Boss wall phase telemetry exposes HP gate and containment reason", () => {
  const snap = snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 152,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176, priority: 9 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 16, x: 153, y: 128, priority: 9 }),
      enemy({ slot: 14, type: 0x04, hp: 7, x: 48, y: 192, priority: 7 })
    ]
  });
  const state = {
    phase: "reposition",
    fixedHpTotal: 71,
    lastFixedHpTotal: 71,
    noDamageFrames: 90,
    lastFrame: 5629,
    attempts: 1
  };
  const telemetry = describeBossWallPhaseTelemetry(snap, state);

  assert.equal(telemetry.active, true);
  assert.equal(telemetry.phase, "reposition");
  assert.equal(telemetry.fixedHpTotal, 71);
  assert.equal(telemetry.noDamageFrames, 90);
  assert.equal(telemetry.containment.active, true);
  assert.equal(telemetry.containment.reason, "fixed-hp-deep-entry");
  assert.equal(telemetry.primaryTarget?.slot, 13);
  assert.equal(telemetry.targets.length, 4);
});

test("Boss wall phase stops retreating left after it has fallen behind the station", () => {
  const snap = snapshot({
    worldX: 3170,
    playerX: 98,
    playerY: 164,
    jumpState: 0
  });
  const state = {
    phase: "reposition",
    fixedHpTotal: 72,
    lastFixedHpTotal: 72,
    noDamageFrames: 120,
    lastFrame: 5634,
    attempts: 1
  };
  const decision = decideBossWallPhaseAction(snap, state, 5634);

  assert.equal(decision?.phase, "enter-station");
  assert.equal(decision?.reason, "recover-pre-entry-station");
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
});

test("Boss wall phase uses right jump recovery once the low lane is already reached", () => {
  const snap = snapshot({
    worldX: 3153,
    playerX: 81,
    playerY: 196,
    jumpState: 0
  });
  const state = {
    phase: "reposition",
    fixedHpTotal: 72,
    lastFixedHpTotal: 72,
    noDamageFrames: 157,
    lastFrame: 5710,
    attempts: 1
  };
  const decision = decideBossWallPhaseAction(snap, state, 5710);

  assert.equal(decision?.phase, "enter-station");
  assert.equal(decision?.reason, "recover-low-lane-station");
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.b, true);
});

test("Boss wall phase telemetry exposes station recovery crowd threats", () => {
  const snap = snapshot({
    worldX: 3172,
    playerX: 100,
    playerY: 134,
    jumpState: 0,
    enemies: [
      enemy({ slot: 15, type: 0x10, hp: 15, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 6, type: 0x01, hp: 1, x: 106, y: 127, fixed: false, kind: "object", priority: 1 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 100, y: 161, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 9, type: 0x01, hp: 1, x: 117, y: 186, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 70,
    lastFixedHpTotal: 70,
    noDamageFrames: 31,
    lastFrame: 5705,
    attempts: 1
  };
  const telemetry = describeBossWallPhaseTelemetry(snap, state);

  assert.equal(telemetry.stationCrowdGate.active, true);
  assert.equal(telemetry.stationCrowdGate.reason, "recovery-lane-occupied");
  assert.equal(telemetry.stationCrowdGate.threats.length, 3);
  assert.equal(telemetry.stationCrowdGate.threats[0].slot, 6);
});

test("Boss wall phase clears recovery crowd before re-entering station", () => {
  const snap = snapshot({
    worldX: 3172,
    playerX: 100,
    playerY: 134,
    jumpState: 0,
    enemies: [
      enemy({ slot: 15, type: 0x10, hp: 15, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 6, type: 0x01, hp: 1, x: 106, y: 127, fixed: false, kind: "object", priority: 1 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 100, y: 161, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 9, type: 0x01, hp: 1, x: 117, y: 186, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 70,
    lastFixedHpTotal: 70,
    noDamageFrames: 31,
    lastFrame: 5705,
    attempts: 1
  };
  const decision = decideBossWallPhaseAction(snap, state, 5705);

  assert.equal(decision?.reason, "station-crowd-gate-clear");
  assert.equal(decision?.reason, "station-crowd-gate-clear");
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, false);
});

test("Boss wall phase crowd gate bypasses generic action lock", () => {
  const snap = snapshot({
    worldX: 3175,
    playerX: 103,
    playerY: 152,
    jumpState: 177,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176, fixed: true, priority: 9 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 16, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 107, y: 150, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 3, type: 0x01, hp: 1, x: 126, y: 128, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 7, type: 0x01, hp: 1, x: 122, y: 124, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 72,
    lastFixedHpTotal: 72,
    noDamageFrames: 192,
    lastFrame: 5746,
    attempts: 0
  };

  assert.equal(shouldBypassAiActionLockForBossWallPhase(snap, state), true);
});

test("Boss wall phase jumps when station crowd reaches body contact", () => {
  const snap = snapshot({
    worldX: 3183,
    playerX: 111,
    playerY: 164,
    jumpState: 0,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176, fixed: true, priority: 9 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 16, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 10, type: 0x01, hp: 1, x: 110, y: 146, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 7, type: 0x01, hp: 1, x: 136, y: 208, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 72,
    lastFixedHpTotal: 72,
    noDamageFrames: 111,
    lastFrame: 5665,
    attempts: 0
  };
  const decision = decideBossWallPhaseAction(snap, state, 5665);

  assert.equal(decision?.reason, "station-crowd-contact-jump");
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, false);
});

test("Boss wall phase down-fires close lower station crowd after HP damage starts", () => {
  const snap = snapshot({
    worldX: 3159,
    playerX: 87,
    playerY: 132,
    jumpState: 0,
    weapon: 0,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176, fixed: true, priority: 9 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 14, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 12, type: 0x01, hp: 1, x: 94, y: 147, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 69,
    lastFixedHpTotal: 69,
    noDamageFrames: 94,
    lastFrame: 5764,
    attempts: 0
  };
  const decision = decideBossWallPhaseAction(snap, state, 5764);

  assert.equal(decision?.reason, "station-crowd-gate-clear");
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, false);
});

test("Boss wall phase jumps over the W3184 lower-forward crowd contact", () => {
  const snap = snapshot({
    worldX: 3184,
    playerX: 112,
    playerY: 164,
    jumpState: 0,
    weapon: 0,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176, fixed: true, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 8, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 7, type: 0x01, hp: 1, x: 121, y: 174, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 117, y: 126, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 10, type: 0x01, hp: 1, x: 112, y: 208, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 4, type: 0x01, hp: 1, x: 109, y: 209, fixed: false, kind: "object", priority: 1 })
    ]
  });
  const state = {
    phase: "enter-station",
    fixedHpTotal: 40,
    lastFixedHpTotal: 40,
    noDamageFrames: 107,
    lastFrame: 8014,
    attempts: 0
  };
  const decision = decideBossWallPhaseAction(snap, state, 8014);

  assert.equal(decision?.reason, "station-crowd-contact-jump");
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, false);
});

test("Boss wall phase treats the station boundary as crowd-gated", () => {
  const snap = snapshot({
    worldX: 3184,
    playerX: 112,
    playerY: 164,
    jumpState: 0,
    weapon: 0,
    enemies: [
      enemy({ slot: 13, type: 0x11, hp: 32, x: 161, y: 176, fixed: true, priority: 9 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 15, x: 153, y: 128, fixed: true, priority: 9 }),
      enemy({ slot: 7, type: 0x01, hp: 1, x: 129, y: 134, fixed: false, kind: "enemy", priority: 1 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 113, y: 201, fixed: false, kind: "enemy", priority: 1 })
    ]
  });
  const state = {
    phase: "damage-fixed-target",
    fixedHpTotal: 71,
    lastFixedHpTotal: 71,
    noDamageFrames: 56,
    lastFrame: 5634,
    attempts: 0
  };
  const telemetry = describeBossWallPhaseTelemetry(snap, state);
  const decision = decideBossWallPhaseAction(snap, state, 5634);

  assert.equal(telemetry.stationCrowdGate.active, true);
  assert.equal(decision?.reason, "station-crowd-gate-clear");
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, false);
});
