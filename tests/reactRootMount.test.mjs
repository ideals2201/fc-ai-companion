import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps", "browser-cockpit", "src", "main.tsx"), "utf8");

test("browser cockpit reuses the React root across dev reloads", () => {
  assert.equal(
    /createRoot\(document\.getElementById\("root"\)!\)\.render/.test(mainSource),
    false,
    "entrypoint should not create and render a fresh React root inline"
  );
  assert.match(mainSource, /__fcAiBrowserCockpitRoot/, "entrypoint should cache the React root on window");
  assert.match(
    mainSource,
    /window\.__fcAiBrowserCockpitRoot\s*\?\?\s*createRoot\(rootElement\)/,
    "entrypoint should reuse an existing root before creating one"
  );
});
