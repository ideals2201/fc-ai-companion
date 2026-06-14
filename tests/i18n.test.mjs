import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const mainSource = fs.readFileSync(new URL("../apps/browser-cockpit/src/main.tsx", import.meta.url), "utf8");

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
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  t,
  uiTranslations
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/i18n.ts", import.meta.url));

test("uses Chinese as the default cockpit UI language", () => {
  assert.equal(DEFAULT_LANGUAGE, "zh-CN");
  assert.equal(t("zh-CN", "language.zh"), "中文");
  assert.equal(t("en-US", "language.zh"), "Chinese");
});

test("normalizes unsupported language values back to the default", () => {
  assert.equal(normalizeLanguage("en-US"), "en-US");
  assert.equal(normalizeLanguage("zh-CN"), "zh-CN");
  assert.equal(normalizeLanguage("fr-FR"), "zh-CN");
  assert.equal(normalizeLanguage(null), "zh-CN");
});

test("keeps internal keys stable and falls back safely for missing text", () => {
  assert.equal(t("zh-CN", "tas.windowTitle"), "TAS 观赏 / 训练基座");
  assert.equal(t("en-US", "tas.windowTitle"), "TAS Watch / Training Base");
  assert.equal(t("zh-CN", "missing.key"), "missing.key");
  assert.equal(Object.keys(uiTranslations["zh-CN"]).length, Object.keys(uiTranslations["en-US"]).length);
});

test("localizes the center TV no-ROM overlay message", () => {
  assert.equal(t("zh-CN", "tv.noRomMessage"), "加载本地用户自有 ROM 后开始真实模拟器测试。");
  assert.equal(t("en-US", "tv.noRomMessage"), "Load a local user-owned ROM to start real emulator testing.");
  assert.match(mainSource, /const overlayMessage = status === "no-rom" \? t\(uiLanguage, "tv\.noRomMessage"\) : message;/);
  assert.match(mainSource, /<strong>\{overlayMessage\}<\/strong>/);
  assert.doesNotMatch(mainSource, /<strong>\{message\}<\/strong>/);
});
