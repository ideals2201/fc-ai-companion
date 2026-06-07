import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manualPath = path.join(repoRoot, "docs", "19_FC_AI_DECISION_ENGINE_ENGINEERING_MANUAL_DRAFT_1_0.md");
const manual = fs.readFileSync(manualPath, "utf8");

test("decision engine manual follows the current strategy-pack architecture", () => {
  assert.match(manual, /适用项目：`D:\\Ai-Play\\fc-ai-companion`/);
  assert.match(manual, /docs\/STRATEGY_PROTOCOL_CORE\.md/);
  assert.match(manual, /strategy-packs\/<game-profile-id>\//);
  assert.match(manual, /FCEUX\/Lua = 外部验证适配器/);
  assert.match(manual, /浏览器 = 产品平台和实时运行时/);
  assert.match(manual, /StrategyPack = 标准制品和策略源/);
});

test("decision engine manual does not point back to obsolete standalone FCEUX standards", () => {
  assert.doesNotMatch(manual, /D:\\2026FCEUX/);
  assert.doesNotMatch(manual, /docs\/standards/);
  assert.doesNotMatch(manual, /data\/registries\/contra_romprofile_tas_registry\.json/);
  assert.doesNotMatch(manual, /主线：FCEUX \+ Lua \+ RAM/);
});
