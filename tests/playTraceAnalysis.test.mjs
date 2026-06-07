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
  analyzePlayTrace
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/playTraceAnalysis.ts", import.meta.url));

function input(overrides = {}) {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
    select: false,
    ...overrides
  };
}

function enemy(overrides = {}) {
  return {
    slot: 4,
    type: 0x05,
    hp: 1,
    x: 150,
    y: 128,
    routine: 2,
    kind: "enemy",
    threat: true,
    fixed: false,
    priority: 1,
    ...overrides
  };
}

function sample(overrides = {}) {
  const frame = overrides.frame ?? 1;
  return {
    frame,
    gameplayActive: true,
    runtimeStatus: "running",
    routeSegment: "opening",
    routeAction: "advance",
    p1Input: input({ right: true, b: true }),
    p2Input: input(),
    ram: {
      level: 0,
      screen: 0,
      scroll: 0,
      cameraX: 0,
      worldX: frame,
      playerX: 80,
      playerY: 160,
      p2PlayerX: 0,
      p2PlayerY: 0,
      p2WorldX: 0,
      p1State: 1,
      p2State: 0,
      jumpState: 0,
      p2JumpState: 0,
      deathFlag: 0,
      p2DeathFlag: 0,
      p1Score: 0,
      p2Score: 0,
      weapon: 0,
      p2Weapon: 0,
      bossDefeated: 0,
      twoPlayerActive: false,
      enemies: [],
      ...(overrides.ram ?? {})
    },
    ...overrides
  };
}

test("analyzes whole trace kill, weapon, fast pass, stall, and death fragments", () => {
  const samples = [
    sample({ frame: 1, routeSegment: "opening", ram: { worldX: 100, p1Score: 0, enemies: [enemy({ slot: 1, type: 0x05 })] } }),
    sample({ frame: 2, routeSegment: "opening", ram: { worldX: 104, p1Score: 100, weapon: 0, enemies: [] } }),
    sample({ frame: 3, routeSegment: "reward", ram: { worldX: 120, p1Score: 100, weapon: 0 } }),
    sample({ frame: 4, routeSegment: "reward", ram: { worldX: 124, p1Score: 100, weapon: 0x13 } }),
    sample({ frame: 5, routeSegment: "bridge", ram: { worldX: 180, p1Score: 100, weapon: 0x13 } }),
    sample({ frame: 20, routeSegment: "bridge", ram: { worldX: 250, p1Score: 100, weapon: 0x13 } }),
    sample({ frame: 21, routeSegment: "boss", ram: { worldX: 250, p1Score: 100, weapon: 0x13 } }),
    sample({ frame: 80, routeSegment: "boss", ram: { worldX: 252, p1Score: 100, weapon: 0x13 } }),
    sample({ frame: 81, gameplayActive: false, routeSegment: "boss", ram: { worldX: 252, p1Score: 100, weapon: 0x13, p1State: 2, deathFlag: 1 } }),
    sample({ frame: 120, gameplayActive: true, routeSegment: "start", ram: { worldX: 48, p1Score: 100, weapon: 0, p1State: 0, deathFlag: 0 } })
  ];

  const report = analyzePlayTrace(samples, "1P");

  assert.equal(report.schema, "fc-ai-play-trace-report-v1");
  assert.equal(report.sampleCount, 10);
  assert.equal(report.startWorldX, 100);
  assert.equal(report.maxWorldX, 252);
  assert.equal(report.kills.total, 1);
  assert.equal(report.kills.byKind.infantry, 1);
  assert.equal(report.weaponPickups.total, 1);
  assert.equal(report.weaponPickups.events[0].toCode, 0x13);
  assert.equal(report.weaponChanges.total, 2);
  assert.equal(report.weaponChanges.losses, 1);
  assert.equal(report.fastPasses.length, 1);
  assert.equal(report.fastPasses[0].routeSegment, "bridge");
  assert.equal(report.stalls.length, 1);
  assert.equal(report.deaths.length, 1);
  assert.equal(report.timeline.some((event) => event.kind === "kill"), true);
  assert.equal(report.timeline.some((event) => event.kind === "weapon"), true);
  assert.equal(report.timeline.some((event) => event.kind === "fast-pass"), true);
});
