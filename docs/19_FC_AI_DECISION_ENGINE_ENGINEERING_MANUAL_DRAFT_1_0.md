# FC 游戏 AI 决策引擎工程化实施手册

版本：Draft 1.0

状态：草案，按 `docs/STRATEGY_PROTOCOL_CORE.md` 1.0.0 对齐

日期：2026-06-07

适用项目：`D:\Ai-Play\fc-ai-companion`

主线：浏览器产品平台 + StrategyPack 标准制品 + RAM 驱动运行时 + FCEUX/Lua 证据验证适配器

## 1. 文档定位

本手册不是新的策略标准，也不是 FCEUX 迁移手册。

本手册说明如何把 FC/NES 游戏 AI 决策引擎工程化落地到当前系统中，并且所有产物必须服从：

- `docs/STRATEGY_PROTOCOL_CORE.md`
- `docs/16_OPERATION_STRATEGY_STANDARD.md`
- `strategy-packs/README.md`
- `strategy-packs/<game-profile-id>/`

当前系统的核心产物是 StrategyPack，不是 Lua 脚本、TAS 逐帧输入、神经网络模型或浏览器临时运行数据。

标准执行链路：

```text
ROMProfile 精确匹配
  -> Runtime State 结构化
  -> StrategyPack / Fragment 匹配
  -> Intent Fusion / Safety Override / Action Lock 仲裁
  -> Input Mapping 写入手柄
  -> Frame Advance
  -> Trace Evidence 记录
  -> FCEUX/Lua 或浏览器真实跑局验证
  -> Validation Report / Known Failures / StrategyPack 更新
```

## 2. 当前系统分工

### 2.1 浏览器产品平台

目录：

```text
apps/browser-cockpit/
```

职责：

- 作为玩家使用的产品界面。
- 运行 jsnes 浏览器模拟器。
- 每帧读取 RAM，生成结构化状态。
- 在 `nes.frame()` 前写入 1P/2P 手柄输入。
- 显示电视、主机、手柄舱、训练区、TAS 窗口、数据面板。
- 加载 `strategy-packs/` 派生到 `apps/browser-cockpit/public/strategies/` 的运行时策略。

边界：

- 浏览器是产品运行平台，不是标准源目录。
- 浏览器可以生成 trace evidence 和候选片段，但不得绕过 StrategyPack schema。
- 浏览器中的 AI 决策必须继续遵守 Safety Override、Loop Guard、Action Lock。

### 2.2 StrategyPack 标准制品

目录：

```text
strategy-packs/
  contra/
    manifest.json
    game-profile.json
    rom-profiles/
    research/
    stages/
    schemas/
    docs/
```

职责：

- 保存可分发、可审计、可验证的操作策略包。
- 作为不同运行平台共享策略的唯一标准源。
- 记录 GameProfile、ROMProfile、Condition Registry、Action Map、Entity Taxonomy、Stage Plan、Fragments、Trace Evidence、Known Failures、Validation Report。

禁止：

- 不得包含 ROM。
- 不得包含商业游戏资源。
- 不得把原始 TAS 全文、存档、BIOS 或未授权素材打包进策略包。
- 不得把未验证候选片段标记为正式可用。

### 2.3 FCEUX/Lua 证据验证适配器

FCEUX/Lua 在当前系统中的定位是验证适配器和外部采集器，不是主系统。

建议目录：

```text
tools/fceux-lua/
  README.md
  main.lua
  adapters/
    contra.lua
  modules/
    rom_profile.lua
    ram_reader.lua
    state_abstractor.lua
    condition_registry.lua
    action_mapper.lua
    safety_guard.lua
    trace_writer.lua
    fragment_runner.lua
    validation_runner.lua
```

职责：

- 在 FCEUX 中读取 RAM。
- 将 FCEUX 的 `memory.readbyte()` 结果转换为与浏览器 Runtime API 对齐的结构化状态。
- 根据 StrategyPack 的 Condition Registry 和 Action Map 执行候选 fragment。
- 通过 `joypad.write()` 写入手柄。
- 输出 before/input/after trace evidence。
- 运行短窗口验证、失败回放、Loop Guard 验证和回归测试。

边界：

- Lua 不直接成为策略源。
- Lua 不写死正式策略逻辑到主循环。
- Lua 可以有游戏适配器，但游戏知识必须来源于 StrategyPack 或 references。
- Lua 验证通过后，候选状态最多升级到 `candidate-verified`，不能自动升级为 `validated`。

### 2.4 TAS 资料层

原始 TAS 目录：

```text
data/tas/contra/<rom-profile-id>/
```

导出的训练基座目录：

```text
data/training/contra/tas_bases/<rom-profile-id>/
```

职责：

- 保存 TAS 原始文件、README、来源说明、哈希、ROMProfile 匹配说明。
- 从 TAS 中导出可选训练基座。
- 帮助提取路线知识、起跳窗口、固定目标处理、双人站位和 Boss 节奏。

边界：

- TAS 是路线知识库，不是控制器。
- TAS 逐帧输入不能直接作为 AI 的最终控制策略。
- TAS 必须通过 ROMProfile/hash 匹配后才能作为正式参考。
- 美版、日版、Hack 版本不得混用为正式证据。

## 3. 工程原则

### 3.1 禁止事项

- 用截图识别作为当前 AI 主状态来源。
- 用文件名判断 ROM/TAS 是否匹配。
- 把 TAS 绝对帧输入当成最终 AI 控制器。
- 把 FCEUX Lua 写成独立于 StrategyPack 的第二套策略系统。
- 把不可解释的神经网络输出直接覆盖正式策略。
- 把未验证候选片段标记为可分发策略。
- 在仓库内提供 ROM、ROM 下载地址、BIOS、商业资源或未授权素材。
- 发生死循环后静默继续跑。

### 3.2 允许事项

- ROM 哈希、ROMProfile、Compatibility Group。
- RAM map、Condition Registry、Entity Taxonomy、Action Map。
- TAS 元数据、TAS 哈希、TAS 解析摘要。
- 浏览器或 FCEUX/Lua 导出的 before/input/after trace。
- 人类演示、AI 跑局、失败反例、候选 StrategyFragment。
- 已经 schema 校验、真实跑局验证、人工批准的 StrategyPack 更新。

### 3.3 人机环路

```text
Runtime:
  采集状态 -> 执行策略 -> 写入输入 -> 记录证据

Local Analyzer:
  对比成功/失败 trace -> 生成候选片段 -> 标记风险

FCEUX/Lua Adapter:
  运行候选片段 -> 输出验证证据 -> 检查 Loop Guard

Human Expert:
  审查证据 -> 批准/拒绝 -> 决定是否进入正式 StrategyPack
```

任何自动生成的 fragment 默认状态必须是 `candidate`。

## 4. 数据流标准

### 4.1 Runtime State

不同运行平台读取状态的方式可以不同：

```text
浏览器/jsnes:
  state.nes.cpu.mem[addr & 0x7ff]

FCEUX/Lua:
  memory.readbyte(addr)
  memory.readword(addr)
```

但输出给策略系统的结构必须一致。

最低结构：

```json
{
  "frame": 0,
  "runtime": "browser-jsnes|fceux-lua",
  "gameProfileId": "contra",
  "romProfileId": "contra-us-good",
  "stageId": "stage-1",
  "players": {
    "1P": {
      "active": true,
      "x": 0,
      "y": 0,
      "progression": {
        "primary": 0,
        "unit": "ContraWorldPixels"
      },
      "state": "alive|dead|menu|unknown",
      "weapon": "normal|M|S|F|L|unknown"
    }
  },
  "entities": [],
  "threats": [],
  "rewards": [],
  "raw": {
    "ram": {}
  }
}
```

Contra 当前的 WorldX 公式只属于 Contra GameProfile：

```text
WorldX = CameraX + PlayerX
CameraX = Screen * 256 + Scroll
```

其他游戏不得默认套用该公式，必须在自己的 `game-profile.json` 中声明。

### 4.2 before/input/after Trace

所有训练与验证证据必须围绕 before/input/after。

标准事件：

```json
{
  "schemaVersion": "1.0.0",
  "event": "frame_transition",
  "runtime": "fceux-lua",
  "gameProfileId": "contra",
  "romProfileId": "contra-us-good",
  "stageId": "stage-1",
  "frame": 120,
  "before": {},
  "input": {
    "source": "strategy-fragment",
    "intent": "advance_fire",
    "intentCombination": ["advance", "fire_target"],
    "buttons": {
      "right": true,
      "b": true
    },
    "rawController": "→B"
  },
  "after": {},
  "fragmentRefs": ["contra.stage1.opening.advance_fire.v1"],
  "safety": {
    "overrideApplied": false,
    "loopGuardState": "normal"
  }
}
```

它回答的问题不是“这一帧按了什么”，而是“这个输入造成了什么 RAM 结果”。

### 4.3 TraceEvidence 入库规则

真实运行证据应进入：

```text
strategy-packs/<game-profile-id>/stages/<stage-id>/trace-evidence/
```

如果证据体积较大，可以只在 StrategyPack 中保存摘要和索引，原始长日志保存在本地 `data/training/` 或 `logs/`，不得打包 ROM、存档或未授权文件。

## 5. FCEUX/Lua 适配规范

### 5.1 Lua 模块职责

`rom_profile.lua`

- 读取或接收 ROMProfile 信息。
- 校验 ROM 哈希或由外部启动器传入已校验的 `romProfileId`。
- 无精确匹配时禁止启用正式策略。

`ram_reader.lua`

- 只负责原始 RAM 读取。
- 不做战术判断。

`state_abstractor.lua`

- 把 RAM 转为 Runtime State。
- 输出字段名必须对应 Condition Registry。

`condition_registry.lua`

- 读取 `strategy-packs/<game>/research/condition-registry.json`。
- 判断 fragment entry/exit condition。

`action_mapper.lua`

- 读取 `strategy-packs/<game>/research/action-map.json`。
- 将语义 intent 转为 FCEUX `joypad.write()` 输入。

`safety_guard.lua`

- 执行 Safety Override。
- 任何 fragment 不得绕过该模块。

`fragment_runner.lua`

- 执行候选 StrategyFragment。
- 处理 Action Lock、Intent Fusion、输入保持和退出条件。

`trace_writer.lua`

- 写 before/input/after JSONL。
- 输出必须能被浏览器训练区或 Node 分析脚本读取。

`validation_runner.lua`

- 执行短跑局验证。
- 生成 pass/fail、Loop Guard、死亡、卡住、奖励丢失、固定目标未清除等结果。

### 5.2 Lua 主循环

FCEUX/Lua 主循环必须保持与浏览器一致的顺序：

```text
1. read RAM
2. abstract Runtime State
3. match StrategyFragment
4. apply Safety Override
5. apply Action Lock / Intent Fusion
6. map intent to controller buttons
7. joypad.write()
8. emu.frameadvance()
9. read after state
10. write trace evidence
```

禁止顺序：

```text
joypad.write()
  -> 猜测状态
  -> 事后补策略原因
```

### 5.3 Lua 输出状态

Lua 验证结果不得直接修改正式策略。

允许输出：

```text
candidate-pass
candidate-fail
candidate-loop-risk
candidate-needs-human-review
candidate-verified
```

禁止输出：

```text
validated
production-ready
official
```

这些状态只能由人工审查和 StrategyPack 版本流程决定。

## 6. 策略优化分级

本手册采用 `docs/17_STRATEGY_STANDARD_V2_REFERENCE.md` 中的候选分级作为工程参考，但不改变已发布的 1.0 标准。

```text
Level 0 Manual
  人工编写或人工整理。

Level 1 Automated
  本地跑局程序根据真实 trace、失败反例和规则引擎自动生成候选补丁。

Level 2 Augmented
  本地程序把证据包交给大模型或专家系统分析，再生成候选补丁。
```

执行规则：

- Level 0 可以直接创建 candidate fragment。
- Level 1 可以自动生成候选和失败证据，不能自动批准。
- Level 2 只能生成建议，不能作为验证来源。
- 所有等级最终必须落到同一套 StrategyFragment / TraceEvidence / ValidationReport 格式。

## 7. StrategyFragment 工程要求

每个 fragment 必须满足：

- `fragmentId` 稳定。
- `gameProfileId` 明确。
- `romProfileId` 或兼容范围明确。
- `stageId` 明确。
- `strategyTypes` 明确。
- `status` 初始为 `candidate`。
- `entryCondition` 只引用 Condition Registry。
- `exitCondition` 必须能防死循环。
- `intent` 使用语义动作，不直接等同于按钮。
- `intentCombination` 可表达边跳边射、边推进边下压枪等复合动作。
- `safetyOverride` 必须存在。
- `provenance` 必须完整。
- `evidenceRefs` 必须可追溯。

示例：

```json
{
  "fragmentId": "contra.stage-1.w1320-1410.fixed-threat-clear.v1",
  "schemaVersion": "1.0.0",
  "gameProfileId": "contra",
  "romProfileIds": ["contra-us-good"],
  "stageId": "stage-1",
  "strategyTypes": ["survival", "combat", "fixed-threat"],
  "status": "candidate",
  "entryCondition": {
    "all": [
      { "ref": "progression.primary", "op": "between", "value": [1320, 1410] },
      { "ref": "player.1.state", "op": "eq", "value": "alive" },
      { "ref": "threat.fixed.count", "op": "gt", "value": 0 }
    ]
  },
  "exitCondition": {
    "any": [
      { "ref": "progression.primary", "op": "gt", "value": 1410 },
      { "ref": "threat.fixed.count", "op": "eq", "value": 0 },
      { "ref": "fragment.elapsedFrames", "op": "gt", "value": 180 }
    ]
  },
  "intentCombination": ["hold_position", "fire_target"],
  "actionPolicy": {
    "targetSelector": "nearest-fixed-threat",
    "leadFrames": 2,
    "inputSamplingDelay": 0
  },
  "safetyOverride": {
    "enabled": true,
    "forbidPitEntry": true,
    "maxStagnantFrames": 90,
    "onLoopRisk": "abort-fragment"
  },
  "provenance": {
    "sourceKind": "human-trace",
    "sourceRef": "strategy-packs/contra/stages/stage-1/trace-evidence/example.json",
    "generatedBy": "manual",
    "humanReviewed": false
  }
}
```

## 8. TAS 使用规则

TAS 在当前系统中有三种用途：

```text
观看
  面向玩家和研究者展示专家操作。

训练基座
  提取路线、起跳点、固定目标处理、双人站位等知识。

验证参考
  对比 AI 跑局与专家轨迹的状态差异。
```

TAS 不允许作为：

```text
最终控制器
ROM 匹配替代品
正式策略验证结果
跨 ROMProfile 自动套用依据
```

TAS 对齐规则：

- 对齐锚点使用 movie framecount 和 FM2 input row index。
- RAM controller state 只能作为校验，不作为绝对锚点。
- 如果 TAS 从游戏 active phase 开始，必须在 metadata 中声明 entry point。
- 浏览器试播或 FCEUX 播放都必须记录 Init Phase 与 Active Phase。

## 9. Loop Guard 与死循环处理

死循环是策略系统的一级风险。

任何运行平台都必须检测：

- WorldX 长时间无进展。
- 分数无变化。
- 关键威胁未减少。
- 输入重复过久。
- 同一 fragment 连续失败。
- 玩家死亡或掉坑后继续执行旧动作。

处理规则：

```text
第一次发现：
  启动 forced advance bias 或安全退出。

第二次重复：
  写 failure trace，标记 fragment needs-review。

第三次重复：
  停止该目标分支，不再静默尝试。
```

禁止为了“继续跑”而简单重置状态。

允许使用偏移补偿量：

```text
forcedAdvanceBias:
  只能临时增加推进倾向。
  仍必须允许微操避弹。
  必须线性衰减。
  不能覆盖立即死亡风险。
```

## 10. FCEUX/Lua 验收任务

FCEUX/Lua 优先承担以下验证任务：

### 10.1 ROMProfile 验证

- 启动前确认当前 ROMProfile。
- 无精确匹配时只允许 reference 或 manual test。
- 输出 ROMProfile 证据。

### 10.2 RAM Map 验证

- 验证浏览器 RAM 字段与 FCEUX RAM 读取一致。
- 对 1P/2P 坐标、生命、状态、武器、死亡标记、屏幕、卷轴、实体槽进行抽样比对。
- 未验证字段必须标记 `pending`。

### 10.3 Fragment 短窗口验证

- 使用 StrategyFragment 的 entry/exit condition。
- 在指定 WorldX 或状态窗口运行候选动作。
- 输出 pass/fail 和 before/input/after。

### 10.4 失败反例验证

- 重放或复现 known failure。
- 验证新 fragment 是否避免同类死亡或卡住。
- 如果产生新失败，必须追加到 `known-failures.md`。

### 10.5 回归验证

- 每次 StrategyPack 更新后执行。
- 美版、日版、Hack 或其他版本必须分别记录，不得混用通过结果。

## 11. 目录与产物映射

当前项目目录：

```text
docs/
  STRATEGY_PROTOCOL_CORE.md
  16_OPERATION_STRATEGY_STANDARD.md
  17_STRATEGY_STANDARD_V2_REFERENCE.md
  19_FC_AI_DECISION_ENGINE_ENGINEERING_MANUAL_DRAFT_1_0.md

strategy-packs/
  README.md
  contra/
    manifest.json
    game-profile.json
    rom-profiles/
    research/
    stages/stage-1/
    schemas/
    docs/

data/
  tas/contra/<rom-profile-id>/
  training/contra/tas_bases/<rom-profile-id>/

apps/
  browser-cockpit/
    src/
    public/strategies/contra/

references/
  contra-us/
    IMPLEMENTATION_GUIDE.md
    research/
    tas/
    play-traces/

tests/
  *.test.mjs
```

策略包源目录是 `strategy-packs/`。

浏览器运行目录是派生目录。

FCEUX/Lua 输出必须回写为标准证据或候选片段，不能形成第三套目录标准。

## 12. UI 对应要求

当前浏览器界面应继续体现以下工程状态：

- 当前 ROMProfile。
- 当前 TAS 匹配状态。
- 当前 StrategyPack 状态。
- 当前策略来源：manual / automated / augmented。
- 当前 fragment 状态：candidate / candidate-verified / needs-review / validated。
- 当前 trace 采集状态。
- 当前 Loop Guard 状态。
- 当前 Safety Override 是否介入。
- 当前 FCEUX/Lua 验证状态。

训练区应按玩家侧拆分：

```text
1P Training
2P Training
Global Training Console
```

Global Training Console 负责显示：

- TAS 基座。
- trace 样本。
- 候选片段数。
- 验证状态。
- 归档目标。
- 下一步动作。

## 13. 验收门槛

一个策略资产进入正式库前，必须满足：

- ROMProfile 精确。
- GameProfile 明确。
- Entry Condition 基于 Condition Registry。
- Exit Condition 明确。
- Safety Override 存在。
- Loop Guard 存在。
- Intent-to-Action Mapping 明确。
- provenance 完整。
- TraceEvidence 存在。
- 浏览器或 FCEUX/Lua 至少一个真实运行验证通过。
- 关键风险窗口没有新增已知失败。
- 人工批准存在。
- 未违反 ROM/TAS 合规边界。

最低验收对象：

```json
{
  "acceptance": {
    "schemaValid": true,
    "romProfileExact": true,
    "runtimeVerified": true,
    "fceuxLuaVerified": false,
    "loopGuardPassed": true,
    "safetyOverridePassed": true,
    "regressionPassed": true,
    "humanApproved": true,
    "romCompliancePassed": true
  }
}
```

`fceuxLuaVerified=false` 不一定阻止研究状态，但会阻止标记为完整跨模拟器验收。

## 14. 当前 Contra 执行结论

当前 `strategy-packs/contra` 应保持：

```text
status: candidate
optimization: Level 0 Manual + Level 1 Automated Evidence Collection
validatedModes: []
```

不能标记为：

```text
validated
production-ready
dual-ai complete
human-ai complete
Level 2 Augmented complete
```

当前首要任务仍然是：

- 完成 Contra US 第一关稳健生存通关策略。
- 避免死循环。
- 完成真实 trace evidence。
- 将失败点写入 `known-failures.md`。
- 将有效片段收敛为标准 StrategyFragment。
- 再逐步扩展人类+AI、双 AI、日版 TAS 基座和其他游戏。

## 15. 总结

当前系统的正确工程定位：

```text
浏览器 = 产品平台和实时运行时
StrategyPack = 标准制品和策略源
FCEUX/Lua = 外部验证适配器
TAS = 路线知识库和观赏资料
TraceEvidence = 验收证据
Human Expert = 最终批准者
```

不要让 FCEUX/Lua、TAS、AI 建议或浏览器临时代码各自形成孤立标准。

所有内容最终都必须回到统一 StrategyPack 标准，才能被不同程序、不同玩家和不同游戏 Profile 复用。
