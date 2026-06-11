import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import Mapper0 from "../node_modules/jsnes/src/mappers/mapper0.js";
import Mappers from "../node_modules/jsnes/src/mappers/index.js";
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

function registerHeadlessMapper23() {
  if (Mappers[23]) return;

  class Mapper23 extends Mapper0 {
    constructor(nes) {
      super(nes);
      this.prg0 = 0;
      this.prg1 = 1;
      this.latch = 0;
      this.chrBanks = new Array(8).fill(0);
      this.chrLow = new Array(8).fill(0);
      this.chrHigh = new Array(8).fill(0);
    }

    static mapperName = "Konami VRC2/VRC4";

    normalizeRegister(address) {
      const low = address & 0x000f;
      if (low <= 0x03) return low;
      if (low === 0x04) return 0x01;
      if (low === 0x08) return 0x02;
      if (low === 0x0c) return 0x03;
      return address & 0x0003;
    }

    syncPrgBanks() {
      const bankCount = Math.max(1, this.nes.rom.romCount * 2);
      this.load8kRomBank(this.prg0 % bankCount, 0x8000);
      this.load8kRomBank(this.prg1 % bankCount, 0xa000);
      this.load8kRomBank(Math.max(0, bankCount - 2), 0xc000);
      this.load8kRomBank(Math.max(0, bankCount - 1), 0xe000);
    }

    syncChrBank(index) {
      this.load1kVromBank(this.chrBanks[index] & 0x1ff, index * 0x0400);
    }

    setChrNibble(index, high, value) {
      if (high) this.chrHigh[index] = value & 0x0f;
      else this.chrLow[index] = value & 0x0f;
      this.chrBanks[index] = this.chrLow[index] | (this.chrHigh[index] << 4);
      this.syncChrBank(index);
    }

    writeMapperRegister(address, value) {
      const region = address & 0xf000;
      const register = this.normalizeRegister(address);
      if (region === 0x8000) {
        this.prg0 = value & 0x1f;
        this.syncPrgBanks();
        return;
      }
      if (region === 0x9000) {
        this.nes.ppu.setMirroring(
          (value & 1) !== 0
            ? this.nes.rom.HORIZONTAL_MIRRORING
            : this.nes.rom.VERTICAL_MIRRORING
        );
        return;
      }
      if (region === 0xa000) {
        this.prg1 = value & 0x1f;
        this.syncPrgBanks();
        return;
      }
      if (region >= 0xb000 && region <= 0xe000) {
        const pairBase = ((region - 0xb000) >> 12) * 2;
        const chrIndex = pairBase + (register >= 2 ? 1 : 0);
        this.setChrNibble(chrIndex, (register & 1) === 1, value);
      }
    }

    load(address) {
      const normalized = address & 0xffff;
      if (normalized >= 0x6000 && normalized < 0x7000) {
        return ((normalized >> 8) & 0xfe) | this.latch;
      }
      if (normalized >= 0x7000 && normalized < 0x8000) return this.nes.cpu.dataBus;
      return super.load(normalized);
    }

    write(address, value) {
      const normalized = address & 0xffff;
      const byte = value & 0xff;
      if (normalized < 0x6000) {
        super.write(normalized, byte);
        return;
      }
      if (normalized < 0x7000) {
        this.latch = byte & 1;
        return;
      }
      if (normalized < 0x8000) return;
      this.writeMapperRegister(normalized, byte);
    }

    writelow(address, value) {
      this.write(address, value);
    }

    loadROM() {
      if (!this.nes.rom.valid) throw new Error("VRC2/VRC4: Invalid ROM! Unable to load.");
      this.syncPrgBanks();
      for (let i = 0; i < this.chrBanks.length; i += 1) this.syncChrBank(i);
      this.loadBatteryRam();
      this.nes.cpu.requestIrq(this.nes.cpu.IRQ_RESET);
    }
  }

  Mappers[23] = Mapper23;
}

function parseArgs(argv) {
  const options = {
    fm2Path: "",
    frames: 6000,
    movieOffset: 0,
    side: "1P",
    traceEnd: null,
    traceStart: null,
    traceWorldEnd: null,
    traceWorldStart: null
  };
  for (const arg of argv) {
    if (arg.startsWith("--fm2=")) options.fm2Path = arg.slice("--fm2=".length).trim();
    else if (arg.startsWith("--frames=")) {
      const value = Number.parseInt(arg.slice("--frames=".length), 10);
      if (Number.isFinite(value) && value > 0) options.frames = Math.min(value, 120000);
    } else if (arg.startsWith("--movie-offset=")) {
      const value = Number.parseInt(arg.slice("--movie-offset=".length), 10);
      if (Number.isFinite(value)) options.movieOffset = Math.max(0, value);
    } else if (arg.startsWith("--side=")) {
      const value = arg.slice("--side=".length).trim().toUpperCase();
      if (value === "1P" || value === "2P") options.side = value;
    } else if (arg.startsWith("--trace-start=")) {
      const value = Number.parseInt(arg.slice("--trace-start=".length), 10);
      if (Number.isFinite(value) && value >= 0) options.traceStart = value;
    } else if (arg.startsWith("--trace-end=")) {
      const value = Number.parseInt(arg.slice("--trace-end=".length), 10);
      if (Number.isFinite(value) && value >= 0) options.traceEnd = value;
    } else if (arg.startsWith("--trace-world-start=")) {
      const value = Number.parseInt(arg.slice("--trace-world-start=".length), 10);
      if (Number.isFinite(value)) options.traceWorldStart = value;
    } else if (arg.startsWith("--trace-world-end=")) {
      const value = Number.parseInt(arg.slice("--trace-world-end=".length), 10);
      if (Number.isFinite(value)) options.traceWorldEnd = value;
    }
  }
  return options;
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

function selectedRomPath(env) {
  const configured = process.env.FC_AI_COMPANION_ROM_PATH || env.FC_AI_COMPANION_ROM_PATH || "";
  return configured ? path.resolve(configured) : "";
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
  return `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
}

async function importTypeScriptModule(relativePath) {
  return import(transpileLocalTypeScriptModule(relativePath));
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

function compactButtons(buttons) {
  return buttonOrder.filter((button) => buttons?.[button]);
}

function distanceToPlayer(entity, snapshot, side = "1P") {
  const playerX = side === "2P" ? snapshot.p2PlayerX : snapshot.playerX;
  const playerY = side === "2P" ? snapshot.p2PlayerY : snapshot.playerY;
  return {
    dx: entity.x - playerX,
    dy: entity.y - playerY,
    distanceToPlayer: Math.abs(entity.x - playerX) + Math.abs(entity.y - playerY)
  };
}

function compactEnemies(snapshot, side) {
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
      ...distanceToPlayer(enemy, snapshot, side)
    }))
    .sort((a, b) => a.distanceToPlayer - b.distanceToPlayer)
    .slice(0, 10);
}

function compactSnapshot(snapshot, side) {
  if (!snapshot) return null;
  return {
    frame: snapshot.frame,
    level: snapshot.level,
    screen: snapshot.screen,
    scroll: snapshot.scroll,
    worldX: side === "2P" ? snapshot.p2WorldX : snapshot.worldX,
    p1WorldX: snapshot.worldX,
    p2WorldX: snapshot.p2WorldX,
    playerX: side === "2P" ? snapshot.p2PlayerX : snapshot.playerX,
    playerY: side === "2P" ? snapshot.p2PlayerY : snapshot.playerY,
    p1State: snapshot.p1State,
    p2State: snapshot.p2State,
    deathFlag: snapshot.deathFlag,
    p2DeathFlag: snapshot.p2DeathFlag,
    jumpState: side === "2P" ? snapshot.p2JumpState : snapshot.jumpState,
    weapon: side === "2P" ? snapshot.p2Weapon : snapshot.weapon,
    p1Weapon: snapshot.weapon,
    p2Weapon: snapshot.p2Weapon,
    twoPlayerActive: snapshot.twoPlayerActive,
    enemyCount: snapshot.enemies.length,
    bulletCount: snapshot.bullets.length,
    nearbyEnemies: compactEnemies(snapshot, side)
  };
}

function shouldTrace(options, frame, snapshot, side) {
  if (options.traceStart !== null || options.traceEnd !== null) {
    const start = options.traceStart ?? 0;
    const end = options.traceEnd ?? Number.POSITIVE_INFINITY;
    return frame >= start && frame <= end;
  }
  if (options.traceWorldStart !== null || options.traceWorldEnd !== null) {
    const worldX = side === "2P" ? snapshot?.p2WorldX : snapshot?.worldX;
    const start = options.traceWorldStart ?? Number.NEGATIVE_INFINITY;
    const end = options.traceWorldEnd ?? Number.POSITIVE_INFINITY;
    return worldX >= start && worldX <= end;
  }
  return false;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = readDotEnv(path.resolve(repoRoot, ".env.local"));
  const romPath = selectedRomPath(env);
  const fm2Path = options.fm2Path ? path.resolve(repoRoot, options.fm2Path) : "";
  const baseReport = {
    schema: "fc-ai-headless-fm2-replay-v1",
    source: {
      kind: "headless-fm2-replay",
      tasIsController: false
    },
    side: options.side,
    maxFrames: options.frames,
    movieOffset: options.movieOffset,
    fm2Path: options.fm2Path
  };

  if (!romPath || !fs.existsSync(romPath)) {
    console.log(JSON.stringify({ ...baseReport, status: "error", reason: "rom-not-found", romPath }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (!fm2Path || !fs.existsSync(fm2Path)) {
    console.log(JSON.stringify({ ...baseReport, status: "error", reason: "fm2-not-found", fm2Path: options.fm2Path }, null, 2));
    process.exitCode = 1;
    return;
  }

  const { parseFm2Movie } = await importTypeScriptModule("apps/browser-cockpit/src/fm2Movie.ts");
  const { readHeadlessGameRamSnapshot, isHeadlessGameplayActive } = await importTypeScriptModule("apps/browser-cockpit/src/headlessRuntimeCore.ts");
  const movie = parseFm2Movie(fs.readFileSync(fm2Path, "utf8"));
  const romBytes = fs.readFileSync(romPath);
  registerHeadlessMapper23();
  const nes = new NES({
    onFrame: () => undefined,
    onAudioSample: null,
    emulateSound: false
  });
  nes.loadROM(romBytes);

  let activeFrame = null;
  let lostActiveFrame = null;
  let finalSnapshot = null;
  let maxProgressSnapshot = null;
  let firstWeaponFrame = null;
  let firstWeaponSnapshot = null;
  let lastWeapon = 0;
  const weaponEvents = [];
  const traceFrames = [];

  for (let step = 0; step < options.frames; step += 1) {
    const movieFrameIndex = options.movieOffset + step;
    const movieFrame = movie.frames[movieFrameIndex] ?? null;
    const buttons1P = movieFrame?.p1 ?? {};
    const buttons2P = movieFrame?.p2 ?? {};
    applyButtonStateToNes(nes, 1, buttons1P);
    applyButtonStateToNes(nes, 2, buttons2P);
    const beforeSnapshot = readHeadlessGameRamSnapshot(nes, step);
    nes.frame();
    finalSnapshot = readHeadlessGameRamSnapshot(nes, step + 1);
    const active = isHeadlessGameplayActive(finalSnapshot, step + 1);
    const activeSideState = options.side === "2P" ? finalSnapshot?.p2State : finalSnapshot?.p1State;
    const activeSideDeathFlag = options.side === "2P" ? finalSnapshot?.p2DeathFlag : finalSnapshot?.deathFlag;
    const sideAlive = active && activeSideState === 1 && activeSideDeathFlag === 0;
    const sideWorldX = options.side === "2P" ? finalSnapshot?.p2WorldX : finalSnapshot?.worldX;
    const sideWeapon = options.side === "2P" ? finalSnapshot?.p2Weapon : finalSnapshot?.weapon;
    const plausibleSnapshot = finalSnapshot
      && finalSnapshot.level !== 0xff
      && finalSnapshot.screen !== 0xff
      && finalSnapshot.p1State !== 0xff
      && sideWeapon !== 0xff;

    if (activeFrame === null && sideAlive) activeFrame = step + 1;
    if (activeFrame !== null && lostActiveFrame === null && !sideAlive) lostActiveFrame = step + 1;
    if (sideAlive && (!maxProgressSnapshot || sideWorldX > (options.side === "2P" ? maxProgressSnapshot.p2WorldX : maxProgressSnapshot.worldX))) {
      maxProgressSnapshot = finalSnapshot;
    }
    if (plausibleSnapshot && sideWeapon !== lastWeapon) {
      const event = {
        frame: step + 1,
        movieFrameIndex,
        from: lastWeapon,
        to: sideWeapon,
        snapshot: compactSnapshot(finalSnapshot, options.side)
      };
      weaponEvents.push(event);
      if (firstWeaponFrame === null && sideWeapon !== 0) {
        firstWeaponFrame = step + 1;
        firstWeaponSnapshot = finalSnapshot;
      }
      lastWeapon = sideWeapon;
    }
    if (shouldTrace(options, step, beforeSnapshot, options.side)) {
      traceFrames.push({
        frame: step,
        movieFrameIndex,
        buttons1P: compactButtons(buttons1P),
        buttons2P: compactButtons(buttons2P),
        beforeSnapshot: compactSnapshot(beforeSnapshot, options.side),
        afterSnapshot: compactSnapshot(finalSnapshot, options.side)
      });
    }
  }

  const status = lostActiveFrame !== null
    ? "lost-active"
    : activeFrame !== null
      ? "active"
      : "not-active";

  console.log(JSON.stringify({
    ...baseReport,
    status,
    reason: status === "active" ? "movie-replayed" : status === "lost-active" ? "gameplay-lost" : "not-active",
    rom: {
      fileName: path.basename(romPath),
      ...hashRom(romBytes)
    },
    movie: {
      inputFrames: movie.frames.length,
      header: {
        romFilename: movie.header.romFilename ?? null,
        romChecksum: movie.header.romChecksum ?? null,
        rerecordCount: movie.header.rerecordCount ?? null
      }
    },
    activeFrame,
    lostActiveFrame,
    finalSnapshot: compactSnapshot(finalSnapshot, options.side),
    maxProgressSnapshot: compactSnapshot(maxProgressSnapshot, options.side),
    firstWeaponFrame,
    firstWeaponSnapshot: compactSnapshot(firstWeaponSnapshot, options.side),
    weaponEvents,
    traceWindow: {
      sampleCount: traceFrames.length,
      frames: traceFrames
    }
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({
    schema: "fc-ai-headless-fm2-replay-v1",
    source: {
      kind: "headless-fm2-replay",
      tasIsController: false
    },
    status: "error",
    reason: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
});
