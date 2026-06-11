# FC 游戏 AI 操作策略标准手册

版本：1.1.0

状态：已发布

发布日期：2026-06-07

## 1. 标准定位

本文件是 FC AI Companion 的操作策略标准手册总入口。

它的职责是明确本项目如何为 FC/NES 游戏建立统一的 AI 操作策略标准。任何人、任何子对话、任何程序，只要按本标准产出 StrategyPack，就应该能被同一套平台加载、校验、测试和复用。

项目目标：

- 为不同 FC/NES 游戏建立统一的 AI 操作策略数据标准。
- 让不同程序可以调用同一类 StrategyPack。
- 让每个游戏保留自己的 RAM、坐标、实体、动作和关卡实现细节。
- 让人类轨迹、TAS 路线知识、AI 测试和失败反例进入同一套可验收数据库。
- 让策略不是散落在聊天、临时代码和个人经验里的补丁，而是可共享、可验证、可版本化的产品。

## 2. 标准体系

### 2.1 适用范围

本标准适用于所有基于帧输入的 FC/NES 游戏 AI 操作策略。

适用类型包括：

- 横向或纵向卷轴动作游戏。
- 多方向卷轴射击游戏。
- 俯视动作游戏。
- 平台跳跃游戏。
- 近战清版游戏。
- 固定画面或房间制游戏。
- 需要人类 + AI 或双 AI 协作的游戏。

不同游戏的进度坐标、实体分类、按键语义、RNG、关卡目标和状态变量不同。通用标准只定义协议和数据格式；具体游戏必须通过 `IMPLEMENTATION_GUIDE.md` 和 StrategyPack 填写自己的实现。

### 2.2 通用逻辑库和特定实现库

标准体系分为两层：

```text
通用逻辑库
  docs/16_OPERATION_STRATEGY_STANDARD.md
  docs/STRATEGY_PROTOCOL_CORE.md

特定实现库
  references/<game-profile-id>/IMPLEMENTATION_GUIDE.md
  references/<game-profile-id>/strategy-db/
  references/<game-profile-id>/research/
  references/<game-profile-id>/play-traces/
  references/<game-profile-id>/tas/
```

通用逻辑库定义策略分类、数据结构、Runtime API、安全守则、Schema 约束、验收规则、版本和授权规则。

特定实现库定义具体 ROM、具体 RAM / 状态来源、具体进度变量、具体实体分类、具体动作映射、具体 RNG 策略、具体关卡片段、具体证据和失败反例。

### 2.3 标准手册

文件：

```text
docs/16_OPERATION_STRATEGY_STANDARD.md
```

职责：

- 定义策略分类。
- 定义策略形成过程。
- 定义输入资料要求。
- 定义标准输出产品。
- 定义验收等级。
- 定义开发者使用流程。
- 说明通用逻辑库、特定实现库和 StrategyPack 的关系。

### 2.4 通用核心协议

文件：

```text
docs/STRATEGY_PROTOCOL_CORE.md
```

职责：

- 定义 FC/NES 游戏 AI 操作策略通用协议。
- 定义 GameProfile、ROMProfile、StrategyPack、StagePlan、StrategyFragment、TraceEvidence。
- 定义 ProgressionMetric、Condition Registry、EntityTaxonomy、Action Mapping。
- 定义 Runtime API Contract。
- 定义 RNG 同步、Schema、SemVer、SPDX、错误码和验收规则。
- 规定每个游戏专用 StrategyPack 的强制文件结构。

通用核心协议不能写入任何具体游戏数值。

### 2.5 游戏实现手册

每个游戏必须有自己的实现手册：

```text
references/<game-profile-id>/IMPLEMENTATION_GUIDE.md
```

职责：

- 记录目标 ROM 和兼容版本。
- 记录 RAM map 和验证状态。
- 记录进度变量公式。
- 记录 Condition Registry。
- 记录 EntityTaxonomy。
- 记录 Action Mapping。
- 记录 RNG 状态。
- 记录关卡基准路线。
- 记录正例、反例和当前限制。

## 3. 策略分类标准

策略类型分为通用类型和游戏自定义类型。通用类型必须被所有 GameProfile 理解；游戏自定义类型必须写入 `strategy-types.json`。

### 3.1 通用策略类型

`survival`：稳健生存。默认优先级最高，目标是完成关卡或目标区域并尽量不死。

`speed`：快速推进。目标是尽快通过区域，允许跳过非必要敌人和低价值奖励。

`combat`：清敌优先。目标是清除普通敌人、固定威胁、高价值目标或火力点。

`loot`：奖励优先。目标是获取关键武器、补给、分数物品或任务资源。

`guard`：护卫队友。目标是保护人类玩家或另一个 AI，包含跟随、补枪、让路、等待和不抢屏。

`objective`：目标节点处理。目标是清除关卡进展障碍、高价值目标部件、门、机关、据点或任务目标。

`recovery`：恢复和解循环。目标是从卡住、停滞、错误路线、复活和危险站位中恢复。

`training`：训练或实验。用于采集、测试和比较，不允许默认交给普通玩家。

### 3.2 游戏自定义策略类型

游戏可以增加自己的类型，例如：

- 俯视射击游戏的 `rescue`。
- 横版动作游戏的 `platforming`。
- 近战游戏的 `crowd-control`。
- 首领战或循环模式游戏的 `pattern-cycle`。

自定义类型必须说明：

- 类型名称。
- 目标。
- 成功标准。
- 风险。
- 可覆盖哪些通用类型。
- 不能覆盖哪些安全规则。

### 3.3 策略组合

一个 StrategyFragment 可以属于多个类型。

例如：

```json
{
  "strategyTypes": ["survival", "combat", "objective"]
}
```

运行时根据当前策略模式、片段优先级、危险状态和队友状态进行仲裁。

## 4. 策略形成过程

标准策略不是一次写出来的，而是按固定流程形成。

### 4.1 输入收集

先收集目标游戏的基础资料：

- 用户自有 ROM 的哈希。
- 游戏版本和区域。
- RAM map。
- 输入按键语义。
- 实体类型。
- 关卡进度变量。
- 人类示范轨迹。
- AI 测试轨迹。
- TAS 或公开资料来源。
- 已知失败点。

### 4.2 GameProfile 建模

建立游戏抽象：

- `ProgressionMetric`：该游戏如何表达进度。
- `Condition Registry`：策略可以引用哪些状态变量。
- `EntityTaxonomy`：实体如何分类。
- `Action Mapping`：intent 如何变成候选按键。
- `StrategyTypes`：该游戏支持哪些策略类型。
- `Runtime Priority`：该游戏的仲裁优先级。
- `rngSensitivity`：该游戏对随机数的依赖程度。
- `rngControlStrategy`：该游戏是否允许通过等待、暂停或空操作影响随机数。

### 4.3 ROMProfile 绑定

每个策略必须绑定具体 ROMProfile。

必须记录：

- `romProfileId`
- `compatibilityGroup`
- `region`
- `md5`
- `sha1`
- `sha256`
- `compatibilityStatus`
- ROM 不随包分发的声明。

ROM 文件本身不能进入 StrategyPack。

### 4.4 轨迹拆解

人类轨迹、AI 轨迹和 TAS 路线知识必须拆成片段。

拆解类型：

- 快速通过片段。
- 清敌片段。
- 固定威胁处理片段。
- 奖励获取片段。
- 目标节点处理片段。
- 协作片段。
- 卡住循环片段。
- 死亡反例片段。

不能把多次尝试混合轨迹当成一次完美路线。

### 4.5 片段抽象

每个片段必须从具体游戏事实抽象为标准字段：

- `progressionWindow`
- `conditions`
- `actionAdvice`
- `safetyOverrides`
- `exitConditions`
- `failureCounterexamples`
- `telemetry`

片段引用 Condition Registry 中的抽象变量，不直接引用 RAM 地址。

### 4.6 运行验证

片段必须经过真实运行验证：

- 局部验证。
- 全流程验证。
- 失败回溯。
- 输入和状态日志。
- TraceEvidence。
- Validation Report。

### 4.7 版本发布

达到验收标准后，StrategyPack 才能升级状态。

已发布版本不得原地覆盖。任何改变都必须升级版本并记录迁移说明。

## 5. 标准输入资料

开发一个游戏专用 StrategyPack 前，必须准备以下输入。

### 5.1 ROM 输入

必须提供用户本地 ROM 的识别信息：

```json
{
  "romProfileId": "game-region-version",
  "hashes": {
    "md5": "",
    "sha1": "",
    "sha256": ""
  },
  "sourcePolicy": {
    "romFileNotIncluded": true,
    "userMustProvideOwnRom": true
  }
}
```

### 5.2 RAM / 状态输入

必须提供：

- 原始 RAM map 或状态来源。
- 字段名称。
- 地址或计算来源。
- 类型。
- 单位。
- 验证状态。
- 用途。

RAM map 只供适配层使用。策略片段不能直接使用 RAM 地址。

### 5.3 Condition Registry 输入

必须提供策略可引用变量。

示例：

```json
{
  "refs": {
    "progression.primary": {
      "type": "number",
      "source": "computed",
      "verified": true
    },
    "player.1.alive": {
      "type": "boolean",
      "source": "state-adapter",
      "verified": true
    }
  }
}
```

### 5.4 EntityTaxonomy 输入

必须定义实体分类。

至少支持：

- `fixed-threat-target`
- `dynamic-threat`
- `projectile`
- `pickup`
- `progression-barrier-node`
- `high-value-component`
- `environment-hazard`
- `non-combat-visual`

Danger Detector 必须先做实体语义过滤，不能把所有实体都当成危险。

### 5.5 ActionMap 输入

必须定义 intent 到候选输入的映射。

策略层表达 intent，具体游戏决定如何按键。

示例 intent：

- `advance`
- `hold_position`
- `evade`
- `jump`
- `fire_target`
- `clear_fixed_threat`
- `collect_pickup`
- `guard_teammate`
- `recover_from_stuck`
- `wait`

### 5.6 轨迹和证据输入

必须收集：

- 人类示范轨迹。
- AI botrun 轨迹。
- 死亡回溯。
- 成功片段。
- 失败反例。
- 输入摘要。
- 状态快照。
- 外部资料来源登记。

TAS 可以作为路线知识来源，不能作为直接控制器。

## 6. 标准输出产品

标准输出产品是 StrategyPack。

### 6.1 标准保存位置

当前项目的正式操作策略文件夹固定为：

```text
strategy-packs/
```

规则：

- `strategy-packs/` 是 StrategyPack 的源码目录和标准存档目录。
- 每个游戏一个子目录，目录名使用 `game-profile-id`。
- 每个游戏目录内部必须按本标准保存 GameProfile、ROMProfile、Condition Registry、EntityTaxonomy、ActionMap、StagePlan、Fragments、TraceEvidence 和 Schemas。
- 浏览器运行目录可以从 `strategy-packs/` 生成或复制策略数据，但不能反过来把浏览器运行目录当作标准源。
- `apps/browser-cockpit/public/strategies/` 或后续 `public/game-profiles/` 只能作为运行时加载目录、兼容目录或构建产物目录。

标准目录：

```text
strategy-packs/
  <game-profile-id>/
    manifest.json
    game-profile.json
    rom-profiles/
    research/
    stages/
    trace-evidence/
    schemas/
    docs/
```

示例：

```text
strategy-packs/
  contra/
  jackal/
  ninja-gaiden/
```

一个游戏有多个 ROMProfile 时，不新建多个游戏目录，而是在同一个游戏目录下的 `rom-profiles/` 中区分。

### 6.2 StrategyPack 目录

单个游戏目录内部必须遵守以下结构：

```text
strategy-packs/<game-profile-id>/
  manifest.json
  game-profile.json
  rom-profiles/
    <rom-profile-id>.json
  research/
    ram-map.json
    condition-registry.json
    entity-taxonomy.json
    action-map.json
    strategy-types.json
  stages/
    <stage-id>/
      stage-plan.json
      fragments.json
      validation-report.md
      known-failures.md
  trace-evidence/
    <evidence-id>.json
  schemas/
    manifest.schema.json
    game-profile.schema.json
    rom-profile.schema.json
    condition-registry.schema.json
    entity-taxonomy.schema.json
    action-map.schema.json
    stage-plan.schema.json
    fragments.schema.json
    trace-evidence.schema.json
    runtime-api.schema.json
  docs/
    implementation-notes.md
    source-register.md
```

### 6.3 必填文件职责

`manifest.json`：策略包入口，声明版本、游戏、ROM、状态、支持模式和文件索引。

`game-profile.json`：游戏抽象定义。

`rom-profiles/`：目标 ROM 版本和兼容状态。

`ram-map.json`：原始状态来源。

`condition-registry.json`：策略可引用变量。

`entity-taxonomy.json`：实体语义分类。

`action-map.json`：intent 到候选按键映射。

`strategy-types.json`：通用和游戏自定义策略类型。

`stage-plan.json`：目标关卡或区域的粗路线。

`fragments.json`：可执行策略片段。

`trace-evidence/`：真实运行证据。

`validation-report.md`：人工可读验收报告。

`known-failures.md`：失败反例和修正状态。

`schemas/`：JSON Schema 校验文件。

`source-register.md`：资料来源、授权和使用范围。

### 6.4 Manifest 最低字段

```json
{
  "schemaVersion": "1.1.0",
  "packId": "game-id-stage-id-strategy-v0",
  "packVersion": "0.1.0",
  "gameProfileId": "game-id",
  "romProfileIds": ["game-region-version"],
  "strategyKeys": ["survival-v0"],
  "supportedModes": ["single-ai"],
  "status": "candidate",
  "standards": {
    "strategyProtocol": "1.1.0",
    "jsonSchema": "2020-12",
    "versioning": "semver-2.0.0",
    "licenseIdentifiers": "spdx"
  },
  "files": {},
  "quality": {
    "confidence": 0,
    "evidenceCount": 0,
    "validatedModes": [],
    "knownFailures": []
  }
}
```

### 6.5 Schema 通用性要求

`schemas/` 下的 JSON Schema 必须是严格、通用、跨游戏的结构定义。

Schema 可以约束：

- 字段是否必填。
- 字段类型。
- 枚举范围。
- 版本格式。
- 文件索引格式。
- Runtime API 输入输出结构。
- StrategyFragment 基础结构。

Schema 不能包含：

- 具体游戏名称。
- 具体 ROM 哈希。
- 具体 RAM 地址。
- 具体敌人类型值。
- 具体关卡坐标。
- 具体武器或奖励名称。
- 具体策略片段 ID。

这些内容必须放入 GameProfile、ROMProfile、Condition Registry、EntityTaxonomy、ActionMap、StagePlan、Fragments 或游戏实现手册。

## 7. Runtime 调用标准

### 7.1 输入对象

运行时每帧输入必须包含：

- `frame`
- `mode`
- `gameProfileId`
- `romProfileId`
- `strategyKey`
- `playerSide`
- `rawState`
- `contextualState`
- `conditionState`
- `progressionState`
- `entityState`
- `threatPool`
- `horizon`
- `rngState`
- `inputSamplingDelay`
- `playerState`
- `teammateState`
- `activeLocks`
- `loopState`

`inputSamplingDelay` 表示当前游戏或运行环境的输入采样延迟，单位是帧。AI 必须用它提前计算起跳、闪避、攻击和动作锁时机。

### 7.2 输出对象

运行时每帧输出必须包含：

- `intent`
- `intentCombination`
- `intentParams`
- `confidence`
- `reason`
- `latencyCompensationFrames`
- `finalInput`
- `actionLock`
- `fragmentId`
- `safetyOverride`
- `telemetry`

`intentCombination` 用于表达复合动作，例如边跳边射击、边推进边清目标、边护卫边避险。复合动作必须作为同一个仲裁结果输出，不能让两个独立 intent 在同一帧互相竞争。

`finalInput` 是唯一允许写入模拟器手柄的结果。

### 7.3 安全守则协议

所有 StrategyFragment 执行前，必须先经过 Safety Override 过滤。

Safety Override 的职责：

- 阻止 AI 为了清敌、奖励、速度或目标节点而进入立即死亡状态。
- 阻止 AI 在危险地形、弹道、碰撞、边界挤压或复活脆弱期执行错误片段。
- 允许紧急避险覆盖当前 Action Lock。
- 允许人类紧急输入覆盖 AI。
- 保留 Loop Exit 的推进偏移，但不得取消立即避险。

推荐安全层级：

```text
human emergency override
> death/menu/recovery guard
> immediate lethal danger
> safety override
> action lock
> strategy fragment
> threat pool
> horizon / route knowledge
> default progression
> loop exit
```

具体游戏可以调整，但必须写入 GameProfile。

安全守则优先级高于所有策略类型。`speed`、`combat`、`loot`、`objective` 都不能绕过安全守则。

## 8. 验收等级

策略包状态：

`draft`：结构草稿或研究资料。

`candidate`：可测试，不能默认交给普通玩家。

`validated-single-ai`：单 AI 模式已完成目标验收。

`validated-human-ai`：人类 + AI 模式已完成目标验收。

`validated-dual-ai`：双 AI 模式已完成目标验收。

`retired`：已废弃，但保留反例和替代原因。

模式验收不能互相替代：

```text
single-ai validated != human-ai validated
human-ai validated != dual-ai validated
```

## 9. 数据可信度标准

所有显示和证据必须标注可信度。

`exact`：直接来自游戏状态或已验证计算。

`derived`：由状态转移或多字段推导。

`candidate`：可观察但尚未充分验证。

`reference-only`：外部资料或未对齐 ROM 的参考。

`unknown`：未知，不得用于正式判断。

禁止把推导值显示成精确值。禁止把候选策略标记为完成。

## 10. 开发者统一使用流程

开发一个新的 FC 游戏策略时，按以下顺序执行：

1. 建立 `references/<game-profile-id>/`。
2. 写 `IMPLEMENTATION_GUIDE.md`。
3. 建立 ROMProfile 并记录哈希。
4. 建立 RAM map。
5. 建立 ProgressionMetric。
6. 建立 Condition Registry。
7. 建立 EntityTaxonomy。
8. 建立 ActionMap。
9. 建立 StrategyTypes。
10. 采集人类和 AI 轨迹。
11. 拆解正例和反例。
12. 编写 StagePlan。
13. 编写 Fragments。
14. 用 Schema 校验。
15. 接入 Runtime API。
16. 执行局部测试。
17. 执行全流程测试。
18. 输出 TraceEvidence。
19. 写 Validation Report。
20. 根据证据升级或保持状态。

## 11. 标准强制原则

### 11.1 游戏专属知识不得进入核心协议

以下内容必须放入游戏实现手册或 StrategyPack：

- 具体 RAM 地址。
- 具体坐标公式。
- 具体敌人类型。
- 具体武器和奖励。
- 具体关卡数值。
- 具体高价值目标、固定威胁、地形障碍、路线节点等打法。

### 11.2 策略片段不得直接引用 RAM 地址

正确方向：

```text
conditions[].ref = "progression.primary"
```

错误方向：

```text
conditions[].field = "ram.0x0064"
```

RAM 地址属于适配层，不属于策略片段。

### 11.3 坐标必须抽象为 ProgressionMetric

横向卷轴游戏可以使用横向进度。俯视游戏可能使用房间、波次、任务目标或复合进度。核心协议不能假设所有游戏都使用同一种坐标公式。

### 11.4 策略层使用 intent

策略层表达意图，具体按键由 GameProfile 的 Action Mapping 转换。

Runtime 最终仍必须输出 `finalInput`，因为模拟器真实写入手柄需要明确按钮状态。

### 11.5 ROM 必须绑定

未通过 `exact-match` 或 `compatible-tested` 的 ROM，不能自动启用正式 AI。

### 11.6 证据决定状态

无 TraceEvidence 和 Validation Report 的策略不能标记为 `validated`。

## 12. 文档关系

```text
docs/16_OPERATION_STRATEGY_STANDARD.md
  FC 游戏 AI 操作策略标准手册

docs/STRATEGY_PROTOCOL_CORE.md
  FC/NES 通用策略协议

references/<game-profile-id>/IMPLEMENTATION_GUIDE.md
  游戏专用实现手册

references/<game-profile-id>/strategy-db/
  游戏专用策略包、片段、证据和示例
```

本手册负责“标准是什么”和“如何按标准开发”。具体协议字段看核心协议；具体游戏打法看实现手册；具体可执行数据看 StrategyPack。

游戏当前落地状态、下一阶段执行顺序、未完成项和验收进度，必须写入对应游戏的实现手册或 StrategyPack 档案，不写入本标准手册。
