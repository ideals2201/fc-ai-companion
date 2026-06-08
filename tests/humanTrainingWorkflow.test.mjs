import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

async function importTypeScriptModule(modulePath) {
  const source = fs.readFileSync(modulePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps/browser-cockpit/src/main.tsx"), "utf8");
const tasMoviePath = path.join(repoRoot, "data/tas/contra/contra-j-good/mars608,aiqiyou5-contra-nes-2players.fm2");
const sideBaselinesPath = path.join(repoRoot, "data/training/contra/tas_bases/contra-j-good/side-baselines.json");

const {
  parseFm2Movie,
  summarizeFm2Movie
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/fm2Movie.ts"));
const {
  createSideTrainingTraceEvidence
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/strategyTraceEvidence.ts"));
const {
  createCandidateStrategyFragmentProposal,
  createStrategyFragmentDraftFromProposal
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/strategyFragmentProposal.ts"));
const {
  createStrategyPackageEvidenceExport,
  createStrategyPackageValidationReport
} = await importTypeScriptModule(path.join(repoRoot, "apps/browser-cockpit/src/strategyPackageEvidence.ts"));

function input(overrides = {}) {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
    select: false,
    ...overrides
  };
}

function trainingSample(frame, worldX, p1Input, overrides = {}) {
  return {
    frame,
    gameplayActive: true,
    runtimeStatus: "running",
    routeSegment: "boss-approach-platform-capture",
    routeAction: "advance",
    p1Input,
    p2Input: input(),
    ram: {
      worldX,
      playerX: 128,
      playerY: overrides.playerY ?? 132,
      p2PlayerX: 0,
      p2PlayerY: 0,
      p2WorldX: 0,
      p1State: 1,
      p2State: 0,
      deathFlag: 0,
      p2DeathFlag: 0,
      enemies: overrides.enemies ?? [
        {
          slot: 2,
          type: 7,
          hp: 3,
          x: 188,
          y: 142,
          routine: 4,
          kind: "durable",
          threat: true,
          fixed: true,
          priority: 92
        }
      ]
    }
  };
}

test("human training workflow connects TAS extraction, training evidence, candidate patch, validation, and package export", () => {
  const movie = parseFm2Movie(fs.readFileSync(tasMoviePath, "utf8"));
  const movieSummary = summarizeFm2Movie(movie);
  assert.ok(movie.frames.length > 3600, "TAS movie should contain enough frames for the boss approach baseline");
  assert.equal(movieSummary.hasTwoPlayerInput, true, "the selected TAS should be a two-player source that must be split by side");

  const sideBaselineArtifact = JSON.parse(fs.readFileSync(sideBaselinesPath, "utf8"));
  assert.equal(sideBaselineArtifact.runtimePolicy.tasIsController, false, "TAS side-baseline artifact must not become a live controller");
  const p1BossBaseline = sideBaselineArtifact.baselines.find((baseline) =>
    baseline.side === "1P" && baseline.windowId === "boss-approach-platform-capture"
  );
  assert.ok(p1BossBaseline, "1P boss approach TAS side baseline should be available for training");
  assert.equal(p1BossBaseline.promotionTarget.romProfileId, "contra-j-good");
  assert.ok(p1BossBaseline.acceptanceChecks.includes("real-runtime-trace-required"));
  assert.ok(p1BossBaseline.acceptanceChecks.includes("safety-override-required"));

  const evidence = createSideTrainingTraceEvidence([
    trainingSample(2500, 2500, input({ right: true, b: true })),
    trainingSample(2760, 2760, input({ right: true, a: true, b: true }), { playerY: 118 }),
    trainingSample(2960, 2960, input({ right: true, b: true }))
  ], {
    baselineId: `tas-contra-j-good-${p1BossBaseline.movieId}-${p1BossBaseline.windowId}-1p`,
    baselineSourceKind: "tas-side-baseline",
    gameProfileId: "contra",
    progressionWindow: {
      metric: "progression.primary",
      start: 2500,
      end: 2960,
      unit: "ProgressionUnits"
    },
    romProfileId: "contra-j-good",
    side: "1P",
    stageId: "stage-1",
    strategyKey: "survival-v0",
    trainingMethod: "auto-patch"
  });
  assert.equal(evidence.branchOutcome, "window-complete");
  assert.deepEqual(evidence.source, {
    baselineId: `tas-contra-j-good-${p1BossBaseline.movieId}-${p1BossBaseline.windowId}-1p`,
    baselineSourceKind: "tas-side-baseline",
    trainingMethod: "auto-patch",
    tasIsController: false
  });

  const proposal = createCandidateStrategyFragmentProposal({
    evidence,
    tasSideBaseline: p1BossBaseline,
    tasSideBaselinePath: "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  });
  assert.equal(proposal.fragment.status, "candidate");
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.ok(proposal.fragment.safetyOverrides.includes("safety-override-required"));
  assert.ok(proposal.fragment.safetyOverrides.includes("tas-desync-guard"));

  const draft = createStrategyFragmentDraftFromProposal({
    createdAt: "2026-06-08T12:00:00.000Z",
    proposal,
    sourceProposalPath: "stages/stage-1/candidate-fragments/candidate-fragment-1p-survival-v0-boss-approach-platform-capture.json"
  });
  assert.equal(draft.status, "candidate-unvalidated");
  assert.equal(draft.runtimeUse, "training-fragment-draft");
  assert.equal(draft.sourceProposal.tasIsController, false);
  assert.equal(draft.validation.status, "missing");

  const validationReport = createStrategyPackageValidationReport({
    createdAt: "2026-06-08T12:10:00.000Z",
    evidenceBySide: {
      "1P": evidence,
      "2P": null
    },
    gameProfileId: "contra",
    mode: "single-ai",
    packId: "contra-stage1-strategy-v0",
    packVersion: "0.1.0",
    replay: {
      complete: true,
      desynced: false,
      deathCount: 0,
      finalStatus: "window-complete",
      frameIndex: 2960,
      maxProgression: 2960
    },
    sideScope: "1p-only"
  });
  assert.equal(validationReport.result, "passed");
  assert.deepEqual(validationReport.selectedSides, ["1P"]);

  const exportPayload = createStrategyPackageEvidenceExport({
    candidateFragmentProposals: [proposal],
    createdAt: "2026-06-08T12:15:00.000Z",
    displayName: "Contra Stage 1 human workflow export",
    evidenceBySide: {
      "1P": evidence,
      "2P": null
    },
    gameProfileId: "contra",
    packId: "contra-stage1-strategy-v0",
    packVersion: "0.1.0",
    sideScope: "1p-only",
    tasSideBaselinePaths: ["data/training/contra/tas_bases/contra-j-good/side-baselines.json"],
    validationReport,
    validationReplayComplete: true
  });
  assert.equal(exportPayload.romPolicy.romFileNotIncluded, true);
  assert.equal(exportPayload.manifestPatch.quality.evidenceCount, 1);
  assert.equal(exportPayload.manifestPatch.quality.candidateFragmentCount, 1);
  assert.deepEqual(exportPayload.manifestPatch.quality.validatedModes, ["single-ai"]);
  assert.ok(exportPayload.packageFiles.some((file) => file.path.endsWith("/trace-evidence/candidate-1p-survival-v0-tas-contra-j-good-contra-j-2p-any-percent-boss-approach-platform-capture-1p.json")));
  assert.ok(exportPayload.packageFiles.some((file) => file.path.includes("/candidate-fragments/candidate-fragment-1p-survival-v0-tas-contra-j-good-contra-j-2p-any-percent-boss-approach-platform-capture-1p.json")));
});

test("side training panel gives each training method a distinct human workflow", () => {
  const panelMatch = mainSource.match(/function SideTrainingPanel[\s\S]*?function PilotPanel/);
  assert.ok(panelMatch, "SideTrainingPanel should exist");
  const panelSource = panelMatch[0];

  assert.match(panelSource, /training\.selectedTrainingMethod === "human-assist"[\s\S]*开始混合采集/, "human assist should expose capture controls for human intervention traces");
  assert.match(panelSource, /training\.selectedTrainingMethod === "manual-edit"[\s\S]*onSideTrainingModifyStrategy/, "manual edit should open the strategy designer instead of starting a bot run");
  assert.match(panelSource, /training\.selectedTrainingMethod === "model-analysis"[\s\S]*onSideTraceExport[\s\S]*打包数据/, "model analysis should package captured data for analysis");
  assert.match(panelSource, /actions\.onSideTrainingRunToggle\(training\.side\)/, "auto patch should be the branch that starts or stops synchronized run capture");
  assert.match(mainSource, /if \(method === "human-assist"\) return "hybrid"/, "human assist should switch runtime input ownership to hybrid");
  assert.match(mainSource, /if \(baselineId === "human-demo-new"\) return "human"/, "human demonstration baseline should switch runtime input ownership to human");
  assert.match(mainSource, /if \(baselineId === "ai-run-new"\) return "ai"/, "AI run baseline should switch runtime input ownership to AI");
});
