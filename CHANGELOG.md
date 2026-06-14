# Changelog / 更新日志

All notable public release changes are recorded here.
所有重要公开发布变更记录在此。

## v0.1.0 - 2026-06-14

### Added / 新增

- First public source release of FC AI Companion Cockpit. / FC AI Companion Cockpit 首个公开源码版本。
- Browser cockpit runtime based on React, Vite, and JSNES. / 基于 React、Vite 和 JSNES 的浏览器驾驶舱运行时。
- Local ROM loading through user-owned ignored paths. / 通过用户自有且被忽略的本地路径加载 ROM。
- 1P/2P human, AI, mixed, panel, gamepad, TAS-watch, and system input routing. / 1P/2P 人类、AI、混合、面板、手柄、TAS 观看和系统输入路由。
- Contra Stage 1 candidate trained strategy pack. / 魂斗罗第一关候选训练策略包。
- Runtime strategy exports for survival, speedrun, combat, loot, and guard routes. / 生存、竞速、战斗、奖励和护卫路线的运行时策略导出。
- Bilingual public documentation for background, development process, contribution, communication, ROM policy, security, and release notes. / 中英双语公开文档，包括背景、开发过程、贡献、沟通、ROM 政策、安全和发布说明。
- GitHub Actions CI for tests and production build. / 用于测试和生产构建的 GitHub Actions CI。

### Changed / 变更

- Upgraded Vite and React plugin toolchain to remove audit vulnerabilities. / 升级 Vite 和 React 插件工具链以消除审计漏洞。
- Clarified that the repository is source-available, not open-source licensed. / 明确仓库是 source-available，而不是已授予开源许可证。
- Clarified that `v0.1.0` is a first public test version, not the final simplified product. / 明确 `v0.1.0` 是首个公开测试版，不是最终简化产品。
- Documented that the current broad feature surface grew during exploration and should be simplified in later versions. / 说明当前较宽的功能面来自探索过程，后续版本应继续简化。

### Fixed / 修复

- Stabilized long-running cockpit performance by bounding trace memory and reducing unnecessary runtime input React state churn. / 通过限制 trace 内存和减少运行时输入的无意义 React 状态刷新，提升长时间运行稳定性。

### Not Included / 不包含

- ROM files, BIOS files, save states, commercial archives, private credentials, and local generated candidate-search artifacts. / ROM、BIOS、即时存档、商业压缩包、私密凭据和本地生成的候选搜索产物。

### Verification / 验证

- `npm audit`
- `npm test`
- `npm run build`
- `git diff --check`
