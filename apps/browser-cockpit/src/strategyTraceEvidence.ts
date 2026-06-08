export type StrategyTraceSide = "1P" | "2P";

export type StrategyTraceBaselineSourceKind =
  | "strategy-pack"
  | "tas-side-baseline"
  | "human-demo"
  | "ai-run"
  | "known-failure"
  | "unknown";

export type StrategyTraceTrainingMethod =
  | "auto-patch"
  | "model-analysis"
  | "human-assist"
  | "manual-edit"
  | "trace-archive";

export type StrategyTraceSource = {
  baselineId: string;
  baselineSourceKind: StrategyTraceBaselineSourceKind;
  trainingMethod: StrategyTraceTrainingMethod;
  tasIsController: false;
};

export type StrategyTraceInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  start: boolean;
  select: boolean;
};

export type StrategyTraceEnemy = {
  slot: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  routine: number;
  kind: string;
  threat: boolean;
  fixed: boolean;
  priority: number;
};

export type StrategyTraceSample = {
  frame: number;
  gameplayActive: boolean;
  runtimeStatus: string;
  routeSegment: string;
  routeAction: string;
  p1Input: StrategyTraceInput;
  p2Input: StrategyTraceInput;
  ram: null | {
    worldX: number;
    playerX: number;
    playerY: number;
    p2PlayerX: number;
    p2PlayerY: number;
    p2WorldX: number;
    p1State: number;
    p2State: number;
    deathFlag: number;
    p2DeathFlag: number;
    enemies: StrategyTraceEnemy[];
  };
};

export type StrategyTraceEvidenceOptions = {
  failureId?: string;
  fragmentId: string;
  gameProfileId: string;
  progressionWindow: {
    metric: string;
    start: number;
    end: number;
    unit: string;
  };
  romProfileId: string;
  routeClass: string;
  side?: StrategyTraceSide;
  source?: StrategyTraceSource;
  stageId: string;
};

export type SideTrainingTraceEvidenceOptions = {
  baselineId: string;
  failureId?: string;
  gameProfileId?: string;
  baselineSourceKind?: StrategyTraceBaselineSourceKind;
  progressionMetric?: string;
  progressionUnit?: string;
  progressionWindow?: StrategyTraceEvidenceOptions["progressionWindow"];
  romProfileId?: string;
  side: StrategyTraceSide;
  stageId?: string;
  strategyKey: string;
  trainingMethod?: StrategyTraceTrainingMethod;
};

export type StrategyBranchOutcome =
  | "route-class-failed-stop"
  | "death-counterexample"
  | "window-complete"
  | "insufficient-evidence";

export type StrategyTraceEvidence = {
  schema: "fc-ai-strategy-trace-evidence-v1";
  branchOutcome: StrategyBranchOutcome;
  death: null | {
    frame: number;
    input: string;
    playerX: number | null;
    playerY: number | null;
    routeAction: string;
    routeSegment: string;
    worldX: number | null;
  };
  endWorldX: number | null;
  failureId?: string;
  fragmentId: string;
  gameProfileId: string;
  inputSummary: Record<string, number>;
  maxWorldX: number | null;
  progressionWindow: StrategyTraceEvidenceOptions["progressionWindow"];
  romProfileId: string;
  routeClass: string;
  sampleCount: number;
  side: StrategyTraceSide;
  source: StrategyTraceSource;
  stageId: string;
  startWorldX: number | null;
  topEnemies: StrategyTraceEnemy[];
};

export function traceInputLabel(input: StrategyTraceInput) {
  return [
    input.up ? "up" : "",
    input.down ? "down" : "",
    input.left ? "left" : "",
    input.right ? "right" : "",
    input.a ? "A" : "",
    input.b ? "B" : "",
    input.select ? "select" : "",
    input.start ? "start" : ""
  ].filter(Boolean).join("+") || "none";
}

function worldXForSide(sample: StrategyTraceSample, side: StrategyTraceSide) {
  if (!sample.ram) return null;
  return side === "1P" ? sample.ram.worldX : sample.ram.p2WorldX;
}

function playerXForSide(sample: StrategyTraceSample, side: StrategyTraceSide) {
  if (!sample.ram) return null;
  return side === "1P" ? sample.ram.playerX : sample.ram.p2PlayerX;
}

function playerYForSide(sample: StrategyTraceSample, side: StrategyTraceSide) {
  if (!sample.ram) return null;
  return side === "1P" ? sample.ram.playerY : sample.ram.p2PlayerY;
}

function stateForSide(sample: StrategyTraceSample, side: StrategyTraceSide) {
  if (!sample.ram) return null;
  return side === "1P" ? sample.ram.p1State : sample.ram.p2State;
}

function deathFlagForSide(sample: StrategyTraceSample, side: StrategyTraceSide) {
  if (!sample.ram) return null;
  return side === "1P" ? sample.ram.deathFlag : sample.ram.p2DeathFlag;
}

function inputForSide(sample: StrategyTraceSample, side: StrategyTraceSide) {
  return side === "1P" ? sample.p1Input : sample.p2Input;
}

function isDeathSample(sample: StrategyTraceSample, side: StrategyTraceSide) {
  return stateForSide(sample, side) === 2 || (deathFlagForSide(sample, side) ?? 0) !== 0;
}

function samplesInWindow(samples: StrategyTraceSample[], options: StrategyTraceEvidenceOptions) {
  const side = options.side ?? "1P";
  return samples.filter((sample) => {
    const worldX = worldXForSide(sample, side);
    return worldX !== null
      && worldX >= options.progressionWindow.start
      && worldX <= options.progressionWindow.end;
  });
}

function countInputs(samples: StrategyTraceSample[], side: StrategyTraceSide) {
  const summary: Record<string, number> = {};
  for (const sample of samples) {
    const label = traceInputLabel(inputForSide(sample, side));
    summary[label] = (summary[label] ?? 0) + 1;
  }
  return summary;
}

function topEnemies(samples: StrategyTraceSample[]) {
  const bySlot = new Map<number, StrategyTraceEnemy>();
  for (const sample of samples) {
    for (const enemy of sample.ram?.enemies ?? []) {
      if (enemy.hp <= 0 && !enemy.threat) continue;
      const current = bySlot.get(enemy.slot);
      if (!current || enemy.priority > current.priority || enemy.hp > current.hp) {
        bySlot.set(enemy.slot, enemy);
      }
    }
  }
  return [...bySlot.values()]
    .sort((a, b) => (b.priority - a.priority) || (b.hp - a.hp))
    .slice(0, 8);
}

function findDeath(samples: StrategyTraceSample[], side: StrategyTraceSide): StrategyTraceEvidence["death"] {
  const sample = samples.find((candidate) => isDeathSample(candidate, side));
  if (!sample) return null;
  return {
    frame: sample.frame,
    input: traceInputLabel(inputForSide(sample, side)),
    playerX: playerXForSide(sample, side),
    playerY: playerYForSide(sample, side),
    routeAction: sample.routeAction,
    routeSegment: sample.routeSegment,
    worldX: worldXForSide(sample, side)
  };
}

function defaultTraceSource(options: StrategyTraceEvidenceOptions): StrategyTraceSource {
  if (options.source) return options.source;
  return {
    baselineId: options.failureId ?? "unspecified",
    baselineSourceKind: options.failureId ? "known-failure" : "unknown",
    trainingMethod: "trace-archive",
    tasIsController: false
  };
}

export function classifyBranchOutcome(evidence: Pick<StrategyTraceEvidence, "death" | "endWorldX" | "failureId" | "progressionWindow" | "sampleCount">): StrategyBranchOutcome {
  if (evidence.sampleCount <= 0) return "insufficient-evidence";
  if (evidence.death && evidence.failureId) return "route-class-failed-stop";
  if (evidence.death) return "death-counterexample";
  if (evidence.endWorldX !== null && evidence.endWorldX >= evidence.progressionWindow.end) return "window-complete";
  return "insufficient-evidence";
}

export function createStrategyTraceEvidence(
  samples: StrategyTraceSample[],
  options: StrategyTraceEvidenceOptions
): StrategyTraceEvidence {
  const side = options.side ?? "1P";
  const windowSamples = samplesInWindow(samples, options);
  const worldXs = windowSamples
    .map((sample) => worldXForSide(sample, side))
    .filter((worldX): worldX is number => worldX !== null);
  const death = findDeath(windowSamples, side);
  const evidenceWithoutOutcome = {
    schema: "fc-ai-strategy-trace-evidence-v1" as const,
    death,
    endWorldX: worldXs.length > 0 ? worldXs[worldXs.length - 1] : null,
    failureId: options.failureId,
    fragmentId: options.fragmentId,
    gameProfileId: options.gameProfileId,
    inputSummary: countInputs(windowSamples, side),
    maxWorldX: worldXs.length > 0 ? Math.max(...worldXs) : null,
    progressionWindow: options.progressionWindow,
    romProfileId: options.romProfileId,
    routeClass: options.routeClass,
    sampleCount: windowSamples.length,
    side,
    source: defaultTraceSource(options),
    stageId: options.stageId,
    startWorldX: worldXs.length > 0 ? worldXs[0] : null,
    topEnemies: topEnemies(windowSamples)
  };

  return {
    ...evidenceWithoutOutcome,
    branchOutcome: classifyBranchOutcome(evidenceWithoutOutcome)
  };
}

function normalizeEvidenceId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function deriveProgressionWindow(
  samples: StrategyTraceSample[],
  options: SideTrainingTraceEvidenceOptions
): StrategyTraceEvidenceOptions["progressionWindow"] {
  if (options.progressionWindow) return options.progressionWindow;
  const observedWorldXs = samples
    .map((sample) => worldXForSide(sample, options.side))
    .filter((worldX): worldX is number => worldX !== null);
  const start = observedWorldXs.length > 0 ? Math.min(...observedWorldXs) : 0;
  const end = observedWorldXs.length > 0 ? Math.max(...observedWorldXs) : 0;
  return {
    metric: options.progressionMetric ?? "progression.primary",
    start,
    end,
    unit: options.progressionUnit ?? "ProgressionUnits"
  };
}

export function createSideTrainingTraceEvidence(
  samples: StrategyTraceSample[],
  options: SideTrainingTraceEvidenceOptions
): StrategyTraceEvidence {
  const sideId = options.side.toLowerCase();
  const strategyId = normalizeEvidenceId(options.strategyKey);
  const baselineId = normalizeEvidenceId(options.baselineId);
  return createStrategyTraceEvidence(samples, {
    failureId: options.failureId,
    fragmentId: `candidate-${sideId}-${strategyId}-${baselineId}`,
    gameProfileId: options.gameProfileId ?? "unknown-game",
    progressionWindow: deriveProgressionWindow(samples, options),
    romProfileId: options.romProfileId ?? "unknown-rom",
    routeClass: `training:${options.strategyKey}:${options.baselineId}`,
    side: options.side,
    source: {
      baselineId: options.baselineId,
      baselineSourceKind: options.baselineSourceKind ?? "strategy-pack",
      trainingMethod: options.trainingMethod ?? "auto-patch",
      tasIsController: false
    },
    stageId: options.stageId ?? "unknown-stage"
  });
}
