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

const { parseBotRunStrategyParam } = await importTypeScriptModule(
  new URL("../apps/browser-cockpit/src/botRunConfig.ts", import.meta.url)
);

test("botrun strategy param selects each standard strategy independently", () => {
  for (const strategy of ["survival-v0", "speedrun-v0", "combat-v0", "loot-v0", "guard-v0"]) {
    const params = new URLSearchParams(`botrun=1&strategy=${strategy}`);
    assert.equal(parseBotRunStrategyParam(params), strategy);
  }
});

test("botrun strategy param defaults to survival for missing or unsafe values", () => {
  assert.equal(parseBotRunStrategyParam(new URLSearchParams("botrun=1")), "survival-v0");
  assert.equal(parseBotRunStrategyParam(new URLSearchParams("botrun=1&strategy=personal-v0")), "survival-v0");
  assert.equal(parseBotRunStrategyParam(new URLSearchParams("botrun=1&strategy=off")), "survival-v0");
});
