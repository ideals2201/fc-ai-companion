# Strategy Packs / 策略包

This directory stores source files for distributable FC AI Companion strategy packages.

本目录保存 FC AI Companion 可分发策略包的源文件。

Rules / 规则：

- One game uses one subdirectory named by `game-profile-id`. / 一个游戏对应一个以 `game-profile-id` 命名的子目录。
- Each game package must follow `docs/16_OPERATION_STRATEGY_STANDARD.md` and `docs/STRATEGY_PROTOCOL_CORE.md`. / 每个游戏策略包必须遵守 `docs/16_OPERATION_STRATEGY_STANDARD.md` 和 `docs/STRATEGY_PROTOCOL_CORE.md`。
- This directory is the source-of-truth archive for StrategyPack files. / 本目录是 StrategyPack 文件的标准源归档位置。
- Browser runtime strategy files may be generated or copied from this directory, but runtime exports are not the source of truth. / 浏览器运行时策略文件可以由本目录生成或复制，但运行时导出不是标准源。
- This directory must not contain ROM files, commercial game assets, save states, BIOS files, or unauthorized material. / 本目录不得包含 ROM、商业游戏资产、即时存档、BIOS 或未授权素材。

Standard structure / 标准结构：

```text
strategy-packs/
  <game-profile-id>/
    manifest.json
    game-profile.json
    rom-profiles/
    research/
    stages/
```

Current public candidate package / 当前公开候选策略包：

```text
strategy-packs/contra/
```
