# Contra Strategy Pack / 魂斗罗策略包

This directory stores the official StrategyPack files for `gameProfileId = contra`.

本目录保存 `gameProfileId = contra` 的正式 StrategyPack 文件。

## Package Status / 包状态

- Name / 名称：Contra Stage 1 Strategy Pack V0 / 魂斗罗第一关策略包 V0
- Pack ID / 策略包 ID：`contra-stage1-strategy-v0`
- Version / 版本：`0.1.0`
- Status / 状态：`candidate`

This package is candidate research data, not a fully validated clear package.

本策略包是候选研究数据，不是已完整验证的通关包。

## Contents / 内容

- `manifest.json` declares supported ROM profiles, strategy keys, TAS training bases, side baselines, quality metadata, and package files. / `manifest.json` 声明支持的 ROM Profile、策略键、TAS 训练基座、side baseline、质量元数据和包文件索引。
- `game-profile.json`, `rom-profiles/`, and `research/` define game, ROM, condition, action, entity, and strategy taxonomy data. / `game-profile.json`、`rom-profiles/` 和 `research/` 定义游戏、ROM、条件、动作、实体和策略分类数据。
- `stages/stage-1/fragments.json` stores current candidate StrategyFragments. / `stages/stage-1/fragments.json` 保存当前候选 StrategyFragment。
- `stages/stage-1/training-progress.json` records the current measured training ledger. / `stages/stage-1/training-progress.json` 记录当前实测训练账本。
- `data/training/contra/tas_bases/contra-j-good/side-baselines.json` is a TAS-derived side-owned baseline for training reference. / `data/training/contra/tas_bases/contra-j-good/side-baselines.json` 是 TAS 派生的 side-owned 训练参考基线。
- `dev-handoff/current-training-20260608/` preserves the current training handoff package for future developers. / `dev-handoff/current-training-20260608/` 保存当前训练交接包，供后续开发继续接手。

## Runtime Export / 运行时导出

Browser runtime strategy exports are generated to:

浏览器运行时策略导出生成到：

```text
apps/browser-cockpit/public/strategies/contra/stage1/
```

Regenerate from the repository root with:

可在仓库根目录执行以下命令重新生成：

```powershell
npm run sync:strategies
```

## Strategy Pack Distribution Rule / 策略包分发规则

Strategy packs may come from official project packages, internal experiment packages, player-owned packages, or TAS-derived packages.

策略包可以来自官方项目包、项目内实验包、玩家个人包或 TAS 派生包。

To let the platform select, compare, train, and validate packages consistently, the base strategy categories must stay stable:

为了让平台能统一选择、比较、训练和验证，基础策略分类必须保持一致：

- `speedrun` / 快速推进
- `combat` / 杀敌清场
- `loot` / 奖励优先

Games or players may extend categories, but extensions must be declared in `research/strategy-types.json`, and each StrategyFragment may only reference declared categories.

允许游戏或玩家扩展分类，但必须写入 `research/strategy-types.json`，且每个 StrategyFragment 只能引用已声明分类。

1P and 2P may use different strategy packs, but they must share the same game, ROM Profile, stage protocol version, and compatibility rules.

1P 和 2P 可以使用不同策略包，但必须满足同一游戏、同一 ROM Profile、同一关卡协议版本和兼容规则。

Two-player cooperation must also check package-level coordination contracts:

双人协作还必须检查包之间的协作契约：

- side ownership / side 归属
- item priority / 道具优先级
- enemy handling responsibility / 敌人处理责任
- collision and waiting rules / 碰撞和等待规则
- loop or deadlock risk caused by mixed strategy priorities / 不同策略优先级混用导致的卡位或死循环风险

## Minimum Distributable Contents / 最小可分发内容

A distributable strategy package should include at least:

可分发策略包至少应包含：

- `manifest.json`
- `game-profile.json`
- matching `rom-profiles/*.json` / 对应的 `rom-profiles/*.json`
- `research/strategy-types.json`
- stage fragments and plans / 关卡片段和计划
- training progress ledger / 训练进度账本
- necessary `trace-evidence/` or TAS-derived training artifacts / 必要的 `trace-evidence/` 或 TAS 派生训练资料

TAS-derived data may be distributed as a training baseline, but it cannot bypass Safety Override or real runtime validation, and it cannot directly become a live AI controller.

TAS 派生数据可以作为训练基线分发，但不能绕过 Safety Override 和真实运行验证，也不能直接作为实时 AI 控制器。
