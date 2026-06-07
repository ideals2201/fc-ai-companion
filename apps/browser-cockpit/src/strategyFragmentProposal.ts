import type { StrategyTraceEvidence, StrategyTraceSide } from "./strategyTraceEvidence";

export type CandidateStrategyType =
  | "survival"
  | "speed"
  | "combat"
  | "loot"
  | "guard"
  | "objective"
  | "recovery"
  | "training"
  | "bridge-jump-window"
  | "fixed-threat-hp-lock"
  | "weapon-route";

export type TasSideBaselineForProposal = {
  movieId: string;
  sourceKind: "tas-side-split";
  side: StrategyTraceSide;
  windowId: string;
  label: string;
  frameWindow: readonly number[];
  rangeSemantics: string;
  totalFrames: number;
  pressedFrames: number;
  pressedRatio: number;
  buttonPressFrames: Partial<Record<"up" | "down" | "left" | "right" | "a" | "b" | "start" | "select", number>>;
  topInputPatterns: Array<{
    label: string;
    frames: number;
    ratio: number;
  }>;
  intentHints: readonly string[];
  acceptanceChecks: readonly string[];
  strategyTypes: readonly string[];
  promotionTarget: {
    gameProfileId: string;
    romProfileId: string;
    stageId: string;
    side: StrategyTraceSide;
    requiredValidation: string;
  };
};

export type StrategyFragmentProposalOptions = {
  evidence: StrategyTraceEvidence;
  tasSideBaseline: TasSideBaselineForProposal;
  tasSideBaselinePath: string;
};

export type CandidateStrategyFragmentProposal = {
  schema: "fc-ai-strategy-fragment-proposal-v1";
  schemaVersion: "1.0.0";
  fragment: {
    id: string;
    label: string;
    status: "candidate";
    strategyTypes: CandidateStrategyType[];
    progressionWindow: {
      metric: string;
      start: number;
      end: number;
      unit: string;
      strictEnd: true;
    };
    conditions: Array<{
      ref: string;
      op: string;
      value: unknown;
    }>;
    actionAdvice: {
      intent: string;
      intentCombination: Array<{
        intent: string;
        weight: number;
      }>;
      priority: number;
      parameters: Record<string, unknown>;
      lockFrames: number;
    };
    safetyOverrides: string[];
    exitConditions: Array<{
      ref: string;
      op: string;
      value: unknown;
    }>;
    source: {
      traceEvidence: {
        fragmentId: string;
        routeClass: string;
        branchOutcome: string;
        sampleCount: number;
      };
      tasSideBaseline: {
        path: string;
        movieId: string;
        windowId: string;
        frameWindow: readonly number[];
        tasIsController: false;
      };
    };
    telemetry: {
      requiredRefs: string[];
    };
  };
};

const DECLARED_STRATEGY_TYPES = new Set<CandidateStrategyType>([
  "survival",
  "speed",
  "combat",
  "loot",
  "guard",
  "objective",
  "recovery",
  "training",
  "bridge-jump-window",
  "fixed-threat-hp-lock",
  "weapon-route"
]);

function normalizeStrategyType(value: string): CandidateStrategyType | null {
  if (value === "speedrun") return "speed";
  return DECLARED_STRATEGY_TYPES.has(value as CandidateStrategyType) ? value as CandidateStrategyType : null;
}

function uniqueStrategyTypes(values: readonly string[]): CandidateStrategyType[] {
  const normalized = values
    .map(normalizeStrategyType)
    .filter((value): value is CandidateStrategyType => Boolean(value));
  return [...new Set(normalized)];
}

function fragmentProposalId(evidence: StrategyTraceEvidence) {
  return evidence.fragmentId.startsWith("candidate-")
    ? evidence.fragmentId.replace(/^candidate-/, "candidate-fragment-")
    : `candidate-fragment-${evidence.fragmentId}`;
}

function actionIntentCombination(
  evidence: StrategyTraceEvidence,
  tasSideBaseline: TasSideBaselineForProposal
) {
  const intents = [
    { intent: "advance", weight: Math.min(1, Math.max(0.45, (tasSideBaseline.buttonPressFrames.right ?? 0) / Math.max(1, tasSideBaseline.totalFrames))) },
    (tasSideBaseline.buttonPressFrames.a ?? 0) > 0 ? { intent: "jump", weight: 0.7 } : null,
    Object.keys(evidence.inputSummary).some((label) => label.includes("B")) || (tasSideBaseline.buttonPressFrames.b ?? 0) > 0
      ? { intent: "fire_target", weight: 0.65 }
      : null,
    (tasSideBaseline.buttonPressFrames.down ?? 0) > 0 ? { intent: "aim_down", weight: 0.45 } : null
  ];
  return intents.filter((item): item is { intent: string; weight: number } => Boolean(item));
}

function primaryIntent(intentCombination: Array<{ intent: string; weight: number }>) {
  return [...intentCombination].sort((left, right) => right.weight - left.weight)[0]?.intent ?? "advance";
}

function assertBaselineMatchesEvidence(
  evidence: StrategyTraceEvidence,
  tasSideBaseline: TasSideBaselineForProposal
) {
  if (tasSideBaseline.side !== evidence.side || tasSideBaseline.promotionTarget.side !== evidence.side) {
    throw new Error("TAS side baseline side mismatch");
  }
  if (tasSideBaseline.promotionTarget.romProfileId !== evidence.romProfileId) {
    throw new Error("TAS side baseline ROMProfile mismatch");
  }
  if (tasSideBaseline.promotionTarget.gameProfileId !== evidence.gameProfileId) {
    throw new Error("TAS side baseline gameProfileId mismatch");
  }
  if (tasSideBaseline.promotionTarget.stageId !== evidence.stageId) {
    throw new Error("TAS side baseline stageId mismatch");
  }
}

export function createCandidateStrategyFragmentProposal(
  options: StrategyFragmentProposalOptions
): CandidateStrategyFragmentProposal {
  const { evidence, tasSideBaseline, tasSideBaselinePath } = options;
  assertBaselineMatchesEvidence(evidence, tasSideBaseline);

  const strategyTypes = uniqueStrategyTypes(tasSideBaseline.strategyTypes);
  const intentCombination = actionIntentCombination(evidence, tasSideBaseline);

  return {
    schema: "fc-ai-strategy-fragment-proposal-v1",
    schemaVersion: "1.0.0",
    fragment: {
      id: fragmentProposalId(evidence),
      label: `${tasSideBaseline.label} candidate`,
      status: "candidate",
      strategyTypes,
      progressionWindow: {
        metric: evidence.progressionWindow.metric,
        start: evidence.progressionWindow.start,
        end: evidence.progressionWindow.end,
        unit: evidence.progressionWindow.unit,
        strictEnd: true
      },
      conditions: [
        { ref: "stage.id", op: "eq", value: evidence.stageId },
        { ref: `player.${evidence.side}.alive`, op: "eq", value: true },
        { ref: "rom.profile", op: "eq", value: evidence.romProfileId }
      ],
      actionAdvice: {
        intent: primaryIntent(intentCombination),
        intentCombination,
        priority: 70,
        parameters: {
          sourceKind: "tas-side-baseline-plus-trace-evidence",
          routeClass: evidence.routeClass,
          requiredValidation: tasSideBaseline.promotionTarget.requiredValidation,
          tasWindowId: tasSideBaseline.windowId
        },
        lockFrames: 0
      },
      safetyOverrides: [
        "immediate-lethal-danger",
        "real-runtime-trace-required",
        "safety-override-required",
        "side-owned-promotion-required",
        "tas-desync-guard"
      ],
      exitConditions: [
        { ref: evidence.progressionWindow.metric, op: "gte", value: evidence.progressionWindow.end },
        { ref: `player.${evidence.side}.alive`, op: "eq", value: false },
        { ref: "validation.desynced", op: "eq", value: true }
      ],
      source: {
        traceEvidence: {
          fragmentId: evidence.fragmentId,
          routeClass: evidence.routeClass,
          branchOutcome: evidence.branchOutcome,
          sampleCount: evidence.sampleCount
        },
        tasSideBaseline: {
          path: tasSideBaselinePath,
          movieId: tasSideBaseline.movieId,
          windowId: tasSideBaseline.windowId,
          frameWindow: tasSideBaseline.frameWindow,
          tasIsController: false
        }
      },
      telemetry: {
        requiredRefs: [
          evidence.progressionWindow.metric,
          `player.${evidence.side}.position`,
          "runtime.finalInput",
          "validation.desynced"
        ]
      }
    }
  };
}
