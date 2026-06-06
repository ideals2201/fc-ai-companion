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
  decodeRomHeaderValue,
  formatRomSize,
  identifyRomProfile,
  parseNesRomMetadata,
  readRomMetadataHeaders
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/romMetadata.ts", import.meta.url));

function makeHeader(bytes = {}) {
  const data = new Uint8Array(16);
  data[0] = 0x4e;
  data[1] = 0x45;
  data[2] = 0x53;
  data[3] = 0x1a;
  for (const [index, value] of Object.entries(bytes)) {
    data[Number(index)] = value;
  }
  return data;
}

test("parses iNES cartridge metadata from header bytes and local file info", () => {
  const romBytes = makeHeader({
    4: 2,
    5: 1,
    6: 0b0000_0011,
    7: 0x10
  });

  const metadata = parseNesRomMetadata(romBytes, {
    fileName: "sample-owned-test.nes",
    filePath: "D:\\Roms\\sample-owned-test.nes",
    md5: "0123456789ABCDEF0123456789ABCDEF",
    sha1: "abcdef1234567890abcdef1234567890abcdef12",
    sha256: "abcdef1234567890abcdef",
    sizeBytes: 40976
  });

  assert.equal(metadata.displayTitle, "sample-owned-test");
  assert.equal(metadata.fileName, "sample-owned-test.nes");
  assert.equal(metadata.filePath, "D:\\Roms\\sample-owned-test.nes");
  assert.equal(metadata.format, "iNES");
  assert.equal(metadata.versionLabel, "iNES");
  assert.equal(metadata.prgRomBanks, 2);
  assert.equal(metadata.prgRomKb, 32);
  assert.equal(metadata.chrRomBanks, 1);
  assert.equal(metadata.chrRomKb, 8);
  assert.equal(metadata.mapper, 16);
  assert.equal(metadata.mirroring, "Vertical");
  assert.equal(metadata.battery, true);
  assert.equal(metadata.trainer, false);
  assert.equal(metadata.md5, "0123456789abcdef0123456789abcdef");
  assert.equal(metadata.md5Short, "0123456789ab");
  assert.equal(metadata.sha1Short, "abcdef123456");
  assert.equal(metadata.sha256Short, "abcdef123456");
  assert.equal(metadata.sizeLabel, "40.0 KB");
  assert.equal(metadata.romProfileId, "unknown");
  assert.equal(metadata.romSupportLabel, "未识别");
});

test("detects NES 2.0 format and four-screen mirroring", () => {
  const romBytes = makeHeader({
    4: 4,
    5: 0,
    6: 0b0000_1000,
    7: 0b0000_1000
  });

  const metadata = parseNesRomMetadata(romBytes, {
    fileName: "demo.nes",
    filePath: "C:\\roms\\demo.nes",
    sizeBytes: 65552
  });

  assert.equal(metadata.displayTitle, "demo");
  assert.equal(metadata.format, "NES 2.0");
  assert.equal(metadata.versionLabel, "NES 2.0");
  assert.equal(metadata.prgRomKb, 64);
  assert.equal(metadata.chrRomKb, 0);
  assert.equal(metadata.mirroring, "Four-screen");
  assert.equal(metadata.battery, false);
});

test("keeps invalid ROM bytes safe and still reports local file information", () => {
  const metadata = parseNesRomMetadata(new Uint8Array([1, 2, 3, 4]), {
    fileName: "unknown.bin",
    filePath: "D:\\unknown.bin",
    sizeBytes: 4
  });

  assert.equal(metadata.displayTitle, "unknown");
  assert.equal(metadata.format, "Unknown");
  assert.equal(metadata.mapperLabel, "Unknown");
  assert.equal(metadata.sizeLabel, "4 B");
  assert.equal(metadata.romProfileId, "unknown");
});

test("decodes URL-safe ROM metadata headers", () => {
  assert.equal(decodeRomHeaderValue("D%3A%5Croms%5Csample-owned-test.nes"), "D:\\roms\\sample-owned-test.nes");
  assert.equal(decodeRomHeaderValue(null), "");
  assert.equal(formatRomSize(131088), "128.0 KB");
});

test("reads checksum headers from the local ROM endpoint", () => {
  const headers = new Headers({
    "x-rom-file-name": "contra_us_test.nes",
    "x-rom-file-path": "D%3A%5CAi-Play%5CROM%5Ccontra_us_test.nes",
    "x-rom-size": "131088",
    "x-rom-md5": "7BDAD8B4A7A56A634C9649D20BD3011B",
    "x-rom-sha1": "C9EA66BB7CB30AD5343F1721B1D4D3219859319B",
    "x-rom-sha256": "26541A5550EE22DEEB3D5484E4A96130219B58CFF74D068FB1EB6567FA5E5519"
  });

  const fileInfo = readRomMetadataHeaders(headers);

  assert.equal(fileInfo.filePath, "D:\\Ai-Play\\ROM\\contra_us_test.nes");
  assert.equal(fileInfo.sizeBytes, 131088);
  assert.equal(fileInfo.md5, "7bdad8b4a7a56a634c9649d20bd3011b");
  assert.equal(fileInfo.sha1, "c9ea66bb7cb30ad5343f1721b1d4d3219859319b");
  assert.equal(fileInfo.sha256, "26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519");
});

test("identifies the current Contra US strategy target ROM profile", () => {
  const profile = identifyRomProfile({
    md5: "7bdad8b4a7a56a634c9649d20bd3011b",
    sha1: "c9ea66bb7cb30ad5343f1721b1d4d3219859319b"
  });

  assert.equal(profile?.gameId, "contra");
  assert.equal(profile?.romProfileId, "contra-us-good");
  assert.equal(profile?.support, "supported");

  const metadata = parseNesRomMetadata(makeHeader({ 4: 8, 5: 0 }), {
    fileName: "contra_us_test.nes",
    filePath: "D:\\Ai-Play\\ROM\\contra_us_test.nes",
    md5: profile?.md5,
    sha1: profile?.sha1,
    sizeBytes: 131088
  });

  assert.equal(metadata.versionLabel, "Contra (U) [!]");
  assert.equal(metadata.romProfileId, "contra-us-good");
  assert.equal(metadata.romSupportLabel, "正式适配");
  assert.equal(metadata.compatibilityGroup, "contra-us");
});

test("bundled Contra stage 1 strategy files are valid and ROM-bound", () => {
  const strategyDir = new URL("../apps/browser-cockpit/public/strategies/contra/stage1/", import.meta.url);
  const strategyFiles = fs.readdirSync(strategyDir).filter((fileName) => fileName.endsWith(".json")).sort();

  assert.deepEqual(strategyFiles, [
    "stage1-combat.json",
    "stage1-guard.json",
    "stage1-loot.json",
    "stage1-speedrun.json",
    "stage1-survival.json"
  ]);

  for (const fileName of strategyFiles) {
    const plan = JSON.parse(fs.readFileSync(new URL(fileName, strategyDir), "utf8"));
    assert.equal(plan.gameId, "contra", fileName);
    assert.equal(plan.romProfileId, "contra-us-good", fileName);
    assert.equal(plan.compatibilityGroup, "contra-us", fileName);
    assert.equal(plan.stage, 1, fileName);
    assert.ok(Array.isArray(plan.segments), fileName);
    assert.ok(plan.segments.length >= 6, fileName);
    for (const segment of plan.segments) {
      assert.equal(typeof segment.worldStart, "number", `${fileName}:${segment.id}`);
      assert.equal(typeof segment.worldEnd, "number", `${fileName}:${segment.id}`);
      assert.ok(segment.worldEnd > segment.worldStart, `${fileName}:${segment.id}`);
    }
  }
});
