# FC 游戏 AI 操作策略核心协议

协议版本：1.0.0

状态：已发布

发布日期：2026-06-07

## 1. 文档目的

本协议定义 FC/NES 游戏 AI 操作策略数据如何被描述、校验、加载、执行和验收。

它是通用协议，不属于任何单一游戏。具体游戏的坐标公式、RAM 地址、敌人类型、奖励类型、关卡片段和打法经验，必须放在对应的 `references/<game-profile-id>/IMPLEMENTATION_GUIDE.md` 或 Strategy Pack 中。

本协议的目标是让不同程序、不同玩家、不同子对话、不同游戏 Profile 可以共享同一套策略数据标准。只要 Schema、GameProfile、ROMProfile、Condition Registry、Action Mapping、Runtime API 和证据格式一致，策略包就可以被统一调用。

## 2. 核心边界

### 2.1 策略不是逐帧录像

策略数据保存的是路线知识、战术意图、状态条件、动作锁、失败反例和验收证据，不是整关逐帧按键录像。

允许保存：

- 进度区间。
- 关键动作窗口。
- 固定威胁处理方式。
- 奖励或目标获取条件。
- 队友协作规则。
- 成功片段。
- 失败反例。
- 人类示范轨迹摘要。
- TAS 或公开资料提取出的路线知识。

禁止把整关策略简化为唯一逐帧输入脚本。短窗口动作锁可以保存输入保持规则，但必须有退出条件和安全覆盖。

### 2.2 状态是事实来源

运行时决策必须使用结构化状态作为事实来源。视觉画面可以帮助人类理解，但不能作为本协议的主要状态来源。

标准流程：

```text
read game state -> abstract state -> match strategy -> arbitrate intent -> map action -> write controller -> advance frame -> record evidence
```

不同模拟器或训练平台可以用不同方式读取状态，但输出给策略运行时的对象必须符合 Runtime API。

### 2.3 游戏专属知识必须隔离

平台核心不能硬编码任何游戏专属内容。

必须隔离到 GameProfile 或 Implementation Guide 的内容包括：

- 进度坐标公式。
- RAM 地址。
- 实体类型表。
- 武器、奖励、敌人、障碍和目标语义。
- 输入按键语义。
- RNG 状态来源。
- 关卡片段。
- 特定打法。
- 特定 ROM 兼容结论。

### 2.4 安全守则优先于路线

策略片段只解决可复用的战术意图。最终控制必须经过运行时仲裁和 Safety Override 过滤。

Safety Override 是所有策略执行前的强制安全层。它必须检查立即死亡风险、危险地形、弹道、碰撞、边界挤压、复活脆弱期和人类紧急输入。任何策略片段不得绕过 Safety Override。

推荐优先级：

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

具体游戏可以调整优先级，但必须在 GameProfile 中声明，且不得让奖励、速度、清敌或目标节点策略覆盖立即生存。

### 2.5 正例和反例都要入库

成功片段用于告诉 AI 什么有效。失败反例用于阻止 AI 重复错误。

每个 Strategy Pack 必须允许记录：

- 成功目标。
- 失败目标。
- 死亡或失败前状态。
- 输入摘要。
- 命中的策略片段。
- 失败原因分类。
- 后续修正版本。

## 3. 协议对象分层

### 3.1 GameProfile

GameProfile 描述一个游戏如何接入通用协议。

最低字段：

```json
{
  "schemaVersion": "1.0.0",
  "gameProfileId": "game-id",
  "displayName": "Game Display Name",
  "platform": "fc-nes",
  "supportedModes": ["single-ai", "human-ai", "dual-ai"],
  "progressionMetrics": [],
  "conditionRegistry": "condition-registry.json",
  "entityTaxonomy": "entity-taxonomy.json",
  "actionMapping": "action-map.json",
  "strategyTypes": "strategy-types.json",
  "rngSensitivity": "unknown",
  "rngControlStrategy": "none",
  "runtimePriority": []
}
```

GameProfile 必须说明：

- 支持哪些运行模式。
- 如何计算进度变量。
- 哪些抽象状态变量可以被策略片段引用。
- 哪些实体类型属于威胁、奖励、目标或无关对象。
- 语义动作如何映射为最终控制输入。
- 哪些 RAM 或状态字段仍未验证。
- RNG 是否可读取或只能记录未知状态。
- `rngSensitivity`：该游戏对 RNG 的依赖程度。
- `rngControlStrategy`：是否允许通过等待、暂停或空操作影响随机数。

### 3.2 ROMProfile

ROMProfile 描述一个具体 ROM 版本。

最低字段：

```json
{
  "schemaVersion": "1.0.0",
  "gameProfileId": "game-id",
  "romProfileId": "game-region-version",
  "compatibilityGroup": "game-region",
  "region": "unknown",
  "hashes": {
    "md5": "",
    "sha1": "",
    "sha256": ""
  },
  "compatibilityStatus": "reference-only",
  "sourcePolicy": {
    "romFileNotIncluded": true,
    "userMustProvideOwnRom": true
  }
}
```

ROMProfile 是自动运行策略的前置条件。未通过精确匹配或兼容验收的 ROM 不能自动启用正式 AI。

### 3.3 StrategyPack

StrategyPack 是标准输出产品。

当前项目的正式 StrategyPack 源目录固定为：

```text
strategy-packs/
```

每个游戏一个子目录，目录名使用 `gameProfileId`。浏览器运行目录可以从 `strategy-packs/` 生成或复制策略数据，但不能作为标准源目录。

最低结构：

```text
strategy-packs/<game-profile-id>/
  manifest.json
  game-profile.json
  rom-profiles/
  research/
  stages/
  trace-evidence/
  schemas/
  docs/
```

StrategyPack 不包含 ROM 文件。它只包含策略数据、Schema、验证证据、说明文档和来源登记。

#### 3.3.1 游戏专用 StrategyPack 强制内容

每个游戏的专用操作策略包必须明确包含以下内容。缺少任一核心文件时，只能作为研究资料，不能作为可调用 StrategyPack。

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
  docs/
    implementation-notes.md
    source-register.md
```

文件职责：

- `manifest.json`：策略包入口，声明版本、目标游戏、目标 ROM、支持模式、状态和文件索引。
- `game-profile.json`：游戏抽象定义，不能写入某个 ROM 的哈希。
- `rom-profiles/`：每个可支持 ROM 独立一个文件。
- `ram-map.json`：原始 RAM 或状态来源说明，只供适配器使用。
- `condition-registry.json`：策略片段可引用的抽象变量表。
- `entity-taxonomy.json`：实体语义分类表。
- `action-map.json`：intent 到候选输入的映射表。
- `strategy-types.json`：通用策略类型和游戏自定义策略类型。
- `stage-plan.json`：目标关卡或目标区域的粗路线。
- `fragments.json`：可执行策略片段。
- `trace-evidence/`：真实运行证据。
- `validation-report.md`：人工可读验收结论。
- `known-failures.md`：失败反例和修正状态。
- `schemas/`：所有 JSON 文件的校验规则。
- `source-register.md`：外部资料、人工轨迹、TAS、论坛、反汇编和文档来源登记。

#### 3.3.2 Manifest 强制字段

`manifest.json` 必须包含：

```json
{
  "schemaVersion": "1.0.0",
  "packId": "game-id-stage-id-strategy-v0",
  "packVersion": "0.1.0",
  "gameProfileId": "game-id",
  "romProfileIds": ["game-region-version"],
  "strategyKeys": ["survival-v0"],
  "supportedModes": ["single-ai"],
  "status": "candidate",
  "standards": {
    "strategyProtocol": "1.0.0",
    "jsonSchema": "2020-12",
    "versioning": "semver-2.0.0",
    "licenseIdentifiers": "spdx"
  },
  "files": {
    "gameProfile": "game-profile.json",
    "romProfiles": ["rom-profiles/game-region-version.json"],
    "conditionRegistry": "research/condition-registry.json",
    "entityTaxonomy": "research/entity-taxonomy.json",
    "actionMap": "research/action-map.json",
    "strategyTypes": "research/strategy-types.json",
    "stages": ["stages/stage-id/stage-plan.json"],
    "fragments": ["stages/stage-id/fragments.json"]
  },
  "quality": {
    "confidence": 0,
    "evidenceCount": 0,
    "validatedModes": [],
    "knownFailures": []
  }
}
```

#### 3.3.3 游戏专用 StrategyPack 验收等级

游戏专用策略包状态：

- `draft`：结构草稿或研究资料，不自动运行。
- `candidate`：可进入测试，但不能默认交给普通玩家。
- `validated-single-ai`：单 AI 模式已完成目标验收。
- `validated-human-ai`：人类 + AI 模式已完成目标验收。
- `validated-dual-ai`：双 AI 模式已完成目标验收。
- `retired`：已废弃，但保留反例和替代原因。

一个策略包可以只验证部分模式。模式验证不能互相替代。

#### 3.3.4 游戏自定义内容扩展点

游戏可以扩展：

- 自定义进度变量。
- 自定义策略类型。
- 自定义实体分类子类型。
- 自定义 intent 参数。
- 自定义目标统计。
- 自定义协作规则。

扩展必须写在 GameProfile 或 `research/*.json` 中。StrategyFragment 只能引用已注册名称，不能直接发明新字段。

### 3.4 StagePlan

StagePlan 描述目标区域的粗路线或任务流。它不直接写按键。

通用字段：

```json
{
  "schemaVersion": "1.0.0",
  "gameProfileId": "game-id",
  "romProfileId": "game-region-version",
  "stageId": "stage-identifier",
  "strategyKey": "survival-v0",
  "segments": [
    {
      "id": "segment-id",
      "progressionWindow": {
        "metric": "primaryProgress",
        "start": 0,
        "end": 100,
        "unit": "ProgressionUnits"
      },
      "intent": "advance",
      "notes": "通用示例，不代表任何具体游戏。"
    }
  ]
}
```

### 3.5 StrategyFragment

StrategyFragment 是可执行策略的核心数据单元。

它必须引用抽象变量，不得直接引用 RAM 地址。

最低字段：

```json
{
  "id": "fragment-id",
  "label": "Human readable label",
  "status": "draft",
  "strategyTypes": ["survival"],
  "progressionWindow": {
    "metric": "primaryProgress",
    "start": 0,
    "end": 100,
    "unit": "ProgressionUnits",
    "strictEnd": true
  },
  "conditions": [
    {
      "ref": "player.alive",
      "op": "eq",
      "value": true
    }
  ],
  "actionAdvice": {
    "intent": "advance",
    "priority": 100,
    "parameters": {},
    "lockFrames": 0
  },
  "safetyOverrides": [],
  "exitConditions": [],
  "failureCounterexamples": [],
  "telemetry": {
    "requiredRefs": [
      "progression.primary",
      "player.position",
      "runtime.finalInput"
    ]
  }
}
```

`strategyTypes` 允许扩展。通用类型包括：

- `survival`
- `speed`
- `combat`
- `loot`
- `guard`
- `objective`
- `recovery`
- `training`

游戏可以在 GameProfile 中增加自定义类型，但必须写入 `strategy-types.json` 并说明验收目标。

### 3.6 TraceEvidence

TraceEvidence 保存真实运行证据。

最低字段：

```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "evidence-id",
  "gameProfileId": "game-id",
  "romProfileId": "game-region-version",
  "strategyKey": "survival-v0",
  "mode": "single-ai",
  "result": "failed",
  "startedAtFrame": 0,
  "endedAtFrame": 0,
  "progression": {
    "metric": "primaryProgress",
    "start": 0,
    "end": 0,
    "max": 0,
    "unit": "ProgressionUnits"
  },
  "deaths": 0,
  "objectives": [],
  "pickups": [],
  "failurePoints": []
}
```

没有 TraceEvidence 和 Validation Report 的 StrategyPack 不能标记为 `validated`。

## 4. GameProfile 扩展指引

新增一个游戏时，必须建立：

```text
references/<game-profile-id>/
  IMPLEMENTATION_GUIDE.md
  research/
    ram-map.json
    condition-registry.json
    entity-taxonomy.json
    action-map.json
    strategy-types.json
  rom-profiles/
    <rom-profile-id>.json
  strategy-db/
    stage-plan.json
    fragments.json
  play-traces/
  tas/
```

### 4.1 ProgressionMetric

每个游戏必须声明自己的进度变量。

字段：

```json
{
  "id": "primaryProgress",
  "displayName": "Primary Progress",
  "unit": "ProgressionUnits",
  "formula": {
    "type": "expression",
    "inputs": ["state.fieldA", "state.fieldB"],
    "expression": "fieldA + fieldB"
  },
  "monotonic": "mostly",
  "resetScope": "stage",
  "verified": false
}
```

规则：

- 协议层只知道 `primaryProgress` 等抽象变量。
- 公式只能在 GameProfile 或适配器中定义。
- 如果游戏没有连续横向进度，可以使用房间号、波次、目标完成度或复合进度。
- 策略片段不得假设进度公式。

### 4.2 Condition Registry

Condition Registry 是策略片段可引用的状态变量表。

示例：

```json
{
  "schemaVersion": "1.0.0",
  "refs": {
    "progression.primary": {
      "type": "number",
      "source": "computed",
      "verified": true
    },
    "player.alive": {
      "type": "boolean",
      "source": "state-adapter",
      "verified": true
    },
    "threat.fixed.count": {
      "type": "integer",
      "source": "entity-taxonomy",
      "verified": false
    }
  }
}
```

规则：

- StrategyFragment 只能引用 registry 中存在的 `ref`。
- 直接 RAM 地址不能出现在 StrategyFragment 中。
- 未验证变量可以用于观察和实验，但不能作为正式验收条件。

### 4.3 EntityTaxonomy

EntityTaxonomy 定义实体语义。

通用分类：

- `fixed-threat-target`：固定威胁目标。
- `dynamic-threat`：移动敌对对象。
- `projectile`：敌方或玩家弹体。
- `pickup`：可拾取对象。
- `progression-barrier-node`：关卡进展障碍节点。
- `high-value-component`：高价值防御或攻击部件。
- `environment-hazard`：环境危险。
- `non-combat-visual`：爆炸、特效、无威胁动画。

Danger Detector 必须先经过 EntityTaxonomy 过滤。不能把所有实体都当作危险。

### 4.4 Action Mapping

协议层使用语义动作，不直接表达游戏按键。

通用 intent：

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

Action Mapping 把 intent 转换为候选输入。

```json
{
  "schemaVersion": "1.0.0",
  "intents": {
    "advance": {
      "description": "Move along the primary progression direction.",
      "defaultInput": {
        "right": true
      }
    },
    "fire_target": {
      "description": "Attack a selected target using this game's input semantics.",
      "requiresTarget": true
    }
  }
}
```

最终输出仍然必须包含标准 `finalInput`。语义动作是策略层接口，`finalInput` 是模拟器写入接口。

## 5. Runtime API Contract

### 5.1 每帧输入

```json
{
  "schemaVersion": "1.0.0",
  "frame": 0,
  "mode": "single-ai",
  "gameProfileId": "game-id",
  "romProfileId": "game-region-version",
  "strategyKey": "survival-v0",
  "playerSide": "1p",
  "rawState": {},
  "contextualState": {},
  "conditionState": {},
  "progressionState": {},
  "entityState": {},
  "threatPool": {},
  "horizon": {},
  "rngState": {
    "status": "unknown",
    "values": {}
  },
  "inputSamplingDelay": 0,
  "playerState": {},
  "teammateState": null,
  "activeLocks": [],
  "loopState": {}
}
```

`contextualState` 用于存放游戏专属状态。平台主循环不能因为游戏改变而新增硬编码字段。

`inputSamplingDelay` 表示当前游戏或运行环境的输入采样延迟，单位是帧。AI 必须用它提前计算起跳、闪避、攻击和动作锁时机。

### 5.2 每帧输出

```json
{
  "schemaVersion": "1.0.0",
  "frame": 0,
  "intent": "advance",
  "intentCombination": [
    {
      "intent": "advance",
      "weight": 1
    }
  ],
  "intentParams": {},
  "confidence": 0.5,
  "reason": "default-progression",
  "latencyCompensationFrames": 0,
  "finalInput": {
    "up": false,
    "down": false,
    "left": false,
    "right": false,
    "a": false,
    "b": false,
    "start": false,
    "select": false
  },
  "actionLock": null,
  "fragmentId": null,
  "safetyOverride": null,
  "telemetry": {}
}
```

`intentCombination` 用于表达复合动作，例如边跳边射击、边推进边清目标、边护卫边避险。复合动作必须作为同一个仲裁结果输出，不能让两个独立 intent 在同一帧互相竞争。

`latencyCompensationFrames` 用于不同模拟器、训练平台或硬件采样周期的补偿。浏览器产品平台可以先设为 `0`，但字段必须存在。

## 6. RNG 同步规范

GameProfile 必须声明 RNG 状态。

```json
{
  "rng": {
    "status": "unknown",
    "rngSensitivity": "unknown",
    "rngControlStrategy": "none",
    "stateRefs": [],
    "recordPolicy": "record-if-known"
  }
}
```

可选状态：

- `unknown`：未知，不参与策略判断。
- `observed`：可以读取但未验证影响。
- `validated`：已验证可用于策略或复盘。

`rngSensitivity` 可选值：

- `none`：策略不依赖 RNG。
- `low`：RNG 会影响局部对象，但不影响主要路线。
- `medium`：RNG 会影响敌人、奖励或危险，需要记录。
- `high`：RNG 显著影响策略复现，必须纳入 TraceEvidence。
- `unknown`：尚未验证。

`rngControlStrategy` 可选值：

- `none`：不尝试控制 RNG。
- `wait`：允许通过等待若干帧调整 RNG。
- `pause`：允许通过暂停或菜单节奏影响 RNG。
- `noop`：允许通过空操作改变 RNG 推进。
- `external-only`：只能记录，不能由运行时主动操纵。

规则：

- 未验证 RNG 不能作为正式策略条件。
- TraceEvidence 应记录可获得的 RNG 状态。
- TAS 资料必须标注 RNG 适配状态。
- 任何 RNG 控制策略都必须写入 GameProfile，并在 Validation Report 中说明复现条件。

## 7. 版本、Schema 和授权

### 7.1 Schema

所有 JSON 文件必须使用 JSON Schema Draft 2020-12。

每个 schema 必须提供：

- `$schema`
- `$id`
- `required`
- `additionalProperties`
- 明确枚举值。
- 明确单位。

Schema 必须保持跨游戏通用。它可以约束结构、类型、必填字段、版本和枚举，但不能包含具体游戏名称、ROM 哈希、RAM 地址、敌人类型值、关卡坐标、武器名、奖励名或策略片段 ID。

### 7.2 版本

版本字段使用 SemVer 风格字符串。

```json
{
  "schemaVersion": "1.0.0",
  "packVersion": "0.1.0",
  "strategyVersion": "0.1.0",
  "fragmentVersion": "0.1.0"
}
```

已发布 StrategyPack 不得原地覆盖。任何改动必须生成新版本。

### 7.3 授权

StrategyPack 必须声明：

- `license`
- `dataLicense`
- `sourceLicense`
- `spdxLicenseId`
- `sourceRefs`
- `romFileNotIncluded`
- `userMustProvideOwnRom`

授权标识优先使用 SPDX 短标识。无法表达时使用 `LicenseRef-...`。

## 8. 兼容性和错误处理

ROM 兼容等级：

- `exact-match`
- `compatible-tested`
- `reference-only`
- `blocked`

错误码：

```text
ROM_HASH_MISMATCH
SCHEMA_INVALID
GAME_PROFILE_MISSING
CONDITION_REF_UNKNOWN
RAM_MAP_UNVERIFIED
ACTION_MAPPING_MISSING
UNSUPPORTED_MODE
FRAGMENT_CONFLICT
TRACE_EVIDENCE_MISSING
RUNTIME_API_MISMATCH
LICENSE_UNDECLARED
```

加载规则：

- 哈希精确匹配，可以正式运行。
- 已验证兼容，可以兼容运行。
- 仅参考资料，不得自动启用正式 AI。
- 已知不兼容，必须拒绝运行。
- Schema 无效，必须拒绝加载。
- Condition ref 未注册，必须拒绝该片段。

## 9. 验收标准

### 9.1 片段验收

片段从 `candidate` 升级到 `validated`，必须满足：

- Schema 校验通过。
- Condition refs 都存在。
- 进度窗口单位正确。
- Runtime API 输入输出校验通过。
- 至少一次真实运行证据。
- 失败反例已记录。

### 9.2 策略验收

一个策略完成，必须满足：

- 绑定 GameProfile。
- 绑定 ROMProfile。
- 绑定 StrategyPack 版本。
- 指定目标模式。
- 有 TraceEvidence。
- 有 Validation Report。
- 完成该策略声明的目标。
- 已知失败点有修正或降级说明。

### 9.3 模式验收

单 AI、人类 + AI、双 AI 必须分开验收。

```text
single-ai validated != human-ai validated
human-ai validated != dual-ai validated
```

## 10. 禁止事项

- 禁止在核心协议里写入具体游戏数值。
- 禁止 StrategyFragment 直接引用 RAM 地址。
- 禁止未绑定 ROMProfile 就自动运行策略。
- 禁止未验证 RAM 字段作为正式策略条件。
- 禁止把 TAS 当作控制器直接回放。
- 禁止把截图识别作为本协议的主判断路径。
- 禁止把未授权外部资料打包分发。
- 禁止把没有证据的策略标记为 `validated`。
- 禁止让奖励、速度、清敌目标覆盖立即生存。
- 禁止无条件 Loop Exit 猛冲。

## 11. 与游戏实现手册的关系

本协议只定义通用接口和约束。

具体游戏必须在实现手册中补充：

- 目标 ROM。
- RAM map。
- 进度变量公式。
- Condition Registry。
- EntityTaxonomy。
- Action Mapping。
- RNG 状态。
- 关卡基准路线。
- 策略片段。
- 正例和反例。
- 当前限制。

实现手册可以包含具体数值；核心协议不能包含具体数值。
