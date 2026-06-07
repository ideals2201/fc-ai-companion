import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

function isInsideDirectory(parentDir: string, childPath: string) {
  const relative = path.relative(parentDir, childPath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function readRomFileInfo(romPath: string, romLibraryDir: string) {
  const romBytes = fs.readFileSync(romPath);
  const romStat = fs.statSync(romPath);
  const relativePath = toPosixPath(path.relative(romLibraryDir, romPath));
  const hasINesHeader = romBytes.length > 16
    && romBytes[0] === 0x4e
    && romBytes[1] === 0x45
    && romBytes[2] === 0x53
    && romBytes[3] === 0x1a;
  const payloadBytes = hasINesHeader ? romBytes.subarray(16) : romBytes;
  return {
    id: relativePath,
    fileName: path.basename(romPath),
    filePath: romPath,
    relativePath,
    sizeBytes: romStat.size,
    headerBytes: Array.from(romBytes.slice(0, 16)),
    md5: crypto.createHash("md5").update(romBytes).digest("hex"),
    headerlessMd5: crypto.createHash("md5").update(payloadBytes).digest("hex"),
    sha1: crypto.createHash("sha1").update(romBytes).digest("hex"),
    sha256: crypto.createHash("sha256").update(romBytes).digest("hex")
  };
}

function listRomFiles(romLibraryDir: string) {
  if (!fs.existsSync(romLibraryDir) || !fs.statSync(romLibraryDir).isDirectory()) return [];
  const result: string[] = [];
  const stack = [romLibraryDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".nes")) {
        result.push(entryPath);
      }
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function localRomPlugin(mode: string): Plugin {
  const env = loadEnv(mode, repoRoot, "");
  const romLibraryDir = path.resolve(env.FC_AI_COMPANION_ROM_DIR || path.resolve(repoRoot, "../ROM"));
  const tasRootDir = path.resolve(repoRoot, "data", "tas");
  const configuredRomPath = env.FC_AI_COMPANION_ROM_PATH
    ? path.resolve(env.FC_AI_COMPANION_ROM_PATH)
    : "";
  const defaultRomPath = path.resolve(romLibraryDir, "contra_us_test.nes");

  function resolveRequestedRomPath(requestUrl?: string) {
    const url = new URL(requestUrl || "", "http://localhost");
    const requestedRom = url.searchParams.get("rom");
    if (!requestedRom) return configuredRomPath || defaultRomPath;
    const requestedPath = path.resolve(romLibraryDir, requestedRom);
    if (!isInsideDirectory(romLibraryDir, requestedPath)) return "";
    return requestedPath;
  }

  function resolveRequestedTasPath(requestUrl?: string) {
    const url = new URL(requestUrl || "", "http://localhost");
    const gameId = url.searchParams.get("gameId") || "contra";
    const romProfileId = url.searchParams.get("romProfileId") || "";
    const fileName = url.searchParams.get("file") || "";
    if (!gameId || !romProfileId || !fileName || !fileName.toLowerCase().endsWith(".fm2")) return "";
    const profileDir = path.resolve(tasRootDir, gameId, romProfileId);
    const requestedPath = path.resolve(profileDir, fileName);
    if (!isInsideDirectory(tasRootDir, profileDir) || !isInsideDirectory(profileDir, requestedPath)) return "";
    return requestedPath;
  }

  return {
    name: "fc-ai-local-rom",
    configureServer(server) {
      server.middlewares.use("/api/local-roms", (_req, res) => {
        const roms = listRomFiles(romLibraryDir).map((romPath) => readRomFileInfo(romPath, romLibraryDir));
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
          ok: true,
          romLibraryDir,
          roms
        }));
      });

      server.middlewares.use("/api/local-test-rom", (req, res) => {
        const romPath = resolveRequestedRomPath(req.url);
        if (!romPath || !fs.existsSync(romPath) || !fs.statSync(romPath).isFile()) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({
            ok: false,
            message: "Local ROM not found. Set FC_AI_COMPANION_ROM_PATH or place .nes files in D:\\Ai-Play\\ROM."
          }));
          return;
        }

        const romInfo = readRomFileInfo(romPath, romLibraryDir);
        const romBytes = fs.readFileSync(romPath);

        res.statusCode = 200;
        res.setHeader("content-type", "application/octet-stream");
        res.setHeader("x-rom-file-name", encodeURIComponent(romInfo.fileName));
        res.setHeader("x-rom-file-path", encodeURIComponent(romInfo.filePath));
        res.setHeader("x-rom-relative-path", encodeURIComponent(romInfo.relativePath));
        res.setHeader("x-rom-size", String(romInfo.sizeBytes));
        res.setHeader("x-rom-md5", romInfo.md5);
        res.setHeader("x-rom-headerless-md5", romInfo.headerlessMd5);
        res.setHeader("x-rom-sha1", romInfo.sha1);
        res.setHeader("x-rom-sha256", romInfo.sha256);
        res.end(romBytes);
      });

      server.middlewares.use("/api/local-tas-file", (req, res) => {
        const tasPath = resolveRequestedTasPath(req.url);
        if (!tasPath || !fs.existsSync(tasPath) || !fs.statSync(tasPath).isFile()) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({
            ok: false,
            message: "Local TAS file not found under data\\tas."
          }));
          return;
        }

        res.statusCode = 200;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end(fs.readFileSync(tasPath, "utf8"));
      });
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localRomPlugin(mode)],
  envDir: repoRoot,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false
  }
}));
