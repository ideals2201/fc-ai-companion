import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manualPath = new URL("../docs/20_STANDARDIZED_OPERATION_MANUAL.md", import.meta.url);
const source = fs.readFileSync(manualPath, "utf8");

test("standardized operation manual defines the TAS to training evidence flow", () => {
  assert.match(source, /TAS Extraction/i, "manual should define TAS extraction");
  assert.match(source, /Side Baseline/i, "manual should define side-owned baselines");
  assert.match(source, /Training Session/i, "manual should define training session operation");
  assert.match(source, /TraceEvidence/i, "manual should require trace evidence archive");
  assert.match(source, /Validation Replay/i, "manual should require validation replay");
  assert.match(source, /Package Evidence Export/i, "manual should define package evidence export");
});

test("standardized operation manual preserves project prohibitions", () => {
  assert.match(source, /TAS must not be used as a live controller/i, "manual should prohibit TAS live control");
  assert.match(source, /ROM file must not be bundled/i, "manual should prohibit ROM bundling");
  assert.match(source, /candidate/i, "manual should keep unvalidated outputs candidate");
  assert.match(source, /real runtime trace/i, "manual should require real runtime trace before validation");
});

test("standardized operation manual requires validation report gates before package save", () => {
  assert.match(source, /fc-ai-strategy-validation-report-v1/, "manual should name the validation report schema");
  assert.match(source, /ValidationReport/i, "manual should require a validation report artifact");
  assert.match(source, /death/i, "manual should block package save after death");
  assert.match(source, /desync/i, "manual should block package save after desync");
  assert.match(source, /ROMProfile mismatch/i, "manual should block package save on ROMProfile mismatch");
});
