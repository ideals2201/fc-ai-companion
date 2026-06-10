import {
  createSegmentedTrainingSearchReport,
  type SegmentTrainingAttempt,
  type SegmentTrainingAttemptRank,
  type SegmentedTrainingSearchReport,
  type SegmentedTrainingSearchReportOptions
} from "./segmentedTrainingSearch";

export type ContraRuntimeSmokeReport = {
  status?: string;
  reason?: string;
  frameCount?: number;
  lostActiveFrame?: number | null;
  progressStallFrames?: number | null;
  finalSnapshot?: {
    worldX?: number;
  } | null;
  maxProgressSnapshot?: {
    worldX?: number;
  } | null;
};

export type ContraRuntimeEvidence = {
  status: string;
  reason: string | null;
  lostActiveFrame: number | null;
  progressStallFrames: number;
  finalProgression: number;
  maxProgression: number;
};

export type ContraSegmentRuntimeAttempt = SegmentTrainingAttempt & {
  runtimeEvidence: ContraRuntimeEvidence;
};

export type RuntimeSmokeReportToAttemptOptions = {
  candidateTrial: string;
  fragmentPrefix: string;
  frameCount?: number;
  report: ContraRuntimeSmokeReport;
};

export type ContraSegmentCandidateRuntimeResult = {
  candidateTrial: string;
  report: ContraRuntimeSmokeReport;
};

export type ContraSegmentCandidateSearchReportOptions =
  Omit<SegmentedTrainingSearchReportOptions, "attempts"> & {
    candidates: ContraSegmentCandidateRuntimeResult[];
    fragmentPrefix: string;
    frameCount?: number;
  };

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function statusOrUnknown(value: unknown) {
  return typeof value === "string" && value ? value : "unknown";
}

function isDeathStatus(status: string, lostActiveFrame: number | null) {
  return status === "lost-active" || status === "recovered-after-loss" || lostActiveFrame !== null;
}

function isStuckStatus(status: string) {
  return status === "stalled-active";
}

function isRuntimeErrorStatus(status: string) {
  return status === "error";
}

export function runtimeSmokeReportToSegmentAttempt({
  candidateTrial,
  fragmentPrefix,
  frameCount,
  report
}: RuntimeSmokeReportToAttemptOptions): ContraSegmentRuntimeAttempt {
  const status = statusOrUnknown(report.status);
  const lostActiveFrame = nullableNumber(report.lostActiveFrame);
  const progressStallFrames = numberOrZero(report.progressStallFrames);
  const finalProgression = numberOrZero(report.finalSnapshot?.worldX);
  const maxProgression = numberOrZero(report.maxProgressSnapshot?.worldX) || finalProgression;

  return {
    attemptId: `${candidateTrial}-runtime-trial`,
    candidateFragmentId: `${fragmentPrefix}-${candidateTrial}`,
    deathCount: isDeathStatus(status, lostActiveFrame) ? 1 : 0,
    desynced: isRuntimeErrorStatus(status),
    finalProgression,
    fixedTargetsDestroyed: 0,
    frameCount: frameCount ?? numberOrZero(report.frameCount),
    maxProgression,
    progressStallFrames,
    rewardsCollected: 0,
    runtimeEvidence: {
      status,
      reason: typeof report.reason === "string" ? report.reason : null,
      lostActiveFrame,
      progressStallFrames,
      finalProgression,
      maxProgression
    },
    scoreDelta: 0,
    stuckLoop: isStuckStatus(status)
  };
}

function rejectionSeverity(attempt: SegmentTrainingAttemptRank) {
  if (attempt.rejectionReasons.includes("death")) return 0;
  if (attempt.rejectionReasons.includes("desync")) return 1;
  if (attempt.rejectionReasons.includes("stuck-loop")) return 2;
  return 3;
}

function sortRejectedForTriage(attempts: SegmentTrainingAttemptRank[]) {
  return [...attempts].sort((left, right) => {
    const severity = rejectionSeverity(left) - rejectionSeverity(right);
    if (severity !== 0) return severity;
    return right.maxProgression - left.maxProgression;
  });
}

export function createContraSegmentCandidateSearchReport(
  options: ContraSegmentCandidateSearchReportOptions
): SegmentedTrainingSearchReport {
  const attempts = options.candidates.map((candidate) => runtimeSmokeReportToSegmentAttempt({
    candidateTrial: candidate.candidateTrial,
    fragmentPrefix: options.fragmentPrefix,
    frameCount: options.frameCount,
    report: candidate.report
  }));
  const report = createSegmentedTrainingSearchReport({
    ...options,
    attempts
  });

  return {
    ...report,
    rejectedAttempts: sortRejectedForTriage(report.rejectedAttempts)
  };
}
