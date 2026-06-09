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

const {
  createHeadlessButtonState,
  isHeadlessGameplayActive,
  readHeadlessGameRamSnapshot,
  runtimeStartupButtons
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/headlessRuntimeCore.ts", import.meta.url));

function fakeNesWithRam(patches = {}) {
  const mem = new Uint8Array(0x10000);
  for (const [address, value] of Object.entries(patches)) {
    mem[Number(address)] = value;
  }
  return { cpu: { mem } };
}

test("headless runtime reads the same Contra RAM fields used by browser botrun", () => {
  const nes = fakeNesWithRam({
    0x0030: 0,
    0x0064: 2,
    0x0065: 7,
    0x0334: 118,
    0x031a: 192,
    0x0022: 0,
    0x0032: 2,
    0x0090: 1,
    0x00a0: 0,
    0x00aa: 0x13,
    0x0324: 196,
    0x033e: 150,
    0x04b8: 1,
    0x0528: 0x05,
    0x0578: 1,
    0x03b8: 190,
    0x03c8: 130,
    0x0388: 1,
    0x0438: 1
  });

  const snapshot = readHeadlessGameRamSnapshot(nes, 1234);

  assert.equal(snapshot.frame, 1234);
  assert.equal(snapshot.level, 0);
  assert.equal(snapshot.cameraX, 519);
  assert.equal(snapshot.worldX, 637);
  assert.equal(snapshot.playerY, 192);
  assert.equal(snapshot.weapon, 0x13);
  assert.equal(snapshot.enemies.length, 1);
  assert.equal(snapshot.enemies[0].type, 0x05);
  assert.equal(snapshot.enemies[0].threat, true);
  assert.equal(snapshot.bullets.length, 1);
});

test("headless startup presses start only before active gameplay", () => {
  assert.deepEqual(runtimeStartupButtons(null, 0, false, false), createHeadlessButtonState());

  const menu = readHeadlessGameRamSnapshot(fakeNesWithRam({
    0x0030: 0,
    0x0032: 2
  }), 0);

  assert.equal(runtimeStartupButtons(menu, 0, false, false).start, true);

  const active = readHeadlessGameRamSnapshot(fakeNesWithRam({
    0x0030: 0,
    0x0032: 2,
    0x0064: 0,
    0x0065: 0,
    0x0334: 80,
    0x031a: 190,
    0x0090: 1
  }), 900);

  assert.equal(isHeadlessGameplayActive(active, 900), true);
  assert.deepEqual(runtimeStartupButtons(active, 900, false, false), createHeadlessButtonState());
});

test("headless startup selects two-player mode before start when requested", () => {
  const menu = readHeadlessGameRamSnapshot(fakeNesWithRam({
    0x0030: 0,
    0x0032: 2
  }), 25);

  const buttons = runtimeStartupButtons(menu, 25, true, false);

  assert.equal(buttons.select, true);
  assert.equal(buttons.start, false);
});
