# 讨论记录分流规则

## 目的

项目讨论过程中出现的不同内容，必须进入不同文档。
不能把界面、策略、ROM、情绪价值、训练、测试全部写进同一个大文件。

这样做的目的：

- 保持项目长期可维护。
- 让每类决策都有明确归属。
- 方便后续子对话、测试、训练和版本保存。
- 避免产品体验内容污染策略代码。
- 避免技术实现内容污染陪玩表达。

## 分流规则

| 讨论内容 | 记录位置 | 说明 |
| --- | --- | --- |
| 项目总目标、MVP、边界 | `docs/00_PROJECT_CONTEXT.md` | 只记录最高层目标和当前阶段边界 |
| 架构、平台分工、浏览器/Python/ROM/Profile | `docs/01_ARCHITECTURE.md` | 记录系统结构和长期技术路线 |
| 当前任务、下一步、禁止事项 | `docs/04_TASK_BOARD.md` | 记录可执行任务，不写长篇解释 |
| 已确认的重要决策 | `docs/05_DECISION_LOG.md` | 记录不可轻易反复的项目决策 |
| ROM 合规、版本识别、哈希、资料绑定 | `docs/06_ROM_POLICY.md` 和 `docs/09_ROM_VERSION_MATRIX.md` | ROM 文件不进仓库，只记录识别和适配信息 |
| Game Profile 通用平台规划 | `docs/10_GAME_PROFILE_ARCHITECTURE.md` 和 `docs/11_GAME_PROFILE_ROADMAP.md` | 记录多游戏扩展，不和魂斗罗策略混写 |
| 界面、主机、电视、手柄、数据显化 | 后续建立 `docs/15_UI_EXPERIENCE.md` | 记录物理驾驶舱、操作直觉、信息密度和界面验收 |
| 陪玩情绪价值、对话、表达、反馈 | `docs/12_COMPANION_EXPERIENCE.md` | 记录 AI 如何让玩家觉得是在和队友一起玩 |
| 策略目标、策略类型、通关验收 | `docs/13_STRATEGY_SYSTEM_REQUIREMENTS.md` | 记录单 AI、人类 + AI、双 AI 的策略目标 |
| 训练、轨迹、语料库、玩家自定义策略 | 后续建立 `docs/16_TRAINING_DATA_PIPELINE.md` | 记录训练资料格式、轨迹采集和语料库规则 |
| 测试证据、浏览器测试、真实运行结果 | 后续建立 `docs/17_VALIDATION_LOG.md` | 记录每次真实测试结果和残留问题 |

## PM 总控台执行规则

- 每次讨论后，PM 必须判断内容属于哪个文档。
- 如果讨论产生新原则，优先写入设计文档。
- 如果讨论产生可执行任务，写入任务板。
- 如果讨论产生不可反复的项目决定，写入决策日志。
- 如果讨论只是临时想法，不立刻进入主文档；先进入对应主题的“候选/待验证”段落。
- 代码实现完成并验证后，再把状态从“计划中”改为“已实现/已验证”。

## 当前新增缺口

需要后续补充三个专门文档：

- `docs/15_UI_EXPERIENCE.md`
- `docs/16_TRAINING_DATA_PIPELINE.md`
- `docs/17_VALIDATION_LOG.md`

这些文件应在对应主题进入实质开发或测试时创建，避免空文档过多。
