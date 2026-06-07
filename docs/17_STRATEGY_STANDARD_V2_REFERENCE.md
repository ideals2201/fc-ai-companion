# FC 游戏 AI 操作策略标准 2.0 参考资料

状态：候选资料

创建日期：2026-06-07

用途：记录标准 2.0 的候选增强方向，不修改已经发布的 1.0 标准。进入 2.0 正式标准前，必须再经过设计审查、schema 约束、样例策略包验证和真实运行证据验证。

## 1. 制品化与可分发原则

标准 2.0 应进一步强化“策略包是可分发制品”的原则。

策略包不应只是某个项目内部的调试文件，而应是任何实现同一标准的平台都能读取、审计、验证和运行的统一数据产品。

基础要求：

- 策略包必须声明目标游戏、目标 ROM Profile、兼容等级、策略版本、证据来源和授权状态。
- 策略包不得包含 ROM 文件。
- 策略包必须包含可机读 schema、可人读说明、真实运行证据和失败反例。
- 策略包必须能说明策略是人工编写、本地自动生成，还是 AI 增强分析生成。
- 不同来源生成的策略，最终都必须落到同一套 StrategyFragment / TraceEvidence / ValidationReport 标准格式。

## 2. 双模态协同

标准 2.0 可以引入双模态策略优化模型：

```text
Offline / Base Mode
本地自动化工程流

Online / Expert Mode
AI 智能辅助分析流
```

### 2.1 Offline / Base Mode

Offline / Base Mode 是无外部 API 依赖的基础模式。

目标：

- 在无网、无 API 额度、无大模型参与时，仍能持续收集运行证据。
- 自动记录死亡轨迹、卡住轨迹、关键输入、RAM 状态和失败片段。
- 使用内置规则完成基础差异分析。
- 生成简单策略修正建议，例如把 `advance` 调整为 `jump_advance`，或把某个失败窗口标记为禁止重复尝试。
- 将所有建议记录入库，但不能直接标记为 validated。

价值：

- 降低 API 成本。
- 保证系统高可用。
- 让确定性、机械性的修复优先由本地程序完成。
- 避免每个小失败都依赖大模型分析。

### 2.2 Online / Expert Mode

Online / Expert Mode 是有 API 或专家系统参与的增强模式。

目标：

- 把 `play-traces/`、`trace-evidence/`、`known-failures.md`、`validation-report.md` 和 StrategyFragment 候选打包给大模型或专家分析器。
- 从大量轨迹中寻找人类难以手工发现的模式。
- 对复杂战术问题提出候选 Fragment，例如射击时机偏慢、固定威胁站位不稳、队友协作抢屏、奖励路线收益不足等。
- 输出结构化建议，仍然必须经过本地 schema 校验和真实 ROM 回归测试。

价值：

- 用于复杂战术总结，而不是替代本地确定性验证。
- 用于发现隐藏模式，而不是直接控制手柄。
- 用于提出候选方案，而不是绕过 Safety Override 或 Validation。

## 3. 优化来源分级

标准 2.0 可以在 `manifest.json`、StrategyFragment 或 TraceEvidence 中加入优化来源字段。

建议分级：

```text
Level 0 Manual
人工编写或人工整理。

Level 1 Automated
本地跑局程序根据真实 trace、失败反例和规则引擎自动生成候选补丁。

Level 2 Augmented
本地程序把证据包交给大模型或专家系统分析，再生成候选补丁。
```

建议字段：

```json
{
  "optimization": {
    "level": 1,
    "mode": "automated",
    "source": "local-trace-analysis",
    "requiresExternalApi": false,
    "generatedBy": "runtime-trace-patcher",
    "humanReviewed": false,
    "evidenceRefs": []
  }
}
```

字段语义：

- `level`：0、1、2 三档。
- `mode`：`manual`、`automated`、`augmented`。
- `source`：策略优化来源。
- `requiresExternalApi`：是否依赖外部 API 才能生成。
- `generatedBy`：生成工具或人员。
- `humanReviewed`：是否经过人工审查。
- `evidenceRefs`：关联真实运行证据。

## 4. 审计要求

无论策略来自人工、本地自动程序，还是大模型增强分析，都必须满足相同审计要求。

必须记录：

- 生成来源。
- 输入证据。
- 修改前策略片段。
- 修改后策略片段。
- 失败类型。
- 是否通过 schema 校验。
- 是否通过真实 ROM 测试。
- 是否出现新失败。
- 是否由人类确认进入正式策略包。

禁止：

- 把 Level 1 或 Level 2 自动建议直接标记为 validated。
- 把大模型建议当作真实验证结果。
- 把无法复现的建议写入正式策略包。
- 把外部 API 分析过程中的敏感文件、ROM 文件或未授权资料打包分发。

## 5. 与 1.0 标准的关系

1.0 标准已经确定：

- StrategyPack 是统一输出产品。
- ROM 必须绑定 ROMProfile。
- Fragment 必须使用语义化 intent。
- TraceEvidence 是验收证据。
- Safety Override 优先于策略片段。
- TAS 是路线知识库，不是控制器。

2.0 候选方向不是推翻 1.0，而是在 1.0 之上补充：

- 策略制品的生成来源。
- 离线自动化优化流程。
- 在线 AI 增强分析流程。
- 自动补丁的审计与降级机制。
- 可分发策略包的成熟度标记。

## 6. 当前 Contra 实践映射

当前 Contra US 第一关策略开发已经接近 Level 1 Automated 的雏形：

- 自动跑局生成真实失败证据。
- 记录死亡点、WorldX、PlayerX/Y、输入、武器、敌人槽和失败类别。
- 将失败分支写入 `known-failures.md`。
- 将机器可读失败证据写入 `trace-evidence/`。
- 根据失败类别阻止同类死循环补丁。
- 从人类短段示范中提取候选动作片段。

但当前仍不属于完整 Level 1：

- 自动补丁生成还没有完整 schema。
- 自动补丁还没有统一审计字段。
- 自动建议还不能自动生成可验收 StrategyFragment。
- 人类审查流程还没有固化到 manifest 或 validation report。

因此，Contra 当前应标记为：

```text
optimization candidate:
Level 0 Manual + Level 1 Automated Evidence Collection
```

不能标记为：

```text
Level 2 Augmented
Neural Network Training
Validated Auto Strategy Generation
```

## 7. 进入 2.0 前必须解决的问题

- `optimization` 字段应放在 manifest、fragment，还是 trace evidence 中。
- Level 1 自动补丁是否允许直接写入 `fragments.json`，还是必须先进入 `candidate-patches/`。
- Level 2 是否只允许输出建议，不允许直接修改策略包。
- 自动补丁失败后如何回滚。
- 同一失败点最多允许自动尝试几次。
- 人类审查状态如何表达。
- 分发给第三方时，哪些证据可以带，哪些证据必须脱敏。
- API 增强分析的输入包格式如何标准化。
- 不同游戏是否允许自定义优化等级扩展。

## 8. 暂定结论

标准 2.0 应引入“策略优化来源分级”和“双模态协同”，但不应要求所有平台必须接入 API。

正确定位：

```text
本地自动化是基础能力。
AI 增强分析是可选增强能力。
真实 ROM 验证是最终验收能力。
```

