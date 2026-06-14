# Development Process / 开发过程

## From Curiosity To A Running System / 从好奇到可运行系统

This project started from a personal question: if AI can help a non-traditional builder learn and create, can it also help turn an old game memory into a real companion-play product?
这个项目起源于一个个人问题：如果 AI 可以帮助非传统技术背景的人学习和创造，它是否也能帮助把一段老游戏记忆变成一个真实可运行的陪玩产品？

The process did not begin with a finished architecture. It began with curiosity, repeated questions, small experiments, visible failures, and constant version checkpoints.
这个过程不是从一套完整架构开始的，而是从好奇、反复提问、小实验、可见失败和持续版本归纳开始的。

## AI-Assisted Building / AI 协作构建

AI was used as a practical development partner, not as a magic replacement for judgment.
AI 在这里被用作实践开发伙伴，而不是替代判断力的魔法工具。

The workflow gradually became:
工作流逐步形成如下方式：

1. State the product intent. / 先说清产品意图。
2. Inspect the real code and runtime behavior. / 检查真实代码和运行状态。
3. Make a small change. / 做小步修改。
4. Run tests and build checks. / 运行测试和构建检查。
5. Record what changed and what remains uncertain. / 记录改动和仍不确定的部分。
6. Commit or tag meaningful checkpoints. / 对有意义的节点提交或打 tag。

This made it possible to work across UI, runtime, strategy data, tests, and release documentation without pretending that every idea was correct on the first try.
这种方式让项目可以跨越 UI、运行时、策略数据、测试和发布文档持续推进，同时不假装每个想法第一次就是正确的。

## What Was Learned / 学到的事情

- A playable AI companion needs visible state, not only hidden automation. / 可玩的 AI 陪伴需要可见状态，而不只是隐藏自动化。
- RAM-backed facts are more reliable than guessing from screenshots. / 基于 RAM 的事实比从截图猜测更可靠。
- Strategy data must be separated from validation claims. / 策略数据必须和验证声明分开。
- Candidate progress is valuable, but it must not be described as a completed clear. / 候选进展有价值，但不能说成已经通关。
- Tests, build checks, and Git checkpoints are what make AI-assisted development usable over time. / 测试、构建检查和 Git 节点让 AI 协作开发能够长期可用。

## Public Release Discipline / 公开发布纪律

For public release, the project keeps private local artifacts out of the repository and publishes only source, documentation, strategy package files, runtime exports, and sanitized evidence.
为了公开发布，项目将私人本地产物排除在仓库外，只发布源码、文档、策略包文件、运行时导出和已整理的证据。

The first public release is therefore not just a code dump. It is a versioned learning checkpoint: runnable, tested, documented, and honest about what is still candidate-level.
因此，首个公开版本不只是代码打包，而是一个版本化的学习节点：可运行、已测试、有文档，并且诚实标明哪些内容仍处于候选阶段。
