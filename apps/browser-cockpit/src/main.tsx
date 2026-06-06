import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { NES, Controller, type ButtonKey } from "jsnes";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  Cpu,
  Database,
  Gamepad2,
  Gauge,
  HeartPulse,
  Keyboard,
  Map as MapIcon,
  Maximize2,
  MessageSquareText,
  Minus,
  Plus,
  Power,
  Radio,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Target,
  Tv,
  Upload,
  UserRound,
  Volume2
} from "lucide-react";
import { parseNesRomMetadata, readRomMetadataHeaders, type RomMetadata } from "./romMetadata";
import "./styles.css";

type PlayerSide = "1P" | "2P";
type ButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
type ButtonState = Record<ButtonName, boolean>;
type PlayerButtonStates = Record<PlayerSide, ButtonState>;
type RuntimeStatus = "no-rom" | "loading" | "loaded" | "running" | "paused" | "error";
type AudioStatus = "off" | "starting" | "on" | "blocked" | "unsupported" | "error";
type ControlMode = "human" | "ai" | "hybrid";
type InputSource = "keyboard" | "gamepad" | "panel" | "ai" | "system";
type AiStrategyKey = "off" | "placeholder" | "rules-v0" | "follow-test" | "input-mirror";

type Pilot = {
  side: PlayerSide;
  name: string;
  status: string;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  strategy: string;
  temperament: string;
  buttons: ButtonState;
  accent: "blue" | "red";
  keyboardHint: string;
  gamepadHint: string;
  lastInput: string;
  authority: string;
  stats: StatItem[];
  dialogue: string[];
  dataStream: string[];
};

type StatItem = {
  label: string;
  value: string;
  status?: "real" | "pending" | "mode" | "derived";
};

type PlayerMetrics = {
  kills: number;
  deaths: number;
  shots: number;
  jumps: number;
  moves: number;
};

type PlayerMetricStates = Record<PlayerSide, PlayerMetrics>;

type VisualSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
};

type AudioRuntime = {
  context: AudioContext;
  pushSample: (left: number, right: number) => void;
  setVolume: (volume: number) => void;
  close: () => void;
};

type EnemySlotSnapshot = {
  slot: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  routine: number;
  vx: number;
  vy: number;
  attackDelay: number;
  animationFrame: number;
  attr: number;
  kind: string;
  threat: boolean;
  fixed: boolean;
  priority: number;
};

type GameRamSnapshot = {
  frame: number;
  level: number;
  playerMode: number;
  playerModeAlt: number;
  p1Lives: number;
  p2Lives: number;
  gameOver: number;
  p2GameOver: number;
  bossDefeated: number;
  screen: number;
  scroll: number;
  cameraX: number;
  p1State: number;
  p2State: number;
  jumpState: number;
  weapon: number;
  deathFlag: number;
  p2DeathFlag: number;
  playerX: number;
  playerY: number;
  worldX: number;
  twoPlayerActive: boolean;
  enemies: EnemySlotSnapshot[];
};

type NesWithCpuRam = NES & {
  cpu?: {
    mem?: ArrayLike<number>;
  };
};

const playerSides: PlayerSide[] = ["1P", "2P"];
const buttonNames: ButtonName[] = ["up", "down", "left", "right", "select", "start", "b", "a"];
const inputSources: InputSource[] = ["keyboard", "gamepad", "panel", "ai", "system"];
const humanSources: InputSource[] = ["keyboard", "gamepad", "panel"];

const playerNumbers: Record<PlayerSide, 1 | 2> = {
  "1P": 1,
  "2P": 2
};

const buttonMap: Record<ButtonName, ButtonKey> = {
  a: Controller.BUTTON_A,
  b: Controller.BUTTON_B,
  select: Controller.BUTTON_SELECT,
  start: Controller.BUTTON_START,
  up: Controller.BUTTON_UP,
  down: Controller.BUTTON_DOWN,
  left: Controller.BUTTON_LEFT,
  right: Controller.BUTTON_RIGHT
};

const keyboardMap = new Map<string, { side: PlayerSide; button: ButtonName }>([
  ["ArrowUp", { side: "1P", button: "up" }],
  ["ArrowDown", { side: "1P", button: "down" }],
  ["ArrowLeft", { side: "1P", button: "left" }],
  ["ArrowRight", { side: "1P", button: "right" }],
  ["KeyZ", { side: "1P", button: "b" }],
  ["KeyX", { side: "1P", button: "a" }],
  ["Enter", { side: "1P", button: "start" }],
  ["ShiftLeft", { side: "1P", button: "select" }],
  ["ShiftRight", { side: "1P", button: "select" }],
  ["KeyW", { side: "2P", button: "up" }],
  ["KeyS", { side: "2P", button: "down" }],
  ["KeyA", { side: "2P", button: "left" }],
  ["KeyD", { side: "2P", button: "right" }],
  ["KeyJ", { side: "2P", button: "b" }],
  ["KeyK", { side: "2P", button: "a" }],
  ["KeyI", { side: "2P", button: "start" }],
  ["KeyU", { side: "2P", button: "select" }]
]);

const controlModeLabels: Record<ControlMode, string> = {
  human: "人类",
  ai: "AI",
  hybrid: "混合"
};

const modeStrategyLabels: Record<ControlMode, string> = {
  human: "只写入人类输入",
  ai: "AI 根据策略写入手柄",
  hybrid: "人类优先，AI 补助写入"
};

const modeLastInputLabels: Record<ControlMode, string> = {
  human: "等待人类输入",
  ai: "AI 占位，等待 FSM",
  hybrid: "混合模式，人类优先"
};

const aiStrategyOptions: Array<{ key: AiStrategyKey; label: string; description: string }> = [
  { key: "off", label: "关闭 AI", description: "只显示人类输入" },
  { key: "placeholder", label: "安全占位 Bot", description: "空输入 / 待机" },
  { key: "rules-v0", label: "规则基线 V0", description: "等待 RAM/FSM" },
  { key: "follow-test", label: "跟随/待机测试", description: "后续 2P 陪玩预留" },
  { key: "input-mirror", label: "调试输入镜像", description: "只作输入诊断" }
];

const keyboardHints: Record<PlayerSide, string> = {
  "1P": "方向键 / Z=B / X=A / Enter=开始 / Shift=选择",
  "2P": "WASD / J=B / K=A / I=开始 / U=选择"
};

const AUDIO_SAMPLE_RATE = 44100;
const AUDIO_BUFFER_SIZE = 1024;
const AUDIO_TARGET_BUFFERED_SAMPLES = Math.round(AUDIO_SAMPLE_RATE * 0.07);
const AUDIO_MAX_BUFFERED_SAMPLES = Math.round(AUDIO_SAMPLE_RATE * 0.18);
const AUDIO_BUFFER_CAPACITY = Math.round(AUDIO_SAMPLE_RATE * 0.35);
const GAMEPAD_AXIS_THRESHOLD = 0.5;
const ENEMY_SLOT_COUNT = 16;
const P1_ALIVE_STATE = 1;
const P1_DEAD_STATE = 2;

function createButtonState(): ButtonState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
    select: false
  };
}

function createPlayerButtonStates(): PlayerButtonStates {
  return {
    "1P": createButtonState(),
    "2P": createButtonState()
  };
}

function createPlayerMetricStates(): PlayerMetricStates {
  return {
    "1P": { kills: 0, deaths: 0, shots: 0, jumps: 0, moves: 0 },
    "2P": { kills: 0, deaths: 0, shots: 0, jumps: 0, moves: 0 }
  };
}

function createSourceInputStates(): Record<PlayerSide, Record<InputSource, ButtonState>> {
  return {
    "1P": {
      keyboard: createButtonState(),
      gamepad: createButtonState(),
      panel: createButtonState(),
      ai: createButtonState(),
      system: createButtonState()
    },
    "2P": {
      keyboard: createButtonState(),
      gamepad: createButtonState(),
      panel: createButtonState(),
      ai: createButtonState(),
      system: createButtonState()
    }
  };
}

function createAudioRuntime(initialVolume = 0.28): AudioRuntime {
  const maybeWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? maybeWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("当前浏览器不支持 Web Audio。");
  }

  const context = new AudioContextConstructor({ sampleRate: AUDIO_SAMPLE_RATE });
  const processor = context.createScriptProcessor(AUDIO_BUFFER_SIZE, 0, 2);
  const gain = context.createGain();
  const leftBuffer = new Float32Array(AUDIO_BUFFER_CAPACITY);
  const rightBuffer = new Float32Array(AUDIO_BUFFER_CAPACITY);
  let readIndex = 0;
  let writeIndex = 0;
  let buffered = 0;

  gain.gain.value = initialVolume;

  processor.onaudioprocess = (event) => {
    const outputLeft = event.outputBuffer.getChannelData(0);
    const outputRight = event.outputBuffer.getChannelData(1);
    for (let i = 0; i < outputLeft.length; i += 1) {
      if (buffered > 0) {
        outputLeft[i] = leftBuffer[readIndex];
        outputRight[i] = rightBuffer[readIndex];
        readIndex = (readIndex + 1) % AUDIO_BUFFER_CAPACITY;
        buffered -= 1;
      } else {
        outputLeft[i] = 0;
        outputRight[i] = 0;
      }
    }
  };

  processor.connect(gain);
  gain.connect(context.destination);

  return {
    context,
    pushSample: (left, right) => {
      if (buffered >= AUDIO_MAX_BUFFERED_SAMPLES) {
        const dropCount = buffered - AUDIO_TARGET_BUFFERED_SAMPLES;
        readIndex = (readIndex + dropCount) % AUDIO_BUFFER_CAPACITY;
        buffered -= dropCount;
      }
      if (buffered >= AUDIO_BUFFER_CAPACITY) {
        readIndex = (readIndex + 1) % AUDIO_BUFFER_CAPACITY;
        buffered -= 1;
      }
      leftBuffer[writeIndex] = left;
      rightBuffer[writeIndex] = right;
      writeIndex = (writeIndex + 1) % AUDIO_BUFFER_CAPACITY;
      buffered += 1;
    },
    setVolume: (volume) => {
      gain.gain.value = volume;
    },
    close: () => {
      processor.disconnect();
      gain.disconnect();
      void context.close();
    }
  };
}

function signedByte(value: number) {
  return value > 127 ? value - 256 : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readCpuRamByte(nes: NES | null, address: number) {
  const ram = (nes as NesWithCpuRam | null)?.cpu?.mem;
  if (!ram) return 0;
  return ram[address & 0x7ff] ?? 0;
}

function enemyKind(type: number, hp: number, routine: number) {
  if (hp > 1) return "durable";
  if (type >= 0x40) return "projectile";
  if (routine > 0) return "enemy";
  return "object";
}

function isEnemySlotActive(type: number, hp: number, routine: number, x: number, y: number) {
  return routine !== 0 || type !== 0 || hp !== 0 || (x !== 0 && y !== 0);
}

function enemyThreat(type: number, hp: number, routine: number, x: number, y: number) {
  if (!isEnemySlotActive(type, hp, routine, x, y)) return false;
  if (x <= 4 || x >= 252 || y <= 4 || y >= 236) return false;
  return hp > 0 || routine > 0 || type > 0;
}

function readGameRamSnapshot(nes: NES | null, frame: number): GameRamSnapshot | null {
  if (!nes) return null;

  const read = (address: number) => readCpuRamByte(nes, address);
  const screen = read(0x0064);
  const scroll = read(0x0065);
  const playerX = read(0x0334);
  const playerY = read(0x031a);
  const playerMode = read(0x0022);
  const playerModeAlt = read(0x001d);
  const p2Lives = read(0x0033);
  const p2GameOver = read(0x0039);
  const p2State = read(0x0091);
  const p2DeathFlag = read(0x00b5);
  const cameraX = screen * 256 + scroll;
  const enemies: EnemySlotSnapshot[] = [];

  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot += 1) {
    const y = read(0x0324 + slot);
    const x = read(0x033e + slot);
    const routine = read(0x04b8 + slot);
    const vy = signedByte(read(0x04e8 + slot));
    const vx = signedByte(read(0x0508 + slot));
    const type = read(0x0528 + slot);
    const attackDelay = read(0x0558 + slot);
    const animationFrame = read(0x0568 + slot);
    const hp = read(0x0578 + slot);
    const attr = read(0x05a8 + slot);

    if (!isEnemySlotActive(type, hp, routine, x, y)) continue;

    const threat = enemyThreat(type, hp, routine, x, y);
    enemies.push({
      slot,
      type,
      hp,
      x,
      y,
      routine,
      vx,
      vy,
      attackDelay,
      animationFrame,
      attr,
      kind: enemyKind(type, hp, routine),
      threat,
      fixed: vx === 0 && vy === 0,
      priority: threat ? Math.max(1, Math.min(9, hp + (attackDelay > 0 ? 1 : 0))) : 0
    });
  }

  return {
    frame,
    level: read(0x0030),
    playerMode,
    playerModeAlt,
    p1Lives: read(0x0032),
    p2Lives,
    gameOver: read(0x0038),
    p2GameOver,
    bossDefeated: read(0x003b),
    screen,
    scroll,
    cameraX,
    p1State: read(0x0090),
    p2State,
    jumpState: read(0x00a0),
    weapon: read(0x00aa),
    deathFlag: read(0x00b4),
    p2DeathFlag,
    playerX,
    playerY,
    worldX: cameraX + playerX,
    twoPlayerActive: playerMode === 0x01,
    enemies
  };
}

function isGameplayActive(snapshot: GameRamSnapshot | null) {
  if (!snapshot) return false;
  return snapshot.gameOver === 0
    && snapshot.p1State === P1_ALIVE_STATE
    && snapshot.playerX > 0
    && snapshot.playerY > 0;
}

function shouldCountP1Death(before: GameRamSnapshot | null, after: GameRamSnapshot | null, deathLatched: boolean) {
  if (!before || !after || deathLatched) return false;
  const stateDeath = before.p1State === P1_ALIVE_STATE && after.p1State === P1_DEAD_STATE;
  const flagDeath = before.deathFlag === 0 && after.deathFlag !== 0;
  return stateDeath || flagDeath;
}

function shouldReleaseDeathLatch(snapshot: GameRamSnapshot | null) {
  return isGameplayActive(snapshot) && snapshot?.deathFlag === 0;
}

function enemyBySlot(enemies: EnemySlotSnapshot[]) {
  return new Map(enemies.map((enemy) => [enemy.slot, enemy]));
}

function likelyVisibleKillDisappearance(enemy: EnemySlotSnapshot) {
  if (!enemy.threat || enemy.hp <= 0) return false;
  return enemy.x > 8 && enemy.x < 248 && enemy.y > 8 && enemy.y < 232;
}

function countLikelyKillEvents(before: GameRamSnapshot | null, after: GameRamSnapshot | null) {
  if (!before || !after || !isGameplayActive(before)) return 0;
  const afterSlots = enemyBySlot(after.enemies);
  let count = 0;

  for (const previousEnemy of before.enemies) {
    const currentEnemy = afterSlots.get(previousEnemy.slot);
    if (currentEnemy) {
      if (
        previousEnemy.type === currentEnemy.type
        && previousEnemy.hp > 0
        && currentEnemy.hp === 0
        && likelyVisibleKillDisappearance(previousEnemy)
      ) {
        count += 1;
      }
      continue;
    }

    if (likelyVisibleKillDisappearance(previousEnemy)) {
      count += 1;
    }
  }

  return count;
}

async function tryResumeAudioContext(context: AudioContext) {
  await Promise.race([
    context.resume().catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 1200))
  ]);
  return context.state === "running";
}

function statusLabel(status: RuntimeStatus) {
  if (status === "no-rom") return "未加载 ROM";
  if (status === "loading") return "正在加载 ROM";
  if (status === "loaded") return "ROM 已加载";
  if (status === "running") return "运行中";
  if (status === "paused") return "已暂停";
  return "运行错误";
}

function audioLabel(status: AudioStatus) {
  if (status === "starting") return "声音启动中";
  if (status === "on") return "声音已开启";
  if (status === "blocked") return "请点击启用声音";
  if (status === "unsupported") return "浏览器不支持声音";
  if (status === "error") return "声音错误";
  return "启用声音";
}

function volumeControlLabel(status: AudioStatus) {
  if (status === "starting") return "音量启动中";
  if (status === "blocked") return "音量待启用";
  if (status === "unsupported") return "声音不支持";
  if (status === "error") return "声音错误";
  return "音量";
}

function hasPressedButton(buttons: ButtonState) {
  return buttonNames.some((button) => buttons[button]);
}

function cloneButtonState(buttons: ButtonState) {
  return { ...buttons };
}

function getPilotName(side: PlayerSide, mode: ControlMode) {
  if (side === "1P") {
    if (mode === "ai") return "AI 接管 1P";
    if (mode === "hybrid") return "玩家 1 + AI 辅助";
    return "玩家 1";
  }
  if (mode === "ai") return "AI 伙伴";
  if (mode === "hybrid") return "玩家 2 + AI 伙伴";
  return "玩家 2";
}

function getPilotStatus(
  side: PlayerSide,
  status: RuntimeStatus,
  mode: ControlMode,
  strategyKey: AiStrategyKey,
  twoPlayerActive: boolean
) {
  if (status !== "running") return statusLabel(status);
  if (side === "2P" && mode !== "human" && !twoPlayerActive) return "等待双人局";
  if (mode === "human") return "可操作";
  if (strategyKey === "off" || strategyKey === "placeholder") return "安全待机";
  if (mode === "hybrid") return "AI 补助";
  return "操作中";
}

function getPilotTemperament(side: PlayerSide, mode: ControlMode, strategyKey: AiStrategyKey, twoPlayerActive: boolean) {
  if (mode === "human") return "人类输入可写入";
  if (side === "2P" && !twoPlayerActive) return "等待 1P 启动双人模式";
  if (strategyKey === "off") return "AI 未启用";
  if (strategyKey === "placeholder") return "AI 安全占位";
  if (mode === "hybrid") return "人类优先，AI 填补空档";
  return "AI 正在写入手柄";
}

function activeButtonLabel(buttons: ButtonState) {
  const labels: Record<ButtonName, string> = {
    up: "上",
    down: "下",
    left: "左",
    right: "右",
    a: "A",
    b: "B",
    start: "开始",
    select: "选择"
  };
  const active = buttonNames.filter((button) => buttons[button]).map((button) => labels[button]);
  return active.length > 0 ? active.join(" + ") : "无";
}

function getAiStrategyLabel(strategyKey: AiStrategyKey) {
  return aiStrategyOptions.find((option) => option.key === strategyKey)?.label ?? "安全占位 Bot";
}

function getAuthorityLabel(mode: ControlMode) {
  if (mode === "human") return "Human Control";
  if (mode === "ai") return "AI Control V0";
  return "Human Override";
}

function decideAiButtons({
  side,
  mode,
  strategyKey,
  snapshot,
  gameplayActive,
  twoPlayerActive,
  humanOverrideActive,
  mirrorButtons,
  frame
}: {
  side: PlayerSide;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  snapshot: GameRamSnapshot | null;
  gameplayActive: boolean;
  twoPlayerActive: boolean;
  humanOverrideActive: boolean;
  mirrorButtons: ButtonState;
  frame: number;
}) {
  const next = createButtonState();
  if (mode === "human" || strategyKey === "off" || strategyKey === "placeholder") return next;
  if (side === "2P" && !twoPlayerActive) return next;
  if (mode === "hybrid" && humanOverrideActive) return next;

  if (strategyKey === "input-mirror") {
    return cloneButtonState(mirrorButtons);
  }

  if (!snapshot || !gameplayActive) {
    next.start = frame % 120 < 24;
    return next;
  }

  const enemyAhead = snapshot.enemies.some((enemy) => (
    enemy.threat
    && enemy.x >= snapshot.playerX
    && enemy.x - snapshot.playerX < 128
    && Math.abs(enemy.y - snapshot.playerY) < 64
  ));

  next.right = true;
  next.b = enemyAhead || frame % 12 < 5;

  if (strategyKey === "rules-v0" && snapshot.jumpState === 0 && frame % 180 < 10) {
    next.a = true;
  }

  if (strategyKey === "follow-test" && side === "2P") {
    next.b = frame % 18 < 6;
  }

  return next;
}

function aiStrategyWritesInput(strategyKey: AiStrategyKey) {
  return strategyKey !== "off" && strategyKey !== "placeholder";
}

function buildPilotStats(
  side: PlayerSide,
  mode: ControlMode,
  buttons: ButtonState,
  metrics: PlayerMetrics,
  ramSnapshot: GameRamSnapshot | null,
  gameplayActive: boolean
): StatItem[] {
  const hasRam = Boolean(ramSnapshot);
  const threatCount = ramSnapshot?.enemies.filter((enemy) => enemy.threat).length ?? 0;
  const isP1 = side === "1P";
  const twoPlayerActive = Boolean(ramSnapshot?.twoPlayerActive);
  const sideStatsActive = gameplayActive && (isP1 || twoPlayerActive);
  const statsState = sideStatsActive ? "游戏中" : side === "2P" && !twoPlayerActive ? "等待双人局" : "待入局";
  return [
    { label: "击杀", value: isP1 ? `${metrics.kills} 推导` : "等待 2P RAM", status: isP1 ? "derived" : "pending" },
    { label: "死亡", value: isP1 ? `${metrics.deaths}` : "等待 2P RAM", status: isP1 ? "real" : "pending" },
    { label: "开枪", value: `${metrics.shots}`, status: "real" },
    { label: "跳跃", value: `${metrics.jumps}`, status: "real" },
    { label: "移动", value: `${metrics.moves}`, status: "real" },
    { label: "当前按键", value: activeButtonLabel(buttons), status: "real" },
    { label: "路线", value: isP1 && ramSnapshot ? `WorldX ${ramSnapshot.worldX}` : "等待 WorldX", status: isP1 && hasRam ? "real" : "pending" },
    { label: "危险", value: hasRam ? `${threatCount} 威胁` : "等待 Danger", status: hasRam ? "real" : "pending" },
    { label: "统计", value: statsState, status: "mode" },
    { label: "双人局", value: twoPlayerActive ? "已检测" : "等待 1P", status: twoPlayerActive ? "real" : "pending" },
    { label: "控制权", value: getAuthorityLabel(mode), status: "mode" }
  ];
}

function buildDialogue(mode: ControlMode, strategyKey: AiStrategyKey) {
  if (mode === "human") {
    return ["人类正在控制，我只记录输入。", "AI 不写入手柄，等待你切换模式。"];
  }
  if (strategyKey === "off" || strategyKey === "placeholder") {
    return [
      `${getAiStrategyLabel(strategyKey)} 已选择。`,
      "当前策略不会写入动作，可切换到规则基线 V0。"
    ];
  }
  if (mode === "ai") {
    return [
      `${getAiStrategyLabel(strategyKey)} 已选择。`,
      "AI 操作层 V0 正在写入手柄，尚未接入 FSM。"
    ];
  }
  return [
    "混合模式：人类输入优先。",
    `${getAiStrategyLabel(strategyKey)} 在无人类输入时补助操作。`
  ];
}

function buildPilotDialogue(side: PlayerSide, mode: ControlMode, strategyKey: AiStrategyKey, ramSnapshot: GameRamSnapshot | null) {
  if (side === "2P" && mode !== "human" && !ramSnapshot?.twoPlayerActive) {
    return [
      "2P 等待双人模式启动。",
      "请先由 1P 在游戏菜单选择双人模式。"
    ];
  }
  return buildDialogue(mode, strategyKey);
}

function buildDataStream(
  side: PlayerSide,
  mode: ControlMode,
  strategyKey: AiStrategyKey,
  lastInput: string,
  ramSnapshot: GameRamSnapshot | null,
  gameplayActive: boolean
) {
  const inputAllowed = mode !== "human"
    && aiStrategyWritesInput(strategyKey)
    && (side === "1P" || Boolean(ramSnapshot?.twoPlayerActive));
  const lines = [
    `${side}.mode=${mode}`,
    `${side}.strategy=${strategyKey}`,
    `${side}.lastInput=${lastInput}`,
    `ai.write=${inputAllowed ? "enabled" : "idle"}`,
    `twoPlayer.active=${ramSnapshot?.twoPlayerActive ? "true" : "false"}`,
    `ram.schema=${ramSnapshot ? "active" : "pending"}`,
    `gameplay.active=${gameplayActive ? "true" : "false"}`,
    "fsm.state=pending"
  ];
  if (ramSnapshot) {
    lines.splice(4, 0, `ram.level=${ramSnapshot.level}`);
    lines.splice(5, 0, `ram.screen=${ramSnapshot.screen}`);
    lines.splice(6, 0, `ram.worldX=${ramSnapshot.worldX}`);
    lines.splice(7, 0, `ram.enemies=${ramSnapshot.enemies.length}`);
    lines.splice(8, 0, `ram.playerMode=${ramSnapshot.playerMode}`);
    lines.splice(9, 0, `ram.modeAlt=${ramSnapshot.playerModeAlt}`);
    if (side === "1P") {
      lines.splice(10, 0, `p1.state=${ramSnapshot.p1State}`);
      lines.splice(11, 0, `p1.deathFlag=${ramSnapshot.deathFlag}`);
    } else {
      lines.splice(10, 0, `p2.state=${ramSnapshot.p2State}`);
      lines.splice(11, 0, `p2.gameOver=${ramSnapshot.p2GameOver}`);
    }
  }
  return lines;
}

function visualFilter(settings: VisualSettings) {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
}

function mapGamepadButtons(gamepad: Gamepad | null | undefined): ButtonState {
  const next = createButtonState();
  if (!gamepad) return next;

  const buttonPressed = (index: number) => Boolean(gamepad.buttons[index]?.pressed);
  const axis = (index: number) => gamepad.axes[index] ?? 0;

  next.up = buttonPressed(12) || axis(1) < -GAMEPAD_AXIS_THRESHOLD;
  next.down = buttonPressed(13) || axis(1) > GAMEPAD_AXIS_THRESHOLD;
  next.left = buttonPressed(14) || axis(0) < -GAMEPAD_AXIS_THRESHOLD;
  next.right = buttonPressed(15) || axis(0) > GAMEPAD_AXIS_THRESHOLD;
  next.a = buttonPressed(0);
  next.b = buttonPressed(2) || buttonPressed(1);
  next.select = buttonPressed(8);
  next.start = buttonPressed(9);
  return next;
}

function gamepadLabel(gamepad: Gamepad | null | undefined, fallbackIndex: number) {
  if (!gamepad) return `Gamepad ${fallbackIndex} 未连接`;
  const name = gamepad.id.length > 28 ? `${gamepad.id.slice(0, 28)}...` : gamepad.id;
  return `Gamepad ${fallbackIndex} 已连接：${name}`;
}

function PadButton({
  label,
  active,
  onDown,
  onUp
}: {
  label: string;
  active: boolean;
  onDown?: () => void;
  onUp?: () => void;
}) {
  return (
    <button
      className={active ? "pad-button active" : "pad-button"}
      onPointerDown={(event) => {
        event.preventDefault();
        onDown?.();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        onUp?.();
      }}
      onPointerCancel={() => onUp?.()}
      onPointerLeave={() => onUp?.()}
      type="button"
    >
      {label}
    </button>
  );
}

function ControllerView({
  buttons,
  onButtonDown,
  onButtonUp
}: {
  buttons: ButtonState;
  onButtonDown?: (button: ButtonName) => void;
  onButtonUp?: (button: ButtonName) => void;
}) {
  return (
    <div className="controller" aria-label="实时手柄">
      <div className="dpad">
        <PadButton label="上" active={buttons.up} onDown={() => onButtonDown?.("up")} onUp={() => onButtonUp?.("up")} />
        <div className="dpad-mid">
          <PadButton label="左" active={buttons.left} onDown={() => onButtonDown?.("left")} onUp={() => onButtonUp?.("left")} />
          <PadButton label="右" active={buttons.right} onDown={() => onButtonDown?.("right")} onUp={() => onButtonUp?.("right")} />
        </div>
        <PadButton label="下" active={buttons.down} onDown={() => onButtonDown?.("down")} onUp={() => onButtonUp?.("down")} />
      </div>
      <div className="system-buttons">
        <PadButton label="选择" active={buttons.select} onDown={() => onButtonDown?.("select")} onUp={() => onButtonUp?.("select")} />
        <PadButton label="开始" active={buttons.start} onDown={() => onButtonDown?.("start")} onUp={() => onButtonUp?.("start")} />
      </div>
      <div className="action-buttons">
        <PadButton label="B" active={buttons.b} onDown={() => onButtonDown?.("b")} onUp={() => onButtonUp?.("b")} />
        <PadButton label="A" active={buttons.a} onDown={() => onButtonDown?.("a")} onUp={() => onButtonUp?.("a")} />
      </div>
    </div>
  );
}

function PilotPanel({
  pilot,
  onButtonDown,
  onButtonUp,
  onModeChange,
  onStrategyChange
}: {
  pilot: Pilot;
  onButtonDown?: (button: ButtonName) => void;
  onButtonUp?: (button: ButtonName) => void;
  onModeChange: (mode: ControlMode) => void;
  onStrategyChange: (strategy: AiStrategyKey) => void;
}) {
  const Icon = pilot.mode === "ai" ? Bot : pilot.mode === "hybrid" ? HeartPulse : UserRound;
  return (
    <section className={`pilot-panel controller-bay ${pilot.accent} ${pilot.side === "1P" ? "side-left" : "side-right"}`}>
      <div className="controller-head">
        <div className="panel-title">
          <Icon size={18} />
          <span>{pilot.side} 实体手柄舱</span>
        </div>
        <span className="authority-chip">{pilot.authority}</span>
      </div>
      <div className="pilot-card">
        <div className="avatar">
          <Icon size={34} />
        </div>
        <div>
          <div className="pilot-name">{pilot.name}</div>
          <div className="pilot-role">{controlModeLabels[pilot.mode]} / {pilot.status}</div>
        </div>
      </div>
      <div className="mode-selector" role="group" aria-label={`${pilot.side} 控制模式`}>
        {(["human", "ai", "hybrid"] as ControlMode[]).map((mode) => (
          <button
            className={pilot.mode === mode ? "mode-button active" : "mode-button"}
            key={mode}
            onClick={() => onModeChange(mode)}
            type="button"
          >
            {controlModeLabels[mode]}
          </button>
        ))}
      </div>
      <label className="field-row">
        <span>AI 策略模型</span>
        <select
          value={pilot.strategyKey}
          onChange={(event) => onStrategyChange(event.target.value as AiStrategyKey)}
        >
          {aiStrategyOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <dl className="compact-grid">
        <div>
          <dt>模式</dt>
          <dd>{controlModeLabels[pilot.mode]}</dd>
        </div>
        <div>
          <dt>策略</dt>
          <dd>{pilot.strategy}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{pilot.temperament}</dd>
        </div>
      </dl>
      <ControllerView buttons={pilot.buttons} onButtonDown={onButtonDown} onButtonUp={onButtonUp} />
      <div className="stats-grid" aria-label={`${pilot.side} 数据面板`}>
        {pilot.stats.map((item) => (
          <div className={`stat-tile ${item.status ?? "pending"}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="ai-dialogue" aria-label={`${pilot.side} AI 对话`}>
        <div className="sub-title">
          <MessageSquareText size={15} />
          <span>AI 对话</span>
        </div>
        {pilot.dialogue.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="micro-stream" aria-label={`${pilot.side} 数据流`}>
        <div className="sub-title">
          <Database size={15} />
          <span>数据流</span>
        </div>
        {pilot.dataStream.map((line) => (
          <code key={line}>{line}</code>
        ))}
      </div>
      <div className="input-meta">
        <div>
          <Keyboard size={15} />
          <span>{pilot.keyboardHint}</span>
        </div>
        <div>
          <Gamepad2 size={15} />
          <span>{pilot.gamepadHint}</span>
        </div>
        <div>
          <Radio size={15} />
          <span>{pilot.lastInput}</span>
        </div>
      </div>
      <div className="write-strip">
        <Gamepad2 size={16} />
        <span>最终写入 {pilot.side}</span>
      </div>
    </section>
  );
}

function TelevisionView({
  tvRef,
  canvasRef,
  status,
  audioStatus,
  message,
  frameCount,
  ramSnapshot,
  visualSettings,
  isFullscreen,
  volume,
  onEnableAudio,
  onVolumeChange,
  onVisualChange,
  onToggleFullscreen
}: {
  tvRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: RuntimeStatus;
  audioStatus: AudioStatus;
  message: string;
  frameCount: number;
  ramSnapshot: GameRamSnapshot | null;
  visualSettings: VisualSettings;
  isFullscreen: boolean;
  volume: number;
  onEnableAudio: () => void;
  onVolumeChange: (volume: number) => void;
  onVisualChange: (key: keyof VisualSettings, value: number) => void;
  onToggleFullscreen: () => void;
}) {
  const hasRom = status === "loaded" || status === "running" || status === "paused";
  const handleVolumeActivate = () => {
    if (audioStatus !== "on" && audioStatus !== "starting") onEnableAudio();
  };
  const stepVolume = (delta: number) => {
    handleVolumeActivate();
    onVolumeChange(clamp(Number((volume + delta).toFixed(2)), 0, 0.6));
  };
  const stepVisual = (key: keyof VisualSettings, delta: number, min: number, max: number) => {
    onVisualChange(key, clamp(visualSettings[key] + delta, min, max));
  };

  return (
    <section className="tv-station" aria-label="中间电视">
      <div className="tv-shell" ref={tvRef}>
        <div className="tv-top">
          <div className="panel-title">
            <Tv size={19} />
            <span>中间电视</span>
          </div>
          <div className="tv-osd">
            <span>{statusLabel(status)}</span>
            <span>FPS 目标 60</span>
            <span>帧数 {frameCount}</span>
            <span>{ramSnapshot ? `屏幕 ${ramSnapshot.screen} / WorldX ${ramSnapshot.worldX}` : "屏幕数 等待 RAM"}</span>
          </div>
        </div>
        <div className="screen-frame">
          <div className="screen-picture" style={{ filter: visualFilter(visualSettings) }}>
            <canvas ref={canvasRef} className="nes-canvas" width={256} height={240} />
          </div>
          {!hasRom && (
            <div className="rom-overlay">
              <AlertTriangle size={22} />
              <strong>{message}</strong>
            </div>
          )}
        </div>
        <div className="tv-controls" aria-label="电视设置">
          <button className="icon-button" onClick={onToggleFullscreen} type="button">
            <Maximize2 size={15} />
            {isFullscreen ? "退出全屏" : "电视全屏"}
          </button>
          <label className="range-control volume-control">
            <Volume2 size={14} />
            <span>{volumeControlLabel(audioStatus)}</span>
            <div className="range-input-row">
              <button aria-label="降低音量" className="step-button" onClick={() => stepVolume(-0.03)} type="button">
                <Minus size={13} />
              </button>
              <input
                max="0.6"
                min="0"
                onChange={(event) => {
                  onVolumeChange(Number(event.target.value));
                  handleVolumeActivate();
                }}
                onFocus={handleVolumeActivate}
                onPointerDown={handleVolumeActivate}
                step="0.01"
                type="range"
                value={volume}
              />
              <button aria-label="提高音量" className="step-button" onClick={() => stepVolume(0.03)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
          <label className="range-control">
            <SlidersHorizontal size={14} />
            <span>亮度</span>
            <div className="range-input-row">
              <button aria-label="降低亮度" className="step-button" onClick={() => stepVisual("brightness", -5, 70, 130)} type="button">
                <Minus size={13} />
              </button>
              <input
                max="130"
                min="70"
                onChange={(event) => onVisualChange("brightness", Number(event.target.value))}
                step="1"
                type="range"
                value={visualSettings.brightness}
              />
              <button aria-label="提高亮度" className="step-button" onClick={() => stepVisual("brightness", 5, 70, 130)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
          <label className="range-control">
            <SlidersHorizontal size={14} />
            <span>对比</span>
            <div className="range-input-row">
              <button aria-label="降低对比" className="step-button" onClick={() => stepVisual("contrast", -5, 75, 140)} type="button">
                <Minus size={13} />
              </button>
              <input
                max="140"
                min="75"
                onChange={(event) => onVisualChange("contrast", Number(event.target.value))}
                step="1"
                type="range"
                value={visualSettings.contrast}
              />
              <button aria-label="提高对比" className="step-button" onClick={() => stepVisual("contrast", 5, 75, 140)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
          <label className="range-control">
            <SlidersHorizontal size={14} />
            <span>色彩</span>
            <div className="range-input-row">
              <button aria-label="降低色彩" className="step-button" onClick={() => stepVisual("saturation", -5, 60, 150)} type="button">
                <Minus size={13} />
              </button>
              <input
                max="150"
                min="60"
                onChange={(event) => onVisualChange("saturation", Number(event.target.value))}
                step="1"
                type="range"
                value={visualSettings.saturation}
              />
              <button aria-label="提高色彩" className="step-button" onClick={() => stepVisual("saturation", 5, 60, 150)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}

function ConsoleDeck({
  status,
  romMetadata,
  onLoadLocalRom,
  onRun,
  onPause,
  onReset
}: {
  status: RuntimeStatus;
  romMetadata: RomMetadata | null;
  onLoadLocalRom: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const isRunning = status === "running";
  const hasRom = status === "loaded" || status === "running" || status === "paused";

  return (
    <section className="console-deck" aria-label="主机">
      <div className="console-status-strip">
        <span>位置：{romMetadata?.filePath || "未提供本地路径"}</span>
        <strong>主机状态：{statusLabel(status)}</strong>
      </div>
      <div className="console-left">
        <div className="panel-title">
          <Cpu size={18} />
          <span>主机</span>
        </div>
        <div className="cartridge-slot">
          <span>卡带槽</span>
          {romMetadata ? (
            <>
              <strong>{romMetadata.displayTitle}</strong>
              <div className="rom-meta-grid" aria-label="ROM 信息">
                <div>
                  <span>文件</span>
                  <b>{romMetadata.fileName}</b>
                </div>
                <div>
                  <span>版本</span>
                  <b>{romMetadata.versionLabel}</b>
                </div>
                <div>
                  <span>容量</span>
                  <b>{romMetadata.sizeLabel}</b>
                </div>
                <div>
                  <span>Mapper</span>
                  <b>{romMetadata.mapperLabel}</b>
                </div>
                <div>
                  <span>PRG</span>
                  <b>{romMetadata.prgRomBanks} banks / {romMetadata.prgRomKb} KB</b>
                </div>
                <div>
                  <span>CHR</span>
                  <b>{romMetadata.chrRomBanks} banks / {romMetadata.chrRomKb} KB</b>
                </div>
                <div>
                  <span>镜像</span>
                  <b>{romMetadata.mirroring}</b>
                </div>
                <div>
                  <span>标志</span>
                  <b>{romMetadata.battery ? "Battery" : "No Battery"} / {romMetadata.trainer ? "Trainer" : "No Trainer"}</b>
                </div>
                <div>
                  <span>校验</span>
                  <b>{romMetadata.sha256Short || "未计算"}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <strong>{hasRom ? "本地 ROM 已插入" : "等待本地用户自有 ROM"}</strong>
            </>
          )}
        </div>
      </div>
      <div className="console-controls">
        <button onClick={onLoadLocalRom} type="button"><Upload size={15} /> 更换卡带</button>
        <button disabled={!hasRom} onClick={isRunning ? onPause : onRun} type="button">
          <Power size={15} />
          {isRunning ? "暂停" : "继续"}
        </button>
        <button disabled={!hasRom} onClick={onReset} type="button"><RotateCcw size={15} /> Reset</button>
      </div>
    </section>
  );
}

function TacticalPanel({
  ramSnapshot,
  gameplayActive
}: {
  ramSnapshot: GameRamSnapshot | null;
  gameplayActive: boolean;
}) {
  const threatCount = ramSnapshot?.enemies.filter((enemy) => enemy.threat).length ?? 0;
  const stackRows = [
    { label: "生存", value: gameplayActive ? "可操作" : ramSnapshot ? "待入局" : "等待 RAM", icon: Shield },
    { label: "路线", value: ramSnapshot ? `WorldX ${ramSnapshot.worldX}` : "等待 WorldX", icon: MapIcon },
    { label: "协作", value: "排队中", icon: HeartPulse },
    { label: "战斗", value: ramSnapshot ? `${threatCount} 威胁` : "仅输入测试", icon: Target },
    { label: "推进", value: ramSnapshot ? `屏幕 ${ramSnapshot.screen}` : "受控", icon: Activity }
  ];

  return (
    <section className="tactical-panel">
      <div className="panel-title">
        <Brain size={18} />
        <span>快脑</span>
      </div>
      <div className="state-strip">
        <div>
          <dt>CameraX</dt>
          <dd>{ramSnapshot ? ramSnapshot.cameraX : "等待"}</dd>
        </div>
        <div>
          <dt>PlayerX</dt>
          <dd>{ramSnapshot ? ramSnapshot.playerX : "等待"}</dd>
        </div>
        <div>
          <dt>WorldX</dt>
          <dd>{ramSnapshot ? ramSnapshot.worldX : "等待"}</dd>
        </div>
      </div>
      <div className="stack-list">
        {stackRows.map((item) => {
          const Icon = item.icon;
          return (
            <div className="stack-row" key={item.label}>
              <Icon size={17} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LogPanel({ eventLog }: { eventLog: string[] }) {
  return (
    <section className="log-panel">
      <div className="panel-title">
        <Radio size={18} />
        <span>事件流</span>
      </div>
      <div className="log-lines">
        {eventLog.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvRef = useRef<HTMLDivElement | null>(null);
  const nesRef = useRef<NES | null>(null);
  const audioRef = useRef<AudioRuntime | null>(null);
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const frameRef = useRef(0);
  const volumeRef = useRef(0.28);
  const romBytesRef = useRef<Uint8Array | null>(null);
  const autoLoadStartedRef = useRef(false);
  const autoRunStartedRef = useRef(false);
  const autoSmokeStartedRef = useRef(false);
  const audioBlockedLoggedRef = useRef(false);
  const audioOnLoggedRef = useRef(false);
  const gameplayActiveRef = useRef(false);
  const ramSnapshotRef = useRef<GameRamSnapshot | null>(null);
  const deathLatchedRef = useRef(false);
  const finalButtonsRef = useRef<PlayerButtonStates>(createPlayerButtonStates());
  const playerMetricsRef = useRef<PlayerMetricStates>(createPlayerMetricStates());
  const sourceButtonsRef = useRef(createSourceInputStates());
  const controlModesRef = useRef<Record<PlayerSide, ControlMode>>({ "1P": "human", "2P": "human" });
  const strategyModelsRef = useRef<Record<PlayerSide, AiStrategyKey>>({
    "1P": "off",
    "2P": "placeholder"
  });
  const gamepadLabelsRef = useRef<Record<PlayerSide, string>>({
    "1P": gamepadLabel(null, 0),
    "2P": gamepadLabel(null, 1)
  });
  const [status, setStatus] = useState<RuntimeStatus>("no-rom");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("off");
  const [message, setMessage] = useState("加载本地用户自有 ROM 后开始真实模拟器测试。");
  const [romMetadata, setRomMetadata] = useState<RomMetadata | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [ramSnapshot, setRamSnapshot] = useState<GameRamSnapshot | null>(null);
  const [gameplayActive, setGameplayActive] = useState(false);
  const [buttonStates, setButtonStates] = useState<PlayerButtonStates>(createPlayerButtonStates);
  const [playerMetrics, setPlayerMetrics] = useState<PlayerMetricStates>(createPlayerMetricStates);
  const [controlModes, setControlModes] = useState<Record<PlayerSide, ControlMode>>({ "1P": "human", "2P": "human" });
  const [strategyModels, setStrategyModels] = useState<Record<PlayerSide, AiStrategyKey>>({
    "1P": "off",
    "2P": "placeholder"
  });
  const [volume, setVolume] = useState(0.28);
  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    brightness: 100,
    contrast: 108,
    saturation: 112
  });
  const [isTvFullscreen, setIsTvFullscreen] = useState(false);
  const [gamepadLabelsState, setGamepadLabelsState] = useState<Record<PlayerSide, string>>(gamepadLabelsRef.current);
  const [lastInputs, setLastInputs] = useState<Record<PlayerSide, string>>({
    "1P": "等待输入",
    "2P": "等待输入"
  });
  const [eventLog, setEventLog] = useState<string[]>([
    "PM：2P 输入路由准备中",
    "运行时：等待本地用户自有 ROM",
    "边界：仓库不提交、不打包 ROM",
    "BOT：AI 模式当前为安全占位"
  ]);

  const appendLog = useCallback((line: string) => {
    setEventLog((current) => [line, ...current].slice(0, 10));
  }, []);

  const addPlayerMetricDeltas = useCallback((side: PlayerSide, deltas: Partial<PlayerMetrics>) => {
    const currentMetrics = playerMetricsRef.current[side];
    const updatedMetrics = {
      kills: currentMetrics.kills + (deltas.kills ?? 0),
      deaths: currentMetrics.deaths + (deltas.deaths ?? 0),
      shots: currentMetrics.shots + (deltas.shots ?? 0),
      jumps: currentMetrics.jumps + (deltas.jumps ?? 0),
      moves: currentMetrics.moves + (deltas.moves ?? 0)
    };

    playerMetricsRef.current = {
      ...playerMetricsRef.current,
      [side]: updatedMetrics
    };
    setPlayerMetrics((current) => ({
      ...current,
      [side]: updatedMetrics
    }));
  }, []);

  const resetRamTracking = useCallback(() => {
    gameplayActiveRef.current = false;
    ramSnapshotRef.current = null;
    deathLatchedRef.current = false;
    setGameplayActive(false);
    setRamSnapshot(null);
  }, []);

  const isSourceAllowed = useCallback((side: PlayerSide, source: InputSource) => {
    const mode = controlModesRef.current[side];
    if (source === "system") return true;
    if (humanSources.includes(source)) return mode === "human" || mode === "hybrid";
    if (source === "ai") return mode === "ai" || mode === "hybrid";
    return false;
  }, []);

  const recomputeSide = useCallback((side: PlayerSide) => {
    const next = createButtonState();
    for (const source of inputSources) {
      if (!isSourceAllowed(side, source)) continue;
      const sourceButtons = sourceButtonsRef.current[side][source];
      for (const button of buttonNames) {
        next[button] = next[button] || sourceButtons[button];
      }
    }

    const previous = finalButtonsRef.current[side];
    const nes = nesRef.current;
    const shouldCountInputMetrics = gameplayActiveRef.current
      && (side === "1P" || Boolean(ramSnapshotRef.current?.twoPlayerActive));
    let shotsDelta = 0;
    let jumpsDelta = 0;
    let movesDelta = 0;
    for (const button of buttonNames) {
      if (previous[button] === next[button]) continue;
      if (shouldCountInputMetrics && !previous[button] && next[button]) {
        if (button === "b") shotsDelta += 1;
        if (button === "a") jumpsDelta += 1;
        if (button === "up" || button === "down" || button === "left" || button === "right") movesDelta += 1;
      }
      if (nes) {
        if (next[button]) nes.buttonDown(playerNumbers[side], buttonMap[button]);
        else nes.buttonUp(playerNumbers[side], buttonMap[button]);
      }
    }

    if (shotsDelta > 0 || jumpsDelta > 0 || movesDelta > 0) {
      addPlayerMetricDeltas(side, {
        shots: shotsDelta,
        jumps: jumpsDelta,
        moves: movesDelta
      });
    }

    finalButtonsRef.current = {
      ...finalButtonsRef.current,
      [side]: next
    };
    setButtonStates((current) => ({
      ...current,
      [side]: next
    }));
  }, [addPlayerMetricDeltas, isSourceAllowed]);

  const setSourceButtons = useCallback((side: PlayerSide, source: InputSource, next: ButtonState) => {
    sourceButtonsRef.current[side][source] = next;
    recomputeSide(side);
    if (source !== "system" && hasPressedButton(next)) {
      const sourceLabel = source === "keyboard" ? "键盘" : source === "gamepad" ? "游戏手柄" : source === "panel" ? "屏幕按钮" : "AI";
      setLastInputs((current) => ({
        ...current,
        [side]: `${sourceLabel} 输入`
      }));
    }
  }, [recomputeSide]);

  const setSourceButton = useCallback((side: PlayerSide, source: InputSource, button: ButtonName, pressed: boolean) => {
    const allowed = isSourceAllowed(side, source);
    const current = sourceButtonsRef.current[side][source];
    const next = {
      ...current,
      [button]: pressed && allowed
    };
    setSourceButtons(side, source, next);
  }, [isSourceAllowed, setSourceButtons]);

  const clearSourcesForSide = useCallback((side: PlayerSide, sourcesToClear: InputSource[]) => {
    for (const source of sourcesToClear) {
      sourceButtonsRef.current[side][source] = createButtonState();
    }
    recomputeSide(side);
  }, [recomputeSide]);

  const clearAllInputs = useCallback(() => {
    const nes = nesRef.current;
    for (const side of playerSides) {
      for (const button of buttonNames) {
        if (nes && finalButtonsRef.current[side][button]) {
          nes.buttonUp(playerNumbers[side], buttonMap[button]);
        }
      }
    }
    sourceButtonsRef.current = createSourceInputStates();
    finalButtonsRef.current = createPlayerButtonStates();
    setButtonStates(createPlayerButtonStates());
    setLastInputs({ "1P": "等待输入", "2P": "等待输入" });
  }, []);

  const resetPlayerMetrics = useCallback(() => {
    const next = createPlayerMetricStates();
    playerMetricsRef.current = next;
    setPlayerMetrics(next);
  }, []);

  const changeControlMode = useCallback((side: PlayerSide, mode: ControlMode) => {
    controlModesRef.current = {
      ...controlModesRef.current,
      [side]: mode
    };
    setControlModes((current) => ({
      ...current,
      [side]: mode
    }));

    if (mode === "human") clearSourcesForSide(side, ["ai"]);
    if (mode === "ai") clearSourcesForSide(side, ["keyboard", "gamepad", "panel"]);
    if (mode === "hybrid") recomputeSide(side);

    if (mode !== "human" && (strategyModelsRef.current[side] === "off" || strategyModelsRef.current[side] === "placeholder")) {
      strategyModelsRef.current = {
        ...strategyModelsRef.current,
        [side]: "rules-v0"
      };
      setStrategyModels((current) => ({
        ...current,
        [side]: "rules-v0"
      }));
      appendLog(`${side} AI 策略：自动切换到规则基线 V0`);
    }

    setLastInputs((current) => ({
      ...current,
      [side]: modeLastInputLabels[mode]
    }));
    appendLog(`${side} 模式切换：${controlModeLabels[mode]}`);
    if (side === "2P" && mode !== "human" && !ramSnapshotRef.current?.twoPlayerActive) {
      appendLog("2P：等待 1P 在游戏菜单启动双人模式");
    }
  }, [appendLog, clearSourcesForSide, recomputeSide]);

  const changeStrategyModel = useCallback((side: PlayerSide, strategy: AiStrategyKey) => {
    strategyModelsRef.current = {
      ...strategyModelsRef.current,
      [side]: strategy
    };
    setStrategyModels((current) => ({
      ...current,
      [side]: strategy
    }));
    appendLog(`${side} AI 策略：${getAiStrategyLabel(strategy)}`);
  }, [appendLog]);

  const changeVolume = useCallback((nextVolume: number) => {
    volumeRef.current = nextVolume;
    setVolume(nextVolume);
    audioRef.current?.setVolume(nextVolume);
  }, []);

  const changeVisualSetting = useCallback((key: keyof VisualSettings, value: number) => {
    setVisualSettings((current) => ({
      ...current,
      [key]: value
    }));
  }, []);

  const toggleTvFullscreen = useCallback(() => {
    const target = tvRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        appendLog(`电视全屏退出失败：${detail}`);
      });
      return;
    }
    void target.requestFullscreen().catch((error) => {
      const detail = error instanceof Error ? error.message : String(error);
      appendLog(`电视全屏请求失败：${detail}`);
    });
  }, [appendLog]);

  const renderFrame = useCallback((buffer: Uint32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = context.getImageData(0, 0, 256, 240);
    for (let i = 0; i < buffer.length; i += 1) {
      const color = buffer[i];
      const offset = i * 4;
      image.data[offset] = color & 0xff;
      image.data[offset + 1] = (color >> 8) & 0xff;
      image.data[offset + 2] = (color >> 16) & 0xff;
      image.data[offset + 3] = 0xff;
    }
    context.putImageData(image, 0, 0);
  }, []);

  const createNes = useCallback(() => {
    const nes = new NES({
      onFrame: renderFrame,
      onAudioSample: (left, right) => audioRef.current?.pushSample(left, right),
      emulateSound: true,
      sampleRate: AUDIO_SAMPLE_RATE
    });
    nesRef.current = nes;
    return nes;
  }, [renderFrame]);

  const enableAudio = useCallback(async () => {
    if (audioRef.current) {
      const resumed = await tryResumeAudioContext(audioRef.current.context);
      if (resumed) {
        setAudioStatus("on");
        audioBlockedLoggedRef.current = false;
        if (!audioOnLoggedRef.current) {
          audioOnLoggedRef.current = true;
          appendLog("声音：已开启");
        }
      } else {
        setAudioStatus("blocked");
        audioOnLoggedRef.current = false;
        if (!audioBlockedLoggedRef.current) {
          audioBlockedLoggedRef.current = true;
          appendLog("声音：浏览器等待真实点击");
        }
      }
      return;
    }
    setAudioStatus("starting");
    try {
      const runtime = createAudioRuntime(volumeRef.current);
      audioRef.current = runtime;
      const resumed = await tryResumeAudioContext(runtime.context);
      if (resumed) {
        setAudioStatus("on");
        audioBlockedLoggedRef.current = false;
        if (!audioOnLoggedRef.current) {
          audioOnLoggedRef.current = true;
          appendLog("声音：已开启");
        }
      } else {
        setAudioStatus("blocked");
        audioOnLoggedRef.current = false;
        if (!audioBlockedLoggedRef.current) {
          audioBlockedLoggedRef.current = true;
          appendLog("声音：浏览器等待真实点击");
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const unsupported = detail.includes("不支持");
      setAudioStatus(unsupported ? "unsupported" : "error");
      appendLog(`声音错误：${detail}`);
    }
  }, [appendLog]);

  const pulseButton = useCallback((side: PlayerSide, button: ButtonName, ms = 180) => {
    setSourceButton(side, "system", button, true);
    window.setTimeout(() => setSourceButton(side, "system", button, false), ms);
  }, [setSourceButton]);

  const applyGamepads = useCallback(() => {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const nextLabels: Record<PlayerSide, string> = {
      "1P": gamepadLabel(pads[0], 0),
      "2P": gamepadLabel(pads[1], 1)
    };

    for (const side of playerSides) {
      const index = side === "1P" ? 0 : 1;
      const nextButtons = mapGamepadButtons(pads[index]);
      setSourceButtons(side, "gamepad", nextButtons);
    }

    if (frameRef.current % 30 === 0 && (
      nextLabels["1P"] !== gamepadLabelsRef.current["1P"] ||
      nextLabels["2P"] !== gamepadLabelsRef.current["2P"]
    )) {
      gamepadLabelsRef.current = nextLabels;
      setGamepadLabelsState(nextLabels);
    }
  }, [setSourceButtons]);

  const hasHumanInputForSide = useCallback((side: PlayerSide) => (
    humanSources.some((source) => hasPressedButton(sourceButtonsRef.current[side][source]))
  ), []);

  const applyAiInputs = useCallback((snapshot: GameRamSnapshot | null, active: boolean) => {
    for (const side of playerSides) {
      const mode = controlModesRef.current[side];
      const strategyKey = strategyModelsRef.current[side];
      const mirrorSide = side === "1P" ? "2P" : "1P";
      const aiButtons = decideAiButtons({
        side,
        mode,
        strategyKey,
        snapshot,
        gameplayActive: active,
        twoPlayerActive: side === "1P" || Boolean(snapshot?.twoPlayerActive),
        humanOverrideActive: hasHumanInputForSide(side),
        mirrorButtons: finalButtonsRef.current[mirrorSide],
        frame: frameRef.current
      });
      setSourceButtons(side, "ai", aiButtons);
    }
  }, [hasHumanInputForSide, setSourceButtons]);

  const tickFrame = useCallback(() => {
    if (!runningRef.current) return;
    const nes = nesRef.current;
    if (nes) {
      const beforeSnapshot = readGameRamSnapshot(nes, frameRef.current);
      ramSnapshotRef.current = beforeSnapshot;
      gameplayActiveRef.current = isGameplayActive(beforeSnapshot);

      applyGamepads();
      applyAiInputs(beforeSnapshot, gameplayActiveRef.current);
      nes.frame();
      frameRef.current += 1;

      const afterSnapshot = readGameRamSnapshot(nes, frameRef.current);
      const deathsDelta = shouldCountP1Death(beforeSnapshot, afterSnapshot, deathLatchedRef.current) ? 1 : 0;
      const killsDelta = countLikelyKillEvents(beforeSnapshot, afterSnapshot);
      if (deathsDelta > 0) deathLatchedRef.current = true;
      if (shouldReleaseDeathLatch(afterSnapshot)) deathLatchedRef.current = false;
      if (deathsDelta > 0 || killsDelta > 0) {
        addPlayerMetricDeltas("1P", {
          deaths: deathsDelta,
          kills: killsDelta
        });
      }

      ramSnapshotRef.current = afterSnapshot;
      gameplayActiveRef.current = isGameplayActive(afterSnapshot);

      if (frameRef.current % 10 === 0) {
        setFrameCount(frameRef.current);
        setRamSnapshot(afterSnapshot);
        setGameplayActive(gameplayActiveRef.current);
      }
    }
  }, [addPlayerMetricDeltas, applyAiInputs, applyGamepads]);

  const setRunning = useCallback((running: boolean, forceRestart = false) => {
    runningRef.current = running;
    if (running) {
      void enableAudio();
      setStatus("running");
      if (forceRestart && timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (timerRef.current === null) {
        tickFrame();
        timerRef.current = window.setInterval(tickFrame, 1000 / 60);
      }
    } else {
      setStatus((current) => current === "running" ? "paused" : current);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [enableAudio, tickFrame]);

  const loadLocalRom = useCallback(async () => {
    setStatus("loading");
    setMessage("正在通过本地开发端点加载 ROM...");
    setRomMetadata(null);
    romBytesRef.current = null;
    try {
      const response = await fetch("/api/local-test-rom", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `ROM endpoint returned ${response.status}`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const metadata = parseNesRomMetadata(data, readRomMetadataHeaders(response.headers));
      const nes = nesRef.current || createNes();
      nes.loadROM(data);
      romBytesRef.current = data;
      frameRef.current = 0;
      setFrameCount(0);
      clearAllInputs();
      resetPlayerMetrics();
      resetRamTracking();
      setRomMetadata(metadata);
      setStatus("loaded");
      setMessage(`本地 ROM 已加载：${metadata.displayTitle} / ${metadata.sizeLabel}。`);
      appendLog(`运行时：本地 ROM 已加载（${metadata.displayTitle}，${metadata.sizeLabel}）`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setRomMetadata(null);
      resetRamTracking();
      setStatus("error");
      setMessage(detail);
      appendLog(`运行错误：${detail}`);
    }
  }, [appendLog, clearAllInputs, createNes, resetPlayerMetrics, resetRamTracking]);

  const resetRuntime = useCallback(() => {
    const currentRom = romBytesRef.current;
    if (!currentRom) return;
    setRunning(false);
    clearAllInputs();
    resetPlayerMetrics();
    resetRamTracking();
    const nes = createNes();
    nes.loadROM(currentRom);
    frameRef.current = 0;
    setFrameCount(0);
    setStatus("loaded");
    appendLog("主机：Reset，断电重启");
    window.setTimeout(() => setRunning(true, true), 140);
  }, [appendLog, clearAllInputs, createNes, resetPlayerMetrics, resetRamTracking, setRunning]);

  const runInputSmoke = useCallback((side: PlayerSide) => {
    if (!nesRef.current) return;
    setRunning(true);
    appendLog(`${side} 输入测试：延迟按开始键，然后按住右 + B`);
    window.setTimeout(() => pulseButton(side, "start", 260), 1200);
    window.setTimeout(() => pulseButton(side, "start", 260), 2600);
    window.setTimeout(() => {
      setSourceButton(side, "system", "right", true);
      setSourceButton(side, "system", "b", true);
    }, 3600);
    window.setTimeout(() => {
      setSourceButton(side, "system", "right", false);
      setSourceButton(side, "system", "b", false);
    }, 6200);
  }, [appendLog, pulseButton, setRunning, setSourceButton]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mapped = keyboardMap.get(event.code);
      if (!mapped) return;
      event.preventDefault();
      void enableAudio();
      setSourceButton(mapped.side, "keyboard", mapped.button, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const mapped = keyboardMap.get(event.code);
      if (!mapped) return;
      event.preventDefault();
      setSourceButton(mapped.side, "keyboard", mapped.button, false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enableAudio, setSourceButton]);

  useEffect(() => {
    const onGamepadConnected = (event: GamepadEvent) => {
      appendLog(`游戏手柄连接：${event.gamepad.index}`);
    };
    const onGamepadDisconnected = (event: GamepadEvent) => {
      appendLog(`游戏手柄断开：${event.gamepad.index}`);
    };
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    return () => {
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
    };
  }, [appendLog]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsTvFullscreen(document.fullscreenElement === tvRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoload") === "1" && !autoLoadStartedRef.current) {
      autoLoadStartedRef.current = true;
      void loadLocalRom();
    }
  }, [loadLocalRom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasRom = status === "loaded" || status === "paused" || status === "running";
    if (!hasRom || autoSmokeStartedRef.current) return;
    if (params.get("autorun") === "1" && !autoRunStartedRef.current) {
      autoRunStartedRef.current = true;
      setRunning(true);
    }
    if (params.get("smoke") === "1") {
      autoSmokeStartedRef.current = true;
      runInputSmoke("1P");
    }
  }, [runInputSmoke, setRunning, status]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      audioRef.current?.close();
    };
  }, []);

  const twoPlayerActive = Boolean(ramSnapshot?.twoPlayerActive);
  const pilots: Pilot[] = [
    {
      side: "1P",
      name: getPilotName("1P", controlModes["1P"]),
      status: getPilotStatus("1P", status, controlModes["1P"], strategyModels["1P"], twoPlayerActive),
      mode: controlModes["1P"],
      strategyKey: strategyModels["1P"],
      strategy: `${getAiStrategyLabel(strategyModels["1P"])} / ${modeStrategyLabels[controlModes["1P"]]}`,
      temperament: getPilotTemperament("1P", controlModes["1P"], strategyModels["1P"], twoPlayerActive),
      buttons: buttonStates["1P"],
      accent: "blue",
      keyboardHint: keyboardHints["1P"],
      gamepadHint: gamepadLabelsState["1P"],
      lastInput: lastInputs["1P"],
      authority: getAuthorityLabel(controlModes["1P"]),
      stats: buildPilotStats("1P", controlModes["1P"], buttonStates["1P"], playerMetrics["1P"], ramSnapshot, gameplayActive),
      dialogue: buildPilotDialogue("1P", controlModes["1P"], strategyModels["1P"], ramSnapshot),
      dataStream: buildDataStream("1P", controlModes["1P"], strategyModels["1P"], lastInputs["1P"], ramSnapshot, gameplayActive)
    },
    {
      side: "2P",
      name: getPilotName("2P", controlModes["2P"]),
      status: getPilotStatus("2P", status, controlModes["2P"], strategyModels["2P"], twoPlayerActive),
      mode: controlModes["2P"],
      strategyKey: strategyModels["2P"],
      strategy: `${getAiStrategyLabel(strategyModels["2P"])} / ${modeStrategyLabels[controlModes["2P"]]}`,
      temperament: getPilotTemperament("2P", controlModes["2P"], strategyModels["2P"], twoPlayerActive),
      buttons: buttonStates["2P"],
      accent: "red",
      keyboardHint: keyboardHints["2P"],
      gamepadHint: gamepadLabelsState["2P"],
      lastInput: lastInputs["2P"],
      authority: getAuthorityLabel(controlModes["2P"]),
      stats: buildPilotStats("2P", controlModes["2P"], buttonStates["2P"], playerMetrics["2P"], ramSnapshot, gameplayActive),
      dialogue: buildPilotDialogue("2P", controlModes["2P"], strategyModels["2P"], ramSnapshot),
      dataStream: buildDataStream("2P", controlModes["2P"], strategyModels["2P"], lastInputs["2P"], ramSnapshot, gameplayActive)
    }
  ];

  return (
    <main className="cockpit">
      <header className="topbar">
        <div>
          <h1>FC AI 陪玩驾驶舱</h1>
          <p>浏览器产品平台 / 双手柄输入路由</p>
        </div>
        <div className="status-cluster">
          <span><Gauge size={16} /> 目标 60 FPS</span>
          <span><AlertTriangle size={16} /> {statusLabel(status)}</span>
          <span><Radio size={16} /> {audioLabel(audioStatus)}</span>
        </div>
      </header>
      <div className="equipment-layout">
        <PilotPanel
          onButtonDown={(button) => {
            void enableAudio();
            setSourceButton("1P", "panel", button, true);
          }}
          onButtonUp={(button) => setSourceButton("1P", "panel", button, false)}
          onModeChange={(mode) => changeControlMode("1P", mode)}
          onStrategyChange={(strategy) => changeStrategyModel("1P", strategy)}
          pilot={pilots[0]}
        />
        <div className="center-column">
          <TelevisionView
            audioStatus={audioStatus}
            canvasRef={canvasRef}
            frameCount={frameCount}
            isFullscreen={isTvFullscreen}
            message={message}
            onEnableAudio={enableAudio}
            onToggleFullscreen={toggleTvFullscreen}
            onVisualChange={changeVisualSetting}
            onVolumeChange={changeVolume}
            ramSnapshot={ramSnapshot}
            status={status}
            tvRef={tvRef}
            visualSettings={visualSettings}
            volume={volume}
          />
          <ConsoleDeck
            onLoadLocalRom={loadLocalRom}
            onPause={() => setRunning(false)}
            onReset={resetRuntime}
            onRun={() => setRunning(true)}
            romMetadata={romMetadata}
            status={status}
          />
        </div>
        <PilotPanel
          onButtonDown={(button) => {
            void enableAudio();
            setSourceButton("2P", "panel", button, true);
          }}
          onButtonUp={(button) => setSourceButton("2P", "panel", button, false)}
          onModeChange={(mode) => changeControlMode("2P", mode)}
          onStrategyChange={(strategy) => changeStrategyModel("2P", strategy)}
          pilot={pilots[1]}
        />
      </div>
      <div className="debug-floor">
        <TacticalPanel gameplayActive={gameplayActive} ramSnapshot={ramSnapshot} />
        <LogPanel eventLog={eventLog} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
