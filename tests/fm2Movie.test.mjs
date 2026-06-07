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
  fm2ButtonsToLabels,
  parseFm2Movie,
  resolveFm2PlaybackStartFrame,
  summarizeFm2Movie
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/fm2Movie.ts", import.meta.url));

test("parses FM2 header and controller frames for Contra Japan 1P TAS", () => {
  const source = fs.readFileSync(
    new URL("../data/tas/contra/contra-j-good/mars608,aiqiyou-contraj-1p.fm2", import.meta.url),
    "utf8"
  );

  const movie = parseFm2Movie(source);

  assert.equal(movie.header.version, "3");
  assert.equal(movie.header.romFilename, "Contra (J)");
  assert.equal(movie.header.romChecksum, "base64:0wbFTM/fXLT47FiPGbPjPQ==");
  assert.equal(movie.comments.author, "Mars608 & aiqiyou");
  assert.equal(movie.frames.length, 31745);
  assert.equal(movie.frames[6].p1.select, true);
  assert.equal(movie.frames[6].p1.start, false);
  assert.equal(movie.frames[6].p1.b, false);
  assert.equal(fm2ButtonsToLabels(movie.frames[6].p1), "SELECT");
  assert.equal(fm2ButtonsToLabels({ ...movie.frames[6].p1, select: false, left: true, down: true, b: true }), "←↓B");
});

test("summarizes FM2 inputs without loading emulator runtime", () => {
  const source = fs.readFileSync(
    new URL("../data/tas/contra/contra-j-good/mars608,aiqiyou5-contra-nes-2players.fm2", import.meta.url),
    "utf8"
  );

  const movie = parseFm2Movie(source);
  const summary = summarizeFm2Movie(movie);

  assert.equal(summary.inputFrames, 31045);
  assert.equal(summary.playerFrames.p1 > 0, true);
  assert.equal(summary.playerFrames.p2 > 0, true);
  assert.equal(summary.hasTwoPlayerInput, true);
});

test("bounds configured FM2 playback start frame for watch-mode replay", () => {
  const source = fs.readFileSync(
    new URL("../data/tas/contra/contra-j-good/mars608,aiqiyou-contraj-1p.fm2", import.meta.url),
    "utf8"
  );

  const movie = parseFm2Movie(source);

  assert.equal(resolveFm2PlaybackStartFrame(movie, 450), 450);
  assert.equal(resolveFm2PlaybackStartFrame(movie, -10), 0);
  assert.equal(resolveFm2PlaybackStartFrame(movie, movie.frames.length + 100), movie.frames.length - 1);
});
