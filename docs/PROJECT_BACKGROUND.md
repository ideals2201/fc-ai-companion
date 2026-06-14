# Project Background / 项目背景

## Why This Project Exists / 为什么做这个项目

FC AI Companion Cockpit explores a different direction from ordinary game automation. The goal is not to replace the player or prove that an AI can clear a game by itself. The goal is to build an AI teammate that can observe the same runtime state, react frame by frame, and create a believable companion-play experience.
FC AI Companion Cockpit 探索的是不同于普通游戏自动化的方向。目标不是替代玩家，也不是证明 AI 可以独自通关，而是构建一个能观察同一运行时状态、逐帧反应、并形成真实陪玩感的 AI 队友。

The first public version focuses on NES/FC games because the runtime is small enough for precise RAM observation, deterministic input routing, and repeatable strategy experiments.
首个公开版本选择 NES/FC 游戏，是因为运行时足够小，适合做精确 RAM 观察、确定性输入路由和可重复策略实验。

## Product Positioning / 产品定位

This is a browser cockpit, not a hidden bot runner.
这是一个浏览器驾驶舱，不是隐藏式机器人运行器。

The player should be able to see:
玩家应该能看到：

- runtime status / 运行状态
- controller ownership / 手柄控制权
- AI strategy state / AI 策略状态
- RAM-backed tactical facts / 基于 RAM 的战术事实
- strategy package metadata / 策略包元数据
- training and validation status / 训练与验证状态

## Maintainer Background / 维护者背景

This project was initiated by a 50+ lifelong learner with no traditional technical background, but with long-running curiosity about games, tools, and how AI can help people build things they genuinely care about.
本项目由一位 50+ 终身学习者发起。发起人没有传统技术背景，但长期对游戏、工具，以及 AI 如何帮助普通人做自己真正喜欢的事情保持好奇。

AI-assisted development made it possible to turn that curiosity into a working software project: a browser runtime, a visible cockpit, RAM-based game-state analysis, strategy package organization, tests, documentation, and release discipline.
在 AI 赋能后，这份好奇心被转化成了一个可运行的软件项目：浏览器运行时、可视化驾驶舱、基于 RAM 的游戏状态分析、策略包归纳、测试、文档和正式发布流程。

The public meaning of this project is therefore not only technical. It is also an example of how a non-traditional builder can use AI as a practical partner to keep learning, keep building, and make personally meaningful ideas real.
因此，本项目的公开意义不只是技术本身。它也展示了一个非传统技术背景的构建者，如何把 AI 当作实践伙伴，持续学习、持续构建，并把自己真正感兴趣的想法变成现实。

For public release, this background is intentionally privacy-preserving. Personal identity, private accounts, local machine details, and unpublished business context are not part of the public repository.
为了公开发布，这段背景刻意保护隐私。个人身份、私人账号、本地机器细节和未公开商业背景不纳入公开仓库。

## First Public Target / 首个公开目标

The first public target is Contra Stage 1 with a candidate trained strategy package.
首个公开目标是魂斗罗第一关，并附带候选训练策略包。

The release includes enough data for runtime strategy loading and continued development, but it does not claim a finished no-death clear.
该发布包含足够的运行时策略加载数据和后续开发资料，但不声明已完成无死亡通关。

## First Version Intent / 第一版定位

The requirements grew step by step during development. As the project moved from curiosity to a runnable cockpit, more needs appeared: runtime control, strategy packaging, training evidence, bilingual documentation, release checks, and public communication rules.
本项目的需求是在开发过程中一步步成长出来的。随着项目从好奇心走向可运行驾驶舱，新的需求不断出现：运行时控制、策略包归纳、训练证据、中英双语文档、发布检查和公开沟通规则。

Because of that growth, `v0.1.0` is intentionally treated as a first public test version, not as a final simplified product. It is useful because it preserves the whole learning path and working system, but it is also visibly complex.
因此，`v0.1.0` 被明确定位为首个公开测试版本，而不是最终简化产品。它的价值在于保留了完整学习路径和可运行系统，但它也确实已经呈现出较高复杂度。

Future versions should reduce unnecessary complexity, separate modules more clearly, improve the user experience, and keep promoting strategy data only through evidence and validation.
后续版本应减少不必要的复杂度，更清晰地拆分模块，优化用户体验，并继续坚持只有通过证据和验证的策略数据才进入更高等级发布。

## Non-Goals / 非目标

This project does not provide:
本项目不提供：

- commercial ROMs or BIOS files / 商业 ROM 或 BIOS
- ROM download links / ROM 下载链接
- save-state payloads / 即时存档载荷
- a cheating service for online games / 在线游戏作弊服务
- a general-purpose autonomous game-playing bot / 通用自动游戏机器人

## Core Design Beliefs / 核心设计信念

- Companion feeling matters more than raw completion. / 陪玩感比单纯通关更重要。
- RAM observation is more reliable than screen OCR for this class of runtime. / 对此类运行时，RAM 观察比屏幕 OCR 更可靠。
- A strategy package must separate evidence, candidate fragments, runtime exports, and validation claims. / 策略包必须区分证据、候选片段、运行时导出和验证声明。
- TAS-derived data is useful training evidence, not a live AI controller. / TAS 派生数据是有用训练证据，不是实时 AI 控制器。
- Public releases must never include ROM bytes or local private artifacts. / 公开发布绝不能包含 ROM 字节或本地私有产物。
