import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docPath = path.join(repoRoot, "docs", "STRATEGY_PACK_STANDARD.md");

test("strategy pack standard document defines distributable pack rules", () => {
  assert.equal(fs.existsSync(docPath), true, "docs/STRATEGY_PACK_STANDARD.md should exist");

  const source = fs.readFileSync(docPath, "utf8");

  [
    "# FC AI Strategy Pack Standard",
    "## 1. Position",
    "## 2. Required Package Identity",
    "## 3. Required Directory Structure",
    "## 4. Strategy Taxonomy",
    "## 5. Side-Owned Pack Selection",
    "## 6. Coop Compatibility Contract",
    "## 7. TAS-Derived Training Artifacts",
    "## 8. Validation Gates",
    "## 9. Distribution Levels"
  ].forEach((heading) => assert.ok(source.includes(heading), `${heading} should be documented`));

  assert.match(source, /manifest\.json/, "standard should define manifest as the package entry");
  assert.match(source, /strategy-types\.json/, "standard should require declared strategy taxonomy");
  assert.match(source, /training-scenarios\.json/, "standard should require declared training scenarios");
  assert.match(source, /reward-like scoring/, "standard should keep validation scoring explicit");
  assert.match(source, /terminal conditions/, "standard should define terminal conditions for pack validation");
  assert.match(source, /side-baselines\.json/, "standard should cover TAS side baseline artifacts");
  assert.match(source, /sideScope/, "standard should require side-scope metadata for package exports");
  assert.match(source, /1P only/, "standard should allow 1P-only package export");
  assert.match(source, /2P only/, "standard should allow 2P-only package export");
  assert.match(source, /1P\+2P/, "standard should allow combined two-side package export");
  assert.match(source, /1P.*2P/s, "standard should cover side-owned 1P and 2P pack selection");
  assert.match(source, /Safety Override/, "standard should require safety review before promotion");
  assert.match(source, /ROMProfile/, "standard should bind packs to ROM profiles");
});
