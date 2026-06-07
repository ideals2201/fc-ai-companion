# FC 游戏 AI 操作策略标准 1.0.0

发布日期：2026-06-07

## 发布对象

本次发布的是 FC 游戏 AI 操作策略标准，不是浏览器应用版本。

## 发布文件

- `docs/16_OPERATION_STRATEGY_STANDARD.md`
- `docs/STRATEGY_PROTOCOL_CORE.md`
- `references/contra-us/IMPLEMENTATION_GUIDE.md`
- `references/contra-us/strategy-db/contra-us-stage1-strategy-pack-example.md`

## 标准能力

- 策略分类标准。
- 策略形成过程。
- 标准输入资料。
- 标准输出 StrategyPack。
- 标准策略保存目录 `strategy-packs/`。
- Runtime API。
- 语义化意图融合。
- 输入采样延迟。
- RNG 影响范围和控制策略。
- Safety Override 安全守则。
- Schema 通用性要求。
- 验收等级。
- 数据可信度标准。
- 开发者统一使用流程。

## 边界

- 不包含 ROM 文件。
- 不发布任何商业游戏资源。
- 不声明 Contra US 第一关策略已完成验收。
- 不升级浏览器应用版本号。
- 不把浏览器 `public/strategies/` 目录定义为标准源目录。

## Tag

建议 Git tag：

```text
strategy-standard-v1.0.0
```
