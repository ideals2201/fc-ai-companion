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
    dryRun: false,
    frames: 1800,
    probeInput: "none",
    strategy: "speedrun-v0",
    twoPlayer: false
  };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--two-player") options.twoPlayer = true;
    else if (arg === "--probe=right-b") options.probeInput = "right-b";
    else if (arg.startsWith("--strategy=")) options.strategy = arg.slice("--strategy=".length) || options.strategy;
    else if (arg.startsWith("--frames=")) {
      const value = Number.parseInt(arg.slice("--frames=".length), 10);
      if (Number.isFinite(value) && value > 0) options.frames = Math.min(value, 6000);
    }
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

async function importTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(repoRoot, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

function selectedRomPath(env) {
  const configured = process.env.FC_AI_COMPANION_ROM_PATH || env.FC_AI_COMPANION_ROM_PATH || "";
  return configured ? path.resolve(configured) : "";
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
    p1State: snapshot.p1State,
    deathFlag: snapshot.deathFlag,
    weapon: snapshot.weapon,
    twoPlayerActive: snapshot.twoPlayerActive,
    enemyCount: snapshot.enemies.length,
    bulletCount: snapshot.bullets.length
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
  const strategyPlan = planForStrategy(options.strategy, defaultStrategyPlans);

  const baseReport = {
    schema: "fc-ai-headless-runtime-smoke-v1",
    source: {
      kind: "headless-jsnes-runtime-smoke",
      tasIsController: false
    },
    maxFrames: options.frames,
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

  for (let frame = 0; frame < options.frames; frame += 1) {
    const beforeSnapshot = readHeadlessGameRamSnapshot(nes, frame);
    const active = isHeadlessGameplayActive(beforeSnapshot, frame);
    const startupButtons = runtimeStartupButtons(
      beforeSnapshot,
      frame,
      options.twoPlayer,
      Boolean(beforeSnapshot?.twoPlayerActive)
    );
    const buttons = active && options.probeInput !== "none"
      ? probeButtons(options.probeInput, createHeadlessButtonState)
      : startupButtons;
    applyButtonStateToNes(nes, 1, buttons);
    applyButtonStateToNes(nes, 2, createHeadlessButtonState());
    nes.frame();
    finalButtons = buttons;
    finalSnapshot = readHeadlessGameRamSnapshot(nes, frame + 1);
    const afterActive = isHeadlessGameplayActive(finalSnapshot, frame + 1);
    if (activeFrame === null && afterActive) {
      activeFrame = frame + 1;
    }
    if (activeFrame !== null && lostActiveFrame === null && !afterActive) {
      lostActiveFrame = frame + 1;
    }
  }

  const active = isHeadlessGameplayActive(finalSnapshot, options.frames);
  const status = active ? "active" : activeFrame !== null ? "lost-active" : "not-active";
  console.log(JSON.stringify({
    ...baseReport,
    status,
    reason: status === "active" ? "gameplay-detected" : status === "lost-active" ? "gameplay-lost" : "max-frames",
    frameCount: options.frames,
    activeFrame,
    lostActiveFrame,
    routeSegment: compactRouteSegment(activeRouteSegmentForPlan(finalSnapshot, strategyPlan)),
    rom: {
      fileName: path.basename(romPath),
      ...hashRom(romBytes)
    },
    finalButtons,
    finalSnapshot: compactSnapshot(finalSnapshot)
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
