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
  buildTasCommentary,
  commentaryModeLabel,
  identifyTasForRom,
  recommendationLabel,
  selectDefaultTasMovie,
  tasBaseLabel,
  tasMoviesForEntry,
  tasRegistry,
  tasStatusLabel
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/tasRegistry.ts", import.meta.url));

test("matches Contra Japan TAS data only when the ROM checksum is exact", () => {
  const metadata = {
    gameId: "contra",
    romProfileId: "contra-j-good",
    md5: "0e40bc1b049c16c5d7246cc28399cb5d",
    headerlessMd5: "d306c54ccfdf5cb4f8ec588f19b3e33d",
    sha1: "376836361f404c815d404e1d5903d5d11f4eff0e"
  };

  const match = identifyTasForRom(metadata);

  assert.equal(match?.tasProfileId, "contra-j-fm2-archive-2026-06-04");
  assert.equal(match?.romChecksum.fm2Base64, "0wbFTM/fXLT47FiPGbPjPQ==");
  assert.equal(tasStatusLabel(match), "TAS 已匹配");
  assert.match(tasBaseLabel(match), /魂斗罗日版 TAS 基座/);
  assert.ok(match?.categories.includes("2P"));
});

test("does not match TAS data by ROM profile alone when checksums differ", () => {
  const profileOnlyMismatch = identifyTasForRom({
    gameId: "contra",
    romProfileId: "contra-j-good",
    md5: "11111111111111111111111111111111",
    headerlessMd5: "22222222222222222222222222222222",
    sha1: "3333333333333333333333333333333333333333"
  });

  assert.equal(profileOnlyMismatch, null);
});

test("reports no TAS match for unsupported or unrelated ROMs", () => {
  assert.equal(identifyTasForRom(null), null);
  assert.equal(tasStatusLabel(null), "无匹配 TAS");
  assert.equal(tasBaseLabel(null), "无匹配基座");

  const noMatch = identifyTasForRom({
    gameId: "contra",
    romProfileId: "contra-us-good",
    md5: "7bdad8b4a7a56a634c9649d20bd3011b",
    headerlessMd5: "5a5c2f4f1cafb1f55a8dc0d5ad4550e5",
    sha1: "c9ea66bb7cb30ad5343f1721b1d4d3219859319b"
  });

  assert.equal(noMatch, null);
  assert.equal(tasRegistry.length, 1);
});

test("exposes selectable TAS movies with bilingual summaries and baseline recommendations", () => {
  const entry = tasRegistry[0];
  const movies = tasMoviesForEntry(entry);
  const defaultMovie = selectDefaultTasMovie(entry);

  assert.equal(movies.length, 4);
  assert.equal(movies.every((movie) => Number.isInteger(movie.playbackStartFrame)), true);
  assert.equal(defaultMovie?.id, "contra-j-2p-any-percent");
  assert.equal(defaultMovie?.entrySyncStatus, "verified-user");
  assert.equal(defaultMovie?.playbackStartFrame, 450);
  assert.equal(defaultMovie?.title.en, "Contra Japan 2P any% TAS");
  assert.equal(defaultMovie?.title.zh, "魂斗罗日版 2P 任意通关 TAS");
  assert.ok(defaultMovie?.recommendedBaselines.includes("survival-v0"));
  assert.ok(defaultMovie?.recommendedBaselines.includes("speedrun-v0"));
  assert.match(defaultMovie?.sourceNote ?? "", /FM2/);
  assert.ok((defaultMovie?.keyMoments.length ?? 0) >= 3);
  assert.ok((defaultMovie?.riskNotes.length ?? 0) >= 2);
  assert.match(recommendationLabel(defaultMovie), /稳健生存/);
});

test("builds deterministic TAS commentary from registered movie metadata", () => {
  const movie = selectDefaultTasMovie(tasRegistry[0]);
  assert.ok(movie);

  assert.equal(commentaryModeLabel("companion-emotional"), "陪伴情绪");
  const commentary = buildTasCommentary(movie, "strategy-analysis");

  assert.match(commentary, /策略分析/);
  assert.match(commentary, /WorldX/);
  assert.match(commentary, /训练基准/);
});
