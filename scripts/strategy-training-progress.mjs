import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultFrameRate = 60;

function progressPathForStage(stageId = "stage-1") {
  return path.join(repoRoot, "strategy-packs", "contra", "stages", stageId, "training-progress.json");
}

const defaultProgressPath = progressPathForStage("stage-1");

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function formatSecondsForProgress(seconds) {
  return round2(Number.isFinite(seconds) ? seconds : 0);
}

function metric(value, status = "candidate", extra = {}) {
  return { value, status, ...extra };
}

function sumOptionalRunMetric(runs, key) {
  if (runs.length === 0) return metric(null, "unverified");
  const values = runs.map((run) => run[key]);
  if (!values.every((value) => Number.isFinite(value))) return metric(null, "unverified");
  return metric(values.reduce((total, value) => total + value, 0));
}

function minOptionalRunMetric(runs, key) {
  if (runs.length === 0) return metric(null, "unverified");
  const values = runs.map((run) => run[key]).filter((value) => Number.isFinite(value));
  if (values.length === 0) return metric(null, "unverified");
  return metric(Math.min(...values));
}

function maxWorldXFromReport(report) {
  if (Number.isFinite(report?.maxNoDeathProgressSnapshot?.worldX)) {
    return report.maxNoDeathProgressSnapshot.worldX;
  }
  const candidates = [
    report?.maxProgressSnapshot?.worldX,
    report?.lastActiveSnapshot?.worldX,
    report?.finalSnapshot?.worldX
  ].filter((value) => Number.isFinite(value));
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

export function inferRuntimeReportDeaths(report) {
  const deathFlags = [
    report?.lostActiveSnapshot?.deathFlag,
    report?.preLostActiveSnapshot?.deathFlag,
    report?.finalSnapshot?.deathFlag,
    report?.maxProgressSnapshot?.deathFlag
  ].filter((value) => Number.isFinite(value));
  if (deathFlags.some((value) => value > 0)) return 1;
  if (report?.status === "active" || report?.status === "stalled-active" || report?.status === "recovered-after-loss") return 0;
  return null;
}

function runStatusFromReport(report, deaths = inferRuntimeReportDeaths(report)) {
  if (report?.status === "recovered-after-loss" && deaths > 0) return "candidate-failed";
  if (report?.status === "active" || report?.status === "recovered-after-loss") return "candidate";
  if (report?.status === "stalled-active") return "candidate-stalled";
  if (report?.status === "lost-active") return "candidate-failed";
  return report?.status ?? "candidate";
}

function defaultTargetWorldX(progress, strategyKey, fallbackTarget) {
  const summaryTarget = progress?.progressByStrategy?.[strategyKey]?.summary?.clearProgress?.targetWorldX;
  return Number.isFinite(summaryTarget) ? summaryTarget : fallbackTarget;
}

function createRunFromRuntimeReport(report, options = {}) {
  const strategyKey = options.strategyKey ?? report?.strategyKey ?? "survival-v0";
  const stageId = options.stageId ?? "stage-1";
  const frameRate = options.frameRate ?? defaultFrameRate;
  const frames = Number.isFinite(report?.frameCount) ? report.frameCount : Number.isFinite(report?.maxFrames) ? report.maxFrames : 0;
  const maxWorldX = maxWorldXFromReport(report);
  const targetWorldX = options.targetWorldX ?? 2960;
  const runId = options.runId
    ?? `${strategyKey}-${options.side ?? "1P"}-${new Date(options.now ?? Date.now()).toISOString().replace(/[:.]/g, "-")}`;
  const deaths = inferRuntimeReportDeaths(report);
  return {
    runId,
    stageId,
    strategyKey,
    side: options.side ?? "1P",
    source: report?.source?.kind ?? "headless-runtime-smoke",
    startedAt: options.now ?? new Date().toISOString(),
    runCount: 1,
    frames,
    durationSeconds: formatSecondsForProgress(frames / frameRate),
    activeFrame: Number.isFinite(report?.activeFrame) ? report.activeFrame : null,
    lostActiveFrame: Number.isFinite(report?.lostActiveFrame) ? report.lostActiveFrame : null,
    maxWorldX,
    maxWorldFrame: Number.isFinite(report?.maxNoDeathProgressSnapshot?.frame)
      ? report.maxNoDeathProgressSnapshot.frame
      : Number.isFinite(report?.maxProgressSnapshot?.frame) ? report.maxProgressSnapshot.frame : null,
    finalWorldX: Number.isFinite(report?.finalSnapshot?.worldX) ? report.finalSnapshot.worldX : null,
    finalFrame: Number.isFinite(report?.finalSnapshot?.frame) ? report.finalSnapshot.frame : null,
    targetWorldX,
    deaths,
    status: runStatusFromReport(report, deaths),
    reason: report?.reason ?? null,
    rom: report?.rom ?? null,
    candidateTrial: report?.candidateTrial ?? null,
    candidateConfig: report?.candidateConfig ?? null,
    notes: options.notes ?? "Recorded from headless runtime smoke report."
  };
}

export function summarizeTrainingProgress(runs, strategyKey, fallbackTargetWorldX = 2960) {
  const strategyRuns = runs.filter((run) => run.strategyKey === strategyKey);
  if (strategyRuns.length === 0) {
    return {
      trainingRuns: metric(null, "unverified"),
      deaths: metric(null, "unverified"),
      trainingTimeSeconds: metric(null, "unverified"),
      clearProgress: metric(null, "unverified")
    };
  }
  const trainingRuns = strategyRuns.reduce((total, run) => total + (Number.isFinite(run.runCount) ? run.runCount : 1), 0);
  const knownDeathRuns = strategyRuns.filter((run) => Number.isFinite(run.deaths));
  const deaths = knownDeathRuns.length === strategyRuns.length
    ? knownDeathRuns.reduce((total, run) => total + run.deaths, 0)
    : null;
  const trainingTimeSeconds = formatSecondsForProgress(strategyRuns.reduce((total, run) => (
    total + (Number.isFinite(run.durationSeconds) ? run.durationSeconds : 0)
  ), 0));
  const targetWorldX = strategyRuns.reduce((target, run) => (
    Number.isFinite(run.targetWorldX) ? Math.max(target, run.targetWorldX) : target
  ), fallbackTargetWorldX);
  const maxWorldX = strategyRuns.reduce((max, run) => (
    Number.isFinite(run.maxWorldX) ? Math.max(max, run.maxWorldX) : max
  ), 0);
  return {
    trainingRuns: metric(trainingRuns),
    deaths: deaths === null ? metric(null, "unverified") : metric(deaths),
    trainingTimeSeconds: metric(trainingTimeSeconds),
    clearProgress: metric(`W${maxWorldX} / W${targetWorldX}`, "candidate", { maxWorldX, targetWorldX }),
    kills: sumOptionalRunMetric(strategyRuns, "kills"),
    fixedTargetsDestroyed: sumOptionalRunMetric(strategyRuns, "fixedTargetsDestroyed"),
    rewardsCollected: sumOptionalRunMetric(strategyRuns, "rewardsCollected"),
    clearTimeFrames: minOptionalRunMetric(strategyRuns, "clearTimeFrames"),
    clearTimeSeconds: minOptionalRunMetric(strategyRuns, "clearTimeSeconds"),
    maxProgress: metric(maxWorldX, "candidate")
  };
}

export function buildStageSummary(progress, stageId = "stage-1", fallbackTargetWorldX = 2960) {
  const runs = Array.isArray(progress.runs) ? progress.runs : [];
  const historicalEstimate = progress.stageSummary?.[stageId]?.historicalEstimate ?? null;
  if (runs.length === 0) {
    return {
      status: progress.status ?? "unstarted",
      dataMode: historicalEstimate ? "migration-with-estimate" : "measured-ledger-only",
      summary: {
        trainingRuns: metric(null, "unverified"),
        knownDeaths: metric(null, "unverified"),
        unknownDeathRuns: metric(null, "unverified"),
        recordedRunTimeSeconds: metric(null, "unverified"),
        clearProgress: metric(null, "unverified"),
        clearTimeSeconds: metric(null, "unverified"),
        clearTimeFrames: metric(null, "unverified"),
        kills: metric(null, "unverified"),
        fixedTargetsDestroyed: metric(null, "unverified"),
        rewardsCollected: metric(null, "unverified"),
        maxProgress: metric(null, "unverified")
      },
      historicalEstimate
    };
  }
  const trainingRuns = runs.reduce((total, run) => total + (Number.isFinite(run.runCount) ? run.runCount : 1), 0);
  const knownDeathRuns = runs.filter((run) => Number.isFinite(run.deaths));
  const knownDeaths = knownDeathRuns.reduce((total, run) => total + run.deaths, 0);
  const unknownDeathRuns = runs
    .filter((run) => !Number.isFinite(run.deaths))
    .reduce((total, run) => total + (Number.isFinite(run.runCount) ? run.runCount : 1), 0);
  const recordedRunTimeSeconds = formatSecondsForProgress(runs.reduce((total, run) => (
    total + (Number.isFinite(run.durationSeconds) ? run.durationSeconds : 0)
  ), 0));
  const targetWorldX = runs.reduce((target, run) => (
    Number.isFinite(run.targetWorldX) ? Math.max(target, run.targetWorldX) : target
  ), fallbackTargetWorldX);
  const maxWorldX = runs.reduce((max, run) => (
    Number.isFinite(run.maxWorldX) ? Math.max(max, run.maxWorldX) : max
  ), 0);
  return {
    status: maxWorldX >= targetWorldX && unknownDeathRuns === 0 && knownDeaths === 0 ? "candidate-clear" : "candidate",
    dataMode: historicalEstimate ? "migration-with-estimate" : "measured-ledger-only",
    summary: {
      trainingRuns: metric(trainingRuns),
      knownDeaths: metric(knownDeaths),
      unknownDeathRuns: metric(unknownDeathRuns, unknownDeathRuns > 0 ? "unverified" : "candidate"),
      recordedRunTimeSeconds: metric(recordedRunTimeSeconds),
      clearProgress: metric(`W${maxWorldX} / W${targetWorldX}`, "candidate", { maxWorldX, targetWorldX }),
      clearTimeSeconds: metric(null, "unverified"),
      clearTimeFrames: metric(null, "unverified"),
      kills: sumOptionalRunMetric(runs, "kills"),
      fixedTargetsDestroyed: sumOptionalRunMetric(runs, "fixedTargetsDestroyed"),
      rewardsCollected: sumOptionalRunMetric(runs, "rewardsCollected"),
      maxProgress: metric(maxWorldX, "candidate")
    },
    historicalEstimate
  };
}

export function appendRuntimeTrainingReport(progress, report, options = {}) {
  const strategyKey = options.strategyKey ?? report?.strategyKey ?? "survival-v0";
  const stageId = options.stageId ?? progress?.stageId ?? "stage-1";
  const targetWorldX = options.targetWorldX ?? defaultTargetWorldX(progress, strategyKey, 2960);
  const run = createRunFromRuntimeReport(report, { ...options, stageId, strategyKey, targetWorldX });
  const next = structuredClone(progress);
  next.updatedAt = options.now ?? new Date().toISOString();
  next.stageId = stageId;
  next.runs = [...(Array.isArray(next.runs) ? next.runs : []), run];
  next.progressByStrategy = next.progressByStrategy ?? {};
  const summary = summarizeTrainingProgress(next.runs, strategyKey, targetWorldX);
  next.progressByStrategy[strategyKey] = {
    ...(next.progressByStrategy[strategyKey] ?? {}),
    status: "candidate",
    summary,
    evidence: `Updated from ${run.source} run ${run.runId}; latest status ${run.status}.`
  };
  next.stageSummary = {
    ...(next.stageSummary ?? {}),
    [stageId]: buildStageSummary(next, stageId, targetWorldX)
  };
  return next;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    headlessArgs: [],
    notes: "",
    progressPath: defaultProgressPath,
    reportPath: "",
    runId: "",
    side: "1P",
    stageId: "stage-1",
    strategyKey: "",
    targetWorldX: 2960
  };
  let progressPathExplicit = false;
  const separatorIndex = argv.indexOf("--");
  const directArgs = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv;
  options.headlessArgs = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : [];
  for (const arg of directArgs) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg.startsWith("--progress=")) {
      options.progressPath = path.resolve(repoRoot, arg.slice("--progress=".length));
      progressPathExplicit = true;
    }
    else if (arg.startsWith("--report=")) options.reportPath = path.resolve(repoRoot, arg.slice("--report=".length));
    else if (arg.startsWith("--run-id=")) options.runId = arg.slice("--run-id=".length);
    else if (arg.startsWith("--side=")) options.side = arg.slice("--side=".length) === "2P" ? "2P" : "1P";
    else if (arg.startsWith("--stage=")) options.stageId = arg.slice("--stage=".length);
    else if (arg.startsWith("--strategy=")) options.strategyKey = arg.slice("--strategy=".length);
    else if (arg.startsWith("--target-worldx=")) {
      const value = Number.parseInt(arg.slice("--target-worldx=".length), 10);
      if (Number.isFinite(value)) options.targetWorldX = value;
    }
    else if (arg.startsWith("--notes=")) options.notes = arg.slice("--notes=".length);
  }
  if (!progressPathExplicit) options.progressPath = progressPathForStage(options.stageId);
  return options;
}

function readRuntimeReport(options) {
  if (options.reportPath) return readJsonFile(options.reportPath);
  const runtimeScript = path.join(repoRoot, "scripts", "headless-runtime-smoke.mjs");
  const child = spawnSync(process.execPath, [runtimeScript, ...options.headlessArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  if (child.error) throw child.error;
  if (child.status !== 0) {
    throw new Error(`headless runtime failed: ${child.stderr || child.stdout}`);
  }
  return JSON.parse(child.stdout);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const progress = readJsonFile(options.progressPath);
  const report = readRuntimeReport(options);
  const updated = appendRuntimeTrainingReport(progress, report, {
    notes: options.notes || undefined,
    runId: options.runId || undefined,
    side: options.side,
    stageId: options.stageId,
    strategyKey: options.strategyKey || report.strategyKey,
    targetWorldX: options.targetWorldX
  });
  if (!options.dryRun) {
    fs.writeFileSync(options.progressPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }
  const strategyKey = options.strategyKey || report.strategyKey || "survival-v0";
  const summary = updated.progressByStrategy?.[strategyKey]?.summary ?? null;
  console.log(JSON.stringify({
    status: options.dryRun ? "dry-run" : "recorded",
    progressPath: path.relative(repoRoot, options.progressPath).replace(/\\/g, "/"),
    strategyKey,
    latestRun: updated.runs.at(-1),
    summary
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
