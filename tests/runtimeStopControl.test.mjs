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

const { classifyBotRunTerminalState } = await importTypeScriptModule(
  new URL("../apps/browser-cockpit/src/runtimeStopControl.ts", import.meta.url)
);

function snapshot(overrides = {}) {
  return {
    gameOver: 0,
    p1State: 1,
    deathFlag: 0,
    bossDefeated: 0,
    ...overrides
  };
}

test("botrun stops immediately on Contra Game Over RAM state", () => {
  const result = classifyBotRunTerminalState(snapshot({ gameOver: 1, p1State: 0, deathFlag: 0 }), false);

  assert.deepEqual(result, {
    status: "death",
    reason: "game-over"
  });
});

test("botrun still reports death state and boss completion distinctly", () => {
  assert.deepEqual(classifyBotRunTerminalState(snapshot({ p1State: 2 }), false), {
    status: "death",
    reason: "death-state"
  });
  assert.deepEqual(classifyBotRunTerminalState(snapshot({ deathFlag: 1 }), false), {
    status: "death",
    reason: "death-flag"
  });
  assert.deepEqual(classifyBotRunTerminalState(snapshot({ bossDefeated: 1 }), true), {
    status: "complete",
    reason: "boss-defeated"
  });
});

test("botrun does not stop on an ordinary alive gameplay snapshot", () => {
  assert.equal(classifyBotRunTerminalState(snapshot(), true), null);
});
