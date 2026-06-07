import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contraPackRoot = path.join(repoRoot, "strategy-packs", "contra");
const stagePlanPath = path.join(contraPackRoot, "stages", "stage-1", "stage-plan.json");
const publicStageRoot = path.join(
  repoRoot,
  "apps",
  "browser-cockpit",
  "public",
  "strategies",
  "contra",
  "stage1"
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toRuntimeRoute(stagePlan, runtimeExport) {
  return {
    game: "contra-us",
    gameId: stagePlan.gameProfileId,
    romProfileId: stagePlan.romProfileId,
    compatibilityGroup: "contra-us",
    stage: 1,
    strategy: runtimeExport.strategyKey,
    version: 1,
    generatedFrom: "strategy-packs/contra",
    sourceVersion: `${stagePlan.gameProfileId}:${stagePlan.romProfileId}:${stagePlan.strategyPackVersion}`,
    description: runtimeExport.description,
    segments: runtimeExport.segments.map((segment) => ({
      id: segment.id,
      label: segment.label,
      worldStart: segment.start,
      worldEnd: segment.end,
      action: segment.action,
      fire: segment.fire,
      jumpEvery: segment.jumpEvery
    }))
  };
}

function syncContraStage1() {
  const stagePlan = readJson(stagePlanPath);
  fs.mkdirSync(publicStageRoot, { recursive: true });

  for (const runtimeExport of stagePlan.runtimeExports ?? []) {
    const route = toRuntimeRoute(stagePlan, runtimeExport);
    const outputPath = path.join(publicStageRoot, runtimeExport.file);
    fs.writeFileSync(outputPath, `${JSON.stringify(route, null, 2)}\n`, "utf8");
    console.log(`synced ${path.relative(repoRoot, outputPath)}`);
  }
}

syncContraStage1();
