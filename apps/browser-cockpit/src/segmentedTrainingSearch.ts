export type SegmentedTrainingSide = "1P" | "2P";

export type SegmentTrainingDefinition = {
  id: string;
  progressionMetric: string;
  progressionStart: number;
  progressionEnd: number;
  strategyKey: string;
};

export type SegmentTrainingSyncAnchors = {
  runtime: string;
  inputClock: string;
  initialStateType: "power-on" | "reset" | "savestate" | "runtime-checkpoint" | "active-game-entry";
  movieFramecount: number | null;
  inputRowIndex: number | null;
  knownInputRamOffsetFrames: number | null;
};

export type SegmentTrainingDeterministicContext = {
  rngStatus: "known" | "unknown" | "unmapped";
  inputSamplingDelayFrames: number;
  perturbationRequired: boolean;
};

export type SegmentTrainingAttempt = {
  attemptId: string;
  candidateFragmentId: string;
  deathCount: number;
  desynced: boolean;
  evidenceRef?: string;
  finalProgression: number;
  fixedTargetsDestroyed: number;
  frameCount: number;
  maxProgression: number;
  progressStallFrames: number;
  rewardsCollected: number;
  scoreDelta: number;
  stuckLoop: boolean;
};

export type SegmentTrainingAttemptRank = SegmentTrainingAttempt & {
  gateStatus: "candidate" | "rejected";
  progressGain: number;
  rejectionReasons: string[];
  riskTags: string[];
  score: number;
};

export type SegmentedTrainingSearchReportOptions = {
  attempts: SegmentTrainingAttempt[];
  createdAt?: string;
  deterministicContext?: SegmentTrainingDeterministicContext;
  gameProfileId: string;
  romProfileId: string;
  segment: SegmentTrainingDefinition;
  side: SegmentedTrainingSide;
  stageId: string;
  syncAnchors?: SegmentTrainingSyncAnchors;
};

export type SegmentedTrainingPromotionGate = {
  id:
    | "trace-evidence"
    | "validation-report"
    | "mode-specific-runtime-replay"
    | "deterministic-context"
    | "negative-constraints";
  status: "missing" | "passed" | "failed";
};

export type SegmentedTrainingSearchReport = {
  schema: "fc-ai-segmented-training-search-report-v1";
  schemaVersion: "1.0.0";
  createdAt: string;
  gameProfileId: string;
  romProfileId: string;
  side: SegmentedTrainingSide;
  stageId: string;
  segment: SegmentTrainingDefinition;
  status: "candidate-search";
  sourceLevel: "Level 1 Automated";
  validationStatus: "missing";
  syncAnchors: SegmentTrainingSyncAnchors;
  deterministicContext: SegmentTrainingDeterministicContext;
  attempts: SegmentTrainingAttemptRank[];
  bestAttempt: SegmentTrainingAttemptRank | null;
  rejectedAttempts: SegmentTrainingAttemptRank[];
  promotionGates: SegmentedTrainingPromotionGate[];
  requiredPromotionEvidence: ["TraceEvidence", "ValidationReport", "mode-specific runtime replay"];
};

function clampNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function rejectionReasonsForAttempt(attempt: SegmentTrainingAttempt, segment: SegmentTrainingDefinition) {
  const reasons: string[] = [];
  if (attempt.desynced) reasons.push("desync");
  if (attempt.deathCount > 0) reasons.push("death");
  if (attempt.stuckLoop) reasons.push("stuck-loop");
  if (attempt.maxProgression < segment.progressionStart) reasons.push("segment-not-reached");
  return reasons;
}

function riskTagsForAttempt(attempt: SegmentTrainingAttempt, segment: SegmentTrainingDefinition) {
  const tags: string[] = [];
  const hasRewardSignal = attempt.scoreDelta > 0 || attempt.rewardsCollected > 0;
  const failedProgress = attempt.stuckLoop || attempt.maxProgression < segment.progressionEnd;
  if (hasRewardSignal && failedProgress) tags.push("reward-farming-risk");
  if (attempt.progressStallFrames >= 120) tags.push("progress-stall-risk");
  if (attempt.maxProgression < segment.progressionStart) tags.push("insufficient-segment-evidence");
  return tags;
}

function defaultSyncAnchors(): SegmentTrainingSyncAnchors {
  return {
    runtime: "browser-headless-jsnes",
    inputClock: "nes.frame-before-step",
    initialStateType: "runtime-checkpoint",
    movieFramecount: null,
    inputRowIndex: null,
    knownInputRamOffsetFrames: null
  };
}

function defaultDeterministicContext(): SegmentTrainingDeterministicContext {
  return {
    rngStatus: "unknown",
    inputSamplingDelayFrames: 0,
    perturbationRequired: true
  };
}

function missingPromotionGates(): SegmentedTrainingPromotionGate[] {
  return [
    { id: "trace-evidence", status: "missing" },
    { id: "validation-report", status: "missing" },
    { id: "mode-specific-runtime-replay", status: "missing" },
    { id: "deterministic-context", status: "missing" },
    { id: "negative-constraints", status: "missing" }
  ];
}

export function rankSegmentAttempt(
  attempt: SegmentTrainingAttempt,
  segment: SegmentTrainingDefinition
): SegmentTrainingAttemptRank {
  const rejectionReasons = rejectionReasonsForAttempt(attempt, segment);
  const riskTags = riskTagsForAttempt(attempt, segment);
  const progressGain = Math.max(0, clampNumber(attempt.maxProgression) - segment.progressionStart);
  const completionBonus = attempt.maxProgression >= segment.progressionEnd ? 1000 : 0;
  const score = progressGain
    + completionBonus
    + attempt.fixedTargetsDestroyed * 40
    + attempt.rewardsCollected * 15
    + Math.min(250, Math.max(0, attempt.scoreDelta / 100))
    - attempt.deathCount * 10000
    - (attempt.desynced ? 10000 : 0)
    - (attempt.stuckLoop ? 3000 : 0)
    - Math.min(1200, Math.max(0, attempt.progressStallFrames * 4))
    - Math.min(250, Math.max(0, attempt.frameCount / 10));

  return {
    ...attempt,
    gateStatus: rejectionReasons.length > 0 ? "rejected" : "candidate",
    progressGain,
    rejectionReasons,
    riskTags,
    score
  };
}

export function createSegmentedTrainingSearchReport(
  options: SegmentedTrainingSearchReportOptions
): SegmentedTrainingSearchReport {
  const attempts = options.attempts
    .map((attempt) => rankSegmentAttempt(attempt, options.segment))
    .sort((left, right) => right.score - left.score);
  const bestAttempt = attempts.find((attempt) => attempt.gateStatus === "candidate") ?? null;

  return {
    schema: "fc-ai-segmented-training-search-report-v1",
    schemaVersion: "1.0.0",
    createdAt: options.createdAt ?? new Date().toISOString(),
    gameProfileId: options.gameProfileId,
    romProfileId: options.romProfileId,
    side: options.side,
    stageId: options.stageId,
    segment: options.segment,
    status: "candidate-search",
    sourceLevel: "Level 1 Automated",
    validationStatus: "missing",
    syncAnchors: options.syncAnchors ?? defaultSyncAnchors(),
    deterministicContext: options.deterministicContext ?? defaultDeterministicContext(),
    attempts,
    bestAttempt,
    rejectedAttempts: attempts.filter((attempt) => attempt.gateStatus === "rejected"),
    promotionGates: missingPromotionGates(),
    requiredPromotionEvidence: [
      "TraceEvidence",
      "ValidationReport",
      "mode-specific runtime replay"
    ]
  };
}
