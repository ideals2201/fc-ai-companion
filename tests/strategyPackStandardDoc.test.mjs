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
  assert.match(source, /author\.displayName/, "standard should require visible author metadata");
  assert.match(source, /provenance\.creator/, "standard should require creator provenance");
  assert.match(source, /provenance\.latestModifier/, "standard should require latest modifier provenance");
  assert.match(source, /provenance\.revisions/, "standard should require revision history");
  assert.match(source, /snapshotPath/, "standard should distinguish restorable snapshots from audit history");
  assert.match(source, /Rollback is snapshot-based, not author-based/, "standard should forbid author-based rollback");
  assert.match(source, /does not limit how many times a draft Strategy Pack can be modified/, "standard should avoid edit-count limits");
  assert.match(source, /must not overwrite the already distributed snapshot/, "standard should preserve published revision immutability");
  assert.match(source, /trainingWindowName/, "standard should define editable training window names");
  assert.match(source, /avatarAsset/, "standard should define optional strategy-pack avatar assets");
  assert.match(source, /strategy-types\.json/, "standard should require declared strategy taxonomy");
  assert.match(source, /training-scenarios\.json/, "standard should require declared training scenarios");
  assert.match(source, /reward-like scoring/, "standard should keep validation scoring explicit");
  assert.match(source, /terminal conditions/, "standard should define terminal conditions for pack validation");
  assert.match(source, /strategyResults/, "standard should define per-strategy battle result metadata");
  assert.match(source, /kills/, "standard should include kill result data");
  assert.match(source, /fixedTargetsDestroyed/, "standard should include fixed-target destruction data");
  assert.match(source, /rewardsCollected/, "standard should include reward collection data");
  assert.match(source, /clearTimeFrames/, "standard should include clear-time data");
  assert.match(source, /unverified/, "standard should require unverified result data to be labeled");
  assert.match(source, /side-baselines\.json/, "standard should cover TAS side baseline artifacts");
  assert.match(source, /sideScope/, "standard should require side-scope metadata for package exports");
  assert.match(source, /1P only/, "standard should allow 1P-only package export");
  assert.match(source, /2P only/, "standard should allow 2P-only package export");
  assert.match(source, /1P\+2P/, "standard should allow combined two-side package export");
  assert.match(source, /1P.*2P/s, "standard should cover side-owned 1P and 2P pack selection");
  assert.match(source, /Safety Override/, "standard should require safety review before promotion");
  assert.match(source, /ROMProfile/, "standard should bind packs to ROM profiles");
});
