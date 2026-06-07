# Strategy Packs

本目录是 FC AI Companion 的正式操作策略文件夹。

规则：

- 一个游戏一个子目录，目录名使用 `game-profile-id`。
- 每个游戏子目录内部必须遵守 `docs/16_OPERATION_STRATEGY_STANDARD.md` 和 `docs/STRATEGY_PROTOCOL_CORE.md`。
- 本目录是 StrategyPack 的源码目录和标准存档目录。
- 浏览器运行目录可以从本目录生成或复制策略数据，但不能作为标准源。
- 本目录不得包含 ROM 文件、商业游戏资源、存档、BIOS 或未授权素材。

标准结构：

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
