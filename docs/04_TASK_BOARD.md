# 任务板

## 当前

- 验收物理化浏览器驾驶舱 V0 外壳。
- 验收左右 1P / 2P 实体手柄舱。
- 验收中间电视与电视下方三按钮主机布局。
- 验收 RAM Reader V0、WorldX 推导和入局后战绩统计。
- 验收 1P / 2P 名称随人类、AI、混合模式自动变化。
- 验收 AI 操作层 V0：自动入局、向右推进、射击、基础跳跃。
- 验收 2P 门禁：未检测到双人模式时，2P AI 不写入手柄、不累计战绩。
- 验收 autorun 不干扰主机暂停 / 继续。
- 验收中等宽度下仍保持 1P / 电视 / 2P 三栏物理布局。
- 将不可靠 killCount 文案降级为“疑似击破”。
- 数据流增加运行状态，暂停时统计显示“暂停中”。
- 2P 面板接入死亡事件统计；双人局中显示队伍级“疑似击破”推导值。
- 接入 Score & Destruction Tracker V0：真实分数、四格战果、武器获得、行为数据分行显示。
- 接入陪玩策略 V0：快速推进、清敌优先、奖励优先、护卫队友。
- 接入第一关 Route Script V0：独立策略 JSON、运行时加载、按 WorldX 段落执行、Boss 停位射击。
- 接入 1P AI 双人菜单辅助：当 1P 处于 AI / 混合且 2P 请求 AI / 混合时，由 1P 按真实菜单逻辑选择双人局。
- 接入策略设计窗口 V0：编辑第一关 Route Script JSON，保存为浏览器本地个人策略，并可设为 1P / 2P 当前策略。
- 接入全面数据显化 V0：运行、路线、1P、2P、战斗、累计、敌人槽、子弹槽和人类轨迹记录/导出。
- 接入玩家卡片双开关控制：头像卡通战士，右侧人类 / AI 双开关表达人类、AI、混合三种模式。
- 接入策略按钮组：去掉 AI 策略下拉和重复模式信息，玩家常用区只保留正式策略按钮。
- 新增稳健生存策略，并设为 1P / 2P 默认 AI 策略；AI 未启用时不显示策略选中态。
- 建立 ROM 版本矩阵：外部资料、TAS、RAM map、Route Script 和语料资料必须绑定 ROM 版本。
- 建立 FC 通用平台 Game Profile 架构：魂斗罗作为第一个 Game Profile，不作为平台边界。
- 建立首批 Game Profile 路线图：先魂斗罗系列，再赤色要塞，首批八强覆盖不同 FC 游戏能力。
- 发布 FC 游戏 AI 操作策略标准手册 1.0.0：`docs/16_OPERATION_STRATEGY_STANDARD.md` 是标准手册总入口，已包含策略分类、形成过程、输入资料、输出文件、Runtime 调用、语义化意图融合、输入采样延迟、RNG 影响范围、安全守则、验收等级、数据可信度和统一开发流程；通用核心协议以 `docs/STRATEGY_PROTOCOL_CORE.md` 为准；Contra US 专用落地经验进入 `references/contra-us/IMPLEMENTATION_GUIDE.md`；当前 Contra US 第一关 StrategyPack 示例进入 `references/contra-us/strategy-db/contra-us-stage1-strategy-pack-example.md`。

## 下一步

- 按操作策略标准拆解 `2026-06-06T23-55-55-772Z-human-run-analysis.md`，把人工正例和反例写入 Contra US 第一关策略片段库。
- 按 `docs/STRATEGY_PROTOCOL_CORE.md` 把 Contra US 示例 StrategyPack 拆成实际 JSON 文件：`manifest.json`、`game-profile.json`、`rom-profile.json`、`condition-registry.json`、`entity-taxonomy.json`、`action-map.json`、`strategy-types.json`、`stage-plan.json`、`fragments.json`。
- 为 StrategyPack 建立 `schemas/` 文件清单，并先实现 `manifest.schema.json`、`rom-profile.schema.json`、`condition-registry.schema.json`、`entity-taxonomy.schema.json`、`action-map.schema.json`、`fragments.schema.json` 和 `runtime-api.schema.json`。
- 在策略加载器里增加 ROM 兼容等级和错误码：`exact-match`、`compatible-tested`、`reference-only`、`blocked`。
- 本地 ROM 端点增加 MD5 / SHA1 / SHA256 三种哈希输出。
- 浏览器驾驶舱显示 ROM Profile 支持状态：已支持 / 实验 / 仅参考 / 未支持。
- Route Script 增加 `gameId` 和 `romProfileId` 或兼容组字段。
- 将当前 `public/strategies/contra` 逐步迁移到 `public/game-profiles/contra`。
- 建立外部资料登记表：来源 URL、资料类型、目标 ROM、适配等级、验证状态。
- 按 `docs/11_GAME_PROFILE_ROADMAP.md` 执行首批八强路线，不在魂斗罗主 profile 稳定前深度接入第二游戏。
- 验收双手柄输入不破坏 V0.1.0 的 1P 输入。
- 验收主机三按钮：更换卡带 / 暂停继续 / Reset。
- 验证 RAM state schema 在真实 ROM 运行中的稳定性。
- 验证 WorldX 推导与 Stage 1 路线地标是否匹配。
- 补 2P 坐标、生命、武器、跳跃等 RAM map。
- 验证双人模式 RAM 字段 `0x0022` 在真实双人局中的稳定性。
- 验证 `p2State / p2DeathFlag` 死亡事件统计在真实双人局中的稳定性。
- 验证 killCount 推导过滤条件。
- 验证 Score & Destruction Tracker V0 的战果分类：普通敌兵 / 炮台火力 / 飞行物 / Boss部件。
- 验证 `0x0588 + slot` Enemy Score Collision 与分数上涨事件的对应关系。
- 验证玩家子弹 owner 字段对 1P / 2P 实际发弹归属的稳定性。
- 验证武器获得统计：M / S / F / L / R / B。
- 验证陪玩策略 V0 在真实双人局中的输入稳定性。
- 验证护卫队友策略在 2P 坐标接入前的边界是否符合玩家直觉。
- 验证第一关 Route Script V0 的三类通关：单 AI、人类 + AI、双 AI。
- 标定第一关 WorldX 路线段、Boss 停位点和危险跳跃点。
- 基于人类实战轨迹，把个人策略窗口升级为“观察 -> 生成候选策略 -> 保存”。
- 用人类模式打一局并导出轨迹 JSON，标定第一关关键跳跃、停位、开火和死亡点。
- 基于 RAM Reader V0 实现 Danger Detector V0。
- 设计并实现 V0 战术调试驾驶舱面板。
- 实现 Danger Detector V0。
- 验证并迭代 Route Script V0。
- 实现 Action Lock V0。
- 实现 FSM V0。

## 后续

- 陪玩文字事件流。
- 性格与协同系统。
- TTS。
- 训练管线。
- 强化学习实验。

## 禁止 / 延后

- 复杂语音系统。
- 直播功能。
- 高级 UI 动画。
- 强化学习优先。
- 计算机视觉主路线。
- 截图 / OCR 驱动 Bot 逻辑。
- LLM 控制快脑。
