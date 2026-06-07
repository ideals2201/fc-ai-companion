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
const tasPath = path.join(repoRoot, "data", "tas", "contra", "contra-j-good", "mars608,aiqiyou5-contra-nes-2players.fm2");
const sideBaselinesPath = path.join(repoRoot, "data", "training", "contra", "tas_bases", "contra-j-good", "side-baselines.json");

const {
  extractFm2SideBaselineWindows,
  parseFm2Movie
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/fm2Movie.ts", import.meta.url));

test("splits a two-player TAS into side-owned baseline windows", () => {
  const movie = parseFm2Movie(fs.readFileSync(tasPath, "utf8"));
  const baselines = extractFm2SideBaselineWindows(movie, {
    movieId: "contra-j-2p-any-percent",
    windows: [
      { id: "entry-sync", label: "Entry sync", frameWindow: [0, 650] },
      { id: "opening-active", label: "Opening active control", frameWindow: [650, 1350] }
    ]
  });

  assert.equal(baselines.length, 4);

  const p1Opening = baselines.find((baseline) => baseline.side === "1P" && baseline.windowId === "opening-active");
  const p2Opening = baselines.find((baseline) => baseline.side === "2P" && baseline.windowId === "opening-active");

  assert.ok(p1Opening, "1P opening baseline should exist");
  assert.ok(p2Opening, "2P opening baseline should exist");
  assert.equal(p1Opening.movieId, "contra-j-2p-any-percent");
  assert.equal(p2Opening.movieId, "contra-j-2p-any-percent");
  assert.deepEqual(p1Opening.frameWindow, [650, 1350]);
  assert.equal(p1Opening.rangeSemantics, "start-inclusive-end-exclusive");
  assert.equal(p2Opening.rangeSemantics, "start-inclusive-end-exclusive");
  assert.equal(p1Opening.totalFrames, 700);
  assert.equal(p2Opening.totalFrames, 700);
  assert.ok(p1Opening.pressedFrames > 0);
  assert.ok(p2Opening.pressedFrames > 0);
  assert.ok(p1Opening.buttonPressFrames.right > 0);
  assert.ok(p2Opening.buttonPressFrames.right > 0);
  assert.ok(p1Opening.topInputPatterns.length > 0);
  assert.ok(p2Opening.topInputPatterns.length > 0);
  assert.notEqual(p1Opening.topInputPatterns[0].label, "-");
  assert.notEqual(p2Opening.topInputPatterns[0].label, "-");
  assert.ok(p1Opening.intentHints.includes("advance"));
  assert.ok(p2Opening.intentHints.includes("advance"));
});

test("Contra Japan 2P TAS side baselines are archived as a training artifact", () => {
  assert.equal(fs.existsSync(sideBaselinesPath), true, "side-baselines.json should exist");

  const artifact = JSON.parse(fs.readFileSync(sideBaselinesPath, "utf8"));

  assert.equal(artifact.schemaVersion, "1.0.0");
  assert.equal(artifact.role, "tas-side-baselines");
  assert.equal(artifact.gameProfileId, "contra");
  assert.equal(artifact.romProfileId, "contra-j-good");
  assert.equal(artifact.source.movieId, "contra-j-2p-any-percent");
  assert.equal(artifact.source.players, "2P");
  assert.equal(artifact.runtimePolicy.tasIsController, false);
  assert.equal(artifact.runtimePolicy.sideOwnedPromotionRequired, true);
  assert.ok(Array.isArray(artifact.baselines));
  assert.ok(artifact.baselines.length >= 8);
  assert.ok(artifact.baselines.some((baseline) => baseline.side === "1P"));
  assert.ok(artifact.baselines.some((baseline) => baseline.side === "2P"));
  assert.ok(artifact.baselines.every((baseline) => baseline.sourceKind === "tas-side-split"));
  assert.ok(artifact.baselines.every((baseline) => baseline.acceptanceChecks.includes("real-runtime-trace-required")));
  assert.ok(artifact.baselines.every((baseline) => baseline.acceptanceChecks.includes("safety-override-required")));
});

test("Contra Japan TAS side baselines include a pre-boss platform capture window", () => {
  const artifact = JSON.parse(fs.readFileSync(sideBaselinesPath, "utf8"));

  const window = artifact.windows.find((candidate) => candidate.id === "boss-approach-platform-capture");
  assert.ok(window, "pre-boss platform capture window should exist before training that route");
  assert.deepEqual(window.frameWindow, [2500, 3600]);
  assert.ok(window.strategyTypes.includes("survival"));
  assert.ok(window.strategyTypes.includes("platform-capture"));

  const sideBaselines = artifact.baselines.filter((baseline) => baseline.windowId === "boss-approach-platform-capture");
  assert.equal(sideBaselines.length, 2, "platform capture baseline should be split into 1P and 2P views");
  assert.ok(sideBaselines.every((baseline) => baseline.promotionTarget.stageId === "stage-1"));
  assert.ok(sideBaselines.every((baseline) => baseline.promotionTarget.romProfileId === "contra-j-good"));
  assert.ok(sideBaselines.some((baseline) => baseline.side === "1P" && baseline.buttonPressFrames.right > 0));
  assert.ok(sideBaselines.some((baseline) => baseline.side === "1P" && baseline.buttonPressFrames.a > 0));
});
