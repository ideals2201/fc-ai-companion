import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeScript = path.join(repoRoot, "scripts", "headless-runtime-smoke.mjs");
const defaultCandidates = [
  { candidateConfigPath: "", candidateTrial: "w1765-reentry-right-fire-carry" },
  { candidateConfigPath: "", candidateTrial: "w1769-reentry-right-carry-extension" },
  { candidateConfigPath: "", candidateTrial: "w1686-left-edge-duck-hold-guard" },
  { candidateConfigPath: "", candidateTrial: "w1721-airborne-upper-preclear-right-fire" }
];

function parseArgs(argv) {
  const options = {
    candidates: [],
    dryRun: false,
    frames: 14000,
    out: "",
    strategy: "survival-v0"
  };

  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg.startsWith("--candidate=")) {
      const values = arg.slice("--candidate=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      options.candidates.push(...values.map((candidateTrial) => ({
        candidateConfigPath: "",
        candidateTrial
      })));
    } else if (arg.startsWith("--candidate-config=")) {
      const values = arg.slice("--candidate-config=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      options.candidates.push(...values.map((candidateConfigPath) => ({
        candidateConfigPath: candidateConfigPath.replaceAll("\\", "/"),
        candidateTrial: readCandidateConfigId(candidateConfigPath)
      })));
    } else if (arg.startsWith("--frames=")) {
      const value = Number.parseInt(arg.slice("--frames=".length), 10);
      if (Number.isFinite(value) && value > 0) options.frames = Math.min(value, 20000);
    } else if (arg.startsWith("--strategy=")) {
      options.strategy = arg.slice("--strategy=".length).trim() || options.strategy;
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length).trim();
    }
  }

  if (options.candidates.length === 0) {
    options.candidates = [...defaultCandidates];
  }

  return options;
}

function readCandidateConfigId(configPath) {
  const absolutePath = path.resolve(repoRoot, configPath);
  const config = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  if (!config || typeof config.id !== "string" || !config.id.trim()) {
    throw new Error(`Candidate config must include id: ${configPath}`);
  }
  return config.id.trim();
}

function buildRuntimeArgs(options, candidate) {
  const args = [
    runtimeScript,
    `--frames=${options.frames}`,
    `--strategy=${options.strategy}`,
    "--probe=route-plan"
  ];
  if (candidate.candidateConfigPath) {
    args.push(`--candidate-config=${candidate.candidateConfigPath}`);
  }
  args.push(`--candidate-trial=${candidate.candidateTrial}`);
  return args;
}

function commandPreview(args) {
  return ["node", ...args.map((arg) => path.relative(repoRoot, arg).startsWith("..") ? arg : path.relative(repoRoot, arg).replaceAll(path.sep, "/"))]
    .join(" ");
}

function transpileLocalTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(repoRoot, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const outputText = transpiled.outputText.replace(/from "\.\/([^"]+)"/g, (_match, specifier) => {
    const dependencyPath = path.join(path.dirname(relativePath), `${specifier}.ts`).replaceAll(path.sep, "/");
    return `from "${transpileLocalTypeScriptModule(dependencyPath)}"`;
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

async function importTypeScriptModule(relativePath) {
  return import(transpileLocalTypeScriptModule(relativePath));
}

function runCandidate(options, candidate) {
  const args = buildRuntimeArgs(options, candidate);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16
  });

  if (result.error) {
    return {
      candidateConfigPath: candidate.candidateConfigPath,
      candidateTrial: candidate.candidateTrial,
      report: {
        status: "error",
        reason: result.error.message,
        frameCount: options.frames
      },
      stderr: result.stderr
    };
  }

  try {
    return {
      candidateConfigPath: candidate.candidateConfigPath,
      candidateTrial: candidate.candidateTrial,
      report: JSON.parse(result.stdout),
      stderr: result.stderr
    };
  } catch (error) {
    return {
      candidateConfigPath: candidate.candidateConfigPath,
      candidateTrial: candidate.candidateTrial,
      report: {
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
        frameCount: options.frames
      },
      stderr: result.stderr,
      stdout: result.stdout
    };
  }
}

function dryRunReport(options) {
  return {
    schema: "fc-ai-contra-segment-candidate-search-run-v1",
    dryRun: true,
    frames: options.frames,
    strategy: options.strategy,
    candidates: options.candidates.map((candidate) => {
      const args = buildRuntimeArgs(options, candidate);
      return {
        candidateConfigPath: candidate.candidateConfigPath || null,
        candidateTrial: candidate.candidateTrial,
        command: commandPreview(args)
      };
    })
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.dryRun) {
    console.log(JSON.stringify(dryRunReport(options), null, 2));
    return;
  }

  const { createContraSegmentCandidateSearchReport } = await importTypeScriptModule("apps/browser-cockpit/src/contraSegmentCandidateSearch.ts");
  const candidates = options.candidates.map((candidate) => runCandidate(options, candidate));
  const report = createContraSegmentCandidateSearchReport({
    candidates,
    createdAt: new Date().toISOString(),
    frameCount: options.frames,
    fragmentPrefix: "candidate-fragment-1p-survival-v0",
    gameProfileId: "contra",
    romProfileId: "contra-us-good",
    side: "1P",
    stageId: "stage-1",
    segment: {
      id: "contra-us-stage1-survival-batch-search",
      progressionMetric: "progression.primary",
      progressionStart: 1120,
      progressionEnd: 2048,
      strategyKey: options.strategy
    }
  });

  const artifact = {
    schema: "fc-ai-contra-segment-candidate-search-run-v1",
    dryRun: false,
    frames: options.frames,
    strategy: options.strategy,
    candidates: candidates.map((candidate) => ({
      candidateTrial: candidate.candidateTrial,
      candidateConfigPath: candidate.candidateConfigPath || null,
      status: candidate.report.status ?? "unknown",
      lostActiveFrame: candidate.report.lostActiveFrame ?? null,
      finalProgression: candidate.report.finalSnapshot?.worldX ?? 0,
      maxProgression: candidate.report.maxProgressSnapshot?.worldX ?? candidate.report.finalSnapshot?.worldX ?? 0,
      progressStallFrames: candidate.report.progressStallFrames ?? 0
    })),
    report
  };

  if (options.out) {
    const outPath = path.resolve(repoRoot, options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(artifact, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({
    schema: "fc-ai-contra-segment-candidate-search-run-v1",
    dryRun: false,
    status: "error",
    reason: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
});
