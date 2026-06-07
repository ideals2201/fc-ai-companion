import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");

test("browser runtime wires URL record windows into trace capture", () => {
  assert.match(mainSource, /parseTraceCaptureConfig/, "main should parse record URL params");
  assert.match(mainSource, /shouldKeepTraceSample/, "main should filter samples by the record window");
  assert.match(mainSource, /shouldStopTraceCapture/, "main should stop targeted capture at the record boundary");
  assert.match(mainSource, /traceCaptureConfigRef/, "main should keep active trace capture config in a ref");
  assert.match(mainSource, /traceCaptureEnteredRef/, "main should track whether the target window has been entered");
  assert.match(mainSource, /data-testid="play-trace-samples-json"/, "main should expose captured samples for training analysis");
});
