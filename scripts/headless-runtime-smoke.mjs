import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Controller, NES } from "../node_modules/jsnes/src/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buttonOrder = ["up", "down", "left", "right", "a", "b", "start", "select"];
const buttonMap = {
  a: Controller.BUTTON_A,
  b: Controller.BUTTON_B,
  select: Controller.BUTTON_SELECT,
  start: Controller.BUTTON_START,
  up: Controller.BUTTON_UP,
  down: Controller.BUTTON_DOWN,
  left: Controller.BUTTON_LEFT,
  right: Controller.BUTTON_RIGHT
};

function parseArgs(argv) {
  const options = {
    candidateConfigPath: "",
    candidateTrial: null,
    dryRun: false,
    frames: 1800,
    probeInput: "none",
    strategy: "speedrun-v0",
    traceEnd: null,
    traceStart: null,
    twoPlayer: false
  };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--two-player") options.twoPlayer = true;
    else if (arg === "--probe=right-b") options.probeInput = "right-b";
    else if (arg === "--probe=route-plan") options.probeInput = "route-plan";
    else if (arg.startsWith("--candidate-trial=")) {
      const value = arg.slice("--candidate-trial=".length).trim();
      options.candidateTrial = value || null;
    }
    else if (arg.startsWith("--candidate-config=")) {
      const value = arg.slice("--candidate-config=".length).trim();
      options.candidateConfigPath = value || "";
    }
    else if (arg.startsWith("--strategy=")) options.strategy = arg.slice("--strategy=".length) || options.strategy;
    else if (arg.startsWith("--trace-start=")) {
      const value = Number.parseInt(arg.slice("--trace-start=".length), 10);
      if (Number.isFinite(value) && value >= 0) options.traceStart = value;
    } else if (arg.startsWith("--trace-end=")) {
      const value = Number.parseInt(arg.slice("--trace-end=".length), 10);
      if (Number.isFinite(value) && value >= 0) options.traceEnd = value;
    }
    else if (arg.startsWith("--frames=")) {
      const value = Number.parseInt(arg.slice("--frames=".length), 10);
      if (Number.isFinite(value) && value > 0) options.frames = Math.min(value, 20000);
    }
  }
  if (options.traceStart !== null && options.traceEnd !== null && options.traceEnd < options.traceStart) {
    const previousStart = options.traceStart;
    options.traceStart = options.traceEnd;
    options.traceEnd = previousStart;
  }
  return options;
}

function probeButtons(input, createHeadlessButtonState) {
  const buttons = createHeadlessButtonState();
  if (input === "right-b") {
    buttons.right = true;
    buttons.b = true;
  }
  return buttons;
}

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

function transpileLocalTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(repoRoot, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const outputText = transpiled.outputText.replace(/from "\.\/([^"]+)"/g, (_match, specifier) => {
    const dependencyPath = path.join(path.dirname(relativePath), `${specifier}.ts`).replace(/\\/g, "/");
    return `from "${transpileLocalTypeScriptModule(dependencyPath)}"`;
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

async function importTypeScriptModule(relativePath) {
  return import(transpileLocalTypeScriptModule(relativePath));
}

function selectedRomPath(env) {
  const configured = process.env.FC_AI_COMPANION_ROM_PATH || env.FC_AI_COMPANION_ROM_PATH || "";
  return configured ? path.resolve(configured) : "";
}

function readCandidateConfig(configPath) {
  if (!configPath) return null;
  const absolutePath = path.resolve(repoRoot, configPath);
  const overlay = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  return {
    overlay,
    path: path.relative(repoRoot, absolutePath).replace(/\\/g, "/")
  };
}

function hashRom(bytes) {
  const payload = bytes.length > 16
    && bytes[0] === 0x4e
    && bytes[1] === 0x45
    && bytes[2] === 0x53
    && bytes[3] === 0x1a
    ? bytes.subarray(16)
    : bytes;
  return {
    md5: crypto.createHash("md5").update(bytes).digest("hex"),
    headerlessMd5: crypto.createHash("md5").update(payload).digest("hex"),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}

function applyButtonStateToNes(nes, controller, buttons) {
  for (const button of buttonOrder) {
    if (buttons[button]) nes.buttonDown(controller, buttonMap[button]);
    else nes.buttonUp(controller, buttonMap[button]);
  }
}

function distanceToPlayer(entity, snapshot) {
  const dx = entity.x - snapshot.playerX;
  const dy = entity.y - snapshot.playerY;
  return {
    dx,
    dy,
    distanceToPlayer: Math.abs(dx) + Math.abs(dy)
  };
}

function nearbyEnemies(snapshot) {
  return snapshot.enemies
    .map((enemy) => ({
      slot: enemy.slot,
      type: enemy.type,
      hp: enemy.hp,
      routine: enemy.routine,
      kind: enemy.kind,
      threat: enemy.threat,
      fixed: enemy.fixed,
      priority: enemy.priority,
      x: enemy.x,
      y: enemy.y,
      vx: enemy.vx,
      vy: enemy.vy,
      ...distanceToPlayer(enemy, snapshot)
    }))
    .sort((a, b) => a.distanceToPlayer - b.distanceToPlayer)
    .slice(0, 6);
}

function nearbyBullets(snapshot) {
  return snapshot.bullets
    .map((bullet) => ({
      slot: bullet.slot,
      owner: bullet.owner,
      routine: bullet.routine,
      bulletSlotCode: bullet.bulletSlotCode,
      spriteCode: bullet.spriteCode,
      x: bullet.x,
      y: bullet.y,
      ...distanceToPlayer(bullet, snapshot)
    }))
    .sort((a, b) => a.distanceToPlayer - b.distanceToPlayer)
    .slice(0, 6);
}

function activePlayerBullets(snapshot, owner = 0) {
  return snapshot.bullets
    .filter((bullet) => bullet.owner === owner && bullet.routine === 1 && bullet.bulletSlotCode !== 0)
    .map((bullet) => ({
      slot: bullet.slot,
      owner: bullet.owner,
      routine: bullet.routine,
      bulletSlotCode: bullet.bulletSlotCode,
      spriteCode: bullet.spriteCode,
      x: bullet.x,
      y: bullet.y,
      ...distanceToPlayer(bullet, snapshot)
    }))
    .sort((a, b) => a.slot - b.slot);
}

function compactSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    frame: snapshot.frame,
    level: snapshot.level,
    screen: snapshot.screen,
    scroll: snapshot.scroll,
    worldX: snapshot.worldX,
    playerX: snapshot.playerX,
    playerY: snapshot.playerY,
    jumpState: snapshot.jumpState,
    p1State: snapshot.p1State,
    deathFlag: snapshot.deathFlag,
    weapon: snapshot.weapon,
    twoPlayerActive: snapshot.twoPlayerActive,
    enemyCount: snapshot.enemies.length,
    bulletCount: snapshot.bullets.length,
    nearbyEnemies: nearbyEnemies(snapshot),
    nearbyBullets: nearbyBullets(snapshot),
    playerBullets: activePlayerBullets(snapshot, 0)
  };
}

function compactRouteSegment(segment) {
  if (!segment) {
    return {
      id: "none",
      action: "fallback",
      fire: "threat",
      worldStart: null,
      worldEnd: null
    };
  }
  return {
    id: segment.id,
    action: segment.action,
    fire: segment.fire,
    worldStart: segment.worldStart,
    worldEnd: segment.worldEnd
  };
}

function buttonSummary(buttons) {
  return buttonOrder.filter((button) => buttons[button]);
}

function shouldTraceFrame(options, frame) {
  if (options.traceStart === null || options.traceEnd === null) return false;
  return frame >= options.traceStart && frame <= options.traceEnd;
}

function compactTraceFrame({
  active,
  afterActive,
  afterSnapshot,
  beforeSnapshot,
  buttons,
  frame,
  progressStallFrames,
  routeSegment
}) {
  return {
    frame,
    active,
    afterActive,
    progressStallFrames,
    routeSegment: compactRouteSegment(routeSegment),
    buttons: buttonSummary(buttons),
    beforeSnapshot: compactSnapshot(beforeSnapshot),
    afterSnapshot: compactSnapshot(afterSnapshot)
  };
}

function playerBulletVectors(traceFrame) {
  const beforeBullets = traceFrame.beforeSnapshot?.playerBullets ?? [];
  const afterBySlot = new Map((traceFrame.afterSnapshot?.playerBullets ?? []).map((bullet) => [bullet.slot, bullet]));
  return beforeBullets
    .map((bullet) => {
      const after = afterBySlot.get(bullet.slot);
      const vx = after ? after.x - bullet.x : 0;
      const vy = after ? after.y - bullet.y : 0;
      return {
        slot: bullet.slot,
        owner: bullet.owner,
        x: bullet.x,
        y: bullet.y,
        vx,
        vy,
        spriteCode: bullet.spriteCode
      };
    })
    .filter((bullet) => bullet.vx !== 0 || bullet.vy !== 0);
}

function closestProjectedBulletDistance(bullet, enemy, maxFrames = 12) {
  let bestFrame = 0;
  let bestDx = enemy.x - bullet.x;
  let bestDy = enemy.y - bullet.y;
  let bestDistance = Math.abs(bestDx) + Math.abs(bestDy);
  let predictedHitFrame = null;
  for (let frame = 1; frame <= maxFrames; frame += 1) {
    const dx = enemy.x - (bullet.x + bullet.vx * frame);
    const dy = enemy.y - (bullet.y + bullet.vy * frame);
    const distance = Math.abs(dx) + Math.abs(dy);
    if (distance < bestDistance) {
      bestFrame = frame;
      bestDx = dx;
      bestDy = dy;
      bestDistance = distance;
    }
    if (predictedHitFrame === null && Math.abs(dx) <= 12 && Math.abs(dy) <= 12) {
      predictedHitFrame = frame;
    }
  }
  return {
    closestFrame: bestFrame,
    closestDx: bestDx,
    closestDy: bestDy,
    closestDistance: bestDistance,
    predictedHitFrame
  };
}

function projectBulletThreatIntersections(traceFrame, vectors = playerBulletVectors(traceFrame)) {
  const enemies = (traceFrame.beforeSnapshot?.nearbyEnemies ?? [])
    .filter((enemy) => enemy.threat && enemy.hp > 0);
  const afterEnemiesBySlot = new Map((traceFrame.afterSnapshot?.nearbyEnemies ?? []).map((enemy) => [enemy.slot, enemy]));
  const intersections = [];
  for (const bullet of vectors) {
    for (const enemy of enemies) {
      const targetAfter = afterEnemiesBySlot.get(enemy.slot) ?? null;
      const targetDx = enemy.x - bullet.x;
      const targetDy = enemy.y - bullet.y;
      const movingToward = (bullet.vx !== 0 && Math.sign(targetDx) === Math.sign(bullet.vx))
        || (bullet.vy !== 0 && Math.sign(targetDy) === Math.sign(bullet.vy));
      const projection = closestProjectedBulletDistance(bullet, enemy);
      const targetHpDelta = targetAfter ? enemy.hp - targetAfter.hp : null;
      const targetClearedAfter = targetAfter ? targetAfter.hp <= 0 || !targetAfter.threat : null;
      const ramConfirmedHit = targetHpDelta !== null
        ? targetHpDelta > 0 || targetClearedAfter === true
        : null;
      intersections.push({
        bulletSlot: bullet.slot,
        targetSlot: enemy.slot,
        targetType: enemy.type,
        targetHp: enemy.hp,
        targetAfterHp: targetAfter?.hp ?? null,
        targetAfterRoutine: targetAfter?.routine ?? null,
        targetClearedAfter,
        targetHpDelta,
        ramConfirmedHit,
        predictedHitButNoRamEffect: projection.predictedHitFrame !== null && ramConfirmedHit === false,
        bulletX: bullet.x,
        bulletY: bullet.y,
        bulletVx: bullet.vx,
        bulletVy: bullet.vy,
        targetDx,
        targetDy,
        movingToward,
        ...projection
      });
    }
  }
  return intersections
    .sort((a, b) => a.closestDistance - b.closestDistance)
    .slice(0, 8);
}

function summarizeTraceFrame(traceFrame) {
  const beforeSnapshot = traceFrame.beforeSnapshot ?? {};
  const nearestEnemy = beforeSnapshot.nearbyEnemies?.[0] ?? null;
  const nearestBullet = beforeSnapshot.nearbyBullets?.[0] ?? null;
  const vectors = playerBulletVectors(traceFrame);
  return {
    frame: traceFrame.frame,
    active: traceFrame.active,
    afterActive: traceFrame.afterActive,
    worldX: beforeSnapshot.worldX ?? null,
    playerX: beforeSnapshot.playerX ?? null,
    playerY: beforeSnapshot.playerY ?? null,
    jumpState: beforeSnapshot.jumpState ?? null,
    p1State: beforeSnapshot.p1State ?? null,
    deathFlag: beforeSnapshot.deathFlag ?? null,
    progressStallFrames: traceFrame.progressStallFrames,
    routeSegmentId: traceFrame.routeSegment?.id ?? "none",
    buttons: traceFrame.buttons,
    buttonsText: traceFrame.buttons.join(""),
    nearestEnemy,
    nearestBullet,
    playerBulletVectors: vectors,
    bulletThreatIntersections: projectBulletThreatIntersections(traceFrame, vectors)
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = readDotEnv(path.resolve(repoRoot, ".env.local"));
  const romPath = selectedRomPath(env);
  const {
    createHeadlessButtonState,
    isHeadlessGameplayActive,
    readHeadlessGameRamSnapshot,
    runtimeStartupButtons
  } = await importTypeScriptModule("apps/browser-cockpit/src/headlessRuntimeCore.ts");
  const {
    activeRouteSegmentForPlan,
    defaultStrategyPlans,
    planForStrategy
  } = await importTypeScriptModule("apps/browser-cockpit/src/stageOneStrategyPlan.ts");
  const {
    decideHeadlessRoutePlanProbeButtons
  } = await importTypeScriptModule("apps/browser-cockpit/src/headlessRoutePlanProbe.ts");
  const strategyPlan = planForStrategy(options.strategy, defaultStrategyPlans);
  const candidateConfig = readCandidateConfig(options.candidateConfigPath);
  const candidateOverlay = candidateConfig?.overlay ?? null;
  const candidateTrial = options.candidateTrial ?? candidateOverlay?.id ?? null;

  const baseReport = {
    schema: "fc-ai-headless-runtime-smoke-v1",
    source: {
      kind: "headless-jsnes-runtime-smoke",
      tasIsController: false
    },
    maxFrames: options.frames,
    candidateConfig: candidateConfig
      ? {
          id: candidateOverlay?.id ?? null,
          path: candidateConfig.path
        }
      : null,
    candidateTrial,
    probeInput: options.probeInput,
    strategyKey: options.strategy,
    strategyPlan: strategyPlan ? {
      strategy: strategyPlan.strategy,
      segmentCount: strategyPlan.segments.length
    } : null,
    twoPlayerRequested: options.twoPlayer
  };

  if (!romPath) {
    console.log(JSON.stringify({
      ...baseReport,
      status: "error",
      reason: "missing-rom-path"
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (options.dryRun) {
    console.log(JSON.stringify({
      ...baseReport,
      status: "ready",
      reason: "dry-run",
      romPath
    }, null, 2));
    return;
  }

  if (!fs.existsSync(romPath) || !fs.statSync(romPath).isFile()) {
    console.log(JSON.stringify({
      ...baseReport,
      status: "error",
      reason: "rom-not-found",
      romPath
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const romBytes = fs.readFileSync(romPath);
  const nes = new NES({
    onFrame: () => undefined,
    onAudioSample: null,
    emulateSound: false
  });
  nes.loadROM(romBytes);

  let activeFrame = null;
  let lostActiveFrame = null;
  let finalSnapshot = null;
  let finalButtons = createHeadlessButtonState();
  let lastActiveSnapshot = null;
  let lastActiveButtons = createHeadlessButtonState();
  let lastActiveRouteSegment = null;
  let lostActiveSnapshot = null;
  let lostActiveButtons = createHeadlessButtonState();
  let lostActiveRouteSegment = null;
  let preLostActiveSnapshot = null;
  let preLostActiveButtons = createHeadlessButtonState();
  let preLostActiveRouteSegment = null;
  let maxProgressSnapshot = null;
  let maxProgressRouteSegment = null;
  const traceFrames = [];

  function shouldReplaceMaxProgress(snapshot) {
    if (!snapshot) return false;
    if (!maxProgressSnapshot) return true;
    if (snapshot.level !== maxProgressSnapshot.level) return snapshot.level > maxProgressSnapshot.level;
    return snapshot.worldX > maxProgressSnapshot.worldX;
  }

  function currentProgressStallFrames(snapshot) {
    if (!snapshot || !maxProgressSnapshot) return 0;
    return Math.max(0, snapshot.frame - maxProgressSnapshot.frame);
  }

  for (let frame = 0; frame < options.frames; frame += 1) {
    const beforeSnapshot = readHeadlessGameRamSnapshot(nes, frame);
    const active = isHeadlessGameplayActive(beforeSnapshot, frame);
    const startupButtons = runtimeStartupButtons(
      beforeSnapshot,
      frame,
      options.twoPlayer,
      Boolean(beforeSnapshot?.twoPlayerActive)
    );
    const routeSegment = activeRouteSegmentForPlan(beforeSnapshot, strategyPlan);
    const progressStallFrames = currentProgressStallFrames(beforeSnapshot);
    const buttons = active && options.probeInput === "route-plan"
      ? decideHeadlessRoutePlanProbeButtons({
          candidateTrial,
          candidateOverlay,
          frame,
          progressStallFrames,
          routeSegment,
          snapshot: beforeSnapshot
        })
      : active && options.probeInput !== "none"
        ? probeButtons(options.probeInput, createHeadlessButtonState)
        : startupButtons;
    applyButtonStateToNes(nes, 1, buttons);
    applyButtonStateToNes(nes, 2, createHeadlessButtonState());
    nes.frame();
    finalButtons = buttons;
    finalSnapshot = readHeadlessGameRamSnapshot(nes, frame + 1);
    const afterActive = isHeadlessGameplayActive(finalSnapshot, frame + 1);
    if (shouldTraceFrame(options, frame)) {
      traceFrames.push(compactTraceFrame({
        active,
        afterActive,
        afterSnapshot: finalSnapshot,
        beforeSnapshot,
        buttons,
        frame,
        progressStallFrames,
        routeSegment
      }));
    }
    if (activeFrame === null && afterActive) {
      activeFrame = frame + 1;
    }
    if (afterActive) {
      lastActiveSnapshot = finalSnapshot;
      lastActiveButtons = buttons;
      lastActiveRouteSegment = activeRouteSegmentForPlan(finalSnapshot, strategyPlan);
      if (shouldReplaceMaxProgress(finalSnapshot)) {
        maxProgressSnapshot = finalSnapshot;
        maxProgressRouteSegment = lastActiveRouteSegment;
      }
    }
    if (activeFrame !== null && lostActiveFrame === null && !afterActive) {
      lostActiveFrame = frame + 1;
      preLostActiveSnapshot = lastActiveSnapshot;
      preLostActiveButtons = lastActiveButtons;
      preLostActiveRouteSegment = lastActiveRouteSegment;
      lostActiveSnapshot = finalSnapshot;
      lostActiveButtons = buttons;
      lostActiveRouteSegment = routeSegment;
    }
  }

  const active = isHeadlessGameplayActive(finalSnapshot, options.frames);
  const stallThresholdFrames = 900;
  const maxProgressStallFrames = active && finalSnapshot && maxProgressSnapshot
    ? Math.max(0, finalSnapshot.frame - maxProgressSnapshot.frame)
    : 0;
  const progressStallFrames = maxProgressStallFrames;
  const status = lostActiveFrame !== null
    ? active ? "recovered-after-loss" : "lost-active"
    : active
      ? progressStallFrames >= stallThresholdFrames ? "stalled-active" : "active"
      : activeFrame !== null ? "lost-active" : "not-active";
  console.log(JSON.stringify({
    ...baseReport,
    status,
    reason: status === "active"
      ? "gameplay-detected"
      : status === "recovered-after-loss"
        ? "gameplay-loss-recovered"
      : status === "stalled-active"
        ? "progress-stalled"
        : status === "lost-active" ? "gameplay-lost" : "max-frames",
    frameCount: options.frames,
    activeFrame,
    lostActiveFrame,
    progressStallFrames,
    maxProgressStallFrames,
    stallThresholdFrames,
    routeSegment: compactRouteSegment(activeRouteSegmentForPlan(finalSnapshot, strategyPlan)),
    rom: {
      fileName: path.basename(romPath),
      ...hashRom(romBytes)
    },
    finalButtons,
    finalSnapshot: compactSnapshot(finalSnapshot),
    lastActiveButtons,
    lastActiveRouteSegment: compactRouteSegment(lastActiveRouteSegment),
    lastActiveSnapshot: compactSnapshot(lastActiveSnapshot),
    lostActiveButtons,
    lostActiveRouteSegment: compactRouteSegment(lostActiveRouteSegment),
    lostActiveSnapshot: compactSnapshot(lostActiveSnapshot),
    preLostActiveButtons,
    preLostActiveRouteSegment: compactRouteSegment(preLostActiveRouteSegment),
    preLostActiveSnapshot: compactSnapshot(preLostActiveSnapshot),
    maxProgressRouteSegment: compactRouteSegment(maxProgressRouteSegment),
    maxProgressSnapshot: compactSnapshot(maxProgressSnapshot),
    traceWindow: options.traceStart !== null && options.traceEnd !== null
      ? {
          startFrame: options.traceStart,
          endFrame: options.traceEnd,
          sampleCount: traceFrames.length,
          frames: traceFrames
        }
      : null,
    traceSummary: options.traceStart !== null && options.traceEnd !== null
      ? {
          startFrame: options.traceStart,
          endFrame: options.traceEnd,
          sampleCount: traceFrames.length,
          frames: traceFrames.map(summarizeTraceFrame)
        }
      : null
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({
    schema: "fc-ai-headless-runtime-smoke-v1",
    source: {
      kind: "headless-jsnes-runtime-smoke",
      tasIsController: false
    },
    status: "error",
    reason: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
});
