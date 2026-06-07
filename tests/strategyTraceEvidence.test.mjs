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
  classifyBranchOutcome,
  createStrategyTraceEvidence,
  traceInputLabel
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyTraceEvidence.ts", import.meta.url));

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
    slot: 2,
    type: 0x07,
    hp: 5,
    x: 188,
    y: 160,
    routine: 4,
    kind: "durable",
    threat: true,
    fixed: true,
    priority: 96,
    ...overrides
  };
}

function sample(frame, worldX, overrides = {}) {
  return {
    ...overrides,
    frame,
    gameplayActive: true,
    runtimeStatus: "running",
    routeSegment: "boss-approach-survive",
    routeAction: "advance",
    p1Input: overrides.p1Input ?? input({ right: true, b: true }),
    p2Input: overrides.p2Input ?? input(),
    ram: {
      level: 0,
      screen: 10,
      scroll: worldX & 0xff,
      cameraX: worldX - 128,
      worldX,
      playerX: 128,
      playerY: 132,
      p2PlayerX: 0,
      p2PlayerY: 0,
      p2WorldX: 0,
      p1State: 1,
      p2State: 0,
      jumpState: 1,
      p2JumpState: 0,
      deathFlag: 0,
      p2DeathFlag: 0,
      p1Score: 5800,
      p2Score: 0,
      weapon: 4,
      p2Weapon: 0,
      bossDefeated: 0,
      twoPlayerActive: false,
      enemies: [enemy()],
      ...(overrides.ram ?? {})
    }
  };
}

test("labels pressed trace inputs in controller order", () => {
  assert.equal(traceInputLabel(input({ down: true, right: true, b: true })), "down+right+B");
  assert.equal(traceInputLabel(input()), "none");
});

test("creates compact strategy evidence for a failed pre-boss route class", () => {
  const samples = [
    sample(5100, 2508),
    sample(5140, 2706, {
      ram: {
        enemies: [
          enemy({ slot: 2, type: 0x07, hp: 0, fixed: true, priority: 100 }),
          enemy({ slot: 5, type: 0x05, hp: 1, fixed: false, kind: "enemy", x: 144, y: 188, priority: 42 })
        ]
      }
    }),
    sample(5180, 2848, {
      p1Input: input({ down: true, right: true, b: true }),
      ram: {
        playerY: 214,
        jumpState: 1,
        enemies: [
          enemy({ slot: 5, type: 0x05, hp: 1, fixed: false, kind: "enemy", x: 166, y: 133, priority: 70 })
        ]
      }
    }),
    sample(5194, 2854, {
      gameplayActive: false,
      p1Input: input({ down: true, right: true, b: true }),
      ram: {
        playerY: 236,
        p1State: 2,
        deathFlag: 1,
        enemies: [
          enemy({ slot: 5, type: 0x05, hp: 1, fixed: false, kind: "enemy", x: 166, y: 133, priority: 70 })
        ]
      }
    })
  ];

  const evidence = createStrategyTraceEvidence(samples, {
    failureId: "stage1-w2854-preboss-platform-capture-failure",
    fragmentId: "stage1-preboss-platform-capture",
    gameProfileId: "contra",
    progressionWindow: { metric: "progression.primary", start: 2500, end: 2960, unit: "ContraWorldPixels" },
    romProfileId: "contra-us-good",
    routeClass: "high-platform-jump-carry",
    stageId: "stage-1"
  });

  assert.equal(evidence.schema, "fc-ai-strategy-trace-evidence-v1");
  assert.equal(evidence.sampleCount, 4);
  assert.equal(evidence.startWorldX, 2508);
  assert.equal(evidence.endWorldX, 2854);
  assert.equal(evidence.maxWorldX, 2854);
  assert.equal(evidence.death?.worldX, 2854);
  assert.equal(evidence.death?.playerY, 236);
  assert.equal(evidence.death?.input, "down+right+B");
  assert.equal(evidence.topEnemies[0].type, 0x07);
  assert.equal(evidence.inputSummary["down+right+B"], 2);
  assert.equal(evidence.branchOutcome, "route-class-failed-stop");
  assert.equal(classifyBranchOutcome(evidence), "route-class-failed-stop");
});
