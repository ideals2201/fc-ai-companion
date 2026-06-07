import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

const {
  createStrategyPackageEvidenceExport,
  createStrategyPackageValidationReport
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyPackageEvidence.ts", import.meta.url));

function evidence(side, overrides = {}) {
  const sideId = side.toLowerCase();
  const strategyKey = side === "1P" ? "survival-v0" : "guard-v0";
  return {
    schema: "fc-ai-strategy-trace-evidence-v1",
    branchOutcome: "window-complete",
    death: null,
    endWorldX: side === "1P" ? 1280 : 1420,
    fragmentId: `candidate-${sideId}-${strategyKey}-human-demo-new`,
    gameProfileId: "contra",
    inputSummary: { "right+B": 16 },
    maxWorldX: side === "1P" ? 1280 : 1420,
    progressionWindow: {
      metric: "progression.primary",
      start: side === "1P" ? 980 : 1100,
      end: side === "1P" ? 1280 : 1420,
      unit: "ProgressionUnits"
    },
    romProfileId: "contra-j-good",
    routeClass: `training:${strategyKey}:human-demo-new`,
    sampleCount: 16,
    side,
    stageId: "stage-1",
    startWorldX: side === "1P" ? 980 : 1100,
    topEnemies: [],
    ...overrides
  };
}

function validationReport(overrides = {}) {
  return {
    schema: "fc-ai-strategy-validation-report-v1",
    schemaVersion: "1.0.0",
    reportId: "validation-contra-stage1-1p-2p-tas-baseline",
    createdAt: "2026-06-08T08:30:00.000Z",
    gameProfileId: "contra",
    packId: "contra-stage1-strategy-v0",
    packVersion: "0.1.0",
    sideScope: "1p-2p",
    mode: "tas-baseline-replay",
    result: "passed",
    romProfileIds: ["contra-j-good"],
    selectedSides: ["1P", "2P"],
    evidenceRefs: [
      "stages/stage-1/trace-evidence/candidate-1p-survival-v0-human-demo-new.json",
      "stages/stage-1/trace-evidence/candidate-2p-guard-v0-human-demo-new.json"
    ],
    replay: {
      complete: true,
      desynced: false,
      deathCount: 0,
      finalStatus: "finished",
      frameIndex: 4500,
      maxProgression: 1420
    },
    packageStatus: "candidate",
    ...overrides
  };
}

test("builds a strategy-package evidence export from side training trace evidence", () => {
  const exportPayload = createStrategyPackageEvidenceExport({
    createdAt: "2026-06-08T08:00:00.000Z",
    displayName: "Contra side training export",
    evidenceBySide: {
      "1P": evidence("1P"),
      "2P": evidence("2P")
    },
    gameProfileId: "contra",
    packId: "contra-stage1-strategy-v0",
    packVersion: "0.1.0",
    sideScope: "1p-2p",
    tasSideBaselinePaths: [
      "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
    ],
    validationReport: validationReport(),
    validationReplayComplete: true
  });

  assert.equal(exportPayload.schema, "fc-ai-strategy-package-evidence-export-v1");
  assert.equal(exportPayload.schemaVersion, "1.0.0");
  assert.equal(exportPayload.status, "candidate");
  assert.equal(exportPayload.romPolicy.romFileNotIncluded, true);
  assert.equal(exportPayload.romPolicy.userMustProvideOwnRom, true);
  assert.deepEqual(exportPayload.selectedSides, ["1P", "2P"]);
  assert.deepEqual(exportPayload.romProfileIds, ["contra-j-good"]);
  assert.equal(exportPayload.validation.replayComplete, true);
  assert.equal(exportPayload.validation.validationStatus, "candidate");
  assert.equal(exportPayload.validation.reportPath, "stages/stage-1/validation-reports/validation-contra-stage1-1p-2p-tas-baseline.json");
  assert.deepEqual(exportPayload.validation.report.replay, {
    complete: true,
    desynced: false,
    deathCount: 0,
    finalStatus: "finished",
    frameIndex: 4500,
    maxProgression: 1420
  });

  const p1EvidencePath = "stages/stage-1/trace-evidence/candidate-1p-survival-v0-human-demo-new.json";
  const p2EvidencePath = "stages/stage-1/trace-evidence/candidate-2p-guard-v0-human-demo-new.json";
  assert.deepEqual(exportPayload.manifestPatch.sideArtifacts["1p"].evidence, [p1EvidencePath]);
  assert.deepEqual(exportPayload.manifestPatch.sideArtifacts["2p"].evidence, [p2EvidencePath]);
  assert.deepEqual(exportPayload.manifestPatch.sideArtifacts["1p"].validationReports, [
    "stages/stage-1/validation-reports/validation-contra-stage1-1p-2p-tas-baseline.json"
  ]);
  assert.deepEqual(exportPayload.manifestPatch.sideArtifacts["2p"].validationReports, [
    "stages/stage-1/validation-reports/validation-contra-stage1-1p-2p-tas-baseline.json"
  ]);
  assert.deepEqual(exportPayload.manifestPatch.sideArtifacts["1p"].tasSideBaselines, [
    "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  ]);
  assert.deepEqual(exportPayload.manifestPatch.sideArtifacts["2p"].tasSideBaselines, [
    "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  ]);
  assert.equal(exportPayload.manifestPatch.status, "candidate");
  assert.equal(exportPayload.manifestPatch.quality.evidenceCount, 2);
  assert.deepEqual(exportPayload.manifestPatch.quality.validatedModes, ["tas-baseline-replay"]);

  assert.equal(exportPayload.packageFiles.length, 4);
  assert.equal(exportPayload.packageFiles[0].path, "manifest.side-artifacts.patch.json");
  assert.equal(exportPayload.packageFiles[1].path, "stages/stage-1/validation-reports/validation-contra-stage1-1p-2p-tas-baseline.json");
  assert.equal(exportPayload.packageFiles[2].path, p1EvidencePath);
  assert.equal(exportPayload.packageFiles[3].path, p2EvidencePath);
  assert.deepEqual(exportPayload.packageFiles[1].content, exportPayload.validation.report);
  assert.deepEqual(exportPayload.packageFiles[2].content, exportPayload.evidence["1P"]);
  assert.deepEqual(exportPayload.packageFiles[3].content, exportPayload.evidence["2P"]);
});

test("creates a schema-bound validation report from completed replay evidence", () => {
  const report = createStrategyPackageValidationReport({
    createdAt: "2026-06-08T08:30:00.000Z",
    evidenceBySide: {
      "1P": evidence("1P"),
      "2P": evidence("2P")
    },
    gameProfileId: "contra",
    mode: "tas-baseline-replay",
    packId: "contra-stage1-strategy-v0",
    packVersion: "0.1.0",
    replay: {
      complete: true,
      desynced: false,
      deathCount: 0,
      finalStatus: "finished",
      frameIndex: 4500,
      maxProgression: 1420
    },
    sideScope: "1p-2p"
  });

  assert.equal(report.schema, "fc-ai-strategy-validation-report-v1");
  assert.equal(report.reportId, "validation-contra-stage1-strategy-v0-0-1-0-stage-1-1p-2p-tas-baseline-replay");
  assert.equal(report.result, "passed");
  assert.deepEqual(report.selectedSides, ["1P", "2P"]);
  assert.deepEqual(report.romProfileIds, ["contra-j-good"]);
  assert.deepEqual(report.evidenceRefs, [
    "stages/stage-1/trace-evidence/candidate-1p-survival-v0-human-demo-new.json",
    "stages/stage-1/trace-evidence/candidate-2p-guard-v0-human-demo-new.json"
  ]);
  assert.equal(report.packageStatus, "candidate");
});

test("requires archived evidence for every selected package side", () => {
  assert.throws(
    () => createStrategyPackageEvidenceExport({
      displayName: "Contra side training export",
      evidenceBySide: {
        "1P": evidence("1P"),
        "2P": null
      },
      gameProfileId: "contra",
      packId: "contra-stage1-strategy-v0",
      packVersion: "0.1.0",
      sideScope: "1p-2p",
      validationReport: validationReport(),
      validationReplayComplete: true
    }),
    /missing archived TraceEvidence for 2P/
  );
});

test("keeps package saving behind validation replay", () => {
  assert.throws(
    () => createStrategyPackageEvidenceExport({
      displayName: "Contra side training export",
      evidenceBySide: {
        "1P": evidence("1P"),
        "2P": evidence("2P")
      },
      gameProfileId: "contra",
      packId: "contra-stage1-strategy-v0",
      packVersion: "0.1.0",
      sideScope: "1p-only",
      validationReport: validationReport({
        sideScope: "1p-only",
        selectedSides: ["1P"],
        evidenceRefs: ["stages/stage-1/trace-evidence/candidate-1p-survival-v0-human-demo-new.json"]
      }),
      validationReplayComplete: false
    }),
    /validation replay is required/
  );
});

test("rejects validation reports that contain death or desync failures", () => {
  const baseOptions = {
    displayName: "Contra side training export",
    evidenceBySide: {
      "1P": evidence("1P"),
      "2P": evidence("2P")
    },
    gameProfileId: "contra",
    packId: "contra-stage1-strategy-v0",
    packVersion: "0.1.0",
    sideScope: "1p-2p",
    validationReplayComplete: true
  };

  assert.throws(
    () => createStrategyPackageEvidenceExport({
      ...baseOptions,
      validationReport: validationReport({
        result: "failed",
        replay: {
          complete: true,
          desynced: false,
          deathCount: 1,
          finalStatus: "death",
          frameIndex: 2100,
          maxProgression: 676
        }
      })
    }),
    /validation report contains death/
  );

  assert.throws(
    () => createStrategyPackageEvidenceExport({
      ...baseOptions,
      validationReport: validationReport({
        result: "failed",
        replay: {
          complete: false,
          desynced: true,
          desyncReason: "player-death",
          deathCount: 0,
          finalStatus: "desynced",
          frameIndex: 2122,
          maxProgression: 676
        }
      })
    }),
    /validation report is desynced/
  );
});

test("requires validation report ROMProfile compatibility with selected evidence", () => {
  assert.throws(
    () => createStrategyPackageEvidenceExport({
      displayName: "Contra side training export",
      evidenceBySide: {
        "1P": evidence("1P", { romProfileId: "contra-us-good" }),
        "2P": evidence("2P")
      },
      gameProfileId: "contra",
      packId: "contra-stage1-strategy-v0",
      packVersion: "0.1.0",
      sideScope: "1p-2p",
      validationReport: validationReport(),
      validationReplayComplete: true
    }),
    /validation report ROMProfile mismatch/
  );
});
