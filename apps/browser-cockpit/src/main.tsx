import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import "./jsnesMapper23Patch";
// Use the same jsnes source-module graph as the mapper patch so mapper 23
// registration reaches the NES instances created by the cockpit runtime.
// @ts-expect-error jsnes does not expose deep source modules through package types.
import { NES, Controller } from "../../../node_modules/jsnes/src/index.js";
import type { ButtonKey } from "../../../node_modules/jsnes/src/controller.js";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  Cpu,
  Database,
  FolderOpen,
  Gamepad2,
  Gauge,
  HeartPulse,
  Keyboard,
  Map as MapIcon,
  Maximize2,
  MessageSquareText,
  Minus,
  Pause,
  Play,
  Plus,
  Power,
  Radio,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Square,
  Target,
  Tv,
  Upload,
  UserRound,
  Volume2
} from "lucide-react";
import { decideBossWallMicroAction, isBossWallBailoutInput } from "./contraStage1BossWall";
import {
  applyBossWallPhaseContainmentClamp,
  createBossWallPhaseState,
  describeBossWallPhaseTelemetry,
  decideBossWallPhaseAction,
  shouldBypassAiActionLockForBossWallPhase,
  shouldUseBossWallPhaseSafetyOverride,
  updateBossWallPhaseState,
  type BossWallPhaseState,
  type BossWallPhaseTelemetry
} from "./contraStage1BossWallPhase";
import {
  midFixedScriptRewardOverride,
  midWeaponTurretBreakoutPatch,
  rewardStationFallingThreatPatch,
  stageOneBossApproachCloseBodyPatch,
  stageOneBossApproachHighAirCarryPatch,
  stageOneBossApproachHighEdgeJumpPatch,
  stageOneBossApproachJumpEdgePatch,
  stageOneBossApproachMidPlatformCapturePatch,
  stageOneBossApproachPlatformJumpPatch,
  stageOneBridgeLowFixedCrowdPatch,
  stageOneCloseBodyThreatPatch,
  stageOneDangerLowLaneFallPatch,
  stageOneMandatorySpreadGatePatch,
  stageOneMidFixedCloseBodyCoverPatch,
  stageOneMidFixedThreatRecoveryPatch,
  stageOneOpeningLowFixedThreatPatch,
  stageOneRedTurretLowThreatPatch,
  stageOneSpreadExitJumpPatch,
  stageOneSpreadJumpEdgePatch,
  stageOneSpreadRushPatch,
  stageOneSpreadTurretSuppressionPatch,
  type StageOneRewardButtonPatch
} from "./contraStage1RewardTactics";
import { parseNesRomMetadata, readRomMetadataHeaders, type RomMetadata } from "./romMetadata";
import { findRomEntryIdByRelativePath, resolveSelectedRomIdAfterLoadedSync } from "./romLibrarySelection";
import {
  buildTasCommentary,
  commentaryModeLabel,
  identifyTasForRom,
  recommendationLabel,
  selectDefaultTasMovie,
  tasBaselineLabel,
  tasBaseLabel,
  tasMoviesForEntry,
  tasStatusLabel,
  type TasCommentaryMode,
  type TasRegistryEntry,
  type TasStrategyBaseline
} from "./tasRegistry";
import {
  fm2ButtonsToLabels,
  parseFm2Movie,
  resolveFm2PlaybackStartFrame,
  summarizeFm2Movie,
  type Fm2ControllerButtons,
  type Fm2Movie
} from "./fm2Movie";
import {
  createTasPlaybackGuardState,
  evaluateTasPlaybackGuard,
  type TasPlaybackGuardState
} from "./tasPlaybackGate";
import { DEFAULT_LANGUAGE, t, type UiLanguage } from "./i18n";
import { analyzePlayTrace, type PlayTraceAnalysisReport } from "./playTraceAnalysis";
import {
  createSideTrainingTraceEvidence,
  type StrategyTraceEvidence
} from "./strategyTraceEvidence";
import {
  createCandidateStrategyFragmentProposal,
  type CandidateStrategyFragmentProposal,
  type TasSideBaselineForProposal
} from "./strategyFragmentProposal";
import {
  createStrategyPackageEvidenceExport,
  createStrategyPackageValidationReport,
  type StrategyPackageEvidenceExport,
  type StrategyPackageValidationReport
} from "./strategyPackageEvidence";
import { classifyBotRunTerminalState } from "./runtimeStopControl";
import { parseBotRunStrategyParam, type BotRunStrategyKey } from "./botRunConfig";
import {
  parseTraceCaptureConfig,
  shouldKeepTraceSample,
  shouldStopTraceCapture,
  type TraceCaptureConfig
} from "./traceCaptureControl";
import contraJSideBaselinesArtifact from "../../../data/training/contra/tas_bases/contra-j-good/side-baselines.json";
import "./styles.css";

type PlayerSide = "1P" | "2P";
type ButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
type ButtonState = Record<ButtonName, boolean>;
type PlayerButtonStates = Record<PlayerSide, ButtonState>;
type AiActionLockReason = "idle" | "move" | "fire" | "aim-fire" | "jump" | "evade" | "menu";
type AiFsmStateName = "idle" | "menu" | "advance" | "danger" | "attack" | "boss" | "respawn" | "coop-wait";
type AiLoopExitReason = "idle" | "tracking" | "world-score-enemy-stall";

type AiActionLockState = {
  buttons: ButtonState;
  remainingFrames: number;
  priority: number;
  reason: AiActionLockReason;
};

type AiFsmState = {
  state: AiFsmStateName;
  reason: string;
  sinceFrame: number;
};

type AiLoopExitState = {
  lastWorldX: number;
  lastScore: number;
  lastThreatCount: number;
  stagnantFrames: number;
  unlockFrames: number;
  forcedAdvanceBias: number;
  reason: AiLoopExitReason;
};

type RuntimeStatus = "no-rom" | "loading" | "loaded" | "running" | "paused" | "error";
type AudioStatus = "off" | "starting" | "on" | "blocked" | "unsupported" | "error";
type ControlMode = "human" | "ai" | "hybrid";
type StartupLaunchPreset = "wait" | "auto-1p" | "auto-2p";
type StrategyPackageSideScope = "none" | "1p-only" | "2p-only" | "1p-2p";
type StrategyResourcePackId = "contra-stage1-strategy-v0" | "personal-contra-draft";

type RomLibrarySource = "server" | "browser";

type ServerRomFileInfo = {
  id: string;
  fileName: string;
  filePath: string;
  relativePath: string;
  sizeBytes: number;
  headerBytes: number[];
  md5: string;
  headerlessMd5?: string;
  sha1: string;
  sha256: string;
};

type RomLibraryEntry = {
  id: string;
  source: RomLibrarySource;
  fileName: string;
  filePath: string;
  relativePath: string;
  sizeBytes: number;
  metadata: RomMetadata;
  file?: File;
  bytes?: Uint8Array;
};
type ModeToggleKey = "human" | "ai";
type InputSource = "keyboard" | "gamepad" | "panel" | "ai" | "tas" | "system";
type AiStrategyKey =
  | "off"
  | "placeholder"
  | "rules-v0"
  | "survival-v0"
  | "speedrun-v0"
  | "combat-v0"
  | "loot-v0"
  | "guard-v0"
  | "personal-v0"
  | "follow-test"
  | "input-mirror";
type SideTrainingBaselineSourceKind = "strategy-pack" | "tas-side-baseline" | "human-demo" | "ai-run";
type SideTrainingBaselineOption = {
  id: string;
  side: PlayerSide | "any";
  label: string;
  sourceLabel: string;
  detailLabel: string;
  sourceKind: SideTrainingBaselineSourceKind;
  strategyKeys: readonly AiStrategyKey[];
  romProfileId?: string;
  frameWindow?: readonly [number, number];
};
type SideTrainingMethod = "auto-patch" | "model-analysis" | "human-assist" | "manual-edit";
type SideTrainingMethodOption = {
  key: SideTrainingMethod;
  label: string;
  description: string;
};
type TasSideBaselineArtifactBaseline = TasSideBaselineForProposal;
type TasSideBaselineArtifact = {
  role: "tas-side-baselines";
  romProfileId: string;
  baselines: readonly TasSideBaselineArtifactBaseline[];
};

type RouteAction = "advance" | "cautious" | "hold-fire" | "loot" | "guard" | "survive";
type RouteFireMode = "pulse" | "threat" | "always";
type StageOneScriptMode = "opening-push" | "first-weapon" | "bridge-jump" | "reward-shot" | "fixed-hp-fire" | "advance";

type StageRouteSegment = {
  id: string;
  label: string;
  worldStart: number;
  worldEnd: number;
  action: RouteAction;
  fire: RouteFireMode;
  jumpEvery?: number;
};

type StageStrategyPlan = {
  game: string;
  gameId: string;
  romProfileId: string;
  compatibilityGroup: string;
  stage: number;
  strategy: AiStrategyKey;
  version: number;
  description: string;
  segments: StageRouteSegment[];
};

type StageOneScriptAction = {
  id: string;
  label: string;
  worldStart: number;
  worldEnd: number;
  mode: StageOneScriptMode;
  priority: number;
};

type StageOnePatchJumpState = "any" | "grounded" | "airborne";

type StageOneButtonPatch = {
  id: string;
  label: string;
  worldStart: number;
  worldEnd: number;
  yMin?: number;
  yMax?: number;
  jumpState?: StageOnePatchJumpState;
  priority: number;
  hold: Partial<Record<ButtonName, boolean>>;
  pulse?: Partial<Record<ButtonName, { period: number; width: number }>>;
};

type StageOneHorizonCategory = "infantry" | "sniper" | "fixed" | "reward" | "bridge" | "boss";
type StageOneHorizonAim = "auto" | "level" | "up" | "down";

type StageOneHorizonEvent = {
  id: string;
  label: string;
  screen: number;
  x: number;
  y: number;
  attr: number;
  category: StageOneHorizonCategory;
  priority: number;
  aim: StageOneHorizonAim;
  note: string;
};

type StageOneHorizonTarget = StageOneHorizonEvent & {
  worldX: number;
  distance: number;
};

type StageOneHorizonSnapshot = {
  upcoming: StageOneHorizonTarget[];
  near: StageOneHorizonTarget[];
  primary: StageOneHorizonTarget | null;
  fixedAhead: StageOneHorizonTarget | null;
  rewardAhead: StageOneHorizonTarget | null;
  bridgeAhead: StageOneHorizonTarget | null;
  combatReadiness: boolean;
};

type LoadedStrategyPlans = Partial<Record<AiStrategyKey, StageStrategyPlan>>;

type TraceInputSample = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  start: boolean;
  select: boolean;
};

type PlayTraceSample = {
  frame: number;
  gameplayActive: boolean;
  runtimeStatus: RuntimeStatus;
  routeSegment: string;
  routeAction: string;
  p1Input: TraceInputSample;
  p2Input: TraceInputSample;
  bossWallPhase: Record<PlayerSide, BossWallPhaseTelemetry>;
  ram: null | {
    level: number;
    screen: number;
    scroll: number;
    cameraX: number;
    worldX: number;
    playerX: number;
    playerY: number;
    p2PlayerX: number;
    p2PlayerY: number;
    p2WorldX: number;
    p1State: number;
    p2State: number;
    jumpState: number;
    p2JumpState: number;
    deathFlag: number;
    p2DeathFlag: number;
    p1Score: number;
    p2Score: number;
    weapon: number;
    p2Weapon: number;
    bossDefeated: number;
    twoPlayerActive: boolean;
    enemies: Array<Pick<EnemySlotSnapshot, "slot" | "type" | "hp" | "x" | "y" | "routine" | "kind" | "threat" | "fixed" | "priority">>;
  };
};

type DeathTraceReport = {
  schema: "fc-ai-death-trace-v1";
  side: PlayerSide;
  frame: number;
  worldX: number | null;
  screen: number | null;
  playerX: number | null;
  playerY: number | null;
  score: number | null;
  weapon: number | null;
  routeSegment: string;
  routeAction: string;
  input: string;
  lastAlive: {
    frame: number;
    worldX: number | null;
    playerX: number | null;
    playerY: number | null;
    input: string;
  } | null;
  topEnemies: Array<Pick<EnemySlotSnapshot, "slot" | "type" | "hp" | "x" | "y" | "routine" | "kind" | "threat" | "fixed" | "priority">>;
  samples: PlayTraceSample[];
};

type RuntimeDebugSnapshot = {
  schema: "fc-ai-runtime-debug-v1";
  frame: number;
  frameCount: number;
  runtimeStatus: RuntimeStatus;
  gameplayActive: boolean;
  side: PlayerSide;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  routeSegment: string;
  routeAction: string;
  scriptAction: string;
  scriptMode: string;
  fsmState: AiFsmStateName;
  fsmReason: string;
  actionLock: string;
  loopExit: string;
  loopBias: number;
  finalButtons: string;
  finalInput: TraceInputSample;
  rawAiInput?: TraceInputSample;
  lockedAiInput?: TraceInputSample;
  ram: null | {
    level: number;
    screen: number;
    scroll: number;
    worldX: number;
    playerX: number;
    playerY: number;
    p1State: number;
    deathFlag: number;
    score: number;
    weapon: number;
    enemies: number;
    bullets: number;
  };
  threatPool: null | {
    active: number;
    turrets: number;
    actionableTurrets: number;
    dynamicThreats: number;
    projectiles: number;
    rewards: number;
    primaryTurret: string;
    primaryThreat: string;
    top: Array<Pick<EnemySlotSnapshot, "slot" | "type" | "hp" | "x" | "y" | "routine" | "kind" | "threat" | "fixed" | "priority">>;
  };
  horizon: null | {
    primary: string;
    fixedAhead: string;
    rewardAhead: string;
    bridgeAhead: string;
    near: number;
    upcoming: number;
  };
  bossWallPhase: BossWallPhaseTelemetry | null;
};

type BotRunReport = {
  schema: "fc-ai-bot-run-v1";
  status: "idle" | "running" | "complete" | "death" | "stopped" | "error";
  startedAt: string | null;
  finishedAt: string | null;
  maxFrames: number;
  frameCount: number;
  initialDeaths: number;
  deaths: number;
  finalWorldX: number | null;
  finalPlayerX: number | null;
  finalPlayerY: number | null;
  finalScore: number | null;
  finalWeapon: number | null;
  bossDefeated: number | null;
  gameplayActive: boolean;
  reason: string;
  lastInput: TraceInputSample;
  finalEnemies: Array<Pick<EnemySlotSnapshot, "slot" | "type" | "hp" | "x" | "y" | "routine" | "kind" | "threat" | "fixed" | "priority">>;
  runtime: RuntimeDebugSnapshot | null;
  terminalRuntime: RuntimeDebugSnapshot | null;
  deathTrace: DeathTraceReport | null;
};

type SideTrainingState = {
  side: PlayerSide;
  ownerLabel: string;
  packDisplayName: string;
  strategyKey: AiStrategyKey;
  strategyCategoryLabel: string;
  trainingToggleLabel: string;
  strategyBaselineLabel: string;
  selectedForTraining: boolean;
  trainingSessionActive: boolean;
  trainingStatusLabel: string;
  baselineOptions: SideTrainingBaselineOption[];
  selectedBaselineId: string;
  sourceLabel: string;
  trainingMethodOptions: SideTrainingMethodOption[];
  selectedTrainingMethod: SideTrainingMethod;
  trainingMethodLabel: string;
  trainingMethodDescription: string;
  trainingConfigLocked: boolean;
  trainingRunActive: boolean;
  trainingRunStatusLabel: string;
  captureStatus: string;
  windowLabel: string;
  candidateFragments: string;
  failureSummary: string;
  archiveTarget: string;
  primaryAction: string;
};

type SideTrainingActions = {
  traceRecording: boolean;
  traceSampleCount: number;
  onSideTrainingToggle: (side: PlayerSide) => void;
  onSideTrainingSelectBaseline: (side: PlayerSide) => void;
  onSideTrainingBaselineChange: (side: PlayerSide, baselineId: string) => void;
  onSideTrainingMethodChange: (side: PlayerSide, method: SideTrainingMethod) => void;
  onSideTrainingModifyStrategy: (side: PlayerSide) => void;
  onSideTrainingArchiveStrategy: (side: PlayerSide) => void;
  onSideTrainingValidateStrategy: (side: PlayerSide) => void;
  onSideTrainingRunToggle: (side: PlayerSide) => void;
  onSideTraceStart: (side: PlayerSide) => void;
  onSideTraceStop: (side: PlayerSide) => void;
  onSideTraceExport: (side: PlayerSide) => void;
  onSideTraceClear: (side: PlayerSide) => void;
};

type StrategyResultMetric = {
  value: number | null;
  status: "unverified" | "measured" | "validated";
};

type StrategyResultRecord = {
  status: string;
  metrics: {
    kills: StrategyResultMetric;
    fixedTargetsDestroyed: StrategyResultMetric;
    rewardsCollected: StrategyResultMetric;
    clearTimeFrames: StrategyResultMetric;
  };
  evidence?: string;
};

type StrategyPackContributor = {
  displayName: string;
  role?: string;
};

type StrategyPackRevision = {
  version: string;
  modifiedBy: StrategyPackContributor;
  modifiedAt: string;
  summary: string;
  validationStatus: string;
};

type GlobalTrainingState = {
  strategyPackLabel: string;
  trainingSessionActive: boolean;
  trainingRunActive: boolean;
  trainingSessionLabel: string;
  packageSideScope: StrategyPackageSideScope;
  strategyExportName: string;
  validationReplayComplete: boolean;
  savePathLabel: string;
  versionStatusLabel: string;
  resourcePacksBySide: Record<PlayerSide, StrategyResourcePackId>;
  p2ResourceSynced: boolean;
};

type RomLibraryStatusState = {
  code:
    | "scanning-default"
    | "default-count"
    | "default-empty"
    | "default-error"
    | "browser-empty"
    | "browser-count"
    | "browser-error";
  count?: number;
  detail?: string;
};

type TasPlaybackStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "finished" | "desynced" | "error";

type TasPlaybackMessageKey =
  | "waiting"
  | "no-match"
  | "loading-fm2"
  | "loaded"
  | "load-error"
  | "selected"
  | "finished"
  | "playing"
  | "guard-checking"
  | "desynced"
  | "stopped"
  | "paused"
  | "load-rom-first"
  | "fast-forwarded"
  | "matched-available"
  | "no-match-current";

type TasPlaybackUiState = {
  status: TasPlaybackStatus;
  movieId: string;
  frameIndex: number;
  playbackStartFrame: number;
  totalFrames: number;
  currentInput: string;
  phase: "init" | "active" | "desynced";
  messageKey: TasPlaybackMessageKey;
  messageDetail?: string;
  checksumStatus: string;
  message: string;
};

type Pilot = {
  side: PlayerSide;
  name: string;
  status: string;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  strategyResourcePackId: StrategyResourcePackId;
  strategy: string;
  temperament: string;
  buttons: ButtonState;
  accent: "blue" | "red";
  keyboardHint: string;
  gamepadHint: string;
  lastInput: string;
  authority: string;
  metricGroups: MetricGroup[];
  dialogue: string[];
  dataStream: string[];
  training: SideTrainingState;
};

type MetricGroup = {
  title: string;
  items: StatItem[];
};

type StatItem = {
  label: string;
  value: string;
  status?: "real" | "pending" | "mode" | "derived";
};

type CombatMetricKey = "infantry" | "turret" | "flying" | "boss" | "unattributed";
type WeaponMetricKey = "m" | "s" | "f" | "l" | "r" | "b";

type ResourcePackStrategyOption = { key: AiStrategyKey; available: boolean };

type PlayerMetrics = {
  kills: number;
  deaths: number;
  score: number;
  scoreGained: number;
  shots: number;
  jumps: number;
  moves: number;
  bulletSpawns: number;
  combat: Record<CombatMetricKey, number>;
  weapons: Record<WeaponMetricKey, number>;
};

type PlayerMetricDelta = Partial<Omit<PlayerMetrics, "combat" | "weapons">> & {
  combat?: Partial<Record<CombatMetricKey, number>>;
  weapons?: Partial<Record<WeaponMetricKey, number>>;
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
  scoreCollision: number;
  scoreCode: number;
  collisionCode: number;
  attr: number;
  kind: string;
  threat: boolean;
  fixed: boolean;
  priority: number;
};

type ThreatPoolSnapshot = {
  active: EnemySlotSnapshot[];
  turrets: EnemySlotSnapshot[];
  actionableTurrets: EnemySlotSnapshot[];
  dynamicThreats: EnemySlotSnapshot[];
  projectiles: EnemySlotSnapshot[];
  rewards: EnemySlotSnapshot[];
  primaryTurret: EnemySlotSnapshot | null;
  primaryThreat: EnemySlotSnapshot | null;
  combatReadiness: boolean;
};

type PlayerBulletSnapshot = {
  slot: number;
  bulletSlotCode: number;
  owner: number;
  routine: number;
  x: number;
  y: number;
  spriteCode: number;
};

type GameRamSnapshot = {
  frame: number;
  level: number;
  playerMode: number;
  playerModeAlt: number;
  p1Lives: number;
  p2Lives: number;
  p1Score: number;
  p2Score: number;
  highScore: number;
  gameOver: number;
  p2GameOver: number;
  bossDefeated: number;
  screen: number;
  scroll: number;
  cameraX: number;
  p1State: number;
  p2State: number;
  jumpState: number;
  p2JumpState: number;
  weapon: number;
  p2Weapon: number;
  p1BarrierTimer: number;
  p2BarrierTimer: number;
  deathFlag: number;
  p2DeathFlag: number;
  playerX: number;
  playerY: number;
  worldX: number;
  p2PlayerX: number;
  p2PlayerY: number;
  p2WorldX: number;
  twoPlayerActive: boolean;
  bullets: PlayerBulletSnapshot[];
  enemies: EnemySlotSnapshot[];
};

type NesWithCpuRam = NES & {
  cpu?: {
    mem?: ArrayLike<number>;
  };
};

const playerSides: PlayerSide[] = ["1P", "2P"];
const buttonNames: ButtonName[] = ["up", "down", "left", "right", "select", "start", "b", "a"];
const inputSources: InputSource[] = ["keyboard", "gamepad", "panel", "ai", "tas", "system"];
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

const startupPresetOptions: Array<{
  key: StartupLaunchPreset;
  label: Record<UiLanguage, string>;
  detail: Record<UiLanguage, string>;
}> = [
  {
    key: "wait",
    label: { "zh-CN": "等待玩家", "en-US": "Wait" },
    detail: { "zh-CN": "只开机，不代按 Start", "en-US": "Power only; no menu input" }
  },
  {
    key: "auto-1p",
    label: { "zh-CN": "自动单人", "en-US": "Auto 1P" },
    detail: { "zh-CN": "标题菜单自动 Start", "en-US": "Auto Start at title" }
  },
  {
    key: "auto-2p",
    label: { "zh-CN": "自动双人", "en-US": "Auto 2P" },
    detail: { "zh-CN": "自动 Select 后 Start", "en-US": "Auto Select then Start" }
  }
];

const modeLastInputLabels: Record<ControlMode, string> = {
  human: "等待人类输入",
  ai: "AI 占位，等待 FSM",
  hybrid: "混合模式，人类优先"
};

const aiStrategyOptions: Array<{ key: AiStrategyKey; label: string; description: string }> = [
  { key: "off", label: "关闭 AI", description: "只显示人类输入" },
  { key: "placeholder", label: "安全占位 Bot", description: "空输入 / 待机" },
  { key: "rules-v0", label: "规则基线 V0", description: "等待 RAM/FSM" },
  { key: "survival-v0", label: "稳健生存", description: "优先避险和低风险推进" },
  { key: "speedrun-v0", label: "快速推进候选", description: "TAS/FCEUX 基准待训练，未验证通关" },
  { key: "combat-v0", label: "清敌优先", description: "优先射击屏幕威胁" },
  { key: "loot-v0", label: "奖励优先", description: "优先武器箱和飞行胶囊" },
  { key: "guard-v0", label: "护卫队友", description: "保护 1P 周围威胁" },
  { key: "personal-v0", label: "个人策略", description: "本地保存的玩家路线脚本" },
  { key: "follow-test", label: "跟随/待机测试", description: "2P 陪玩保守跟随" },
  { key: "input-mirror", label: "调试输入镜像", description: "只作输入诊断" }
];

const standardStrategyCategoryKeys = ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"] as const satisfies readonly AiStrategyKey[];
const currentPackStrategyKeys = ["survival-v0", "speedrun-v0"] as const satisfies readonly AiStrategyKey[];

const tasBaselineStrategyMap: Partial<Record<TasStrategyBaseline, AiStrategyKey>> = {
  "survival-v0": "survival-v0",
  "speedrun-v0": "speedrun-v0",
  "combat-v0": "combat-v0",
  "loot-v0": "loot-v0",
  "guard-v0": "guard-v0"
};

const DEFAULT_SIDE_BASELINE_ID = "pack-current";
const DEFAULT_SIDE_TRAINING_METHOD: SideTrainingMethod = "auto-patch";

const SIDE_BASELINE_CATALOG = [
  {
    id: "human-demo-new",
    side: "any",
    label: "新建人类演示",
    sourceLabel: "人类演示",
    detailLabel: "从人类操作采集一段新的可学习样本",
    sourceKind: "human-demo",
    strategyKeys: ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0", "personal-v0"]
  },
  {
    id: "ai-run-new",
    side: "any",
    label: "新建AI跑局基准",
    sourceLabel: "AI跑局",
    detailLabel: "用当前基础AI策略自动跑局并归档为可学习基准",
    sourceKind: "ai-run",
    strategyKeys: ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0", "personal-v0"]
  }
] as const satisfies readonly SideTrainingBaselineOption[];

const TAS_SIDE_BASELINE_ARTIFACTS = [
  contraJSideBaselinesArtifact as unknown as TasSideBaselineArtifact
] as const satisfies readonly TasSideBaselineArtifact[];

const SIDE_TRAINING_METHOD_OPTIONS = [
  {
    key: "auto-patch",
    label: "自动补丁",
    description: "自动跑局，记录死亡、卡住和漏目标，再生成候选策略片段"
  },
  {
    key: "model-analysis",
    label: "大模型分析",
    description: "打包轨迹、RAM快照和失败点，等待大模型给出战术修正建议"
  },
  {
    key: "human-assist",
    label: "人类辅助",
    description: "混合模式中由人类接管关键点，系统提取AI与人类差异"
  },
  {
    key: "manual-edit",
    label: "手动编辑",
    description: "直接打开策略设计器修改片段，再通过回放验证"
  }
] as const satisfies readonly SideTrainingMethodOption[];

const keyboardHints: Record<PlayerSide, string> = {
  "1P": "方向键 / Z=B / X=A / Enter=开始 / Shift=选择",
  "2P": "WASD / J=B / K=A / I=开始 / U=选择"
};

const AUDIO_SAMPLE_RATE = 44100;
const AUDIO_BUFFER_SIZE = 1024;
const AUDIO_PRIME_BUFFERED_SAMPLES = Math.round(AUDIO_SAMPLE_RATE * 0.12);
const AUDIO_TARGET_BUFFERED_SAMPLES = Math.round(AUDIO_SAMPLE_RATE * 0.16);
const AUDIO_MAX_BUFFERED_SAMPLES = Math.round(AUDIO_SAMPLE_RATE * 0.32);
const AUDIO_BUFFER_CAPACITY = Math.round(AUDIO_SAMPLE_RATE * 0.55);
const GAMEPAD_AXIS_THRESHOLD = 0.5;
const ENEMY_SLOT_COUNT = 16;
const PLAYER_BULLET_SLOT_COUNT = 16;
const PLAYER_ALIVE_STATE = 1;
const PLAYER_DEAD_STATE = 2;
const STAGE_ONE_LEVEL_INDEX = 0;
const STAGE_ONE_BOSS_WALL_WORLD_X = 2960;
const CONTRA_GAME_ID = "contra";
const CONTRA_LEGACY_GAME_ID = "contra-us";
const CONTRA_US_ROM_PROFILE_ID = "contra-us-good";
const CONTRA_US_COMPATIBILITY_GROUP = "contra-us";
const PERSONAL_STRATEGY_STORAGE_KEY = "fc-ai.personal.stage1.strategy.v1";
const CONTRA_TAS_SIDE_BASELINE_PATH = "data/training/contra/tas_bases/contra-j-good/side-baselines.json";
const FC_HARDWARE_SPEC = "FC/NES · Ricoh 2A03 1.79 MHz · PPU 256x240 · RAM 2 KB · Controllers x2";

const strategyResultKeys = ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"] as const satisfies readonly AiStrategyKey[];

function unverifiedStrategyResult(evidence: string): StrategyResultRecord {
  return {
    status: "candidate",
    metrics: {
      kills: { value: null, status: "unverified" },
      fixedTargetsDestroyed: { value: null, status: "unverified" },
      rewardsCollected: { value: null, status: "unverified" },
      clearTimeFrames: { value: null, status: "unverified" }
    },
    evidence
  };
}

const CONTRA_STAGE1_STRATEGY_RESULTS: Record<(typeof strategyResultKeys)[number], StrategyResultRecord> = {
  "survival-v0": unverifiedStrategyResult("Awaiting Stage 1 robust survival runtime validation."),
  "speedrun-v0": unverifiedStrategyResult("Reusable TAS/FCEUX speedrun candidate is indexed; awaiting Stage 1 runtime validation."),
  "combat-v0": unverifiedStrategyResult("Awaiting Stage 1 combat-clear runtime validation."),
  "loot-v0": unverifiedStrategyResult("Awaiting Stage 1 reward-route runtime validation."),
  "guard-v0": unverifiedStrategyResult("Awaiting human-AI or dual-AI guard validation.")
};

const ACTIVE_STRATEGY_PACK = {
  packId: "contra-stage1-strategy-v0",
  version: "0.1.0",
  status: "candidate",
  author: "理想",
  creator: { displayName: "理想", role: "owner" },
  latestModifier: { displayName: "00号游戏管家", role: "system" },
  revisionHistory: [
    {
      version: "0.1.0",
      modifiedBy: { displayName: "理想", role: "owner" },
      modifiedAt: "2026-06-07",
      summary: "Initial Contra Stage 1 strategy pack candidate.",
      validationStatus: "candidate"
    },
    {
      version: "0.1.0",
      modifiedBy: { displayName: "00号游戏管家", role: "system" },
      modifiedAt: "2026-06-07",
      summary: "Added provenance metadata, strategy result placeholders, and validation-gated save workflow support.",
      validationStatus: "candidate"
    }
  ],
  protocolVersion: "1.0.0",
  archivePath: "strategy-packs/contra",
  sideScope: "shared",
  romProfileIds: ["contra-us-good", "contra-j-good"],
  strategySlots: standardStrategyCategoryKeys,
  strategyKeys: currentPackStrategyKeys,
  displayName: {
    "zh-CN": "魂斗罗第一关策略包 V0",
    "en-US": "Contra Stage 1 Strategy Pack V0"
  },
  strategyResults: CONTRA_STAGE1_STRATEGY_RESULTS
} as const;

const STRATEGY_RESOURCE_PACKS = [
  ACTIVE_STRATEGY_PACK,
  {
    packId: "personal-contra-draft",
    version: "0.0.1",
    status: "draft",
    author: "理想",
    creator: { displayName: "理想", role: "owner" },
    latestModifier: { displayName: "理想", role: "owner" },
    revisionHistory: [
      {
        version: "0.0.1",
        modifiedBy: { displayName: "理想", role: "owner" },
        modifiedAt: "2026-06-07",
        summary: "Local personal training draft.",
        validationStatus: "draft"
      }
    ],
    protocolVersion: "1.0.0",
    archivePath: "strategy-packs/contra/community-drafts/local",
    sideScope: "side-owned",
    romProfileIds: ["contra-us-good", "contra-j-good"],
    strategySlots: ["personal-v0"],
    strategyKeys: ["personal-v0"],
    displayName: {
      "zh-CN": "个人魂斗罗训练草稿",
      "en-US": "Personal Contra Training Draft"
    },
    strategyResults: CONTRA_STAGE1_STRATEGY_RESULTS
  }
] as const satisfies ReadonlyArray<{
  packId: StrategyResourcePackId;
  version: string;
  status: string;
  author: string;
  creator: StrategyPackContributor;
  latestModifier: StrategyPackContributor;
  revisionHistory: readonly StrategyPackRevision[];
  protocolVersion: string;
  archivePath: string;
  sideScope: string;
  romProfileIds: readonly string[];
  strategySlots: readonly AiStrategyKey[];
  strategyKeys: readonly AiStrategyKey[];
  displayName: Record<UiLanguage, string>;
  strategyResults: Partial<Record<AiStrategyKey, StrategyResultRecord>>;
}>;

function packageScopeHasSide(scope: StrategyPackageSideScope, side: PlayerSide) {
  if (scope === "1p-2p") return true;
  if (side === "1P") return scope === "1p-only";
  return scope === "2p-only";
}

function nextPackageSideScope(scope: StrategyPackageSideScope, side: PlayerSide): StrategyPackageSideScope {
  const next1P = side === "1P" ? !packageScopeHasSide(scope, "1P") : packageScopeHasSide(scope, "1P");
  const next2P = side === "2P" ? !packageScopeHasSide(scope, "2P") : packageScopeHasSide(scope, "2P");
  if (next1P && next2P) return "1p-2p";
  if (next1P) return "1p-only";
  if (next2P) return "2p-only";
  return "none";
}

const gameProfileUiStatus = {
  "contra": {
    chineseName: "魂斗罗",
    strategyStatus: "第一关策略 V0 / 调试中"
  },
  "super-c": {
    chineseName: "超级魂斗罗",
    strategyStatus: "计划中"
  },
  "contra-force": {
    chineseName: "魂斗罗外传",
    strategyStatus: "计划中"
  },
  "jackal": {
    chineseName: "赤色要塞",
    strategyStatus: "计划中"
  },
  "battle-city": {
    chineseName: "坦克大战",
    strategyStatus: "计划中"
  },
  "double-dragon-ii": {
    chineseName: "双截龙 II",
    strategyStatus: "计划中"
  },
  "ninja-gaiden": {
    chineseName: "忍者龙剑传",
    strategyStatus: "计划中"
  },
  "mega-man-2": {
    chineseName: "洛克人 2",
    strategyStatus: "计划中"
  }
} as const;

type GameProfileKey = keyof typeof gameProfileUiStatus;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digestHex(bytes: Uint8Array, algorithm: "SHA-1" | "SHA-256") {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await window.crypto.subtle.digest(algorithm, buffer);
  return bytesToHex(new Uint8Array(digest));
}

function romEntryTitle(entry: RomLibraryEntry | null) {
  if (!entry) return "未选择卡带";
  return entry.metadata.displayTitle || entry.fileName;
}

function inferGameProfileKey(metadata: RomMetadata | null): GameProfileKey | "unknown" {
  if (!metadata) return "unknown";
  if (metadata.gameId in gameProfileUiStatus) return metadata.gameId as GameProfileKey;
  const source = `${metadata.filePath} ${metadata.fileName} ${metadata.displayTitle}`.toLowerCase();
  if (source.includes("super-c") || source.includes("superc") || source.includes("scontra")) return "super-c";
  if (source.includes("contra-force") || source.includes("contraforce")) return "contra-force";
  if (source.includes("jackal") || source.includes("赤色要塞")) return "jackal";
  if (source.includes("battle-city") || source.includes("battle city") || source.includes("坦克大战")) return "battle-city";
  if (source.includes("double-dragon-ii") || source.includes("双截龙2") || source.includes("双截龙 ii")) return "double-dragon-ii";
  if (source.includes("ninja-gaiden") || source.includes("ninjaga") || source.includes("忍者龙剑传")) return "ninja-gaiden";
  if (source.includes("mega-man-2") || source.includes("megaman2") || source.includes("洛克人2")) return "mega-man-2";
  if (source.includes("contra") || source.includes("魂斗罗")) return "contra";
  return "unknown";
}

function cartridgeUiStatus(metadata: RomMetadata | null) {
  const gameKey = inferGameProfileKey(metadata);
  if (gameKey === "unknown") {
    return {
      chineseName: "未识别游戏",
      strategyStatus: "无策略"
    };
  }
  return gameProfileUiStatus[gameKey];
}

function localizedStrategyStatusLabel(status: string, language: UiLanguage) {
  if (language !== "en-US") return status;
  if (status === "第一关策略 V0 / 调试中") return "Stage 1 strategy V0 / debugging";
  if (status === "计划中") return "Planned";
  if (status === "无策略") return "No strategy";
  return status;
}

function localizedRomSupportLabel(label: string, language: UiLanguage) {
  if (language !== "en-US") return label;
  if (label === "正式适配") return "Production adapted";
  if (label === "TAS 匹配 / 策略待迁移") return "TAS matched / strategy pending migration";
  if (label === "待验证") return "Pending verification";
  if (label === "资料参考") return "Reference only";
  if (label === "不用于正式策略") return "Not for production strategy";
  if (label === "未识别") return "Unrecognized";
  return label;
}

function pendingHashLabel(language: UiLanguage) {
  return language === "en-US" ? "Pending" : "待计算";
}

function activeStrategyPackLabel(language: UiLanguage) {
  return `${ACTIVE_STRATEGY_PACK.displayName[language]} · ${ACTIVE_STRATEGY_PACK.version} · ${ACTIVE_STRATEGY_PACK.status}`;
}

function strategyResourcePackById(packId: StrategyResourcePackId) {
  return STRATEGY_RESOURCE_PACKS.find((pack) => pack.packId === packId) ?? ACTIVE_STRATEGY_PACK;
}

function strategyResourcePackLabel(packId: StrategyResourcePackId, language: UiLanguage) {
  const pack = strategyResourcePackById(packId);
  return `${pack.displayName[language]} · ${pack.version}`;
}

function strategyOptionsForResourcePack(resourcePackId: StrategyResourcePackId): ResourcePackStrategyOption[] {
  const pack = strategyResourcePackById(resourcePackId);
  const availableKeys = new Set<AiStrategyKey>(pack.strategyKeys);
  return pack.strategySlots.map((key) => ({ key, available: availableKeys.has(key) }));
}

function coerceStrategyForResourcePack(strategyKey: AiStrategyKey, resourcePackId: StrategyResourcePackId) {
  const pack = strategyResourcePackById(resourcePackId);
  const availableKeys: readonly AiStrategyKey[] = pack.strategyKeys;
  if (availableKeys.includes(strategyKey)) return strategyKey;
  return availableKeys[0] ?? pack.strategySlots[0] ?? "survival-v0";
}

function baselineAppliesToSide(option: SideTrainingBaselineOption, side: PlayerSide) {
  return option.side === "any" || option.side === side;
}

function baselineSupportsStrategy(option: SideTrainingBaselineOption, strategyKey: AiStrategyKey) {
  return option.strategyKeys.includes(strategyKey);
}

function buildPackBaselineOption(
  side: PlayerSide,
  language: UiLanguage,
  strategyKey: AiStrategyKey,
  resourcePackId: StrategyResourcePackId
): SideTrainingBaselineOption {
  const packDisplayName = strategyResourcePackById(resourcePackId).displayName[language];
  const strategyLabel = localizedAiStrategyLabel(strategyKey, language);
  return {
    id: DEFAULT_SIDE_BASELINE_ID,
    side,
    label: `${packDisplayName} / ${strategyLabel}`,
    sourceLabel: language === "en-US" ? "Strategy pack" : "资源包",
    detailLabel: language === "en-US" ? "Use the selected package strategy as the starting baseline" : "使用当前资源包策略作为起点",
    sourceKind: "strategy-pack",
    strategyKeys: [strategyKey]
  };
}

function aiStrategyKeysForTasStrategyTypes(strategyTypes: readonly string[]): AiStrategyKey[] {
  const keys = new Set<AiStrategyKey>();
  for (const type of strategyTypes) {
    if (type === "survival") keys.add("survival-v0");
    if (type === "speedrun") keys.add("speedrun-v0");
    if (type === "combat" || type === "fixed-threat-hp-lock") keys.add("combat-v0");
    if (type === "loot") keys.add("loot-v0");
    if (type === "guard" || type === "coop-spacing") keys.add("guard-v0");
    if (type === "bridge-jump-window") {
      keys.add("survival-v0");
      keys.add("speedrun-v0");
    }
  }
  return keys.size > 0 ? [...keys] : ["survival-v0"];
}

function tasSideBaselineArtifactOptions(language: UiLanguage): SideTrainingBaselineOption[] {
  return TAS_SIDE_BASELINE_ARTIFACTS.flatMap((artifact) =>
    artifact.baselines.map((baseline) => {
      const frameWindow = [
        Number(baseline.frameWindow[0] ?? 0),
        Number(baseline.frameWindow[1] ?? baseline.frameWindow[0] ?? 0)
      ] as const;
      return {
        id: tasSideBaselineOptionId(artifact.romProfileId, baseline),
        side: baseline.side,
        label: language === "en-US"
          ? `TAS ${baseline.side} ${baseline.label}`
          : `TAS ${baseline.side} ${baseline.label}`,
        sourceLabel: language === "en-US" ? "TAS side baseline" : "TAS拆分基准",
        detailLabel: language === "en-US"
          ? `${baseline.movieId} / ${baseline.windowId} / ${frameWindow[0]}-${frameWindow[1]}f`
          : `${baseline.movieId} / ${baseline.windowId} / ${frameWindow[0]}-${frameWindow[1]}帧`,
        sourceKind: "tas-side-baseline",
        strategyKeys: aiStrategyKeysForTasStrategyTypes(baseline.strategyTypes),
        romProfileId: artifact.romProfileId,
        frameWindow
      };
    })
  );
}

function tasSideBaselineOptionId(romProfileId: string, baseline: Pick<TasSideBaselineArtifactBaseline, "movieId" | "side" | "windowId">) {
  return `tas-${romProfileId}-${baseline.movieId}-${baseline.windowId}-${baseline.side.toLowerCase()}`;
}

function findTasSideBaselineForSelectedOption(side: PlayerSide, selectedBaselineId: string) {
  for (const artifact of TAS_SIDE_BASELINE_ARTIFACTS) {
    for (const baseline of artifact.baselines) {
      if (baseline.side !== side) continue;
      if (tasSideBaselineOptionId(artifact.romProfileId, baseline) === selectedBaselineId) {
        return {
          artifact,
          baseline
        };
      }
    }
  }
  return null;
}

function tasBaselineOptionsForSide(
  side: PlayerSide,
  strategyKey: AiStrategyKey,
  tasEntry: TasRegistryEntry | null,
  language: UiLanguage
): SideTrainingBaselineOption[] {
  if (!tasEntry) return [];
  return tasSideBaselineArtifactOptions(language).filter((option) =>
    baselineAppliesToSide(option, side)
    && baselineSupportsStrategy(option, strategyKey)
    && option.romProfileId === tasEntry.romProfileId
  );
}

function sideBaselineOptionsForSide(
  side: PlayerSide,
  language: UiLanguage,
  strategyKey: AiStrategyKey,
  resourcePackId: StrategyResourcePackId,
  tasEntry: TasRegistryEntry | null
): SideTrainingBaselineOption[] {
  const packBaseline = buildPackBaselineOption(side, language, strategyKey, resourcePackId);
  const localBaselines = SIDE_BASELINE_CATALOG.filter((option) =>
    baselineAppliesToSide(option, side) && baselineSupportsStrategy(option, strategyKey)
  );
  return [
    packBaseline,
    ...localBaselines,
    ...tasBaselineOptionsForSide(side, strategyKey, tasEntry, language)
  ];
}

function findTasSideBaselineOption(
  side: PlayerSide,
  selectedBaselineId: string,
  options?: readonly SideTrainingBaselineOption[]
) {
  const searchOptions = options ?? [...SIDE_BASELINE_CATALOG, ...tasSideBaselineArtifactOptions(DEFAULT_LANGUAGE)];
  return searchOptions.find((option) => option.id === selectedBaselineId && baselineAppliesToSide(option, side)) ?? null;
}

function findSideTrainingMethodOption(method: SideTrainingMethod) {
  return SIDE_TRAINING_METHOD_OPTIONS.find((option) => option.key === method) ?? SIDE_TRAINING_METHOD_OPTIONS[0];
}

function isNewRunBaseline(baselineId: string) {
  return baselineId === "human-demo-new" || baselineId === "ai-run-new";
}

function trainingControlModeForSelection(baselineId: string, method: SideTrainingMethod): ControlMode {
  if (baselineId === "human-demo-new") return "human";
  if (baselineId === "ai-run-new") return "ai";
  if (method === "human-assist") return "hybrid";
  return "ai";
}

function selectorClassName(baseClassName: string, inactive: boolean) {
  return inactive ? `${baseClassName} control-inactive` : baseClassName;
}

function sideTrainingPanelClassName(training: Pick<SideTrainingState, "selectedForTraining" | "trainingSessionActive">) {
  return training.trainingSessionActive ? "side-training-panel active-training-side" : training.selectedForTraining ? "side-training-panel queued-training-side" : "side-training-panel";
}

function sideTrainingTitleClassName(training: Pick<SideTrainingState, "selectedForTraining" | "trainingSessionActive">) {
  return training.trainingSessionActive ? "side-training-title-button active" : training.selectedForTraining ? "side-training-title-button queued" : "side-training-title-button";
}

function strategyResultMetricLabel(metric: StrategyResultMetric, language: UiLanguage, unit: "count" | "frames" = "count") {
  if (metric.value === null || metric.status === "unverified") return t(language, "training.resultUnverified");
  if (unit === "frames") return `${metric.value}f`;
  return String(metric.value);
}

function strategyResultStatusLabel(record: StrategyResultRecord, language: UiLanguage) {
  if (record.status === "candidate") return language === "en-US" ? "candidate" : "候选";
  if (record.status === "validated") return language === "en-US" ? "validated" : "已验证";
  return record.status;
}

function strategyPackageSideScopeLabel(scope: StrategyPackageSideScope, language: UiLanguage) {
  if (scope === "none") return language === "en-US" ? "No side" : "未选择";
  if (scope === "1p-only") return language === "en-US" ? "1P only" : "仅 1P";
  if (scope === "2p-only") return language === "en-US" ? "2P only" : "仅 2P";
  return "1P+2P";
}

function createServerRomEntry(info: ServerRomFileInfo): RomLibraryEntry {
  const headerBytes = new Uint8Array(info.headerBytes ?? []);
  const metadata = parseNesRomMetadata(headerBytes, {
    fileName: info.fileName,
    filePath: info.filePath,
    md5: info.md5,
    headerlessMd5: info.headerlessMd5,
    sha1: info.sha1,
    sha256: info.sha256,
    sizeBytes: info.sizeBytes
  });
  return {
    id: `server:${info.relativePath}`,
    source: "server",
    fileName: info.fileName,
    filePath: info.filePath,
    relativePath: info.relativePath,
    sizeBytes: info.sizeBytes,
    metadata
  };
}

async function createBrowserRomEntry(file: File): Promise<RomLibraryEntry> {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const metadata = parseNesRomMetadata(headerBytes, {
    fileName: file.name,
    filePath: relativePath,
    sizeBytes: file.size
  });
  return {
    id: `browser:${relativePath}:${file.size}:${file.lastModified}`,
    source: "browser",
    fileName: file.name,
    filePath: relativePath,
    relativePath,
    sizeBytes: file.size,
    metadata,
    file
  };
}

const stageOneStrategyFiles: Partial<Record<AiStrategyKey, string>> = {
  "survival-v0": "/strategies/contra/stage1/stage1-survival.json",
  "speedrun-v0": "/strategies/contra/stage1/stage1-speedrun.json",
  "combat-v0": "/strategies/contra/stage1/stage1-combat.json",
  "loot-v0": "/strategies/contra/stage1/stage1-loot.json",
  "guard-v0": "/strategies/contra/stage1/stage1-guard.json"
};

const stageOneScriptActions: StageOneScriptAction[] = [
  {
    id: "p00-first-weapon-capsule",
    label: "P00 first weapon capsule",
    worldStart: 300,
    worldEnd: 392,
    mode: "first-weapon",
    priority: 92
  },
  {
    id: "p01-first-bridge-weapon",
    label: "P01 第一桥段武器点",
    worldStart: 392,
    worldEnd: 696,
    mode: "reward-shot",
    priority: 90
  },
  {
    id: "p02-first-bridge-cross",
    label: "P02 第一桥段连续跳",
    worldStart: 520,
    worldEnd: 1040,
    mode: "bridge-jump",
    priority: 80
  },
  {
    id: "p03-mid-fixed-threat",
    label: "P03 中段固定火力",
    worldStart: 1040,
    worldEnd: 2100,
    mode: "fixed-hp-fire",
    priority: 95
  }
];

const stageOneBossApproachPatches: StageOneButtonPatch[] = [
  {
    id: "boss-lower-edge-jump",
    label: "Boss 前下层起跳",
    worldStart: 2366,
    worldEnd: 2406,
    yMin: 196,
    yMax: 224,
    jumpState: "grounded",
    priority: 120,
    hold: { a: true, b: true, up: true, down: false, left: false, right: true }
  },
  {
    id: "boss-upper-platform-sprint",
    label: "Boss 前上层平台冲刺",
    worldStart: 2418,
    worldEnd: 2449,
    yMin: 104,
    yMax: 188,
    priority: 112,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-upper-edge-jump",
    label: "Boss 前上层边缘起跳",
    worldStart: 2450,
    worldEnd: 2462,
    yMin: 160,
    yMax: 178,
    jumpState: "grounded",
    priority: 122,
    hold: { a: true, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-upper-air-carry",
    label: "Boss 前第一次空中右移",
    worldStart: 2463,
    worldEnd: 2514,
    yMin: 96,
    yMax: 204,
    jumpState: "airborne",
    priority: 108,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-upper-platform-capture",
    label: "Boss 前上层平台捕获",
    worldStart: 2472,
    worldEnd: 2478,
    yMin: 104,
    yMax: 122,
    jumpState: "airborne",
    priority: 130,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-upper-platform-left-tap",
    label: "Boss 前上层平台短左修正",
    worldStart: 2479,
    worldEnd: 2486,
    yMin: 104,
    yMax: 122,
    jumpState: "airborne",
    priority: 132,
    hold: { a: false, b: true, up: false, down: false, left: true, right: false }
  },
  {
    id: "boss-high-platform-hold",
    label: "Boss 前高平台锁定",
    worldStart: 2532,
    worldEnd: 2549,
    yMin: 140,
    yMax: 232,
    jumpState: "grounded",
    priority: 134,
    hold: { a: false, b: true, up: true, down: false, left: false, right: true }
  },
  {
    id: "boss-high-platform-jump",
    label: "Boss 前高平台起跳",
    worldStart: 2550,
    worldEnd: 2562,
    yMin: 140,
    yMax: 158,
    jumpState: "grounded",
    priority: 136,
    hold: { a: true, b: true, up: true, down: false, left: false, right: true }
  },
  {
    id: "boss-high-air-capture",
    label: "Boss 前高平台空中落点捕获",
    worldStart: 2584,
    worldEnd: 2590,
    yMin: 112,
    yMax: 220,
    jumpState: "airborne",
    priority: 138,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-rotating-gun-standoff",
    label: "Boss 前旋转炮蹲射",
    worldStart: 2708,
    worldEnd: 2768,
    yMin: 96,
    yMax: 140,
    priority: 150,
    hold: { a: false, b: true, up: false, down: true, left: false, right: false }
  },
  {
    id: "boss-mid-platform-right-jump",
    label: "Boss 前中平台右跳",
    worldStart: 2814,
    worldEnd: 2828,
    yMin: 188,
    yMax: 206,
    jumpState: "grounded",
    priority: 154,
    hold: { a: true, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-wall-final-right-jump",
    label: "Boss 外墙前最后右跳",
    worldStart: 2918,
    worldEnd: 2936,
    yMin: 160,
    yMax: 212,
    jumpState: "grounded",
    priority: 180,
    hold: { a: true, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-wall-downright-fire",
    label: "Boss 外墙下右压枪",
    worldStart: 2960,
    worldEnd: 3070,
    yMin: 120,
    yMax: 172,
    priority: 210,
    hold: { a: false, b: true, up: false, down: true, left: false, right: true }
  },
  {
    id: "boss-platform-release",
    label: "Boss 前小平台松跳蓄势",
    worldStart: 2515,
    worldEnd: 2516,
    yMin: 188,
    yMax: 206,
    jumpState: "grounded",
    priority: 124,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-platform-second-jump",
    label: "Boss 前小平台二段起跳",
    worldStart: 2518,
    worldEnd: 2540,
    yMin: 188,
    yMax: 208,
    priority: 126,
    hold: { a: true, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-second-air-lift",
    label: "Boss 前第二次空中抬升",
    worldStart: 2541,
    worldEnd: 2560,
    yMin: 104,
    yMax: 224,
    jumpState: "airborne",
    priority: 118,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  },
  {
    id: "boss-second-air-carry",
    label: "Boss 前第二次空中右移",
    worldStart: 2561,
    worldEnd: 2638,
    yMin: 88,
    yMax: 232,
    jumpState: "airborne",
    priority: 116,
    hold: { a: false, b: true, up: false, down: false, left: false, right: true }
  }
];

const stageOneHorizonEvents: StageOneHorizonEvent[] = [
  { id: "s00-soldier-10", label: "开局士兵", screen: 0, x: 0x10, y: 0x60, attr: 0x00, category: "infantry", priority: 12, aim: "level", note: "持续右移射击" },
  { id: "s00-soldier-40", label: "开局士兵", screen: 0, x: 0x40, y: 0x60, attr: 0x00, category: "infantry", priority: 12, aim: "level", note: "持续射击" },
  { id: "s00-sniper-50", label: "下层狙击兵", screen: 0, x: 0x50, y: 0xc0, attr: 0x00, category: "sniper", priority: 42, aim: "down", note: "靠近前压枪" },
  { id: "s00-pillbox-60", label: "第一武器箱", screen: 0, x: 0x60, y: 0xa0, attr: 0x01, category: "reward", priority: 72, aim: "down", note: "低位奖励目标" },
  { id: "s00-soldier-80", label: "开局士兵", screen: 0, x: 0x80, y: 0x60, attr: 0x00, category: "infantry", priority: 12, aim: "level", note: "持续射击" },
  { id: "s00-capsule-f0", label: "Rapid 飞行胶囊", screen: 0, x: 0xf0, y: 0x40, attr: 0x00, category: "reward", priority: 64, aim: "up", note: "高位奖励目标" },
  { id: "s01-sniper-90", label: "桥前下层狙击兵", screen: 1, x: 0x90, y: 0xc0, attr: 0x00, category: "sniper", priority: 52, aim: "down", note: "桥前先压枪清理" },
  { id: "s02-bridge-20", label: "第一爆桥", screen: 2, x: 0x20, y: 0x80, attr: 0x00, category: "bridge", priority: 90, aim: "level", note: "进入前预载跳跃" },
  { id: "s03-bridge-40", label: "第二爆桥", screen: 3, x: 0x40, y: 0x80, attr: 0x00, category: "bridge", priority: 86, aim: "level", note: "连续跳跃窗口" },
  { id: "s04-rotating-gun-00", label: "旋转炮台", screen: 4, x: 0x00, y: 0xa0, attr: 0x00, category: "fixed", priority: 94, aim: "down", note: "固定火力优先" },
  { id: "s04-sniper-10", label: "中段狙击兵", screen: 4, x: 0x10, y: 0x60, attr: 0x00, category: "sniper", priority: 40, aim: "level", note: "中段威胁" },
  { id: "s04-sniper-50", label: "蹲姿狙击兵", screen: 4, x: 0x50, y: 0x60, attr: 0x01, category: "sniper", priority: 44, aim: "level", note: "保持火力" },
  { id: "s04-capsule-60", label: "Spread 飞行胶囊", screen: 4, x: 0x60, y: 0x40, attr: 0x03, category: "reward", priority: 88, aim: "up", note: "优先武器目标" },
  { id: "s05-sniper-20", label: "高位狙击兵", screen: 5, x: 0x20, y: 0x40, attr: 0x01, category: "sniper", priority: 46, aim: "up", note: "不要盲目冲" },
  { id: "s05-pillbox-40", label: "武器箱", screen: 5, x: 0x40, y: 0xa0, attr: 0x02, category: "reward", priority: 66, aim: "down", note: "按当前武器决定追击" },
  { id: "s05-rotating-gun-80", label: "旋转炮台", screen: 5, x: 0x80, y: 0x80, attr: 0x00, category: "fixed", priority: 92, aim: "auto", note: "射击清除" },
  { id: "s06-rotating-gun-40", label: "中段旋转炮台", screen: 6, x: 0x40, y: 0x80, attr: 0x00, category: "fixed", priority: 92, aim: "auto", note: "固定威胁" },
  { id: "s07-red-turret-20", label: "地面红炮台", screen: 7, x: 0x20, y: 0xa0, attr: 0x00, category: "fixed", priority: 96, aim: "down", note: "先打再推进" },
  { id: "s07-red-turret-a0", label: "高位红炮台", screen: 7, x: 0xa0, y: 0x40, attr: 0x01, category: "fixed", priority: 96, aim: "up", note: "提前站位射击" },
  { id: "s08-pillbox-00", label: "Spread 武器箱", screen: 8, x: 0x00, y: 0xc0, attr: 0x03, category: "reward", priority: 84, aim: "down", note: "根据当前武器决定" },
  { id: "s08-sniper-50", label: "Boss 前狙击兵", screen: 8, x: 0x50, y: 0x80, attr: 0x00, category: "sniper", priority: 48, aim: "auto", note: "接近 Boss 前清理" },
  { id: "s09-capsule-10-high", label: "Rapid 飞行胶囊", screen: 9, x: 0x10, y: 0x40, attr: 0x00, category: "reward", priority: 62, aim: "up", note: "高位胶囊" },
  { id: "s09-capsule-10-low", label: "低位飞行胶囊", screen: 9, x: 0x10, y: 0xb0, attr: 0x04, category: "reward", priority: 54, aim: "down", note: "低位胶囊" },
  { id: "s09-red-turret-e0", label: "末段红炮台", screen: 9, x: 0xe0, y: 0x80, attr: 0x01, category: "fixed", priority: 94, aim: "auto", note: "屏幕末端固定威胁" },
  { id: "s10-rotating-gun-c0", label: "Boss 前旋转炮", screen: 10, x: 0xc0, y: 0xc0, attr: 0x00, category: "fixed", priority: 92, aim: "down", note: "Boss 前炮台" },
  { id: "s11-rotating-gun-40", label: "Boss 前部旋转炮", screen: 11, x: 0x40, y: 0xc0, attr: 0x03, category: "fixed", priority: 92, aim: "down", note: "Boss screen 前部威胁" },
  { id: "s11-bomb-turret-a8", label: "Boss 左炮台", screen: 11, x: 0xa8, y: 0x80, attr: 0x01, category: "boss", priority: 100, aim: "auto", note: "Boss 墙先清炮台" },
  { id: "s11-plated-door-b1", label: "Boss 核心", screen: 11, x: 0xb1, y: 0xb0, attr: 0x00, category: "boss", priority: 98, aim: "down", note: "炮台后集火核心" },
  { id: "s11-sniper-b4", label: "Boss 狙击兵", screen: 11, x: 0xb4, y: 0x50, attr: 0x02, category: "sniper", priority: 70, aim: "up", note: "Boss screen 杂兵" },
  { id: "s11-bomb-turret-c0", label: "Boss 右炮台", screen: 11, x: 0xc0, y: 0x80, attr: 0x00, category: "boss", priority: 100, aim: "auto", note: "Boss 墙先清炮台" }
];

const fallbackStageOnePlans: LoadedStrategyPlans = {
  "survival-v0": {
    game: "contra-us",
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "survival-v0",
    version: 1,
    description: "Fallback stage 1 survival route.",
    segments: [
      { id: "start-survive", label: "start-survive", worldStart: 0, worldEnd: 520, action: "survive", fire: "threat", jumpEvery: 190 },
      { id: "bridge-survive", label: "bridge-survive", worldStart: 520, worldEnd: 930, action: "survive", fire: "threat", jumpEvery: 130 },
      { id: "mid-survive", label: "mid-survive", worldStart: 930, worldEnd: 1550, action: "survive", fire: "always", jumpEvery: 120 },
      { id: "danger-survive", label: "danger-survive", worldStart: 1550, worldEnd: 2048, action: "survive", fire: "always", jumpEvery: 72 },
      { id: "weapon-gate-survive", label: "weapon-gate-survive", worldStart: 2048, worldEnd: 2366, action: "loot", fire: "always", jumpEvery: 0 },
      { id: "boss-approach-survive", label: "boss-approach-survive", worldStart: 2366, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 0 },
      { id: "boss-wall-survive", label: "boss-wall-survive", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 0 }
    ]
  },
  "speedrun-v0": {
    game: "contra-us",
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "speedrun-v0",
    version: 1,
    description: "Fallback stage 1 speed route.",
    segments: [
      { id: "start-run", label: "start-run", worldStart: 0, worldEnd: 520, action: "advance", fire: "pulse", jumpEvery: 150 },
      { id: "first-bridge", label: "first-bridge", worldStart: 520, worldEnd: 930, action: "advance", fire: "always", jumpEvery: 95 },
      { id: "mid-jungle", label: "mid-jungle", worldStart: 930, worldEnd: 1550, action: "cautious", fire: "always", jumpEvery: 70 },
      { id: "bridge-danger", label: "bridge-danger", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 60 },
      { id: "boss-approach", label: "boss-approach", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-wall", label: "boss-wall", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  },
  "combat-v0": {
    game: "contra-us",
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "combat-v0",
    version: 1,
    description: "Fallback stage 1 combat route.",
    segments: [
      { id: "start-clear", label: "start-clear", worldStart: 0, worldEnd: 520, action: "advance", fire: "always", jumpEvery: 160 },
      { id: "bridge-clear", label: "bridge-clear", worldStart: 520, worldEnd: 930, action: "cautious", fire: "always", jumpEvery: 130 },
      { id: "mid-clear", label: "mid-clear", worldStart: 930, worldEnd: 1550, action: "cautious", fire: "always", jumpEvery: 140 },
      { id: "danger-clear", label: "danger-clear", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 95 },
      { id: "boss-approach-clear", label: "boss-approach-clear", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-wall-clear", label: "boss-wall-clear", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  },
  "loot-v0": {
    game: "contra-us",
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "loot-v0",
    version: 1,
    description: "Fallback stage 1 loot route.",
    segments: [
      { id: "start-loot", label: "start-loot", worldStart: 0, worldEnd: 520, action: "loot", fire: "threat", jumpEvery: 150 },
      { id: "bridge-loot", label: "bridge-loot", worldStart: 520, worldEnd: 930, action: "loot", fire: "threat", jumpEvery: 120 },
      { id: "mid-loot", label: "mid-loot", worldStart: 930, worldEnd: 1550, action: "loot", fire: "always", jumpEvery: 80 },
      { id: "danger-loot", label: "danger-loot", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 60 },
      { id: "boss-approach-loot", label: "boss-approach-loot", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-wall-loot", label: "boss-wall-loot", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  },
  "guard-v0": {
    game: "contra-us",
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "guard-v0",
    version: 1,
    description: "Fallback stage 1 guard route.",
    segments: [
      { id: "start-guard", label: "start-guard", worldStart: 0, worldEnd: 520, action: "guard", fire: "threat", jumpEvery: 170 },
      { id: "bridge-guard", label: "bridge-guard", worldStart: 520, worldEnd: 930, action: "guard", fire: "always", jumpEvery: 140 },
      { id: "mid-guard", label: "mid-guard", worldStart: 930, worldEnd: 1550, action: "guard", fire: "always", jumpEvery: 150 },
      { id: "danger-guard", label: "danger-guard", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-approach-guard", label: "boss-approach-guard", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "guard", fire: "always", jumpEvery: 80 },
      { id: "boss-wall-guard", label: "boss-wall-guard", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  }
};

function createDefaultPersonalPlan(): StageStrategyPlan {
  const basePlan = fallbackStageOnePlans["speedrun-v0"];
  return {
    game: "contra-us",
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "personal-v0",
    version: 1,
    description: "Personal stage 1 route script.",
    segments: basePlan?.segments.map((segment) => ({ ...segment })) ?? [
      { id: "start-run", label: "start-run", worldStart: 0, worldEnd: 520, action: "advance", fire: "pulse", jumpEvery: 150 },
      { id: "boss-wall", label: "boss-wall", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  };
}

const defaultStrategyPlans: LoadedStrategyPlans = {
  ...fallbackStageOnePlans,
  "personal-v0": createDefaultPersonalPlan()
};

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

function createIdleTasPlaybackState(): TasPlaybackUiState {
  return {
    status: "idle",
    movieId: "",
    frameIndex: 0,
    playbackStartFrame: 0,
    totalFrames: 0,
    currentInput: "-",
    phase: "init",
    messageKey: "waiting",
    checksumStatus: "未载入",
    message: "Waiting for TAS selection"
  };
}

function fm2ButtonsToButtonState(buttons: Fm2ControllerButtons): ButtonState {
  return {
    up: buttons.up,
    down: buttons.down,
    left: buttons.left,
    right: buttons.right,
    a: buttons.a,
    b: buttons.b,
    start: buttons.start,
    select: buttons.select
  };
}

function applyButtonStateToNes(nes: NES, side: PlayerSide, buttons: ButtonState) {
  for (const button of buttonNames) {
    if (buttons[button]) nes.buttonDown(playerNumbers[side], buttonMap[button]);
    else nes.buttonUp(playerNumbers[side], buttonMap[button]);
  }
}

function applyFm2FrameDirectly(nes: NES, frame: Fm2Movie["frames"][number]) {
  applyButtonStateToNes(nes, "1P", fm2ButtonsToButtonState(frame.p1));
  applyButtonStateToNes(nes, "2P", fm2ButtonsToButtonState(frame.p2));
}

function releaseAllNesButtons(nes: NES) {
  applyButtonStateToNes(nes, "1P", createButtonState());
  applyButtonStateToNes(nes, "2P", createButtonState());
}

function fastForwardTasMovie(nes: NES, movie: Fm2Movie, targetFrame: number) {
  const boundedTargetFrame = resolveFm2PlaybackStartFrame(movie, targetFrame);
  for (let frameIndex = 0; frameIndex < boundedTargetFrame; frameIndex += 1) {
    const frame = movie.frames[frameIndex];
    if (!frame) break;
    applyFm2FrameDirectly(nes, frame);
    nes.frame();
  }
  releaseAllNesButtons(nes);
  return boundedTargetFrame;
}

function tasPhaseLabel(phase: TasPlaybackUiState["phase"]) {
  if (phase === "active") return "Active Phase";
  if (phase === "desynced") return "Desync";
  return "Init Phase";
}

function matchedTasCountLabel(count: number, language: UiLanguage) {
  if (language === "en-US") return count === 1 ? "1 matched TAS" : `${count} matched TAS files`;
  return `已匹配 ${count} 个 TAS`;
}

function tasPlaybackMessageLabel(playback: TasPlaybackUiState, language: UiLanguage) {
  const detail = playback.messageDetail;
  if (language === "en-US") {
    if (playback.messageKey === "waiting") return "Waiting for TAS selection";
    if (playback.messageKey === "no-match") return "Current ROM has no matched TAS";
    if (playback.messageKey === "loading-fm2") return "Loading TAS FM2 file";
    if (playback.messageKey === "loaded") return detail ? `Loaded: ${detail}` : "TAS loaded";
    if (playback.messageKey === "load-error") return detail ? `TAS load failed: ${detail}` : "TAS load failed";
    if (playback.messageKey === "selected") return "TAS selected; waiting for load";
    if (playback.messageKey === "finished") return "TAS replay finished";
    if (playback.messageKey === "playing") return "TAS trial replay is running";
    if (playback.messageKey === "guard-checking") return detail ? `RAM guard: ${detail}` : "RAM guard checking";
    if (playback.messageKey === "desynced") return detail ? `TAS desynced: ${detail}` : "TAS desynced";
    if (playback.messageKey === "stopped") return "TAS stopped; ready to replay from entry frame";
    if (playback.messageKey === "paused") return "TAS paused";
    if (playback.messageKey === "load-rom-first") return "Load a matched ROM before TAS replay";
    if (playback.messageKey === "fast-forwarded") return detail ? `TAS fast-forwarded: ${detail}` : "TAS fast-forwarded to entry";
    if (playback.messageKey === "matched-available") return "Matched TAS available";
    return "Current ROM has no matched TAS";
  }

  if (playback.messageKey === "waiting") return "等待选择 TAS";
  if (playback.messageKey === "no-match") return "当前 ROM 没有匹配 TAS";
  if (playback.messageKey === "loading-fm2") return "正在载入 TAS FM2 文件";
  if (playback.messageKey === "loaded") return detail ? `已载入：${detail}` : "TAS 已载入";
  if (playback.messageKey === "load-error") return detail ? `TAS 载入失败：${detail}` : "TAS 载入失败";
  if (playback.messageKey === "selected") return "已选择 TAS，等待载入";
  if (playback.messageKey === "finished") return "TAS 回放结束";
  if (playback.messageKey === "playing") return "TAS 正在试播";
  if (playback.messageKey === "guard-checking") return detail ? `RAM 校验：${detail}` : "RAM 校验中";
  if (playback.messageKey === "desynced") return detail ? `TAS 脱同步：${detail}` : "TAS 脱同步";
  if (playback.messageKey === "stopped") return "TAS 已停止，可重新从入口帧回放";
  if (playback.messageKey === "paused") return "TAS 已暂停";
  if (playback.messageKey === "load-rom-first") return "请先更换卡带并载入匹配 ROM";
  if (playback.messageKey === "fast-forwarded") return detail ? `TAS 已快进：${detail}` : "TAS 已快进到入口";
  if (playback.messageKey === "matched-available") return "已匹配 TAS，可手动载入/回放";
  return "当前 ROM 无匹配 TAS";
}

function createAiActionLockState(): AiActionLockState {
  return {
    buttons: createButtonState(),
    remainingFrames: 0,
    priority: 0,
    reason: "idle"
  };
}

function createAiActionLockStates(): Record<PlayerSide, AiActionLockState> {
  return {
    "1P": createAiActionLockState(),
    "2P": createAiActionLockState()
  };
}

function createAiFsmState(): AiFsmState {
  return {
    state: "idle",
    reason: "init",
    sinceFrame: 0
  };
}

function createAiFsmStates(): Record<PlayerSide, AiFsmState> {
  return {
    "1P": createAiFsmState(),
    "2P": createAiFsmState()
  };
}

function createAiLoopExitState(): AiLoopExitState {
  return {
    lastWorldX: 0,
    lastScore: 0,
    lastThreatCount: 0,
    stagnantFrames: 0,
    unlockFrames: 0,
    forcedAdvanceBias: 0,
    reason: "idle"
  };
}

function createAiLoopExitStates(): Record<PlayerSide, AiLoopExitState> {
  return {
    "1P": createAiLoopExitState(),
    "2P": createAiLoopExitState()
  };
}

function createBossWallPhaseStates(): Record<PlayerSide, BossWallPhaseState> {
  return {
    "1P": createBossWallPhaseState(),
    "2P": createBossWallPhaseState()
  };
}

function createPlayerButtonStates(): PlayerButtonStates {
  return {
    "1P": createButtonState(),
    "2P": createButtonState()
  };
}

function createCombatMetrics(): Record<CombatMetricKey, number> {
  return {
    infantry: 0,
    turret: 0,
    flying: 0,
    boss: 0,
    unattributed: 0
  };
}

function createWeaponMetrics(): Record<WeaponMetricKey, number> {
  return {
    m: 0,
    s: 0,
    f: 0,
    l: 0,
    r: 0,
    b: 0
  };
}

function createPlayerMetricStates(): PlayerMetricStates {
  return {
    "1P": {
      kills: 0,
      deaths: 0,
      score: 0,
      scoreGained: 0,
      shots: 0,
      jumps: 0,
      moves: 0,
      bulletSpawns: 0,
      combat: createCombatMetrics(),
      weapons: createWeaponMetrics()
    },
    "2P": {
      kills: 0,
      deaths: 0,
      score: 0,
      scoreGained: 0,
      shots: 0,
      jumps: 0,
      moves: 0,
      bulletSpawns: 0,
      combat: createCombatMetrics(),
      weapons: createWeaponMetrics()
    }
  };
}

function createSourceInputStates(): Record<PlayerSide, Record<InputSource, ButtonState>> {
  return {
    "1P": {
      keyboard: createButtonState(),
      gamepad: createButtonState(),
      panel: createButtonState(),
      ai: createButtonState(),
      tas: createButtonState(),
      system: createButtonState()
    },
    "2P": {
      keyboard: createButtonState(),
      gamepad: createButtonState(),
      panel: createButtonState(),
      ai: createButtonState(),
      tas: createButtonState(),
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
  let playbackPrimed = false;

  gain.gain.value = initialVolume;

  processor.onaudioprocess = (event) => {
    const outputLeft = event.outputBuffer.getChannelData(0);
    const outputRight = event.outputBuffer.getChannelData(1);
    for (let i = 0; i < outputLeft.length; i += 1) {
      if (!playbackPrimed && buffered < AUDIO_PRIME_BUFFERED_SAMPLES) {
        outputLeft[i] = 0;
        outputRight[i] = 0;
        continue;
      }
      playbackPrimed = true;
      if (buffered <= 0) {
        outputLeft[i] = 0;
        outputRight[i] = 0;
        playbackPrimed = false;
        continue;
      }
      outputLeft[i] = leftBuffer[readIndex];
      outputRight[i] = rightBuffer[readIndex];
      readIndex = (readIndex + 1) % AUDIO_BUFFER_CAPACITY;
      buffered -= 1;
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

function readScoreUnits(read: (address: number) => number, lowAddress: number) {
  const units = read(lowAddress) | (read(lowAddress + 1) << 8);
  return units === 0xffff ? 0 : units * 100;
}

function enemyKind(type: number, hp: number, routine: number) {
  if (hp > 1) return "durable";
  if (type >= 0x40) return "projectile";
  if (routine > 0) return "enemy";
  return "object";
}

function isBulletSlotActive(routine: number, bulletSlotCode: number, x: number, y: number, spriteCode: number) {
  return routine !== 0 || bulletSlotCode !== 0 || spriteCode !== 0 || (x !== 0 && y !== 0);
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
  const p2PlayerX = read(0x0335);
  const p2PlayerY = read(0x031b);
  const playerMode = read(0x0022);
  const playerModeAlt = read(0x001d);
  const p2Lives = read(0x0033);
  const p2GameOver = read(0x0039);
  const p2State = read(0x0091);
  const p2DeathFlag = read(0x00b5);
  const cameraX = screen * 256 + scroll;
  const enemies: EnemySlotSnapshot[] = [];
  const bullets: PlayerBulletSnapshot[] = [];

  for (let slot = 0; slot < PLAYER_BULLET_SLOT_COUNT; slot += 1) {
    const y = read(0x03b8 + slot);
    const x = read(0x03c8 + slot);
    const bulletSlotCode = read(0x0388 + slot);
    const routine = read(0x0438 + slot);
    const owner = read(0x0448 + slot);
    const spriteCode = read(0x0368 + slot);
    if (!isBulletSlotActive(routine, bulletSlotCode, x, y, spriteCode)) continue;
    bullets.push({ slot, bulletSlotCode, owner, routine, x, y, spriteCode });
  }

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
    const scoreCollision = read(0x0588 + slot);
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
      scoreCollision,
      scoreCode: scoreCollision >> 4,
      collisionCode: scoreCollision & 0x0f,
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
    p1Score: readScoreUnits(read, 0x07e2),
    p2Score: readScoreUnits(read, 0x07e4),
    highScore: readScoreUnits(read, 0x07e0),
    gameOver: read(0x0038),
    p2GameOver,
    bossDefeated: read(0x003b),
    screen,
    scroll,
    cameraX,
    p1State: read(0x0090),
    p2State,
    jumpState: read(0x00a0),
    p2JumpState: read(0x00a1),
    weapon: read(0x00aa),
    p2Weapon: read(0x00ab),
    p1BarrierTimer: read(0x00b0),
    p2BarrierTimer: read(0x00b1),
    deathFlag: read(0x00b4),
    p2DeathFlag,
    playerX,
    playerY,
    worldX: cameraX + playerX,
    p2PlayerX,
    p2PlayerY,
    p2WorldX: cameraX + p2PlayerX,
    twoPlayerActive: playerMode === 0x01,
    bullets,
    enemies
  };
}

function isPlausibleRamSnapshot(snapshot: GameRamSnapshot | null): snapshot is GameRamSnapshot {
  return Boolean(snapshot)
    && snapshot?.level !== 0xff
    && snapshot?.screen !== 0xff
    && snapshot?.p1State !== 0xff;
}

function isLikelyAttractDemo(snapshot: GameRamSnapshot | null, frame = Number.POSITIVE_INFINITY) {
  if (!snapshot || frame >= 720) return false;
  return snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.p1State === PLAYER_ALIVE_STATE
    && snapshot.deathFlag === 0
    && snapshot.worldX >= 256
    && snapshot.screen >= 1
    && snapshot.p1Score > 0;
}

function isGameplayActive(snapshot: GameRamSnapshot | null, frame?: number) {
  if (!snapshot) return false;
  return snapshot.gameOver === 0
    && snapshot.p1State === PLAYER_ALIVE_STATE
    && snapshot.playerX > 0
    && snapshot.playerY > 0
    && !isLikelyAttractDemo(snapshot, frame);
}

function strategyRuntimeCanWrite(runtimeStatus: RuntimeStatus, gameplayActive: boolean) {
  return runtimeStatus === "running" && gameplayActive;
}

function isLikelyGameMenu(snapshot: GameRamSnapshot | null) {
  if (!snapshot) return true;
  return snapshot.p1State === 0
    && snapshot.deathFlag === 0
    && snapshot.screen === 0
    && snapshot.worldX === 0
    && snapshot.playerX === 0
    && snapshot.playerY === 0;
}

function isStartableMenuState(snapshot: GameRamSnapshot | null) {
  if (!snapshot) return true;
  return isLikelyGameMenu(snapshot)
    || (
      snapshot.gameOver === 0
      && snapshot.deathFlag === 0
      && snapshot.p1State === 0
      && snapshot.level === STAGE_ONE_LEVEL_INDEX
      && snapshot.screen === 0
      && snapshot.worldX <= 96
      && snapshot.enemies.length === 0
    );
}

function isDeathOrRespawnTransition(snapshot: GameRamSnapshot | null) {
  if (!isPlausibleRamSnapshot(snapshot)) return false;
  return snapshot.p1State === PLAYER_DEAD_STATE
    || snapshot.deathFlag !== 0
    || (snapshot.p1State === 0 && !isStartableMenuState(snapshot));
}

function runtimeStartupButtons(
  snapshot: GameRamSnapshot | null,
  frame: number,
  twoPlayerRequested: boolean,
  twoPlayerActive: boolean
) {
  const next = createButtonState();
  if (!snapshot || isDeathOrRespawnTransition(snapshot) || isGameplayActive(snapshot, frame)) return next;
  if (isLikelyAttractDemo(snapshot, frame)) {
    next.start = frame % 30 < 18;
    return next;
  }
  if (!isStartableMenuState(snapshot)) return next;
  if (twoPlayerRequested && !twoPlayerActive) {
    const phase = frame % 180;
    next.select = phase >= 20 && phase < 48;
    next.start = phase >= 72 && phase < 96;
    return next;
  }
  next.start = frame < 420 ? frame % 30 < 18 : frame % 90 < 24;
  return next;
}

function getPlayerDeathFields(side: PlayerSide, snapshot: GameRamSnapshot) {
  if (side === "1P") {
    return {
      state: snapshot.p1State,
      deathFlag: snapshot.deathFlag,
      active: true
    };
  }
  return {
    state: snapshot.p2State,
    deathFlag: snapshot.p2DeathFlag,
    active: snapshot.twoPlayerActive
  };
}

function isNonMenuRespawnState(side: PlayerSide, snapshot: GameRamSnapshot) {
  const fields = getPlayerDeathFields(side, snapshot);
  if (!fields.active || fields.state !== 0 || fields.deathFlag !== 0) return false;
  if (side === "1P") return !isStartableMenuState(snapshot);
  return snapshot.twoPlayerActive && (snapshot.p2PlayerX === 0 || snapshot.p2PlayerY === 0);
}

function playerCoordinateFields(side: PlayerSide, snapshot: GameRamSnapshot) {
  if (
    side === "2P"
    && snapshot.twoPlayerActive
    && snapshot.p2PlayerX > 0
    && snapshot.p2PlayerY > 0
  ) {
    return {
      playerX: snapshot.p2PlayerX,
      playerY: snapshot.p2PlayerY,
      worldX: snapshot.p2WorldX,
      source: "2p-candidate"
    };
  }

  return {
    playerX: snapshot.playerX,
    playerY: snapshot.playerY,
    worldX: snapshot.worldX,
    source: "1p"
  };
}

function tacticalSnapshotForSide(snapshot: GameRamSnapshot | null, side: PlayerSide) {
  if (!snapshot) return null;
  const coordinates = playerCoordinateFields(side, snapshot);
  if (
    coordinates.playerX === snapshot.playerX
    && coordinates.playerY === snapshot.playerY
    && coordinates.worldX === snapshot.worldX
  ) {
    return snapshot;
  }
  return {
    ...snapshot,
    playerX: coordinates.playerX,
    playerY: coordinates.playerY,
    worldX: coordinates.worldX
  };
}

function threatCountForSnapshot(snapshot: GameRamSnapshot) {
  return snapshot.enemies.filter((enemy) => enemy.threat).length;
}

function updateAiLoopExitState(
  previous: AiLoopExitState,
  side: PlayerSide,
  snapshot: GameRamSnapshot | null,
  gameplayActive: boolean,
  fsmState: AiFsmState
): AiLoopExitState {
  if (!snapshot || !gameplayActive || playerIsDeathOrRespawn(side, snapshot) || fsmState.state === "menu") {
    return createAiLoopExitState();
  }

  const currentWorldX = snapshot.worldX;
  const currentScore = scoreForSide(snapshot, side);
  const currentThreatCount = threatCountForSnapshot(snapshot);
  const inScriptedStallZone = snapshot.level === STAGE_ONE_LEVEL_INDEX
    && (
      (snapshot.worldX >= 500 && snapshot.worldX <= 930)
      || (snapshot.worldX >= 1040 && snapshot.worldX <= 2100)
    );
  const scoreProgressCounts = !(snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= 1040
    && snapshot.worldX <= 2100);
  const stateCanLoop = fsmState.state === "danger" || fsmState.state === "attack" || inScriptedStallZone;
  const hasProgress = currentWorldX > previous.lastWorldX + 10
    || (scoreProgressCounts && currentScore > previous.lastScore)
    || currentThreatCount < previous.lastThreatCount;

  if (!stateCanLoop || hasProgress) {
    return {
      lastWorldX: Math.max(previous.lastWorldX, currentWorldX),
      lastScore: Math.max(previous.lastScore, currentScore),
      lastThreatCount: currentThreatCount,
      stagnantFrames: 0,
      unlockFrames: 0,
      forcedAdvanceBias: previous.forcedAdvanceBias * 0.95,
      reason: stateCanLoop ? "tracking" : "idle"
    };
  }

  const stagnantFrames = previous.stagnantFrames + 1;
  const shouldStartUnlock = stagnantFrames >= 54 && previous.unlockFrames <= 0;

  return {
    lastWorldX: Math.max(previous.lastWorldX, currentWorldX),
    lastScore: Math.max(previous.lastScore, currentScore),
    lastThreatCount: previous.lastThreatCount > 0 ? Math.min(previous.lastThreatCount, currentThreatCount) : currentThreatCount,
    stagnantFrames,
    unlockFrames: shouldStartUnlock ? 96 : Math.max(0, previous.unlockFrames - 1),
    forcedAdvanceBias: shouldStartUnlock ? 1 : previous.forcedAdvanceBias * 0.95,
    reason: shouldStartUnlock || previous.unlockFrames > 0 ? "world-score-enemy-stall" : "tracking"
  };
}

function aiLoopExitLabel(loopExit: AiLoopExitState) {
  if (loopExit.forcedAdvanceBias > 0.05) return `${loopExit.reason}:bias=${loopExit.forcedAdvanceBias.toFixed(2)}`;
  if (loopExit.unlockFrames > 0) return `${loopExit.reason}:${loopExit.unlockFrames}`;
  if (loopExit.stagnantFrames > 0) return `${loopExit.reason}:${loopExit.stagnantFrames}`;
  return loopExit.reason;
}

function shouldCountPlayerDeath(
  side: PlayerSide,
  before: GameRamSnapshot | null,
  after: GameRamSnapshot | null,
  deathLatched: boolean
) {
  if (!isPlausibleRamSnapshot(before) || !isPlausibleRamSnapshot(after) || deathLatched) return false;
  const beforeFields = getPlayerDeathFields(side, before);
  const afterFields = getPlayerDeathFields(side, after);
  if (!beforeFields.active || !afterFields.active) return false;
  const stateDeath = beforeFields.state === PLAYER_ALIVE_STATE && afterFields.state === PLAYER_DEAD_STATE;
  const flagDeath = beforeFields.deathFlag === 0 && afterFields.deathFlag !== 0;
  const nonMenuRespawn = beforeFields.state === PLAYER_ALIVE_STATE && isNonMenuRespawnState(side, after);
  return stateDeath || flagDeath || nonMenuRespawn;
}

function shouldReleaseDeathLatch(side: PlayerSide, snapshot: GameRamSnapshot | null) {
  if (!snapshot) return false;
  if (side === "1P") return isGameplayActive(snapshot) && snapshot.deathFlag === 0;
  const fields = getPlayerDeathFields(side, snapshot);
  return fields.active && fields.deathFlag === 0 && fields.state !== PLAYER_DEAD_STATE;
}

function enemyBySlot(enemies: EnemySlotSnapshot[]) {
  return new Map(enemies.map((enemy) => [enemy.slot, enemy]));
}

function likelyVisibleKillDisappearance(enemy: EnemySlotSnapshot) {
  if (!enemy.threat || enemy.hp <= 0) return false;
  return enemy.x > 8 && enemy.x < 248 && enemy.y > 8 && enemy.y < 232;
}

function classifyEnemyDestruction(enemy: EnemySlotSnapshot, level: number): CombatMetricKey {
  const commonTurrets = new Set([0x04, 0x07, 0x08, 0x0e]);
  const commonInfantry = new Set([0x05, 0x06, 0x0c]);
  if (enemy.type === 0x02 || enemy.type === 0x03) return "flying";
  if (commonTurrets.has(enemy.type)) return "turret";
  if (commonInfantry.has(enemy.type)) return "infantry";
  if (enemy.type === 0x0a) return "boss";

  if (level === 0 && enemy.type === 0x10) return "turret";
  if ((level === 1 || level === 3) && (enemy.type === 0x10 || enemy.type === 0x14 || enemy.type === 0x1c || enemy.type === 0x1d || enemy.type === 0x1e || enemy.type === 0x1f)) return "boss";
  if ((level === 1 || level === 3) && enemy.type === 0x13) return "turret";
  if ((level === 1 || level === 3) && (enemy.type === 0x15 || enemy.type === 0x16 || enemy.type === 0x18)) return "infantry";
  if (level === 2 && (enemy.type === 0x14 || enemy.type === 0x15)) return "boss";
  if (level === 4 && (enemy.type === 0x14 || enemy.type === 0x15 || enemy.type === 0x16)) return "flying";
  if (level === 4 && enemy.type === 0x12) return "boss";
  if (level === 5 && enemy.type === 0x13) return "boss";
  if (level === 6 && (enemy.type === 0x16 || enemy.type === 0x17)) return "turret";
  if (level === 6 && (enemy.type === 0x14 || enemy.type === 0x15)) return "boss";
  if (level === 7 && enemy.type >= 0x10 && enemy.type <= 0x16) return "boss";
  if (enemy.fixed || enemy.hp >= 8) return "turret";
  return "infantry";
}

function collectDestructionEvents(before: GameRamSnapshot | null, after: GameRamSnapshot | null) {
  if (!before || !after || !isGameplayActive(before)) return [];
  const afterSlots = enemyBySlot(after.enemies);
  const events: CombatMetricKey[] = [];

  for (const previousEnemy of before.enemies) {
    const currentEnemy = afterSlots.get(previousEnemy.slot);
    if (currentEnemy) {
      if (
        previousEnemy.type === currentEnemy.type
        && previousEnemy.hp > 0
        && currentEnemy.hp === 0
        && likelyVisibleKillDisappearance(previousEnemy)
      ) {
        events.push(classifyEnemyDestruction(previousEnemy, before.level));
      }
      continue;
    }

    if (likelyVisibleKillDisappearance(previousEnemy) && (previousEnemy.scoreCode > 0 || previousEnemy.hp > 0)) {
      events.push(classifyEnemyDestruction(previousEnemy, before.level));
    }
  }

  return events;
}

function countCombatEvents(events: CombatMetricKey[]) {
  const combat = createCombatMetrics();
  for (const event of events) {
    combat[event] += 1;
  }
  return combat;
}

function scoreForSide(snapshot: GameRamSnapshot | null, side: PlayerSide) {
  if (!snapshot) return 0;
  return side === "1P" ? snapshot.p1Score : snapshot.p2Score;
}

function weaponForSide(snapshot: GameRamSnapshot | null, side: PlayerSide) {
  if (!snapshot) return 0;
  return side === "1P" ? snapshot.weapon : snapshot.p2Weapon;
}

function barrierTimerForSide(snapshot: GameRamSnapshot | null, side: PlayerSide) {
  if (!snapshot) return 0;
  return side === "1P" ? snapshot.p1BarrierTimer : snapshot.p2BarrierTimer;
}

function weaponMetricKeyFromCode(code: number): WeaponMetricKey | null {
  if (code === 0x01) return "m";
  if (code === 0x02) return "f";
  if (code === 0x03) return "s";
  if (code === 0x04) return "l";
  return null;
}

function weaponMetricKeyFromItemAttr(attr: number): WeaponMetricKey | null {
  const code = attr & 0x07;
  if (code === 0x00) return "r";
  if (code === 0x01) return "m";
  if (code === 0x02) return "f";
  if (code === 0x03) return "s";
  if (code === 0x04) return "l";
  if (code === 0x05) return "b";
  return null;
}

function collectWeaponPickupEvents(before: GameRamSnapshot | null, after: GameRamSnapshot | null) {
  if (!before || !after) return [];
  const afterSlots = enemyBySlot(after.enemies);
  const pickups: WeaponMetricKey[] = [];
  for (const previousEnemy of before.enemies) {
    if (previousEnemy.type !== 0x00) continue;
    const currentEnemy = afterSlots.get(previousEnemy.slot);
    if (currentEnemy?.type === previousEnemy.type) continue;
    const weaponKey = weaponMetricKeyFromItemAttr(previousEnemy.attr);
    if (weaponKey) pickups.push(weaponKey);
  }
  return pickups;
}

function countWeaponEvents(events: WeaponMetricKey[]) {
  const weapons = createWeaponMetrics();
  for (const event of events) {
    weapons[event] += 1;
  }
  return weapons;
}

function countWeaponPickups(side: PlayerSide, before: GameRamSnapshot | null, after: GameRamSnapshot | null) {
  const weapons = createWeaponMetrics();
  if (!before || !after) return weapons;
  if (side === "2P" && !after.twoPlayerActive) return weapons;

  const beforeWeapon = weaponForSide(before, side);
  const afterWeapon = weaponForSide(after, side);
  const beforeCode = beforeWeapon & 0x0f;
  const afterCode = afterWeapon & 0x0f;
  const weaponKey = afterCode !== beforeCode ? weaponMetricKeyFromCode(afterCode) : null;
  if (weaponKey) weapons[weaponKey] += 1;
  if ((beforeWeapon & 0x10) === 0 && (afterWeapon & 0x10) !== 0) weapons.r += 1;
  if (barrierTimerForSide(before, side) === 0 && barrierTimerForSide(after, side) > 0) weapons.b += 1;
  return weapons;
}

function bulletOwnerSide(owner: number): PlayerSide | null {
  if (owner === 0) return "1P";
  if (owner === 1) return "2P";
  return null;
}

function countBulletSpawns(side: PlayerSide, before: GameRamSnapshot | null, after: GameRamSnapshot | null) {
  if (!before || !after) return 0;
  if (side === "2P" && !after.twoPlayerActive) return 0;
  const beforeBySlot = new Map(before.bullets.map((bullet) => [bullet.slot, bullet]));
  let count = 0;
  for (const bullet of after.bullets) {
    if (bulletOwnerSide(bullet.owner) !== side) continue;
    if (bullet.routine !== 1 || bullet.bulletSlotCode === 0) continue;
    const previous = beforeBySlot.get(bullet.slot);
    if (!previous || previous.owner !== bullet.owner || previous.routine !== 1 || previous.bulletSlotCode === 0) {
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

function runtimeStatusLabel(status: RuntimeStatus, language: UiLanguage) {
  if (status === "no-rom") return t(language, "status.noRom");
  if (status === "loading") return t(language, "status.loading");
  if (status === "loaded") return t(language, "status.loaded");
  if (status === "running") return t(language, "status.running");
  if (status === "paused") return t(language, "status.paused");
  return t(language, "status.error");
}

function runtimeAudioLabel(status: AudioStatus, language: UiLanguage) {
  if (status === "starting") return t(language, "audio.starting");
  if (status === "on") return t(language, "audio.on");
  if (status === "blocked") return t(language, "audio.blocked");
  if (status === "unsupported") return t(language, "audio.unsupported");
  if (status === "error") return t(language, "audio.error");
  return t(language, "audio.enable");
}

function localizedControlModeLabel(mode: ControlMode, language: UiLanguage) {
  return t(language, `mode.${mode}`);
}

function localizedAiStrategyLabel(strategy: AiStrategyKey, language: UiLanguage) {
  const translated = t(language, `strategy.${strategy}`);
  return translated === `strategy.${strategy}` ? getAiStrategyLabel(strategy) : translated;
}

function localizedTasStatusLabel(entry: TasRegistryEntry | null, language: UiLanguage) {
  if (language === "en-US") return entry ? "Matched TAS" : "No matched TAS";
  return tasStatusLabel(entry);
}

function localizedTasBaseLabel(entry: TasRegistryEntry | null, language: UiLanguage) {
  if (language === "en-US") return entry ? "Matched TAS base" : "No matched base";
  return tasBaseLabel(entry);
}

function localizedKeyboardHint(side: PlayerSide, language: UiLanguage) {
  return t(language, `pilot.keyboardHint.${side}`);
}

function localizedGamepadHint(label: string, language: UiLanguage) {
  if (language === "en-US") return label;
  return label
    .replace("disconnected", "未连接")
    .replace("connected:", "已连接：");
}

function localizedLastInput(label: string, language: UiLanguage) {
  if (language === "en-US") return label;
  const map: Record<string, string> = {
    "Waiting input": "等待输入",
    "Keyboard input": "键盘输入",
    "Gamepad input": "游戏手柄输入",
    "Panel input": "屏幕按钮输入",
    "TAS input": "TAS 输入",
    "AI input": "AI 输入",
    "AI batch test": "AI 批量测试",
    "waiting": "等待"
  };
  return map[label] ?? label;
}

function localizedBoolText(value: boolean, language: UiLanguage) {
  if (language === "en-US") return value ? "Yes" : "No";
  return boolText(value);
}

function localizedPlayerStateLabel(state: number, language: UiLanguage) {
  if (language !== "en-US") return playerStateLabel(state);
  if (state === PLAYER_ALIVE_STATE) return "Alive";
  if (state === PLAYER_DEAD_STATE) return "Dead";
  if (state === 0) return "Not joined";
  return `State ${formatByte(state)}`;
}

function localizedAiStrategyUsageLabel(mode: ControlMode, strategyKey: AiStrategyKey, language: UiLanguage) {
  if (!aiControlIsActive(mode)) return language === "en-US" ? "AI disabled" : "AI 未启用";
  return localizedAiStrategyLabel(strategyKey, language);
}

function localizedRoutePlanUsageLabel(mode: ControlMode, strategyKey: AiStrategyKey, plans: LoadedStrategyPlans, language: UiLanguage) {
  if (!aiControlIsActive(mode)) return language === "en-US" ? "AI disabled" : "AI 未启用";
  const plan = planForStrategy(strategyKey, plans);
  if (!plan) return language === "en-US" ? "No route plan" : "无路线";
  return `${localizedAiStrategyLabel(strategyKey, language)} / ${plan.segments.length} ${language === "en-US" ? "segments" : "段"}`;
}

function localizedHorizonCategoryLabel(category: StageOneHorizonCategory, language: UiLanguage) {
  if (language !== "en-US") return horizonCategoryLabel(category);
  if (category === "bridge") return "Bridge";
  if (category === "fixed") return "Fixed";
  if (category === "infantry") return "Infantry";
  if (category === "sniper") return "Sniper";
  if (category === "reward") return "Reward";
  if (category === "boss") return "Boss";
  return "Route";
}

function romLibraryStatusLabel(status: RomLibraryStatusState, language: UiLanguage) {
  const count = status.count ?? 0;
  const detail = status.detail ?? "";
  if (language === "en-US") {
    if (status.code === "scanning-default") return "Scanning default ROM library...";
    if (status.code === "default-count") return `Default library: ${count} cartridges`;
    if (status.code === "default-empty") return "Default library is empty";
    if (status.code === "default-error") return `Default library scan failed: ${detail}`;
    if (status.code === "browser-empty") return "Selected directory has no .nes cartridges";
    if (status.code === "browser-count") return `Player directory: ${count} cartridges`;
    return `Player directory read failed: ${detail}`;
  }
  if (status.code === "scanning-default") return "正在扫描默认 ROM 目录...";
  if (status.code === "default-count") return `默认库：${count} 个卡带`;
  if (status.code === "default-empty") return "默认库为空";
  if (status.code === "default-error") return `默认库扫描失败：${detail}`;
  if (status.code === "browser-empty") return "所选目录未发现 .nes 卡带";
  if (status.code === "browser-count") return `玩家目录：${count} 个卡带`;
  return `玩家目录读取失败：${detail}`;
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

function sanitizeButtonState(buttons: ButtonState, prefer?: ButtonState) {
  const next = cloneButtonState(buttons);

  if (next.left && next.right) {
    if (prefer?.left && !prefer.right) next.right = false;
    else next.left = false;
  }

  if (next.up && next.down) {
    if (next.a) {
      next.down = false;
    } else if (prefer?.down && !prefer.up) {
      next.up = false;
    } else {
      next.down = false;
    }
  }

  return next;
}

function aiActionLockCandidate(
  buttons: ButtonState,
  snapshot: GameRamSnapshot | null,
  strategyKey: AiStrategyKey
): AiActionLockState {
  const safeButtons = sanitizeButtonState(buttons);
  if (!hasPressedButton(safeButtons)) return createAiActionLockState();
  if (safeButtons.start || safeButtons.select) {
    return {
      buttons: safeButtons,
      remainingFrames: 10,
      priority: 6,
      reason: "menu"
    };
  }

  const immediateDanger = snapshot ? hasImmediateDanger(snapshot) : false;
  if (safeButtons.a && immediateDanger) {
    return {
      buttons: safeButtons,
      remainingFrames: strategyKey === "survival-v0" ? 14 : 10,
      priority: 5,
      reason: "evade"
    };
  }
  if ((safeButtons.left || safeButtons.right) && immediateDanger) {
    return {
      buttons: safeButtons,
      remainingFrames: strategyKey === "speedrun-v0" ? 6 : 9,
      priority: 4,
      reason: "evade"
    };
  }
  if (safeButtons.a) {
    return {
      buttons: safeButtons,
      remainingFrames: 9,
      priority: 4,
      reason: "jump"
    };
  }
  if (safeButtons.b && (safeButtons.up || safeButtons.down)) {
    return {
      buttons: safeButtons,
      remainingFrames: 6,
      priority: 3,
      reason: "aim-fire"
    };
  }
  if (safeButtons.b) {
    return {
      buttons: safeButtons,
      remainingFrames: 4,
      priority: 2,
      reason: "fire"
    };
  }
  if (safeButtons.left || safeButtons.right) {
    return {
      buttons: safeButtons,
      remainingFrames: 5,
      priority: 1,
      reason: "move"
    };
  }
  return createAiActionLockState();
}

function applyAiActionLock(
  rawButtons: ButtonState,
  previousLock: AiActionLockState,
  snapshot: GameRamSnapshot | null,
  strategyKey: AiStrategyKey
) {
  const candidate = aiActionLockCandidate(rawButtons, snapshot, strategyKey);
  if (candidate.reason === "idle") return candidate;
  if (snapshot && isBossWallBailoutInput(snapshot, sanitizeButtonState(rawButtons))) {
    return {
      ...candidate,
      buttons: sanitizeButtonState(rawButtons),
      remainingFrames: Math.min(Math.max(candidate.remainingFrames, 8), 10),
      priority: 7,
      reason: "evade" as const
    };
  }
  if (snapshot && isStageOneCriticalScriptWindow(snapshot)) return candidate;

  if (
    !rawButtons.b
    && (previousLock.reason === "fire" || previousLock.reason === "aim-fire")
  ) {
    return candidate;
  }

  if (
    previousLock.remainingFrames > 0
    && previousLock.reason !== "idle"
    && previousLock.priority >= candidate.priority
  ) {
    const lockedButtons = cloneButtonState(previousLock.buttons);
    // Allow current-frame fire and aim to join an active movement/jump lock.
    lockedButtons.b = lockedButtons.b || rawButtons.b;
    lockedButtons.up = lockedButtons.up || rawButtons.up;
    lockedButtons.down = lockedButtons.down || rawButtons.down;
    return {
      ...previousLock,
      buttons: sanitizeButtonState(lockedButtons, rawButtons),
      remainingFrames: previousLock.remainingFrames - 1
    };
  }

  return candidate;
}

function aiActionLockLabel(lock: AiActionLockState) {
  if (lock.reason === "idle" || lock.remainingFrames <= 0) return "idle";
  return `${lock.reason}:${lock.remainingFrames}`;
}

function routeKeyForStrategy(strategyKey: AiStrategyKey): AiStrategyKey | null {
  if (strategyKey === "rules-v0") return "speedrun-v0";
  if (strategyKey === "follow-test") return "guard-v0";
  if (
    strategyKey === "survival-v0"
    || strategyKey === "speedrun-v0"
    || strategyKey === "combat-v0"
    || strategyKey === "loot-v0"
    || strategyKey === "guard-v0"
    || strategyKey === "personal-v0"
  ) {
    return strategyKey;
  }
  return null;
}

function validateRouteAction(action: unknown): action is RouteAction {
  return action === "advance"
    || action === "cautious"
    || action === "hold-fire"
    || action === "loot"
    || action === "guard"
    || action === "survive";
}

function validateRouteFireMode(fire: unknown): fire is RouteFireMode {
  return fire === "pulse" || fire === "threat" || fire === "always";
}

function validateStageStrategyPlan(value: unknown): StageStrategyPlan | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StageStrategyPlan>;
  const game = candidate.game ?? CONTRA_LEGACY_GAME_ID;
  const gameId = candidate.gameId ?? (game === CONTRA_LEGACY_GAME_ID ? CONTRA_GAME_ID : "");
  const romProfileId = candidate.romProfileId ?? (game === CONTRA_LEGACY_GAME_ID ? CONTRA_US_ROM_PROFILE_ID : "");
  const compatibilityGroup = candidate.compatibilityGroup
    ?? (romProfileId === CONTRA_US_ROM_PROFILE_ID ? CONTRA_US_COMPATIBILITY_GROUP : "");
  if (game !== CONTRA_LEGACY_GAME_ID) return null;
  if (gameId !== CONTRA_GAME_ID) return null;
  if (romProfileId !== CONTRA_US_ROM_PROFILE_ID) return null;
  if (candidate.stage !== 1) return null;
  if (!candidate.strategy || !routeKeyForStrategy(candidate.strategy)) return null;
  if (!Array.isArray(candidate.segments)) return null;
  const segments = candidate.segments.filter((segment): segment is StageRouteSegment => (
    Boolean(segment)
    && typeof segment.id === "string"
    && typeof segment.label === "string"
    && typeof segment.worldStart === "number"
    && typeof segment.worldEnd === "number"
    && segment.worldStart >= 0
    && segment.worldEnd > segment.worldStart
    && validateRouteAction(segment.action)
    && validateRouteFireMode(segment.fire)
    && (segment.jumpEvery === undefined || (typeof segment.jumpEvery === "number" && segment.jumpEvery >= 0))
  ));
  if (segments.length === 0) return null;
  return {
    game,
    gameId,
    romProfileId,
    compatibilityGroup,
    stage: candidate.stage,
    strategy: candidate.strategy,
    version: typeof candidate.version === "number" ? candidate.version : 1,
    description: typeof candidate.description === "string" ? candidate.description : "",
    segments
  };
}

function normalizePersonalStrategyPlan(value: unknown): StageStrategyPlan | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StageStrategyPlan>;
  const validated = validateStageStrategyPlan({
    ...candidate,
    game: candidate.game ?? CONTRA_LEGACY_GAME_ID,
    gameId: candidate.gameId ?? CONTRA_GAME_ID,
    romProfileId: candidate.romProfileId ?? CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: candidate.compatibilityGroup ?? CONTRA_US_COMPATIBILITY_GROUP,
    stage: candidate.stage ?? 1,
    strategy: "personal-v0"
  });
  if (!validated) return null;
  return {
    ...validated,
    strategy: "personal-v0",
    description: validated.description || "Personal stage 1 route script."
  };
}

function loadPersonalStrategyPlan() {
  try {
    const saved = window.localStorage.getItem(PERSONAL_STRATEGY_STORAGE_KEY);
    if (!saved) return createDefaultPersonalPlan();
    return normalizePersonalStrategyPlan(JSON.parse(saved)) ?? createDefaultPersonalPlan();
  } catch {
    return createDefaultPersonalPlan();
  }
}

function savePersonalStrategyPlan(plan: StageStrategyPlan) {
  window.localStorage.setItem(PERSONAL_STRATEGY_STORAGE_KEY, JSON.stringify(plan, null, 2));
}

function planForStrategy(strategyKey: AiStrategyKey, plans: LoadedStrategyPlans) {
  const routeKey = routeKeyForStrategy(strategyKey);
  if (!routeKey) return null;
  return plans[routeKey] ?? fallbackStageOnePlans[routeKey] ?? (routeKey === "personal-v0" ? createDefaultPersonalPlan() : null);
}

function activeRouteSegmentForPlan(snapshot: GameRamSnapshot | null, plan: StageStrategyPlan | null) {
  if (!snapshot || snapshot.level !== STAGE_ONE_LEVEL_INDEX || !plan) return null;
  return plan.segments.find((segment) => (
    snapshot.worldX >= segment.worldStart && snapshot.worldX < segment.worldEnd
  )) ?? plan.segments[plan.segments.length - 1] ?? null;
}

function activeStageOneScriptAction(snapshot: GameRamSnapshot | null) {
  if (!snapshot || snapshot.level !== STAGE_ONE_LEVEL_INDEX) return null;
  return stageOneScriptActions
    .filter((action) => snapshot.worldX >= action.worldStart && snapshot.worldX < action.worldEnd)
    .sort((a, b) => b.priority - a.priority)[0] ?? null;
}

function stageOneEventWorldX(event: StageOneHorizonEvent) {
  return event.screen * 256 + event.x;
}

function horizonCategoryWeight(category: StageOneHorizonCategory) {
  if (category === "boss") return 120;
  if (category === "fixed") return 106;
  if (category === "bridge") return 94;
  if (category === "reward") return 82;
  if (category === "sniper") return 70;
  return 30;
}

function horizonPrioritySort(a: StageOneHorizonTarget, b: StageOneHorizonTarget) {
  const scoreA = horizonCategoryWeight(a.category) + a.priority - Math.max(0, a.distance) * 0.18;
  const scoreB = horizonCategoryWeight(b.category) + b.priority - Math.max(0, b.distance) * 0.18;
  return scoreB - scoreA;
}

function buildStageOneHorizon(snapshot: GameRamSnapshot | null, lookAhead = 420): StageOneHorizonSnapshot | null {
  if (!snapshot || snapshot.level !== STAGE_ONE_LEVEL_INDEX) return null;

  const upcoming = stageOneHorizonEvents
    .map((event) => {
      const worldX = stageOneEventWorldX(event);
      return {
        ...event,
        worldX,
        distance: worldX - snapshot.worldX
      };
    })
    .filter((event) => event.distance >= -48 && event.distance <= lookAhead)
    .sort((a, b) => a.worldX - b.worldX || horizonPrioritySort(a, b));

  const near = upcoming.filter((event) => event.distance >= -24 && event.distance <= 220);
  const fixedAhead = near
    .filter((event) => event.category === "fixed" || event.category === "boss")
    .sort(horizonPrioritySort)[0] ?? null;
  const rewardAhead = near
    .filter((event) => event.category === "reward")
    .sort(horizonPrioritySort)[0] ?? null;
  const bridgeAhead = near
    .filter((event) => event.category === "bridge")
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
  const sniperAhead = near
    .filter((event) => event.category === "sniper")
    .sort(horizonPrioritySort)[0] ?? null;
  const primary = [fixedAhead, rewardAhead, bridgeAhead, sniperAhead]
    .filter((event): event is StageOneHorizonTarget => Boolean(event))
    .sort(horizonPrioritySort)[0] ?? null;

  return {
    upcoming,
    near,
    primary,
    fixedAhead,
    rewardAhead,
    bridgeAhead,
    combatReadiness: Boolean(fixedAhead || bridgeAhead || sniperAhead)
  };
}

function horizonCategoryLabel(category: StageOneHorizonCategory) {
  if (category === "infantry") return "杂兵";
  if (category === "sniper") return "狙击兵";
  if (category === "fixed") return "固定火力";
  if (category === "reward") return "奖励";
  if (category === "bridge") return "桥段";
  return "Boss";
}

function horizonTargetLabel(target: StageOneHorizonTarget | null) {
  if (!target) return "none";
  return `${target.label}@${target.worldX}/d${target.distance}`;
}

function activeRouteSegment(strategyKey: AiStrategyKey, snapshot: GameRamSnapshot | null, plans: LoadedStrategyPlans) {
  return activeRouteSegmentForPlan(snapshot, planForStrategy(strategyKey, plans));
}

function routeLineForStrategy(strategyKey: AiStrategyKey, snapshot: GameRamSnapshot | null, plans: LoadedStrategyPlans) {
  const segment = activeRouteSegment(strategyKey, snapshot, plans);
  if (!segment) return {
    segment: "none",
    action: "fallback"
  };
  return {
    segment: segment.id,
    action: segment.action
  };
}

function traceInput(buttons: ButtonState): TraceInputSample {
  return {
    up: buttons.up,
    down: buttons.down,
    left: buttons.left,
    right: buttons.right,
    a: buttons.a,
    b: buttons.b,
    start: buttons.start,
    select: buttons.select
  };
}

function buildPlayTraceSample({
  frame,
  runtimeStatus,
  gameplayActive,
  strategyKey,
  strategyPlans,
  ramSnapshot,
  finalButtons,
  bossWallPhaseStates
}: {
  frame: number;
  runtimeStatus: RuntimeStatus;
  gameplayActive: boolean;
  strategyKey: AiStrategyKey;
  strategyPlans: LoadedStrategyPlans;
  ramSnapshot: GameRamSnapshot | null;
  finalButtons: PlayerButtonStates;
  bossWallPhaseStates: Record<PlayerSide, BossWallPhaseState>;
}): PlayTraceSample {
  const route = routeLineForStrategy(strategyKey, ramSnapshot, strategyPlans);
  return {
    frame,
    gameplayActive,
    runtimeStatus,
    routeSegment: route.segment,
    routeAction: route.action,
    p1Input: traceInput(finalButtons["1P"]),
    p2Input: traceInput(finalButtons["2P"]),
    bossWallPhase: {
      "1P": describeBossWallPhaseTelemetry(tacticalSnapshotForSide(ramSnapshot, "1P"), bossWallPhaseStates["1P"]),
      "2P": describeBossWallPhaseTelemetry(tacticalSnapshotForSide(ramSnapshot, "2P"), bossWallPhaseStates["2P"])
    },
    ram: ramSnapshot ? {
      level: ramSnapshot.level,
      screen: ramSnapshot.screen,
      scroll: ramSnapshot.scroll,
      cameraX: ramSnapshot.cameraX,
      worldX: ramSnapshot.worldX,
      playerX: ramSnapshot.playerX,
      playerY: ramSnapshot.playerY,
      p2PlayerX: ramSnapshot.p2PlayerX,
      p2PlayerY: ramSnapshot.p2PlayerY,
      p2WorldX: ramSnapshot.p2WorldX,
      p1State: ramSnapshot.p1State,
      p2State: ramSnapshot.p2State,
      jumpState: ramSnapshot.jumpState,
      p2JumpState: ramSnapshot.p2JumpState,
      deathFlag: ramSnapshot.deathFlag,
      p2DeathFlag: ramSnapshot.p2DeathFlag,
      p1Score: ramSnapshot.p1Score,
      p2Score: ramSnapshot.p2Score,
      weapon: ramSnapshot.weapon,
      p2Weapon: ramSnapshot.p2Weapon,
      bossDefeated: ramSnapshot.bossDefeated,
      twoPlayerActive: ramSnapshot.twoPlayerActive,
      enemies: ramSnapshot.enemies.map((enemy) => ({
        slot: enemy.slot,
        type: enemy.type,
        hp: enemy.hp,
        x: enemy.x,
        y: enemy.y,
        routine: enemy.routine,
        kind: enemy.kind,
        threat: enemy.threat,
        fixed: enemy.fixed,
        priority: enemy.priority
      }))
    } : null
  };
}

const recentTraceSampleLimit = 1200;
const deathTraceSampleLimit = 900;

function traceInputLabel(input: TraceInputSample) {
  const pressed = [
    input.up ? "up" : "",
    input.down ? "down" : "",
    input.left ? "left" : "",
    input.right ? "right" : "",
    input.a ? "A" : "",
    input.b ? "B" : "",
    input.select ? "select" : "",
    input.start ? "start" : ""
  ].filter(Boolean);
  return pressed.length > 0 ? pressed.join("+") : "none";
}

function sampleInputForSide(sample: PlayTraceSample, side: PlayerSide) {
  return side === "1P" ? sample.p1Input : sample.p2Input;
}

function sampleIsAliveForSide(sample: PlayTraceSample, side: PlayerSide) {
  if (!sample.ram) return false;
  const state = side === "1P" ? sample.ram.p1State : sample.ram.p2State;
  const deathFlag = side === "1P" ? sample.ram.deathFlag : sample.ram.p2DeathFlag;
  return sample.gameplayActive && state === PLAYER_ALIVE_STATE && deathFlag === 0;
}

function samplePositionForSide(sample: PlayTraceSample, side: PlayerSide) {
  if (!sample.ram) {
    return {
      worldX: null,
      playerX: null,
      playerY: null,
      score: null,
      weapon: null
    };
  }
  if (side === "1P") {
    return {
      worldX: sample.ram.worldX,
      playerX: sample.ram.playerX,
      playerY: sample.ram.playerY,
      score: sample.ram.p1Score,
      weapon: sample.ram.weapon
    };
  }
  return {
    worldX: sample.ram.p2WorldX,
    playerX: sample.ram.p2PlayerX,
    playerY: sample.ram.p2PlayerY,
    score: sample.ram.p2Score,
    weapon: sample.ram.p2Weapon
  };
}

function createDeathTraceReport(side: PlayerSide, samples: PlayTraceSample[]): DeathTraceReport | null {
  const current = samples[samples.length - 1];
  if (!current) return null;
  const position = samplePositionForSide(current, side);
  let lastAliveSample: PlayTraceSample | null = null;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (sampleIsAliveForSide(samples[index], side)) {
      lastAliveSample = samples[index];
      break;
    }
  }
  const lastAlivePosition = lastAliveSample ? samplePositionForSide(lastAliveSample, side) : null;
  const topEnemies = (current.ram?.enemies ?? [])
    .filter((enemy) => enemy.type !== 0x02 && (enemy.threat || enemy.hp > 0))
    .slice()
    .sort((a, b) => (b.priority - a.priority) || (b.hp - a.hp))
    .slice(0, 8);

  return {
    schema: "fc-ai-death-trace-v1",
    side,
    frame: current.frame,
    worldX: position.worldX,
    screen: current.ram?.screen ?? null,
    playerX: position.playerX,
    playerY: position.playerY,
    score: position.score,
    weapon: position.weapon,
    routeSegment: current.routeSegment,
    routeAction: current.routeAction,
    input: traceInputLabel(sampleInputForSide(current, side)),
    lastAlive: lastAliveSample && lastAlivePosition ? {
      frame: lastAliveSample.frame,
      worldX: lastAlivePosition.worldX,
      playerX: lastAlivePosition.playerX,
      playerY: lastAlivePosition.playerY,
      input: traceInputLabel(sampleInputForSide(lastAliveSample, side))
    } : null,
    topEnemies,
    samples: samples.slice(-deathTraceSampleLimit)
  };
}

function deathTraceReportSummary(report: DeathTraceReport) {
  const enemy = report.topEnemies[0];
  const enemyLabel = enemy
    ? `slot${enemy.slot}/type0x${enemy.type.toString(16).padStart(2, "0")}/hp${enemy.hp}@${enemy.x},${enemy.y}`
    : "none";
  return `Death trace ${report.side}: frame ${report.frame}, worldX ${report.worldX ?? "?"}, input ${report.input}, enemy ${enemyLabel}`;
}

function buildRuntimeDebugSnapshot({
  side,
  mode,
  strategyKey,
  strategyPlans,
  ramSnapshot,
  frameCount,
  gameplayActive,
  runtimeStatus,
  actionLock,
  fsmState,
  loopExit,
  buttons,
  rawAiButtons,
  lockedAiButtons,
  bossWallPhaseState
}: {
  side: PlayerSide;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  strategyPlans: LoadedStrategyPlans;
  ramSnapshot: GameRamSnapshot | null;
  frameCount: number;
  gameplayActive: boolean;
  runtimeStatus: RuntimeStatus;
  actionLock: AiActionLockState;
  fsmState: AiFsmState;
  loopExit: AiLoopExitState;
  buttons: ButtonState;
  rawAiButtons?: ButtonState;
  lockedAiButtons?: ButtonState;
  bossWallPhaseState?: BossWallPhaseState;
}): RuntimeDebugSnapshot {
  const streamSnapshot = tacticalSnapshotForSide(ramSnapshot, side);
  const route = routeLineForStrategy(strategyKey, streamSnapshot, strategyPlans);
  const scriptAction = activeStageOneScriptAction(streamSnapshot);
  const threatPool = streamSnapshot ? buildThreatPool(streamSnapshot) : null;
  const horizon = buildStageOneHorizon(streamSnapshot);
  const topThreats = threatPool
    ? threatPool.active
      .slice()
      .sort((a, b) => (b.priority - a.priority) || (b.hp - a.hp))
      .slice(0, 10)
      .map((enemy) => ({
        slot: enemy.slot,
        type: enemy.type,
        hp: enemy.hp,
        x: enemy.x,
        y: enemy.y,
        routine: enemy.routine,
        kind: enemy.kind,
        threat: enemy.threat,
        fixed: enemy.fixed,
        priority: enemy.priority
      }))
    : [];

  return {
    schema: "fc-ai-runtime-debug-v1",
    frame: streamSnapshot?.frame ?? 0,
    frameCount,
    runtimeStatus,
    gameplayActive,
    side,
    mode,
    strategyKey,
    routeSegment: route.segment,
    routeAction: route.action,
    scriptAction: scriptAction?.id ?? "none",
    scriptMode: scriptAction?.mode ?? "none",
    fsmState: mode !== "human" ? fsmState.state : "idle",
    fsmReason: mode !== "human" ? fsmState.reason : "input-disabled",
    actionLock: mode !== "human" ? aiActionLockLabel(actionLock) : "idle",
    loopExit: mode !== "human" ? aiLoopExitLabel(loopExit) : "idle",
    loopBias: mode !== "human" ? Number(loopExit.forcedAdvanceBias.toFixed(3)) : 0,
    finalButtons: activeButtonLabel(buttons, "en-US"),
    finalInput: traceInput(buttons),
    rawAiInput: rawAiButtons ? traceInput(rawAiButtons) : undefined,
    lockedAiInput: lockedAiButtons ? traceInput(lockedAiButtons) : undefined,
    ram: streamSnapshot ? {
      level: streamSnapshot.level,
      screen: streamSnapshot.screen,
      scroll: streamSnapshot.scroll,
      worldX: streamSnapshot.worldX,
      playerX: streamSnapshot.playerX,
      playerY: streamSnapshot.playerY,
      p1State: streamSnapshot.p1State,
      deathFlag: streamSnapshot.deathFlag,
      score: side === "1P" ? streamSnapshot.p1Score : streamSnapshot.p2Score,
      weapon: side === "1P" ? streamSnapshot.weapon : streamSnapshot.p2Weapon,
      enemies: streamSnapshot.enemies.length,
      bullets: streamSnapshot.bullets.length
    } : null,
    threatPool: threatPool ? {
      active: threatPool.active.length,
      turrets: threatPool.turrets.length,
      actionableTurrets: threatPool.actionableTurrets.length,
      dynamicThreats: threatPool.dynamicThreats.length,
      projectiles: threatPool.projectiles.length,
      rewards: threatPool.rewards.length,
      primaryTurret: threatPoolTargetLabel(threatPool.primaryTurret),
      primaryThreat: threatPoolTargetLabel(threatPool.primaryThreat),
      top: topThreats
    } : null,
    horizon: horizon ? {
      primary: horizonTargetLabel(horizon.primary),
      fixedAhead: horizonTargetLabel(horizon.fixedAhead),
      rewardAhead: horizonTargetLabel(horizon.rewardAhead),
      bridgeAhead: horizonTargetLabel(horizon.bridgeAhead),
      near: horizon.near.length,
      upcoming: horizon.upcoming.length
    } : null,
    bossWallPhase: bossWallPhaseState
      ? describeBossWallPhaseTelemetry(streamSnapshot, bossWallPhaseState)
      : null
  };
}

function createIdleBotRunReport(): BotRunReport {
  return {
    schema: "fc-ai-bot-run-v1",
    status: "idle",
    startedAt: null,
    finishedAt: null,
    maxFrames: 0,
    frameCount: 0,
    initialDeaths: 0,
    deaths: 0,
    finalWorldX: null,
    finalPlayerX: null,
    finalPlayerY: null,
    finalScore: null,
    finalWeapon: null,
    bossDefeated: null,
    gameplayActive: false,
    reason: "not-started",
    lastInput: traceInput(createButtonState()),
    finalEnemies: [],
    runtime: null,
    terminalRuntime: null,
    deathTrace: null
  };
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
  if (strategyKey === "survival-v0") return "稳健生存";
  if (strategyKey === "speedrun-v0") return "快速推进候选";
  if (strategyKey === "combat-v0") return "清敌优先";
  if (strategyKey === "loot-v0") return "奖励优先";
  if (strategyKey === "guard-v0") return "护卫队友";
  if (strategyKey === "personal-v0") return "个人策略";
  if (strategyKey === "follow-test") return "保守跟随";
  if (strategyKey === "input-mirror") return "输入镜像";
  if (mode === "hybrid") return "人类优先，AI 填补空档";
  return "AI 正在写入手柄";
}

function activeButtonLabel(buttons: ButtonState, language: UiLanguage = DEFAULT_LANGUAGE) {
  const labels: Record<ButtonName, string> = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
    a: "A",
    b: "B",
    start: "START",
    select: "SELECT"
  };
  const active = buttonNames.filter((button) => buttons[button]).map((button) => labels[button]);
  return active.length > 0 ? active.join("") : t(language, "value.none");
}

function getAiStrategyLabel(strategyKey: AiStrategyKey) {
  return aiStrategyOptions.find((option) => option.key === strategyKey)?.label ?? "安全占位 Bot";
}

function defaultAiStrategyForSide(_side: PlayerSide): AiStrategyKey {
  return "survival-v0";
}

function aiStrategyBehaviorTag(strategyKey: AiStrategyKey) {
  if (strategyKey === "survival-v0") return "survival";
  if (strategyKey === "speedrun-v0") return "speed";
  if (strategyKey === "combat-v0") return "combat";
  if (strategyKey === "loot-v0") return "loot";
  if (strategyKey === "guard-v0") return "guard";
  if (strategyKey === "personal-v0") return "personal";
  if (strategyKey === "follow-test") return "follow";
  if (strategyKey === "input-mirror") return "mirror";
  if (strategyKey === "rules-v0") return "baseline";
  return "idle";
}

function getAuthorityLabel(mode: ControlMode) {
  if (mode === "human") return "人类控制";
  if (mode === "ai") return "AI 控制";
  return "人类优先";
}

function localizedPilotName(side: PlayerSide, mode: ControlMode, language: UiLanguage) {
  if (language !== "en-US") return getPilotName(side, mode);
  if (side === "1P") {
    if (mode === "ai") return "AI Driver 1P";
    if (mode === "hybrid") return "Player 1 + AI Assist";
    return "Player 1";
  }
  if (mode === "ai") return "AI Companion";
  if (mode === "hybrid") return "Player 2 + AI Companion";
  return "Player 2";
}

function localizedPilotStatus(
  side: PlayerSide,
  status: RuntimeStatus,
  mode: ControlMode,
  strategyKey: AiStrategyKey,
  twoPlayerActive: boolean,
  language: UiLanguage
) {
  if (language !== "en-US") return getPilotStatus(side, status, mode, strategyKey, twoPlayerActive);
  if (status !== "running") return runtimeStatusLabel(status, language);
  if (side === "2P" && mode !== "human" && !twoPlayerActive) return "Waiting for 2P mode";
  if (mode === "human") return "Operable";
  if (strategyKey === "off" || strategyKey === "placeholder") return "Safe idle";
  if (mode === "hybrid") return "AI assist";
  return "Operating";
}

function localizedAuthorityLabel(mode: ControlMode, language: UiLanguage) {
  if (language !== "en-US") return getAuthorityLabel(mode);
  if (mode === "human") return "Human Control";
  if (mode === "ai") return "AI Control";
  return "Human Priority";
}

function aiControlIsActive(mode: ControlMode) {
  return mode === "ai" || mode === "hybrid";
}

function aiStrategyUsageLabel(mode: ControlMode, strategyKey: AiStrategyKey) {
  return aiControlIsActive(mode) ? getAiStrategyLabel(strategyKey) : "AI 未启用";
}

function routePlanUsageLabel(mode: ControlMode, strategyKey: AiStrategyKey, plans: LoadedStrategyPlans) {
  return aiControlIsActive(mode) ? routePlanSummary(strategyKey, plans) : "AI 未启用";
}

function modeToggleActive(mode: ControlMode, toggle: ModeToggleKey) {
  if (toggle === "human") return mode === "human" || mode === "hybrid";
  return mode === "ai" || mode === "hybrid";
}

function nextModeFromToggle(currentMode: ControlMode, toggle: ModeToggleKey) {
  const nextHuman = toggle === "human" ? !modeToggleActive(currentMode, "human") : modeToggleActive(currentMode, "human");
  const nextAi = toggle === "ai" ? !modeToggleActive(currentMode, "ai") : modeToggleActive(currentMode, "ai");
  if (nextHuman && nextAi) return "hybrid";
  if (nextAi) return "ai";
  return "human";
}

function jumpStateForSide(snapshot: GameRamSnapshot, side: PlayerSide) {
  return side === "1P" ? snapshot.jumpState : snapshot.p2JumpState;
}

function isGrounded(snapshot: GameRamSnapshot, side: PlayerSide) {
  return jumpStateForSide(snapshot, side) === 0;
}

function isRewardTarget(enemy: EnemySlotSnapshot) {
  return (enemy.type === 0x00 || enemy.type === 0x12)
    && enemy.hp <= 1
    && enemy.kind !== "boss";
}

function isSpawnSensorLike(enemy: EnemySlotSnapshot) {
  return enemy.type === 0x02;
}

function isIgnoredEntityForDanger(enemy: EnemySlotSnapshot) {
  return isRewardTarget(enemy) || isSpawnSensorLike(enemy) || (!enemy.threat && enemy.hp <= 0);
}

function isEnvironmentalTarget(enemy: EnemySlotSnapshot) {
  return !isIgnoredEntityForDanger(enemy) && (enemy.fixed || enemy.hp > 1 || enemy.kind === "durable");
}

function isDynamicThreat(enemy: EnemySlotSnapshot) {
  return !isIgnoredEntityForDanger(enemy) && !isEnvironmentalTarget(enemy);
}

function isTurretThreat(enemy: EnemySlotSnapshot) {
  return isEnvironmentalTarget(enemy)
    && enemy.hp > 0
    && !isProjectileLike(enemy);
}

function turretIsActionable(snapshot: GameRamSnapshot, enemy: EnemySlotSnapshot) {
  const dx = enemy.x - snapshot.playerX;
  const dy = enemy.y - snapshot.playerY;
  return dx >= -8
    && dx <= 212
    && dy >= -132
    && dy <= 72;
}

function sortThreatsByPriority(snapshot: GameRamSnapshot, enemies: EnemySlotSnapshot[]) {
  return enemies
    .slice()
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      const aheadA = a.x >= snapshot.playerX - 12 ? 28 : 0;
      const aheadB = b.x >= snapshot.playerX - 12 ? 28 : 0;
      const fixedA = isTurretThreat(a) ? 48 : 0;
      const fixedB = isTurretThreat(b) ? 48 : 0;
      const scoreA = fixedA + aheadA + (a.priority * 36) + (a.hp * 10) - distanceA;
      const scoreB = fixedB + aheadB + (b.priority * 36) + (b.hp * 10) - distanceB;
      return scoreB - scoreA;
    });
}

function buildThreatPool(snapshot: GameRamSnapshot): ThreatPoolSnapshot {
  const active = snapshot.enemies.filter((enemy) => !isIgnoredEntityForDanger(enemy));
  const turrets = sortThreatsByPriority(snapshot, active.filter(isTurretThreat));
  const actionableTurrets = sortThreatsByPriority(snapshot, turrets.filter((enemy) => turretIsActionable(snapshot, enemy)));
  const projectiles = sortThreatsByPriority(snapshot, active.filter(isProjectileLike));
  const dynamicThreats = sortThreatsByPriority(snapshot, active.filter((enemy) => isDynamicThreat(enemy) && !isProjectileLike(enemy)));
  const rewards = snapshot.enemies.filter(isRewardTarget);
  const primaryTurret = actionableTurrets[0] ?? null;
  const primaryThreat = primaryTurret ?? projectiles[0] ?? dynamicThreats[0] ?? null;

  return {
    active,
    turrets,
    actionableTurrets,
    dynamicThreats,
    projectiles,
    rewards,
    primaryTurret,
    primaryThreat,
    combatReadiness: turrets.length > 0 || projectiles.length > 0 || dynamicThreats.length > 0
  };
}

function projectedCollisionRisk(snapshot: GameRamSnapshot, enemy: EnemySlotSnapshot, frames = 30) {
  if (isIgnoredEntityForDanger(enemy)) return false;
  if (isEnvironmentalTarget(enemy)) {
    return enemy.x >= snapshot.playerX - 18
      && enemy.x <= snapshot.playerX + 112
      && Math.abs(enemy.y - snapshot.playerY) <= 52;
  }

  const hitboxX = 18;
  const hitboxY = 28;
  const step = 6;
  for (let frame = 0; frame <= frames; frame += step) {
    const futureX = enemy.x + enemy.vx * frame;
    const futureY = enemy.y + enemy.vy * frame;
    if (
      futureX >= snapshot.playerX - hitboxX
      && futureX <= snapshot.playerX + hitboxX
      && futureY >= snapshot.playerY - hitboxY
      && futureY <= snapshot.playerY + hitboxY
    ) {
      return true;
    }
  }
  return false;
}

function horizontalDecision(next: ButtonState, playerX: number, targetX: number, deadZone = 12) {
  if (targetX > playerX + deadZone) next.right = true;
  if (targetX < playerX - deadZone) next.left = true;
}

function findNearestThreat(snapshot: GameRamSnapshot, predicate?: (enemy: EnemySlotSnapshot) => boolean) {
  return snapshot.enemies
    .filter((enemy) => enemy.threat && !isIgnoredEntityForDanger(enemy) && (!predicate || predicate(enemy)))
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function isProjectileLike(enemy: EnemySlotSnapshot) {
  return enemy.kind === "projectile" || enemy.type >= 0x40 || Math.abs(enemy.vx) >= 2 || Math.abs(enemy.vy) >= 2;
}

function findBestThreat(snapshot: GameRamSnapshot, predicate?: (enemy: EnemySlotSnapshot) => boolean) {
  return snapshot.enemies
    .filter((enemy) => enemy.threat && !isIgnoredEntityForDanger(enemy) && (!predicate || predicate(enemy)))
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      const environmentA = isEnvironmentalTarget(a) ? 32 : 0;
      const environmentB = isEnvironmentalTarget(b) ? 32 : 0;
      const scoreA = environmentA + (a.priority * 36) + (a.hp * 10) - distanceA + (a.x >= snapshot.playerX - 12 ? 14 : 0);
      const scoreB = environmentB + (b.priority * 36) + (b.hp * 10) - distanceB + (b.x >= snapshot.playerX - 12 ? 14 : 0);
      return scoreB - scoreA;
    })[0] ?? null;
}

function enemyIsShootableFromPlayer(snapshot: GameRamSnapshot, enemy: EnemySlotSnapshot, range = 150) {
  const dy = enemy.y - snapshot.playerY;
  return enemy.x >= snapshot.playerX - 18
    && enemy.x - snapshot.playerX <= range
    && dy >= -70
    && dy <= 48;
}

// Precision fire remains a deferred experiment; the active survival policy uses suppressive fire.
function aimingVectorForButtons(buttons: ButtonState) {
  const x = buttons.left ? -1 : 1;
  const y = buttons.up ? -1 : buttons.down ? 1 : 0;
  return { x, y };
}

function predictedShotCanHitEnemy(snapshot: GameRamSnapshot, buttons: ButtonState, enemy: EnemySlotSnapshot) {
  if (enemy.x < snapshot.playerX - 12 || enemy.x > snapshot.playerX + 208) return false;
  const vector = aimingVectorForButtons(buttons);
  const originX = snapshot.playerX + (vector.x > 0 ? 10 : -10);
  const originY = snapshot.playerY - 4;
  const dx = enemy.x - originX;
  const dy = enemy.y - originY;

  if (vector.x > 0 && dx < -8) return false;
  if (vector.x < 0 && dx > 8) return false;

  const absDx = Math.abs(dx);
  if (vector.y === 0) return Math.abs(dy) <= 18;

  const predictedY = vector.y * absDx;
  return Math.abs(dy - predictedY) <= (isEnvironmentalTarget(enemy) ? 34 : 24);
}

function predictedShotTarget(snapshot: GameRamSnapshot, buttons: ButtonState) {
  return findBestThreat(snapshot, (enemy) => (
    enemy.x >= snapshot.playerX - 12
    && enemy.x <= snapshot.playerX + 208
    && predictedShotCanHitEnemy(snapshot, buttons, enemy)
  ));
}

function shouldFireForPlannedShot(snapshot: GameRamSnapshot, buttons: ButtonState) {
  if (isBridgeJumpCommitWindow(snapshot)) return true;
  if (predictedShotTarget(snapshot, buttons)) return true;
  const horizon = buildStageOneHorizon(snapshot);
  const target = horizon?.primary;
  return Boolean(
    target
    && target.category !== "bridge"
    && target.distance >= -20
    && target.distance <= 160
  );
}

function aimAtEnemy(next: ButtonState, snapshot: GameRamSnapshot, enemy: EnemySlotSnapshot | null) {
  if (!enemy) return;
  const dy = enemy.y - snapshot.playerY;
  if (dy < -28) next.up = true;
  if (dy > 32) next.down = true;
}

function applyFireDecision(
  next: ButtonState,
  shouldFire: boolean,
  snapshot: GameRamSnapshot,
  target: EnemySlotSnapshot | null
) {
  if (!shouldFire) return;
  next.b = true;
  aimAtEnemy(next, snapshot, target);
}

function applyPulsedFireDecision(
  next: ButtonState,
  shouldFire: boolean,
  snapshot: GameRamSnapshot,
  target: EnemySlotSnapshot | null,
  frame: number,
  period = 8,
  activeFrames = 3
) {
  if (!shouldFire) return;
  aimAtEnemy(next, snapshot, target);
  next.b = frame % period < activeFrames;
}

function applyThreatPoolAim(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  target: EnemySlotSnapshot,
  grounded: boolean,
  frame: number
) {
  const dx = target.x - snapshot.playerX;
  const dy = target.y - snapshot.playerY;

  next.left = false;
  if (dx >= -8) next.right = true;
  if (dx < -18 && !isTurretThreat(target)) {
    next.left = true;
    next.right = false;
  }

  if (dy < -28) {
    next.up = true;
    next.down = false;
  } else if (dy > 30) {
    next.down = true;
    next.up = false;
  }

  next.b = pulseWindow(frame, 6, 3);

  if (
    grounded
    && dy < -58
    && dx > 18
    && dx < 132
    && frame % 42 < 10
  ) {
    next.a = true;
  }
}

function applyThreatPoolCombat(
  next: ButtonState,
  threatPool: ThreatPoolSnapshot,
  snapshot: GameRamSnapshot,
  grounded: boolean,
  frame: number
) {
  const target = threatPool.primaryTurret ?? threatPool.primaryThreat;
  if (!target) return false;
  applyThreatPoolAim(next, snapshot, target, grounded, frame);
  return true;
}

function friendlyBulletCanNeutralizeThreat(snapshot: GameRamSnapshot, side: PlayerSide, enemy: EnemySlotSnapshot) {
  if (isProjectileLike(enemy) || enemy.hp > 1) return false;
  return snapshot.bullets.some((bullet) => (
    bulletOwnerSide(bullet.owner) === side
    && bullet.routine === 1
    && bullet.bulletSlotCode !== 0
    && bullet.x >= snapshot.playerX - 6
    && bullet.x <= enemy.x + 18
    && Math.abs(bullet.y - enemy.y) <= 14
  ));
}

function currentFireCanNeutralizeThreat(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  side: PlayerSide,
  enemy: EnemySlotSnapshot
) {
  if (isProjectileLike(enemy) || enemy.hp > 1) return false;
  const closeDx = Math.abs(enemy.x - snapshot.playerX);
  const closeDy = Math.abs(enemy.y - snapshot.playerY);
  if (closeDx <= 24 && closeDy <= 34) return false;
  if (!next.b || !enemyIsShootableFromPlayer(snapshot, enemy, 132)) return false;
  if (next.up || next.down) {
    const dx = Math.abs(enemy.x - snapshot.playerX);
    const dy = enemy.y - snapshot.playerY;
    if (next.up && dx <= 26 && dy <= 8 && dy >= -96) return true;
    if (next.down && dx <= 26 && dy >= -8 && dy <= 96) return true;
  }
  if (enemy.x < snapshot.playerX + 10 || enemy.x > snapshot.playerX + 128) return false;
  return friendlyBulletCanNeutralizeThreat(snapshot, side, enemy)
    || Math.abs(enemy.y - snapshot.playerY) <= 42
    || next.up
    || next.down;
}

function findRewardShotTarget(snapshot: GameRamSnapshot) {
  return snapshot.enemies
    .filter((enemy) => (
      isRewardTarget(enemy)
      && enemy.x >= snapshot.playerX - 8
      && enemy.x <= snapshot.playerX + 196
      && enemy.y >= snapshot.playerY - 132
      && enemy.y <= snapshot.playerY + 22
    ))
    .sort((a, b) => (
      Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY)
    ) - (
      Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY)
    ))[0] ?? null;
}

function findSuppressiveFireTarget(snapshot: GameRamSnapshot, threatPool = buildThreatPool(snapshot)) {
  const reward = findRewardShotTarget(snapshot);
  if (reward) return reward;
  if (threatPool.primaryTurret) return threatPool.primaryTurret;
  return findBestThreat(snapshot, (enemy) => (
    enemyIsShootableFromPlayer(snapshot, enemy, isEnvironmentalTarget(enemy) ? 190 : 142)
  ));
}

function shouldSuppressiveFire(snapshot: GameRamSnapshot, target: EnemySlotSnapshot | null, frame: number) {
  if (!target) return false;
  if (isRewardTarget(target) || isEnvironmentalTarget(target)) return true;
  if (projectedCollisionRisk(snapshot, target, 24)) return true;
  if (enemyIsShootableFromPlayer(snapshot, target, 150)) return true;
  return frame % 10 < 4;
}

function shouldUseHorizonObjective(
  strategyKey: AiStrategyKey,
  horizon: StageOneHorizonSnapshot | null,
  threatPool: ThreatPoolSnapshot,
  nearestShootable: EnemySlotSnapshot | null
) {
  const target = horizon?.primary;
  if (!target || threatPool.primaryTurret) return false;
  if (target.category === "bridge") return target.distance <= 130;
  if (target.category === "reward") {
    return target.distance <= 190
      && (strategyKey === "survival-v0" || strategyKey === "combat-v0" || strategyKey === "loot-v0" || strategyKey === "personal-v0");
  }
  if (target.category === "fixed" || target.category === "boss") return target.distance <= 230;
  if (target.category === "sniper") return target.distance <= 155 && !nearestShootable;
  return false;
}

function applyHorizonAim(next: ButtonState, snapshot: GameRamSnapshot, target: StageOneHorizonTarget) {
  if (target.aim === "up") {
    next.up = true;
    next.down = false;
    return;
  }
  if (target.aim === "down") {
    next.down = true;
    next.up = false;
    return;
  }
  if (target.aim === "level") {
    next.up = false;
    next.down = false;
    return;
  }

  const dy = target.y - snapshot.playerY;
  if (dy < -28) {
    next.up = true;
    next.down = false;
  } else if (dy > 30) {
    next.down = true;
    next.up = false;
  }
}

function applyHorizonObjectiveButtons(
  next: ButtonState,
  strategyKey: AiStrategyKey,
  snapshot: GameRamSnapshot,
  horizon: StageOneHorizonSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  grounded: boolean,
  frame: number
) {
  const target = horizon.primary;
  if (!target) return false;

  const isFixedTarget = target.category === "fixed" || target.category === "boss";
  const isRewardObjective = target.category === "reward";
  const isBridgeObjective = target.category === "bridge";
  const isSniperObjective = target.category === "sniper";

  next.left = false;
  next.right = true;
  next.b = pulseWindow(frame, 6, 3);
  applyHorizonAim(next, snapshot, target);

  if (nearestShootable && !isBridgeObjective) {
    applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, nearestShootable, frame), snapshot, nearestShootable, frame, 7, 4);
  }

  if (isFixedTarget) {
    if (target.distance <= 96) next.right = frame % 36 < 14;
    if (target.category === "boss" && snapshot.playerX > 150) {
      next.right = false;
      next.left = frame % 24 < 8;
    }
    if (grounded && next.up && target.distance > 18 && target.distance < 120 && frame % 44 < 9) next.a = true;
    return true;
  }

  if (isRewardObjective) {
    if (strategyKey === "loot-v0" && target.distance < 88 && target.y < snapshot.playerY - 18 && grounded) next.a = true;
    if (target.distance < 48 && target.aim === "down") next.right = frame % 24 < 14;
    return true;
  }

  if (isBridgeObjective) {
    next.b = frame % 8 < 5;
    if (grounded && target.distance <= 32 && target.distance >= -56) next.a = true;
    return true;
  }

  if (isSniperObjective) {
    if (target.distance < 92 && target.aim === "down") {
      next.right = frame % 26 < 14;
      next.down = true;
      next.up = false;
    }
    return true;
  }

  return true;
}

function findImmediateDangerThreat(snapshot: GameRamSnapshot) {
  const bodyThreat = findNearestThreat(snapshot, (enemy) => (
    isDynamicThreat(enemy)
    && projectedCollisionRisk(snapshot, enemy, 30)
    && Math.abs(enemy.x - snapshot.playerX) < 62
    && Math.abs(enemy.y - snapshot.playerY) < 56
  ));
  if (bodyThreat) return bodyThreat;

  return findNearestThreat(snapshot, (enemy) => (
    isProjectileLike(enemy)
    && enemy.x >= snapshot.playerX - 44
    && enemy.x <= snapshot.playerX + 88
    && projectedCollisionRisk(snapshot, enemy, 30)
  ));
}

function hasImmediateDanger(snapshot: GameRamSnapshot) {
  return Boolean(findImmediateDangerThreat(snapshot));
}

function playerIsDeathOrRespawn(side: PlayerSide, snapshot: GameRamSnapshot | null) {
  if (!isPlausibleRamSnapshot(snapshot)) return false;
  const fields = getPlayerDeathFields(side, snapshot);
  return fields.active
    && (
      fields.state === PLAYER_DEAD_STATE
      || fields.deathFlag !== 0
      || isNonMenuRespawnState(side, snapshot)
    );
}

function classifyAiFsmState({
  side,
  mode,
  strategyKey,
  snapshot,
  gameplayActive,
  twoPlayerActive,
  twoPlayerRequested,
  humanOverrideActive,
  routeSegment
}: {
  side: PlayerSide;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  snapshot: GameRamSnapshot | null;
  gameplayActive: boolean;
  twoPlayerActive: boolean;
  twoPlayerRequested: boolean;
  humanOverrideActive: boolean;
  routeSegment: StageRouteSegment | null;
}): Pick<AiFsmState, "state" | "reason"> {
  if (mode === "human") return { state: "idle", reason: "human-control" };
  if (!aiStrategyWritesInput(strategyKey)) return { state: "idle", reason: "ai-disabled" };
  if (mode === "hybrid" && humanOverrideActive) return { state: "idle", reason: "human-override" };
  if (side === "2P" && !twoPlayerActive) {
    return {
      state: "coop-wait",
      reason: twoPlayerRequested ? "waiting-two-player-start" : "inactive-two-player"
    };
  }
  if (!snapshot) return { state: "menu", reason: "waiting-ram" };
  if (playerIsDeathOrRespawn(side, snapshot)) return { state: "respawn", reason: "death-or-respawn" };
  if (!gameplayActive) {
    if (isStartableMenuState(snapshot)) {
      if (side === "1P" && twoPlayerRequested && !twoPlayerActive) {
        return { state: "menu", reason: "select-two-player" };
      }
      return { state: "menu", reason: "press-start" };
    }
    return { state: "idle", reason: "game-not-active" };
  }
  if (routeSegment?.action === "hold-fire" || (snapshot.level === STAGE_ONE_LEVEL_INDEX && snapshot.worldX >= STAGE_ONE_BOSS_WALL_WORLD_X)) {
    return { state: "boss", reason: routeSegment ? `route:${routeSegment.id}` : "boss-zone" };
  }
  if (findImmediateDangerThreat(snapshot)) return { state: "danger", reason: "immediate-threat" };
  if (buildThreatPool(snapshot).primaryTurret) return { state: "attack", reason: "threat-pool-turret" };
  const horizon = buildStageOneHorizon(snapshot);
  if (horizon?.primary && horizon.combatReadiness && horizon.primary.distance <= 180) {
    return { state: "attack", reason: `horizon:${horizon.primary.category}` };
  }
  if (findBestThreat(snapshot, (enemy) => enemyIsShootableFromPlayer(snapshot, enemy))) {
    return { state: "attack", reason: "shootable-threat" };
  }
  return { state: "advance", reason: routeSegment ? `route:${routeSegment.id}` : "fallback-advance" };
}

function transitionAiFsmState(previous: AiFsmState, next: Pick<AiFsmState, "state" | "reason">, frame: number): AiFsmState {
  if (previous.state === next.state && previous.reason === next.reason) return previous;
  return {
    state: next.state,
    reason: next.reason,
    sinceFrame: frame
  };
}

function rewardTargetAhead(snapshot: GameRamSnapshot) {
  return snapshot.enemies
    .filter((enemy) => isRewardTarget(enemy) && enemy.x >= snapshot.playerX - 24)
    .sort((a, b) => Math.abs(a.x - snapshot.playerX) - Math.abs(b.x - snapshot.playerX))[0] ?? null;
}

function shouldRouteFire(segment: StageRouteSegment | null, nearestShootable: EnemySlotSnapshot | null, frame: number) {
  if (!segment) return Boolean(nearestShootable) || frame % 18 < 6;
  if (segment.fire === "always") return true;
  if (segment.fire === "threat") return Boolean(nearestShootable);
  return Boolean(nearestShootable) || frame % 16 < 5;
}

function shouldRouteJump(segment: StageRouteSegment | null, grounded: boolean, immediateDanger: boolean, frame: number) {
  if (!grounded) return false;
  if (immediateDanger) return true;
  const jumpEvery = segment?.jumpEvery;
  return Boolean(jumpEvery && jumpEvery > 0 && frame % jumpEvery < 8);
}

function applyRouteAdvance(
  next: ButtonState,
  segment: StageRouteSegment | null,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  immediateDanger: boolean,
  grounded: boolean,
  frame: number
) {
  next.right = true;
  applyFireDecision(next, shouldRouteFire(segment, nearestShootable, frame), snapshot, nearestShootable);
  if (shouldRouteJump(segment, grounded, immediateDanger, frame)) next.a = true;
}

function applyRouteCautious(
  next: ButtonState,
  segment: StageRouteSegment | null,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  immediateDanger: boolean,
  grounded: boolean,
  frame: number
) {
  const nearbyThreatCount = snapshot.enemies.filter((enemy) => (
    enemy.threat
    && enemy.x >= snapshot.playerX - 20
    && enemy.x <= snapshot.playerX + 128
    && Math.abs(enemy.y - snapshot.playerY) < 90
  )).length;
  next.right = !immediateDanger && nearbyThreatCount < 3;
  applyFireDecision(next, shouldRouteFire(segment, nearestShootable, frame), snapshot, nearestShootable);
  if (nearestShootable?.x !== undefined && nearestShootable.x < snapshot.playerX - 8) {
    next.right = false;
    next.left = frame % 20 < 6;
  }
  if (shouldRouteJump(segment, grounded, immediateDanger, frame)) next.a = true;
}

function applyRouteHoldFire(
  next: ButtonState,
  segment: StageRouteSegment | null,
  snapshot: GameRamSnapshot,
  immediateDanger: boolean,
  grounded: boolean,
  frame: number
) {
  const bossTarget = findBestThreat(snapshot, (enemy) => enemyIsShootableFromPlayer(snapshot, enemy, 190));
  applyFireDecision(next, true, snapshot, bossTarget);
  if (snapshot.bossDefeated) {
    next.right = true;
    return;
  }
  if (snapshot.playerX > 166) next.left = frame % 24 < 10;
  if (snapshot.playerX < 96 && frame % 36 < 12) next.right = true;
  if (shouldRouteJump(segment, grounded, immediateDanger, frame)) next.a = true;
}

function applyRouteLoot(
  next: ButtonState,
  segment: StageRouteSegment | null,
  snapshot: GameRamSnapshot,
  rewardTarget: EnemySlotSnapshot | null,
  nearestShootable: EnemySlotSnapshot | null,
  immediateDanger: boolean,
  grounded: boolean,
  frame: number
) {
  if (rewardTarget) {
    horizontalDecision(next, snapshot.playerX, rewardTarget.x, 10);
    applyFireDecision(
      next,
      true,
      snapshot,
      rewardTarget
    );
    if (grounded && rewardTarget.y < snapshot.playerY - 20 && Math.abs(rewardTarget.x - snapshot.playerX) < 56) next.a = true;
    return;
  }
  applyRouteAdvance(next, segment, snapshot, nearestShootable, immediateDanger, grounded, frame);
}

function applyRouteGuard(
  next: ButtonState,
  segment: StageRouteSegment | null,
  snapshot: GameRamSnapshot,
  immediateDanger: boolean,
  grounded: boolean,
  frame: number
) {
  const guardedThreat = findNearestThreat(snapshot, (enemy) => (
    Math.abs(enemy.x - snapshot.playerX) < 132
    && Math.abs(enemy.y - snapshot.playerY) < 92
  ));
  if (guardedThreat) {
    applyFireDecision(next, true, snapshot, guardedThreat);
    if (guardedThreat.x > snapshot.playerX + 112) next.right = true;
    if (guardedThreat.x < snapshot.playerX - 18) next.left = true;
    if (shouldRouteJump(segment, grounded, immediateDanger, frame)) next.a = true;
    return;
  }
  next.right = frame % 42 < 14;
  applyFireDecision(next, shouldRouteFire(segment, guardedThreat, frame), snapshot, guardedThreat);
  if (shouldRouteJump(segment, grounded, immediateDanger, frame)) next.a = true;
}

function applyRouteSurvive(
  next: ButtonState,
  segment: StageRouteSegment | null,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  immediateDanger: boolean,
  grounded: boolean,
  frame: number
) {
  const closeThreat = findNearestThreat(snapshot, (enemy) => (
    Math.abs(enemy.x - snapshot.playerX) < 56
    && Math.abs(enemy.y - snapshot.playerY) < 58
  ));
  const forwardThreatCount = snapshot.enemies.filter((enemy) => (
    enemy.threat
    && enemy.x >= snapshot.playerX - 18
    && enemy.x <= snapshot.playerX + 118
    && Math.abs(enemy.y - snapshot.playerY) < 84
  )).length;

  applyFireDecision(next, shouldRouteFire(segment, nearestShootable ?? closeThreat, frame), snapshot, nearestShootable ?? closeThreat);

  if (closeThreat) {
    if (grounded) next.a = true;
    if (closeThreat.x < snapshot.playerX - 4) {
      next.right = true;
    } else {
      next.right = frame % 24 < 8;
    }
    return;
  }

  if (forwardThreatCount >= 3) {
    if (grounded && frame % 34 < 7) next.a = true;
    next.right = frame % 44 < 14;
    return;
  }

  next.right = !immediateDanger && frame % 36 < 25;
  if (shouldRouteJump(segment, grounded, immediateDanger, frame)) next.a = true;
}

function applyOpeningSurvivalRoute(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  grounded: boolean,
  frame: number
) {
  const immediateThreat = findImmediateDangerThreat(snapshot);
  const target = nearestShootable ?? immediateThreat;
  next.right = true;
  applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, target, frame), snapshot, target, frame, 6, 3);

  if (
    grounded
    && immediateThreat
    && Math.abs(immediateThreat.x - snapshot.playerX) < 28
    && Math.abs(immediateThreat.y - snapshot.playerY) < 38
  ) {
    next.a = true;
  }
}

function isStageOneBridgeRegion(snapshot: GameRamSnapshot) {
  return snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= 520
    && snapshot.worldX <= 860;
}

function pulseWindow(frame: number, period: number, width: number) {
  return ((frame % period) + period) % period < width;
}

function applyFirePulse(next: ButtonState, frame: number, period = 6, width = 3) {
  next.b = pulseWindow(frame, period, width);
}

function matchesStageOnePatch(snapshot: GameRamSnapshot, patch: StageOneButtonPatch) {
  if (snapshot.level !== STAGE_ONE_LEVEL_INDEX) return false;
  if (snapshot.worldX < patch.worldStart || snapshot.worldX > patch.worldEnd) return false;
  if (typeof patch.yMin === "number" && snapshot.playerY < patch.yMin) return false;
  if (typeof patch.yMax === "number" && snapshot.playerY > patch.yMax) return false;
  if (patch.jumpState === "grounded" && snapshot.jumpState !== 0) return false;
  if (patch.jumpState === "airborne" && snapshot.jumpState === 0) return false;
  return true;
}

function applyStageOneButtonPatch(next: ButtonState, patch: StageOneButtonPatch, frame: number) {
  buttonNames.forEach((button) => {
    const held = patch.hold[button];
    if (typeof held === "boolean") next[button] = held;
    const pulse = patch.pulse?.[button];
    if (pulse) next[button] = pulseWindow(frame, pulse.period, pulse.width);
  });
}

function applyStageOneBossApproachPatches(next: ButtonState, snapshot: GameRamSnapshot, frame: number) {
  const patch = stageOneBossApproachPatches
    .filter((candidate) => matchesStageOnePatch(snapshot, candidate))
    .sort((a, b) => b.priority - a.priority)[0];
  if (!patch) return false;
  applyStageOneButtonPatch(next, patch, frame);
  return true;
}

function isStageOneBossWallCombatRegion(snapshot: GameRamSnapshot | null) {
  return Boolean(
    snapshot
    && snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= STAGE_ONE_BOSS_WALL_WORLD_X
    && !snapshot.bossDefeated
  );
}

function findStageOneBossWallTarget(snapshot: GameRamSnapshot) {
  const lowLaneBossTarget = snapshot.playerY >= 150 ? findBestThreat(snapshot, (enemy) => (
    enemy.hp > 0
    && (enemy.type === 0x11 || enemy.kind === "boss")
    && enemy.x >= snapshot.playerX - 24
    && enemy.x <= snapshot.playerX + 220
    && enemy.y >= snapshot.playerY - 48
    && enemy.y <= snapshot.playerY + 72
  )) : null;
  if (lowLaneBossTarget) return lowLaneBossTarget;

  const lowLaneTurret = snapshot.playerY >= 150 ? findBestThreat(snapshot, (enemy) => (
    isTurretThreat(enemy)
    && enemy.hp > 0
    && enemy.x >= snapshot.playerX - 72
    && enemy.x <= snapshot.playerX + 180
    && enemy.y >= snapshot.playerY - 8
    && enemy.y <= snapshot.playerY + 72
  )) : null;
  if (lowLaneTurret) return lowLaneTurret;

  const bossSideTurret = findBestThreat(snapshot, (enemy) => (
    enemy.hp > 0
    && enemy.type === 0x10
    && enemy.x >= snapshot.playerX - 24
    && enemy.x <= snapshot.playerX + 220
    && enemy.y >= snapshot.playerY - 96
    && enemy.y <= snapshot.playerY + 96
  ));
  if (bossSideTurret) return bossSideTurret;

  const bossTarget = findBestThreat(snapshot, (enemy) => (
    enemy.hp > 0
    && (enemy.type === 0x11 || enemy.kind === "boss")
    && enemy.x >= snapshot.playerX - 24
    && enemy.x <= snapshot.playerX + 220
    && enemy.y >= snapshot.playerY - 96
    && enemy.y <= snapshot.playerY + 96
  ));
  if (bossTarget) return bossTarget;

  return findBestThreat(snapshot, (enemy) => (
    isTurretThreat(enemy)
    && enemy.hp > 0
    && enemy.x >= snapshot.playerX - 24
    && enemy.x <= snapshot.playerX + 220
    && enemy.y >= snapshot.playerY - 96
    && enemy.y <= snapshot.playerY + 96
  ));
}

function applyStageOneBossWallCombat(next: ButtonState, snapshot: GameRamSnapshot, frame: number) {
  if (!isStageOneBossWallCombatRegion(snapshot)) return false;
  const target = findStageOneBossWallTarget(snapshot);
  const tooCloseToWall = (snapshot.worldX >= 3172 && snapshot.playerY < 150) || snapshot.playerX > 146;
  const needsSmallAdvance = snapshot.worldX < 3068 || snapshot.playerX < 116;
  const dx = target ? target.x - snapshot.playerX : 0;
  const dy = target ? target.y - snapshot.playerY : 0;

  next.a = false;
  next.b = pulseWindow(frame, 6, 3);
  next.left = false;
  next.right = false;
  next.up = false;
  next.down = false;

  const microAction = decideBossWallMicroAction(snapshot, frame);
  if (microAction) {
    buttonNames.forEach((button) => {
      next[button] = microAction.buttons[button];
    });
    return true;
  }

  if (
    snapshot.worldX >= 2968
    && snapshot.worldX <= 2992
    && snapshot.playerY <= 140
    && snapshot.jumpState === 0
  ) {
    next.a = true;
    next.right = true;
    return true;
  }

  if (
    snapshot.worldX >= 2968
    && snapshot.worldX <= 3138
    && snapshot.jumpState !== 0
  ) {
    next.right = true;
    return true;
  }

  if (snapshot.worldX >= 2960 && snapshot.worldX < 3024 && snapshot.playerY < 160) {
    next.right = true;
    return true;
  }

  if (
    snapshot.worldX >= 3012
    && snapshot.worldX <= 3064
    && snapshot.playerY >= 132
    && snapshot.jumpState === 0
  ) {
    next.a = true;
    next.right = true;
    return true;
  }

  if (
    snapshot.worldX >= 3024
    && snapshot.worldX <= 3138
    && snapshot.jumpState !== 0
  ) {
    next.right = true;
    return true;
  }

  if (target) {
    if (dy < -26) {
      next.up = true;
    } else if (dy > 28) {
      next.down = true;
    }
  } else {
    next.down = true;
  }

  if (
    target
    && snapshot.playerY >= 150
    && (target.type === 0x11 || target.kind === "boss" || target.y >= snapshot.playerY + 8)
  ) {
    next.up = false;
    next.down = true;
    next.right = target.x > snapshot.playerX + 18 ? frame % 20 < 10 : false;
  }

  if (target?.type === 0x10 && Math.abs(dy) <= 20) {
    next.up = false;
    next.down = false;
    next.left = false;
    next.right = snapshot.playerX < 108 || (next.b && (snapshot.worldX < 3162 || snapshot.playerX < 112));
    return true;
  }

  if (tooCloseToWall) {
    next.left = frame % 22 < 8;
  } else if (needsSmallAdvance) {
    next.right = true;
  } else if (target && target.x > snapshot.playerX + 10) {
    next.right = dx > 64 ? frame % 30 < 12 : frame % 24 < 8;
  }

  if (next.left) next.right = false;
  return true;
}

function isBridgeLowerRoute(snapshot: GameRamSnapshot) {
  return snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= 820
    && snapshot.worldX <= 1120
    && snapshot.playerY >= 196;
}

function isStageOneLowerRouteKillZone(snapshot: GameRamSnapshot) {
  return snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= 1080
    && snapshot.worldX <= 1320
    && snapshot.playerY >= 188;
}

function lowerRouteCloseThreatScore(snapshot: GameRamSnapshot, enemy: EnemySlotSnapshot) {
  const dx = enemy.x - snapshot.playerX;
  const dy = enemy.y - snapshot.playerY;
  const distance = Math.abs(dx) + Math.abs(dy);
  const contact = Math.abs(dx) <= 26 && Math.abs(dy) <= 30 ? 90 : 0;
  const ahead = dx >= -4 ? 42 : 0;
  const overhead = dy < 0 && Math.abs(dx) <= 34 ? 64 : 0;
  const behindPenalty = dx < -20 ? 38 : 0;
  return contact + ahead + overhead - behindPenalty - distance;
}

function findLowerRouteCloseBodyThreat(snapshot: GameRamSnapshot) {
  if (!isStageOneLowerRouteKillZone(snapshot)) return null;
  return snapshot.enemies
    .filter((enemy) => (
      enemy.threat
      && isDynamicThreat(enemy)
      && enemy.x >= snapshot.playerX - 36
      && enemy.x <= snapshot.playerX + 58
      && enemy.y >= snapshot.playerY - 82
      && enemy.y <= snapshot.playerY + 40
    ))
    .sort((a, b) => lowerRouteCloseThreatScore(snapshot, b) - lowerRouteCloseThreatScore(snapshot, a))[0] ?? null;
}

function findLowerRouteTurret(snapshot: GameRamSnapshot) {
  if (!isStageOneLowerRouteKillZone(snapshot)) return null;
  return findBestThreat(snapshot, (enemy) => (
    isTurretThreat(enemy)
    && enemy.hp > 0
    && enemy.x >= snapshot.playerX + 18
    && enemy.x <= snapshot.playerX + 220
    && enemy.y >= snapshot.playerY - 118
    && enemy.y <= snapshot.playerY - 16
  ));
}

function applyStageOneHighTurretStrafe(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 1628
    || snapshot.worldX > 1685
  ) {
    return false;
  }

  next.a = false;
  next.b = true;
  next.up = snapshot.playerY >= 188;
  next.down = snapshot.playerY < 188;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneLateLowerRouteGuard(next: ButtonState, snapshot: GameRamSnapshot, frame: number) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 1685
    || snapshot.worldX > 1788
    || snapshot.playerY < 188
  ) {
    return false;
  }

  const bodyBlocker = findBestThreat(snapshot, (enemy) => (
    isDynamicThreat(enemy)
    && enemy.x >= snapshot.playerX - 8
    && enemy.x <= snapshot.playerX + 48
    && enemy.y >= snapshot.playerY - 34
    && enemy.y <= snapshot.playerY + 26
  ));
  if (bodyBlocker) {
    const dy = bodyBlocker.y - snapshot.playerY;
    next.a = false;
    next.b = true;
    next.up = false;
    next.down = dy < -10;
    next.left = false;
    next.right = dy < -10;
    return true;
  }

  const turret = findBestThreat(snapshot, (enemy) => (
    isTurretThreat(enemy)
    && enemy.hp > 0
    && enemy.x >= snapshot.playerX - 72
    && enemy.x <= snapshot.playerX + 190
    && enemy.y < snapshot.playerY - 42
  ));

  next.a = false;
  next.b = turret ? true : pulseWindow(frame, 8, 4);
  next.up = Boolean(turret);
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneLatePitJump(next: ButtonState, snapshot: GameRamSnapshot, frame: number) {
  const inJumpWindow = [
    { start: 1916, end: 2055, minY: 120 },
    { start: 2060, end: 2065, minY: 144 },
    { start: 2068, end: 2138, minY: 160 },
    { start: 2132, end: 2200, minY: 148 },
    { start: 2264, end: 2332, minY: 132 }
  ].some(({ start, end, minY }) => (
    snapshot.worldX >= start
    && snapshot.worldX <= end
    && snapshot.playerY >= minY
  ));
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || !inJumpWindow
  ) {
    return false;
  }

  const horizon = buildStageOneHorizon(snapshot);
  if (stageOneSpreadTurretSuppressionPatch({ ...snapshot, horizon }, snapshot.jumpState === 0, frame)) {
    return false;
  }

  const spreadJumpEdgePatch = stageOneSpreadJumpEdgePatch({ ...snapshot, horizon }, snapshot.jumpState === 0, frame);
  if (spreadJumpEdgePatch) {
    applyStageOneRewardTacticsPatch(next, spreadJumpEdgePatch);
    return true;
  }

  const bossApproachJumpEdgePatch = stageOneBossApproachJumpEdgePatch({ ...snapshot, horizon }, snapshot.jumpState === 0, frame);
  if (bossApproachJumpEdgePatch) {
    applyStageOneRewardTacticsPatch(next, bossApproachJumpEdgePatch);
    return true;
  }

  next.a = true;
  next.b = pulseWindow(frame, 8, 4);
  next.up = false;
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossApproachAirGuard(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2150
    || snapshot.worldX > 2190
    || snapshot.playerY >= 140
  ) {
    return false;
  }

  const lowerBodyThreat = findBestThreat(snapshot, (enemy) => (
    isDynamicThreat(enemy)
    && enemy.x >= snapshot.playerX - 8
    && enemy.x <= snapshot.playerX + 68
    && enemy.y >= snapshot.playerY + 18
    && enemy.y <= snapshot.playerY + 58
  ));
  if (!lowerBodyThreat) return false;

  next.b = true;
  next.up = false;
  next.down = true;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossApproachGroundThreatPass(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2336
    || snapshot.worldX > 2380
    || snapshot.playerY < 188
  ) {
    return false;
  }

  const overheadThreat = findBestThreat(snapshot, (enemy) => (
    enemy.threat
    && isDynamicThreat(enemy)
    && enemy.x >= snapshot.playerX - 18
    && enemy.x <= snapshot.playerX + 46
    && enemy.y >= snapshot.playerY - 74
    && enemy.y <= snapshot.playerY - 14
  ));
  if (!overheadThreat) return false;

  next.a = false;
  next.b = true;
  next.up = true;
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossApproachCloseBody(next: ButtonState, snapshot: GameRamSnapshot, frame: number) {
  const patch = stageOneBossApproachCloseBodyPatch(snapshot, frame);
  if (!patch) return false;
  applyStageOneRewardTacticsPatch(next, patch);
  return true;
}

function applyStageOneBossApproachPlatformJump(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const patch = stageOneBossApproachPlatformJumpPatch(snapshot, grounded, frame);
  if (!patch) return false;
  applyStageOneRewardTacticsPatch(next, patch);
  return true;
}

function applyStageOneBossApproachHighEdgeJump(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const patch = stageOneBossApproachHighEdgeJumpPatch(snapshot, grounded, frame);
  if (!patch) return false;
  applyStageOneRewardTacticsPatch(next, patch);
  return true;
}

function applyStageOneBossApproachHighAirCarry(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const patch = stageOneBossApproachHighAirCarryPatch(snapshot, grounded, frame);
  if (!patch) return false;
  applyStageOneRewardTacticsPatch(next, patch);
  return true;
}

function applyStageOneBossApproachMidPlatformCapture(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const patch = stageOneBossApproachMidPlatformCapturePatch(snapshot, grounded, frame);
  if (!patch) return false;
  applyStageOneRewardTacticsPatch(next, patch);
  return true;
}

function applyStageOneOpeningLowFixedThreat(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const openingLowFixedThreatPatch = stageOneOpeningLowFixedThreatPatch(snapshot, grounded, frame);
  if (!openingLowFixedThreatPatch) return false;
  applyStageOneRewardTacticsPatch(next, openingLowFixedThreatPatch);
  return true;
}

function applyStageOneBridgeLowFixedCrowd(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const bridgeLowFixedCrowdPatch = stageOneBridgeLowFixedCrowdPatch(snapshot, grounded, frame);
  if (!bridgeLowFixedCrowdPatch) return false;
  applyStageOneRewardTacticsPatch(next, bridgeLowFixedCrowdPatch);
  return true;
}

function applyStageOneDangerLowLaneFall(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const dangerLowLaneFallPatch = stageOneDangerLowLaneFallPatch(snapshot, grounded, frame);
  if (!dangerLowLaneFallPatch) return false;
  applyStageOneRewardTacticsPatch(next, dangerLowLaneFallPatch);
  return true;
}

function stageOneSpreadTurretSuppressionPatchForSnapshot(snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  return stageOneSpreadTurretSuppressionPatch({
    ...snapshot,
    horizon: buildStageOneHorizon(snapshot)
  }, grounded, frame);
}

function applyStageOneSpreadTurretSuppression(next: ButtonState, snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const spreadTurretSuppressionPatch = stageOneSpreadTurretSuppressionPatchForSnapshot(snapshot, grounded, frame);
  if (!spreadTurretSuppressionPatch) return false;
  applyStageOneRewardTacticsPatch(next, spreadTurretSuppressionPatch);
  return true;
}

function applyStageOneBossApproachLowerEdgeJump(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2366
    || snapshot.worldX > 2406
    || snapshot.playerY < 196
    || snapshot.playerY > 224
  ) {
    return false;
  }

  next.a = true;
  next.b = true;
  next.up = true;
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossApproachUpperPlatformHold(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2418
    || snapshot.worldX > 2492
    || snapshot.playerY < 104
    || snapshot.playerY > 188
  ) {
    return false;
  }

  next.a = false;
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossApproachUpperEdgeJump(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2450
    || snapshot.worldX > 2462
    || snapshot.playerY < 160
    || snapshot.playerY > 178
  ) {
    return false;
  }

  next.a = true;
  next.b = true;
  next.up = false;
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossApproachAirCarry(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2527
    || snapshot.worldX > 2620
    || snapshot.jumpState === 0
    || snapshot.playerY < 96
    || snapshot.playerY > 232
  ) {
    return false;
  }

  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyStageOneBossWallFinalJump(next: ButtonState, snapshot: GameRamSnapshot) {
  if (
    snapshot.level !== STAGE_ONE_LEVEL_INDEX
    || snapshot.worldX < 2908
    || snapshot.worldX > 2942
    || snapshot.playerY < 160
    || snapshot.playerY > 232
    || snapshot.jumpState !== 0
  ) {
    return false;
  }

  next.a = true;
  next.b = true;
  next.up = false;
  next.down = false;
  next.left = false;
  next.right = true;
  return true;
}

function applyLowerRouteKillBox(next: ButtonState, snapshot: GameRamSnapshot, frame: number) {
  if (snapshot.worldX >= 1200 && snapshot.worldX <= 1320 && snapshot.playerY >= 188) {
    const turret = findLowerRouteTurret(snapshot);
    next.a = false;
    next.b = true;
    next.up = Boolean(turret && turret.y < snapshot.playerY - 34);
    next.down = false;
    next.left = false;
    next.right = true;
    return true;
  }

  const closeThreat = findLowerRouteCloseBodyThreat(snapshot);
  if (closeThreat) {
    const dx = closeThreat.x - snapshot.playerX;
    const dy = closeThreat.y - snapshot.playerY;
    const overheadDrop = closeThreat.y < snapshot.playerY - 18 && Math.abs(dx) <= 24;
    const contactRisk = Math.abs(dx) <= 26 && Math.abs(dy) <= 30;
    const sameLaneAhead = dx > 0 && dx <= 58 && Math.abs(dy) <= 38;

    next.a = false;
    next.b = true;
    next.up = !sameLaneAhead && !overheadDrop && !contactRisk && closeThreat.y < snapshot.playerY - 30;
    next.down = closeThreat.y > snapshot.playerY + 26;
    next.left = sameLaneAhead ? false : contactRisk ? dx >= 0 && snapshot.playerX > 112 : overheadDrop ? dx >= 0 && snapshot.playerX > 112 : dx < -8;
    next.right = sameLaneAhead ? false : contactRisk ? dx < 0 : overheadDrop ? dx < 0 : dx > 34;
    return true;
  }

  const turret = findLowerRouteTurret(snapshot);
  if (!turret) return false;

  const dx = turret.x - snapshot.playerX;
  const incomingProjectile = findNearestThreat(snapshot, (enemy) => (
    isProjectileLike(enemy)
    && projectedCollisionRisk(snapshot, enemy, 18)
  ));
  next.a = false;
  next.b = true;
  next.left = !incomingProjectile && dx < 38 && pulseWindow(frame, 36, 8);
  next.right = !incomingProjectile && dx > 72;
  next.up = turret.y < snapshot.playerY - 26;
  next.down = turret.y > snapshot.playerY + 32;
  return true;
}

function shouldBridgeJump(snapshot: GameRamSnapshot, grounded: boolean, frame: number) {
  const worldX = snapshot.worldX;
  const releaseJumpWindows: Array<[number, number]> = [
    [730, 775],
    [836, 870],
    [932, 952]
  ];
  if (releaseJumpWindows.some(([start, end]) => worldX >= start && worldX <= end)) return false;

  const pressJumpWindows: Array<[number, number]> = [
    [584, 616],
    [704, 728],
    [776, 835],
    [871, 931],
    [953, 990]
  ];
  if (pressJumpWindows.some(([start, end]) => worldX >= start && worldX <= end)) return true;
  if (worldX >= 780 && worldX <= 1040 && snapshot.playerY >= 188) return true;

  const broadBridgeCheckpoint = (
    (snapshot.screen === 2 && snapshot.scroll >= 0x98 && snapshot.scroll <= 0xd8)
    || (snapshot.screen === 3 && snapshot.scroll >= 0x30 && snapshot.scroll <= 0xc8)
  );
  if (broadBridgeCheckpoint) return pulseWindow(frame, 32, 12);

  if (grounded && isBridgeLowerRoute(snapshot)) return pulseWindow(frame, 24, 10);
  return false;
}

function isBridgeJumpCommitWindow(snapshot: GameRamSnapshot) {
  if (snapshot.level !== STAGE_ONE_LEVEL_INDEX) return false;
  return (snapshot.worldX >= 584 && snapshot.worldX <= 616)
    || (snapshot.worldX >= 704 && snapshot.worldX <= 728)
    || (snapshot.worldX >= 752 && snapshot.worldX <= 900)
    || (snapshot.screen === 2 && snapshot.scroll >= 0x98 && snapshot.scroll <= 0xd8)
    || (snapshot.screen === 3 && snapshot.scroll >= 0x30 && snapshot.scroll <= 0xc8);
}

function applyFirstWeaponCapsulePoint(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  frame: number
) {
  const reward = findRewardShotTarget(snapshot);
  const target = reward ?? nearestShootable;
  const forceUpShot = snapshot.worldX >= 320 && snapshot.worldX <= 395;
  next.right = true;
  next.left = false;
  applyPulsedFireDecision(next, Boolean(target) || forceUpShot, snapshot, target, frame, 6, 4);
  if (forceUpShot || (reward && reward.y < snapshot.playerY - 24)) {
    next.up = true;
    next.down = false;
    next.b = frame % 5 < 4;
  }
}

function applyBridgeJumpRoute(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  grounded: boolean,
  frame: number
) {
  if (isBridgeLowerRoute(snapshot)) {
    next.right = true;
    next.left = false;
    next.down = false;
    next.up = false;
    applyFirePulse(next, frame);
    next.a = pulseWindow(frame, 24, 10);
    return;
  }

  const projectileRisk = findNearestThreat(snapshot, (enemy) => (
    isProjectileLike(enemy)
    && projectedCollisionRisk(snapshot, enemy, 18)
  ));
  const target = nearestShootable ?? projectileRisk;
  next.right = true;
  next.left = false;
  applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, target, frame) || frame % 18 < 4, snapshot, target, frame, 7, 4);
  if (shouldBridgeJump(snapshot, grounded, frame) || (grounded && projectileRisk)) {
    next.a = true;
    next.right = true;
    next.left = false;
    next.down = false;
  }
}

function applyFirstBridgeWeaponPoint(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  grounded: boolean,
  frame: number
) {
  const reward = findRewardShotTarget(snapshot);
  const target = reward ?? nearestShootable;
  const bridgeApproachLowerShot = snapshot.worldX >= 392 && snapshot.worldX < 520;
  const bridgeUpRightAimWindow = snapshot.worldX >= 532 && snapshot.worldX < 548;
  const bridgeStationaryUpAimWindow = snapshot.worldX >= 548 && snapshot.worldX <= 562;
  const bridgeAimWindow = bridgeUpRightAimWindow || bridgeStationaryUpAimWindow;
  const bridgeLowerShotWindow = snapshot.worldX >= 568 && snapshot.worldX <= 620;
  const bridgeLateLowerShotWindow = snapshot.worldX >= 668 && snapshot.worldX <= 688;
  const forceLowerShot = bridgeLowerShotWindow || bridgeLateLowerShotWindow;
  const forceWeaponShot = snapshot.worldX >= 500 && snapshot.worldX <= 690;
  const stationaryAimRightPulse = bridgeStationaryUpAimWindow && frame % 30 < 8;
  next.right = !bridgeAimWindow || bridgeUpRightAimWindow || stationaryAimRightPulse;
  next.left = false;
  applyPulsedFireDecision(next, Boolean(target) || forceWeaponShot, snapshot, target, frame, 6, 4);
  if (bridgeApproachLowerShot) {
    next.up = false;
    next.down = true;
    next.right = frame % 26 < 16;
    applyFirePulse(next, frame, 6, 4);
  } else if (forceLowerShot) {
    next.up = false;
    next.down = true;
    next.right = true;
    applyFirePulse(next, frame, 6, 4);
  } else if (bridgeAimWindow || (reward && reward.y < snapshot.playerY - 24)) {
    next.up = true;
    next.down = false;
    next.right = bridgeUpRightAimWindow || stationaryAimRightPulse;
    applyFirePulse(next, frame, 6, 4);
  }
  if (shouldBridgeJump(snapshot, grounded, frame)) {
    next.a = true;
    next.right = true;
    next.left = false;
    next.down = false;
  }
}

function isStageOneCriticalScriptWindow(snapshot: GameRamSnapshot) {
  if (snapshot.level !== STAGE_ONE_LEVEL_INDEX) return false;
  return isBridgeJumpCommitWindow(snapshot)
    || (snapshot.worldX >= 392 && snapshot.worldX <= 520)
    || (snapshot.worldX >= 532 && snapshot.worldX <= 620)
    || (snapshot.worldX >= 668 && snapshot.worldX <= 688)
    || (snapshot.worldX >= 1235 && snapshot.worldX <= 2100)
    || (snapshot.worldX >= 2760 && snapshot.worldX <= 2860)
    || isStageOneBossWallCombatRegion(snapshot);
}

function applyStageOneRewardTacticsPatch(next: ButtonState, patch: StageOneRewardButtonPatch) {
  if (typeof patch.up === "boolean") next.up = patch.up;
  if (typeof patch.down === "boolean") next.down = patch.down;
  if (typeof patch.left === "boolean") next.left = patch.left;
  if (typeof patch.right === "boolean") next.right = patch.right;
  if (typeof patch.a === "boolean") next.a = patch.a;
  if (typeof patch.b === "boolean") next.b = patch.b;
}

function applyMidFixedHpPoint(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  grounded: boolean,
  frame: number
) {
  if (snapshot.worldX < 1120 && isBridgeLowerRoute(snapshot)) {
    next.right = true;
    next.left = false;
    next.up = false;
    next.down = false;
    applyFirePulse(next, frame, 6, 4);
    next.a = pulseWindow(frame, 18, 12);
    return;
  }

  const horizon = buildStageOneHorizon(snapshot);
  const midFixedCloseBodyCoverPatch = stageOneMidFixedCloseBodyCoverPatch(snapshot, grounded, frame);
  if (midFixedCloseBodyCoverPatch) {
    applyStageOneRewardTacticsPatch(next, midFixedCloseBodyCoverPatch);
    return;
  }

  const midFixedThreatRecoveryPatch = stageOneMidFixedThreatRecoveryPatch(snapshot, grounded, frame);
  if (midFixedThreatRecoveryPatch) {
    applyStageOneRewardTacticsPatch(next, midFixedThreatRecoveryPatch);
    return;
  }

  const mandatorySpreadGatePatch = stageOneMandatorySpreadGatePatch({
    ...snapshot,
    horizon
  }, grounded, frame);
  if (mandatorySpreadGatePatch) {
    applyStageOneRewardTacticsPatch(next, mandatorySpreadGatePatch);
    return;
  }

  const spreadTurretSuppressionPatch = stageOneSpreadTurretSuppressionPatch({
    ...snapshot,
    horizon
  }, grounded, frame);
  if (spreadTurretSuppressionPatch) {
    applyStageOneRewardTacticsPatch(next, spreadTurretSuppressionPatch);
    return;
  }

  const closeBodyThreatPatch = stageOneCloseBodyThreatPatch(snapshot, grounded, frame);
  if (closeBodyThreatPatch) {
    applyStageOneRewardTacticsPatch(next, closeBodyThreatPatch);
    return;
  }

  const spreadExitJumpPatch = stageOneSpreadExitJumpPatch({
    ...snapshot,
    horizon
  }, grounded, frame);
  if (spreadExitJumpPatch) {
    applyStageOneRewardTacticsPatch(next, spreadExitJumpPatch);
    return;
  }

  const spreadRushPatch = stageOneSpreadRushPatch({
    ...snapshot,
    horizon
  }, grounded, frame);
  if (spreadRushPatch) {
    applyStageOneRewardTacticsPatch(next, spreadRushPatch);
    return;
  }

  const redTurretLowThreatPatch = stageOneRedTurretLowThreatPatch({
    ...snapshot,
    horizon
  }, grounded, frame);
  if (redTurretLowThreatPatch) {
    applyStageOneRewardTacticsPatch(next, redTurretLowThreatPatch);
    return;
  }

  const fallingThreatPatch = rewardStationFallingThreatPatch(snapshot, grounded, frame);
  if (fallingThreatPatch) {
    applyStageOneRewardTacticsPatch(next, fallingThreatPatch);
    return;
  }

  const midTurretBreakoutPatch = midWeaponTurretBreakoutPatch({
    horizon,
    level: snapshot.level,
    playerY: snapshot.playerY,
    weapon: snapshot.weapon,
    worldX: snapshot.worldX
  }, grounded, frame);
  if (midTurretBreakoutPatch) {
    applyStageOneRewardTacticsPatch(next, midTurretBreakoutPatch);
    return;
  }

  const rewardOverride = midFixedScriptRewardOverride(horizon);
  if (rewardOverride) {
    next.left = false;
    next.right = rewardOverride.distance > 12;
    applyHorizonAim(next, snapshot, rewardOverride);
    next.b = frame % 5 < 4;
    next.a = false;
    return;
  }
  const fixedHorizonTarget = horizon?.fixedAhead ?? (
    horizon?.primary && (horizon.primary.category === "fixed" || horizon.primary.category === "boss")
      ? horizon.primary
      : null
  );
  const fixedTarget = findBestThreat(snapshot, (enemy) => (
    isEnvironmentalTarget(enemy)
    && enemy.hp > 0
    && enemy.x >= snapshot.playerX - 24
    && enemy.x <= snapshot.playerX + 220
    && Math.abs(enemy.y - snapshot.playerY) <= 132
  ));
  const target = fixedTarget ?? nearestShootable;

  if (fixedTarget) {
    const dx = fixedTarget.x - snapshot.playerX;
    next.left = false;
    next.right = dx > 118 || (dx > 18 && frame % 30 < 14);
    applyPulsedFireDecision(next, true, snapshot, fixedTarget, frame, 6, 4);
    next.a = false;
    return;
  }

  if (fixedHorizonTarget && fixedHorizonTarget.distance >= 0 && fixedHorizonTarget.distance <= 220) {
    next.left = false;
    applyHorizonAim(next, snapshot, fixedHorizonTarget);
    if (fixedHorizonTarget.distance > 118) {
      next.right = true;
    } else if (fixedHorizonTarget.distance > 44) {
      next.right = frame % 30 < 14;
    } else {
      next.right = frame % 34 < 8;
    }
    applyFirePulse(next, frame, 6, 4);
    next.a = false;
    return;
  }

  if (!target) {
    next.right = true;
    return;
  }

  const dx = target.x - snapshot.playerX;
  next.right = dx > 118 || (dx > 18 && frame % 30 < 14);
  next.left = false;
  applyPulsedFireDecision(next, true, snapshot, target, frame, 7, 4);
  if (grounded && projectedCollisionRisk(snapshot, target, 18) && !isEnvironmentalTarget(target)) next.a = true;
}

function applyStageOneScriptAction(
  next: ButtonState,
  action: StageOneScriptAction,
  snapshot: GameRamSnapshot,
  nearestShootable: EnemySlotSnapshot | null,
  grounded: boolean,
  frame: number
) {
  if (action.mode === "first-weapon") {
    applyFirstWeaponCapsulePoint(next, snapshot, nearestShootable, frame);
    return true;
  }
  if (action.mode === "reward-shot") {
    applyFirstBridgeWeaponPoint(next, snapshot, nearestShootable, grounded, frame);
    return true;
  }
  if (action.mode === "bridge-jump") {
    applyBridgeJumpRoute(next, snapshot, nearestShootable, grounded, frame);
    return true;
  }
  if (action.mode === "fixed-hp-fire") {
    applyMidFixedHpPoint(next, snapshot, nearestShootable, grounded, frame);
    return true;
  }
  return false;
}

function applyTacticalSafetyLayer(
  next: ButtonState,
  strategyKey: AiStrategyKey,
  side: PlayerSide,
  snapshot: GameRamSnapshot,
  grounded: boolean,
  frame: number
) {
  const immediateThreat = findImmediateDangerThreat(snapshot);
  if (!immediateThreat) return next;

  applyFireDecision(next, true, snapshot, immediateThreat);

  const threatAhead = immediateThreat.x >= snapshot.playerX - 4;
  const threatBehind = immediateThreat.x < snapshot.playerX - 10;
  const canRetreat = strategyKey !== "speedrun-v0" || frame % 18 < 10;
  const fireWillResolveThreat = currentFireCanNeutralizeThreat(next, snapshot, side, immediateThreat);

  if (grounded && !fireWillResolveThreat) next.a = true;

  if (threatAhead && canRetreat && !fireWillResolveThreat) {
    next.right = false;
  } else if (threatBehind) {
    next.left = false;
    next.right = true;
  }

  return next;
}

function findVisibleCombatTarget(snapshot: GameRamSnapshot) {
  return findBestThreat(snapshot, (enemy) => (
    enemy.x >= snapshot.playerX - 12
    && enemy.x <= snapshot.playerX + 190
    && Math.abs(enemy.y - snapshot.playerY) <= 132
  ));
}

function applyCombatTriggerLayer(next: ButtonState, snapshot: GameRamSnapshot) {
  const threatPool = buildThreatPool(snapshot);
  const horizon = buildStageOneHorizon(snapshot);
  const visibleTarget = threatPool.primaryTurret ?? findVisibleCombatTarget(snapshot);
  const horizonTarget = horizon?.primary ?? null;
  const horizonCombatTarget = Boolean(
    horizonTarget
    && horizonTarget.distance >= -28
    && horizonTarget.distance <= 220
    && horizonTarget.category !== "bridge"
  );

  if (visibleTarget && !next.up && !next.down) {
    aimAtEnemy(next, snapshot, visibleTarget);
  } else if (horizonTarget && horizonCombatTarget && !next.up && !next.down) {
    applyHorizonAim(next, snapshot, horizonTarget);
  }

  const plannedFire = Boolean(
    isBridgeJumpCommitWindow(snapshot)
    || Boolean(visibleTarget)
    || (!visibleTarget && horizonCombatTarget)
    || next.b
  );
  next.b = next.b || (plannedFire && pulseWindow(snapshot.frame, 6, 3));

  if (isBridgeJumpCommitWindow(snapshot)) {
    next.right = true;
    next.left = false;
    next.down = false;
  }

  return next;
}

function applyScriptedProjectileSafetyLayer(
  next: ButtonState,
  snapshot: GameRamSnapshot,
  grounded: boolean
) {
  const incomingProjectile = findNearestThreat(snapshot, (enemy) => (
    isProjectileLike(enemy)
    && enemy.x >= snapshot.playerX - 42
    && enemy.x <= snapshot.playerX + 104
    && projectedCollisionRisk(snapshot, enemy, 18)
  ));
  if (!incomingProjectile) return next;

  applyFireDecision(next, true, snapshot, incomingProjectile);
  if (grounded) next.a = true;
  if (incomingProjectile.x < snapshot.playerX - 8) {
    next.left = false;
    next.right = true;
  }
  return next;
}

function applyCoopSpacing(next: ButtonState, actorSnapshot: GameRamSnapshot, teammateSnapshot: GameRamSnapshot, frame: number) {
  if (!teammateSnapshot.twoPlayerActive) return false;
  const worldGap = actorSnapshot.worldX - teammateSnapshot.worldX;
  if (worldGap < -32) {
    next.right = true;
    next.left = false;
    return true;
  }
  if (worldGap > 64) {
    next.left = true;
    next.right = false;
    return true;
  }
  next.right = frame % 42 < 10;
  return true;
}

function applyForcedAdvanceBias(next: ButtonState, loopExit: AiLoopExitState, snapshot: GameRamSnapshot) {
  if (loopExit.forcedAdvanceBias <= 0.5) return next;
  if (findLowerRouteCloseBodyThreat(snapshot) || findLowerRouteTurret(snapshot)) return next;
  const bodyThreat = findImmediateDangerThreat(snapshot);
  if (bodyThreat && !isProjectileLike(bodyThreat)) return next;
  const incomingProjectile = findNearestThreat(snapshot, (enemy) => (
    isProjectileLike(enemy)
    && projectedCollisionRisk(snapshot, enemy, 18)
  ));
  if (!incomingProjectile) {
    next.right = true;
    next.left = false;
  }
  return next;
}

function finalizeTacticalButtons(
  next: ButtonState,
  strategyKey: AiStrategyKey,
  side: PlayerSide,
  snapshot: GameRamSnapshot,
  grounded: boolean,
  frame: number,
  loopExit: AiLoopExitState
) {
  const tacticalButtons = applyTacticalSafetyLayer(applyCombatTriggerLayer(next, snapshot), strategyKey, side, snapshot, grounded, frame);
  const midFixedCloseBodyCoverPatch = stageOneMidFixedCloseBodyCoverPatch(snapshot, grounded, frame);
  if (midFixedCloseBodyCoverPatch) {
    applyStageOneRewardTacticsPatch(tacticalButtons, midFixedCloseBodyCoverPatch);
  }
  applyStageOneHighTurretStrafe(tacticalButtons, snapshot);
  applyStageOneLateLowerRouteGuard(tacticalButtons, snapshot, frame);
  applyStageOneLatePitJump(tacticalButtons, snapshot, frame);
  applyStageOneBossApproachAirGuard(tacticalButtons, snapshot);
  applyStageOneBossApproachGroundThreatPass(tacticalButtons, snapshot);
  applyStageOneBossApproachHighEdgeJump(tacticalButtons, snapshot, grounded, frame);
  applyStageOneBossApproachPlatformJump(tacticalButtons, snapshot, grounded, frame);
  applyStageOneBossApproachCloseBody(tacticalButtons, snapshot, frame);
  applyStageOneBossApproachHighAirCarry(tacticalButtons, snapshot, grounded, frame);
  applyStageOneBossApproachMidPlatformCapture(tacticalButtons, snapshot, grounded, frame);
  applyLowerRouteKillBox(tacticalButtons, snapshot, frame);
  applyStageOneBossApproachLowerEdgeJump(tacticalButtons, snapshot);
  applyStageOneBossApproachUpperPlatformHold(tacticalButtons, snapshot);
  applyStageOneBossApproachUpperEdgeJump(tacticalButtons, snapshot);
  applyStageOneBossApproachAirCarry(tacticalButtons, snapshot);
  applyStageOneBossApproachPatches(tacticalButtons, snapshot, frame);
  applyStageOneBossWallFinalJump(tacticalButtons, snapshot);
  applyStageOneBossWallCombat(tacticalButtons, snapshot, frame);
  const forcedButtons = applyForcedAdvanceBias(tacticalButtons, loopExit, snapshot);
  applyStageOneOpeningLowFixedThreat(forcedButtons, snapshot, grounded, frame);
  applyStageOneBridgeLowFixedCrowd(forcedButtons, snapshot, grounded, frame);
  applyStageOneDangerLowLaneFall(forcedButtons, snapshot, grounded, frame);
  applyStageOneSpreadTurretSuppression(forcedButtons, snapshot, grounded, frame);
  return forcedButtons;
}

function finalizeStageOneScriptButtons(
  next: ButtonState,
  strategyKey: AiStrategyKey,
  side: PlayerSide,
  snapshot: GameRamSnapshot,
  grounded: boolean,
  frame: number,
  loopExit: AiLoopExitState
) {
  if (isStageOneCriticalScriptWindow(snapshot)) {
    const midFixedCloseBodyCoverPatch = stageOneMidFixedCloseBodyCoverPatch(snapshot, grounded, frame);
    if (midFixedCloseBodyCoverPatch) {
      applyStageOneRewardTacticsPatch(next, midFixedCloseBodyCoverPatch);
    }
    applyStageOneHighTurretStrafe(next, snapshot);
    applyStageOneLateLowerRouteGuard(next, snapshot, frame);
    applyStageOneLatePitJump(next, snapshot, frame);
    applyStageOneBossApproachAirGuard(next, snapshot);
    applyStageOneBossApproachGroundThreatPass(next, snapshot);
    applyStageOneBossApproachHighEdgeJump(next, snapshot, grounded, frame);
    applyStageOneBossApproachPlatformJump(next, snapshot, grounded, frame);
    applyStageOneBossApproachCloseBody(next, snapshot, frame);
    applyStageOneBossApproachHighAirCarry(next, snapshot, grounded, frame);
    applyStageOneBossApproachMidPlatformCapture(next, snapshot, grounded, frame);
    applyLowerRouteKillBox(next, snapshot, frame);
    applyStageOneBossApproachLowerEdgeJump(next, snapshot);
    applyStageOneBossApproachUpperPlatformHold(next, snapshot);
    applyStageOneBossApproachUpperEdgeJump(next, snapshot);
    applyStageOneBossApproachAirCarry(next, snapshot);
    applyStageOneBossApproachPatches(next, snapshot, frame);
    applyStageOneBossWallFinalJump(next, snapshot);
    applyStageOneBossWallCombat(next, snapshot, frame);
    return applyForcedAdvanceBias(next, loopExit, snapshot);
  }
  const scriptedButtons = applyScriptedProjectileSafetyLayer(
    applyTacticalSafetyLayer(applyCombatTriggerLayer(next, snapshot), strategyKey, side, snapshot, grounded, frame),
    snapshot,
    grounded
  );
  const midFixedCloseBodyCoverPatch = stageOneMidFixedCloseBodyCoverPatch(snapshot, grounded, frame);
  if (midFixedCloseBodyCoverPatch) {
    applyStageOneRewardTacticsPatch(scriptedButtons, midFixedCloseBodyCoverPatch);
  }
  applyStageOneHighTurretStrafe(scriptedButtons, snapshot);
  applyStageOneLateLowerRouteGuard(scriptedButtons, snapshot, frame);
  applyStageOneLatePitJump(scriptedButtons, snapshot, frame);
  applyStageOneBossApproachAirGuard(scriptedButtons, snapshot);
  applyStageOneBossApproachGroundThreatPass(scriptedButtons, snapshot);
  applyStageOneBossApproachHighEdgeJump(scriptedButtons, snapshot, grounded, frame);
  applyStageOneBossApproachPlatformJump(scriptedButtons, snapshot, grounded, frame);
  applyStageOneBossApproachCloseBody(scriptedButtons, snapshot, frame);
  applyStageOneBossApproachHighAirCarry(scriptedButtons, snapshot, grounded, frame);
  applyStageOneBossApproachMidPlatformCapture(scriptedButtons, snapshot, grounded, frame);
  applyLowerRouteKillBox(scriptedButtons, snapshot, frame);
  applyStageOneBossApproachLowerEdgeJump(scriptedButtons, snapshot);
  applyStageOneBossApproachUpperPlatformHold(scriptedButtons, snapshot);
  applyStageOneBossApproachUpperEdgeJump(scriptedButtons, snapshot);
  applyStageOneBossApproachAirCarry(scriptedButtons, snapshot);
  applyStageOneBossApproachPatches(scriptedButtons, snapshot, frame);
  applyStageOneBossWallFinalJump(scriptedButtons, snapshot);
  applyStageOneBossWallCombat(scriptedButtons, snapshot, frame);
  return applyForcedAdvanceBias(scriptedButtons, loopExit, snapshot);
}

function decideTacticalAiButtons(
  strategyKey: AiStrategyKey,
  side: PlayerSide,
  snapshot: GameRamSnapshot,
  frame: number,
  strategyPlan: StageStrategyPlan | null,
  fsmState: AiFsmState,
  teamSnapshot: GameRamSnapshot | null,
  loopExit: AiLoopExitState,
  bossWallPhaseState: BossWallPhaseState
) {
  const next = createButtonState();
  const immediateDanger = hasImmediateDanger(snapshot);
  const threatPool = buildThreatPool(snapshot);
  const horizon = buildStageOneHorizon(snapshot);
  const nearestShootable = findSuppressiveFireTarget(snapshot, threatPool);
  const rewardTarget = rewardTargetAhead(snapshot);
  const grounded = isGrounded(snapshot, side);
  const routeSegment = activeRouteSegmentForPlan(snapshot, strategyPlan);
  const scriptAction = activeStageOneScriptAction(snapshot);

  if (strategyKey === "survival-v0" && snapshot.level === STAGE_ONE_LEVEL_INDEX && snapshot.worldX < 320) {
    applyOpeningSurvivalRoute(next, snapshot, nearestShootable, grounded, frame);
    return applyForcedAdvanceBias(next, loopExit, snapshot);
  }

  const bossWallPhaseDecision = strategyKey === "survival-v0"
    ? decideBossWallPhaseAction(snapshot, bossWallPhaseState, frame)
    : null;
  const bossWallPhaseOwnsControl = shouldBypassAiActionLockForBossWallPhase(snapshot, bossWallPhaseState);
  if (bossWallPhaseOwnsControl && bossWallPhaseDecision) {
    buttonNames.forEach((button) => {
      next[button] = bossWallPhaseDecision.buttons[button];
    });
    return next;
  }

  const bossWallSafetyAction = strategyKey === "survival-v0"
    ? decideBossWallMicroAction(snapshot, frame)
    : null;
  if (bossWallSafetyAction && shouldUseBossWallPhaseSafetyOverride(bossWallSafetyAction.reason)) {
    const clampedButtons = applyBossWallPhaseContainmentClamp(snapshot, bossWallPhaseState, bossWallSafetyAction.buttons);
    buttonNames.forEach((button) => {
      next[button] = clampedButtons[button];
    });
    return next;
  }

  if (bossWallPhaseDecision) {
    buttonNames.forEach((button) => {
      next[button] = bossWallPhaseDecision.buttons[button];
    });
    return next;
  }

  const mandatorySpreadGatePatch = strategyKey === "survival-v0"
    ? stageOneMandatorySpreadGatePatch({
      ...snapshot,
      horizon
    }, grounded, frame)
    : null;
  if (mandatorySpreadGatePatch) {
    applyStageOneRewardTacticsPatch(next, mandatorySpreadGatePatch);
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (strategyKey === "survival-v0" && scriptAction) {
    applyStageOneScriptAction(next, scriptAction, snapshot, nearestShootable, grounded, frame);
    return finalizeStageOneScriptButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (fsmState.state === "boss") {
    applyRouteHoldFire(next, routeSegment, snapshot, immediateDanger, grounded, frame);
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (fsmState.state === "danger") {
    applyRouteSurvive(next, routeSegment, snapshot, nearestShootable, immediateDanger, grounded, frame);
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (threatPool.primaryTurret && (strategyKey === "survival-v0" || strategyKey === "combat-v0" || fsmState.reason === "threat-pool-turret")) {
    applyThreatPoolCombat(next, threatPool, snapshot, grounded, frame);
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (horizon && shouldUseHorizonObjective(strategyKey, horizon, threatPool, nearestShootable)) {
    applyHorizonObjectiveButtons(next, strategyKey, snapshot, horizon, nearestShootable, grounded, frame);
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (fsmState.state === "attack" && nearestShootable) {
    if (isTurretThreat(nearestShootable)) {
      applyThreatPoolAim(next, snapshot, nearestShootable, grounded, frame);
    } else {
      applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, nearestShootable, frame), snapshot, nearestShootable, frame);
      if (nearestShootable.x > snapshot.playerX + 132) next.right = true;
      if (nearestShootable.x < snapshot.playerX - 12) next.left = true;
    }
    return applyForcedAdvanceBias(next, loopExit, snapshot);
  }

  if (routeSegment) {
    if (routeSegment.action === "advance") {
      applyRouteAdvance(next, routeSegment, snapshot, nearestShootable, immediateDanger, grounded, frame);
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    if (routeSegment.action === "cautious") {
      applyRouteCautious(next, routeSegment, snapshot, nearestShootable, immediateDanger, grounded, frame);
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    if (routeSegment.action === "hold-fire") {
      applyRouteHoldFire(next, routeSegment, snapshot, immediateDanger, grounded, frame);
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    if (routeSegment.action === "loot") {
      applyRouteLoot(next, routeSegment, snapshot, rewardTarget, nearestShootable, immediateDanger, grounded, frame);
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    if (routeSegment.action === "guard") {
      applyRouteGuard(next, routeSegment, snapshot, immediateDanger, grounded, frame);
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    if (routeSegment.action === "survive") {
      applyRouteSurvive(next, routeSegment, snapshot, nearestShootable, immediateDanger, grounded, frame);
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
  }

  if (strategyKey === "survival-v0") {
    applyRouteSurvive(next, null, snapshot, nearestShootable, immediateDanger, grounded, frame);
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (strategyKey === "speedrun-v0" || strategyKey === "rules-v0") {
    next.right = true;
    applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, nearestShootable, frame), snapshot, nearestShootable, frame, 10, 3);
    if (grounded && (immediateDanger || frame % 170 < 8)) next.a = true;
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (strategyKey === "combat-v0") {
    if (nearestShootable) {
      applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, nearestShootable, frame), snapshot, nearestShootable, frame, 8, 4);
      if (nearestShootable.x > snapshot.playerX + 96) next.right = true;
      if (nearestShootable.x < snapshot.playerX - 12) next.left = true;
      if (grounded && immediateDanger) next.a = true;
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    next.right = true;
    applyPulsedFireDecision(next, frame % 24 < 3, snapshot, nearestShootable, frame, 12, 2);
    if (grounded && immediateDanger) next.a = true;
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (strategyKey === "loot-v0") {
    if (rewardTarget) {
      horizontalDecision(next, snapshot.playerX, rewardTarget.x, 10);
      applyFireDecision(next, true, snapshot, rewardTarget);
      if (grounded && rewardTarget.y < snapshot.playerY - 20 && Math.abs(rewardTarget.x - snapshot.playerX) < 52) next.a = true;
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    next.right = true;
    applyPulsedFireDecision(next, shouldSuppressiveFire(snapshot, nearestShootable, frame), snapshot, nearestShootable, frame, 10, 3);
    if (grounded && immediateDanger) next.a = true;
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  if (strategyKey === "guard-v0" || strategyKey === "follow-test") {
    const guardAnchor = side === "2P" && teamSnapshot ? teamSnapshot : snapshot;
    const guardedThreat = findBestThreat(guardAnchor, (enemy) => (
      Math.abs(enemy.x - guardAnchor.playerX) < 128
      && Math.abs(enemy.y - guardAnchor.playerY) < 90
    ));
    if (guardedThreat) {
      applyFireDecision(next, true, snapshot, guardedThreat);
      if (guardedThreat.x > snapshot.playerX + 112) next.right = true;
      if (guardedThreat.x < snapshot.playerX - 18) next.left = true;
      if (side === "2P" && teamSnapshot) applyCoopSpacing(next, snapshot, teamSnapshot, frame);
      if (grounded && immediateDanger) next.a = true;
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    if (side === "2P" && teamSnapshot && applyCoopSpacing(next, snapshot, teamSnapshot, frame)) {
      applyFireDecision(next, frame % 22 < 6, snapshot, null);
      if (grounded && immediateDanger) next.a = true;
      return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
    }
    next.right = frame % 36 < 12;
    applyFireDecision(next, frame % 18 < 6, snapshot, guardedThreat);
    if (grounded && immediateDanger) next.a = true;
    return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
  }

  return finalizeTacticalButtons(next, strategyKey, side, snapshot, grounded, frame, loopExit);
}

function decideAiButtons({
  side,
  mode,
  strategyKey,
  strategyPlan,
  snapshot,
  gameplayActive,
  twoPlayerActive,
  twoPlayerRequested,
  humanOverrideActive,
  mirrorButtons,
  frame,
  fsmState,
  teamSnapshot,
  loopExit,
  bossWallPhaseState
}: {
  side: PlayerSide;
  mode: ControlMode;
  strategyKey: AiStrategyKey;
  strategyPlan: StageStrategyPlan | null;
  snapshot: GameRamSnapshot | null;
  gameplayActive: boolean;
  twoPlayerActive: boolean;
  twoPlayerRequested: boolean;
  humanOverrideActive: boolean;
  mirrorButtons: ButtonState;
  frame: number;
  fsmState: AiFsmState;
  teamSnapshot: GameRamSnapshot | null;
  loopExit: AiLoopExitState;
  bossWallPhaseState: BossWallPhaseState;
}) {
  const next = createButtonState();
  if (mode === "human" || strategyKey === "off" || strategyKey === "placeholder") return next;
  if (side === "2P" && !twoPlayerActive) return next;
  if (mode === "hybrid" && humanOverrideActive) return next;

  if (strategyKey === "input-mirror") {
    return cloneButtonState(mirrorButtons);
  }

  if (!snapshot || !gameplayActive) return next;

  return decideTacticalAiButtons(strategyKey, side, snapshot, frame, strategyPlan, fsmState, teamSnapshot, loopExit, bossWallPhaseState);
}

function aiStrategyWritesInput(strategyKey: AiStrategyKey) {
  return strategyKey !== "off" && strategyKey !== "placeholder";
}

function formatScore(score: number) {
  return score.toLocaleString("en-US");
}

function weaponNameFromCode(code: number, language: UiLanguage = DEFAULT_LANGUAGE) {
  if (code === 0x01) return language === "en-US" ? "M Gun" : "M机枪";
  if (code === 0x02) return language === "en-US" ? "F Fire" : "F火焰";
  if (code === 0x03) return language === "en-US" ? "S Spread" : "S散弹";
  if (code === 0x04) return language === "en-US" ? "L Laser" : "L激光";
  return language === "en-US" ? "Normal" : "普通";
}

function currentWeaponLabel(rawWeapon: number, language: UiLanguage = DEFAULT_LANGUAGE) {
  const parts = [weaponNameFromCode(rawWeapon & 0x0f, language)];
  if ((rawWeapon & 0x10) !== 0) parts.push(language === "en-US" ? "R Rapid" : "R速射");
  return parts.join(" + ");
}

function totalWeaponPickups(weapons: Record<WeaponMetricKey, number>) {
  return Object.values(weapons).reduce((sum, value) => sum + value, 0);
}

function formatByte(value: number) {
  return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

function boolText(value: boolean) {
  return value ? "是" : "否";
}

function playerStateLabel(state: number) {
  if (state === PLAYER_ALIVE_STATE) return "存活";
  if (state === PLAYER_DEAD_STATE) return "死亡";
  if (state === 0) return "未入局";
  return `状态 ${formatByte(state)}`;
}

function activeInputText(buttons: ButtonState, language: UiLanguage = DEFAULT_LANGUAGE) {
  return activeButtonLabel(buttons, language);
}

function bulletOwnerLabel(owner: number) {
  if (owner === 0) return "1P";
  if (owner === 1) return "2P";
  return `未知 ${formatByte(owner)}`;
}

function countBulletsForOwner(bullets: PlayerBulletSnapshot[], owner: number) {
  return bullets.filter((bullet) => bullet.owner === owner).length;
}

function rewardCount(enemies: EnemySlotSnapshot[]) {
  return enemies.filter(isRewardTarget).length;
}

function threatPoolTargetLabel(enemy: EnemySlotSnapshot | null) {
  if (!enemy) return "none";
  return `slot${enemy.slot}:type${formatByte(enemy.type)}@${enemy.x},${enemy.y}/hp${enemy.hp}`;
}

function routePlanSummary(strategyKey: AiStrategyKey, plans: LoadedStrategyPlans) {
  const plan = planForStrategy(strategyKey, plans);
  if (!plan) return "无路线";
  return `${getAiStrategyLabel(strategyKey)} / ${plan.segments.length} 段`;
}

function buildPilotMetricGroups(
  side: PlayerSide,
  mode: ControlMode,
  buttons: ButtonState,
  metrics: PlayerMetrics,
  ramSnapshot: GameRamSnapshot | null,
  gameplayActive: boolean,
  runtimeStatus: RuntimeStatus,
  language: UiLanguage
): MetricGroup[] {
  const hasRam = Boolean(ramSnapshot);
  const threatCount = ramSnapshot?.enemies.filter((enemy) => enemy.threat).length ?? 0;
  const isP1 = side === "1P";
  const twoPlayerActive = Boolean(ramSnapshot?.twoPlayerActive);
  const sideStatsActive = gameplayActive && (isP1 || twoPlayerActive);
  const sideStatsAvailable = isP1 || twoPlayerActive;
  const pendingSideStats = hasRam ? t(language, "value.waitingTwoPlayer") : t(language, "value.waitingRam");
  const statsState = runtimeStatus === "paused"
    ? t(language, "value.paused")
    : sideStatsActive
      ? t(language, "value.inGame")
      : side === "2P" && !twoPlayerActive ? t(language, "value.waitingTwoPlayer") : t(language, "value.notInGame");
  const sideScore = hasRam ? scoreForSide(ramSnapshot, side) : metrics.score;
  const rawWeapon = weaponForSide(ramSnapshot, side);
  const combatValue = (key: CombatMetricKey) => sideStatsAvailable ? `${metrics.combat[key]}` : pendingSideStats;
  const weaponValue = (key: WeaponMetricKey) => sideStatsAvailable ? `${metrics.weapons[key]}` : pendingSideStats;
  const sideCoordinates = ramSnapshot ? playerCoordinateFields(side, ramSnapshot) : null;
  const routeValue = sideCoordinates ? `WorldX ${sideCoordinates.worldX}` : t(language, "value.waitingRam");

  return [
    {
      title: t(language, "metric.results"),
      items: [
        { label: t(language, "metric.infantry"), value: combatValue("infantry"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.turret"), value: combatValue("turret"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.flying"), value: combatValue("flying"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.bossParts"), value: combatValue("boss"), status: sideStatsAvailable ? "derived" : "pending" }
      ]
    },
    {
      title: t(language, "metric.weaponPickups"),
      items: [
        { label: t(language, "metric.weaponM"), value: weaponValue("m"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.weaponS"), value: weaponValue("s"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.weaponF"), value: weaponValue("f"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.weaponL"), value: weaponValue("l"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.weaponR"), value: weaponValue("r"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.weaponB"), value: weaponValue("b"), status: sideStatsAvailable ? "derived" : "pending" },
        { label: t(language, "metric.currentWeapon"), value: sideStatsAvailable && hasRam ? currentWeaponLabel(rawWeapon, language) : pendingSideStats, status: sideStatsAvailable && hasRam ? "real" : "pending" },
        { label: t(language, "metric.weaponTotal"), value: sideStatsAvailable ? `${totalWeaponPickups(metrics.weapons)}` : pendingSideStats, status: sideStatsAvailable ? "derived" : "pending" }
      ]
    },
    {
      title: t(language, "metric.behavior"),
      items: [
        { label: t(language, "metric.move"), value: `${metrics.moves}`, status: "real" },
        { label: t(language, "metric.jump"), value: `${metrics.jumps}`, status: "real" },
        { label: t(language, "metric.fireHeld"), value: `${metrics.shots}`, status: "real" },
        { label: t(language, "metric.bulletSpawn"), value: `${metrics.bulletSpawns}`, status: "derived" }
      ]
    },
    {
      title: t(language, "metric.state"),
      items: [
        { label: t(language, "metric.score"), value: hasRam ? formatScore(sideScore) : t(language, "value.waitingRam"), status: hasRam ? "real" : "pending" },
        { label: t(language, "metric.deaths"), value: sideStatsAvailable ? `${metrics.deaths}` : pendingSideStats, status: sideStatsAvailable ? "real" : "pending" },
        { label: t(language, "metric.currentButtons"), value: activeButtonLabel(buttons, language), status: "real" },
        { label: t(language, "metric.stats"), value: statsState, status: "mode" },
        { label: t(language, "metric.route"), value: sideStatsAvailable && sideCoordinates ? routeValue : pendingSideStats, status: sideStatsAvailable && hasRam ? "real" : "pending" },
        { label: t(language, "metric.danger"), value: hasRam ? `${threatCount} ${t(language, "value.threatSuffix")}` : t(language, "value.waitingDanger"), status: hasRam ? "real" : "pending" },
        { label: t(language, "metric.twoPlayer"), value: twoPlayerActive ? t(language, "value.detected") : t(language, "value.waiting1P"), status: twoPlayerActive ? "real" : "pending" },
        { label: t(language, "metric.authority"), value: localizedAuthorityLabel(mode, language), status: "mode" }
      ]
    }
  ];
}

function buildDialogue(mode: ControlMode, strategyKey: AiStrategyKey, language: UiLanguage) {
  if (language === "en-US") {
    if (mode === "human") {
      return ["Human is controlling; I only record input.", "AI is not writing controller input until you switch modes."];
    }
    if (strategyKey === "off" || strategyKey === "placeholder") {
      return [
        `${localizedAiStrategyLabel(strategyKey, language)} selected.`,
        "This strategy does not write actions. Switch to an active baseline when needed."
      ];
    }
    if (strategyKey === "survival-v0") {
      return ["Survival: avoid close danger first.", "When threats are dense, slow down, jump away, tap fire, then resume advance."];
    }
    if (strategyKey === "speedrun-v0") {
      return ["Speedrun: prioritize rightward progress.", "Jump on close danger and fire when a threat is ahead."];
    }
    if (strategyKey === "combat-v0") {
      return ["Combat: clear visible threats first.", "When enemies close in, stop advancing, keep firing, and try to jump away."];
    }
    if (strategyKey === "loot-v0") {
      return ["Loot: prioritize weapon boxes and flying capsules.", "Move toward reward targets, shoot them, then resume route progress."];
    }
    if (strategyKey === "guard-v0") {
      return ["Guard: protect threats around 1P first.", "2P keeps formation spacing from candidate coordinates; co-op calibration still needs real runs."];
    }
    if (strategyKey === "personal-v0") {
      return ["Personal: execute the locally saved Stage 1 route script.", "Edit WorldX segments, actions, and fire style in the strategy designer."];
    }
    if (strategyKey === "follow-test") {
      return ["Conservative follow: low-frequency advance and tap fire.", "Used for two-player companion input stability tests."];
    }
    if (mode === "ai") {
      return [
        `${localizedAiStrategyLabel(strategyKey, language)} selected.`,
        "Route + danger + action lock V0 is writing controller input; full co-op FSM is pending."
      ];
    }
    return [
      "Hybrid mode: human input has priority.",
      `${localizedAiStrategyLabel(strategyKey, language)} assists when there is no human input.`
    ];
  }

  if (mode === "human") {
    return ["人类正在控制，我只记录输入。", "AI 不写入手柄，等待你切换模式。"];
  }
  if (strategyKey === "off" || strategyKey === "placeholder") {
    return [
      `${getAiStrategyLabel(strategyKey)} 已选择。`,
      "当前策略不会写入动作，可切换到规则基线 V0。"
    ];
  }
  if (strategyKey === "survival-v0") {
    return ["稳健生存：优先避开近身危险。", "威胁过密时放慢推进，先跳开、点射，再继续前进。"];
  }
  if (strategyKey === "speedrun-v0") {
    return ["快速推进候选：复用 TAS/FCEUX 基准窗口。", "当前仍有 WorldX 625 死亡反例，必须真实跑局验证后才能升级。"];
  }
  if (strategyKey === "combat-v0") {
    return ["清敌优先：先处理屏幕威胁。", "敌人靠近时会停推进、持续射击并尝试跳开。"];
  }
  if (strategyKey === "loot-v0") {
    return ["奖励优先：优先追武器箱和飞行胶囊。", "发现奖励目标时会靠近并射击，之后恢复推进。"];
  }
  if (strategyKey === "guard-v0") {
    return ["护卫队友：优先保护 1P 周围威胁。", "2P 会用候选坐标保持队形距离，仍需双人局实测校准。"];
  }
  if (strategyKey === "personal-v0") {
    return ["个人策略：执行本地保存的第一关路线脚本。", "可在策略设计窗口修改 WorldX 段落、动作和开火方式。"];
  }
  if (strategyKey === "follow-test") {
    return ["保守跟随：低频推进和点射。", "用于双人陪玩输入稳定性测试。"];
  }
  if (mode === "ai") {
    return [
      `${getAiStrategyLabel(strategyKey)} 已选择。`,
      "路线 + 危险 + 动作锁 V0 正在写入手柄，完整协作 FSM 待接入。"
    ];
  }
  return [
    "混合模式：人类输入优先。",
    `${getAiStrategyLabel(strategyKey)} 在无人类输入时补助操作。`
  ];
}

function buildPilotDialogue(side: PlayerSide, mode: ControlMode, strategyKey: AiStrategyKey, ramSnapshot: GameRamSnapshot | null, language: UiLanguage) {
  if (side === "2P" && mode !== "human" && !ramSnapshot?.twoPlayerActive) {
    if (language === "en-US") {
      return [
        "2P is waiting for two-player mode.",
        "Use 1P on the game menu to start a two-player run first."
      ];
    }
    return [
      "2P 等待双人模式启动。",
      "请先由 1P 在游戏菜单选择双人模式。"
    ];
  }
  return buildDialogue(mode, strategyKey, language);
}

function buildDataStream(
  side: PlayerSide,
  mode: ControlMode,
  strategyKey: AiStrategyKey,
  lastInput: string,
  ramSnapshot: GameRamSnapshot | null,
  gameplayActive: boolean,
  runtimeStatus: RuntimeStatus,
  strategyPlans: LoadedStrategyPlans,
  actionLock: AiActionLockState,
  fsmState: AiFsmState,
  loopExit: AiLoopExitState,
  buttons: ButtonState
) {
  const aiControlActive = mode !== "human" && aiStrategyWritesInput(strategyKey);
  const inputAllowed = aiControlActive
    && (side === "1P" || Boolean(ramSnapshot?.twoPlayerActive));
  const streamSnapshot = tacticalSnapshotForSide(ramSnapshot, side);
  const route = routeLineForStrategy(strategyKey, streamSnapshot, strategyPlans);
  const scriptAction = activeStageOneScriptAction(streamSnapshot);
  const threatPool = streamSnapshot ? buildThreatPool(streamSnapshot) : null;
  const horizon = buildStageOneHorizon(streamSnapshot);
  const lines = [
    `${side}.mode=${mode}`,
    `${side}.strategy=${strategyKey}`,
    `${side}.lastInput=${lastInput}`,
    `${side}.finalButtons=${activeButtonLabel(buttons, "en-US")}`,
    `runtime.status=${runtimeStatus}`,
    `ai.behavior=${aiStrategyBehaviorTag(strategyKey)}`,
    `route.segment=${route.segment}`,
    `route.action=${route.action}`,
    `script.action=${scriptAction?.id ?? "none"}`,
    `script.mode=${scriptAction?.mode ?? "none"}`,
    `ai.write=${inputAllowed ? "enabled" : "idle"}`,
    `twoPlayer.active=${ramSnapshot?.twoPlayerActive ? "true" : "false"}`,
    `ram.schema=${ramSnapshot ? "active" : "pending"}`,
    `gameplay.active=${gameplayActive ? "true" : "false"}`,
    `fsm.state=${aiControlActive ? fsmState.state : "idle"}`,
    `fsm.reason=${aiControlActive ? fsmState.reason : "input-disabled"}`,
    `fsm.sinceFrame=${aiControlActive ? fsmState.sinceFrame : 0}`,
    `action.lock=${inputAllowed ? aiActionLockLabel(actionLock) : "idle"}`,
    `loop.exit=${aiControlActive ? aiLoopExitLabel(loopExit) : "idle"}`,
    `loop.bias=${aiControlActive ? loopExit.forcedAdvanceBias.toFixed(2) : "0.00"}`,
    `threat.pool=${threatPool ? `active:${threatPool.active.length}/turret:${threatPool.turrets.length}/dyn:${threatPool.dynamicThreats.length}/proj:${threatPool.projectiles.length}` : "pending"}`,
    `threat.readiness=${threatPool?.combatReadiness ? "armed" : "idle"}`,
    `threat.primary=${threatPool ? threatPoolTargetLabel(threatPool.primaryTurret ?? threatPool.primaryThreat) : "pending"}`,
    `horizon.next=${horizon ? horizonTargetLabel(horizon.primary) : "pending"}`,
    `horizon.category=${horizon?.primary ? horizonCategoryLabel(horizon.primary.category) : "none"}`,
    `horizon.near=${horizon ? `${horizon.near.length}/${horizon.upcoming.length}` : "pending"}`
  ];
  if (ramSnapshot && streamSnapshot) {
    lines.splice(4, 0, `ram.level=${ramSnapshot.level}`);
    lines.splice(5, 0, `ram.screen=${ramSnapshot.screen}`);
    lines.splice(6, 0, `ram.frame=${streamSnapshot.frame}`);
    lines.splice(7, 0, `ram.worldX=${streamSnapshot.worldX}`);
    lines.splice(8, 0, `ram.playerX=${streamSnapshot.playerX}`);
    lines.splice(9, 0, `ram.playerY=${streamSnapshot.playerY}`);
    lines.splice(10, 0, `ram.enemies=${ramSnapshot.enemies.length}`);
    lines.splice(11, 0, `ram.playerMode=${ramSnapshot.playerMode}`);
    lines.splice(12, 0, `ram.modeAlt=${ramSnapshot.playerModeAlt}`);
    lines.splice(13, 0, `ram.bullets=${ramSnapshot.bullets.length}`);
    if (side === "1P") {
      lines.splice(14, 0, `p1.score=${ramSnapshot.p1Score}`);
      lines.splice(15, 0, `p1.weapon=${ramSnapshot.weapon}`);
      lines.splice(16, 0, `p1.state=${ramSnapshot.p1State}`);
      lines.splice(17, 0, `p1.deathFlag=${ramSnapshot.deathFlag}`);
    } else {
      lines.splice(14, 0, `p2.score=${ramSnapshot.p2Score}`);
      lines.splice(15, 0, `p2.weapon=${ramSnapshot.p2Weapon}`);
      lines.splice(16, 0, `p2.state=${ramSnapshot.p2State}`);
      lines.splice(17, 0, `p2.deathFlag=${ramSnapshot.p2DeathFlag}`);
      lines.splice(18, 0, `p2.gameOver=${ramSnapshot.p2GameOver}`);
      lines.splice(19, 0, `p2.xCandidate=${ramSnapshot.p2PlayerX}`);
      lines.splice(20, 0, `p2.yCandidate=${ramSnapshot.p2PlayerY}`);
      lines.splice(21, 0, `p2.worldXCandidate=${ramSnapshot.p2WorldX}`);
    }
  }
  return lines;
}

function strategyTrainingCandidateCount(
  strategyKey: AiStrategyKey,
  playTraceReport: PlayTraceAnalysisReport | null,
  sideDeath: DeathTraceReport | undefined
) {
  const deathCandidate = sideDeath ? 1 : 0;
  if (!playTraceReport) return deathCandidate;

  switch (strategyKey) {
    case "survival-v0":
      return playTraceReport.stalls.length + deathCandidate;
    case "speedrun-v0":
      return playTraceReport.fastPasses.length;
    case "combat-v0":
      return playTraceReport.kills.total + playTraceReport.stalls.length;
    case "loot-v0":
      return playTraceReport.weaponPickups.total;
    case "guard-v0":
      return playTraceReport.stalls.length + deathCandidate;
    default:
      return playTraceReport.fastPasses.length + playTraceReport.stalls.length + playTraceReport.weaponPickups.total + deathCandidate;
  }
}

function trainingProfileForStrategy(
  side: PlayerSide,
  strategyKey: AiStrategyKey,
  candidateCount: number,
  sideReady: boolean,
  language: UiLanguage
) {
  const english = language === "en-US";
  const strategyLabel = english ? localizedAiStrategyLabel(strategyKey, language) : getAiStrategyLabel(strategyKey);
  if (!sideReady) {
    return {
      candidateFragments: "Waiting for 2P run",
      archiveTarget: "Waiting for 2P RAM",
      primaryAction: "Enter 2P mode first"
    };
  }

  let candidateLabel = "Candidate fragments";
  let primaryAction = "Tune candidate fragment";
  switch (strategyKey) {
    case "survival-v0":
      candidateLabel = "Survival fixes";
      primaryAction = "Tune survival fragment";
      break;
    case "speedrun-v0":
      candidateLabel = "Fast windows";
      primaryAction = "Tune fast-pass fragment";
      break;
    case "combat-v0":
      candidateLabel = "Combat targets";
      primaryAction = "Tune target-clear fragment";
      break;
    case "loot-v0":
      candidateLabel = "Reward routes";
      primaryAction = "Tune reward-route fragment";
      break;
    case "guard-v0":
      candidateLabel = "Guard handoffs";
      primaryAction = "Tune follow/guard fragment";
      break;
    default:
      break;
  }

  return {
    candidateFragments: `${strategyLabel} / ${candidateLabel}: ${candidateCount}`,
    archiveTarget: `trace-evidence/${side.toLowerCase()}/${strategyKey}`,
    primaryAction
  };
}

function buildSideTrainingState(
  side: PlayerSide,
  language: UiLanguage,
  mode: ControlMode,
  strategyKey: AiStrategyKey,
  ramSnapshot: GameRamSnapshot | null,
  tasEntry: TasRegistryEntry | null,
  traceRecording: boolean,
  traceSampleCount: number,
  traceLastSummary: string,
  playTraceReport: PlayTraceAnalysisReport | null,
  deathTraceReports: DeathTraceReport[]
) {
  const sideDeath = deathTraceReports.slice().reverse().find((report) => report.side === side);
  const twoPlayerActive = Boolean(ramSnapshot?.twoPlayerActive);
  const sideReady = side === "1P" || twoPlayerActive;
  const english = language === "en-US";
  const candidateCount = strategyTrainingCandidateCount(strategyKey, playTraceReport, sideDeath);
  const trainingProfile = trainingProfileForStrategy(side, strategyKey, candidateCount, sideReady, language);
  const sourceLabel = english
    ? mode === "human" ? "Human demo" : mode === "ai" ? "AI run" : "Hybrid capture"
    : mode === "human" ? "人类演示" : mode === "ai" ? "AI 跑局" : "混合采集";
  const captureStatus = traceRecording
    ? english ? "Capturing" : "采集中"
    : traceSampleCount > 0 ? english ? "Captured" : "已采集" : english ? "Not captured" : "未采集";
  const failureSummary = sideDeath
    ? english ? `Death W${sideDeath.worldX ?? "?"} / ${sideDeath.input}` : `死亡 W${sideDeath.worldX ?? "?"} / ${sideDeath.input}`
    : sideReady ? english ? "Waiting for failure example" : "等待失败反例" : english ? "Waiting for 2P run" : "等待双人局";

  return {
    side,
    ownerLabel: english ? `${side} Training` : side === "1P" ? "玩家1训练" : "玩家2训练",
    baselineStrategy: english ? localizedAiStrategyLabel(strategyKey, language) : getAiStrategyLabel(strategyKey),
    sourceLabel,
    tasBaseLabel: localizedTasBaseLabel(tasEntry, language),
    captureStatus,
    windowLabel: traceRecording || traceSampleCount > 0 ? localizedTraceSummary(traceLastSummary, traceRecording, language) : english ? "Capture by WorldX window" : "按 WorldX 窗口采集",
    candidateFragments: english ? `${candidateCount} candidates` : `${candidateCount} 候选`,
    failureSummary,
    archiveTarget: sideReady ? "trace-evidence / fragments" : english ? "Waiting for 2P RAM" : "等待 2P RAM",
    primaryAction: sideReady ? english ? "Generate candidate fragment" : "生成候选片段" : english ? "Enter 2P mode first" : "先进入双人模式"
  };
}

function buildSideTrainingStateV2(
  side: PlayerSide,
  language: UiLanguage,
  mode: ControlMode,
  strategyKey: AiStrategyKey,
  resourcePackId: StrategyResourcePackId,
  selectedBaselineId: string,
  selectedTrainingMethod: SideTrainingMethod,
  selectedForTraining: boolean,
  trainingSessionActive: boolean,
  trainingRunActive: boolean,
  ramSnapshot: GameRamSnapshot | null,
  tasEntry: TasRegistryEntry | null,
  traceRecording: boolean,
  traceSampleCount: number,
  traceLastSummary: string,
  playTraceReport: PlayTraceAnalysisReport | null,
  deathTraceReports: DeathTraceReport[]
): SideTrainingState {
  const sideDeath = deathTraceReports.slice().reverse().find((report) => report.side === side);
  const twoPlayerActive = Boolean(ramSnapshot?.twoPlayerActive);
  const sideReady = side === "1P" || twoPlayerActive;
  const candidateCount = strategyTrainingCandidateCount(strategyKey, playTraceReport, sideDeath);
  const trainingProfile = trainingProfileForStrategy(side, strategyKey, candidateCount, sideReady, language);
  const strategyLabel = localizedAiStrategyLabel(strategyKey, language);
  const packDisplayName = strategyResourcePackById(resourcePackId).displayName[language];
  const baselineOptions = sideBaselineOptionsForSide(side, language, strategyKey, resourcePackId, tasEntry);
  const selectedBaseline = baselineOptions.find((option) => option.id === selectedBaselineId) ?? baselineOptions[0];
  const trainingMethod = findSideTrainingMethodOption(selectedTrainingMethod);
  const strategyBaselineLabel = selectedBaseline.label;
  const sourceLabel = selectedBaseline.sourceLabel;
  const trainingConfigLocked = trainingSessionActive || trainingRunActive;
  const trainingStatusLabel = trainingSessionActive
    ? language === "en-US" ? "Active" : "训练中"
    : selectedForTraining
      ? language === "en-US" ? "Ready" : "待训练"
      : language === "en-US" ? "Not selected" : "未选择";
  const trainingRunStatusLabel = trainingRunActive
    ? language === "en-US" ? "Run active / capture synchronized" : "跑局中 / 采集同步"
    : traceRecording
      ? language === "en-US" ? "Capture active outside this run" : "采集中 / 非本跑局"
      : language === "en-US" ? "Run idle" : "跑局待启动";
  const trainingToggleLabel = trainingSessionActive
    ? language === "en-US" ? `Stop ${side} Training: ${strategyLabel}` : `停止${side}训练：${strategyLabel}`
    : language === "en-US" ? `Start ${side} Training: ${strategyLabel}` : `启动${side}训练：${strategyLabel}`;
  const captureStatus = traceRecording ? t(language, "training.traceCapturing") : traceSampleCount > 0 ? "Captured" : "Not captured";
  const failureSummary = sideDeath
    ? `Death W${sideDeath.worldX ?? "?"} / ${sideDeath.input}`
    : sideReady ? "Waiting for failure example" : "Waiting for 2P run";

  return {
    side,
    ownerLabel: `${side} Training`,
    packDisplayName,
    strategyKey,
    strategyCategoryLabel: strategyLabel,
    trainingToggleLabel,
    strategyBaselineLabel,
    selectedForTraining,
    trainingSessionActive,
    trainingStatusLabel,
    baselineOptions,
    selectedBaselineId: selectedBaseline.id,
    sourceLabel,
    trainingMethodOptions: [...SIDE_TRAINING_METHOD_OPTIONS],
    selectedTrainingMethod: trainingMethod.key,
    trainingMethodLabel: trainingMethod.label,
    trainingMethodDescription: trainingMethod.description,
    trainingConfigLocked,
    trainingRunActive,
    trainingRunStatusLabel,
    captureStatus,
    windowLabel: traceRecording || traceSampleCount > 0 ? localizedTraceSummary(traceLastSummary, traceRecording, language) : "Capture by WorldX window",
    candidateFragments: trainingProfile.candidateFragments,
    failureSummary,
    archiveTarget: trainingProfile.archiveTarget,
    primaryAction: trainingProfile.primaryAction
  };
}

function localizedTraceSummary(summary: string, traceRecording: boolean, language: UiLanguage) {
  if (traceRecording) return t(language, "training.traceCapturing");
  if (summary === "轨迹未记录" || summary === "No trace recorded") return t(language, "training.noTrace");
  if (summary === "轨迹已清空" || summary === "Trace cleared") return t(language, "training.traceCleared");
  return summary;
}

function localizedEventLogLine(line: string, language: UiLanguage) {
  if (language !== "en-US") return line;
  const defaultRomMatch = line.match(/^ROM库：默认目录扫描到 (\d+) 个卡带$/);
  if (defaultRomMatch) return `ROM library: default directory found ${defaultRomMatch[1]} cartridges`;
  const loadedMatch = line.match(/^运行时：本地 ROM 已加载（(.+)）$/);
  if (loadedMatch) return `Runtime: local ROM loaded (${loadedMatch[1]})`;
  if (line === "PM：2P 输入路由准备中") return "PM: 2P input routing ready";
  if (line === "运行时：等待本地用户自有 ROM") return "Runtime: waiting for local user-owned ROM";
  if (line === "边界：仓库不提交、不打包 ROM") return "Boundary: repository does not commit or package ROMs";
  if (line === "BOT：AI 模式当前为安全占位") return "BOT: AI mode is currently safe placeholder";
  if (line.startsWith("声音：浏览器等待真实点击")) return "Audio: browser is waiting for a real click";
  if (line.startsWith("声音错误：")) return line.replace("声音错误：", "Audio error: ");
  return line;
}

function buildGlobalTrainingState(
  trainingSessionActive: boolean,
  trainingRunActive: boolean,
  packageSideScope: StrategyPackageSideScope,
  strategyExportName: string,
  validationReplayComplete: boolean,
  savePathLabel: string,
  versionStatusLabel: string,
  resourcePacksBySide: Record<PlayerSide, StrategyResourcePackId>,
  p2ResourceSynced: boolean,
  language: UiLanguage
): GlobalTrainingState {
  return {
    strategyPackLabel: activeStrategyPackLabel(language),
    trainingSessionActive,
    trainingRunActive,
    trainingSessionLabel: trainingRunActive
      ? language === "en-US" ? "Run active / capturing" : "跑局中 / 采集中"
      : trainingSessionActive
      ? language === "en-US" ? "Training active" : "训练中"
      : language === "en-US" ? "Training idle" : "待训练",
    packageSideScope,
    strategyExportName,
    validationReplayComplete,
    savePathLabel,
    versionStatusLabel,
    resourcePacksBySide,
    p2ResourceSynced
  };
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
  if (!gamepad) return `Gamepad ${fallbackIndex} disconnected`;
  const name = gamepad.id.length > 28 ? `${gamepad.id.slice(0, 28)}...` : gamepad.id;
  return `Gamepad ${fallbackIndex} connected: ${name}`;
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
        <PadButton label="↑" active={buttons.up} onDown={() => onButtonDown?.("up")} onUp={() => onButtonUp?.("up")} />
        <div className="dpad-mid">
          <PadButton label="←" active={buttons.left} onDown={() => onButtonDown?.("left")} onUp={() => onButtonUp?.("left")} />
          <PadButton label="→" active={buttons.right} onDown={() => onButtonDown?.("right")} onUp={() => onButtonUp?.("right")} />
        </div>
        <PadButton label="↓" active={buttons.down} onDown={() => onButtonDown?.("down")} onUp={() => onButtonUp?.("down")} />
      </div>
      <div className="system-buttons">
        <PadButton label="SELECT" active={buttons.select} onDown={() => onButtonDown?.("select")} onUp={() => onButtonUp?.("select")} />
        <PadButton label="START" active={buttons.start} onDown={() => onButtonDown?.("start")} onUp={() => onButtonUp?.("start")} />
      </div>
      <div className="action-buttons">
        <PadButton label="B" active={buttons.b} onDown={() => onButtonDown?.("b")} onUp={() => onButtonUp?.("b")} />
        <PadButton label="A" active={buttons.a} onDown={() => onButtonDown?.("a")} onUp={() => onButtonUp?.("a")} />
      </div>
    </div>
  );
}

function WarriorAvatar({ side }: { side: PlayerSide }) {
  return (
    <div className={`warrior-avatar ${side === "1P" ? "blue-warrior" : "red-warrior"}`} aria-hidden="true">
      <div className="warrior-helmet">
        <span />
      </div>
      <div className="warrior-face" />
      <div className="warrior-body" />
    </div>
  );
}

function ModeTogglePanel({
  mode,
  language,
  onModeChange,
  tasLocked = false,
  trainingLocked = false
}: {
  mode: ControlMode;
  language: UiLanguage;
  onModeChange: (mode: ControlMode) => void;
  tasLocked?: boolean;
  trainingLocked?: boolean;
}) {
  const locked = tasLocked || trainingLocked;
  const humanActive = tasLocked ? false : modeToggleActive(mode, "human");
  const aiActive = tasLocked ? true : modeToggleActive(mode, "ai");
  const humanLabel = trainingLocked && humanActive
    ? `${localizedControlModeLabel("human", language)} / 训练`
    : localizedControlModeLabel("human", language);
  const aiLabel = tasLocked
    ? `${localizedControlModeLabel("ai", language)} / TAS`
    : trainingLocked && aiActive
      ? `${localizedControlModeLabel("ai", language)} / 训练`
      : localizedControlModeLabel("ai", language);
  return (
    <div className="mode-toggle-panel" role="group" aria-label="控制模式开关">
      <button
        aria-pressed={humanActive}
        className={humanActive ? "mode-toggle active human-toggle" : "mode-toggle human-toggle"}
        disabled={locked}
        onClick={() => onModeChange(nextModeFromToggle(mode, "human"))}
        type="button"
      >
        {humanLabel}
      </button>
      <button
        aria-pressed={aiActive}
        className={aiActive ? "mode-toggle active ai-toggle" : "mode-toggle ai-toggle"}
        disabled={locked}
        onClick={() => onModeChange(nextModeFromToggle(mode, "ai"))}
        type="button"
      >
        {aiLabel}
      </button>
    </div>
  );
}

function SideTrainingPanel({
  language,
  training,
  actions
}: {
  language: UiLanguage;
  training: SideTrainingState;
  actions: SideTrainingActions;
}) {
  const captureStartLabel = training.selectedBaselineId === "human-demo-new"
    ? t(language, "training.startCapture")
    : training.selectedTrainingMethod === "human-assist"
      ? "开始混合采集"
      : t(language, "training.startCapture");
  const autoPatchRunLabel = training.trainingRunActive ? "停止跑局" : "开始跑局";
  const archiveLabel = training.selectedBaselineId === "human-demo-new" ? "归档演示" : t(language, "training.archiveStrategy");
  const sideTrainingActive = training.trainingSessionActive;
  const sideTrainingConfigurable = training.selectedForTraining && !training.trainingConfigLocked;
  const directRunBaseline = isNewRunBaseline(training.selectedBaselineId);
  const showDirectRunActions = directRunBaseline;
  const showCaptureActions = showDirectRunActions || training.selectedTrainingMethod === "human-assist";
  const autoPatchArchiveLabel = training.selectedBaselineId === "ai-run-new" ? "归档AI跑局" : "生成补丁";

  return (
    <div className={sideTrainingPanelClassName(training)} aria-label={`${training.side} 训练区`}>
      <button
        aria-label={training.trainingToggleLabel}
        aria-pressed={training.trainingSessionActive}
        className={sideTrainingTitleClassName(training)}
        onClick={() => actions.onSideTrainingToggle(training.side)}
        type="button"
      >
        <Database size={15} />
        <span>{training.ownerLabel}</span>
        <span className="side-training-title-strategy">{training.strategyCategoryLabel}</span>
        <span className="side-training-status">{training.trainingStatusLabel}</span>
      </button>
      <div className="side-training-pack-identity">
        <strong>{training.packDisplayName}</strong>
      </div>
      <label className={selectorClassName("side-baseline-selector", !sideTrainingConfigurable)}>
        <span>{t(language, "training.strategyBaseline")}</span>
        <select
          disabled={!sideTrainingConfigurable}
          onChange={(event) => actions.onSideTrainingBaselineChange(training.side, event.currentTarget.value)}
          value={training.selectedBaselineId}
        >
          {training.baselineOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <small>{training.sourceLabel} / {training.strategyBaselineLabel}</small>
      </label>
      <div className={selectorClassName("side-training-method-selector", !sideTrainingConfigurable || directRunBaseline)} aria-label="训练方法">
        <span>训练方法</span>
        <div>
          {training.trainingMethodOptions.map((option) => (
            <button
              aria-pressed={training.selectedTrainingMethod === option.key}
              className={training.selectedTrainingMethod === option.key ? "active" : ""}
              disabled={!sideTrainingConfigurable || directRunBaseline}
              key={option.key}
              onClick={() => actions.onSideTrainingMethodChange(training.side, option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <small>{training.trainingMethodDescription}</small>
      </div>
      <div className="side-training-run-status">
        <small>{training.trainingRunStatusLabel}</small>
      </div>
      <div className="side-training-context-actions">
        {showDirectRunActions ? (
          <>
            <button disabled={!sideTrainingActive || actions.traceRecording} onClick={() => actions.onSideTraceStart(training.side)} type="button">{captureStartLabel}</button>
            <button disabled={!sideTrainingActive || !actions.traceRecording} onClick={() => actions.onSideTraceStop(training.side)} type="button">{t(language, "training.stop")}</button>
            <button disabled={!sideTrainingActive || actions.traceSampleCount === 0 || actions.traceRecording} onClick={() => actions.onSideTrainingArchiveStrategy(training.side)} type="button">{archiveLabel}</button>
          </>
        ) : showCaptureActions ? (
          <>
            <button disabled={!sideTrainingActive || actions.traceRecording} onClick={() => actions.onSideTraceStart(training.side)} type="button">{captureStartLabel}</button>
            <button disabled={!sideTrainingActive || !actions.traceRecording} onClick={() => actions.onSideTraceStop(training.side)} type="button">{t(language, "training.stop")}</button>
            <button disabled={!sideTrainingActive || actions.traceSampleCount === 0 || actions.traceRecording} onClick={() => actions.onSideTrainingArchiveStrategy(training.side)} type="button">{archiveLabel}</button>
          </>
        ) : training.selectedTrainingMethod === "manual-edit" ? (
          <>
            <button disabled={!sideTrainingActive} onClick={() => actions.onSideTrainingModifyStrategy(training.side)} type="button">{t(language, "training.modifyStrategy")}</button>
            <button disabled={!sideTrainingActive || actions.traceRecording} onClick={() => actions.onSideTrainingValidateStrategy(training.side)} type="button">{t(language, "training.validateStrategy")}</button>
          </>
        ) : training.selectedTrainingMethod === "model-analysis" ? (
          <>
            <button disabled={!sideTrainingActive || actions.traceSampleCount === 0 || actions.traceRecording} onClick={() => actions.onSideTraceExport(training.side)} type="button">打包数据</button>
            <button disabled={!sideTrainingActive} onClick={() => actions.onSideTrainingModifyStrategy(training.side)} type="button">导入建议</button>
          </>
        ) : (
          <>
            <button disabled={!sideTrainingActive || (actions.traceRecording && !training.trainingRunActive)} onClick={() => actions.onSideTrainingRunToggle(training.side)} type="button">{autoPatchRunLabel}</button>
            <button disabled={!sideTrainingActive || actions.traceSampleCount === 0 || actions.traceRecording || training.trainingRunActive} onClick={() => actions.onSideTrainingArchiveStrategy(training.side)} type="button">{autoPatchArchiveLabel}</button>
          </>
        )}
      </div>
    </div>
  );
}

function PilotPanel({
  pilot,
  uiLanguage,
  onButtonDown,
  onButtonUp,
  onModeChange,
  onStrategyChange,
  trainingActions,
  tasLocked,
  trainingLocked
}: {
  pilot: Pilot;
  uiLanguage: UiLanguage;
  onButtonDown?: (button: ButtonName) => void;
  onButtonUp?: (button: ButtonName) => void;
  onModeChange: (mode: ControlMode) => void;
  onStrategyChange: (strategy: AiStrategyKey) => void;
  trainingActions: SideTrainingActions;
  tasLocked: boolean;
  trainingLocked: boolean;
}) {
  const Icon = tasLocked ? Radio : trainingLocked ? Database : pilot.mode === "ai" ? Bot : pilot.mode === "hybrid" ? HeartPulse : UserRound;
  const aiActive = tasLocked || aiControlIsActive(pilot.mode);
  const authorityLabel = tasLocked ? t(uiLanguage, "tas.controllerLock") : trainingLocked ? "训练接管" : pilot.authority;
  const roleLabel = tasLocked
    ? `${localizedControlModeLabel("ai", uiLanguage)} / TAS / ${t(uiLanguage, "tas.inputLocked")}`
    : trainingLocked
      ? `${localizedControlModeLabel(pilot.mode, uiLanguage)} / 训练接管`
      : `${localizedControlModeLabel(pilot.mode, uiLanguage)} / ${pilot.status}`;
  const inputLocked = tasLocked || trainingLocked;
  const strategyControlsLocked = tasLocked || trainingLocked;
  const strategyButtons = strategyOptionsForResourcePack(pilot.strategyResourcePackId);
  return (
    <section className={`pilot-panel controller-bay ${pilot.accent} ${pilot.side === "1P" ? "side-left" : "side-right"} ${tasLocked ? "tas-locked" : ""} ${trainingLocked ? "training-locked" : ""}`}>
      <div className="controller-head">
        <div className="panel-title">
          <Icon size={18} />
          <span>{pilot.side} {t(uiLanguage, "pilot.controllerBay")}</span>
        </div>
        <span className="authority-chip">{authorityLabel}</span>
      </div>
      <div className="pilot-control-row">
        <div className="pilot-card">
          <div className="avatar">
            <WarriorAvatar side={pilot.side} />
          </div>
          <div>
            <div className="pilot-name">{pilot.name}</div>
            <div className="pilot-role">{roleLabel}</div>
          </div>
        </div>
        <ModeTogglePanel language={uiLanguage} mode={pilot.mode} onModeChange={onModeChange} tasLocked={tasLocked} trainingLocked={trainingLocked} />
      </div>
      {tasLocked && (
        <div className="tas-input-lock">
          <Radio size={14} />
          <span>{t(uiLanguage, "tas.inputLocked")}</span>
        </div>
      )}
      {trainingLocked && !tasLocked && (
        <div className="training-input-lock">
          <Database size={14} />
          <span>训练接管中</span>
        </div>
      )}
      <div className={aiActive ? "strategy-button-section" : "strategy-button-section inactive"} aria-label={`${pilot.side} ${t(uiLanguage, "pilot.aiStrategy")}`}>
        <div className="strategy-button-title">{aiActive ? t(uiLanguage, "pilot.aiStrategy") : t(uiLanguage, "pilot.aiStrategyDisabled")}</div>
        <div className="strategy-button-grid">
          {strategyButtons.map((option) => {
            const selected = aiActive && pilot.strategyKey === option.key;
            const strategyUnavailable = !option.available;
            return (
              <button
                aria-pressed={selected}
                className={selected ? "strategy-button active" : strategyUnavailable ? "strategy-button unavailable" : "strategy-button"}
                disabled={strategyControlsLocked || strategyUnavailable}
                key={option.key}
                onClick={() => onStrategyChange(option.key)}
                type="button"
              >
                {localizedAiStrategyLabel(option.key, uiLanguage)}
              </button>
            );
          })}
        </div>
      </div>
      <ControllerView buttons={pilot.buttons} onButtonDown={inputLocked ? undefined : onButtonDown} onButtonUp={inputLocked ? undefined : onButtonUp} />
      <div className="metric-stack" aria-label={`${pilot.side} 数据面板`}>
        {pilot.metricGroups.map((group) => (
          <div className="metric-group" key={group.title}>
            <div className="metric-title">{group.title}</div>
            <div className="stats-grid">
              {group.items.map((item) => (
                <div className={`stat-tile ${item.status ?? "pending"}`} key={`${group.title}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ai-dialogue" aria-label={`${pilot.side} ${t(uiLanguage, "pilot.aiDialogue")}`}>
        <div className="sub-title">
          <MessageSquareText size={15} />
          <span>{t(uiLanguage, "pilot.aiDialogue")}</span>
        </div>
        {pilot.dialogue.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <SideTrainingPanel actions={trainingActions} language={uiLanguage} training={pilot.training} />
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
        <span>{t(uiLanguage, "pilot.finalWrite")} {pilot.side}</span>
      </div>
    </section>
  );
}

function TelevisionView({
  tvRef,
  screenFrameRef,
  canvasRef,
  status,
  audioStatus,
  uiLanguage,
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
  screenFrameRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: RuntimeStatus;
  audioStatus: AudioStatus;
  uiLanguage: UiLanguage;
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
    <section className="tv-station" aria-label={t(uiLanguage, "tv.title")}>
      <div className="tv-shell" ref={tvRef}>
        <div className="tv-top">
          <div className="panel-title">
            <Tv size={19} />
            <span>{t(uiLanguage, "tv.title")}</span>
          </div>
          <div className="tv-osd">
            <span>{runtimeStatusLabel(status, uiLanguage)}</span>
            <span>{t(uiLanguage, "tv.fpsTarget")} 60</span>
            <span>{t(uiLanguage, "tv.frameCount")} {frameCount}</span>
            <span>{ramSnapshot ? `Screen ${ramSnapshot.screen} / WorldX ${ramSnapshot.worldX}` : t(uiLanguage, "tv.screenWaiting")}</span>
          </div>
        </div>
        <div className="screen-frame" ref={screenFrameRef}>
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
        <div className="tv-controls" aria-label={t(uiLanguage, "tv.settings")}>
          <button className="icon-button" onClick={onToggleFullscreen} type="button">
            <Maximize2 size={15} />
            {isFullscreen ? t(uiLanguage, "tv.exitFullscreen") : t(uiLanguage, "tv.fullscreen")}
          </button>
          <label className="range-control volume-control">
            <Volume2 size={14} />
            <span>{t(uiLanguage, "tv.volume")}</span>
            <div className="range-input-row">
              <button aria-label={t(uiLanguage, "tv.volumeDown")} className="step-button" onClick={() => stepVolume(-0.03)} type="button">
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
              <button aria-label={t(uiLanguage, "tv.volumeUp")} className="step-button" onClick={() => stepVolume(0.03)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
          <label className="range-control">
            <SlidersHorizontal size={14} />
            <span>{t(uiLanguage, "tv.brightness")}</span>
            <div className="range-input-row">
              <button aria-label={t(uiLanguage, "tv.brightnessDown")} className="step-button" onClick={() => stepVisual("brightness", -5, 70, 130)} type="button">
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
              <button aria-label={t(uiLanguage, "tv.brightnessUp")} className="step-button" onClick={() => stepVisual("brightness", 5, 70, 130)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
          <label className="range-control">
            <SlidersHorizontal size={14} />
            <span>{t(uiLanguage, "tv.contrast")}</span>
            <div className="range-input-row">
              <button aria-label={t(uiLanguage, "tv.contrastDown")} className="step-button" onClick={() => stepVisual("contrast", -5, 75, 140)} type="button">
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
              <button aria-label={t(uiLanguage, "tv.contrastUp")} className="step-button" onClick={() => stepVisual("contrast", 5, 75, 140)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
          <label className="range-control">
            <SlidersHorizontal size={14} />
            <span>{t(uiLanguage, "tv.color")}</span>
            <div className="range-input-row">
              <button aria-label={t(uiLanguage, "tv.colorDown")} className="step-button" onClick={() => stepVisual("saturation", -5, 60, 150)} type="button">
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
              <button aria-label={t(uiLanguage, "tv.colorUp")} className="step-button" onClick={() => stepVisual("saturation", 5, 60, 150)} type="button">
                <Plus size={13} />
              </button>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}

function OperationStrategyControl({
  training,
  validationReport,
  language,
  traceRecording,
  onTrainingSaveStrategy,
  onTrainingSavePathSelected,
  onTrainingValidateStrategy,
  onTrainingVersionHistory,
  onPackageSideScopeToggle,
  onStrategyResourcePackChange,
  onStrategyExportNameChange,
  onSync2PResourceTo1P
}: {
  training: GlobalTrainingState;
  validationReport: StrategyPackageValidationReport | null;
  language: UiLanguage;
  traceRecording: boolean;
  onTrainingSaveStrategy: () => void;
  onTrainingSavePathSelected: (pathLabel: string) => void;
  onTrainingValidateStrategy: () => void;
  onTrainingVersionHistory: () => void;
  onPackageSideScopeToggle: (side: PlayerSide) => void;
  onStrategyResourcePackChange: (side: PlayerSide, packId: StrategyResourcePackId) => void;
  onStrategyExportNameChange: (name: string) => void;
  onSync2PResourceTo1P: () => void;
}) {
  const saveDirectoryInputRef = useRef<HTMLInputElement | null>(null);
  const saveDirectoryInputProps = { webkitdirectory: "", directory: "" } as Record<string, string>;
  const selectedPackIds = Array.from(new Set(Object.values(training.resourcePacksBySide)));
  const resourceSummary = selectedPackIds
    .map((packId) => {
      const pack = strategyResourcePackById(packId);
      return `${pack.displayName[language]} · ${pack.status}`;
    })
    .join(" / ");
  const authorSummary = Array.from(new Set(selectedPackIds.map((packId) => strategyResourcePackById(packId).author))).join(" / ");
  const creatorSummary = Array.from(new Set(selectedPackIds.map((packId) => strategyResourcePackById(packId).creator.displayName))).join(" / ");
  const latestModifierSummary = Array.from(new Set(selectedPackIds.map((packId) => strategyResourcePackById(packId).latestModifier.displayName))).join(" / ");
  const revisionSummary = selectedPackIds
    .map((packId) => `${strategyResourcePackById(packId).revisionHistory.length}`)
    .join(" / ");
  const archiveSummary = selectedPackIds.map((packId) => strategyResourcePackById(packId).archivePath).join(" / ");
  const resultPack = strategyResourcePackById(training.resourcePacksBySide["1P"]);
  const qualityGates = validationReport?.qualityGates ?? [];
  const handleSaveStrategy = () => {
    onTrainingSaveStrategy();
    if (training.packageSideScope !== "none") saveDirectoryInputRef.current?.click();
  };

  return (
    <div className={training.trainingSessionActive ? "operation-strategy-control training-active" : "operation-strategy-control"} aria-label={t(language, "training.globalTitle")}>
      <div className="sub-title">
        <Database size={15} />
        <span>{t(language, "training.globalTitle")}</span>
      </div>
      <div className="training-pack-banner">
        <strong>{training.strategyPackLabel}</strong>
        <span>{ACTIVE_STRATEGY_PACK.packId}</span>
      </div>
      <div className="training-session-control" aria-label="训练会话">
        <strong>{training.trainingSessionLabel}</strong>
        <span>{language === "en-US" ? "Start or stop from each controller Training title" : "在手柄训练标题处启动或停止"}</span>
      </div>
      <div className="strategy-resource-routing">
        {(["1P", "2P"] as PlayerSide[]).map((side) => {
          const packId = training.resourcePacksBySide[side];
          return (
            <div className="strategy-resource-slot" key={side}>
              <div className="strategy-resource-slot-head">
                <strong>{side === "1P" ? t(language, "training.resourcePack1P") : t(language, "training.resourcePack2P")}</strong>
                <span>{side === "2P" && training.p2ResourceSynced ? t(language, "training.resourceSynced") : side}</span>
              </div>
              <select
                aria-label={side === "1P" ? t(language, "training.resourcePack1P") : t(language, "training.resourcePack2P")}
                onChange={(event) => onStrategyResourcePackChange(side, event.currentTarget.value as StrategyResourcePackId)}
                value={packId}
              >
                {STRATEGY_RESOURCE_PACKS.map((pack) => (
                  <option key={pack.packId} value={pack.packId}>{strategyResourcePackLabel(pack.packId, language)}</option>
                ))}
              </select>
              <small>{strategyResourcePackById(packId).archivePath}</small>
            </div>
          );
        })}
        <button className="strategy-resource-sync" onClick={onSync2PResourceTo1P} type="button">{t(language, "training.sync2PTo1P")}</button>
      </div>
      <div className="strategy-resource-info" aria-label={t(language, "training.resourceInfo")}>
        <div>
          <span>{t(language, "training.resourceInfo")}</span>
          <strong>{resourceSummary}</strong>
        </div>
        <div>
          <span>{t(language, "training.resourceAuthor")}</span>
          <strong>{authorSummary}</strong>
        </div>
        <div>
          <span>{t(language, "training.resourceCreator")}</span>
          <strong>{creatorSummary}</strong>
        </div>
        <div>
          <span>{t(language, "training.resourceLatestModifier")}</span>
          <strong>{latestModifierSummary}</strong>
        </div>
        <div>
          <span>{t(language, "training.resourceRevisions")}</span>
          <strong>{revisionSummary}</strong>
        </div>
        <div>
          <span>{t(language, "training.resourceStandard")}</span>
          <strong>Protocol {ACTIVE_STRATEGY_PACK.protocolVersion}</strong>
        </div>
      </div>
      <div className="strategy-resource-archive">
        <span>{t(language, "training.archive")}</span>
        <strong>{archiveSummary}</strong>
      </div>
      <div className="strategy-validation-gates" data-testid="strategy-validation-gates" aria-label={t(language, "training.qualityGates")}>
        <div className="strategy-validation-gates-heading">
          <span>{t(language, "training.qualityGates")}</span>
          <strong>{validationReport ? `${validationReport.result} · ${validationReport.mode}` : t(language, "training.qualityGateWaiting")}</strong>
        </div>
        <div className="strategy-validation-gate-grid">
          {qualityGates.length > 0 ? qualityGates.map((gate) => (
            <div className={`quality-gate-card ${gate.status}`} data-testid={`strategy-validation-gate-${gate.id}`} key={gate.id}>
              <span>{gate.label}</span>
              <strong>{qualityGateStatusLabel(gate.status, language)}</strong>
              <em className="quality-gate-reason" data-testid={`strategy-validation-gate-${gate.id}-reason`}>{gate.reason}</em>
            </div>
          )) : (
            <div className="quality-gate-card missing" data-testid="strategy-validation-gate-waiting">
              <span>{t(language, "training.qualityGates")}</span>
              <strong>{t(language, "training.qualityGateWaiting")}</strong>
            </div>
          )}
        </div>
      </div>
      <div className="strategy-package-save-panel" aria-label={t(language, "training.saveStrategy")}>
        <div className="package-scope-control" aria-label={t(language, "training.packageScope")}>
          <span>{t(language, "training.packageScope")}</span>
          <div className="package-scope-toggle-stack">
            {(["1P", "2P"] as PlayerSide[]).map((side) => (
              <button
                aria-pressed={packageScopeHasSide(training.packageSideScope, side)}
                className={packageScopeHasSide(training.packageSideScope, side) ? "active" : ""}
                key={side}
                onClick={() => onPackageSideScopeToggle(side)}
                type="button"
              >
                {side === "1P" ? t(language, "training.package1P") : t(language, "training.package2P")}
              </button>
            ))}
          </div>
          <small>{strategyPackageSideScopeLabel(training.packageSideScope, language)}</small>
        </div>
        <button className="validation-replay-button" disabled={traceRecording} onClick={onTrainingValidateStrategy} type="button">{t(language, "training.validateStrategy")}</button>
        <label className="strategy-save-name-field">
          <span>{t(language, "training.packageName")}</span>
          <input
            onChange={(event) => onStrategyExportNameChange(event.currentTarget.value)}
            type="text"
            value={training.strategyExportName}
          />
        </label>
        <button className="save-strategy-button" disabled={!training.validationReplayComplete || traceRecording} onClick={handleSaveStrategy} type="button">
          {t(language, "training.saveStrategy")}
        </button>
        <button className="version-history-button" onClick={onTrainingVersionHistory} type="button">
          {t(language, "training.versionHistory")}
        </button>
        <input
          {...saveDirectoryInputProps}
          className="hidden-save-directory-input"
          onChange={(event) => {
            const firstFile = event.currentTarget.files?.[0] as (File & { webkitRelativePath?: string }) | undefined;
            const rootName = firstFile?.webkitRelativePath?.split("/")[0] || firstFile?.name || "";
            onTrainingSavePathSelected(rootName || t(language, "training.savePathWaiting"));
            event.currentTarget.value = "";
          }}
          ref={saveDirectoryInputRef}
          type="file"
        />
        <small className="strategy-save-path">{training.savePathLabel || t(language, "training.savePathWaiting")}</small>
        <small className="strategy-version-status">{training.versionStatusLabel || t(language, "training.rollbackUnavailable")}</small>
      </div>
      <div className="strategy-result-section" aria-label={t(language, "training.strategyResults")}>
        <div className="strategy-result-heading">
          <span>{t(language, "training.strategyResults")}</span>
          <strong>{resultPack.displayName[language]}</strong>
        </div>
        <div className="strategy-result-board">
          {strategyResultKeys.map((strategyKey) => {
            const record = resultPack.strategyResults[strategyKey] ?? unverifiedStrategyResult("Missing result record.");
            return (
              <div className="strategy-result-card" key={strategyKey}>
                <div className="strategy-result-card-head">
                  <strong>{localizedAiStrategyLabel(strategyKey, language)}</strong>
                  <span>{strategyResultStatusLabel(record, language)}</span>
                </div>
                <div className="strategy-result-metrics">
                  <span>{t(language, "training.resultKills")}</span>
                  <b>{strategyResultMetricLabel(record.metrics.kills, language)}</b>
                  <span>{t(language, "training.resultFixed")}</span>
                  <b>{strategyResultMetricLabel(record.metrics.fixedTargetsDestroyed, language)}</b>
                  <span>{t(language, "training.resultRewards")}</span>
                  <b>{strategyResultMetricLabel(record.metrics.rewardsCollected, language)}</b>
                  <span>{t(language, "training.resultTime")}</span>
                  <b>{strategyResultMetricLabel(record.metrics.clearTimeFrames, language, "frames")}</b>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TasWindow({
  tasEntry,
  selectedMovieId,
  language,
  commentaryMode,
  playback,
  onCommentaryModeChange,
  onLoad,
  onMovieSelect,
  onPause,
  onPlay,
  onStop,
  onApplyBaseline
}: {
  tasEntry: TasRegistryEntry | null;
  selectedMovieId: string;
  language: UiLanguage;
  commentaryMode: TasCommentaryMode;
  playback: TasPlaybackUiState;
  onCommentaryModeChange: (mode: TasCommentaryMode) => void;
  onLoad: () => void;
  onMovieSelect: (movieId: string) => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  onApplyBaseline: (baseline: TasStrategyBaseline, side: PlayerSide) => void;
}) {
  const movies = tasMoviesForEntry(tasEntry);
  const selectedMovie = movies.find((movie) => movie.id === selectedMovieId) ?? selectDefaultTasMovie(tasEntry);
  const modes = selectedMovie?.commentaryModes ?? [];
  const progress = playback.totalFrames > 0
    ? `${playback.frameIndex}/${playback.totalFrames}`
    : t(language, "tas.notLoaded");
  const commentary = selectedMovie
    ? buildTasCommentary(selectedMovie, commentaryMode)
    : t(language, "tas.noMatch");
  const canUseMovie = Boolean(tasEntry && selectedMovie);
  const movieTitle = (movie: NonNullable<typeof selectedMovie>) => (
    language === "en-US" ? movie.title.en : movie.title.zh
  );
  const movieSubtitle = (movie: NonNullable<typeof selectedMovie>) => (
    language === "en-US" ? movie.title.zh : movie.title.en
  );

  return (
    <div className="tas-window" aria-label={t(language, "tas.windowTitle")}>
      <div className="sub-title">
        <Radio size={15} />
        <span>{t(language, "tas.windowTitle")}</span>
        <span className="tas-header-status">
          <strong>{matchedTasCountLabel(movies.length, language)}</strong>
          <span>{playback.status}</span>
          <b>{tasPlaybackMessageLabel(playback, language)}</b>
        </span>
      </div>
      <div className="tas-window-body">
        <div className="tas-movie-list" aria-label={t(language, "tas.fileList")}>
          {movies.length > 0 ? movies.map((movie) => (
            <button
              className={movie.id === selectedMovieId ? "tas-movie-item active" : "tas-movie-item"}
              key={movie.id}
              onClick={() => onMovieSelect(movie.id)}
              type="button"
            >
              <strong>{movieTitle(movie)}</strong>
              <small>{movieSubtitle(movie)}</small>
            </button>
          )) : (
            <div className="tas-empty">{t(language, "tas.noMatch")}</div>
          )}
        </div>
        <div className="tas-detail">
          {selectedMovie ? (
            <>
              <div className="tas-title-row">
                <strong>{movieTitle(selectedMovie)}</strong>
                <span>{selectedMovie.players} / {selectedMovie.category}</span>
              </div>
              <p>{selectedMovie.summaryZh}</p>
              <div className="tas-info-grid">
                <div>
                  <span>{t(language, "tas.source")}</span>
                  <b>{selectedMovie.sourceNote}</b>
                </div>
                <div>
                  <span>{t(language, "tas.keyMoments")}</span>
                  <b>{selectedMovie.keyMoments.slice(0, 2).join(" / ")}</b>
                </div>
                <div>
                  <span>{t(language, "tas.risk")}</span>
                  <b>{selectedMovie.riskNotes[0]}</b>
                </div>
              </div>
              <div className="tas-meta-grid">
                <div>
                  <span>{t(language, "tas.trainingBase")}</span>
                  <b>{recommendationLabel(selectedMovie)}</b>
                </div>
                <div>
                  <span>{t(language, "tas.artifact")}</span>
                  <b>{tasEntry?.trainingBasePath ?? "-"}</b>
                </div>
                <div>
                  <span>{t(language, "tas.checksum")}</span>
                  <b>{playback.checksumStatus}</b>
                </div>
                <div>
                  <span>{t(language, "tas.progress")}</span>
                  <b>{progress}</b>
                </div>
                <div>
                  <span>{t(language, "tas.phase")}</span>
                  <b>{tasPhaseLabel(playback.phase)}</b>
                </div>
                <div>
                  <span>{t(language, "tas.currentInput")}</span>
                  <b>{playback.currentInput}</b>
                </div>
              </div>
              <div className="tas-mode-strip" aria-label={t(language, "tas.commentaryMode")}>
                {modes.map((mode) => (
                  <button
                    className={mode === commentaryMode ? "active" : ""}
                    key={mode}
                    onClick={() => onCommentaryModeChange(mode)}
                    type="button"
                  >
                    {commentaryModeLabel(mode)}
                  </button>
                ))}
              </div>
              <div className="tas-baseline-actions" aria-label={t(language, "tas.applyBaseline")}>
                {selectedMovie.recommendedBaselines.map((baseline) => {
                  const liveStrategy = tasBaselineStrategyMap[baseline];
                  return (
                    <div className="tas-baseline-action" key={baseline}>
                      <span>{tasBaselineLabel(baseline)}</span>
                      <button
                        disabled={!liveStrategy}
                        onClick={() => onApplyBaseline(baseline, "1P")}
                        type="button"
                      >
                        {t(language, "tas.apply1P")}
                      </button>
                      <button
                        disabled={!liveStrategy}
                        onClick={() => onApplyBaseline(baseline, "2P")}
                        type="button"
                      >
                        {t(language, "tas.apply2P")}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="tas-commentary">{commentary}</div>
            </>
          ) : (
            <p>{t(language, "tas.noMatchDetail")}</p>
          )}
        </div>
      </div>
      <div className="tas-control-row">
        <button disabled={!canUseMovie || playback.status === "loading"} onClick={onLoad} type="button">
          <Database size={14} /> {t(language, "tas.load")}
        </button>
        <button disabled={!canUseMovie || playback.status === "loading" || playback.status === "playing"} onClick={onPlay} type="button">
          <Play size={14} /> {t(language, "tas.trialReplay")}
        </button>
        <button disabled={playback.status !== "playing"} onClick={onPause} type="button">
          <Pause size={14} /> {t(language, "tas.pause")}
        </button>
        <button disabled={playback.status === "idle" || playback.status === "loading"} onClick={onStop} type="button">
          <Square size={14} /> {t(language, "tas.stop")}
        </button>
      </div>
    </div>
  );
}

function LanguageSwitch({
  language,
  onLanguageChange
}: {
  language: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
}) {
  return (
    <div className="language-switch" aria-label={t(language, "language.label")}>
      <span>{t(language, "language.label")}</span>
      <button
        className={language === "zh-CN" ? "active" : ""}
        onClick={() => onLanguageChange("zh-CN")}
        type="button"
      >
        {t(language, "language.zh")}
      </button>
      <button
        className={language === "en-US" ? "active" : ""}
        onClick={() => onLanguageChange("en-US")}
        type="button"
      >
        {t(language, "language.en")}
      </button>
    </div>
  );
}

function qualityGateStatusLabel(
  status: StrategyPackageValidationReport["qualityGates"][number]["status"],
  language: UiLanguage
) {
  if (status === "passed") return t(language, "training.qualityGatePassed");
  if (status === "failed") return t(language, "training.qualityGateFailed");
  if (status === "missing") return t(language, "training.qualityGateMissing");
  return t(language, "training.qualityGateNotApplicable");
}

function ConsoleDeck({
  status,
  romMetadata,
  romLibraryEntries,
  romLibraryDirLabel,
  romLibraryStatus,
  selectedRomEntry,
  selectedTasMovieId,
  startupLaunchPreset,
  tasCommentaryMode,
  tasPlaybackState,
  uiLanguage,
  globalTraining,
  validationReport,
  traceRecording,
  onDirectoryFiles,
  onLoadLocalRom,
  onSelectRom,
  onTasCommentaryModeChange,
  onTasLoad,
  onTasMovieSelect,
  onTasPause,
  onTasPlay,
  onTasStop,
  onTasApplyBaseline,
  onLanguageChange,
  onRun,
  onPause,
  onReset,
  onStartupLaunchPresetChange,
  onTrainingSaveStrategy,
  onTrainingSavePathSelected,
  onTrainingValidateStrategy,
  onTrainingVersionHistory,
  onPackageSideScopeToggle,
  onStrategyResourcePackChange,
  onStrategyExportNameChange,
  onSync2PResourceTo1P
}: {
  status: RuntimeStatus;
  romMetadata: RomMetadata | null;
  romLibraryEntries: RomLibraryEntry[];
  romLibraryDirLabel: string;
  romLibraryStatus: RomLibraryStatusState;
  selectedRomEntry: RomLibraryEntry | null;
  selectedTasMovieId: string;
  startupLaunchPreset: StartupLaunchPreset;
  tasCommentaryMode: TasCommentaryMode;
  tasPlaybackState: TasPlaybackUiState;
  uiLanguage: UiLanguage;
  globalTraining: GlobalTrainingState;
  validationReport: StrategyPackageValidationReport | null;
  traceRecording: boolean;
  onDirectoryFiles: (files: FileList | null) => void;
  onLoadLocalRom: () => void;
  onSelectRom: (id: string) => void;
  onTasCommentaryModeChange: (mode: TasCommentaryMode) => void;
  onTasLoad: () => void;
  onTasMovieSelect: (movieId: string) => void;
  onTasPause: () => void;
  onTasPlay: () => void;
  onTasStop: () => void;
  onTasApplyBaseline: (baseline: TasStrategyBaseline, side: PlayerSide) => void;
  onLanguageChange: (language: UiLanguage) => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onStartupLaunchPresetChange: (preset: StartupLaunchPreset) => void;
  onTrainingSaveStrategy: () => void;
  onTrainingSavePathSelected: (pathLabel: string) => void;
  onTrainingValidateStrategy: () => void;
  onTrainingVersionHistory: () => void;
  onPackageSideScopeToggle: (side: PlayerSide) => void;
  onStrategyResourcePackChange: (side: PlayerSide, packId: StrategyResourcePackId) => void;
  onStrategyExportNameChange: (name: string) => void;
  onSync2PResourceTo1P: () => void;
}) {
  const directoryInputRef = useRef<HTMLInputElement | null>(null);
  const isRunning = status === "running";
  const hasRom = status === "loaded" || status === "running" || status === "paused";
  const selectedMetadata = selectedRomEntry?.metadata ?? null;
  const selectedUiStatus = cartridgeUiStatus(selectedMetadata);
  const loadedUiStatus = cartridgeUiStatus(romMetadata);
  const selectedTas = identifyTasForRom(selectedMetadata);
  const loadedTas = identifyTasForRom(romMetadata);
  const directoryInputProps = { webkitdirectory: "", directory: "" } as Record<string, string>;

  return (
    <section className="console-deck" aria-label="主机">
      <div className="console-status-strip">
        <span>{t(uiLanguage, "console.path")}：{romMetadata?.filePath || t(uiLanguage, "console.noLocalPath")}</span>
        <strong>{t(uiLanguage, "console.hostStatus")}：{runtimeStatusLabel(status, uiLanguage)}</strong>
      </div>
      <div className="console-left">
        <div className="panel-title">
          <Cpu size={18} />
          <span>{t(uiLanguage, "console.host")}</span>
          <small className="hardware-spec">{FC_HARDWARE_SPEC}</small>
          <LanguageSwitch language={uiLanguage} onLanguageChange={onLanguageChange} />
        </div>
        <div className="cartridge-slot">
          <input
            {...directoryInputProps}
            accept=".nes"
            className="hidden-file-input"
            multiple
            onChange={(event) => {
              onDirectoryFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
            ref={directoryInputRef}
            type="file"
          />
          <div className="rom-library-browser">
            <div className="rom-library-header">
              <div>
                <span>{t(uiLanguage, "console.romDirectory")}</span>
                <strong>{romLibraryDirLabel}</strong>
                <small>{romLibraryStatusLabel(romLibraryStatus, uiLanguage)}</small>
              </div>
              <button onClick={() => directoryInputRef.current?.click()} type="button">
                <FolderOpen size={15} />
                {t(uiLanguage, "console.chooseRomDirectory")}
              </button>
            </div>
            <div className="rom-library-body">
              <div className="rom-list" aria-label={t(uiLanguage, "console.romList")}>
                {romLibraryEntries.length > 0 ? romLibraryEntries.map((entry) => (
                  <button
                    className={entry.id === selectedRomEntry?.id ? "rom-list-item active" : "rom-list-item"}
                    key={entry.id}
                    onClick={() => onSelectRom(entry.id)}
                    type="button"
                  >
                    <span>{entry.relativePath}</span>
                    <small>{entry.metadata.romProfileId !== "unknown" ? entry.metadata.romProfileId : entry.metadata.mapperLabel}</small>
                  </button>
                )) : (
                  <div className="rom-list-empty">{t(uiLanguage, "console.waitingRomDirectory")}</div>
                )}
              </div>
              <div className="rom-detail" aria-label={t(uiLanguage, "console.selectedRomInfo")}>
                <span>{t(uiLanguage, "console.selectedCartridge")}</span>
                <strong>{romEntryTitle(selectedRomEntry)}</strong>
                {selectedMetadata ? (
                  <div className="rom-meta-grid compact" aria-label="选中 ROM 详情">
                    <div>
                      <span>{t(uiLanguage, "console.chineseTitle")}</span>
                      <b>{selectedUiStatus.chineseName}</b>
                    </div>
                    <div>
                      <span>{t(uiLanguage, "console.strategy")}</span>
                      <b>{localizedStrategyStatusLabel(selectedUiStatus.strategyStatus, uiLanguage)}</b>
                    </div>
                    <div>
                      <span>TAS</span>
                      <b>{localizedTasStatusLabel(selectedTas, uiLanguage)}</b>
                    </div>
                    <div>
                      <span>{t(uiLanguage, "console.version")}</span>
                      <b>{selectedMetadata.versionLabel}</b>
                    </div>
                    <div>
                      <span>{t(uiLanguage, "console.profile")}</span>
                      <b>{selectedMetadata.romProfileId}</b>
                    </div>
                    <div>
                      <span>{t(uiLanguage, "console.support")}</span>
                      <b>{localizedRomSupportLabel(selectedMetadata.romSupportLabel, uiLanguage)}</b>
                    </div>
                    <div>
                      <span>{t(uiLanguage, "console.size")}</span>
                      <b>{selectedMetadata.sizeLabel}</b>
                    </div>
                    <div>
                      <span>Mapper</span>
                      <b>{selectedMetadata.mapperLabel}</b>
                    </div>
                    <div>
                      <span>PRG/CHR</span>
                      <b>{selectedMetadata.prgRomKb} KB / {selectedMetadata.chrRomKb} KB</b>
                    </div>
                    <div>
                      <span>MD5</span>
                      <b>{selectedMetadata.md5Short || pendingHashLabel(uiLanguage)}</b>
                    </div>
                    <div>
                      <span>SHA1</span>
                      <b>{selectedMetadata.sha1Short || pendingHashLabel(uiLanguage)}</b>
                    </div>
                    <div>
                      <span>SHA256</span>
                      <b>{selectedMetadata.sha256Short || pendingHashLabel(uiLanguage)}</b>
                    </div>
                  </div>
                ) : (
                  <small>{t(uiLanguage, "console.selectRomHint")}</small>
                )}
              </div>
            </div>
          </div>
          <div className="loaded-cartridge-strip" aria-label="当前已插入卡带">
            <span>{t(uiLanguage, "console.currentInserted")}</span>
            {romMetadata ? (
              <>
                <strong>{loadedUiStatus.chineseName} · {romMetadata.displayTitle}</strong>
                <small>{romMetadata.romProfileId} / {localizedStrategyStatusLabel(loadedUiStatus.strategyStatus, uiLanguage)} / {localizedRomSupportLabel(romMetadata.romSupportLabel, uiLanguage)} / {localizedTasStatusLabel(loadedTas, uiLanguage)}</small>
              </>
            ) : (
              <>
                <strong>{hasRom ? t(uiLanguage, "console.localRomInserted") : t(uiLanguage, "console.waitingCartridge")}</strong>
                <small>{t(uiLanguage, "console.loadCartridgeHint")}</small>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="console-power-panel">
        <div className="startup-preset-row" aria-label={uiLanguage === "en-US" ? "Startup preset" : "开局预设"}>
          <span>{uiLanguage === "en-US" ? "Startup" : "开局预设"}</span>
          {startupPresetOptions.map((option) => (
            <button
              className={option.key === startupLaunchPreset ? "startup-preset-button active" : "startup-preset-button"}
              key={option.key}
              onClick={() => onStartupLaunchPresetChange(option.key)}
              type="button"
            >
              <strong>{option.label[uiLanguage]}</strong>
              <small>{option.detail[uiLanguage]}</small>
            </button>
          ))}
        </div>
        <div className="console-controls">
          <button disabled={!selectedRomEntry} onClick={onLoadLocalRom} type="button"><Upload size={15} /> {t(uiLanguage, "console.loadCartridge")}</button>
          <button disabled={!hasRom} onClick={isRunning ? onPause : onRun} type="button">
            <Power size={15} />
            {isRunning ? t(uiLanguage, "console.pause") : t(uiLanguage, "console.continue")}
          </button>
          <button disabled={!hasRom} onClick={onReset} type="button"><RotateCcw size={15} /> Reset</button>
        </div>
      </div>
      <TasWindow
        commentaryMode={tasCommentaryMode}
        onCommentaryModeChange={onTasCommentaryModeChange}
        onLoad={onTasLoad}
        onMovieSelect={onTasMovieSelect}
        onPause={onTasPause}
        onPlay={onTasPlay}
        onStop={onTasStop}
        onApplyBaseline={onTasApplyBaseline}
        language={uiLanguage}
        playback={tasPlaybackState}
        selectedMovieId={selectedTasMovieId}
        tasEntry={loadedTas}
      />
      <OperationStrategyControl
        language={uiLanguage}
        training={globalTraining}
        validationReport={validationReport}
        onTrainingSaveStrategy={onTrainingSaveStrategy}
        onTrainingSavePathSelected={onTrainingSavePathSelected}
        onTrainingValidateStrategy={onTrainingValidateStrategy}
        onTrainingVersionHistory={onTrainingVersionHistory}
        onPackageSideScopeToggle={onPackageSideScopeToggle}
        onStrategyResourcePackChange={onStrategyResourcePackChange}
        onStrategyExportNameChange={onStrategyExportNameChange}
        onSync2PResourceTo1P={onSync2PResourceTo1P}
        traceRecording={traceRecording}
      />
    </section>
  );
}

function TacticalPanel({
  ramSnapshot,
  gameplayActive,
  strategyKey,
  strategyPlans,
  language,
  onOpenStrategyDesigner
}: {
  ramSnapshot: GameRamSnapshot | null;
  gameplayActive: boolean;
  strategyKey: AiStrategyKey;
  strategyPlans: LoadedStrategyPlans;
  language: UiLanguage;
  onOpenStrategyDesigner: () => void;
}) {
  const threatCount = ramSnapshot?.enemies.filter((enemy) => enemy.threat).length ?? 0;
  const route = routeLineForStrategy(strategyKey, ramSnapshot, strategyPlans);
  const horizon = buildStageOneHorizon(ramSnapshot);
  const stackRows = [
    { label: t(language, "tactical.survival"), value: gameplayActive ? t(language, "tactical.operable") : ramSnapshot ? t(language, "value.notInGame") : t(language, "value.waitingRam"), icon: Shield },
    { label: t(language, "tactical.route"), value: ramSnapshot ? `${route.segment} / ${route.action}` : t(language, "tactical.waitingWorldX"), icon: MapIcon },
    { label: t(language, "tactical.horizon"), value: horizon?.primary ? horizon.primary.label : t(language, "tactical.waitingTarget"), icon: Gauge },
    { label: t(language, "tactical.coop"), value: t(language, "tactical.queued"), icon: HeartPulse },
    { label: t(language, "tactical.combat"), value: ramSnapshot ? `${threatCount} ${t(language, "value.threatSuffix")}` : t(language, "tactical.inputOnly"), icon: Target },
    { label: t(language, "tactical.advance"), value: ramSnapshot ? `${t(language, "tactical.screen")} ${ramSnapshot.screen}` : t(language, "tactical.controlled"), icon: Activity }
  ];

  return (
    <section className="tactical-panel">
      <div className="panel-title">
        <Brain size={18} />
        <span>{t(language, "tactical.title")}</span>
      </div>
      <div className="state-strip">
        <div>
          <dt>CameraX</dt>
          <dd>{ramSnapshot ? ramSnapshot.cameraX : t(language, "tactical.waiting")}</dd>
        </div>
        <div>
          <dt>PlayerX</dt>
          <dd>{ramSnapshot ? ramSnapshot.playerX : t(language, "tactical.waiting")}</dd>
        </div>
        <div>
          <dt>WorldX</dt>
          <dd>{ramSnapshot ? ramSnapshot.worldX : t(language, "tactical.waiting")}</dd>
        </div>
        <div>
          <dt>{t(language, "tactical.screen")}</dt>
          <dd>{ramSnapshot ? ramSnapshot.screen : t(language, "tactical.waiting")}</dd>
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
      <button className="tactical-action" onClick={onOpenStrategyDesigner} type="button">
        <MapIcon size={16} />
        {t(language, "tactical.strategyDesigner")}
      </button>
    </section>
  );
}

function LogPanel({ eventLog, language }: { eventLog: string[]; language: UiLanguage }) {
  return (
    <section className="log-panel">
      <div className="panel-title">
        <Radio size={18} />
        <span>{t(language, "log.title")}</span>
      </div>
      <div className="log-lines">
        {eventLog.map((line) => (
          <p key={line}>{localizedEventLogLine(line, language)}</p>
        ))}
      </div>
    </section>
  );
}

function DataGroupView({ title, items }: { title: string; items: StatItem[] }) {
  return (
    <div className="data-section">
      <div className="data-section-title">{title}</div>
      <div className="data-grid">
        {items.map((item) => (
          <div className={`data-cell ${item.status ?? "pending"}`} key={`${title}-${item.label}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataDashboard({
  ramSnapshot,
  status,
  audioStatus,
  frameCount,
  gameplayActive,
  buttonStates,
  controlModes,
  strategyModels,
  strategyPlans,
  playerMetrics,
  deathTraceReports,
  traceRecording,
  traceSampleCount,
  traceLastSummary,
  language,
  onTraceStart,
  onTraceStop,
  onTraceClear,
  onTraceExport
}: {
  ramSnapshot: GameRamSnapshot | null;
  status: RuntimeStatus;
  audioStatus: AudioStatus;
  frameCount: number;
  gameplayActive: boolean;
  buttonStates: PlayerButtonStates;
  controlModes: Record<PlayerSide, ControlMode>;
  strategyModels: Record<PlayerSide, AiStrategyKey>;
  strategyPlans: LoadedStrategyPlans;
  playerMetrics: PlayerMetricStates;
  deathTraceReports: DeathTraceReport[];
  traceRecording: boolean;
  traceSampleCount: number;
  traceLastSummary: string;
  language: UiLanguage;
  onTraceStart: () => void;
  onTraceStop: () => void;
  onTraceClear: () => void;
  onTraceExport: () => void;
}) {
  const p1Route = routeLineForStrategy(strategyModels["1P"], tacticalSnapshotForSide(ramSnapshot, "1P"), strategyPlans);
  const p2Route = routeLineForStrategy(strategyModels["2P"], tacticalSnapshotForSide(ramSnapshot, "2P"), strategyPlans);
  const enemies = ramSnapshot?.enemies ?? [];
  const bullets = ramSnapshot?.bullets ?? [];
  const threatCount = enemies.filter((enemy) => enemy.threat).length;
  const fixedCount = enemies.filter((enemy) => enemy.fixed).length;
  const horizon = buildStageOneHorizon(ramSnapshot);
  const waitingRam = t(language, "value.waitingRam");
  const waitingWorldX = t(language, "tactical.waitingWorldX");
  const topEnemies = enemies
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);
  const topBullets = bullets.slice(0, 8);
  const groups: MetricGroup[] = [
    {
      title: t(language, "data.runtime"),
      items: [
        { label: t(language, "data.host"), value: runtimeStatusLabel(status, language), status: "real" },
        { label: t(language, "data.audio"), value: runtimeAudioLabel(audioStatus, language), status: "real" },
        { label: t(language, "data.frames"), value: `${frameCount}`, status: "real" },
        { label: t(language, "data.operable"), value: localizedBoolText(gameplayActive, language), status: "real" },
        { label: t(language, "data.level"), value: ramSnapshot ? `${ramSnapshot.level}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.twoPlayer"), value: ramSnapshot ? localizedBoolText(ramSnapshot.twoPlayerActive, language) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.modeRam"), value: ramSnapshot ? `${formatByte(ramSnapshot.playerMode)} / ${formatByte(ramSnapshot.playerModeAlt)}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: "GameOver", value: ramSnapshot ? `${ramSnapshot.gameOver} / ${ramSnapshot.p2GameOver}` : waitingRam, status: ramSnapshot ? "real" : "pending" }
      ]
    },
    {
      title: t(language, "data.route"),
      items: [
        { label: t(language, "data.screen"), value: ramSnapshot ? `${ramSnapshot.screen}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.scroll"), value: ramSnapshot ? `${ramSnapshot.scroll}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: "CameraX", value: ramSnapshot ? `${ramSnapshot.cameraX}` : waitingRam, status: ramSnapshot ? "derived" : "pending" },
        { label: "1P WorldX", value: ramSnapshot ? `${ramSnapshot.worldX}` : waitingRam, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.p1Coord"), value: ramSnapshot ? `${ramSnapshot.playerX}, ${ramSnapshot.playerY}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: "2P WorldX", value: ramSnapshot ? `${ramSnapshot.p2WorldX}` : waitingRam, status: ramSnapshot?.twoPlayerActive ? "derived" : "pending" },
        { label: t(language, "data.p2Coord"), value: ramSnapshot ? `${ramSnapshot.p2PlayerX}, ${ramSnapshot.p2PlayerY}` : waitingRam, status: ramSnapshot?.twoPlayerActive ? "real" : "pending" },
        { label: t(language, "data.p1Route"), value: `${p1Route.segment} / ${p1Route.action}`, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.p2Route"), value: `${p2Route.segment} / ${p2Route.action}`, status: ramSnapshot ? "derived" : "pending" },
        { label: "Boss", value: ramSnapshot ? localizedBoolText(ramSnapshot.bossDefeated !== 0, language) : waitingRam, status: ramSnapshot ? "real" : "pending" }
      ]
    },
    {
      title: "1P",
      items: [
        { label: t(language, "data.control"), value: `${localizedControlModeLabel(controlModes["1P"], language)} / ${localizedAiStrategyUsageLabel(controlModes["1P"], strategyModels["1P"], language)}`, status: "mode" },
        { label: t(language, "data.routePlan"), value: localizedRoutePlanUsageLabel(controlModes["1P"], strategyModels["1P"], strategyPlans, language), status: aiControlIsActive(controlModes["1P"]) ? "derived" : "pending" },
        { label: t(language, "data.lives"), value: ramSnapshot ? `${ramSnapshot.p1Lives}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.state"), value: ramSnapshot ? localizedPlayerStateLabel(ramSnapshot.p1State, language) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.jump"), value: ramSnapshot ? formatByte(ramSnapshot.jumpState) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.weapon"), value: ramSnapshot ? currentWeaponLabel(ramSnapshot.weapon, language) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.barrier"), value: ramSnapshot ? `${ramSnapshot.p1BarrierTimer}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.input"), value: activeInputText(buttonStates["1P"], language), status: "real" }
      ]
    },
    {
      title: "2P",
      items: [
        { label: t(language, "data.control"), value: `${localizedControlModeLabel(controlModes["2P"], language)} / ${localizedAiStrategyUsageLabel(controlModes["2P"], strategyModels["2P"], language)}`, status: "mode" },
        { label: t(language, "data.routePlan"), value: localizedRoutePlanUsageLabel(controlModes["2P"], strategyModels["2P"], strategyPlans, language), status: aiControlIsActive(controlModes["2P"]) ? "derived" : "pending" },
        { label: t(language, "data.lives"), value: ramSnapshot ? `${ramSnapshot.p2Lives}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.state"), value: ramSnapshot ? localizedPlayerStateLabel(ramSnapshot.p2State, language) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.jump"), value: ramSnapshot ? formatByte(ramSnapshot.p2JumpState) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.weapon"), value: ramSnapshot ? currentWeaponLabel(ramSnapshot.p2Weapon, language) : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.barrier"), value: ramSnapshot ? `${ramSnapshot.p2BarrierTimer}` : waitingRam, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.input"), value: activeInputText(buttonStates["2P"], language), status: "real" }
      ]
    },
    {
      title: t(language, "data.combat"),
      items: [
        { label: t(language, "data.enemySlots"), value: `${enemies.length}`, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.threats"), value: `${threatCount}`, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.fixedFire"), value: `${fixedCount}`, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.rewards"), value: `${rewardCount(enemies)}`, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.horizonTarget"), value: horizon?.primary ? horizon.primary.label : waitingWorldX, status: horizon?.primary ? "derived" : "pending" },
        { label: t(language, "data.horizonCategory"), value: horizon?.primary ? localizedHorizonCategoryLabel(horizon.primary.category, language) : waitingWorldX, status: horizon?.primary ? "derived" : "pending" },
        { label: t(language, "data.horizonDistance"), value: horizon?.primary ? `${horizon.primary.distance}` : waitingWorldX, status: horizon?.primary ? "derived" : "pending" },
        { label: t(language, "data.horizonEvents"), value: horizon ? `${horizon.near.length} / ${horizon.upcoming.length}` : waitingWorldX, status: horizon ? "derived" : "pending" },
        { label: t(language, "data.bulletSlots"), value: `${bullets.length}`, status: ramSnapshot ? "real" : "pending" },
        { label: t(language, "data.p1Bullets"), value: `${countBulletsForOwner(bullets, 0)}`, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.p2Bullets"), value: `${countBulletsForOwner(bullets, 1)}`, status: ramSnapshot ? "derived" : "pending" },
        { label: t(language, "data.highScore"), value: ramSnapshot ? formatScore(ramSnapshot.highScore) : waitingRam, status: ramSnapshot ? "real" : "pending" }
      ]
    },
    {
      title: t(language, "data.total"),
      items: [
        { label: t(language, "data.p1Score"), value: formatScore(playerMetrics["1P"].score), status: "real" },
        { label: t(language, "data.p1Deaths"), value: `${playerMetrics["1P"].deaths}`, status: "real" },
        { label: t(language, "data.p1Shots"), value: `${playerMetrics["1P"].bulletSpawns}`, status: "derived" },
        { label: t(language, "data.p1Kills"), value: `${playerMetrics["1P"].kills}`, status: "derived" },
        { label: t(language, "data.p2Score"), value: formatScore(playerMetrics["2P"].score), status: "real" },
        { label: t(language, "data.p2Deaths"), value: `${playerMetrics["2P"].deaths}`, status: ramSnapshot?.twoPlayerActive ? "real" : "pending" },
        { label: t(language, "data.p2Shots"), value: `${playerMetrics["2P"].bulletSpawns}`, status: ramSnapshot?.twoPlayerActive ? "derived" : "pending" },
        { label: t(language, "data.p2Kills"), value: `${playerMetrics["2P"].kills}`, status: ramSnapshot?.twoPlayerActive ? "derived" : "pending" }
      ]
    }
  ];

  return (
    <section className="data-dashboard" aria-label={t(language, "data.title")}>
      <div className="data-dashboard-head">
        <div className="panel-title">
          <Database size={18} />
          <span>{t(language, "data.title")}</span>
        </div>
        <div className="trace-actions">
          <span>{traceRecording ? t(language, "data.recording") : localizedTraceSummary(traceLastSummary, false, language)}</span>
          <button disabled={traceRecording} onClick={onTraceStart} type="button">{t(language, "data.startRecord")}</button>
          <button disabled={!traceRecording} onClick={onTraceStop} type="button">{t(language, "training.stop")}</button>
          <button disabled={traceSampleCount === 0 || traceRecording} onClick={onTraceExport} type="button">{t(language, "training.export")}</button>
          <button disabled={traceSampleCount === 0 || traceRecording} onClick={onTraceClear} type="button">{t(language, "training.clear")}</button>
        </div>
        <output data-testid="death-trace-json" hidden>{JSON.stringify(deathTraceReports)}</output>
      </div>
      <div className="data-groups">
        {groups.map((group) => <DataGroupView key={group.title} title={group.title} items={group.items} />)}
      </div>
      <div className="slot-tables">
        <div className="slot-table-card">
          <div className="data-section-title">{t(language, "data.enemyTop")}</div>
          <table>
            <thead>
              <tr>
                <th>{t(language, "data.slot")}</th>
                <th>{t(language, "data.type")}</th>
                <th>HP</th>
                <th>X/Y</th>
                <th>Routine</th>
                <th>{t(language, "data.category")}</th>
                <th>{t(language, "data.threats")}</th>
              </tr>
            </thead>
            <tbody>
              {topEnemies.length > 0 ? topEnemies.map((enemy) => (
                <tr key={enemy.slot}>
                  <td>{enemy.slot}</td>
                  <td>{formatByte(enemy.type)}</td>
                  <td>{enemy.hp}</td>
                  <td>{enemy.x}/{enemy.y}</td>
                  <td>{formatByte(enemy.routine)}</td>
                  <td>{enemy.kind}</td>
                  <td>{localizedBoolText(enemy.threat, language)}</td>
                </tr>
              )) : (
                <tr><td colSpan={7}>{t(language, "data.waitingEnemySlots")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="slot-table-card">
          <div className="data-section-title">{t(language, "data.bulletTop")}</div>
          <table>
            <thead>
              <tr>
                <th>{t(language, "data.slot")}</th>
                <th>{t(language, "data.owner")}</th>
                <th>X/Y</th>
                <th>Routine</th>
                <th>SlotCode</th>
                <th>Sprite</th>
              </tr>
            </thead>
            <tbody>
              {topBullets.length > 0 ? topBullets.map((bullet) => (
                <tr key={bullet.slot}>
                  <td>{bullet.slot}</td>
                  <td>{bulletOwnerLabel(bullet.owner)}</td>
                  <td>{bullet.x}/{bullet.y}</td>
                  <td>{formatByte(bullet.routine)}</td>
                  <td>{formatByte(bullet.bulletSlotCode)}</td>
                  <td>{formatByte(bullet.spriteCode)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6}>{t(language, "data.waitingBulletSlots")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="trace-summary">
        <span>{t(language, "data.traceSamples")}: {traceSampleCount}</span>
        <span>{t(language, "data.traceFields")}</span>
      </div>
    </section>
  );
}

function StrategyDesignerPanel({
  open,
  draft,
  status,
  language,
  onDraftChange,
  onClose,
  onReset,
  onSave,
  onApply1P,
  onApply2P
}: {
  open: boolean;
  draft: string;
  status: string;
  language: UiLanguage;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
  onApply1P: () => void;
  onApply2P: () => void;
}) {
  if (!open) return null;
  return (
    <section className="strategy-designer" aria-label={t(language, "designer.title")}>
      <div className="strategy-designer-head">
        <div className="panel-title">
          <MapIcon size={18} />
          <span>{t(language, "designer.title")}</span>
        </div>
        <button className="icon-button" onClick={onClose} type="button">{t(language, "designer.close")}</button>
      </div>
      <div className="strategy-designer-meta">
        <span>Contra Stage 1</span>
        <strong>{status}</strong>
      </div>
      <textarea
        aria-label={t(language, "designer.personalJson")}
        className="strategy-editor"
        onChange={(event) => onDraftChange(event.target.value)}
        spellCheck={false}
        value={draft}
      />
      <div className="strategy-designer-actions">
        <button onClick={onReset} type="button">{t(language, "designer.restoreTemplate")}</button>
        <button onClick={onSave} type="button">{t(language, "designer.savePersonal")}</button>
        <button onClick={onApply1P} type="button">{t(language, "designer.apply1P")}</button>
        <button onClick={onApply2P} type="button">{t(language, "designer.apply2P")}</button>
      </div>
    </section>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvRef = useRef<HTMLDivElement | null>(null);
  const screenFrameRef = useRef<HTMLDivElement | null>(null);
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
  const autoRecordStartedRef = useRef(false);
  const botRunStartedRef = useRef(false);
  const startupLaunchPresetRef = useRef<StartupLaunchPreset>("wait");
  const romSelectionTouchedRef = useRef(false);
  const audioBlockedLoggedRef = useRef(false);
  const audioOnLoggedRef = useRef(false);
  const gameplayActiveRef = useRef(false);
  const ramSnapshotRef = useRef<GameRamSnapshot | null>(null);
  const deathLatchedRef = useRef<Record<PlayerSide, boolean>>({ "1P": false, "2P": false });
  const finalButtonsRef = useRef<PlayerButtonStates>(createPlayerButtonStates());
  const playerMetricsRef = useRef<PlayerMetricStates>(createPlayerMetricStates());
  const sourceButtonsRef = useRef(createSourceInputStates());
  const tasMovieRef = useRef<Fm2Movie | null>(null);
  const tasPlaybackGuardRef = useRef<TasPlaybackGuardState>(createTasPlaybackGuardState());
  const tasPlaybackRef = useRef({
    active: false,
    movieId: "",
    frameIndex: 0
  });
  const traceRecordingRef = useRef(false);
  const traceSamplesRef = useRef<PlayTraceSample[]>([]);
  const traceCaptureConfigRef = useRef<TraceCaptureConfig | null>(null);
  const traceCaptureEnteredRef = useRef(false);
  const recentTraceSamplesRef = useRef<PlayTraceSample[]>([]);
  const lastDeathTraceRef = useRef<DeathTraceReport | null>(null);
  const deathTraceLatchedRef = useRef<Record<PlayerSide, boolean>>({ "1P": false, "2P": false });
  const strategyPlansRef = useRef<LoadedStrategyPlans>(defaultStrategyPlans);
  const aiActionLocksRef = useRef<Record<PlayerSide, AiActionLockState>>(createAiActionLockStates());
  const aiFsmStatesRef = useRef<Record<PlayerSide, AiFsmState>>(createAiFsmStates());
  const aiLoopExitStatesRef = useRef<Record<PlayerSide, AiLoopExitState>>(createAiLoopExitStates());
  const bossWallPhaseStatesRef = useRef<Record<PlayerSide, BossWallPhaseState>>(createBossWallPhaseStates());
  const lastRawAiButtonsRef = useRef<PlayerButtonStates>(createPlayerButtonStates());
  const lastLockedAiButtonsRef = useRef<PlayerButtonStates>(createPlayerButtonStates());
  const controlModesRef = useRef<Record<PlayerSide, ControlMode>>({ "1P": "human", "2P": "human" });
  const strategyModelsRef = useRef<Record<PlayerSide, AiStrategyKey>>({
    "1P": defaultAiStrategyForSide("1P"),
    "2P": defaultAiStrategyForSide("2P")
  });
  const gamepadLabelsRef = useRef<Record<PlayerSide, string>>({
    "1P": gamepadLabel(null, 0),
    "2P": gamepadLabel(null, 1)
  });
  const [status, setStatus] = useState<RuntimeStatus>("no-rom");
  const [startupLaunchPreset, setStartupLaunchPreset] = useState<StartupLaunchPreset>("wait");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("off");
  const [message, setMessage] = useState("加载本地用户自有 ROM 后开始真实模拟器测试。");
  const [romMetadata, setRomMetadata] = useState<RomMetadata | null>(null);
  const [romLibraryEntries, setRomLibraryEntries] = useState<RomLibraryEntry[]>([]);
  const [selectedRomId, setSelectedRomId] = useState("");
  const [romLibraryDirLabel, setRomLibraryDirLabel] = useState("D:\\Ai-Play\\ROM");
  const [romLibraryStatus, setRomLibraryStatus] = useState<RomLibraryStatusState>({ code: "scanning-default" });
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(DEFAULT_LANGUAGE);
  const [frameCount, setFrameCount] = useState(0);
  const [ramSnapshot, setRamSnapshot] = useState<GameRamSnapshot | null>(null);
  const [gameplayActive, setGameplayActive] = useState(false);
  const [buttonStates, setButtonStates] = useState<PlayerButtonStates>(createPlayerButtonStates);
  const [playerMetrics, setPlayerMetrics] = useState<PlayerMetricStates>(createPlayerMetricStates);
  const [strategyPlans, setStrategyPlans] = useState<LoadedStrategyPlans>(defaultStrategyPlans);
  const [strategyDesignerOpen, setStrategyDesignerOpen] = useState(false);
  const [strategyDraft, setStrategyDraft] = useState(() => JSON.stringify(createDefaultPersonalPlan(), null, 2));
  const [strategyDraftStatus, setStrategyDraftStatus] = useState("个人策略未保存");
  const [traceRecording, setTraceRecording] = useState(false);
  const [traceSampleCount, setTraceSampleCount] = useState(0);
  const [traceLastSummary, setTraceLastSummary] = useState("轨迹未记录");
  const [deathTraceReports, setDeathTraceReports] = useState<DeathTraceReport[]>([]);
  const [playTraceReport, setPlayTraceReport] = useState<PlayTraceAnalysisReport | null>(null);
  const [traceSampleSnapshot, setTraceSampleSnapshot] = useState<PlayTraceSample[]>([]);
  const [sideTrainingTraceEvidence, setSideTrainingTraceEvidence] = useState<Record<PlayerSide, StrategyTraceEvidence | null>>({
    "1P": null,
    "2P": null
  });
  const [strategyPackageValidationReport, setStrategyPackageValidationReport] = useState<StrategyPackageValidationReport | null>(null);
  const [strategyPackageEvidenceExport, setStrategyPackageEvidenceExport] = useState<StrategyPackageEvidenceExport | null>(null);
  const [botRunReport, setBotRunReport] = useState<BotRunReport>(createIdleBotRunReport);
  const [packageSideScope, setPackageSideScope] = useState<StrategyPackageSideScope>("1p-only");
  const [strategyExportName, setStrategyExportName] = useState<string>(ACTIVE_STRATEGY_PACK.displayName["zh-CN"]);
  const [validationReplayComplete, setValidationReplayComplete] = useState(false);
  const [strategySavePathLabel, setStrategySavePathLabel] = useState("");
  const [strategyVersionStatusLabel, setStrategyVersionStatusLabel] = useState("");
  const [strategyResourcePacksBySide, setStrategyResourcePacksBySide] = useState<Record<PlayerSide, StrategyResourcePackId>>({
    "1P": "contra-stage1-strategy-v0",
    "2P": "contra-stage1-strategy-v0"
  });
  const [selectedSideBaselineIds, setSelectedSideBaselineIds] = useState<Record<PlayerSide, string>>({
    "1P": DEFAULT_SIDE_BASELINE_ID,
    "2P": DEFAULT_SIDE_BASELINE_ID
  });
  const [selectedTrainingMethod, setSelectedTrainingMethod] = useState<SideTrainingMethod>(DEFAULT_SIDE_TRAINING_METHOD);
  const [selectedTrainingSides, setSelectedTrainingSides] = useState<Record<PlayerSide, boolean>>({
    "1P": true,
    "2P": false
  });
  const [activeTrainingSides, setActiveTrainingSides] = useState<Record<PlayerSide, boolean>>({
    "1P": false,
    "2P": false
  });
  const trainingSessionActive = activeTrainingSides["1P"] || activeTrainingSides["2P"];
  const [trainingRunActiveSides, setTrainingRunActiveSides] = useState<Record<PlayerSide, boolean>>({
    "1P": false,
    "2P": false
  });
  const trainingRunActive = trainingRunActiveSides["1P"] || trainingRunActiveSides["2P"];
  const [p2StrategyResourceOverridden, setP2StrategyResourceOverridden] = useState(false);
  const [selectedTasMovieId, setSelectedTasMovieId] = useState("");
  const [tasCommentaryMode, setTasCommentaryMode] = useState<TasCommentaryMode>("strategy-analysis");
  const [tasPlaybackState, setTasPlaybackState] = useState<TasPlaybackUiState>(createIdleTasPlaybackState);
  const [controlModes, setControlModes] = useState<Record<PlayerSide, ControlMode>>({ "1P": "human", "2P": "human" });
  const [strategyModels, setStrategyModels] = useState<Record<PlayerSide, AiStrategyKey>>({
    "1P": defaultAiStrategyForSide("1P"),
    "2P": defaultAiStrategyForSide("2P")
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
    "1P": "Waiting input",
    "2P": "Waiting input"
  });
  const [eventLog, setEventLog] = useState<string[]>([
    "PM：2P 输入路由准备中",
    "运行时：等待本地用户自有 ROM",
    "边界：仓库不提交、不打包 ROM",
    "BOT：AI 模式当前为安全占位"
  ]);

  const appendLog = useCallback((line: string) => {
    setEventLog((current) => {
      const next = line.startsWith("声音：")
        ? current.filter((item) => !item.startsWith("声音："))
        : current;
      return [line, ...next].slice(0, 10);
    });
  }, []);

  const selectedRomEntry = romLibraryEntries.find((entry) => entry.id === selectedRomId) ?? null;

  useEffect(() => {
    const nextSelectedId = resolveSelectedRomIdAfterLoadedSync(
      romLibraryEntries,
      romMetadata,
      selectedRomId,
      romSelectionTouchedRef.current
    );
    if (nextSelectedId && nextSelectedId !== selectedRomId) {
      setSelectedRomId(nextSelectedId);
    }
  }, [romLibraryEntries, romMetadata, selectedRomId]);

  const refreshDefaultRomLibrary = useCallback(async () => {
    try {
      const response = await fetch("/api/local-roms", { cache: "no-store" });
      if (!response.ok) throw new Error(`ROM library endpoint returned ${response.status}`);
      const body = await response.json() as { romLibraryDir?: string; roms?: ServerRomFileInfo[] };
      const entries = (body.roms ?? []).map(createServerRomEntry);
      const requestedRomId = findRomEntryIdByRelativePath(
        entries,
        new URLSearchParams(window.location.search).get("rom")
      );
      setRomLibraryEntries(entries);
      setRomLibraryDirLabel(body.romLibraryDir ?? "D:\\Ai-Play\\ROM");
      setRomLibraryStatus(entries.length > 0
        ? { code: "default-count", count: entries.length }
        : { code: "default-empty" });
      setSelectedRomId((current) => current || requestedRomId || entries[0]?.id || "");
      appendLog(`ROM库：默认目录扫描到 ${entries.length} 个卡带`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setRomLibraryStatus({ code: "default-error", detail });
      appendLog(`ROM库：扫描失败（${detail}）`);
    }
  }, [appendLog]);

  const hydrateBrowserRomEntry = useCallback(async (entry: RomLibraryEntry) => {
    if (entry.source !== "browser" || !entry.file || entry.bytes) return entry;
    const bytes = new Uint8Array(await entry.file.arrayBuffer());
    const [sha1, sha256] = await Promise.all([
      digestHex(bytes, "SHA-1"),
      digestHex(bytes, "SHA-256")
    ]);
    const metadata = parseNesRomMetadata(bytes, {
      fileName: entry.fileName,
      filePath: entry.relativePath,
      sha1,
      sha256,
      sizeBytes: entry.sizeBytes
    });
    const hydrated = { ...entry, bytes, metadata };
    setRomLibraryEntries((current) => current.map((item) => (item.id === entry.id ? hydrated : item)));
    return hydrated;
  }, []);

  const selectRomEntry = useCallback((id: string) => {
    romSelectionTouchedRef.current = true;
    setSelectedRomId(id);
    const entry = romLibraryEntries.find((item) => item.id === id);
    if (entry?.source === "browser" && !entry.bytes) {
      void hydrateBrowserRomEntry(entry).catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        appendLog(`ROM库：读取选中卡带失败（${detail}）`);
      });
    }
  }, [appendLog, hydrateBrowserRomEntry, romLibraryEntries]);

  const handleRomDirectoryFiles = useCallback((files: FileList | null) => {
    const nesFiles = Array.from(files ?? []).filter((file) => file.name.toLowerCase().endsWith(".nes"));
    if (nesFiles.length === 0) {
      setRomLibraryStatus({ code: "browser-empty" });
      appendLog("ROM库：所选目录未发现 .nes 卡带");
      return;
    }

    void Promise.all(nesFiles.map(createBrowserRomEntry)).then((entries) => {
      const firstRelativePath = (nesFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath || nesFiles[0].name;
      const topFolder = firstRelativePath.includes("/") ? firstRelativePath.split("/")[0] : "玩家选择目录";
      setRomLibraryEntries(entries);
      setSelectedRomId(entries[0]?.id ?? "");
      setRomLibraryDirLabel(`玩家目录：${topFolder}`);
      setRomLibraryStatus({ code: "browser-count", count: entries.length });
      appendLog(`ROM库：玩家目录导入 ${entries.length} 个卡带`);
    }).catch((error) => {
      const detail = error instanceof Error ? error.message : String(error);
      setRomLibraryStatus({ code: "browser-error", detail });
      appendLog(`ROM库：玩家目录读取失败（${detail}）`);
    });
  }, [appendLog]);

  useEffect(() => {
    void refreshDefaultRomLibrary();
  }, [refreshDefaultRomLibrary]);

  const startTraceRecording = useCallback((config?: TraceCaptureConfig | null) => {
    traceSamplesRef.current = [];
    traceCaptureConfigRef.current = config ?? null;
    traceCaptureEnteredRef.current = false;
    traceRecordingRef.current = true;
    setTraceRecording(true);
    setTraceSampleCount(0);
    setPlayTraceReport(null);
    setTraceSampleSnapshot([]);
    const windowLabel = config
      ? ` / ${config.startWorldX ?? "起点"}-${config.endWorldX ?? "终点"}`
      : "";
    setTraceLastSummary(`轨迹记录中${windowLabel}`);
    appendLog(`Trace：开始记录人类/AI 轨迹${windowLabel}`);
  }, [appendLog]);

  const stopTraceRecording = useCallback(() => {
    traceRecordingRef.current = false;
    traceCaptureConfigRef.current = null;
    traceCaptureEnteredRef.current = false;
    setTraceRecording(false);
    const count = traceSamplesRef.current.length;
    const report = count > 0 ? analyzePlayTrace(traceSamplesRef.current, "1P") : null;
    setPlayTraceReport(report);
    setTraceSampleSnapshot(traceSamplesRef.current.slice());
    setTraceSampleCount(count);
    setTraceLastSummary(report ? `已记录 ${count} 帧 / 击杀 ${report.kills.total} / 武器 ${report.weaponPickups.total} / 快速 ${report.fastPasses.length}` : "轨迹未记录");
    appendLog(`Trace：停止记录（${count} 帧）`);
  }, [appendLog]);

  const clearTraceRecording = useCallback(() => {
    traceSamplesRef.current = [];
    traceCaptureConfigRef.current = null;
    traceCaptureEnteredRef.current = false;
    traceRecordingRef.current = false;
    setTraceRecording(false);
    setTraceSampleCount(0);
    setPlayTraceReport(null);
    setTraceSampleSnapshot([]);
    setTraceLastSummary("轨迹已清空");
    appendLog("Trace：轨迹已清空");
  }, [appendLog]);

  const exportTraceRecording = useCallback(() => {
    const samples = traceSamplesRef.current;
    if (samples.length === 0) return;
    const payload = {
      schema: "fc-ai-play-trace-v1",
      createdAt: new Date().toISOString(),
      sampleCount: samples.length,
      samples
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fc-ai-play-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    appendLog(`Trace：已导出 ${samples.length} 帧`);
  }, [appendLog]);

  const exportStrategyTraceEvidence = useCallback((side: PlayerSide, evidence: StrategyTraceEvidence) => {
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fc-ai-strategy-trace-evidence-${side.toLowerCase()}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    appendLog(`TraceEvidence ${side}: archived ${evidence.sampleCount} frames / ${evidence.branchOutcome}`);
  }, [appendLog]);

  const downloadStrategyPackageEvidenceExport = useCallback((payload: StrategyPackageEvidenceExport) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fc-ai-strategy-package-evidence-${payload.packId}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    appendLog(`StrategyPackageEvidence: exported ${payload.packageFiles.length} files / ${payload.status}`);
  }, [appendLog]);

  useEffect(() => {
    let cancelled = false;
    const loadStrategyPlans = async () => {
      const personalPlan = loadPersonalStrategyPlan();
      const loadedPlans: LoadedStrategyPlans = {
        ...defaultStrategyPlans,
        "personal-v0": personalPlan
      };
      let loadedCount = 0;
      const entries = Object.entries(stageOneStrategyFiles) as Array<[AiStrategyKey, string]>;
      for (const [strategyKey, url] of entries) {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${url} returned ${response.status}`);
        const plan = validateStageStrategyPlan(await response.json());
        if (!plan) throw new Error(`${url} has invalid route schema`);
        loadedPlans[strategyKey] = plan;
        loadedCount += 1;
      }
      if (cancelled) return;
      strategyPlansRef.current = loadedPlans;
      setStrategyPlans(loadedPlans);
      setStrategyDraft(JSON.stringify(personalPlan, null, 2));
      setStrategyDraftStatus(window.localStorage.getItem(PERSONAL_STRATEGY_STORAGE_KEY) ? "已加载本地个人策略" : "使用默认个人策略模板");
      appendLog(`AI route: loaded ${loadedCount} stage1 plans`);
    };

    void loadStrategyPlans().catch((error) => {
      if (cancelled) return;
      const personalPlan = loadPersonalStrategyPlan();
      const fallbackPlans = {
        ...defaultStrategyPlans,
        "personal-v0": personalPlan
      };
      strategyPlansRef.current = fallbackPlans;
      setStrategyPlans(fallbackPlans);
      setStrategyDraft(JSON.stringify(personalPlan, null, 2));
      const detail = error instanceof Error ? error.message : String(error);
      appendLog(`AI route: fallback active (${detail})`);
    });

    return () => {
      cancelled = true;
    };
  }, [appendLog]);

  const addPlayerMetricDeltas = useCallback((side: PlayerSide, deltas: PlayerMetricDelta) => {
    const currentMetrics = playerMetricsRef.current[side];
    const nextCombat = { ...currentMetrics.combat };
    const nextWeapons = { ...currentMetrics.weapons };
    for (const key of Object.keys(deltas.combat ?? {}) as CombatMetricKey[]) {
      nextCombat[key] += deltas.combat?.[key] ?? 0;
    }
    for (const key of Object.keys(deltas.weapons ?? {}) as WeaponMetricKey[]) {
      nextWeapons[key] += deltas.weapons?.[key] ?? 0;
    }
    const updatedMetrics = {
      kills: currentMetrics.kills + (deltas.kills ?? 0),
      deaths: currentMetrics.deaths + (deltas.deaths ?? 0),
      score: deltas.score ?? currentMetrics.score,
      scoreGained: currentMetrics.scoreGained + (deltas.scoreGained ?? 0),
      shots: currentMetrics.shots + (deltas.shots ?? 0),
      jumps: currentMetrics.jumps + (deltas.jumps ?? 0),
      moves: currentMetrics.moves + (deltas.moves ?? 0),
      bulletSpawns: currentMetrics.bulletSpawns + (deltas.bulletSpawns ?? 0),
      combat: nextCombat,
      weapons: nextWeapons
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
    deathLatchedRef.current = { "1P": false, "2P": false };
    deathTraceLatchedRef.current = { "1P": false, "2P": false };
    recentTraceSamplesRef.current = [];
    lastDeathTraceRef.current = null;
    bossWallPhaseStatesRef.current = createBossWallPhaseStates();
    delete (window as unknown as { __fcAiLastDeathTrace?: DeathTraceReport }).__fcAiLastDeathTrace;
    setDeathTraceReports([]);
    setGameplayActive(false);
    setRamSnapshot(null);
  }, []);

  const isSourceAllowed = useCallback((side: PlayerSide, source: InputSource) => {
    const mode = controlModesRef.current[side];
    if (tasPlaybackRef.current.active) return source === "tas";
    if (source === "system") return true;
    if (source === "tas") return false;
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
      const sourceLabel = source === "keyboard" ? "Keyboard" : source === "gamepad" ? "Gamepad" : source === "panel" ? "Panel" : source === "tas" ? "TAS" : "AI";
      setLastInputs((current) => ({
        ...current,
        [side]: `${sourceLabel} input`
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

  const clearRuntimeOwnedInputs = useCallback(() => {
    for (const side of playerSides) {
      sourceButtonsRef.current[side].ai = createButtonState();
      sourceButtonsRef.current[side].tas = createButtonState();
      sourceButtonsRef.current[side].system = createButtonState();
      aiActionLocksRef.current[side] = createAiActionLockState();
      lastRawAiButtonsRef.current[side] = createButtonState();
      lastLockedAiButtonsRef.current[side] = createButtonState();
      recomputeSide(side);
    }
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
    aiActionLocksRef.current = createAiActionLockStates();
    aiFsmStatesRef.current = createAiFsmStates();
    aiLoopExitStatesRef.current = createAiLoopExitStates();
    bossWallPhaseStatesRef.current = createBossWallPhaseStates();
    setButtonStates(createPlayerButtonStates());
    setLastInputs({ "1P": "Waiting input", "2P": "Waiting input" });
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
    aiActionLocksRef.current[side] = createAiActionLockState();
    aiFsmStatesRef.current[side] = createAiFsmState();
    aiLoopExitStatesRef.current[side] = createAiLoopExitState();
    bossWallPhaseStatesRef.current[side] = createBossWallPhaseState();

    if (mode !== "human" && (strategyModelsRef.current[side] === "off" || strategyModelsRef.current[side] === "placeholder")) {
      const nextStrategy = defaultAiStrategyForSide(side);
      strategyModelsRef.current = {
        ...strategyModelsRef.current,
        [side]: nextStrategy
      };
      setStrategyModels((current) => ({
        ...current,
        [side]: nextStrategy
      }));
      appendLog(`${side} AI 策略：自动切换到${getAiStrategyLabel(nextStrategy)}`);
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

  const changeStartupLaunchPreset = useCallback((preset: StartupLaunchPreset) => {
    startupLaunchPresetRef.current = preset;
    setStartupLaunchPreset(preset);

    if (preset === "auto-1p") {
      changeControlMode("1P", "ai");
      changeControlMode("2P", "human");
      changeStrategyModel("1P", defaultAiStrategyForSide("1P"));
    }

    if (preset === "auto-2p") {
      changeControlMode("1P", "human");
      changeControlMode("2P", "ai");
      changeStrategyModel("2P", defaultAiStrategyForSide("2P"));
    }

    const label = startupPresetOptions.find((option) => option.key === preset)?.label["zh-CN"] ?? preset;
    appendLog(`Startup preset: ${label}`);
  }, [appendLog, changeControlMode, changeStrategyModel]);

  const applyTasBaselineToSide = useCallback((baseline: TasStrategyBaseline, side: PlayerSide) => {
    const strategy = tasBaselineStrategyMap[baseline];
    if (baseline === "special-reference" || !strategy) {
      appendLog(`TAS baseline: ${tasBaselineLabel(baseline)} is reference-only and cannot be applied directly`);
      return;
    }
    changeStrategyModel(side, strategy);
    appendLog(`TAS baseline: applied ${tasBaselineLabel(baseline)} to ${side}`);
  }, [appendLog, changeStrategyModel]);

  const openStrategyDesigner = useCallback(() => {
    const personalPlan = strategyPlansRef.current["personal-v0"] ?? createDefaultPersonalPlan();
    setStrategyDraft(JSON.stringify(personalPlan, null, 2));
    setStrategyDraftStatus("正在编辑个人策略");
    setStrategyDesignerOpen(true);
  }, []);

  const resetStrategyDraft = useCallback(() => {
    const personalPlan = createDefaultPersonalPlan();
    setStrategyDraft(JSON.stringify(personalPlan, null, 2));
    setStrategyDraftStatus("已恢复默认模板，尚未保存");
  }, []);

  const saveStrategyDraft = useCallback((applySide?: PlayerSide) => {
    try {
      const parsed = JSON.parse(strategyDraft);
      const plan = normalizePersonalStrategyPlan(parsed);
      if (!plan) throw new Error("策略 JSON 不符合第一关 Route Script schema");
      savePersonalStrategyPlan(plan);
      const nextPlans = {
        ...strategyPlansRef.current,
        "personal-v0": plan
      };
      strategyPlansRef.current = nextPlans;
      setStrategyPlans(nextPlans);
      setStrategyDraft(JSON.stringify(plan, null, 2));
      setStrategyDraftStatus(`已保存：${plan.segments.length} 个路线段`);
      appendLog(`AI route: personal strategy saved (${plan.segments.length} segments)`);
      if (applySide) changeStrategyModel(applySide, "personal-v0");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setStrategyDraftStatus(`保存失败：${detail}`);
      appendLog(`AI route: personal strategy invalid (${detail})`);
    }
  }, [appendLog, changeStrategyModel, strategyDraft]);

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
    const target = screenFrameRef.current;
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
      onAudioSample: (left: number, right: number) => audioRef.current?.pushSample(left, right),
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

  const applyRuntimeStartupInputs = useCallback((snapshot: GameRamSnapshot | null, runtimeStatus: RuntimeStatus, active: boolean) => {
    const startupAutomationEnabled = startupLaunchPresetRef.current !== "wait";
    const twoPlayerRequested = startupLaunchPresetRef.current === "auto-2p";
    let startupButtons = createButtonState();
    if (!strategyRuntimeCanWrite(runtimeStatus, active)) {
      startupButtons = startupAutomationEnabled
        ? runtimeStartupButtons(snapshot, frameRef.current, twoPlayerRequested, Boolean(snapshot?.twoPlayerActive))
        : createButtonState();
    }
    setSourceButtons("1P", "system", startupButtons);
    setSourceButtons("2P", "system", createButtonState());
  }, [setSourceButtons]);

  const applyAiInputs = useCallback((snapshot: GameRamSnapshot | null, active: boolean, runtimeStatus: RuntimeStatus) => {
    const twoPlayerRequested = controlModesRef.current["2P"] !== "human";
    for (const side of playerSides) {
      if (!strategyRuntimeCanWrite(runtimeStatus, active)) {
        const emptyButtons = createButtonState();
        lastRawAiButtonsRef.current[side] = emptyButtons;
        lastLockedAiButtonsRef.current[side] = emptyButtons;
        aiActionLocksRef.current[side] = createAiActionLockState();
        setSourceButtons(side, "ai", createButtonState());
        continue;
      }
      const mode = controlModesRef.current[side];
      const strategyKey = strategyModelsRef.current[side];
      const mirrorSide = side === "1P" ? "2P" : "1P";
      const humanOverrideActive = hasHumanInputForSide(side);
      const strategyPlan = planForStrategy(strategyKey, strategyPlansRef.current);
      const actorSnapshot = tacticalSnapshotForSide(snapshot, side);
      const routeSegment = activeRouteSegmentForPlan(actorSnapshot, strategyPlan);
      const nextFsm = classifyAiFsmState({
        side,
        mode,
        strategyKey,
        snapshot: actorSnapshot,
        gameplayActive: active,
        twoPlayerActive: Boolean(snapshot?.twoPlayerActive),
        twoPlayerRequested,
        humanOverrideActive,
        routeSegment
      });
      const fsmState = transitionAiFsmState(aiFsmStatesRef.current[side], nextFsm, frameRef.current);
      aiFsmStatesRef.current[side] = fsmState;
      const loopExitState = updateAiLoopExitState(
        aiLoopExitStatesRef.current[side],
        side,
        actorSnapshot,
        active,
        fsmState
      );
      aiLoopExitStatesRef.current[side] = loopExitState;
      const bossWallPhaseState = updateBossWallPhaseState(
        bossWallPhaseStatesRef.current[side],
        actorSnapshot,
        frameRef.current
      );
      bossWallPhaseStatesRef.current[side] = bossWallPhaseState;
      const rawAiButtons = decideAiButtons({
        side,
        mode,
        strategyKey,
        strategyPlan,
        snapshot: actorSnapshot,
        gameplayActive: active,
        twoPlayerActive: Boolean(snapshot?.twoPlayerActive),
        twoPlayerRequested,
        humanOverrideActive,
        mirrorButtons: finalButtonsRef.current[mirrorSide],
        frame: frameRef.current,
        fsmState,
        teamSnapshot: snapshot,
        loopExit: loopExitState,
        bossWallPhaseState
      });
      const openingLowFixedThreatPatch = actorSnapshot
        ? stageOneOpeningLowFixedThreatPatch(actorSnapshot, isGrounded(actorSnapshot, side), frameRef.current)
        : null;
      const bridgeLowFixedCrowdPatch = actorSnapshot
        ? stageOneBridgeLowFixedCrowdPatch(actorSnapshot, isGrounded(actorSnapshot, side), frameRef.current)
        : null;
      const dangerLowLaneFallPatch = actorSnapshot
        ? stageOneDangerLowLaneFallPatch(actorSnapshot, isGrounded(actorSnapshot, side), frameRef.current)
        : null;
      const spreadTurretSuppressionPatch = actorSnapshot
        ? stageOneSpreadTurretSuppressionPatchForSnapshot(actorSnapshot, isGrounded(actorSnapshot, side), frameRef.current)
        : null;
      const midFixedCloseBodyCoverPatch = actorSnapshot
        ? stageOneMidFixedCloseBodyCoverPatch(actorSnapshot, isGrounded(actorSnapshot, side), frameRef.current)
        : null;
      const bypassActionLock = shouldBypassAiActionLockForBossWallPhase(actorSnapshot, bossWallPhaseState)
        || Boolean(openingLowFixedThreatPatch)
        || Boolean(bridgeLowFixedCrowdPatch)
        || Boolean(dangerLowLaneFallPatch)
        || Boolean(spreadTurretSuppressionPatch)
        || Boolean(midFixedCloseBodyCoverPatch);
      const previousLock = loopExitState.forcedAdvanceBias > 0.5 || bossWallPhaseState.phase !== "idle" || bypassActionLock
        ? createAiActionLockState()
        : aiActionLocksRef.current[side];
      const locked = bypassActionLock
        ? {
            ...createAiActionLockState(),
            buttons: sanitizeButtonState(rawAiButtons)
          }
        : applyAiActionLock(rawAiButtons, previousLock, actorSnapshot, strategyKey);
      lastRawAiButtonsRef.current[side] = rawAiButtons;
      lastLockedAiButtonsRef.current[side] = locked.buttons;
      aiActionLocksRef.current[side] = locked;
      setSourceButtons(side, "ai", locked.buttons);
    }
  }, [hasHumanInputForSide, setSourceButtons]);

  const applyTasPlaybackInputs = useCallback(() => {
    const playback = tasPlaybackRef.current;
    const movie = tasMovieRef.current;
    if (!playback.active || !movie) return false;

    const frame = movie.frames[playback.frameIndex];
    if (!frame) {
      tasPlaybackRef.current = {
        ...playback,
        active: false
      };
      setSourceButtons("1P", "tas", createButtonState());
      setSourceButtons("2P", "tas", createButtonState());
      runningRef.current = false;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus("paused");
      setTasPlaybackState((current) => ({
        ...current,
        status: "finished",
        frameIndex: movie.frames.length,
        currentInput: "-",
        messageKey: "finished",
        message: "TAS replay finished"
      }));
      appendLog("TAS：回放结束，已释放手柄输入");
      return false;
    }

    setSourceButtons("1P", "tas", fm2ButtonsToButtonState(frame.p1));
    setSourceButtons("2P", "tas", fm2ButtonsToButtonState(frame.p2));
    const nextFrameIndex = playback.frameIndex + 1;
    tasPlaybackRef.current = {
      ...playback,
      frameIndex: nextFrameIndex
    };

    if (nextFrameIndex % 10 === 0 || nextFrameIndex === 1) {
      setTasPlaybackState((current) => ({
        ...current,
        status: "playing",
        frameIndex: nextFrameIndex,
        currentInput: `1P ${fm2ButtonsToLabels(frame.p1)} / 2P ${fm2ButtonsToLabels(frame.p2)}`,
        messageKey: "playing",
        message: "TAS trial replay is running"
      }));
    }

    return true;
  }, [appendLog, setSourceButtons]);

  const stopTasPlaybackAsDesynced = useCallback((message: string) => {
    const playback = tasPlaybackRef.current;
    tasPlaybackRef.current = {
      ...playback,
      active: false
    };
    setSourceButtons("1P", "tas", createButtonState());
    setSourceButtons("2P", "tas", createButtonState());
    runningRef.current = false;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("paused");
    setTasPlaybackState((current) => ({
      ...current,
      status: "desynced",
      phase: "desynced",
      frameIndex: playback.frameIndex,
      messageKey: "desynced",
      messageDetail: message,
      message
    }));
    appendLog(`TAS：${message}`);
  }, [appendLog, setSourceButtons]);

  const tickFrame = useCallback(() => {
    if (!runningRef.current) return;
    const nes = nesRef.current;
    if (nes) {
      const beforeSnapshot = readGameRamSnapshot(nes, frameRef.current);
      ramSnapshotRef.current = beforeSnapshot;
      gameplayActiveRef.current = isGameplayActive(beforeSnapshot, frameRef.current);
      const runtimeStatus: RuntimeStatus = runningRef.current ? "running" : "paused";

      if (tasPlaybackRef.current.active) {
        const tasFrameApplied = applyTasPlaybackInputs();
        if (!tasFrameApplied) return;
      } else {
        applyGamepads();
        applyRuntimeStartupInputs(beforeSnapshot, runtimeStatus, gameplayActiveRef.current);
        applyAiInputs(beforeSnapshot, gameplayActiveRef.current, runningRef.current ? "running" : "paused");
      }
      nes.frame();
      frameRef.current += 1;

      const afterSnapshot = readGameRamSnapshot(nes, frameRef.current);
      const deathsDelta: Record<PlayerSide, number> = {
        "1P": shouldCountPlayerDeath("1P", beforeSnapshot, afterSnapshot, deathLatchedRef.current["1P"]) ? 1 : 0,
        "2P": shouldCountPlayerDeath("2P", beforeSnapshot, afterSnapshot, deathLatchedRef.current["2P"]) ? 1 : 0
      };
      const destructionEvents = collectDestructionEvents(beforeSnapshot, afterSnapshot);
      const weaponPickupEvents = collectWeaponPickupEvents(beforeSnapshot, afterSnapshot);
      const scoreDeltas: Record<PlayerSide, number> = {
        "1P": Math.max(0, scoreForSide(afterSnapshot, "1P") - scoreForSide(beforeSnapshot, "1P")),
        "2P": Math.max(0, scoreForSide(afterSnapshot, "2P") - scoreForSide(beforeSnapshot, "2P"))
      };
      const scoreChangedSides = playerSides.filter((side) => scoreDeltas[side] > 0);
      for (const side of playerSides) {
        if (deathsDelta[side] > 0) deathLatchedRef.current[side] = true;
        if (shouldReleaseDeathLatch(side, afterSnapshot)) deathLatchedRef.current[side] = false;
      }
      const afterTwoPlayerActive = Boolean(afterSnapshot?.twoPlayerActive);
      for (const side of playerSides) {
        const sideActive = side === "1P" || afterTwoPlayerActive;
        const combat = createCombatMetrics();
        if (sideActive && scoreDeltas[side] > 0 && destructionEvents.length > 0) {
          if (scoreChangedSides.length === 1) {
            Object.assign(combat, countCombatEvents(destructionEvents));
          } else {
            combat.unattributed = destructionEvents.length;
          }
        }
        const killsDelta = combat.infantry + combat.turret + combat.flying + combat.boss;
        const weapons = sideActive
          && scoreDeltas[side] > 0
          && scoreChangedSides.length === 1
          && weaponPickupEvents.length > 0
          ? countWeaponEvents(weaponPickupEvents)
          : countWeaponPickups(side, beforeSnapshot, afterSnapshot);
        const bulletSpawns = countBulletSpawns(side, beforeSnapshot, afterSnapshot);
        const score = scoreForSide(afterSnapshot, side);
        const shouldUpdate = sideActive && (
          deathsDelta[side] > 0
          || killsDelta > 0
          || combat.unattributed > 0
          || scoreDeltas[side] > 0
          || bulletSpawns > 0
          || Object.values(weapons).some((value) => value > 0)
          || playerMetricsRef.current[side].score !== score
        );
        if (shouldUpdate) {
          addPlayerMetricDeltas(side, {
            deaths: deathsDelta[side],
            kills: killsDelta,
            score,
            scoreGained: scoreDeltas[side],
            bulletSpawns,
            combat,
            weapons
          });
        }
      }

      ramSnapshotRef.current = afterSnapshot;
      gameplayActiveRef.current = isGameplayActive(afterSnapshot, frameRef.current);
      const traceSample = buildPlayTraceSample({
        frame: frameRef.current,
        runtimeStatus: runtimeStatus === "running" ? "running" : "paused",
        gameplayActive: gameplayActiveRef.current,
        strategyKey: strategyModelsRef.current["1P"],
        strategyPlans: strategyPlansRef.current,
        ramSnapshot: afterSnapshot,
        finalButtons: finalButtonsRef.current,
        bossWallPhaseStates: bossWallPhaseStatesRef.current
      });
      recentTraceSamplesRef.current.push(traceSample);
      if (recentTraceSamplesRef.current.length > recentTraceSampleLimit) {
        recentTraceSamplesRef.current.splice(0, recentTraceSamplesRef.current.length - recentTraceSampleLimit);
      }
      for (const side of playerSides) {
        const inDeathTraceState = playerIsDeathOrRespawn(side, afterSnapshot);
        if (deathsDelta[side] <= 0 && (!inDeathTraceState || deathTraceLatchedRef.current[side])) continue;
        const report = createDeathTraceReport(side, recentTraceSamplesRef.current);
        if (!report) continue;
        lastDeathTraceRef.current = report;
        deathTraceLatchedRef.current[side] = true;
        (window as unknown as { __fcAiLastDeathTrace?: DeathTraceReport }).__fcAiLastDeathTrace = report;
        setTraceLastSummary(deathTraceReportSummary(report));
        setDeathTraceReports((current) => [...current.slice(-3), report]);
      }
      for (const side of playerSides) {
        if (shouldReleaseDeathLatch(side, afterSnapshot)) deathTraceLatchedRef.current[side] = false;
      }
      if (traceRecordingRef.current) {
        const captureConfig = traceCaptureConfigRef.current;
        const keepTraceSample = shouldKeepTraceSample(traceSample, captureConfig);
        if (keepTraceSample) {
          traceSamplesRef.current.push(traceSample);
          traceCaptureEnteredRef.current = true;
        }
        if (frameRef.current % 30 === 0 || keepTraceSample) {
          setTraceSampleCount(traceSamplesRef.current.length);
        }
        if (shouldStopTraceCapture(traceSample, captureConfig, traceCaptureEnteredRef.current)) {
          stopTraceRecording();
        }
      }

      if (tasPlaybackRef.current.active) {
        const guardResult = evaluateTasPlaybackGuard(
          afterSnapshot,
          tasPlaybackGuardRef.current,
          tasPlaybackRef.current.frameIndex
        );
        tasPlaybackGuardRef.current = guardResult.state;
        setTasPlaybackState((current) => ({
          ...current,
          phase: guardResult.phase,
          messageKey: guardResult.ok ? "guard-checking" : "desynced",
          messageDetail: guardResult.ok
            ? `${guardResult.phase === "active" ? "Active Phase" : "Init Phase"} / FM2 row ${tasPlaybackRef.current.frameIndex}`
            : guardResult.message,
          message: guardResult.ok
            ? `${guardResult.phase === "active" ? "Active Phase" : "Init Phase"}：FM2 行 ${tasPlaybackRef.current.frameIndex}，RAM 校验中`
            : guardResult.message
        }));
        if (!guardResult.ok) {
          stopTasPlaybackAsDesynced(guardResult.message);
          setFrameCount(frameRef.current);
          setRamSnapshot(afterSnapshot);
          setGameplayActive(gameplayActiveRef.current);
          return;
        }
      }

      if (frameRef.current % 10 === 0) {
        setFrameCount(frameRef.current);
        setRamSnapshot(afterSnapshot);
        setGameplayActive(gameplayActiveRef.current);
      }
    }
  }, [addPlayerMetricDeltas, applyAiInputs, applyGamepads, applyRuntimeStartupInputs, applyTasPlaybackInputs, stopTasPlaybackAsDesynced, stopTraceRecording]);

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
      clearRuntimeOwnedInputs();
      setStatus((current) => current === "running" ? "paused" : current);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [clearRuntimeOwnedInputs, enableAudio, tickFrame]);

  const loadSelectedTasMovie = useCallback(async () => {
    const entry = identifyTasForRom(romMetadata);
    const movie = tasMoviesForEntry(entry).find((item) => item.id === selectedTasMovieId)
      ?? selectDefaultTasMovie(entry);
    if (!entry || !movie) {
      setTasPlaybackState({
        ...createIdleTasPlaybackState(),
        status: "error",
        messageKey: "no-match",
        message: "Current ROM has no matched TAS"
      });
      return null;
    }

    try {
      setTasPlaybackState((current) => ({
        ...current,
        status: "loading",
        movieId: movie.id,
        messageKey: "loading-fm2",
        message: "Loading TAS FM2 file"
      }));
      const query = new URLSearchParams({
        gameId: entry.gameId,
        romProfileId: entry.romProfileId,
        file: movie.fileName
      });
      const response = await fetch(`/api/local-tas-file?${query.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`TAS endpoint returned ${response.status}`);
      const parsed = parseFm2Movie(await response.text());
      const movieChecksum = (parsed.header.romChecksum ?? "").replace(/^base64:/, "");
      if (movieChecksum !== entry.romChecksum.fm2Base64) {
        throw new Error(`TAS romChecksum mismatch: ${parsed.header.romChecksum ?? "missing"}`);
      }
      const summary = summarizeFm2Movie(parsed);
      const playbackStartFrame = resolveFm2PlaybackStartFrame(parsed, movie.playbackStartFrame);
      tasMovieRef.current = parsed;
      tasPlaybackRef.current = {
        active: false,
        movieId: movie.id,
        frameIndex: playbackStartFrame
      };
      tasPlaybackGuardRef.current = createTasPlaybackGuardState(playbackStartFrame);
      setSelectedTasMovieId(movie.id);
      setTasPlaybackState({
        status: "ready",
        movieId: movie.id,
        frameIndex: playbackStartFrame,
        playbackStartFrame,
        totalFrames: summary.inputFrames,
        phase: "init",
        currentInput: "-",
        messageKey: "loaded",
        messageDetail: `${movie.title.en} / entry frame ${playbackStartFrame} / ${summary.inputFrames} frames`,
        checksumStatus: "ROM 校验匹配",
        message: `${movie.title.en} loaded / entry frame ${playbackStartFrame} / ${summary.inputFrames} frames`
      });
      appendLog(`TAS：已载入 ${movie.title.zh}（入口帧 ${playbackStartFrame} / ${summary.inputFrames} 帧）`);
      return { entry, movie, parsed, playbackStartFrame };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      tasMovieRef.current = null;
      tasPlaybackRef.current = {
        active: false,
        movieId: movie.id,
        frameIndex: 0
      };
      tasPlaybackGuardRef.current = createTasPlaybackGuardState();
      setTasPlaybackState({
        status: "error",
        movieId: movie.id,
        frameIndex: 0,
        playbackStartFrame: 0,
        totalFrames: 0,
        phase: "init",
        currentInput: "-",
        messageKey: "load-error",
        messageDetail: detail,
        checksumStatus: "校验失败",
        message: detail
      });
      appendLog(`TAS：载入失败（${detail}）`);
      return null;
    }
  }, [appendLog, romMetadata, selectedTasMovieId]);

  const selectTasMovie = useCallback((movieId: string) => {
    setRunning(false);
    tasMovieRef.current = null;
    tasPlaybackRef.current = {
      active: false,
      movieId,
      frameIndex: 0
    };
    tasPlaybackGuardRef.current = createTasPlaybackGuardState();
    setSelectedTasMovieId(movieId);
    setSourceButtons("1P", "tas", createButtonState());
    setSourceButtons("2P", "tas", createButtonState());
    setTasPlaybackState({
      ...createIdleTasPlaybackState(),
      movieId,
      messageKey: "selected",
      message: "TAS selected; waiting for load"
    });
  }, [setRunning, setSourceButtons]);

  const stopTasReplay = useCallback(() => {
    setRunning(false);
    setSourceButtons("1P", "tas", createButtonState());
    setSourceButtons("2P", "tas", createButtonState());
    setTasPlaybackState((current) => {
      tasPlaybackRef.current = {
        ...tasPlaybackRef.current,
        active: false,
        frameIndex: current.playbackStartFrame
      };
      tasPlaybackGuardRef.current = createTasPlaybackGuardState(current.playbackStartFrame);
      return {
        ...current,
        status: current.totalFrames > 0 ? "ready" : "idle",
        phase: "init",
        frameIndex: current.playbackStartFrame,
        currentInput: "-",
        messageKey: current.totalFrames > 0 ? "stopped" : "waiting",
        message: current.totalFrames > 0 ? "TAS stopped; ready to replay from entry frame" : "Waiting for TAS selection"
      };
    });
    appendLog("TAS：已停止并释放输入");
  }, [appendLog, setRunning, setSourceButtons]);

  const pauseTasReplay = useCallback(() => {
    setRunning(false);
    tasPlaybackRef.current = {
      ...tasPlaybackRef.current,
      active: false
    };
    setSourceButtons("1P", "tas", createButtonState());
    setSourceButtons("2P", "tas", createButtonState());
    setTasPlaybackState((current) => ({
      ...current,
      status: current.status === "playing" ? "paused" : current.status,
      messageKey: "paused",
      message: "TAS paused"
    }));
    appendLog("TAS：已暂停");
  }, [appendLog, setRunning, setSourceButtons]);

  const startTasReplay = useCallback(async () => {
    const currentRom = romBytesRef.current;
    if (!currentRom || !romMetadata) {
      setTasPlaybackState({
        ...createIdleTasPlaybackState(),
        status: "error",
        messageKey: "load-rom-first",
        message: "Load a matched ROM before TAS replay"
      });
      return;
    }

    setRunning(false);
    const preloadedMovieId = tasPlaybackRef.current.movieId || selectedTasMovieId;
    let movieEntry = tasMoviesForEntry(identifyTasForRom(romMetadata)).find((item) => item.id === preloadedMovieId)
      ?? selectDefaultTasMovie(identifyTasForRom(romMetadata));
    let parsed = tasMovieRef.current && tasPlaybackRef.current.movieId === selectedTasMovieId
      ? tasMovieRef.current
      : null;
    let movieId = preloadedMovieId;
    if (!parsed) {
      const loaded = await loadSelectedTasMovie();
      parsed = loaded?.parsed ?? null;
      movieId = loaded?.movie.id ?? movieId;
      movieEntry = loaded?.movie ?? movieEntry;
    }
    if (!parsed || !movieEntry) return;

    clearAllInputs();
    resetPlayerMetrics();
    resetRamTracking();
    const nes = createNes();
    nes.loadROM(currentRom);
    const playbackStartFrame = fastForwardTasMovie(nes, parsed, movieEntry.playbackStartFrame);
    frameRef.current = playbackStartFrame;
    const snapshot = readGameRamSnapshot(nes, frameRef.current);
    ramSnapshotRef.current = snapshot;
    gameplayActiveRef.current = isGameplayActive(snapshot, frameRef.current);
    const guardResult = evaluateTasPlaybackGuard(
      snapshot,
      createTasPlaybackGuardState(playbackStartFrame),
      playbackStartFrame
    );
    tasPlaybackGuardRef.current = guardResult.state;
    setFrameCount(playbackStartFrame);
    setRamSnapshot(snapshot);
    setGameplayActive(gameplayActiveRef.current);
    tasPlaybackRef.current = {
      active: true,
      movieId,
      frameIndex: playbackStartFrame
    };
    setTasPlaybackState((current) => ({
      ...current,
      status: "playing",
      frameIndex: playbackStartFrame,
      playbackStartFrame,
      messageKey: "fast-forwarded",
      messageDetail: `entry FM2 row ${playbackStartFrame}`,
      message: `TAS fast-forwarded to entry FM2 row ${playbackStartFrame}`
    }));
    appendLog(`TAS：已同步开场 ${playbackStartFrame} 帧，普通输入和 AI 输入已临时屏蔽`);
    setRunning(true, true);
  }, [
    appendLog,
    clearAllInputs,
    createNes,
    loadSelectedTasMovie,
    resetPlayerMetrics,
    resetRamTracking,
    romMetadata,
    selectedTasMovieId,
    setRunning
  ]);

  const onSideTrainingSelectBaseline = useCallback((side: PlayerSide) => {
    const selectedOption = findTasSideBaselineOption(side, selectedSideBaselineIds[side]);
    appendLog(`Training ${side}: selected baseline ${selectedOption ? `${selectedOption.sourceLabel} / ${selectedOption.label}` : "Current strategy package baseline"}`);
    appendLog(`Training ${side}: baseline selection requested`);
    appendLog("训练：基准候选来自当前资源包；TAS 基准必须先在 TAS 观赏窗口完成分离抽取并归档后才会加入候选列表末尾");
  }, [appendLog, selectedSideBaselineIds, uiLanguage]);

  const onSideTrainingBaselineChange = useCallback((side: PlayerSide, baselineId: string) => {
    if (activeTrainingSides[side]) {
      appendLog(`Training ${side}: baseline change blocked because training is active`);
      return;
    }
    setSelectedSideBaselineIds((current) => ({ ...current, [side]: baselineId }));
    const selectedOption = findTasSideBaselineOption(side, baselineId);
    appendLog(`Training ${side}: baseline changed to ${selectedOption ? selectedOption.label : "current strategy package"}`);
  }, [activeTrainingSides, appendLog]);

  const onSideTrainingMethodChange = useCallback((side: PlayerSide, method: SideTrainingMethod) => {
    if (trainingSessionActive) {
      appendLog(`Training ${side}: method change blocked because training is active`);
      return;
    }
    const option = findSideTrainingMethodOption(method);
    setSelectedTrainingMethod(option.key);
    appendLog(`Training ${side}: method ${option.label}`);
  }, [appendLog, trainingSessionActive]);

  const startSideTraining = useCallback((side: PlayerSide) => {
    if (activeTrainingSides[side]) {
      appendLog(`Training ${side}: already active`);
      return;
    }
    setSelectedTrainingSides((current) => ({ ...current, [side]: true }));
    setActiveTrainingSides((current) => ({ ...current, [side]: true }));
    setPackageSideScope((current) => packageScopeHasSide(current, side) ? current : side === "1P" ? "1p-only" : "2p-only");
    const mode = trainingControlModeForSelection(selectedSideBaselineIds[side], selectedTrainingMethod);
    changeControlMode(side, mode);
    appendLog(`Training: started ${side} / ${controlModeLabels[mode]}`);
  }, [activeTrainingSides, appendLog, changeControlMode, selectedSideBaselineIds, selectedTrainingMethod]);

  const stopSideTraining = useCallback((side: PlayerSide) => {
    if (!activeTrainingSides[side]) {
      appendLog(`Training ${side}: already stopped`);
      return;
    }
    setActiveTrainingSides((current) => ({ ...current, [side]: false }));
    setTrainingRunActiveSides((current) => ({ ...current, [side]: false }));
    appendLog(`Training: stopped ${side}; ${side} game controls unlocked`);
  }, [activeTrainingSides, appendLog]);

  const toggleSideTraining = useCallback((side: PlayerSide) => {
    if (activeTrainingSides[side]) {
      stopSideTraining(side);
      return;
    }
    startSideTraining(side);
  }, [activeTrainingSides, startSideTraining, stopSideTraining]);

  const onSideTrainingModifyStrategy = useCallback((side: PlayerSide) => {
    appendLog(`Training ${side}: opening strategy designer`);
    appendLog("训练：打开策略设计器，准备修改个人策略");
    openStrategyDesigner();
  }, [appendLog, openStrategyDesigner]);

  const onSideTrainingArchiveStrategy = useCallback((side: PlayerSide) => {
    const samples = traceSamplesRef.current.length > 0 ? traceSamplesRef.current : traceSampleSnapshot;
    if (samples.length === 0) {
      appendLog(`Training ${side}: archive blocked because no trace samples are available`);
      return;
    }
    const currentTasEntry = identifyTasForRom(romMetadata);
    const selectedBaselineOptions = sideBaselineOptionsForSide(side, uiLanguage, strategyModels[side], strategyResourcePacksBySide[side], currentTasEntry);
    const selectedBaselineOption = findTasSideBaselineOption(side, selectedSideBaselineIds[side], selectedBaselineOptions);
    const evidence = createSideTrainingTraceEvidence(samples, {
      baselineId: selectedSideBaselineIds[side],
      baselineSourceKind: selectedBaselineOption?.sourceKind ?? "strategy-pack",
      gameProfileId: "contra",
      romProfileId: romMetadata?.romProfileId ?? "unknown-rom",
      side,
      stageId: "stage-1",
      strategyKey: strategyModels[side],
      trainingMethod: selectedTrainingMethod
    });
    setSideTrainingTraceEvidence((current) => ({ ...current, [side]: evidence }));
    setStrategyPackageValidationReport(null);
    setValidationReplayComplete(false);
    appendLog(`Training ${side}: archiving current trace samples as strategy evidence`);
    appendLog("训练：归档当前采集样本为策略证据");
    exportStrategyTraceEvidence(side, evidence);
  }, [
    appendLog,
    exportStrategyTraceEvidence,
    romMetadata,
    selectedSideBaselineIds,
    selectedTrainingMethod,
    strategyModels,
    strategyResourcePacksBySide,
    traceSampleSnapshot,
    uiLanguage
  ]);

  const onTrainingSaveStrategy = useCallback(() => {
    if (packageSideScope === "none") {
      appendLog("Training package save blocked: select 1P or 2P first");
      return;
    }
    if (!validationReplayComplete) {
      appendLog("Training package save blocked: validation replay is required first");
      return;
    }
    try {
      const candidateFragmentProposals = (["1P", "2P"] as PlayerSide[]).flatMap((side): CandidateStrategyFragmentProposal[] => {
        if (!packageScopeHasSide(packageSideScope, side)) return [];
        const evidence = sideTrainingTraceEvidence[side];
        if (!evidence) return [];
        const tasBaseline = findTasSideBaselineForSelectedOption(side, selectedSideBaselineIds[side]);
        if (!tasBaseline) return [];
        return [
          createCandidateStrategyFragmentProposal({
            evidence,
            tasSideBaseline: tasBaseline.baseline,
            tasSideBaselinePath: CONTRA_TAS_SIDE_BASELINE_PATH
          })
        ];
      });
      const payload = createStrategyPackageEvidenceExport({
        candidateFragmentProposals: candidateFragmentProposals,
        displayName: strategyExportName,
        evidenceBySide: sideTrainingTraceEvidence,
        gameProfileId: "contra",
        packId: ACTIVE_STRATEGY_PACK.packId,
        packVersion: ACTIVE_STRATEGY_PACK.version,
        sideScope: packageSideScope,
        tasSideBaselinePaths: [CONTRA_TAS_SIDE_BASELINE_PATH],
        validationReport: strategyPackageValidationReport,
        validationReplayComplete
      });
      setStrategyPackageEvidenceExport(payload);
      downloadStrategyPackageEvidenceExport(payload);
      appendLog(`Training package save: ${strategyExportName} / ${strategyPackageSideScopeLabel(packageSideScope, uiLanguage)} / ${payload.packageFiles.length} files`);
    } catch (error) {
      appendLog(`Training package save blocked: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [
    appendLog,
    downloadStrategyPackageEvidenceExport,
    packageSideScope,
    selectedSideBaselineIds,
    sideTrainingTraceEvidence,
    strategyExportName,
    strategyPackageValidationReport,
    uiLanguage,
    validationReplayComplete
  ]);

  const onTrainingSavePathSelected = useCallback((pathLabel: string) => {
    setStrategySavePathLabel(pathLabel);
    appendLog(`Training package save path selected: ${pathLabel}`);
  }, [appendLog]);

  const onTrainingVersionHistory = useCallback(() => {
    const selectedPackIds = Array.from(new Set(Object.values(strategyResourcePacksBySide)));
    const revisionCount = selectedPackIds.reduce((total, packId) => total + strategyResourcePackById(packId).revisionHistory.length, 0);
    const message = revisionCount > selectedPackIds.length
      ? `Version history ready: ${revisionCount} revisions. Rollback requires selecting a validated snapshot.`
      : "Version history ready: current packs have revision records, but no older restorable snapshot yet.";
    setStrategyVersionStatusLabel(message);
    appendLog(`Training version history: ${message}`);
  }, [appendLog, strategyResourcePacksBySide]);

  const togglePackageSideScope = useCallback((side: PlayerSide) => {
    setPackageSideScope((current) => {
      const next = nextPackageSideScope(current, side);
      appendLog(`Training package scope: ${strategyPackageSideScopeLabel(next, uiLanguage)}`);
      return next;
    });
    setValidationReplayComplete(false);
    setStrategyPackageValidationReport(null);
  }, [appendLog, uiLanguage]);

  const changeStrategyResourcePack = useCallback((side: PlayerSide, packId: StrategyResourcePackId) => {
    if (side === "1P") {
      setStrategyResourcePacksBySide((current) => ({ ...current, "1P": packId, "2P": p2StrategyResourceOverridden ? current["2P"] : packId }));
      setStrategyModels((current) => {
        const next = {
          ...current,
          [side]: coerceStrategyForResourcePack(current[side], packId),
          "2P": p2StrategyResourceOverridden ? current["2P"] : coerceStrategyForResourcePack(current["2P"], packId)
        };
        strategyModelsRef.current = next;
        return next;
      });
    } else {
      setP2StrategyResourceOverridden(packId !== strategyResourcePacksBySide["1P"]);
      setStrategyResourcePacksBySide((current) => ({ ...current, "2P": packId }));
      setStrategyModels((current) => {
        const next = {
          ...current,
          [side]: coerceStrategyForResourcePack(current[side], packId)
        };
        strategyModelsRef.current = next;
        return next;
      });
    }
    setValidationReplayComplete(false);
    setStrategyPackageValidationReport(null);
    appendLog(`Training ${side}: resource pack ${strategyResourcePackLabel(packId, uiLanguage)}`);
  }, [appendLog, p2StrategyResourceOverridden, strategyResourcePacksBySide, uiLanguage]);

  const sync2PResourceTo1P = useCallback(() => {
    setStrategyResourcePacksBySide((current) => ({ ...current, "2P": current["1P"] }));
    setStrategyModels((current) => {
      const packId = strategyResourcePacksBySide["1P"];
      const next = {
        ...current,
        "2P": coerceStrategyForResourcePack(current["2P"], packId)
      };
      strategyModelsRef.current = next;
      return next;
    });
    setP2StrategyResourceOverridden(false);
    setValidationReplayComplete(false);
    setStrategyPackageValidationReport(null);
    appendLog("Training 2P: resource pack synced to 1P");
  }, [appendLog, strategyResourcePacksBySide]);

  const changeStrategyExportName = useCallback((name: string) => {
    setStrategyExportName(name);
    setValidationReplayComplete(false);
    setStrategyPackageValidationReport(null);
  }, []);

  const onTrainingValidateStrategy = useCallback(() => {
    setValidationReplayComplete(false);
    setStrategyPackageValidationReport(null);
    appendLog("Training global: starting package validation replay");
    void startTasReplay();
  }, [appendLog, startTasReplay]);

  const onSideTrainingValidateStrategy = useCallback((side: PlayerSide) => {
    appendLog(`Training ${side}: starting baseline validation replay`);
    appendLog("训练：启动基准验证回放");
    void startTasReplay();
  }, [appendLog, startTasReplay]);

  const startSideTrainingRun = useCallback((side: PlayerSide) => {
    if (!activeTrainingSides[side]) {
      appendLog(`Training ${side}: run blocked because training is not active`);
      return;
    }
    const nextRunSides: Record<PlayerSide, boolean> = {
      "1P": activeTrainingSides["1P"],
      "2P": activeTrainingSides["2P"]
    };
    setTrainingRunActiveSides(nextRunSides);
    if (!traceRecording) startTraceRecording();
    setRunning(true);
    appendLog(`Training ${side}: auto-patch run started; TraceEvidence capture synchronized`);
  }, [activeTrainingSides, appendLog, setRunning, startTraceRecording, traceRecording]);

  const stopSideTrainingRun = useCallback((side: PlayerSide) => {
    if (!trainingRunActiveSides[side]) {
      appendLog(`Training ${side}: run already stopped`);
      return;
    }
    setTrainingRunActiveSides({ "1P": false, "2P": false });
    if (traceRecording) stopTraceRecording();
    setRunning(false);
    appendLog(`Training ${side}: auto-patch run stopped; capture stopped`);
  }, [appendLog, setRunning, stopTraceRecording, traceRecording, trainingRunActiveSides]);

  const toggleSideTrainingRun = useCallback((side: PlayerSide) => {
    if (trainingRunActiveSides[side]) {
      stopSideTrainingRun(side);
      return;
    }
    startSideTrainingRun(side);
  }, [startSideTrainingRun, stopSideTrainingRun, trainingRunActiveSides]);

  const onSideTraceStart = useCallback((side: PlayerSide) => {
    appendLog(`Training ${side}: starting trace capture`);
    startTraceRecording();
  }, [appendLog, startTraceRecording]);

  const onSideTraceStop = useCallback((side: PlayerSide) => {
    appendLog(`Training ${side}: stopping trace capture`);
    stopTraceRecording();
  }, [appendLog, stopTraceRecording]);

  const onSideTraceExport = useCallback((side: PlayerSide) => {
    appendLog(`Training ${side}: exporting trace evidence`);
    exportTraceRecording();
  }, [appendLog, exportTraceRecording]);

  const onSideTraceClear = useCallback((side: PlayerSide) => {
    appendLog(`Training ${side}: clearing trace samples`);
    clearTraceRecording();
  }, [appendLog, clearTraceRecording]);

  const runBotFrameBatch = useCallback(async (maxFrames: number, strategy: BotRunStrategyKey = "survival-v0") => {
    const nes = nesRef.current;
    const startedAt = new Date().toISOString();
    if (!nes) {
      setBotRunReport({
        ...createIdleBotRunReport(),
        status: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        maxFrames,
        reason: "nes-not-ready"
      });
      return;
    }

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    clearAllInputs();
    controlModesRef.current = { "1P": "ai", "2P": "human" };
    setControlModes({ "1P": "ai", "2P": "human" });
    strategyModelsRef.current = {
      ...strategyModelsRef.current,
      "1P": strategy
    };
    setStrategyModels((current) => ({
      ...current,
      "1P": strategy
    }));
    aiActionLocksRef.current = createAiActionLockStates();
    aiFsmStatesRef.current = createAiFsmStates();
    aiLoopExitStatesRef.current = createAiLoopExitStates();
    bossWallPhaseStatesRef.current = createBossWallPhaseStates();
    setLastInputs((current) => ({
      ...current,
      "1P": "AI batch test",
      "2P": "waiting"
    }));

    runningRef.current = true;
    setStatus("running");
    const initialDeaths = playerMetricsRef.current["1P"].deaths;
    let reason = "max-frames";
    let statusValue: BotRunReport["status"] = "stopped";
    let lastRuntime: RuntimeDebugSnapshot | null = null;
    setBotRunReport({
      ...createIdleBotRunReport(),
      status: "running",
      startedAt,
      maxFrames,
      initialDeaths,
      reason: "running"
    });

    try {
      const targetFrame = frameRef.current + maxFrames;
      while (frameRef.current < targetFrame) {
        const batchEnd = Math.min(targetFrame, frameRef.current + 120);
        while (frameRef.current < batchEnd) {
          tickFrame();
          const snapshot = ramSnapshotRef.current;
          if (playerMetricsRef.current["1P"].deaths > initialDeaths) {
            reason = "death-count";
            statusValue = "death";
            break;
          }
          const terminalState = isPlausibleRamSnapshot(snapshot)
            ? classifyBotRunTerminalState(snapshot, gameplayActiveRef.current)
            : null;
          if (terminalState) {
            reason = terminalState.reason;
            statusValue = terminalState.status;
            break;
          }
        }

        const snapshot = ramSnapshotRef.current;
        lastRuntime = buildRuntimeDebugSnapshot({
          side: "1P",
          mode: controlModesRef.current["1P"],
          strategyKey: strategyModelsRef.current["1P"],
          strategyPlans: strategyPlansRef.current,
          ramSnapshot: snapshot,
          frameCount: frameRef.current,
          gameplayActive: gameplayActiveRef.current,
          runtimeStatus: "running",
          actionLock: aiActionLocksRef.current["1P"],
          fsmState: aiFsmStatesRef.current["1P"],
          loopExit: aiLoopExitStatesRef.current["1P"],
          buttons: finalButtonsRef.current["1P"],
          rawAiButtons: lastRawAiButtonsRef.current["1P"],
          lockedAiButtons: lastLockedAiButtonsRef.current["1P"],
          bossWallPhaseState: bossWallPhaseStatesRef.current["1P"]
        });
        if (statusValue === "death" || statusValue === "complete") break;
        await Promise.resolve();
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
      statusValue = "error";
    }

    const terminalRuntime = lastRuntime;
    runningRef.current = false;
    clearRuntimeOwnedInputs();
    setStatus((current) => current === "running" ? "paused" : current);
    setFrameCount(frameRef.current);
    setRamSnapshot(ramSnapshotRef.current);
    setGameplayActive(gameplayActiveRef.current);
    const finalSnapshot = ramSnapshotRef.current;
    const finalRuntime = buildRuntimeDebugSnapshot({
      side: "1P",
      mode: controlModesRef.current["1P"],
      strategyKey: strategyModelsRef.current["1P"],
      strategyPlans: strategyPlansRef.current,
      ramSnapshot: finalSnapshot,
      frameCount: frameRef.current,
      gameplayActive: gameplayActiveRef.current,
      runtimeStatus: statusValue === "error" ? "error" : "paused",
      actionLock: aiActionLocksRef.current["1P"],
      fsmState: aiFsmStatesRef.current["1P"],
      loopExit: aiLoopExitStatesRef.current["1P"],
      buttons: finalButtonsRef.current["1P"],
      rawAiButtons: lastRawAiButtonsRef.current["1P"],
      lockedAiButtons: lastLockedAiButtonsRef.current["1P"],
      bossWallPhaseState: bossWallPhaseStatesRef.current["1P"]
    });
    setBotRunReport({
      schema: "fc-ai-bot-run-v1",
      status: statusValue,
      startedAt,
      finishedAt: new Date().toISOString(),
      maxFrames,
      frameCount: frameRef.current,
      initialDeaths,
      deaths: playerMetricsRef.current["1P"].deaths - initialDeaths,
      finalWorldX: finalSnapshot?.worldX ?? null,
      finalPlayerX: finalSnapshot?.playerX ?? null,
      finalPlayerY: finalSnapshot?.playerY ?? null,
      finalScore: finalSnapshot?.p1Score ?? null,
      finalWeapon: finalSnapshot?.weapon ?? null,
      bossDefeated: finalSnapshot?.bossDefeated ?? null,
      gameplayActive: gameplayActiveRef.current,
      reason,
      lastInput: traceInput(finalButtonsRef.current["1P"]),
      finalEnemies: finalSnapshot?.enemies.map((enemy) => ({
        slot: enemy.slot,
        type: enemy.type,
        hp: enemy.hp,
        x: enemy.x,
        y: enemy.y,
        routine: enemy.routine,
        kind: enemy.kind,
        threat: enemy.threat,
        fixed: enemy.fixed,
        priority: enemy.priority
      })) ?? [],
      runtime: finalRuntime,
      terminalRuntime,
      deathTrace: lastDeathTraceRef.current
    });
  }, [clearAllInputs, clearRuntimeOwnedInputs, tickFrame]);

  const installRom = useCallback((data: Uint8Array, metadata: RomMetadata) => {
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
    romSelectionTouchedRef.current = false;
    setMessage(`本地 ROM 已加载：${metadata.displayTitle} / ${metadata.versionLabel} / ${metadata.romSupportLabel}。`);
    appendLog(`运行时：本地 ROM 已加载（${metadata.displayTitle}，${metadata.sizeLabel}，${metadata.romProfileId}）`);
  }, [appendLog, clearAllInputs, createNes, resetPlayerMetrics, resetRamTracking]);

  const loadLocalRom = useCallback(async () => {
    setStatus("loading");
    setMessage(`正在加载 ROM：${romEntryTitle(selectedRomEntry)}...`);
    setRomMetadata(null);
    romBytesRef.current = null;
    try {
      if (selectedRomEntry?.source === "browser") {
        const hydrated = await hydrateBrowserRomEntry(selectedRomEntry);
        if (!hydrated.bytes) throw new Error("Browser ROM bytes are not available");
        installRom(hydrated.bytes, hydrated.metadata);
        return;
      }

      const requestedRomPath = new URLSearchParams(window.location.search).get("rom");
      const serverRomPath = selectedRomEntry?.source === "server"
        ? selectedRomEntry.relativePath
        : requestedRomPath;
      const romQuery = serverRomPath
        ? `?rom=${encodeURIComponent(serverRomPath)}`
        : "";
      const response = await fetch(`/api/local-test-rom${romQuery}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `ROM endpoint returned ${response.status}`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const metadata = parseNesRomMetadata(data, readRomMetadataHeaders(response.headers));
      installRom(data, metadata);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setRomMetadata(null);
      resetRamTracking();
      setStatus("error");
      setMessage(detail);
      appendLog(`运行错误：${detail}`);
    }
  }, [appendLog, hydrateBrowserRomEntry, installRom, resetRamTracking, selectedRomEntry]);

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
      setIsTvFullscreen(document.fullscreenElement === screenFrameRef.current);
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
    const traceConfig = parseTraceCaptureConfig(params);
    if (traceConfig && !autoRecordStartedRef.current) {
      autoRecordStartedRef.current = true;
      startTraceRecording(traceConfig);
    }
    if (params.get("autorun") === "1" && !autoRunStartedRef.current) {
      autoRunStartedRef.current = true;
      startupLaunchPresetRef.current = "auto-1p";
      setStartupLaunchPreset("auto-1p");
      setRunning(true);
    }
    if (params.get("smoke") === "1") {
      autoSmokeStartedRef.current = true;
      runInputSmoke("1P");
    }
  }, [runInputSmoke, setRunning, startTraceRecording, status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("botrun") !== "1" || botRunStartedRef.current || status !== "loaded") return;
    botRunStartedRef.current = true;
    const traceConfig = parseTraceCaptureConfig(params);
    if (traceConfig && !autoRecordStartedRef.current) {
      autoRecordStartedRef.current = true;
      startTraceRecording(traceConfig);
    }
    const requestedFrames = Number.parseInt(params.get("botframes") ?? "8000", 10);
    const maxFrames = Number.isFinite(requestedFrames) ? clamp(requestedFrames, 600, 20000) : 8000;
    void runBotFrameBatch(maxFrames, parseBotRunStrategyParam(params));
  }, [runBotFrameBatch, startTraceRecording, status]);

  useEffect(() => {
    const entry = identifyTasForRom(romMetadata);
    tasMovieRef.current = null;
    tasPlaybackRef.current = {
      active: false,
      movieId: "",
      frameIndex: 0
    };
    setSelectedTasMovieId("");
    setTasPlaybackState({
      ...createIdleTasPlaybackState(),
      movieId: "",
      messageKey: entry ? "matched-available" : "no-match-current",
      message: entry ? "Matched TAS available" : "Current ROM has no matched TAS"
    });
  }, [romMetadata?.md5, romMetadata?.romProfileId]);

  useEffect(() => {
    if (tasPlaybackState.status === "finished") {
      try {
        const archivedEvidence = Object.values(sideTrainingTraceEvidence).filter((item): item is StrategyTraceEvidence => Boolean(item));
        const validationReport = createStrategyPackageValidationReport({
          evidenceBySide: sideTrainingTraceEvidence,
          gameProfileId: "contra",
          mode: "tas-baseline-replay",
          packId: ACTIVE_STRATEGY_PACK.packId,
          packVersion: ACTIVE_STRATEGY_PACK.version,
          replay: {
            complete: true,
            desynced: false,
            deathCount: 0,
            finalStatus: tasPlaybackState.status,
            frameIndex: tasPlaybackState.frameIndex,
            maxProgression: archivedEvidence.reduce((max, evidence) => Math.max(max, evidence.maxWorldX ?? 0), 0)
          },
          sideScope: packageSideScope
        });
        setStrategyPackageValidationReport(validationReport);
        setValidationReplayComplete(true);
        appendLog(`Training package validation replay: finished with ValidationReport ${validationReport.reportId}; save is now enabled for the selected scope.`);
      } catch (error) {
        setStrategyPackageValidationReport(null);
        setValidationReplayComplete(false);
        appendLog(`Training package validation replay blocked: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (tasPlaybackState.status === "desynced") {
      setStrategyPackageValidationReport(null);
      setValidationReplayComplete(false);
      appendLog(`Training package validation replay failed: ${tasPlaybackState.messageDetail ?? tasPlaybackState.message}`);
    }
  }, [
    appendLog,
    packageSideScope,
    sideTrainingTraceEvidence,
    tasPlaybackState.frameIndex,
    tasPlaybackState.message,
    tasPlaybackState.messageDetail,
    tasPlaybackState.status
  ]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      audioRef.current?.close();
    };
  }, []);

  const twoPlayerActive = Boolean(ramSnapshot?.twoPlayerActive);
  const loadedTasEntry = identifyTasForRom(romMetadata);
  const sideTrainingStates: Record<PlayerSide, SideTrainingState> = {
    "1P": buildSideTrainingStateV2("1P", uiLanguage, controlModes["1P"], strategyModels["1P"], strategyResourcePacksBySide["1P"], selectedSideBaselineIds["1P"], selectedTrainingMethod, selectedTrainingSides["1P"] || activeTrainingSides["1P"], activeTrainingSides["1P"], trainingRunActiveSides["1P"], ramSnapshot, loadedTasEntry, traceRecording, traceSampleCount, traceLastSummary, playTraceReport, deathTraceReports),
    "2P": buildSideTrainingStateV2("2P", uiLanguage, controlModes["2P"], strategyModels["2P"], strategyResourcePacksBySide["2P"], selectedSideBaselineIds["2P"], selectedTrainingMethod, selectedTrainingSides["2P"] || activeTrainingSides["2P"], activeTrainingSides["2P"], trainingRunActiveSides["2P"], ramSnapshot, loadedTasEntry, traceRecording, traceSampleCount, traceLastSummary, playTraceReport, deathTraceReports)
  };
  const sideTrainingActions: SideTrainingActions = {
    traceRecording,
    traceSampleCount,
    onSideTrainingToggle: toggleSideTraining,
    onSideTrainingSelectBaseline,
    onSideTrainingBaselineChange,
    onSideTrainingMethodChange,
    onSideTrainingModifyStrategy,
    onSideTrainingArchiveStrategy,
    onSideTrainingValidateStrategy,
    onSideTrainingRunToggle: toggleSideTrainingRun,
    onSideTraceStart,
    onSideTraceStop,
    onSideTraceExport,
    onSideTraceClear
  };
  const globalTraining = buildGlobalTrainingState(
    trainingSessionActive,
    trainingRunActive,
    packageSideScope,
    strategyExportName,
    validationReplayComplete,
    strategySavePathLabel,
    strategyVersionStatusLabel,
    strategyResourcePacksBySide,
    !p2StrategyResourceOverridden,
    uiLanguage
  );
  const tasPlaybackLocked = tasPlaybackState.status === "playing";
  const pilots: Pilot[] = [
    {
      side: "1P",
      name: localizedPilotName("1P", controlModes["1P"], uiLanguage),
      status: localizedPilotStatus("1P", status, controlModes["1P"], strategyModels["1P"], twoPlayerActive, uiLanguage),
      mode: controlModes["1P"],
      strategyKey: strategyModels["1P"],
      strategyResourcePackId: strategyResourcePacksBySide["1P"],
      strategy: `${getAiStrategyLabel(strategyModels["1P"])} / ${modeStrategyLabels[controlModes["1P"]]}`,
      temperament: getPilotTemperament("1P", controlModes["1P"], strategyModels["1P"], twoPlayerActive),
      buttons: buttonStates["1P"],
      accent: "blue",
      keyboardHint: localizedKeyboardHint("1P", uiLanguage),
      gamepadHint: localizedGamepadHint(gamepadLabelsState["1P"], uiLanguage),
      lastInput: localizedLastInput(lastInputs["1P"], uiLanguage),
      authority: localizedAuthorityLabel(controlModes["1P"], uiLanguage),
      metricGroups: buildPilotMetricGroups("1P", controlModes["1P"], buttonStates["1P"], playerMetrics["1P"], ramSnapshot, gameplayActive, status, uiLanguage),
      dialogue: buildPilotDialogue("1P", controlModes["1P"], strategyModels["1P"], ramSnapshot, uiLanguage),
      dataStream: buildDataStream("1P", controlModes["1P"], strategyModels["1P"], lastInputs["1P"], ramSnapshot, gameplayActive, status, strategyPlans, aiActionLocksRef.current["1P"], aiFsmStatesRef.current["1P"], aiLoopExitStatesRef.current["1P"], buttonStates["1P"]),
      training: sideTrainingStates["1P"]
    },
    {
      side: "2P",
      name: localizedPilotName("2P", controlModes["2P"], uiLanguage),
      status: localizedPilotStatus("2P", status, controlModes["2P"], strategyModels["2P"], twoPlayerActive, uiLanguage),
      mode: controlModes["2P"],
      strategyKey: strategyModels["2P"],
      strategyResourcePackId: strategyResourcePacksBySide["2P"],
      strategy: `${getAiStrategyLabel(strategyModels["2P"])} / ${modeStrategyLabels[controlModes["2P"]]}`,
      temperament: getPilotTemperament("2P", controlModes["2P"], strategyModels["2P"], twoPlayerActive),
      buttons: buttonStates["2P"],
      accent: "red",
      keyboardHint: localizedKeyboardHint("2P", uiLanguage),
      gamepadHint: localizedGamepadHint(gamepadLabelsState["2P"], uiLanguage),
      lastInput: localizedLastInput(lastInputs["2P"], uiLanguage),
      authority: localizedAuthorityLabel(controlModes["2P"], uiLanguage),
      metricGroups: buildPilotMetricGroups("2P", controlModes["2P"], buttonStates["2P"], playerMetrics["2P"], ramSnapshot, gameplayActive, status, uiLanguage),
      dialogue: buildPilotDialogue("2P", controlModes["2P"], strategyModels["2P"], ramSnapshot, uiLanguage),
      dataStream: buildDataStream("2P", controlModes["2P"], strategyModels["2P"], lastInputs["2P"], ramSnapshot, gameplayActive, status, strategyPlans, aiActionLocksRef.current["2P"], aiFsmStatesRef.current["2P"], aiLoopExitStatesRef.current["2P"], buttonStates["2P"]),
      training: sideTrainingStates["2P"]
    }
  ];
  const runtimeDebugSnapshots = {
    "1P": buildRuntimeDebugSnapshot({
      side: "1P",
      mode: controlModes["1P"],
      strategyKey: strategyModels["1P"],
      strategyPlans,
      ramSnapshot,
      frameCount,
      gameplayActive,
      runtimeStatus: status,
      actionLock: aiActionLocksRef.current["1P"],
      fsmState: aiFsmStatesRef.current["1P"],
      loopExit: aiLoopExitStatesRef.current["1P"],
      buttons: buttonStates["1P"],
      rawAiButtons: lastRawAiButtonsRef.current["1P"],
      lockedAiButtons: lastLockedAiButtonsRef.current["1P"],
      bossWallPhaseState: bossWallPhaseStatesRef.current["1P"]
    }),
    "2P": buildRuntimeDebugSnapshot({
      side: "2P",
      mode: controlModes["2P"],
      strategyKey: strategyModels["2P"],
      strategyPlans,
      ramSnapshot,
      frameCount,
      gameplayActive,
      runtimeStatus: status,
      actionLock: aiActionLocksRef.current["2P"],
      fsmState: aiFsmStatesRef.current["2P"],
      loopExit: aiLoopExitStatesRef.current["2P"],
      buttons: buttonStates["2P"],
      rawAiButtons: lastRawAiButtonsRef.current["2P"],
      lockedAiButtons: lastLockedAiButtonsRef.current["2P"],
      bossWallPhaseState: bossWallPhaseStatesRef.current["2P"]
    })
  };

  return (
    <main className="cockpit">
      <header className="topbar">
        <div>
          <h1>{t(uiLanguage, "app.title")}</h1>
          <p>{t(uiLanguage, "app.subtitle")}</p>
        </div>
        <div className="status-cluster">
          <span><Gauge size={16} /> {t(uiLanguage, "top.targetFps")}</span>
          <span><AlertTriangle size={16} /> {runtimeStatusLabel(status, uiLanguage)}</span>
          <span><Radio size={16} /> {runtimeAudioLabel(audioStatus, uiLanguage)}</span>
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
          tasLocked={tasPlaybackLocked}
          trainingLocked={sideTrainingStates["1P"].trainingSessionActive}
          trainingActions={sideTrainingActions}
          uiLanguage={uiLanguage}
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
            screenFrameRef={screenFrameRef}
            status={status}
            tvRef={tvRef}
            uiLanguage={uiLanguage}
            visualSettings={visualSettings}
            volume={volume}
          />
          <ConsoleDeck
            globalTraining={globalTraining}
            validationReport={strategyPackageValidationReport}
            onDirectoryFiles={handleRomDirectoryFiles}
            onLoadLocalRom={loadLocalRom}
            onLanguageChange={setUiLanguage}
            onPause={() => setRunning(false)}
            onReset={resetRuntime}
            onRun={() => setRunning(true)}
            onSelectRom={selectRomEntry}
            onStartupLaunchPresetChange={changeStartupLaunchPreset}
            onTasCommentaryModeChange={setTasCommentaryMode}
            onTasLoad={() => { void loadSelectedTasMovie(); }}
            onTasMovieSelect={selectTasMovie}
            onTasPause={pauseTasReplay}
            onTasPlay={() => { void startTasReplay(); }}
            onTasStop={stopTasReplay}
            onTasApplyBaseline={applyTasBaselineToSide}
            onTrainingSaveStrategy={onTrainingSaveStrategy}
          onTrainingSavePathSelected={onTrainingSavePathSelected}
          onTrainingValidateStrategy={onTrainingValidateStrategy}
          onTrainingVersionHistory={onTrainingVersionHistory}
          onPackageSideScopeToggle={togglePackageSideScope}
            onStrategyResourcePackChange={changeStrategyResourcePack}
            onStrategyExportNameChange={changeStrategyExportName}
            onSync2PResourceTo1P={sync2PResourceTo1P}
            romLibraryDirLabel={romLibraryDirLabel}
            romLibraryEntries={romLibraryEntries}
            romLibraryStatus={romLibraryStatus}
            romMetadata={romMetadata}
            selectedTasMovieId={selectedTasMovieId}
            selectedRomEntry={selectedRomEntry}
            startupLaunchPreset={startupLaunchPreset}
            status={status}
            tasCommentaryMode={tasCommentaryMode}
            tasPlaybackState={tasPlaybackState}
            uiLanguage={uiLanguage}
            traceRecording={traceRecording}
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
          tasLocked={tasPlaybackLocked}
          trainingLocked={sideTrainingStates["2P"].trainingSessionActive}
          trainingActions={sideTrainingActions}
          uiLanguage={uiLanguage}
        />
      </div>
      <div className="debug-floor">
        <TacticalPanel
          gameplayActive={gameplayActive}
          language={uiLanguage}
          onOpenStrategyDesigner={openStrategyDesigner}
          ramSnapshot={ramSnapshot}
          strategyKey={strategyModels["1P"]}
          strategyPlans={strategyPlans}
        />
        <LogPanel eventLog={eventLog} language={uiLanguage} />
      </div>
      <DataDashboard
        audioStatus={audioStatus}
        buttonStates={buttonStates}
        controlModes={controlModes}
        deathTraceReports={deathTraceReports}
        frameCount={frameCount}
        gameplayActive={gameplayActive}
        language={uiLanguage}
        onTraceClear={clearTraceRecording}
        onTraceExport={exportTraceRecording}
        onTraceStart={startTraceRecording}
        onTraceStop={stopTraceRecording}
        playerMetrics={playerMetrics}
        ramSnapshot={ramSnapshot}
        status={status}
        strategyModels={strategyModels}
        strategyPlans={strategyPlans}
        traceLastSummary={traceLastSummary}
        traceRecording={traceRecording}
        traceSampleCount={traceSampleCount}
      />
      <output data-testid="runtime-debug-json" hidden>{JSON.stringify(runtimeDebugSnapshots)}</output>
      <output data-testid="bot-run-report-json" hidden>{JSON.stringify(botRunReport)}</output>
      <output data-testid="play-trace-report-json" hidden>{JSON.stringify(playTraceReport)}</output>
      <output data-testid="play-trace-samples-json" hidden>{JSON.stringify(traceSampleSnapshot)}</output>
      <output data-testid="side-training-evidence-json" hidden>{JSON.stringify(sideTrainingTraceEvidence)}</output>
      <output data-testid="side-training-evidence-1p-json" hidden>{JSON.stringify(sideTrainingTraceEvidence["1P"])}</output>
      <output data-testid="side-training-evidence-2p-json" hidden>{JSON.stringify(sideTrainingTraceEvidence["2P"])}</output>
      <output data-testid="strategy-package-validation-report-json" hidden>{JSON.stringify(strategyPackageValidationReport)}</output>
      <output data-testid="strategy-package-evidence-export-json" hidden>{JSON.stringify(strategyPackageEvidenceExport)}</output>
      <StrategyDesignerPanel
        draft={strategyDraft}
        language={uiLanguage}
        onApply1P={() => saveStrategyDraft("1P")}
        onApply2P={() => saveStrategyDraft("2P")}
        onClose={() => setStrategyDesignerOpen(false)}
        onDraftChange={setStrategyDraft}
        onReset={resetStrategyDraft}
        onSave={() => saveStrategyDraft()}
        open={strategyDesignerOpen}
        status={strategyDraftStatus}
      />
    </main>
  );
}

declare global {
  interface Window {
    __fcAiBrowserCockpitRoot?: Root;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing browser cockpit root element.");
}

const root = window.__fcAiBrowserCockpitRoot ?? createRoot(rootElement);
window.__fcAiBrowserCockpitRoot = root;
root.render(<App />);
