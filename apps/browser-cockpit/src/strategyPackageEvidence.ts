import type { StrategyTraceEvidence, StrategyTraceSide } from "./strategyTraceEvidence";
import type { CandidateStrategyFragmentProposal } from "./strategyFragmentProposal";

export type StrategyPackageSideScope = "none" | "1p-only" | "2p-only" | "1p-2p";

export type StrategyPackageValidationMode =
  | "tas-baseline-replay"
  | "single-ai"
  | "human-ai"
  | "dual-ai";

export type StrategyPackageValidationReplay = {
  complete: boolean;
  desynced: boolean;
  desyncReason?: string;
  deathCount: number;
  finalStatus: string;
  frameIndex: number;
  maxProgression: number;
};

export type StrategyPackageQualityGateId =
  | "schema"
  | "rom"
  | "entry"
  | "sync"
  | "safety"
  | "progress"
  | "strategy"
  | "side"
  | "perturbation"
  | "regression";

export type StrategyPackageQualityGateStatus =
  | "passed"
  | "failed"
  | "missing"
  | "not-applicable";

export type StrategyPackageQualityGate = {
  id: StrategyPackageQualityGateId;
  label: string;
  required: boolean;
  status: StrategyPackageQualityGateStatus;
  reason: string;
  evidenceRefs: string[];
};

export type StrategyPackageQualityGateOverride = Partial<Pick<StrategyPackageQualityGate, "required" | "status" | "reason" | "evidenceRefs">>;

export type StrategyPackageValidationReport = {
  schema: "fc-ai-strategy-validation-report-v1";
  schemaVersion: "1.0.0";
  reportId: string;
  createdAt: string;
  gameProfileId: string;
  packId: string;
  packVersion: string;
  sideScope: StrategyPackageSideScope;
  mode: StrategyPackageValidationMode;
  result: "passed" | "failed";
  romProfileIds: string[];
  selectedSides: StrategyTraceSide[];
  evidenceRefs: string[];
  replay: StrategyPackageValidationReplay;
  qualityGates: StrategyPackageQualityGate[];
  packageStatus: "candidate";
};

export type StrategyPackageValidationReportOptions = {
  createdAt?: string;
  evidenceBySide: Record<StrategyTraceSide, StrategyTraceEvidence | null>;
  gameProfileId: string;
  mode: StrategyPackageValidationMode;
  packId: string;
  packVersion: string;
  qualityGateOverrides?: Partial<Record<StrategyPackageQualityGateId, StrategyPackageQualityGateOverride>>;
  replay: StrategyPackageValidationReplay;
  sideScope: StrategyPackageSideScope;
};

export type StrategyPackageEvidenceExportOptions = {
  candidateFragmentProposals?: CandidateStrategyFragmentProposal[];
  createdAt?: string;
  displayName: string;
  evidenceBySide: Record<StrategyTraceSide, StrategyTraceEvidence | null>;
  gameProfileId: string;
  packId: string;
  packVersion: string;
  sideScope: StrategyPackageSideScope;
  tasSideBaselinePaths?: string[];
  validationReport: StrategyPackageValidationReport | null;
  validationReplayComplete: boolean;
};

export type StrategyPackageEvidenceExport = {
  schema: "fc-ai-strategy-package-evidence-export-v1";
  schemaVersion: "1.0.0";
  createdAt: string;
  displayName: string;
  packId: string;
  packVersion: string;
  gameProfileId: string;
  selectedSides: StrategyTraceSide[];
  status: "candidate";
  romProfileIds: string[];
  romPolicy: {
    romFileNotIncluded: true;
    userMustProvideOwnRom: true;
  };
  validation: {
    replayComplete: true;
    validationStatus: "candidate";
    reportPath: string;
    report: StrategyPackageValidationReport;
  };
  evidence: Record<StrategyTraceSide, StrategyTraceEvidence>;
  manifestPatch: {
    packId: string;
    packVersion: string;
    gameProfileId: string;
    sideScope: StrategyPackageSideScope;
    status: "candidate";
    sideArtifacts: Record<"1p" | "2p", {
      candidateFragments: string[];
      evidence: string[];
      tasSideBaselines: string[];
      validationReports: string[];
    }>;
    quality: {
      candidateFragmentCount: number;
      evidenceCount: number;
      validatedModes: string[];
    };
    license: {
      romFileNotIncluded: true;
      userMustProvideOwnRom: true;
    };
  };
  packageFiles: Array<{
    path: string;
    content: unknown;
  }>;
};

export function selectedSidesForStrategyPackageScope(scope: StrategyPackageSideScope): StrategyTraceSide[] {
  if (scope === "1p-only") return ["1P"];
  if (scope === "2p-only") return ["2P"];
  if (scope === "1p-2p") return ["1P", "2P"];
  return [];
}

function sideKey(side: StrategyTraceSide): "1p" | "2p" {
  return side === "1P" ? "1p" : "2p";
}

function evidencePath(evidence: StrategyTraceEvidence) {
  return `stages/${evidence.stageId}/trace-evidence/${evidence.fragmentId}.json`;
}

function candidateFragmentPath(evidence: StrategyTraceEvidence, proposal: CandidateStrategyFragmentProposal) {
  return `stages/${evidence.stageId}/candidate-fragments/${proposal.fragment.id}.json`;
}

function validationReportPath(report: StrategyPackageValidationReport, evidence: Record<StrategyTraceSide, StrategyTraceEvidence>) {
  const stageIds = uniqueSorted(Object.values(evidence).map((item) => item.stageId));
  const stagePrefix = stageIds.length === 1 ? `stages/${stageIds[0]}` : "stages/multi-stage";
  return `${stagePrefix}/validation-reports/${report.reportId}.json`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function collectSelectedEvidence(
  evidenceBySide: Record<StrategyTraceSide, StrategyTraceEvidence | null>,
  selectedSides: StrategyTraceSide[],
  gameProfileId: string
) {
  const evidence = {} as Record<StrategyTraceSide, StrategyTraceEvidence>;
  for (const side of selectedSides) {
    const sideEvidence = evidenceBySide[side];
    if (!sideEvidence) {
      throw new Error(`missing archived TraceEvidence for ${side}`);
    }
    if (sideEvidence.schema !== "fc-ai-strategy-trace-evidence-v1") {
      throw new Error(`unsupported TraceEvidence schema for ${side}`);
    }
    if (sideEvidence.side !== side) {
      throw new Error(`TraceEvidence side mismatch for ${side}`);
    }
    if (sideEvidence.gameProfileId !== gameProfileId) {
      throw new Error(`TraceEvidence gameProfileId mismatch for ${side}`);
    }
    evidence[side] = sideEvidence;
  }
  return evidence;
}

const qualityGateOrder: StrategyPackageQualityGateId[] = [
  "schema",
  "rom",
  "entry",
  "sync",
  "safety",
  "progress",
  "strategy",
  "side",
  "perturbation",
  "regression"
];

const qualityGateLabels: Record<StrategyPackageQualityGateId, string> = {
  schema: "Schema Gate",
  rom: "ROM Gate",
  entry: "Entry Gate",
  sync: "Sync Gate",
  safety: "Safety Gate",
  progress: "Progress Gate",
  strategy: "Strategy Gate",
  side: "Side Gate",
  perturbation: "Perturbation Gate",
  regression: "Regression Gate"
};

function gateAllowsSave(gate: StrategyPackageQualityGate) {
  return gate.status === "passed" || gate.status === "not-applicable";
}

function createQualityGate(
  id: StrategyPackageQualityGateId,
  status: StrategyPackageQualityGateStatus,
  reason: string,
  evidenceRefs: string[],
  required = true
): StrategyPackageQualityGate {
  return {
    id,
    label: qualityGateLabels[id],
    required,
    status,
    reason,
    evidenceRefs
  };
}

function applyQualityGateOverrides(
  gates: StrategyPackageQualityGate[],
  overrides: StrategyPackageValidationReportOptions["qualityGateOverrides"]
) {
  if (!overrides) return gates;
  return gates.map((gate) => {
    const override = overrides[gate.id];
    if (!override) return gate;
    return {
      ...gate,
      ...override
    };
  });
}

function buildQualityGates(
  options: StrategyPackageValidationReportOptions,
  selectedSides: StrategyTraceSide[],
  evidence: Record<StrategyTraceSide, StrategyTraceEvidence>,
  evidenceRefs: string[]
) {
  const selectedEvidence = selectedSides.map((side) => evidence[side]);
  const romProfileIds = uniqueSorted(selectedEvidence.map((item) => item.romProfileId));
  const expectedProgression = Math.max(...selectedEvidence.map((item) => item.progressionWindow.end));
  const sampleCount = selectedEvidence.reduce((sum, item) => sum + item.sampleCount, 0);
  const hasTraceDeaths = selectedEvidence.some((item) => item.death !== null);
  const hasRouteClass = selectedEvidence.every((item) => item.routeClass.trim().length > 0);
  const sideEvidenceMatches = selectedSides.every((side) => evidence[side].side === side);

  const gates = [
    createQualityGate(
      "schema",
      "passed",
      "selected TraceEvidence uses the package evidence schema",
      evidenceRefs
    ),
    createQualityGate(
      "rom",
      romProfileIds.length > 0 && romProfileIds.every(Boolean) ? "passed" : "missing",
      "selected evidence declares ROMProfile compatibility",
      evidenceRefs
    ),
    createQualityGate(
      "entry",
      sampleCount > 0 && options.replay.frameIndex >= 0 ? "passed" : "missing",
      "selected evidence and replay declare an active entry window",
      evidenceRefs
    ),
    createQualityGate(
      "sync",
      options.replay.desynced ? "failed" : "passed",
      options.replay.desynced ? (options.replay.desyncReason ?? "replay desynced") : "replay did not report desync",
      evidenceRefs
    ),
    createQualityGate(
      "safety",
      options.replay.deathCount > 0 || hasTraceDeaths ? "failed" : "passed",
      "replay and selected evidence contain no player death",
      evidenceRefs
    ),
    createQualityGate(
      "progress",
      options.replay.complete && options.replay.maxProgression >= expectedProgression ? "passed" : "failed",
      "replay reached the declared progression target without a stuck-loop stop",
      evidenceRefs
    ),
    createQualityGate(
      "strategy",
      hasRouteClass ? "passed" : "missing",
      "selected evidence declares route class and strategy ownership",
      evidenceRefs
    ),
    createQualityGate(
      "side",
      sideEvidenceMatches ? "passed" : "failed",
      "selected sides match side-owned TraceEvidence",
      evidenceRefs
    ),
    createQualityGate(
      "perturbation",
      "not-applicable",
      "perturbation evidence is not required for candidate package export",
      [],
      false
    ),
    createQualityGate(
      "regression",
      "not-applicable",
      "regression comparison is not required for candidate package export",
      [],
      false
    )
  ];

  return applyQualityGateOverrides(gates, options.qualityGateOverrides);
}

export function createStrategyPackageValidationReport(
  options: StrategyPackageValidationReportOptions
): StrategyPackageValidationReport {
  const selectedSides = selectedSidesForStrategyPackageScope(options.sideScope);
  if (selectedSides.length === 0) {
    throw new Error("at least one package side must be selected");
  }

  const evidence = collectSelectedEvidence(options.evidenceBySide, selectedSides, options.gameProfileId);
  const evidenceRefs = selectedSides.map((side) => evidencePath(evidence[side]));
  const stageIds = uniqueSorted(selectedSides.map((side) => evidence[side].stageId));
  const reportId = [
    "validation",
    slug(options.packId),
    slug(options.packVersion),
    stageIds.map(slug).join("-"),
    options.sideScope,
    options.mode
  ].filter(Boolean).join("-");

  const qualityGates = buildQualityGates(options, selectedSides, evidence, evidenceRefs);
  const replayPassed = options.replay.complete && !options.replay.desynced && options.replay.deathCount === 0;
  const gatesPassed = qualityGates.every((gate) => !gate.required || gateAllowsSave(gate));

  return {
    schema: "fc-ai-strategy-validation-report-v1",
    schemaVersion: "1.0.0",
    reportId,
    createdAt: options.createdAt ?? new Date().toISOString(),
    gameProfileId: options.gameProfileId,
    packId: options.packId,
    packVersion: options.packVersion,
    sideScope: options.sideScope,
    mode: options.mode,
    romProfileIds: uniqueSorted(selectedSides.map((side) => evidence[side].romProfileId)),
    selectedSides,
    evidenceRefs,
    replay: options.replay,
    qualityGates,
    result: replayPassed && gatesPassed ? "passed" : "failed",
    packageStatus: "candidate"
  };
}

function assertTrainingQualityGates(validationReport: StrategyPackageValidationReport) {
  if (!Array.isArray(validationReport.qualityGates) || validationReport.qualityGates.length === 0) {
    throw new Error("validation report missing training quality gates");
  }

  const gatesById = new Map(validationReport.qualityGates.map((gate) => [gate.id, gate]));
  for (const gateId of qualityGateOrder) {
    const gate = gatesById.get(gateId);
    if (!gate) {
      throw new Error(`validation report missing training quality gate ${gateId}`);
    }
    if (gate.required && !gateAllowsSave(gate)) {
      throw new Error(`validation report quality gate ${gateId} ${gate.status}`);
    }
  }
}

function assertValidationReport(
  validationReport: StrategyPackageValidationReport | null,
  options: StrategyPackageEvidenceExportOptions,
  selectedSides: StrategyTraceSide[],
  evidence: Record<StrategyTraceSide, StrategyTraceEvidence>
): asserts validationReport is StrategyPackageValidationReport {
  if (!validationReport) {
    throw new Error("validation report is required before saving a strategy package");
  }
  if (validationReport.schema !== "fc-ai-strategy-validation-report-v1") {
    throw new Error("unsupported validation report schema");
  }
  if (validationReport.gameProfileId !== options.gameProfileId) {
    throw new Error("validation report gameProfileId mismatch");
  }
  if (validationReport.packId !== options.packId || validationReport.packVersion !== options.packVersion) {
    throw new Error("validation report pack identity mismatch");
  }
  if (validationReport.sideScope !== options.sideScope) {
    throw new Error("validation report side scope mismatch");
  }
  for (const side of selectedSides) {
    if (!validationReport.selectedSides.includes(side)) {
      throw new Error(`validation report missing selected side ${side}`);
    }
  }
  if (validationReport.replay.desynced) {
    throw new Error("validation report is desynced");
  }
  if (validationReport.replay.deathCount > 0) {
    throw new Error("validation report contains death");
  }
  if (!validationReport.replay.complete) {
    throw new Error("validation report replay is incomplete");
  }
  assertTrainingQualityGates(validationReport);
  if (validationReport.result !== "passed") {
    throw new Error("validation report did not pass replay gates");
  }

  const reportRomProfileIds = new Set(validationReport.romProfileIds);
  for (const side of selectedSides) {
    if (!reportRomProfileIds.has(evidence[side].romProfileId)) {
      throw new Error("validation report ROMProfile mismatch");
    }
  }

  const reportEvidenceRefs = new Set(validationReport.evidenceRefs);
  for (const side of selectedSides) {
    if (!reportEvidenceRefs.has(evidencePath(evidence[side]))) {
      throw new Error(`validation report missing evidence reference for ${side}`);
    }
  }
}

function selectedEvidenceForProposal(
  proposal: CandidateStrategyFragmentProposal,
  selectedSides: StrategyTraceSide[],
  evidence: Record<StrategyTraceSide, StrategyTraceEvidence>
) {
  const sourceEvidenceId = proposal.fragment.source.traceEvidence.fragmentId;
  const side = selectedSides.find((candidateSide) => evidence[candidateSide].fragmentId === sourceEvidenceId);
  if (!side) {
    throw new Error(`candidate StrategyFragment proposal missing selected TraceEvidence ${sourceEvidenceId}`);
  }
  if (proposal.fragment.status !== "candidate") {
    throw new Error("candidate StrategyFragment proposal must remain candidate");
  }
  if (proposal.fragment.source.tasSideBaseline.tasIsController !== false) {
    throw new Error("candidate StrategyFragment proposal must keep TAS as non-controller evidence");
  }
  return {
    side,
    evidence: evidence[side]
  };
}

export function createStrategyPackageEvidenceExport(
  options: StrategyPackageEvidenceExportOptions
): StrategyPackageEvidenceExport {
  if (!options.validationReplayComplete) {
    throw new Error("validation replay is required before saving a strategy package");
  }

  const selectedSides = selectedSidesForStrategyPackageScope(options.sideScope);
  if (selectedSides.length === 0) {
    throw new Error("at least one package side must be selected");
  }

  const evidence = collectSelectedEvidence(options.evidenceBySide, selectedSides, options.gameProfileId);
  const validationReport = options.validationReport;
  assertValidationReport(validationReport, options, selectedSides, evidence);
  const reportPath = validationReportPath(validationReport, evidence);

  const sideArtifacts = {
    "1p": {
      candidateFragments: [] as string[],
      evidence: [] as string[],
      tasSideBaselines: [] as string[],
      validationReports: [] as string[]
    },
    "2p": {
      candidateFragments: [] as string[],
      evidence: [] as string[],
      tasSideBaselines: [] as string[],
      validationReports: [] as string[]
    }
  };

  const packageFiles: StrategyPackageEvidenceExport["packageFiles"] = [];
  for (const side of selectedSides) {
    const currentEvidence = evidence[side];
    const path = evidencePath(currentEvidence);
    sideArtifacts[sideKey(side)].evidence.push(path);
    sideArtifacts[sideKey(side)].tasSideBaselines.push(...(options.tasSideBaselinePaths ?? []));
    sideArtifacts[sideKey(side)].validationReports.push(reportPath);
    packageFiles.push({
      path,
      content: currentEvidence
    });
  }

  const candidateFragmentFiles: StrategyPackageEvidenceExport["packageFiles"] = [];
  for (const proposal of options.candidateFragmentProposals ?? []) {
    const matched = selectedEvidenceForProposal(proposal, selectedSides, evidence);
    const path = candidateFragmentPath(matched.evidence, proposal);
    sideArtifacts[sideKey(matched.side)].candidateFragments.push(path);
    candidateFragmentFiles.push({
      path,
      content: proposal
    });
  }

  const manifestPatch: StrategyPackageEvidenceExport["manifestPatch"] = {
    packId: options.packId,
    packVersion: options.packVersion,
    gameProfileId: options.gameProfileId,
    sideScope: options.sideScope,
    status: "candidate",
    sideArtifacts: {
      "1p": {
        candidateFragments: uniqueSorted(sideArtifacts["1p"].candidateFragments),
        evidence: sideArtifacts["1p"].evidence,
        tasSideBaselines: uniqueSorted(sideArtifacts["1p"].tasSideBaselines),
        validationReports: uniqueSorted(sideArtifacts["1p"].validationReports)
      },
      "2p": {
        candidateFragments: uniqueSorted(sideArtifacts["2p"].candidateFragments),
        evidence: sideArtifacts["2p"].evidence,
        tasSideBaselines: uniqueSorted(sideArtifacts["2p"].tasSideBaselines),
        validationReports: uniqueSorted(sideArtifacts["2p"].validationReports)
      }
    },
    quality: {
      candidateFragmentCount: candidateFragmentFiles.length,
      evidenceCount: selectedSides.length,
      validatedModes: [validationReport.mode]
    },
    license: {
      romFileNotIncluded: true,
      userMustProvideOwnRom: true
    }
  };

  return {
    schema: "fc-ai-strategy-package-evidence-export-v1",
    schemaVersion: "1.0.0",
    createdAt: options.createdAt ?? new Date().toISOString(),
    displayName: options.displayName,
    packId: options.packId,
    packVersion: options.packVersion,
    gameProfileId: options.gameProfileId,
    selectedSides,
    status: "candidate",
    romProfileIds: uniqueSorted(selectedSides.map((side) => evidence[side].romProfileId)),
    romPolicy: {
      romFileNotIncluded: true,
      userMustProvideOwnRom: true
    },
    validation: {
      replayComplete: true,
      validationStatus: "candidate",
      reportPath,
      report: validationReport
    },
    evidence,
    manifestPatch,
    packageFiles: [
      {
        path: "manifest.side-artifacts.patch.json",
        content: manifestPatch
      },
      {
        path: reportPath,
        content: validationReport
      },
      ...candidateFragmentFiles,
      ...packageFiles
    ]
  };
}
