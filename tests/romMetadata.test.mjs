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
  parseNesRomMetadata
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
  assert.equal(metadata.sha256Short, "abcdef123456");
  assert.equal(metadata.sizeLabel, "40.0 KB");
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
});

test("decodes URL-safe ROM metadata headers", () => {
  assert.equal(decodeRomHeaderValue("D%3A%5Croms%5Csample-owned-test.nes"), "D:\\roms\\sample-owned-test.nes");
  assert.equal(decodeRomHeaderValue(null), "");
  assert.equal(formatRomSize(131088), "128.0 KB");
});
