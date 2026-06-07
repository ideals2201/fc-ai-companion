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
  findLoadedRomEntryId,
  resolveSelectedRomIdAfterLoadedSync
} = await importTypeScriptModule(
  new URL("../apps/browser-cockpit/src/romLibrarySelection.ts", import.meta.url)
);

test("finds the ROM library entry that matches the loaded cartridge checksum", () => {
  const entries = [
    {
      id: "server:battle-city/Battle City (J).nes",
      metadata: {
        md5: "cd4fe2e78df096a157b43d9a5b9805aa",
        headerlessMd5: "other",
        sha1: "e1061c9241b0"
      }
    },
    {
      id: "server:contra_us_test.nes",
      metadata: {
        md5: "7bdad8b4a7a56a634c9649d20bd3011b",
        headerlessMd5: "5a5c2f4f1cafb1f55a8dc0d5ad4550e5",
        sha1: "c9ea66bb7cb30ad5343f1721b1d4d3219859319b"
      }
    }
  ];

  const loaded = {
    md5: "7bdad8b4a7a56a634c9649d20bd3011b",
    headerlessMd5: "5a5c2f4f1cafb1f55a8dc0d5ad4550e5",
    sha1: "c9ea66bb7cb30ad5343f1721b1d4d3219859319b"
  };

  assert.equal(findLoadedRomEntryId(entries, loaded), "server:contra_us_test.nes");
});

test("keeps selection unchanged when no loaded cartridge match exists", () => {
  assert.equal(findLoadedRomEntryId([], { md5: "x", headerlessMd5: "y", sha1: "z" }), null);
});

test("does not override a manual ROM selection with the loaded cartridge", () => {
  const entries = [
    {
      id: "server:contra_us_test.nes",
      metadata: {
        md5: "7bdad8b4a7a56a634c9649d20bd3011b",
        headerlessMd5: "5a5c2f4f1cafb1f55a8dc0d5ad4550e5",
        sha1: "c9ea66bb7cb30ad5343f1721b1d4d3219859319b"
      }
    },
    {
      id: "server:contra-j/Contra (J).nes",
      metadata: {
        md5: "0e40bc1b049c16c5d7246cc28399cb5d",
        headerlessMd5: "d306c54ccfdf5cb4f8ec588f19b3e33d",
        sha1: "376836361f404c815d404e1d5903d5d11f4eff0e"
      }
    }
  ];
  const loadedContraUs = entries[0].metadata;

  assert.equal(
    resolveSelectedRomIdAfterLoadedSync(entries, loadedContraUs, "server:contra-j/Contra (J).nes", true),
    "server:contra-j/Contra (J).nes"
  );
  assert.equal(
    resolveSelectedRomIdAfterLoadedSync(entries, loadedContraUs, "server:contra-j/Contra (J).nes", false),
    "server:contra_us_test.nes"
  );
});
