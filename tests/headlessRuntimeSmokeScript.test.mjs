import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const scriptSource = fs.readFileSync(new URL("../scripts/headless-runtime-smoke.mjs", import.meta.url), "utf8");

test("headless runtime smoke script reads local ROM configuration without embedding ROM data", () => {
  assert.match(scriptSource, /FC_AI_COMPANION_ROM_PATH/);
  assert.match(scriptSource, /headlessRuntimeCore\.ts/);
  assert.match(scriptSource, /stageOneStrategyPlan\.ts/);
  assert.doesNotMatch(scriptSource, /createWriteStream/);
  assert.doesNotMatch(scriptSource, /\.nes["']/);
});

test("headless runtime smoke report keeps TAS as evidence-only, not controller", () => {
  assert.match(scriptSource, /tasIsController:\s*false/);
  assert.match(scriptSource, /runtimeStartupButtons/);
});

test("headless runtime smoke can optionally probe direct controller writes", () => {
  assert.match(scriptSource, /--strategy=/);
  assert.match(scriptSource, /--candidate-trial=/);
  assert.match(scriptSource, /Math\.min\(value,\s*20000\)/);
  assert.match(scriptSource, /--probe=right-b/);
  assert.match(scriptSource, /--probe=route-plan/);
  assert.match(scriptSource, /headlessRoutePlanProbe\.ts/);
  assert.match(scriptSource, /contraStage1BossWall\.ts/);
  assert.match(scriptSource, /contraStage1BossWallPhase\.ts/);
  assert.match(scriptSource, /bossWallPhaseEnabled/);
  assert.match(scriptSource, /bossWallPhaseTelemetry/);
  assert.match(scriptSource, /lastBossWallPhaseDecision/);
  assert.match(scriptSource, /updateBossWallPhaseState/);
  assert.match(scriptSource, /decideBossWallPhaseAction/);
  assert.match(scriptSource, /transpileLocalTypeScriptModule/);
  assert.match(scriptSource, /\$\{specifier\}\.ts/);
  assert.match(scriptSource, /probeInput/);
  assert.match(scriptSource, /routeSegment/);
  assert.match(scriptSource, /candidateTrial/);
  assert.match(scriptSource, /--candidate-config=/);
  assert.match(scriptSource, /readCandidateConfig/);
  assert.match(scriptSource, /\\uFEFF/);
  assert.match(scriptSource, /candidateOverlay/);
  assert.match(scriptSource, /maxProgressSnapshot/);
  assert.match(scriptSource, /maxNoDeathProgressSnapshot/);
  assert.match(scriptSource, /maxNoDeathProgressRouteSegment/);
  assert.match(scriptSource, /lastActiveSnapshot/);
  assert.match(scriptSource, /lostActiveSnapshot/);
  assert.match(scriptSource, /preLostActiveSnapshot/);
  assert.match(scriptSource, /preLostActiveButtons/);
  assert.match(scriptSource, /progressStallFrames/);
  assert.match(scriptSource, /maxProgressStallFrames/);
  assert.match(scriptSource, /stallThresholdFrames/);
  assert.match(scriptSource, /stalled-active/);
  assert.match(scriptSource, /recovered-after-loss/);
  assert.match(scriptSource, /nearbyEnemies/);
  assert.match(scriptSource, /nearbyBullets/);
  assert.match(scriptSource, /jumpState/);
  assert.match(scriptSource, /distanceToPlayer/);
  assert.match(scriptSource, /lost-active/);
});

test("headless runtime smoke can emit a compact trace window for failure analysis", () => {
  assert.match(scriptSource, /--trace-start=/);
  assert.match(scriptSource, /--trace-end=/);
  assert.match(scriptSource, /traceWindow/);
  assert.match(scriptSource, /compactTraceFrame/);
  assert.match(scriptSource, /beforeSnapshot/);
  assert.match(scriptSource, /afterSnapshot/);
});

test("headless runtime smoke can emit a compact trace summary for button and threat review", () => {
  assert.match(scriptSource, /traceSummary/);
  assert.match(scriptSource, /summarizeTraceFrame/);
  assert.match(scriptSource, /nearestEnemy/);
  assert.match(scriptSource, /nearestBullet/);
  assert.match(scriptSource, /buttonsText/);
});

test("headless runtime smoke trace summary can project player bullet threat intersections", () => {
  assert.match(scriptSource, /playerBulletVectors/);
  assert.match(scriptSource, /bulletThreatIntersections/);
  assert.match(scriptSource, /projectBulletThreatIntersections/);
  assert.match(scriptSource, /predictedHitFrame/);
  assert.match(scriptSource, /closestDistance/);
  assert.match(scriptSource, /movingToward/);
  assert.match(scriptSource, /targetAfterHp/);
  assert.match(scriptSource, /targetHpDelta/);
  assert.match(scriptSource, /targetClearedAfter/);
  assert.match(scriptSource, /ramConfirmedHit/);
  assert.match(scriptSource, /predictedHitButNoRamEffect/);
});

test("headless runtime smoke can save and resume jsnes state for segment-first training", () => {
  assert.match(scriptSource, /--save-state-at=/);
  assert.match(scriptSource, /--save-state=/);
  assert.match(scriptSource, /--start-state=/);
  assert.match(scriptSource, /--stop-after-save/);
  assert.match(scriptSource, /nes\.toJSON\(\)/);
  assert.match(scriptSource, /nes\.fromJSON/);
  assert.match(scriptSource, /nes\.fromJSON\(savedState\.state\);\s*startStateSnapshot = readHeadlessGameRamSnapshot\(nes, startFrame\);/);
  assert.match(scriptSource, /fc-ai-jsnes-headless-state-v1/);
  assert.match(scriptSource, /startFrame/);
  assert.match(scriptSource, /completedFrames/);
  assert.match(scriptSource, /endFrame/);
});

test("headless runtime smoke registers mapper 23 for Contra Japan runs", () => {
  assert.match(scriptSource, /registerHeadlessMapper23/);
  assert.match(scriptSource, /Mappers\[23\]\s*=\s*Mapper23/);
  assert.match(scriptSource, /Konami VRC2\/VRC4/);
});
