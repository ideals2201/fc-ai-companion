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

test("standardized operation manual gates strategy control to active gameplay", () => {
  assert.match(source, /runtimeStatus === "running"/, "manual should require the emulator run state before strategy input writes");
  assert.match(source, /gameplayActive === true/, "manual should require RAM-confirmed gameplay before strategy input writes");
  assert.match(source, /paused/i, "manual should define pause handling");
  assert.match(source, /clear AI input/i, "manual should require input clearing when paused or outside gameplay");
});

test("standardized operation manual requires validation report gates before package save", () => {
  assert.match(source, /fc-ai-strategy-validation-report-v1/, "manual should name the validation report schema");
  assert.match(source, /ValidationReport/i, "manual should require a validation report artifact");
  assert.match(source, /death/i, "manual should block package save after death");
  assert.match(source, /desync/i, "manual should block package save after desync");
  assert.match(source, /ROMProfile mismatch/i, "manual should block package save on ROMProfile mismatch");
});

test("standardized operation manual includes candidate fragment package evidence", () => {
  assert.match(source, /candidate StrategyFragment proposal/i, "manual should include candidate fragment proposals in package evidence");
  assert.match(source, /tasIsController/i, "manual should keep TAS explicitly marked as non-controller evidence");
});

test("standardized operation manual saves phase summaries for every training category", () => {
  assert.match(source, /20 minutes/i, "manual should require a time-bounded phase summary cadence");
  assert.match(source, /12 candidates/i, "manual should require a candidate-count phase summary cadence");
  assert.match(source, /every stage and every strategy category/i, "manual should apply cadence across all training");
  for (const strategyKey of ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"]) {
    assert.match(source, new RegExp(strategyKey), `manual should apply cadence to ${strategyKey}`);
  }
  assert.match(source, /best no-death `worldX`/i, "manual should require best no-death progress");
  assert.match(source, /death point/i, "manual should require death point evidence");
  assert.match(source, /accepted candidates/i, "manual should require accepted candidate evidence");
  assert.match(source, /rejected candidates/i, "manual should require rejected candidate evidence");
  assert.match(source, /next search boundary/i, "manual should require next-boundary guidance");
});
