# 首批 Game Profile 路线图

本项目按 Game Profile 扩展 FC/NES 游戏。首批目标不是收集尽可能多的游戏，而是用少量代表性游戏建立通用平台能力。

## 选择标准

首批游戏必须满足至少一项：

- 有明确 RAM 可读状态，能建立结构化 State Adapter。
- 操作规则清晰，适合 `read state -> decide -> write input -> run one frame`。
- 能验证新的平台能力，例如双人协作、路线、避险、射击、近战、Boss、道具、地图导航。
- 玩家熟悉度高，适合展示 AI 陪玩价值。
- ROM 版本能通过哈希建立 profile，不依赖文件名。

不优先：

- 只靠作弊码才容易运行的版本。
- 改版、盗版、中文 hack 作为主支持版本。
- ROM 版本不清楚、RAM 资料无法验证的游戏。
- 暂时无法体现 AI 陪玩价值的纯文字或低互动游戏。

## 首批八强

| 顺序 | Game Profile | 中文名 | 第一目标 | 平台能力 |
| --- | --- | --- | --- | --- |
| 1 | `contra` | 魂斗罗 | 当前主线，先做 `contra-us-good` | 双手柄、RAM 读状态、WorldX、Route Script、Danger Detector、Action Lock、FSM |
| 2 | `super-c` | 超级魂斗罗 | 魂斗罗系列第二个正式 profile | 验证同系列但不同 ROM / RAM / 路线不能混用 |
| 3 | `contra-force` | 魂斗罗外传 | 魂斗罗系列扩展 profile | 验证同品牌不同玩法和不同引擎的 profile 隔离 |
| 4 | `jackal` | 赤色要塞 | 第一个非魂斗罗双人协作游戏 | 俯视地图导航、载具移动、救援/投弹/射击协作 |
| 5 | `battle-city` | 坦克大战 | 第一个固定防守类 profile | 基地保护、路径阻挡、子弹反弹/障碍物、双人防守协作 |
| 6 | `double-dragon-ii` | 双截龙 II | 第一个近战动作 profile | 近战距离、朝向、连招、敌人包围、场景推进 |
| 7 | `ninja-gaiden` | 忍者龙剑传 | 第一个高精度平台动作 profile | Action Lock、跳跃窗口、敌人刷新、单人路线稳定性 |
| 8 | `mega-man-2` | 洛克人 2 | 第一个武器/Boss策略 profile | 武器选择、Boss弱点、关卡选择、资源管理 |

候补池：

- `super-mario-bros`：平台基准和公开 AI 资料多，但陪玩属性较弱，可作为单人路线基准。
- `adventure-island`：横版平台和跳跃节奏基准。
- `gradius` / `salamander`：横版飞行射击、火力和弹幕规避。
- `river-city-ransom` / 热血物语：动作 + 轻 RPG，后续可验证状态成长和商店系统。

## 阶段安排

### Phase A：魂斗罗系列

目标：把第一个系列做深。

- `contra`：正式主线，先支持 `contra-us-good`。
- `super-c`：只在 `contra` 的 Game Profile 架构稳定后接入。
- `contra-force`：作为同品牌不同引擎验证，不提前套用魂斗罗 RAM / Route / 策略。

验收重点：

- 每个 ROM Profile 都有哈希识别。
- 每个游戏有独立 RAM Schema 和 State Adapter。
- 不同游戏的 Route Script、Danger Detector、FSM 不混用。

### Phase B：赤色要塞

目标：验证平台不是横版魂斗罗专用。

- 建立 `jackal` Game Profile。
- 先做 ROM Profile 和基础 RAM Schema。
- 再做俯视移动、路线、敌弹危险、救援目标、双人协作。

### Phase C：类型扩展

目标：用不同游戏类型补齐平台能力。

- `battle-city` 验证固定防守和空间阻挡。
- `double-dragon-ii` 验证近战和朝向。
- `ninja-gaiden` 验证高精度跳跃和 Action Lock。
- `mega-man-2` 验证武器选择和 Boss 策略。

## 通用规则

- 每个游戏先建立 ROM 版本矩阵，再做 RAM 和策略。
- 每个 Game Profile 至少有：`game.json`、`roms.json`、`ram-schema.json`、`strategies.json`。
- 未识别 ROM 不进入正式 AI 策略。
- 外部资料、TAS、地图、训练轨迹都必须绑定 `gameId + romProfileId`。
- 一个游戏做到“可运行 + 可观察 + 可验证”后，再进入下一个游戏。

## 当前决定

当前不开始赤色要塞代码实现。

先完成魂斗罗主 profile：

1. ROM Profile 识别。
2. `contra-us-good` 的 RAM Schema 稳定。
3. Danger Detector V0。
4. Action Lock V0。
5. FSM V0。
6. 第一关策略验收。

魂斗罗主 profile 通过后，再进入 `super-c` 和 `jackal`。
