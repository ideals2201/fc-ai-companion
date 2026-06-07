import type { StrategyTraceEvidence, StrategyTraceSide } from "./strategyTraceEvidence";

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
  packageStatus: "candidate";
};

export type StrategyPackageValidationReportOptions = {
  createdAt?: string;
  evidenceBySide: Record<StrategyTraceSide, StrategyTraceEvidence | null>;
  gameProfileId: string;
  mode: StrategyPackageValidationMode;
  packId: string;
  packVersion: string;
  replay: StrategyPackageValidationReplay;
  sideScope: StrategyPackageSideScope;
};

export type StrategyPackageEvidenceExportOptions = {
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
      evidence: string[];
      tasSideBaselines: string[];
      validationReports: string[];
    }>;
    quality: {
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
    result: options.replay.complete && !options.replay.desynced && options.replay.deathCount === 0 ? "passed" : "failed",
    romProfileIds: uniqueSorted(selectedSides.map((side) => evidence[side].romProfileId)),
    selectedSides,
    evidenceRefs,
    replay: options.replay,
    packageStatus: "candidate"
  };
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
      evidence: [] as string[],
      tasSideBaselines: [] as string[],
      validationReports: [] as string[]
    },
    "2p": {
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

  const manifestPatch: StrategyPackageEvidenceExport["manifestPatch"] = {
    packId: options.packId,
    packVersion: options.packVersion,
    gameProfileId: options.gameProfileId,
    sideScope: options.sideScope,
    status: "candidate",
    sideArtifacts: {
      "1p": {
        evidence: sideArtifacts["1p"].evidence,
        tasSideBaselines: uniqueSorted(sideArtifacts["1p"].tasSideBaselines),
        validationReports: uniqueSorted(sideArtifacts["1p"].validationReports)
      },
      "2p": {
        evidence: sideArtifacts["2p"].evidence,
        tasSideBaselines: uniqueSorted(sideArtifacts["2p"].tasSideBaselines),
        validationReports: uniqueSorted(sideArtifacts["2p"].validationReports)
      }
    },
    quality: {
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
      ...packageFiles
    ]
  };
}
