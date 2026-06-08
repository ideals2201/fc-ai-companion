# Contra Strategy Pack

本目录保存 `gameProfileId = contra` 的正式 StrategyPack 文件。

当前策略包：

- 名称：魂斗罗第一关策略包 V0 / Contra Stage 1 Strategy Pack V0
- Pack ID：`contra-stage1-strategy-v0`
- 版本：`0.1.0`
- 状态：`candidate`

当前内容：

- `manifest.json` 声明本包支持的 ROMProfile、策略键、TAS 训练基座和派生 side baseline。
- `game-profile.json`、`rom-profiles/`、`research/` 保存游戏、ROM、条件、动作和策略分类定义。
- `stages/stage-1/fragments.json` 保存当前候选 StrategyFragment。
- `data/training/contra/tas_bases/contra-j-good/side-baselines.json` 是可供训练使用的 TAS side-owned baseline 制品。
- `dev-handoff/current-training-20260608/` 保存当前训练状态交接包，供其他开发者继续接手；它是 `candidate-research`，不是已验证通关包。

本目录不得包含 ROM 文件。

## Strategy Pack Distribution Rule

策略包可以有多个来源：官方包、项目内实验包、玩家个人包、TAS 派生包都可以分发和替换。

但为了让平台统一选择、比较、训练和验证，包内基础策略分类必须保持一致：

- `survival` / 稳健生存
- `speedrun` / 快速推进
- `combat` / 杀敌清场
- `loot` / 吃奖励
- `guard` / 护卫协作

允许游戏或玩家扩展分类，但必须写入 `research/strategy-types.json`，并且每个 StrategyFragment 的 `strategyTypes` 必须引用已声明的分类。未声明分类不能进入可分发策略包。

## Side-Owned Packs

1P 和 2P 可以使用不同策略包，但必须满足同一游戏、同一 ROMProfile、同一关卡协议版本。

双人协作模式还需要检查包之间的协作契约：

- 是否允许抢屏推进。
- 是否要求固定距离跟随。
- 是否会争抢奖励。
- 是否会重复执行同一固定目标清除动作。
- 是否会因为一个包保守、另一个包快速而造成卡位或死循环。

后续玩家包分发时，平台应显示组合效果和兼容风险，而不是只显示单包名称。

## Required Files For Distribution

策略包分发时至少应包含：

- `manifest.json`
- `game-profile.json`
- 对应 `rom-profiles/*.json`
- `research/condition-registry.json`
- `research/action-map.json`
- `research/strategy-types.json`
- `stages/<stage-id>/fragments.json`
- 必要的 `trace-evidence/` 或 TAS-derived training artifacts

TAS 派生数据可以作为训练基准分发，但不能绕过 Safety Override 和真实跑局验证，不能直接作为 AI 控制器。
