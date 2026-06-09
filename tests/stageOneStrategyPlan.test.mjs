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
  activeRouteSegmentForPlan,
  createDefaultPersonalPlan,
  defaultStrategyPlans,
  planForStrategy,
  routeKeyForStrategy,
  stageOneStrategyFiles
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/stageOneStrategyPlan.ts", import.meta.url));

test("shared stage one strategy plans expose every standard strategy", () => {
  for (const strategyKey of ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"]) {
    const plan = planForStrategy(strategyKey, defaultStrategyPlans);
    assert.equal(plan?.strategy, strategyKey);
    assert.equal(plan?.stage, 1);
    assert.ok(plan.segments.length >= 6);
    assert.ok(stageOneStrategyFiles[strategyKey]?.includes("stage1-"));
  }
});

test("shared stage one route keys map aliases without allowing inactive strategies", () => {
  assert.equal(routeKeyForStrategy("rules-v0"), "speedrun-v0");
  assert.equal(routeKeyForStrategy("follow-test"), "guard-v0");
  assert.equal(routeKeyForStrategy("off"), null);
  assert.equal(routeKeyForStrategy("placeholder"), null);
});

test("shared active route segment selects by WorldX and falls back to the last segment", () => {
  const plan = planForStrategy("speedrun-v0", defaultStrategyPlans);

  assert.equal(activeRouteSegmentForPlan({ level: 0, worldX: 40 }, plan)?.id, "start-run");
  assert.equal(activeRouteSegmentForPlan({ level: 0, worldX: 650 }, plan)?.id, "first-bridge");
  assert.equal(activeRouteSegmentForPlan({ level: 0, worldX: 50000 }, plan)?.id, "boss-wall");
  assert.equal(activeRouteSegmentForPlan({ level: 1, worldX: 40 }, plan), null);
});

test("shared personal default clones the speedrun baseline without mutating it", () => {
  const speedrun = planForStrategy("speedrun-v0", defaultStrategyPlans);
  const personal = createDefaultPersonalPlan();

  assert.equal(personal.strategy, "personal-v0");
  assert.notEqual(personal.segments, speedrun.segments);
  assert.deepEqual(
    personal.segments.map((segment) => segment.id),
    speedrun.segments.map((segment) => segment.id)
  );
});
