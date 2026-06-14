# Public Release Checklist / 公开发布检查清单

Target release: `v0.1.0`
目标版本：`v0.1.0`

## Required Before Publishing / 发布前必须完成

- [x] Build passes with `npm run build`. / `npm run build` 通过。
- [x] Tests pass with `npm test`. / `npm test` 通过。
- [x] GitHub Actions runs tests and production build. / GitHub Actions 同时运行测试和生产构建。
- [x] ROM, BIOS, save-state, archive, and local secret patterns are ignored. / ROM、BIOS、即时存档、压缩包和本地密钥模式已加入忽略规则。
- [x] Browser cockpit README documents Windows and macOS/Linux local ROM setup. / 浏览器驾驶舱 README 已说明 Windows 和 macOS/Linux 的本地 ROM 配置。
- [x] ROM policy is readable and explicit. / ROM 政策可读且规则明确。
- [x] Strategy pack and runtime strategy exports are included. / 策略包和运行时策略导出已纳入发布。
- [x] Project background is documented in English and Chinese. / 项目背景已用中英双语说明。
- [x] Development process is documented in English and Chinese. / 开发过程已用中英双语说明。
- [x] Development and communication guidelines are documented in English and Chinese. / 开发说明和沟通准则已用中英双语说明。
- [x] Changelog and release notes are available. / 已提供更新日志和发布说明。
- [x] Source-available rights are explicit through `LICENSE`. / `LICENSE` 已明确 source-available 权利边界。
- [ ] Configure the GitHub remote. / 配置 GitHub remote。
- [ ] Push the release branch and tag. / 推送发布分支和 tag。
- [ ] Configure the repository description, topics, and private security contact. / 配置仓库描述、topics 和私密安全联系渠道。
- [ ] Decide whether the repository remains source-available only or later adopts an open-source license. / 决定仓库保持 source-available，还是后续采用开源许可证。

## Release Boundary / 发布边界

This first public version is the browser cockpit baseline for FC/NES companion play. It includes the JSNES browser runtime, local ROM loading hooks, control routing, strategy package structure, tests, and current documented training evidence.
首个公开版本是 FC/NES 陪玩驾驶舱的浏览器基线版本，包含 JSNES 浏览器运行时、本地 ROM 加载钩子、控制路由、策略包结构、测试和当前已记录的训练证据。

The Contra Stage 1 strategy pack is published as a candidate trained strategy package. It is usable as runtime strategy data, but it is not claimed as a fully validated no-death clear package.
魂斗罗第一关策略包以候选训练策略包形式发布，可作为运行时策略数据使用，但不声明为已完整验证的无死亡通关包。

This release is a first public test version. It intentionally preserves the current broad feature surface so the project can be inspected, tested, and improved; later releases should reduce complexity and optimize the user experience.
本发布是首个公开测试版本。它有意保留当前较完整的功能面，便于外部检查、测试和改进；后续版本应降低复杂度并优化用户体验。

It does not include ROMs, BIOS files, save states, commercial assets, private credentials, or local generated candidate-search output.
发布内容不包含 ROM、BIOS、即时存档、商业资产、私密凭据或本地生成的候选搜索输出。

## Local Artifact Policy / 本地产物规则

Keep these out of commits / 以下内容不得提交：

- `codex-*`
- `*.patch`
- `*_BACKUP*`
- `data/training/contra/runtime_runs/**/candidate-overlays/`
- `data/training/contra/runtime_runs/**/segment-search-reports/`
- `data/training/contra/runtime_runs/**/states/`
- `node_modules/`
- build outputs such as `dist/`, `build/`, `.vite/`, and `*.tsbuildinfo` / 构建输出，例如 `dist/`、`build/`、`.vite/` 和 `*.tsbuildinfo`
