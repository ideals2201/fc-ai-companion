# FC 通用游戏平台与 Game Profile 架构

本项目目标不是只做魂斗罗工具，而是做 FC/NES AI Companion 通用平台。魂斗罗是第一个验证游戏，不是平台边界。

## 平台核心

平台核心必须保持游戏无关：

- 模拟器运行：加载用户自有 ROM、推进帧、音频、画面。
- 输入系统：1P / 2P 键盘、手柄、面板、AI 输入合成。
- ROM 识别：header、mapper、size、MD5、SHA1、SHA256、支持状态。
- 帧循环：`read state -> decide -> write input -> run one frame`.
- 驾驶舱 UI：电视、主机、手柄舱、数据面板、事件流。
- 资料库：Game Profile、ROM Profile、RAM schema、Route Script、策略、训练轨迹元数据。

平台核心不得硬编码具体游戏的敌人类型、RAM 地址、路线、Boss、分数规则。

## Game Profile

每个游戏必须有独立 Game Profile。

Game Profile 负责：

- 游戏身份：`gameId`、显示名、平台、默认支持 ROM。
- ROM Profiles：不同区域、版本、改版、合集版的哈希和支持状态。
- RAM Schema：把原始 RAM 地址解析成结构化状态。
- State Adapter：把 RAM 转换为通用 AI 状态，如玩家、敌人、子弹、奖励、关卡、屏幕、WorldX。
- Route Script：按关卡和策略保存路线知识库。
- Danger Detector：游戏专属危险识别。
- Action Lock / FSM：游戏专属动作保持和状态机。
- Strategy Pack：稳健、生存、快速、清敌、奖励、护卫、个人策略等策略权重。
- Data Labels：UI 中显示的生命、分数、武器、敌人分类、战果分类。

## 建议目录

后续应从当前 `public/strategies/contra` 逐步演进为：

```text
apps/browser-cockpit/public/game-profiles/
  contra/
    game.json
    roms.json
    ram-schema.json
    stages/
      stage1/
        routes/
          survival.json
          speedrun.json
          combat.json
          loot.json
          guard.json
    strategies.json
    detectors.json
```

训练轨迹和玩家个人策略不默认提交仓库，应保存在本地或导出文件中；进入正式资料库必须经过验收。

## ROM Profile

ROM Profile 是 Game Profile 的入口，不同 ROM 版本可以共享或分离策略。

字段建议：

```json
{
  "romProfileId": "contra-us-good",
  "gameId": "contra",
  "region": "U",
  "md5": "7bdad8b4a7a56a634c9649d20bd3011b",
  "sha1": "c9ea66bb7cb30ad5343f1721b1d4d3219859319b",
  "support": "supported",
  "compatibilityGroup": "contra-us",
  "notes": "Primary supported Contra ROM profile."
}
```

支持状态：

- `supported`: 可运行正式 AI 策略。
- `experimental`: 可以测试 AI，但 UI 必须明确提示实验。
- `reference`: 只用于资料分析，不自动运行策略。
- `unsupported`: 不加载策略，只允许人类操作和基础 RAM 观察。

## 策略适配

策略不直接绑定“游戏名”，必须绑定 `gameId + romProfileId 或 compatibilityGroup`。

规则：

- `Route Script` 必须声明目标游戏和目标 ROM 适配范围。
- `RAM Schema` 必须按 ROM Profile 验证；同名地址在不同版本中不能默认等价。
- TAS、网络攻略、反汇编资料、地图资料必须登记来源和 ROM 版本。
- 未知 ROM 的默认行为是安全待机，不允许 AI 自动执行魂斗罗策略。

## 新游戏接入流程

1. 建立 `gameId` 和 ROM Profile 哈希表。
2. 验证 ROM 能被模拟器稳定加载。
3. 建立 RAM Schema，至少包括玩家坐标、生命、死亡、关卡、屏幕、分数。
4. 建立基础 State Adapter，让 UI 能显示结构化状态。
5. 建立 Danger Detector V0。
6. 建立 Stage 1 Route Script。
7. 建立策略权重和 Action Lock / FSM。
8. 做三类验收：单 AI、人类 + AI、双 AI。
9. 记录外部资料和本地轨迹，进入语料库候选。

## 当前定位

当前 `contra-us-good` 是第一个正式支持 ROM Profile。

当前代码里仍有魂斗罗专用结构，后续应逐步迁移到 Game Profile 架构，迁移前不扩展第二个游戏的深度 AI。
