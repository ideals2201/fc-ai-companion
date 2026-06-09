# FC AI Companion Work Log

本文件是项目长期工作日志，也是后续交接的唯一主入口。以后不要再新增一次性 handoff 文档；需要交接时，先看本文件最新条目，再看条目中引用的证据文件、测试和提交记录。

## 固定工作原则

- 用户身份：主人。
- 助手身份：00号游戏管家。
- 项目目录：`D:\Ai-Play\fc-ai-companion`。
- 长期目标：形成 FC/NES 训练 AI 陪玩的标准化程序，以魂斗罗作为首个验证对象，逐步完成高质量多策略通关策略包。
- 策略结论必须由 TraceEvidence、ValidationReport、测试、构建或运行证据支撑。
- TAS 是路线知识、时序证据和训练基准，不是生产控制器。
- ROM 不提交、不打包、不提供下载。
- 失败要进入证据系统，不靠盲目改坐标或口头判断。
- 对外或对后续开发者交接时，优先引用本工作日志。

## 2026-06-10

### 取消一次性交接文档

删除：

- `docs/HANDOFF_2026-06-10.md`
- `docs/PROJECT_HANDOFF_2026-06-10.md`

同步：

- `CLI_HANDOFF.md` 改为兼容跳转文件，只指向 `docs/21_WORK_LOG.md`。
- `strategy-packs/contra/dev-handoff/current-training-20260608/handoff-manifest.json` 的开发入口改为 `docs/21_WORK_LOG.md`。
- `strategy-packs/contra/dev-handoff/current-training-20260608/next-development-plan.md` 的起始阅读项改为 `docs/21_WORK_LOG.md`。

原因：

- 交接信息如果分散到多个一次性文件，后续会出现过期内容和重复入口。
- 本项目改为持续维护 `docs/21_WORK_LOG.md`，所有交接只看最新工作日志。

### Headless route-plan probe 证据闭环

当前 WIP 文件：

- `apps/browser-cockpit/src/headlessRoutePlanProbe.ts`
- `tests/headlessRoutePlanProbe.test.mjs`
- `scripts/headless-runtime-smoke.mjs`
- `tests/headlessRuntimeSmokeScript.test.mjs`

已完成：

- `scripts/headless-runtime-smoke.mjs` 支持 `--probe=route-plan`。
- headless route-plan probe 可以根据当前 RAM 快照和 Stage 1 route segment 生成按钮输入。
- smoke 报告新增：
  - `maxProgressSnapshot`
  - `lastActiveSnapshot`
  - `lostActiveSnapshot`
  - `maxProgressRouteSegment`
  - `lastActiveRouteSegment`
  - `lostActiveRouteSegment`
  - 对应按钮状态

验证命令：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs tests\headlessRoutePlanProbe.test.mjs
```

结果：

```text
7 tests total
7 pass
0 fail
```

运行证据命令：

```powershell
npm run smoke:headless-runtime -- --frames=3000 --strategy=speedrun-v0 --probe=route-plan
```

结果摘要：

```text
status: lost-active
activeFrame: 612
lostActiveFrame: 1818
strategyKey: speedrun-v0
probeInput: route-plan
strategyPlan.segmentCount: 6
ROM file: contra_us_test.nes
source.tasIsController: false
maxProgressSnapshot.worldX: 1206
lostActiveSnapshot.p1State: 2
lostActiveSnapshot.deathFlag: 1
lostActiveRouteSegment.id: mid-jungle
```

判断：

- route-plan probe 已能进入真实运行并推进到 `WorldX 1206`。
- 当前仍会死亡或失活，不能称为通关策略。
- 这条结果是下一步修正策略的 Trace/Runtime 证据，说明死亡点在 Stage 1 `mid-jungle` 区间。

### 全量测试状态

验证命令：

```powershell
npm test
```

结果：

```text
282 tests
282 pass
0 fail
```

尚需在保存版本前继续执行：

```powershell
npm run build
git diff --check
rg --files -g "*.nes" -g "*.fds" -g "*.zip" -g "*.7z" -g "*.rar"
```

### 下一步

1. 完成 build、diff check、ROM 扫描。
2. 若通过，保存版本，建议提交信息：
   ```text
   feat: add headless route plan probe evidence
   ```
3. 回到策略包主线：
   - 让策略包保存流程消费真实 `sideTrainingTraceEvidence`；
   - 导出 schema-bound package evidence；
   - 增加 ValidationReport gate；
   - 继续把 Contra Stage 1 稳健生存策略推进到真实 no-death 或明确低死亡验证。

### 操作训练资料调研

调研结论：

- 操作训练不应只做神经网络训练，也不应只背 TAS。更合理的工程路径是：
  `人类/TAS/AI 跑局输入记录 -> RAM 结构化状态 -> TraceEvidence -> Baseline/Fragment -> Runtime Validation -> StrategyPack promotion`。
- Gym Retro / Stable Retro 的设计与我们的方向一致：每个游戏需要定义 starting state、reward function、done condition、RAM variables、ROM hash、movie/replay。我们的 GameProfile、ROMProfile、Condition Registry、StrategyFragment 和 ValidationReport 可以继续沿这个方向发展。
- Replay/TAS 文件适合作为“示范输入”和“训练基准”，但不能直接等同于生产 AI 控制器；这与我们当前 TAS evidence-only 原则一致。
- DQfD 的可借鉴点不是立即上深度网络，而是“示范数据 + 自主跑局 + 优先回放”的分层思想。我们可以先实现本地版：失败片段优先进入修正队列，成功片段进入候选 baseline。
- OpenAI Retro 资料明确提醒：只按分数奖励可能导致 reward farming 和无限循环。我们的训练奖励必须把生存、推进、固定目标、奖励拾取、禁止死循环作为复合目标，而不能只奖励杀敌或分数。
- FCEUX movie/savestate 工作流证明，frame advance、savestate、movie input 是精确策略片段制作的成熟方法。我们当前 headless smoke 应继续补 `preLostActiveSnapshot`、nearby threat samples、失败窗口记录，形成类似“可回放的实验片段”。

落地工作项：

1. `STRATEGY_TRAINING_STANDARD.md` 后续补充“示范输入 -> baseline -> fragment -> validation”的训练数据流。
2. `STRATEGY_PROTOCOL_CORE.md` 后续明确 starting state、reward、done、RAM variable、ROM hash 是每个游戏 profile 的必填能力。
3. Headless smoke 输出继续增强：死亡前一帧、死亡帧、最大进度帧、周边敌人/子弹、按钮状态。
4. 稳健生存策略优先修“死亡/卡住”而不是追求杀敌数；杀敌、奖励、速度作为策略分支目标，不压过 Safety Override。

### Headless survival 首死修正

问题：

- `survival-v0` 在 headless route-plan probe 中开局死亡。
- 旧证据显示死亡点：
  - `lostActiveFrame: 878`
  - `worldX: 176`
  - `playerX: 128`
  - `playerY: 80`
  - 近身敌人：`dx=-3, dy=20`
  - 按键：只来得及 `down+B`，没有脱离位移。

修正：

- `headlessRoutePlanProbe` 增加空中下方近身敌人的脱离逻辑：
  - 下方近身威胁触发 `down+B`；
  - 同时允许 `right`，避免原地等待子弹命中导致身体碰撞。
- `scripts/headless-runtime-smoke.mjs` 增加：
  - `preLostActiveSnapshot`
  - `preLostActiveButtons`
  - `nearbyEnemies`
  - `nearbyBullets`
  - `distanceToPlayer`

验证：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs tests\headlessRoutePlanProbe.test.mjs
npm run smoke:headless-runtime -- --frames=3000 --strategy=survival-v0 --probe=route-plan
```

结果：

```text
targeted tests: pass 8 / fail 0
survival-v0 status: active
activeFrame: 612
lostActiveFrame: null
maxProgressSnapshot.worldX: 271
```

判断：

- 开局 `WorldX 176` 首死已解除。
- 当前策略仍不是通关策略；只是把第一个死亡阻塞后移。
- 下一步要用更长帧数或分段窗口找 `survival-v0` 的下一处死亡/卡住点。

### Headless survival 长跑证据与 WorldX 288 阻塞

新增能力：

- `scripts/headless-runtime-smoke.mjs` 将 headless 最大验证帧数提高到 `20000`，用于捕捉长跑死亡、恢复、卡住，而不是只看短窗口。
- smoke 报告新增 `maxProgressStallFrames`，按“距离最后一次刷新最大进度的帧数”计算，避免 AI 在相邻 WorldX 抖动时被误判为正常运行。
- `headlessRoutePlanProbe` 增加直接身体重叠的 Safety Override：
  - 当敌人与玩家身体区域直接重叠时，先左撤；
  - 空中下方近身敌人继续允许 `right + down + B`，避免 WorldX 176 首死。

验证：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs tests\headlessRoutePlanProbe.test.mjs
npm run smoke:headless-runtime -- --frames=20000 --strategy=survival-v0 --probe=route-plan
```

结果：

```text
targeted tests: pass 10 / fail 0
survival-v0 status: lost-active
activeFrame: 612
lostActiveFrame: 18232
preLostActiveSnapshot.worldX: 288
preLostActiveButtons: right + A + B
maxProgressSnapshot.worldX: 706
```

判断：

- `WorldX 176` 首死已修正。
- `WorldX 275` 贴身身体碰撞已经有测试覆盖。
- `WorldX 288` 仍是第一个 no-death 阻塞点；三种微操实验均不可靠：
  - 扩大左撤范围：避免死亡但形成长时间回退/卡住；
  - `down + right + B`：仍会死亡；
  - `up + right + B`：死亡更早。
- 结论：`WorldX 288` 不能继续靠通用 Danger Detector 猜单帧按键，应升级为关卡动作表中的固定点战术片段，至少包含：
  - 进入窗口前的站位；
  - 固定目标优先级；
  - 禁止无条件跳跃；
  - 通过/清敌/撤退的超时条件；
  - 失败时直接生成 TraceEvidence，不允许静默循环。

### 操作训练标准补强

外部资料对照后，标准层补强：

- `docs/STRATEGY_TRAINING_STANDARD.md`
  - 明确训练源不是批准源；
  - 标准数据流为：
    `training source -> observation/action trace -> baseline -> candidate StrategyFragment -> validation replay -> StrategyPack promotion`；
  - 增加人类演示、AI 跑局、TAS-derived base、known failure、自动/AI 增强建议的来源记录要求；
  - 增加 Demonstration Learning Model：AI 必须运行、失败、收集 off-route 状态，再做局部修正；
  - 增加 Reward And Terminal Design：禁止只按分数、杀敌、右移或奖励拾取训练，必须组合生存、推进、固定目标、loop exit 和策略目标。
- `docs/STRATEGY_PROTOCOL_CORE.md`
  - GameProfile 增加 `startingStates` 与 `trainingScenarios`；
  - 明确 Init Phase、Active Phase、TAS entry point、SaveState 回滚和验证起点必须由 GameProfile 或训练场景声明，不能塞进 StrategyFragment。
- `docs/STRATEGY_PACK_STANDARD.md`
  - 策略包索引训练资产时按角色分层：raw TAS、TAS training bases、human demonstrations、AI runs、known failures、validation reports；
  - 明确 raw TAS、人类演示、AI 输入都不能直接等同于 validated StrategyFragment；
  - 缺少 `training-scenarios.json` 的包必须标记验证场景缺失。

原因：

- FCEUX/TAS 体系证明 replay/movie 是精确输入证据，但不是生产控制器。
- Stable-Retro/Gym Retro 的可借鉴部分是 ROM hash、RAM variables、starting state、reward-like scoring、done conditions，而不是直接套用纯神经网络。
- DAgger 式思路适合本项目：示范只能给基准，真正的修正来自 AI 自己跑到失败状态后的局部补丁。

### Headless smoke 失败窗口追踪能力

新增能力：

- `scripts/headless-runtime-smoke.mjs` 支持：
  - `--trace-start=<frame>`
  - `--trace-end=<frame>`
- 报告新增 `traceWindow`，每帧包含：
  - active / afterActive
  - progressStallFrames
  - routeSegment
  - buttons
  - beforeSnapshot
  - afterSnapshot
- `compactSnapshot` 增加 `jumpState`，用于判断跳跃是否真的生效。

验证：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs
```

结果：

```text
4 tests
4 pass
0 fail
```

用途：

- 以后每个死亡点必须先抓连续窗口，不只看死亡前一帧。
- 当前用它定位 W609/W624/W647 桥段问题。

### Headless survival 桥段固定目标与贴身碰撞修正

问题链：

1. W288 固定点修正后，`survival-v0` 的第一处 no-death 阻塞从 W288 后移到 W609。
2. W609 证据显示：
   - 玩家已经落到低位；
   - W589 面对低位固定目标时原地 `A+B`，没有推进；
   - 动态敌兵进入后才 `right+B`，已经来不及。
3. W624/W647 进一步证据显示：
   - 通用 closeThreat 会让 AI 面对桥段固定目标无条件跳；
   - 直接身体重叠层原来永远向左撤，遇到左侧贴身敌人时反而撞上去。

修正：

- `headlessRoutePlanProbe` 复用 `stageOneOpeningLowFixedThreatPatch`，让 headless probe 与浏览器策略共享 W288 固定点经验。
- 增加桥段低位固定目标窗口：
  - W580-W610：提前 `right+B`，避免 W589 原地等待；
  - W612-W638：低位固定目标贴身时 `down+right+B`；
  - W636-W665：越过固定目标后继续 `down+right+B` 脱离，不再原地跳。
- 直接身体重叠从 boolean 改为返回最近威胁，并根据威胁相对方向撤离：
  - 威胁在右侧：左撤；
  - 威胁在左侧：右撤。

验证：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs tests\headlessRoutePlanProbe.test.mjs
```

结果：

```text
18 tests
18 pass
0 fail
```

运行证据：

```powershell
npm run smoke:headless-runtime -- --frames=20000 --strategy=survival-v0 --probe=route-plan
```

结果摘要：

```text
status: recovered-after-loss
activeFrame: 612
lostActiveFrame: 3135
preLostActiveSnapshot.worldX: 1192
preLostActiveSnapshot.playerY: 212
preLostActiveButtons: left + A + B
maxProgressSnapshot.worldX: 1395
maxProgressStallFrames: 12884
```

判断：

- 已确认 W609/W624/W647 桥段阻塞被后移，不是通关。
- 当前第一处 no-death 阻塞变为 W1192，后续还出现长时间停滞。
- 下一阶段必须针对 W1192/W1395 建立新的 TraceEvidence 或 trace window，再做局部策略补丁。
