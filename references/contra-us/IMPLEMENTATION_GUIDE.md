# Contra US 实现手册

## 1. 文档目的

本手册记录 `contra-us` GameProfile 如何落地《FC 游戏 AI 操作策略核心协议》。

这里可以写 Contra US 的具体 ROM、RAM 地址、WorldX 公式、第一关路线片段、固定威胁、奖励、Boss 墙和实测失败反例。核心协议文档不得包含这些游戏专属内容。

## 2. 当前目标 ROM

当前主支持 ROM Profile：

```json
{
  "gameProfileId": "contra",
  "romProfileId": "contra-us-good",
  "compatibilityGroup": "contra-us",
  "displayName": "Contra (USA)",
  "region": "US",
  "hashes": {
    "md5": "7bdad8b4a7a56a634c9649d20bd3011b",
    "sha1": "c9ea66bb7cb30ad5343f1721b1d4d3219859319b"
  },
  "sourcePolicy": {
    "romFileNotIncluded": true,
    "userMustProvideOwnRom": true
  }
}
```

本项目不得提交或分发 ROM 文件。策略数据只绑定 ROM 哈希和兼容状态。

## 3. 运行时事实链

当前浏览器产品平台使用 `jsnes`。

每帧顺序：

```text
1. 读取 RAM
2. 生成 Contra 结构化状态
3. 更新敌人槽、子弹槽、战绩和路线状态
4. 匹配策略片段
5. 经过 Danger Detector / Action Lock / FSM / Loop Exit 仲裁
6. 输出 1P / 2P finalInput
7. 在 nes.frame() 前写入手柄
8. 推进模拟器一帧
9. 再读 RAM 并记录证据
```

这是强同步控制，不是异步发送键盘事件。

## 4. Contra GameProfile 映射

### 4.1 ProgressionMetric

Contra 横向关卡主进度变量：

```json
{
  "id": "progression.primary",
  "displayName": "WorldX",
  "unit": "ContraWorldPixels",
  "formula": {
    "type": "expression",
    "inputs": [
      "ram.levelScreenNumber",
      "ram.levelScreenScrollOffset",
      "player.1.screenX"
    ],
    "expression": "(levelScreenNumber * 256 + levelScreenScrollOffset) + player1ScreenX"
  },
  "monotonic": "mostly",
  "resetScope": "stage",
  "verified": true
}
```

Contra 里可以继续使用 `WorldX` 作为实现术语，但通用协议里只能叫 `progression.primary` 或 `ProgressionUnits`。

### 4.2 Condition Registry 映射

当前已接入或已使用的关键 RAM 字段：

| 抽象引用 | RAM / 计算来源 | 当前用途 | 状态 |
|---|---:|---|---|
| `stage.id` | `0x0030` | 当前关卡 | 已接入 |
| `player.1.lives` | `0x0032` | 1P 生命 | 已接入 |
| `game.gameOver` | `0x0038` | Game Over | 已接入 |
| `objective.barrierCleared` | `0x003B` | Boss / 关卡障碍击破 | 已接入 |
| `ram.levelScreenNumber` | `0x0064` | CameraX 计算 | 已接入 |
| `ram.levelScreenScrollOffset` | `0x0065` | CameraX 计算 | 已接入 |
| `player.1.state` | `0x0090` | 1P 状态 / 死亡统计 | 已接入 |
| `player.1.jumpState` | `0x00A0` | 跳跃状态 | 已接入 |
| `player.1.weapon` | `0x00AA` | 当前武器 | 已接入 |
| `player.1.deathFlag` | `0x00B4` | 死亡上升沿 | 已接入 |
| `player.1.screenY` | `0x031A` | 1P Y 坐标 | 已接入 |
| `player.1.screenX` | `0x0334` | 1P X 坐标 | 已接入 |

敌人槽当前扫描 16 个槽位：

| 字段 | RAM 基址 | 当前用途 |
|---|---:|---|
| `entity.slot.y` | `0x0324 + slot` | 敌人 Y |
| `entity.slot.x` | `0x033E + slot` | 敌人 X |
| `entity.slot.routine` | `0x04B8 + slot` | 活动状态 |
| `entity.slot.ySpeed` | `0x04E8 + slot` | Y 速度 |
| `entity.slot.xSpeed` | `0x0508 + slot` | X 速度 |
| `entity.slot.type` | `0x0528 + slot` | 类型 |
| `entity.slot.attackDelay` | `0x0558 + slot` | 攻击延迟 |
| `entity.slot.animation` | `0x0568 + slot` | 动画帧 |
| `entity.slot.hp` | `0x0578 + slot` | HP |
| `entity.slot.attribute` | `0x05A8 + slot` | 属性 |

2P 坐标、生命、武器、跳跃状态仍未完成正式验证。未验证字段不能作为正式策略验收条件。

### 4.3 EntityTaxonomy

Contra 实体分类必须先过滤再进入 AI：

- `fixed-threat-target`：固定炮台、墙体火力点、Boss 墙部件。
- `dynamic-threat`：普通敌兵、移动敌人。
- `projectile`：敌方子弹、飞行威胁。
- `pickup`：武器箱、飞行胶囊、掉落奖励。
- `progression-barrier-node`：阻挡关卡继续推进的门、墙、核心或关卡终点障碍。
- `high-value-component`：Boss 核心、高价值炮台或强制清除目标。
- `non-combat-visual`：爆炸、特效、空槽、滚屏自然回收对象。

当前最大问题不是 AI 不会控制，而是实体语义过滤不足导致：

- 把非威胁对象当作危险。
- 看见奖励或固定目标却没有正确站位处理。
- 遇到贴身兵、炮台和桥段组合时进入循环。

### 4.4 Action Mapping

Contra 按键语义：

| 协议 intent | Contra 候选动作 | 说明 |
|---|---|---|
| `advance` | `right`，必要时附带 `b` | 推进并保持火力 |
| `fire_target` | 根据目标角度映射方向 + `b` | 水平、斜上、斜下、蹲射等 |
| `clear_fixed_threat` | 停位或微调站位 + 持续射击 | 用 HP 变化确认有效 |
| `collect_pickup` | 先打出奖励，再按安全路径拾取 | 不得覆盖立即生存 |
| `jump` | `a` + 方向 | 桥、坑、平台和避弹 |
| `evade` | 跳跃、下蹲、后撤或停顿 | 由威胁预测决定 |
| `guard_teammate` | 跟随、让屏、补枪、清近身 | 2P RAM 未验证前只能谨慎使用 |
| `recover_from_stuck` | 右向偏移 + 保留避弹 | 不允许无条件乱冲 |

运行时最终仍输出标准 `finalInput`，并在 `nes.frame()` 前写入手柄。

## 5. 当前策略经验总结

### 5.1 AI 现状

当前 AI 已经会：

- 上下左右。
- 跑。
- 跳。
- 射击。
- 写入 1P / 2P 手柄。
- 在入局后累计基础行为数据。

所以当前问题不是“AI 没有动作能力”，而是“AI 没有足够稳定的战术能力”。

必须优先补：

- Danger Detector。
- Route / Progression Script。
- Action Lock。
- FSM。
- Loop Exit。
- EntityTaxonomy。
- Fixed Target HP Monitor。

### 5.2 TAS 定位

TAS 在本项目中是路线知识库，不是控制器。

允许提取：

- 进度区间。
- 起跳点。
- 站位点。
- 必清固定目标。
- 武器路线。
- Boss 或关卡障碍处理顺序。

禁止直接把 TAS 输入当成浏览器运行时控制器。ROM、模拟器、RNG、帧同步和人类配合都会造成差异。

### 5.3 浏览器和训练平台分工

浏览器是产品平台：

- 真实 ROM 运行。
- 玩家驾驶舱。
- RAM 数据显化。
- 策略加载和调试。
- 人类 / AI / 混合模式。

Python 或训练环境是后续训练平台：

- 策略搜索。
- 轨迹学习。
- 批量评估。
- 强化学习实验。

当前不能把训练平台的假设直接塞进浏览器产品主线。

## 6. 第一关基准路线构建

当前 Contra US 第一关策略要先做稳健生存，而不是追求最快或最少开枪。

### 6.1 当前人工轨迹正例

来自 `references/contra-us/play-traces/2026-06-06T23-55-55-772Z-human-run-analysis.md`：

| 片段 | 经验用途 |
|---|---|
| `WorldX 48-519` | 开局快速推进 |
| `WorldX 520-929` | 第一桥快速通过 |
| `WorldX 930-1549` | 中段推进 |
| `WorldX 3023 / 3032` | Boss 墙前固定炮台预清 |
| `WorldX 3208` | Boss 核心处理 |

这些片段应进入 Contra 的实现手册和策略片段库，不进入通用核心协议。

### 6.2 当前人工轨迹反例

| 失败点 | 失败类型 | 修正方向 |
|---|---|---|
| `WorldX 2622` | Boss 前坑 / 跳跃窗口失败 | 建立关卡进展障碍前的起跳动作锁 |
| `WorldX 3208` | Boss 墙站位 / 落地失败 | 固定目标站位锁 + HP 监视闭环 |
| 第一桥前奖励未命中 | 奖励打法失败 | 加入下压枪口、固定射击点和奖励确认 |
| 第一桥 / 第二桥掉落 | 起跳点不稳定 | 用 WorldX 窗口 + 当前速度 + 动作锁 |
| 固定炮台不开枪 | 威胁识别或角度映射失败 | Threat Pool 强制战备 + 自动瞄准 |
| 卡住循环 | Loop Exit 不足或片段冲突 | 右向偏移补偿，保留避弹，不直接重置 |

### 6.3 稳健生存策略定义

Contra US 的稳健生存策略不是“只跑到终点”。

它必须优先：

1. 不死。
2. 清除会阻挡路线或持续造成危险的固定目标。
3. 获取关键武器，尤其是能显著降低固定目标处理难度的武器。
4. 正确通过桥、坑、平台和关卡进展障碍。
5. 在安全窗口推进。

普通敌兵和奖励不应无限拖慢路线；但关键奖励、固定火力和关卡进展障碍必须处理。

### 6.4 清敌、奖励、快速通过的片段拆分

同一段人类轨迹不能只形成一条路线。必须拆成多种片段：

- `speed`：快速通过片段。
- `combat`：清敌 / 固定火力片段。
- `loot`：奖励或武器片段。
- `survival`：避坑、避弹、桥段片段。
- `objective`：关卡进展障碍处理片段。
- `failure`：死亡、卡住、错过奖励、未开枪反例。

不同策略模式可以复用同一个片段，但权重不同。

## 7. 当前战术模块要求

### 7.1 Danger Detector

不能把所有实体都当作危险。

处理顺序：

```text
raw entity slots
-> EntityTaxonomy
-> ignore pickups / visuals
-> fixed targets
-> dynamic threats
-> projectile prediction
-> immediate lethal danger
```

动态威胁必须引入未来轨迹预测。只有未来若干帧可能与玩家碰撞的对象，才应该触发强避让。

### 7.2 Fixed Target HP Monitor

固定目标必须监控 HP 或有效受击状态。

规则：

- HP 下降，说明当前射击有效，继续保持。
- HP 长时间不变，说明角度、距离或站位无效，必须变轨。
- 固定目标仍在且距离进入处理窗口，不能只因为路线推进而忽略。

### 7.3 Action Lock

适合动作锁的场景：

- 桥前起跳。
- 空中扫射。
- 固定目标站位。
- 关卡进展障碍落地和射击。
- 近身危险的紧急闪避。

动作锁必须有：

- 最大帧数。
- 退出条件。
- 安全覆盖。
- Loop Exit 可解除条件。

### 7.4 Loop Exit

Contra 里已经多次暴露“卡住循环”问题。

Loop Exit 不应简单重置状态，而应使用偏移补偿：

```text
if stuck:
  increase forward bias
else:
  decay forward bias
```

同时必须保留立即避弹。Loop Exit 的目标是解除无进展循环，不是让 AI 盲目冲刺。

### 7.5 Precision Fire 当前边界

精确射击长期有价值，但当前暂缓作为主线。

原因：

- 过严命中预测会导致 AI 看见敌人、炮台、奖励也不开枪。
- 当前更重要的是“有效火力压制 + 固定目标 HP 闭环 + 关键站位”。
- 后续再逐步优化“不浪费子弹”。

## 8. 数据显化口径

### 8.1 死亡数

死亡数使用状态转移和 death flag 上升沿统计，当前对 1P 可靠。

### 8.2 击杀和摧毁

当前没有直接的“击杀计数 RAM”。

应分级：

- 分数上涨：高可信事件。
- 敌人 HP 归零：高可信事件。
- 敌人槽消失：中等可信，需要过滤滚屏回收。
- 队伍归因：双人时不能强行归给 1P 或 2P。

显示上应区分：

- 普通敌兵。
- 固定炮台 / 固定火力。
- 飞行物。
- Boss / 高价值部件。
- 未归因。

### 8.3 武器和奖励

武器获得应单独统计：

- M。
- S。
- F。
- L。
- R。
- B。

重复拾取、死亡丢失、状态未变化的奖励，需要结合物品事件继续验证。

## 9. 双人和协作限制

当前 2P 面板已经同构，但 2P 坐标、生命、武器、跳跃等 RAM map 仍需验证。

双人策略规则：

- 2P 不能在单人局里凭空操作角色。
- 人类 + AI 模式中，人类主导权优先。
- AI 不能抢屏害死人类。
- 2P AI 应围绕 1P 状态做护卫、补枪、让路和等待。
- 双 AI 必须分工，不能两个角色抢同一路线。

在人类 + AI、双 AI 完整验收前，单 AI 稳健生存仍是第一优先级。

## 10. 下一阶段 Contra US 工作顺序

1. 把人工轨迹正例和反例写入 `references/contra-us/strategy-db/fragments.json`。
2. 建立 Contra 专属 `condition-registry.json`。
3. 建立 Contra 专属 `entity-taxonomy.json`。
4. 建立 Contra 专属 `action-map.json`。
5. 把现有第一关 Route Script 从按钮脚本逐步改成 intent + action mapping。
6. 对第一关稳健生存跑单 AI 验收。
7. 单 AI 稳健生存通过后，再做人类 + AI。
8. 人类 + AI 稳定后，再做双 AI。

判断标准是实际运行证据，不是口头声称策略完成。

## 11. StrategyPack 示例文件

当前 Contra US 第一关的专用 StrategyPack 示例已经单独放在：

```text
references/contra-us/strategy-db/contra-us-stage1-strategy-pack-example.md
```

这个文件用于说明：

- 每个游戏专用策略包应包含哪些文件。
- Contra US 当前 ROMProfile 如何写。
- Contra 的 Condition Registry、EntityTaxonomy、ActionMap、StrategyTypes 如何从现有经验抽象。
- 第一关当前已知正例和失败反例如何进入 StagePlan 与 Fragment。
- 为什么当前只能标记为 `candidate`，不能标记为 `validated`。
