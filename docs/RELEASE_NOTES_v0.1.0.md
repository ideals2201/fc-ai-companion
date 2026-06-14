# Release Notes: v0.1.0 / 发布说明：v0.1.0

Date: 2026-06-14
日期：2026-06-14

## Interface Preview / 界面预览

The images below show the complete browser cockpit release, followed by English and Chinese side-panel previews. ROM files and private runtime output are not included.

以下图片展示完整浏览器驾驶舱版本，并分别提供英文、中文侧栏预览。发布内容不包含 ROM 文件或私有运行产物。

<img src="https://raw.githubusercontent.com/ideals2201/fc-ai-companion/main/docs/assets/screenshots/browser-cockpit-v0.1.0.png" alt="FC AI Companion browser cockpit" width="720">

English pilot panels / 英文角色侧栏：

<img src="https://raw.githubusercontent.com/ideals2201/fc-ai-companion/main/docs/assets/screenshots/pilot-panel-1p-en-v0.1.0.png" alt="1P pilot panel in English" width="280">
<img src="https://raw.githubusercontent.com/ideals2201/fc-ai-companion/main/docs/assets/screenshots/pilot-panel-2p-en-v0.1.0.png" alt="2P pilot panel in English" width="280">

中文角色侧栏：

<img src="https://raw.githubusercontent.com/ideals2201/fc-ai-companion/main/docs/assets/screenshots/pilot-panel-1p-v0.1.0.png" alt="1P 实体手柄舱" width="280">
<img src="https://raw.githubusercontent.com/ideals2201/fc-ai-companion/main/docs/assets/screenshots/pilot-panel-2p-v0.1.0.png" alt="2P 实体手柄舱" width="280">

## Summary / 摘要

`v0.1.0` is the first public source release of FC AI Companion Cockpit.

`v0.1.0` 是 FC AI Companion Cockpit 的首个公开源码版本。

This release focuses on a browser-based NES/FC companion cockpit rather than an auto-clear bot. It provides a runnable local cockpit, input routing, RAM-backed tactical state, strategy package scaffolding, synchronized runtime strategy exports, and a tested Contra Stage 1 candidate baseline.

本版本重点是浏览器 NES/FC 陪玩驾驶舱，而不是自动通关机器人。它提供可本地运行的驾驶舱、输入路由、基于 RAM 的战术状态、策略包结构、同步后的运行时策略导出，以及经过测试的《魂斗罗》第一关候选基线。

This first version is also a public test checkpoint. The feature set is intentionally broad because the requirements grew during real exploration. Later releases should optimize the structure, simplify workflows, and polish the experience.

第一版也是一个公开测试节点。由于需求是在真实探索过程中逐步成长出来的，当前功能面有意保留得比较完整。后续版本应继续优化结构、简化流程并打磨体验。

## Included / 已包含

- Browser cockpit app powered by React, Vite, and JSNES. / 基于 React、Vite 和 JSNES 的浏览器驾驶舱。
- Local development ROM loading through ignored user-owned paths. / 通过已忽略的用户自有路径加载本地 ROM。
- 1P/2P control routing for human, AI, mixed, panel, gamepad, TAS-watch, and system inputs. / 1P/2P 人类、AI、混合、面板、手柄、TAS 观看和系统输入路由。
- Contra Stage 1 candidate trained strategy package. / 《魂斗罗》第一关候选训练策略包。
- Runtime strategy exports under `apps/browser-cockpit/public/strategies/contra/stage1/`. / 位于 `apps/browser-cockpit/public/strategies/contra/stage1/` 的运行时策略导出。
- Performance stabilization for long-running browser cockpit sessions. / 长时间运行浏览器驾驶舱的性能稳定优化。
- CI coverage for tests and production build. / CI 覆盖测试和生产构建。
- Public release documentation, ROM policy, security policy, and source-available license notice. / 公开发布文档、ROM 政策、安全策略和 source-available 许可说明。

## Not Included / 不包含

- ROM files / ROM 文件
- BIOS files / BIOS 文件
- Save states / 即时存档
- Commercial game archives / 商业游戏压缩包
- Private credentials / 私密凭据
- Local generated candidate-search output / 本地生成的候选搜索输出

## Strategy Pack Status / 策略包状态

The included Contra strategy pack is `contra-stage1-strategy-v0` at version `0.1.0`. Its status remains `candidate`.

随版本发布的《魂斗罗》策略包是 `contra-stage1-strategy-v0`，版本为 `0.1.0`，状态仍为 `candidate`。

This means the package contains trained and documented strategy data, but the release does not claim a fully validated clear.

这表示该策略包包含已经训练归纳和文档化的策略数据，但本发布不声明已经完成完整通关验证。

## Verification / 验证

Release verification commands / 发布验证命令：

```powershell
npm test
npm run build
git diff --check
```

The browser cockpit can be run locally with / 浏览器驾驶舱可通过以下命令本地运行：

```powershell
npm run dev:cockpit
```
