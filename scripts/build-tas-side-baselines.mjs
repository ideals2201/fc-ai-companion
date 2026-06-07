import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fm2ModulePath = path.join(repoRoot, "apps", "browser-cockpit", "src", "fm2Movie.ts");
const trainingBasePath = path.join(repoRoot, "data", "training", "contra", "tas_bases", "contra-j-good", "training-base.json");
const outputPath = path.join(repoRoot, "data", "training", "contra", "tas_bases", "contra-j-good", "side-baselines.json");
const movieId = "contra-j-2p-any-percent";

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

const { extractFm2SideBaselineWindows, parseFm2Movie } = await importTypeScriptModule(fm2ModulePath);
const trainingBase = JSON.parse(fs.readFileSync(trainingBasePath, "utf8"));
const movie = trainingBase.movies.find((candidate) => candidate.id === movieId);

if (!movie) {
  throw new Error(`Missing TAS movie metadata: ${movieId}`);
}

const rawMoviePath = path.join(repoRoot, trainingBase.source.rawArchivePath, movie.fileName);
const fm2 = parseFm2Movie(fs.readFileSync(rawMoviePath, "utf8"));

const windows = [
  {
    id: "entry-sync",
    label: "Entry sync and two-player start",
    frameWindow: [0, 650],
    strategyTypes: ["survival", "speedrun", "coop-spacing"]
  },
  {
    id: "opening-active",
    label: "Opening active control",
    frameWindow: [650, 1350],
    strategyTypes: ["survival", "speedrun", "combat"]
  },
  {
    id: "fixed-threat-route",
    label: "Fixed-threat route and shared fire",
    frameWindow: [1350, 2500],
    strategyTypes: ["survival", "combat", "fixed-threat-hp-lock"]
  },
  {
    id: "boss-approach-platform-capture",
    label: "Boss approach platform capture",
    frameWindow: [2500, 3600],
    strategyTypes: ["survival", "recovery", "platform-capture"]
  },
  {
    id: "coop-advance-reference",
    label: "Cooperative advance reference",
    frameWindow: [450, 2500],
    strategyTypes: ["survival", "guard", "coop-spacing"]
  }
];

const windowStrategyTypes = new Map(windows.map((window) => [window.id, window.strategyTypes]));
const baselines = extractFm2SideBaselineWindows(fm2, {
  movieId,
  windows,
  maxPatterns: 6
}).map((baseline) => ({
  ...baseline,
  strategyTypes: windowStrategyTypes.get(baseline.windowId) ?? ["survival"],
  promotionTarget: {
    gameProfileId: trainingBase.gameProfileId,
    romProfileId: trainingBase.romProfileId,
    stageId: "stage-1",
    side: baseline.side,
    requiredValidation: "real-runtime-trace"
  }
}));

const artifact = {
  schemaVersion: "1.0.0",
  role: "tas-side-baselines",
  gameProfileId: trainingBase.gameProfileId,
  romProfileId: trainingBase.romProfileId,
  tasProfileId: trainingBase.tasProfileId,
  createdAt: "2026-06-07",
  source: {
    kind: "fm2",
    movieId,
    fileName: movie.fileName,
    rawMoviePath: path.relative(repoRoot, rawMoviePath).replaceAll(path.sep, "/"),
    players: movie.players,
    entrySyncStatus: movie.entrySyncStatus,
    frameRangeSemantics: "start-inclusive-end-exclusive",
    note: "2P TAS is split into side-owned baseline windows. These are training baselines, not live controller scripts."
  },
  runtimePolicy: {
    tasIsController: false,
    sideOwnedPromotionRequired: true,
    requiresHashExactMatch: true,
    requiresSafetyOverride: true,
    requiresRealRuntimeTrace: true,
    supportsSingleAiDerivation: true,
    supportsDualAiDerivation: true,
    supportsHumanAiDerivation: true
  },
  windows: windows.map((window) => ({
    id: window.id,
    label: window.label,
    frameWindow: window.frameWindow,
    strategyTypes: window.strategyTypes
  })),
  baselines
};

fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(repoRoot, outputPath)}`);
