# Contributing and Development Guide / 贡献与开发说明

## Development Environment / 开发环境

Use Node.js 22 or newer.

请使用 Node.js 22 或更新版本。

Install dependencies / 安装依赖：

```powershell
npm ci
```

Run the browser cockpit / 运行浏览器驾驶舱：

```powershell
npm run dev:cockpit
```

Run verification / 运行验证：

```powershell
npm test
npm run build
git diff --check
```

## Scope / 修改范围

Please keep changes focused. Avoid mixing unrelated UI, runtime, training, and documentation work in one commit.

请保持修改范围清晰。避免在一个提交里混合无关的 UI、运行时、训练和文档工作。

## Strategy Packs / 策略包

Strategy pack source files are stored in:

策略包源文件位于：

```text
strategy-packs/
```

Runtime exports are generated or synchronized into:

运行时导出会生成或同步到：

```text
apps/browser-cockpit/public/strategies/
```

After changing `strategy-packs/contra/stages/stage-1/stage-plan.json`, regenerate runtime exports:

修改 `strategy-packs/contra/stages/stage-1/stage-plan.json` 后，请重新生成运行时导出：

```powershell
npm run sync:strategies
```

Do not promote a strategy from `candidate` to `validated` unless real validation reports and quality gates support it.

除非有真实 ValidationReport 且必要质量门通过，否则不要把策略从 `candidate` 提升为 `validated`。

## Git Rules / Git 规则

Stage files intentionally. Do not use broad staging for release commits.

请有意识地逐项暂存文件。发布提交不要使用粗暴的全量暂存。

Do not commit / 不得提交：

- `codex-*`
- `*.patch`
- `*_BACKUP*`
- `node_modules/`
- `candidate-overlays/`
- `segment-search-reports/`
- `states/`
- `data/training/contra/runtime_runs/**/candidate-overlays/`
- `data/training/contra/runtime_runs/**/segment-search-reports/`
- `data/training/contra/runtime_runs/**/states/`

## ROM and Asset Rules / ROM 与资产规则

Do not commit ROMs, BIOS files, save states, commercial archives, or ROM download links.

不要提交 ROM、BIOS、即时存档、商业压缩包或 ROM 下载链接。

Use local environment variables for ROM testing:

测试 ROM 时请使用本地环境变量：

```powershell
$env:FC_AI_COMPANION_ROM_PATH="D:\your-rom-folder\your-game.nes"
npm run dev:cockpit
```

## Public Release Process / 公开发布流程

For a public release:

公开发布时：

1. Update release notes and checklist. / 更新发布说明和检查清单。
2. Sync strategy runtime exports. / 同步运行时策略导出。
3. Run tests, build, audit, and diff checks. / 运行测试、构建、审计和 diff 检查。
4. Commit only intended source, docs, tests, and strategy package files. / 只提交预期的源码、文档、测试和策略包文件。
5. Tag the release, for example `v0.1.0`. / 创建发布 tag，例如 `v0.1.0`。
6. Push branch and tag after the GitHub remote is configured. / 配置 GitHub remote 后再推送分支和 tag。
7. Create a GitHub Release with bilingual release notes. / 使用中英双语发布说明创建 GitHub Release。
