import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function localRomPlugin(mode: string): Plugin {
  const env = loadEnv(mode, repoRoot, "");
  const romPath = env.FC_AI_COMPANION_ROM_PATH
    ? path.resolve(env.FC_AI_COMPANION_ROM_PATH)
    : "";

  return {
    name: "fc-ai-local-rom",
    configureServer(server) {
      server.middlewares.use("/api/local-test-rom", (_req, res) => {
        if (!romPath || !fs.existsSync(romPath) || !fs.statSync(romPath).isFile()) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({
            ok: false,
            message: "未配置本地测试 ROM。请在 .env.local 中设置 FC_AI_COMPANION_ROM_PATH。"
          }));
          return;
        }

        res.statusCode = 200;
        res.setHeader("content-type", "application/octet-stream");
        res.end(fs.readFileSync(romPath));
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
