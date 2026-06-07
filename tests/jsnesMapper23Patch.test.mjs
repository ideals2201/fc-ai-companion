import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const patchSource = fs.readFileSync(
  path.join(repoRoot, "apps", "browser-cockpit", "src", "jsnesMapper23Patch.ts"),
  "utf8"
);
const mainSource = fs.readFileSync(
  path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"),
  "utf8"
);

test("browser cockpit registers jsnes mapper 23 before ROM loading", () => {
  assert.match(mainSource, /import "\.\/jsnesMapper23Patch"/);
  assert.match(patchSource, /\[23\]\s*=\s*Mapper23/);
  assert.match(patchSource, /class Mapper23/);
});

test("mapper 23 patch covers VRC2 essentials needed by Contra Japan", () => {
  assert.match(patchSource, /load8kRomBank\(this\.prg0/);
  assert.match(patchSource, /load8kRomBank\(this\.prg1/);
  assert.match(patchSource, /load1kVromBank/);
  assert.match(patchSource, /setMirroring/);
  assert.match(patchSource, /this\.latch\s*=\s*byte\s*&\s*1/);
  assert.match(patchSource, /\(\(normalized >> 8\) & 0xfe\) \| this\.latch/);
});
