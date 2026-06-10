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

## 2026-06-10: Contra US survival-v0 W1205 安全基线与失败实验归档

目标：

- 继续推进 Contra US `survival-v0` 第一关稳健生存策略。
- 必须避免死亡和死循环；所有策略结论必须由单测或 headless runtime smoke 支撑。

本轮保留的代码结论：

- `rewardStationFallingThreatPatch` 的 WorldX 覆盖从 `1040..1180` 扩到 `1040..1210`，用于覆盖 W1204 附近奖励站落兵窗口。
- `headlessRoutePlanProbe` 接入共享的：
  - `rewardStationFallingThreatPatch`
  - `stageOneCloseBodyThreatPatch`
- `stageOneCloseBodyThreatPatch` 和 headless threat scan 增加 grounded low-lane object residue 过滤：
  - grounded；
  - playerY >= 188；
  - `kind=object`；
  - `routine=0`；
  - `type=1/5`；
  - 位于玩家低位贴近窗口。
- 目的：避免 W1319 附近把低位残留对象当成真实近身威胁，造成无意义后退或停滞。

验证：

```powershell
node --test tests\contraStage1RewardTactics.test.mjs tests\headlessRoutePlanProbe.test.mjs
```

结果：

```text
75 tests
75 pass
0 fail
```

运行证据：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

当前安全基线结果：

```text
status=stalled-active
reason=progress-stalled
lostActiveFrame=
maxW=1205
finalW=1154
progressStall=994
maxStall=994
```

判断：

- 当前保留版本没有在 8000 帧 smoke 中死亡。
- 但仍未通关，且在奖励站 / 中段窗口附近出现 no-death stall。
- 不能标记为 validated StrategyFragment 或 passing ValidationReport。

本轮拒绝的失败实验：

1. `rewardStation pre-contact yield`
   - 思路：W1190-W1206 落兵未贴身时，让 close-body 放手给 falling-threat 继续右上射击。
   - 结果：
     ```text
     status=recovered-after-loss
     reason=gameplay-loss-recovered
     lostActiveFrame=2698
     maxW=1470
     finalW=1470
     ```
   - 结论：虽然后续能推进到 W1470，但中途死亡，不可保留。

2. `rewardStation no-hold-A`
   - 思路：奖励站未贴身阶段不持续按 A，让 close-body 接管时产生新的跳跃边沿。
   - 结果仍为：
     ```text
     lostActiveFrame=2698
     ```
   - 结论：死亡点没有解除，说明“持续按 A 导致跳跃边沿失效”不是充分根因。

3. `rewardStation front interception`
   - 思路：贴身阶段不再向左后退，而是正面右上/平射截击落兵。
   - 结果：
     ```text
     status=lost-active
     reason=gameplay-lost
     lostActiveFrame=2677
     maxW=1206
     finalW=82
     ```
   - 结论：正面截击会更早死亡，不可保留。

下一步：

- 不再在 W1190-W1206 窗口继续盲调单个按钮组合。
- 需要建立更强的局部证据：
  - 记录 W1180-W1210 连续窗口的玩家、敌人、子弹、按钮和 HP 变化；
  - 判断奖励站落兵是否能被当前武器实际击中；
  - 若不能击中，策略应优先规避或改站位，而不是继续射击；
  - 若能击中，必须定位当前射击方向、子弹轨迹或射击时机为何失败。
- 下一轮建议先做 `TraceEvidence` 或局部弹道/命中观测工具，再做新的 StrategyFragment。

### W1180-W1210 traceSummary 观测能力

新增：

- `scripts/headless-runtime-smoke.mjs` 在 `--trace-start` / `--trace-end` 时，除完整 `traceWindow` 外，额外输出 `traceSummary`。
- `traceSummary.frames[]` 包含：
  - frame；
  - active / afterActive；
  - worldX / playerX / playerY；
  - jumpState / p1State / deathFlag；
  - routeSegmentId；
  - buttons / buttonsText；
  - nearestEnemy；
  - nearestBullet。

验证：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs
```

结果：

```text
5 tests
5 pass
0 fail
```

实际观测命令：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=7100 --strategy=survival-v0 --probe=route-plan --trace-start=6880 --trace-end=6890
```

`traceSummary` 摘要显示：

```text
f=6880 W=1191 x=115 y=212 btn=upleftab e=t1/hp1/r2/enemy/dx28/dy-27
f=6885 W=1186 x=110 y=212 btn=upleftab e=t1/hp1/r2/enemy/dx27/dy-23
f=6890 W=1181 x=105 y=212 btn=upleftab e=t1/hp1/r2/enemy/dx25/dy-19
```

判断：

- 当前 W1180-W1210 问题不是缺少数据，而是 close-body safety 在奖励站落兵前方时持续左撤并朝左上射击。
- 但本轮尝试的 pre-contact yield、no-hold-A、front interception 都已被 smoke 证明会死亡，不能保留。
- 下一步必须增加命中/弹道观测，确认子弹是否有机会命中奖励站落兵，再决定是改射击、改站位，还是把该点列为强制规避路线。

### W1180-W1210 命中/弹道观测补强

新增：

- `traceSummary.frames[]` 增加：
  - `playerBulletVectors`：基于 before/after 两帧的 1P 活动子弹速度；
  - `bulletThreatIntersections`：子弹对附近威胁目标的投影交叉分析；
  - `predictedHitFrame` / `closestDistance` / `movingToward`；
  - `targetAfterHp` / `targetHpDelta` / `targetClearedAfter`；
  - `ramConfirmedHit`；
  - `predictedHitButNoRamEffect`。

验证：

```powershell
node --test tests\headlessRuntimeSmokeScript.test.mjs
```

结果：

```text
6 tests
6 pass
0 fail
```

局部观测 1：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=2800 --strategy=survival-v0 --probe=route-plan --trace-start=2660 --trace-end=2670
```

摘要：

```text
f=2660 W=1190 btn=upleftab e=s14/dx34/dy-30 hit=3 dist=12 ramHit=False noEffect=True afterHp=1 hpDelta=0
f=2663 W=1187 btn=upleftab e=s14/dx33/dy-27 hit=1 dist=9 ramHit=False noEffect=True afterHp=1 hpDelta=0
f=2665 W=1185 btn=upleftab e=s14/dx33/dy-26 hit=1 dist=9 ramHit=False noEffect=True afterHp=1 hpDelta=0
```

判断：

- 几何投影看似能命中，但 RAM 后一帧没有 HP 下降，也没有清槽。
- 不能用“预测几何相交”直接判定子弹可消灭敌人。

局部观测 2：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=7100 --strategy=survival-v0 --probe=route-plan --trace-start=6880 --trace-end=6890
```

摘要：

```text
f=6880 W=1191 btn=upleftab e=s15/dx28/dy-27 hit= dist=38 toward=False ramHit=False afterHp=1
f=6885 W=1186 btn=upleftab e=s15/dx27/dy-23 hit= dist=70 toward=False ramHit=False afterHp=1
f=6890 W=1181 btn=upleftab e=s15/dx25/dy-19 hit= dist=47 toward=False ramHit=False afterHp=1
```

判断：

- 后段 W1181-W1191 对最近落兵没有预测命中，也没有 RAM 命中。
- 当前按钮组合无法证明能清掉奖励站落兵。

拒绝实验：

- `controlledAdvanceBias override close-body retreat`
  - 思路：W1154 卡住时，让已有 `controlledAdvanceBias` 跳过 close-body 退避，强制回到向右推进。
  - 单测可变绿，但真实 smoke 结果为：
    ```text
    status=lost-active
    reason=gameplay-lost
    lostActiveFrame=5407
    maxW=1203
    finalW=82
    ```
  - 结论：不能保留。它把 no-death stall 变成死亡。

当前保留基线：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

结果：

```text
status=stalled-active
reason=progress-stalled
lostActiveFrame=
maxW=1205
finalW=1154
progressStall=994
maxStall=994
```

下一步判断：

- W1205 的正确方向不是简单强推，也不是继续右上射击。
- 应先把奖励站落兵处理从“按钮试错”升级为“站位/规避/命中确认”三选一：
  1. 若 RAM 证明能命中：再做射击方向和时机补丁；
  2. 若 RAM 证明不能命中：路线应提前避让或改变站位；
  3. 若命中和规避都不稳定：该窗口应变成 StagePlan 中的特殊风险节点，不交给通用 close-body safety。

### 2026-06-10: 操作训练外部资料调研标准化

触发：

- 用户要求查询网络上关于操作训练的信息，判断我们是否可以借鉴。
- 当前目标仍是形成 FC/NES 训练 AI 陪玩的标准化程序，并以魂斗罗作为首个验证对象。

查证资料：

- Gym Retro / Stable-Retro：
  - 游戏集成应分离起始状态、奖励函数、终止条件、内存变量。
  - replay/movie 文件可作为训练数据，因为它们保存起始状态和按键序列，而不是完整视频。
- FCEUX / FM2：
  - `.fm2` 保留 `romChecksum` 和逐帧输入日志。
  - TAS 对齐必须保留 movie framecount、input row index、ROM checksum 和 entry point。
- FCEUX LuaBot：
  - 采用 segment / attempt / score / tie / rollback 的分段试错模式。
  - 这比全关按钮暴力搜索更适合本项目。
- DAgger / DQfD：
  - 人类、TAS、已验证策略可作为示范数据。
  - 不能指望一次示范覆盖 AI 自己跑出来的坏状态；必须收集失败窗口并聚合修正。
- Gym Retro reward farming 经验：
  - 单纯优化分数会导致刷分死循环。
  - 本项目必须把进度、生存、固定目标、终止条件和 loop-exit 纳入同一训练场景。

本次文档修改：

- `docs/STRATEGY_TRAINING_STANDARD.md`
  - 增加 External reference alignment。
  - 增加 movie/replay source rules。
  - 增加 DAgger-style correction rule。
  - 增加 DQfD-style demonstration rule。
  - 增加 reward-farming guard。
  - 新增 `2.3 Segmented Trial, Rollback, And Patch Search`。
- `docs/STRATEGY_PACK_STANDARD.md`
  - 增加 replay/movie 同步锚点要求。
  - 增加不可打包商业 ROM 的本地导入槽说明。
  - 增加 training-origin gates。
  - 新增 `8.1 Trust Pipeline`，包含 structural integrity、sandbox validation、social/expert proof。

工程判断：

- 当前不切换为纯神经网络训练。
- 当前最高效训练路线仍是：

```text
TAS / human / AI trace
-> side-owned baseline
-> segmented local patch search
-> candidate StrategyFragment
-> shadow/runtime validation
-> StrategyPack promotion
```

后续执行约束：

- 不再把“看人打一遍”理解为复制整关输入。
- 不再用单一分数、击杀数或奖励数量判断策略有效。
- 不再用未经 ROMProfile / movie frame / input row 对齐的 TAS 数据作为基准。
- 所有训练候选必须带 TraceEvidence、ValidationReport 或明确的 `candidate` 状态。

验证：

```powershell
npm test
```

结果：

```text
tests 300
pass 300
fail 0
```

```powershell
npm run build
```

结果：

```text
tsc -b && vite build
built in 2.26s
```

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

结果：

```text
status=stalled-active
reason=progress-stalled
maxW=1205
finalW=1154
progressStall=994
maxStall=994
```

判断：

- 标准文档和当前代码测试通过。
- 当前 `survival-v0` 仍未通关，不能发布为 validated。
- 后续应按新补强的训练标准继续做 W1205 分段搜索和失败窗口修正。

### 2026-06-10: Contra US W1205 分段训练搜索基线

触发：

- `survival-v0` 在 Contra US Stage 1 稳定复现 W1205 附近进度卡死。
- 之前多次直接改按钮会产生死亡回归，所以本次不继续猜操作，而是先建立可比较的分段训练搜索能力。

新增模块：

- `apps/browser-cockpit/src/segmentedTrainingSearch.ts`

能力：

- `rankSegmentAttempt(...)`
  - 输入一个分段尝试结果。
  - 输出 `score`、`gateStatus`、`rejectionReasons`、`riskTags`、`progressGain`。
  - 会把死亡、desync、stuck loop 拒绝。
  - 会把有分数/奖励但进度失败的尝试标记为 `reward-farming-risk`。
- `createSegmentedTrainingSearchReport(...)`
  - 输出 `fc-ai-segmented-training-search-report-v1`。
  - 报告状态固定为 `candidate-search`。
  - `validationStatus` 固定为 `missing`，防止搜索结果被误当作 validated。
  - 必须要求后续 `TraceEvidence`、`ValidationReport`、`mode-specific runtime replay`。

新增证据：

- `data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json`

基线数据来源：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

结果：

```text
status=stalled-active
reason=progress-stalled
maxW=1205
finalW=1154
progressStall=994
maxStall=994
```

归档判断：

- `attemptId`: `survival-v0-route-plan-baseline`
- `gateStatus`: `rejected`
- `rejectionReasons`: `stuck-loop`
- `riskTags`: `progress-stall-risk`
- `bestAttempt`: `null`

新增测试：

- `tests/segmentedTrainingSearch.test.mjs`
  - 验证安全进度尝试会排在死亡、卡死和 reward-only loop 前面。
  - 验证搜索报告只输出 candidate evidence，不输出 validated。
- `tests/contraUSSegmentedTrainingSearchEvidence.test.mjs`
  - 验证 W1205 baseline 报告存在。
  - 验证它记录当前卡死，并且没有被误标记为 validated。

验证：

```powershell
node --test tests\segmentedTrainingSearch.test.mjs tests\contraUSSegmentedTrainingSearchEvidence.test.mjs
```

结果：

```text
tests 3
pass 3
fail 0
```

```powershell
npm test
```

结果：

```text
tests 303
pass 303
fail 0
```

```powershell
npm run build
```

结果：

```text
tsc -b && vite build
built in 2.19s
```

下一步：

- 用该分段搜索报告作为比较基线。
- 每个 W1205 候选补丁必须先成为一个 segment attempt，再比较 `maxProgression`、`finalProgression`、`deathCount`、`progressStallFrames`。
- 只有候选尝试产生 `candidate` 且通过真实 replay，才进入 StrategyFragment proposal。

### 2026-06-10: W1205 候选试验隔离机制

触发：

- 直接修改 live 策略测试 W1205 会带来死亡回归风险。
- 需要让候选补丁可以被 headless smoke 单独运行、单独记录，而不污染正式策略。

新增能力：

- `apps/browser-cockpit/src/headlessRoutePlanProbe.ts`
  - `decideHeadlessRoutePlanProbeButtons(...)` 增加 `candidateTrial` 参数。
  - 当前支持 `w1205-falling-threat-priority`。
  - 默认不传 `candidateTrial` 时，正式策略行为不变。
- `scripts/headless-runtime-smoke.mjs`
  - 增加 `--candidate-trial=<id>` 参数。
  - report 顶层输出 `candidateTrial`，方便直接归档到 segment-search-report。

候选试验：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-falling-threat-priority
```

结果：

```text
candidate=w1205-falling-threat-priority
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=2677
maxW=1759
finalW=1174
progressStall=2929
maxStall=2929
```

正式基线复核：

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

结果：

```text
candidate=
status=stalled-active
reason=progress-stalled
lostActiveFrame=
maxW=1205
finalW=1154
progressStall=994
maxStall=994
```

判断：

- `w1205-falling-threat-priority` 可以突破 W1205，最高到 W1759。
- 但它触发了 gameplay loss/recovery，不能进入 live survival 策略。
- 已作为 rejected attempt 归档到：
  - `data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json`

新增/更新测试：

- `tests/headlessRoutePlanProbe.test.mjs`
  - 验证默认 close-body 行为不变。
  - 验证 candidateTrial 可隔离触发 W1205 falling-priority 候选。
- `tests/headlessRuntimeSmokeScript.test.mjs`
  - 验证 `--candidate-trial=` 被脚本支持并进入报告。
- `tests/contraUSSegmentedTrainingSearchEvidence.test.mjs`
  - 验证 W1205 rejected candidate 已入库。

验证：

```powershell
npm test
```

结果：

```text
tests 304
pass 304
fail 0
```

```powershell
npm run build
```

结果：

```text
tsc -b && vite build
built in 2.24s
```

下一步：

- 不再通过 live 改动试候选。
- 后续每个 W1205 候选都走 `--candidate-trial` 或等价隔离入口。
- 下一个候选不应再单纯“右上穿过”，而应针对 W1759 之后的 gameplay loss 做 trace window 分析，或设计 W1205 到 W1840 的二段候选链。

### 2026-06-10: Training references converted into report gates

Trigger:

- The owner asked to research operation-training practices on the web and decide what can be reused.
- The useful pattern is not raw neural-network training. It is structured game integration, replay/movie sync anchors, segmented local search, demonstration correction, and validation gates.

References applied:

- Stable-Retro / Gym Retro style separation: state variables, reward rules, terminal conditions, replay sources, and starting state are separate artifacts.
- FCEUX FM2 style sync: movie framecount, input row index, ROM checksum, and entry-state type must be preserved when replay/TAS data is used.
- FCEUX LuaBot style search: candidate patches should be tried inside a small segment window and rolled back when they fail.
- DAgger / DQfD style demonstration usage: TAS or human input can seed baselines, but AI failure windows must be collected and corrected before promotion.

Code update:

- `apps/browser-cockpit/src/segmentedTrainingSearch.ts`
  - added `syncAnchors`.
  - added `deterministicContext`.
  - added `promotionGates`.
  - default promotion gates are all `missing`, so a segment-search report cannot be confused with validated strategy behavior.

Evidence update:

- `data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json`
  - now records the headless runtime sync clock: `browser-headless-jsnes`, `nes.frame-before-step`, `runtime-checkpoint`.
  - now records deterministic context: RNG unknown, input sampling delay `0`, perturbation still required.
  - now records missing gates for TraceEvidence, ValidationReport, mode-specific replay, deterministic context, and negative constraints.

Standard update:

- `docs/STRATEGY_TRAINING_STANDARD.md`
  - kept the external-reference alignment section.
  - kept segmented trial / rollback / patch-search rules.
  - changed the automated asset checklist heading and directive to English to avoid internal encoding drift.

Tests:

```powershell
node --test tests\segmentedTrainingSearch.test.mjs tests\contraUSSegmentedTrainingSearchEvidence.test.mjs tests\strategyTrainingStandardDoc.test.mjs
```

Result:

```text
tests 5
pass 5
fail 0
```

Full verification:

```powershell
npm test
```

Result:

```text
tests 305
pass 305
fail 0
```

```powershell
npm run build
```

Result:

```text
tsc -b && vite build
built in 2.24s
```

Runtime smoke:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

Result:

```text
status=stalled-active
reason=progress-stalled
maxW=1205
finalW=1154
progressStall=994
```

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-falling-threat-priority
```

Result:

```text
candidate=w1205-falling-threat-priority
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=2677
maxW=1759
finalW=1174
progressStall=2929
```

Decision:

- The live `survival-v0` strategy is unchanged in outcome: it still stalls at W1205 and is not validated.
- The isolated falling-threat candidate remains rejected because it causes gameplay loss.
- The training system is now more rigorous: every future segment attempt must carry sync anchors, deterministic context, and explicit promotion gates before it can move toward StrategyFragment promotion.

### 2026-06-10: W1205 late-contact candidates rejected

Trigger:

- The previous isolated `w1205-falling-threat-priority` candidate passed the stall point but died at `frame=2677`.
- The trace window showed a close body contact, not a projectile problem.

Root-cause trace:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=3000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-falling-threat-priority --trace-start=2668 --trace-end=2678
```

Compressed evidence:

```text
frame 2668 W1198 buttons=uprightab enemy slot14 dx=16 dy=-24
frame 2671 W1201 buttons=uprightab enemy slot14 dx=9 dy=-21
frame 2675 W1205 buttons=uprightab enemy slot14 dx=0 dy=-18
frame 2676 W1206 buttons=uprightab enemy slot14 dx=-2 dy=-18
frame 2677 W1207 deathFlag=1 p1State=2 enemy slot14 dx=-5 dy=-17
```

Interpretation:

- The AI kept right-up fire while grounded.
- The nearby soldier entered the player collision box.
- Holding A did not create a new jump edge; `jumpState` stayed `0`.
- Therefore W1205 cannot be solved by simply continuing right-up fire.

New isolated candidates:

1. `w1205-falling-threat-contact-interrupt`
   - behavior: keep falling-threat priority, then switch to close-body left/up fire in the contact window.
   - result: rejected.

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-falling-threat-contact-interrupt
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=2677
maxW=1211
finalW=82
```

2. `w1205-contact-jump-preload`
   - behavior: release A before the contact window, then press A with left-up fire.
   - result: rejected.

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-contact-jump-preload
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=2677
maxW=1201
finalW=82
```

Code changes:

- `apps/browser-cockpit/src/headlessRoutePlanProbe.ts`
  - added isolated candidate-trial branches for:
    - `w1205-falling-threat-contact-interrupt`
    - `w1205-contact-jump-preload`
  - default live strategy behavior remains unchanged unless `--candidate-trial` is passed.
- `tests/headlessRoutePlanProbe.test.mjs`
  - added candidate isolation tests for both new W1205 branches.
- `data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json`
  - archived both candidates as rejected attempts.
- `tests/contraUSSegmentedTrainingSearchEvidence.test.mjs`
  - verifies both rejected attempts are present and not validated.

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\contraUSSegmentedTrainingSearchEvidence.test.mjs
```

Result:

```text
tests 21
pass 21
fail 0
```

```powershell
npm test
```

Result:

```text
tests 307
pass 307
fail 0
```

```powershell
npm run build
```

Result:

```text
tsc -b && vite build
built in 2.25s
```

Default live smoke:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

Result:

```text
status=stalled-active
reason=progress-stalled
maxW=1205
finalW=1154
progressStall=994
```

Decision:

- Both late-contact candidates are rejected.
- W1205 should now move to an earlier intervention model:
  - start the route change before W1198,
  - establish a safe standing position,
  - clear the soldier/fixed object before body contact,
  - or use a fixed StagePlan node with deliberate pause/aim instead of reactive close-body handling.
- Do not promote either rejected branch into live `survival-v0`.
