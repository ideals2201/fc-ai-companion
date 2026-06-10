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

### 操作训练网络复核

触发：

- 用户要求再次查询网络上关于操作训练的信息，判断本项目是否可以借鉴。

参考资料：

- DAgger / imitation learning：`https://arxiv.org/abs/1011.0686`
- Stable-Baselines3 RL tips：`https://stable-baselines3.readthedocs.io/en/master/guide/rl_tips.html`
- Gym Retro game integration：`https://retro.readthedocs.io/en/latest/integration.html`
- Stable-Retro Python API：`https://stable-retro.farama.org/python/`
- FCEUX FM2 format：`https://fceux.com/web/help/fm2.html`
- TASVideos movie format notes：`https://tasvideos.org/LawsOfTAS/OnMovieFileFormats`

结论：

- 当前主线不改成纯神经网络训练。公开资料也显示，RL 需要大量样本、奖励函数反复调参，并且结果会受随机种子影响；这不适合现在急需完成稳健生存通关策略的阶段。
- 最适合本项目的是 DAgger-style 工作流：先用人类、TAS 或已验证策略提供示范基准，再让当前 AI 自己跑局，收集失败窗口，针对失败窗口生成短片段修正，再通过 runtime replay 验证。
- Gym Retro / Stable-Retro 的可借鉴点是工程结构，而不是直接替换运行时：每个游戏都应独立声明 starting state、RAM variables、reward-like scoring、done / terminal conditions、ROMProfile 和可复现入口。
- FCEUX FM2 / TASVideos 的可借鉴点是 TAS 作为 frame-indexed input log 和同步证据：必须保留 ROM checksum、movie framecount、input row index、entry point、emulator/runtime 信息；不能只看屏幕帧数猜对齐。
- 奖励设计不能只看分数、杀敌或奖励拾取。必须同时检查 progress、survival、fixed-target clearance、reward pickup、stuck-loop、death、desync 和 terminal condition，否则容易产生 reward farming 或死循环。
- 训练结果必须落成项目标准资产：TraceEvidence、candidate StrategyFragment、ValidationReport、StrategyPack promotion gate。人类演示、AI 跑局和 TAS 都是训练来源，不是批准来源。

对当前工作的影响：

- 继续使用 `STRATEGY_TRAINING_STANDARD.md` 规定的 Baseline -> TraceEvidence -> Candidate Fragment -> ValidationReport -> StrategyPack 流程。
- 继续把 TAS 定位为路线知识库和训练基准，不作为生产控制器。
- 继续用 headless runtime smoke 和 segmented training report 做快速迭代；失败候选要归档，不允许靠感觉覆盖 live `survival-v0`。
- 下一轮魂斗罗 US 稳健生存优先修 W1683-W1684 route formation，而不是继续给 W1726 加局部补丁。

### W1440 descent lower-body right carry rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` after the current formal baseline showed the first runtime death around W1439/W1440.
- Test a narrow candidate that changes the pre-loss input from `down+left+B` to `down+right+B` during an airborne descent lower-body contact window.
- Keep the change isolated behind `--candidate-trial`; do not promote it to live `survival-v0`.

Candidate:

```text
w1440-descent-lower-body-right-carry
```

Root cause evidence:

Baseline runtime command:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan
```

Baseline result:

```text
status=lost-active
lostActiveFrame=9414
maxProgression=1783
finalProgression=82
preLost W1440 X108 Y173 jumpState=81 buttons=down+left+b
near threat slot5 type5 dx=5 dy=23
```

The immediate symptom was a close lower-body enemy during descent. Generic close-body logic chose left retreat, but the character was already in an unsafe landing/contact timing.

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
New W1440 descent-lower-body test first failed because the candidate did not exist and the current decision still pressed left.
```

GREEN:

```text
tests 41
pass 41
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1440-descent-lower-body-right-carry
```

Result:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9414
maxProgression=1790
finalProgression=82
preLost W1442 X110 Y173 jumpState=49 buttons=down+right+b
lost W1443 X111 Y176 deathFlag=1 enemy slot5 dx=1 dy=20
```

Decision:

- `w1440-descent-lower-body-right-carry` is rejected.
- It successfully changes the local input from left retreat to right carry, but death still occurs on the same frame class.
- The useful lesson: this blocker is not solved by swapping horizontal direction after descent. The route must prevent the lower-body contact earlier, probably by changing the jump or landing timing before W1436.
- The rejected attempt is archived in:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('json-ok')"
```

```text
segmentedTrainingSearch: tests 19, pass 19, fail 0
json-ok
```

Next inference:

```text
Target W1430-W1440 route formation:
  avoid entering descent with lower-body slot5 already at dx 0..6 / dy 20..24;
  test earlier jump timing, jump-release timing, or pre-contact fire/positioning;
  do not repeat a late horizontal-direction swap as the main fix.
```

### W1454 fixed-contact carry / pulse rejected

Scope:

- Continue from the W1440 same-frame death evidence.
- Test whether the unsafe descent can be recovered slightly earlier at W1448-W1456 by forcing `right+down+B`.
- Test a second narrow hypothesis that releasing B for two frames then firing again can free bullet slots and hit the lower slot5 enemy.
- Keep both changes isolated behind `--candidate-trial`; do not promote either into live `survival-v0`.

Candidates:

```text
w1454-airborne-fixed-contact-right-carry
w1454-airborne-fixed-contact-pulse-carry
```

Root cause evidence:

Compact trace before the first loss showed the AI entered W1454 airborne with a fixed target ahead/up and a lower enemy already below-forward:

```text
frame 9393 W1454 X122 Y138 J49 enemy slot5 dx=11 dy=58 fixed dx=14 dy=-10
frame 9413 W1444 X112 Y173 J81 enemy slot5 dx=1 dy=23 fixed dx=24 dy=-45
frame 9414 W1445 X113 Y176 deathFlag=1 enemy slot5 dx=-1 dy=20
```

Bullet evidence before the pulse candidate showed existing shots had drifted left of slot5, so pure hold-B was not creating a useful fresh down shot:

```text
frame 9393 W1454 X122 Y138 buttons=down+right+B
slot5 x=133 y=196 dx=11 dy=58
player bullets: x=61/67/72, all left of slot5
```

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
W1454 pulse candidate first failed because the candidate did not exist and the current decision did not force right/down with B released.
```

GREEN:

```text
tests 43
pass 43
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1454-airborne-fixed-contact-right-carry
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1454-airborne-fixed-contact-pulse-carry
```

Both candidates:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9414
maxProgression=1790
finalProgression=82
lost W1445 X113 Y176 deathFlag=1 enemy slot5 dx=-1 dy=20
```

Decision:

- `w1454-airborne-fixed-contact-right-carry` is rejected.
- `w1454-airborne-fixed-contact-pulse-carry` is rejected.
- The useful lesson: the blocker is not a late firing cadence issue and not a late horizontal carry issue. The AI is already entering the landing/descent with slot5 too close to the body.
- Next route work must move earlier to W1430-W1454 route formation: jump timing, jump-release timing, lower enemy pre-clear, or a higher/safer landing arc before the lower-body contact exists.
- Both rejected attempts are archived in:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('segment report json ok')"
```

```text
headlessRoutePlanProbe: tests 43, pass 43, fail 0
segmentedTrainingSearch: tests 21, pass 21, fail 0
segment report json ok
```

### 取消一次性交接文档

删除：

- `docs/HANDOFF_2026-06-10.md`
- `docs/PROJECT_HANDOFF_2026-06-10.md`

同步：

- `CLI_HANDOFF.md` 已删除，不再保留一次性或跳转式交接文档。
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

## 2026-06-10 - W1205 additional rejected candidates and root-cause narrowing

Scope:

- Continue Contra US Stage 1 `survival-v0` W1205 candidate search.
- Keep every new attempt behind `--candidate-trial`.
- Do not change default live `survival-v0` unless a candidate passes runtime evidence.

Baseline trace recap:

- Default live route reaches `maxW=1205`, then retreats and stalls.
- Default smoke remains:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

```text
status=stalled-active
reason=progress-stalled
lostActiveFrame=null
maxW=1205
finalW=1154
progressStall=994
```

Rejected candidate 1: `w1205-precontact-station-clear`

- Hypothesis: stop around W1188 and clear the incoming soldier with up-fire before body contact.
- Result:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-precontact-station-clear
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=2691
maxW=1188
finalW=82
```

- Evidence: W1188 standing up-fire did not kill the soldier; the soldier closed from `dx=39 dy=-31` to body contact.
- Decision: rejected.

Rejected candidate 2: `w1205-force-upright-through`

- Hypothesis: ignore the retreat and force right-up fire through the W1205 contact window.
- Result:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-force-upright-through
```

```text
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=2677
maxW=1207
finalW=1147
progressStall=5324
```

- Evidence: the player still dies from body contact, then later recovers into a long stall.
- Decision: rejected.

Rejected candidate 3: `w1205-duck-under-contact`

- Hypothesis: in the low waterline contact window, hold right/down/fire instead of left-up escape.
- Result:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-duck-under-contact
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=2688
maxW=1198
finalW=1071
```

- Evidence: pre-death frame had `downrightb`, but the soldier still collided at `dx=-11 dy=-9`.
- Decision: rejected.

Rejected candidate 4: `w1205-pulsed-right-fire`

- Hypothesis: release B, then pulse straight right-fire to create fresh bullets instead of keeping one early right-up bullet.
- Result:

```powershell
node scripts/headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-pulsed-right-fire
```

```text
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=2677
maxW=1207
finalW=1147
progressStall=5324
```

- Evidence: fresh straight bullets were generated, but they passed under/after the soldier and did not prevent contact.
- Decision: rejected.

Trace conclusion:

- W1205 is not solved by late contact reaction:
  - late jump does not create a safe lift,
  - late left/up retreat dies or stalls,
  - late right-up rush dies,
  - late down/right waterline duck dies,
  - late straight-fire pulse still misses the soldier.
- The next viable model must intervene earlier than W1188:
  - choose a safer entry lane,
  - change the approach timing before the soldier spawn,
  - or set a StagePlan node that prevents the soldier from reaching the body lane before W1205.

Code/data changes:

- `apps/browser-cockpit/src/headlessRoutePlanProbe.ts`
  - added isolated candidate-trial branches:
    - `w1205-precontact-station-clear`
    - `w1205-force-upright-through`
    - `w1205-duck-under-contact`
    - `w1205-pulsed-right-fire`
  - default live behavior remains unchanged unless `--candidate-trial` is passed.
- `tests/headlessRoutePlanProbe.test.mjs`
  - added isolation tests for all four candidates.
- `data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json`
  - archived all four as rejected attempts.
- `tests/contraUSSegmentedTrainingSearchEvidence.test.mjs`
  - verifies the four attempts are rejected and not validated.

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\contraUSSegmentedTrainingSearchEvidence.test.mjs
```

```text
tests 25
pass 25
fail 0
```

```powershell
npm test
```

```text
tests 311
pass 311
fail 0
```

```powershell
npm run build
```

```text
tsc -b && vite build
built in 2.23s
```

Decision:

- Do not promote any of the four candidates to live `survival-v0`.
- Next work should stop trying W1205 contact-window variants and move to an earlier route-entry intervention before W1188.

## 2026-06-10 - W1205 post-retreat recovery candidate rejected

Scope:

- Follow up on the W1205 loop after the contact-window candidates were rejected.
- Inspect the default loop around W1141-W1205 instead of only the W1205 contact frame.

Observed loop shape:

- Default route oscillates:
  - retreats from W1205 back to about W1141,
  - briefly resumes right movement,
  - reaches W1205 again,
  - then repeats the same retreat.
- At W1141, the nearby low-lane enemy set includes:

```text
slot5  type5 routine0 dx=-4 dy=10
slot15 type1 routine2 dx=14 dy=11
slot14 type1 routine0 dx=12 dy=20
```

Hypothesis:

- After the W1205 retreat, force a low-lane recovery through this cluster with right/down/fire.

Candidate:

- `w1205-post-retreat-low-lane-recovery`

```powershell
node scripts/headless-runtime-smoke.mjs --frames=9000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-post-retreat-low-lane-recovery
```

Result:

```text
status=stalled-active
reason=progress-stalled
lostActiveFrame=null
maxW=1195
finalW=1138
progressStall=5529
```

Decision:

- Rejected.
- It avoids death, but performs worse than baseline (`maxW=1195` versus baseline `maxW=1205`) and remains in a long low-lane stall.
- The next viable intervention must separate:
  - low-lane object/soldier cleanup,
  - W1205 high incoming soldier handling,
  - and route timing before the loop starts.
- Do not promote `w1205-post-retreat-low-lane-recovery` into live `survival-v0`.

## 2026-06-10 - Network training references mapped into training standard

Scope:

- Review external emulator-training and operation-training patterns for ideas useful to the FC/NES companion platform.
- Keep the result in the project standard instead of adding runtime behavior prematurely.

External lessons retained:

- Stable-Retro / Gym Retro style integrations separate memory variables, scenario reward rules, done rules, ROM hashes, and start states.
- Replay or movie files are useful as compact input demonstrations, but they are training sources rather than live controllers.
- DAgger-style dataset aggregation matches the project workflow: run the current strategy, capture failure states, add short correction windows, and validate again.
- Score-only or kill-only rewards can create reward traps and loops, so validation must include progress, survival, terminal conditions, and stuck-loop gates.
- Frame-advance emulator control matches the local browser/jsnes loop: choose input first, then advance one deterministic frame.

Standard changes:

- `docs/STRATEGY_TRAINING_STANDARD.md`
  - added `## 11. External Training Pattern Mapping`;
  - added `## 12. Training Quality Gates`;
  - mapped external patterns to local artifacts such as `GameProfile`, `condition-registry.json`, `TraceEvidence`, TAS side baselines, `ROMProfile`, known failures, candidate fragments, and headless runtime smoke;
  - formalized promotion gates: Schema, ROM, Entry, Sync, Safety, Progress, Strategy, Side, Perturbation, and Regression;
  - made the rule explicit: a candidate is not promotable until all gates pass.
- `tests/strategyTrainingStandardDoc.test.mjs`
  - now verifies the new sections and required phrases.

Verification:

```powershell
node --test tests\strategyTrainingStandardDoc.test.mjs
```

```text
tests 1
pass 1
fail 0
```

```powershell
node --test tests\strategyTrainingStandardDoc.test.mjs tests\strategyPackStandardDoc.test.mjs tests\strategyProtocolCoreDoc.test.mjs tests\standardizedOperationManualDoc.test.mjs
```

```text
tests 9
pass 9
fail 0
```

Decision:

- Do not switch the project to generic neural-network training as the default.
- Continue using strategy-fragment training: source trace -> side-owned baseline -> candidate fragment -> segmented validation -> failure aggregation -> revision or promotion.
- Next implementation work should align the cockpit training UI and strategy-pack validation flow to these gates before promoting new operation strategies.

## 2026-06-10 - ValidationReport now carries training quality gates

Scope:

- Implement the Training Quality Gates from `docs/STRATEGY_TRAINING_STANDARD.md` in the strategy-package validation flow.
- Keep runtime gameplay behavior unchanged; this only changes validation/package evidence.

Code changes:

- `apps/browser-cockpit/src/strategyPackageEvidence.ts`
  - added machine-readable `qualityGates` to `StrategyPackageValidationReport`;
  - added ten gate ids: `schema`, `rom`, `entry`, `sync`, `safety`, `progress`, `strategy`, `side`, `perturbation`, `regression`;
  - `createStrategyPackageValidationReport()` now derives gate status from selected `TraceEvidence` and replay data;
  - `createStrategyPackageEvidenceExport()` now rejects reports with missing quality gates or failed required gates.
- `tests/strategyPackageEvidence.test.mjs`
  - verifies generated reports include all ten gates;
  - verifies old reports without gates are rejected;
  - verifies a failed required gate blocks package saving even when replay fields look otherwise successful.

Verification:

```powershell
node --test tests\strategyPackageEvidence.test.mjs
```

```text
tests 8
pass 8
fail 0
```

```powershell
node --test tests\strategyPackageEvidence.test.mjs tests\humanTrainingWorkflow.test.mjs tests\trainingPanelLayout.test.mjs tests\strategyPackStandard.test.mjs
```

```text
tests 37
pass 37
fail 0
```

```powershell
npm run build
```

```text
tsc -b && vite build
built in 2.18s
```

Decision:

- Strategy package saving is now a stronger evidence gate: a passing-looking replay is insufficient unless the ValidationReport includes explicit quality gates.
- Candidate exports may mark perturbation and regression as `not-applicable`, but any required gate failure blocks saving.
- Next work should surface these gate states in the training/operation UI and then continue the Contra Stage 1 survival strategy loop with the same evidence standard.

## 2026-06-10 - Validation quality gates surfaced in cockpit UI

Scope:

- Surface the machine-readable `ValidationReport.qualityGates` in the Operation Strategy Control panel.
- Keep runtime strategy behavior unchanged.

UI changes:

- `apps/browser-cockpit/src/main.tsx`
  - `OperationStrategyControl` now receives the latest `StrategyPackageValidationReport`;
  - renders a `strategy-validation-gates` panel;
  - shows all ValidationReport quality gates when present;
  - shows a waiting state before validation replay creates a report.
- `apps/browser-cockpit/src/i18n.ts`
  - added Chinese and English labels for quality gates and gate status values.
- `apps/browser-cockpit/src/styles.css`
  - added compact fixed-grid gate cards;
  - green/blue/yellow/red styling maps to passed, not-applicable, missing, and failed states.
- `tests/trainingPanelLayout.test.mjs`
  - verifies the Operation Strategy Control panel receives a ValidationReport and exposes quality-gate test ids.

Verification:

```powershell
node --test tests\trainingPanelLayout.test.mjs
```

```text
tests 21
pass 21
fail 0
```

```powershell
node --test tests\trainingPanelLayout.test.mjs tests\strategyPackageEvidence.test.mjs tests\i18n.test.mjs
```

```text
tests 32
pass 32
fail 0
```

```powershell
npm run build
```

```text
tsc -b && vite build
built in 2.20s
```

```powershell
npm test
```

```text
tests 314
pass 314
fail 0
```

Browser check:

- URL: `http://127.0.0.1:5173/?autoload=1`
- `data-testid="strategy-validation-gates"` exists.
- Before validation replay, the panel shows the waiting state:

```text
验证门禁等待验证回放验证门禁等待验证回放
```

Decision:

- Training evidence is now visible in the cockpit, not just hidden JSON.
- The next useful UI refinement is to show the specific failed gate reason when a ValidationReport exists.
- The next strategy-development step remains Contra Stage 1 `survival-v0` progression, using these gates to prevent false promotion.

## 2026-06-10 - External operation-training research refresh

Scope:

- Re-check public operation-training, emulator-training, imitation-learning, and TAS workflow references.
- Decide what should be borrowed into the FC/NES companion workflow.
- Keep this as a research/log entry only; no runtime behavior change in this step.

Sources checked:

- Gym Retro game integration documentation: https://retro.readthedocs.io/en/latest/integration.html
- Stable-Retro integration and Python API documentation: https://stable-retro.farama.org/integration/ and https://stable-retro.farama.org/python/
- Stable-Retro repository notes: https://github.com/Farama-Foundation/stable-retro
- TASVideos console verification and input editing documentation: https://tasvideos.org/ConsoleVerification/Guide and https://tasvideos.org/InputFileEditing
- FCEUX Lua and TAS Editor documentation: https://fceux.com/web/help/LuaFunctionsList.html and https://fceux.com/web/help/taseditor/LuaAPI.html
- DAgger imitation-learning documentation/paper references: https://imitation.readthedocs.io/en/latest/algorithms/dagger.html and https://www.cs.cmu.edu/~sross1/publications/Ross-AIStats11-NoRegret.pdf
- DQfD paper: https://arxiv.org/abs/1704.03732
- D4RL offline RL dataset paper: https://arxiv.org/abs/2004.07219
- OpenAI Retro Contest notes: https://openai.com/index/retro-contest/

Borrowed engineering patterns:

- Keep game integration artifacts separated:
  - starting state;
  - memory variable map;
  - reward-like scoring;
  - done/failure conditions;
  - ROM hash/profile;
  - replay/movie input source.
- Treat RAM observations as first-class training state. Pixel vision is optional later, not the current efficient path.
- Treat replay/TAS files as compact demonstrations and sync evidence, not live production controllers.
- Preserve movie sync anchors:
  - ROM checksum;
  - emulator/core identity;
  - movie framecount;
  - input row index;
  - entry point and initial state.
- Use DAgger-style correction:
  - do not clone a full run blindly;
  - run the current strategy;
  - collect off-route failure windows;
  - patch short windows;
  - validate before promotion.
- Use D4RL/offline-RL style dataset discipline:
  - every trace should carry observations, actions, rewards/scores, terminal flags, source policy, and quality level;
  - mixed-quality data is allowed, but must be labeled.
- Keep reward design multi-objective:
  - survival;
  - progress;
  - fixed-target clearing;
  - reward pickup;
  - teammate safety;
  - stuck-loop prevention.

Rejected or delayed patterns:

- Do not switch the default project workflow to generic neural-network training now. It is slower than strategy-fragment training for Contra Stage 1.
- Do not use score-only or kill-only reward as a promotion signal. Public references warn that it can create farming loops.
- Do not rely on screen frame number alone for TAS alignment.
- Do not promote a replay, human run, or TAS movie directly into a StrategyFragment.

Impact on our next work:

- The current standard direction is still correct:

```text
source trace -> side-owned baseline -> candidate fragment -> segmented validation -> quality gates -> StrategyPack promotion
```

- The training UI should expose:
  - selected baseline source;
  - training method;
  - trace/evidence status;
  - validation gates;
  - package quality level;
  - strategy result metrics.
- The next implementation step should continue improving the operation-training UI and then resume Contra Stage 1 `survival-v0` segmented validation.

## 2026-06-10 - Validation quality gate reasons surfaced

Scope:

- Show each `ValidationReport.qualityGates[].reason` in the Operation Strategy Control panel.
- Keep strategy runtime behavior unchanged.
- Keep package save gating unchanged.

TDD:

- RED:

```powershell
node --test tests\trainingPanelLayout.test.mjs
```

```text
fail 1
operation strategy control explains validation quality gate reasons
quality gate cards should show the machine-readable validation reason
```

- GREEN:

```powershell
node --test tests\trainingPanelLayout.test.mjs
```

```text
tests 22
pass 22
fail 0
```

Implementation:

- `apps/browser-cockpit/src/main.tsx`
  - gate cards now render `gate.reason`;
  - each reason exposes `data-testid="strategy-validation-gate-${gate.id}-reason"`.
- `apps/browser-cockpit/src/styles.css`
  - added compact two-line reason styling so the panel remains fixed and non-scroll.
- `tests/trainingPanelLayout.test.mjs`
  - added a source-level test requiring visible quality-gate reason rendering.

Verification:

```powershell
node --test tests\trainingPanelLayout.test.mjs tests\strategyPackageEvidence.test.mjs tests\i18n.test.mjs
```

```text
tests 33
pass 33
fail 0
```

```powershell
npm run build
```

```text
tsc -b && vite build
built in 2.31s
```

```powershell
npm test
```

```text
tests 315
pass 315
fail 0
```

Browser check:

- URL: `http://127.0.0.1:5173/?autoload=1`
- `data-testid="strategy-validation-gates"` exists.
- Waiting state is visible before a validation replay creates a report.

Decision:

- Validation gates are now not only pass/fail lights; they also explain why a gate passed, failed, is missing, or is not applicable.
- This supports the objective that every strategy conclusion must be backed by visible TraceEvidence and ValidationReport evidence.
- Next work should either wire an example failed ValidationReport into a replay path for visual inspection or resume Contra Stage 1 `survival-v0` segmented validation.

## 2026-06-10 - W1205 vertical fixed-target station candidate rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` W1205 segmented validation.
- Test a narrow isolated candidate:

```text
w1205-vertical-fixed-station
```

- Keep default live `survival-v0` unchanged unless runtime evidence proves improvement.

Baseline re-check:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan
```

```text
status=stalled-active
reason=progress-stalled
maxProgression=1205
finalProgression=1154
progressStallFrames=994
lostActiveFrame=null
```

Key trace observation:

- Around `frame=6998..7005`, the AI holds `up+right+A+B` while fixed target slot 11 is almost vertical above the player:

```text
W1197..W1205 fixed slot11 hp240 dx15..8 dy-84
```

- At `frame=7006`, close upper soldier pressure switches output to `up+left+A+B`, causing retreat.
- Fixed target HP remains `240`, so the previous right-up fire was not an effective fixed-target damage station.

Candidate hypothesis:

- At W1196-W1212, when the fixed target is almost vertical above the player, hold:

```text
up+B, no left, no right, no A
```

- This was intended to test whether a vertical fire station can damage the fixed target without entering the old retreat loop.

TDD:

- RED:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

```text
fail 1
headless route-plan probe can isolate W1205 vertical fixed-target station
left true !== false
```

- GREEN:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

```text
tests 26
pass 26
fail 0
```

Runtime candidate trial:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-vertical-fixed-station
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=4581
maxProgression=1196
finalProgression=82
progressStallFrames=0
```

Failure evidence:

- Pre-loss frame:

```text
frame=4580
worldX=1196
buttons=up+B
slot15 type1 hp1 dx8 dy-18
slot11 type2 hp240 dx8 dy-84
```

- Loss frame:

```text
frame=4581
p1State=2
deathFlag=1
slot15 type1 hp1 dx6 dy-17
slot11 type2 hp240 dx8 dy-84
```

Decision:

- `w1205-vertical-fixed-station` is rejected.
- Reason: it dies from close upper body contact before fixed target HP changes.
- Default live `survival-v0` remains unchanged.
- Report updated:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\segmentedTrainingSearch.test.mjs
```

```text
tests 30
pass 30
fail 0
```

```powershell
npm run build
```

```text
tsc -b && vite build
built in 2.25s
```

```powershell
npm test
```

```text
tests 317
pass 317
fail 0
```

Next inference:

- W1205 is not solved by:
  - late jump;
  - right-up through;
  - straight right fire;
  - duck-under;
  - post-retreat recovery;
  - vertical fixed-target station.
- The next candidate should treat the upper soldier at `dx~8 dy~-18` as the real blocker before any fixed-target station can run.

## 2026-06-10 - W1205 post-upper recovery candidate rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` W1205 segmented validation.
- Test a second isolated recovery candidate:

```text
w1205-post-upper-recovery
```

- Keep default live `survival-v0` unchanged.

Root-cause refinement:

- Baseline avoids death at W1205 by retreating left, but then loops.
- The previous `w1205-vertical-fixed-station` candidate died because it ignored the upper soldier and stood still.
- A compressed baseline trace showed that after the upper soldier leaves the immediate upper-contact lane, the AI still fails to recover right because low/side body threats keep winning action arbitration.

Candidate hypothesis:

- After the upper-contact threat passes, force:

```text
right+up+B, no A, no down, no left
```

- Expected benefit: recover from W1145-W1168 back toward the fixed target before the long stall begins.

TDD:

- RED was created from a real W7065 baseline frame containing the low/side enemies that caused old left retreat.
- GREEN added `w1205-post-upper-recovery` as an isolated `--candidate-trial` branch only.

Targeted test:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

```text
tests 27
pass 27
fail 0
```

Runtime candidate trial:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-post-upper-recovery
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=2802
maxProgression=1555
finalProgression=1427
progressStallFrames=0
```

Failure-window trace:

```text
frame 2788 W1151 buttons=upleftab  slot15 dx18 dy-10
frame 2789 W1150 buttons=uprightb  slot15 dx18 dy-9
frame 2794 W1151 buttons=uplefta   slot15 dx13 dy-5
frame 2799 W1150 buttons=uprightb  slot15 dx10 dy-1
frame 2801 W1150 buttons=uprightb  slot15 dx8  dy1
frame 2802 W1151 deathFlag=1       slot15 dx6  dy2
```

Decision:

- `w1205-post-upper-recovery` is rejected.
- It is still useful evidence:
  - it breaks the W1205 stall and reaches `maxProgression=1555`;
  - but it dies from same-lane body contact at W1151.
- Do not promote it into live `survival-v0`.
- Report updated:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\segmentedTrainingSearch.test.mjs
```

```text
tests 32
pass 32
fail 0
```

Next inference:

- The promising direction is not "retreat forever" and not "right recovery unconditionally".
- The next candidate should be:

```text
post-upper safe recovery =
  if same-lane body threat is closing: keep survival bailout
  else recover right-up fire toward fixed target
```

Final verification before saving version:

```powershell
npm run build
```

```text
exit 0
vite build completed; chunk-size warning only
```

```powershell
npm test
```

```text
tests 319
pass 319
fail 0
```

## 2026-06-10 - W1205 post-upper safe recovery candidate rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` W1205 automated patch search.
- Add one isolated headless-only candidate:

```text
w1205-post-upper-safe-recovery
```

- Keep default live `survival-v0` unchanged.

Root-cause refinement:

- `w1205-post-upper-recovery` proved that forced right-up fixed-target recovery can break the W1205 loop.
- It also proved that unconditional recovery is unsafe: it died at W1151 from same-lane body contact.
- The next minimal hypothesis was therefore:

```text
if same-lane body threat is still in the contact window:
  keep survival bailout
else:
  recover right+up+B toward the fixed target
```

TDD:

- RED test added `headless route-plan probe can isolate W1205 post-upper safe recovery`.
- The test uses the prior death frame shape:
  - contact case: W1151, enemy `dx=6`, `dy=2` must not force right recovery;
  - recovery case: same station without contact enemy must force `right+up+B`.
- RED failed before implementation because the safe recovery candidate was not active and the recovery case did not set `right=true`.
- GREEN added a candidate-only same-lane body filter and recovery branch.

Targeted test:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

```text
tests 28
pass 28
fail 0
```

Runtime candidate trial:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1205-post-upper-safe-recovery
```

```text
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=7114
maxProgression=1497
finalProgression=1469
progressStallFrames=64
```

Failure-window trace:

```text
frame 7104 W1364 buttons=uprightb
frame 7106 W1366 buttons=upab
frame 7108 W1366 buttons=upleftab
frame 7111 W1363 buttons=upleftab  nearest slot3 dx15 dy-13
frame 7112 W1362 buttons=upleftab  nearest slot3 dx16 dy-10
frame 7113 W1361 buttons=upleftab  nearest slot3 dx17 dy-6
frame 7114 W1360 deathFlag=1       nearest slot3 dx19 dy-2
```

Decision:

- `w1205-post-upper-safe-recovery` is rejected.
- It is useful evidence:
  - it avoids the immediate W1151 death from the previous unsafe recovery;
  - it breaks the W1205 stall;
  - it exposes the next blocker at W1360, a close upper-body contact while fixed targets are still alive.
- Do not promote it into live `survival-v0`.
- Report updated:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\segmentedTrainingSearch.test.mjs
```

```text
tests 34
pass 34
fail 0
```

Next inference:

- W1205 recovery can now reach the next station, but W1360 needs its own local safety rule.
- The next candidate should be a W1360 station-crowd rule, not another W1205 recovery variant:

```text
W1360 upper-body station rule =
  if fixed target is overhead and a dynamic enemy enters dx 0..24, dy -32..0:
    stop pushing left into the body line;
    prefer vertical jump/up-fire or right-under escape depending on fixed-target lane
```

Final verification before saving version:

```powershell
npm run build
```

```text
exit 0
vite build completed; chunk-size warning only
```

```powershell
npm test
```

```text
tests 321
pass 321
fail 0
```

## 2026-06-10 - W1360 right-under station crowd candidate rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` automated patch search after W1205 safe recovery.
- Add one isolated headless-only candidate:

```text
w1360-right-under-station-crowd
```

- Keep default live `survival-v0` unchanged.

Root-cause refinement:

- `w1205-post-upper-safe-recovery` avoids the immediate W1151 death and reaches W1497/W1500 in short runs.
- Its 8000-frame run died at W1360 because existing close-body arbitration changed from `right+up+B` to `left+A+B` while an upper enemy descended into the player.
- Exact W1360 trace:

```text
frame 7104 W1364 buttons=uprightb  slot3 dx7 dy-39
frame 7106 W1366 buttons=upab      slot3 dx3 dy-36
frame 7108 W1366 buttons=upleftab  slot3 dx2 dy-34
frame 7113 W1361 buttons=upleftab  slot3 dx3 dy-26
frame 7114 W1360 deathFlag=1       slot3 dx4 dy-24
```

Candidate hypothesis:

- In the W1356-W1370 station-crowd window, if a fixed target is overhead and a dynamic enemy enters the upper body line, do not left-jump.
- Force:

```text
right+up+B, no A, no down, no left
```

- Also inherit the W1205 safe recovery behavior so the candidate can actually reach W1360 during runtime.

TDD:

- RED test added `headless route-plan probe can isolate W1360 right-under station crowd escape`.
- The first RED verified that old behavior still set `left=true`.
- A second RED verified that a W1360 candidate must inherit the W1205 safe recovery branch; otherwise runtime would only rediscover the earlier W1205 stall.
- GREEN added:
  - `w1360-right-under-station-crowd` candidate flag;
  - W1360 fixed-target + upper-body crowd detector;
  - W1205 safe-recovery inheritance for this candidate only.

Targeted test:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

```text
tests 29
pass 29
fail 0
```

Short runtime trial:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=8000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1360-right-under-station-crowd
```

```text
status=active
lostActiveFrame=null
maxProgression=1500
finalProgression=1471
progressStallFrames=184
```

Extended runtime trial:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1360-right-under-station-crowd
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9079
maxProgression=1758
finalProgression=82
progressStallFrames=0
```

Failure-window trace:

```text
frame 9068 W1737 buttons=downleftb  slot13 dx-1 dy31; slot6 dx4 dy48
frame 9073 W1732 buttons=downleftb  slot13 dx10 dy24; slot6 dx4 dy37
frame 9076 W1729 buttons=downleftb  slot6 dx4 dy29; slot13 dx17 dy18
frame 9078 W1727 buttons=downleftb  slot6 dx4 dy23; slot12 dx32 dy1
frame 9079 W1726 deathFlag=1        slot6 dx4 dy20; slot12 dx32 dy-1
```

Decision:

- `w1360-right-under-station-crowd` is rejected.
- It is important evidence:
  - it combines W1205 safe recovery and W1360 right-under escape successfully enough to reach W1758;
  - it does not clear the later danger-segment crowd;
  - it dies at W1726 from low/side body contact during `down+left+B`.
- Do not promote it into live `survival-v0`.
- Report updated:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\segmentedTrainingSearch.test.mjs
```

```text
tests 36
pass 36
fail 0
```

Next inference:

- The next blocker is no longer W1205 or W1360.
- The next candidate should target W1726 in the `danger-survive` segment:

```text
W1726 danger low-side body rule =
  when airborne/landing and down-left fire places player into low-side contact:
    stop down-left retreat;
    prefer right/down-fire or neutral down-fire until slot6/slot13 clears
```

Final verification before saving version:

```powershell
npm run build
```

```text
exit 0
vite build completed; chunk-size warning only
```

```powershell
npm test
```

```text
tests 323
pass 323
fail 0
```

## 2026-06-10 - W1726 danger low-side body candidate rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` automated patch search after W1360 station-crowd rejection.
- Add one isolated headless-only candidate:

```text
w1726-danger-low-side-body
```

- Keep default live `survival-v0` unchanged.

Root-cause refinement:

- `w1360-right-under-station-crowd` reached W1758 but died at W1726.
- The failure was not a W1205/W1360 issue anymore; it was in `danger-survive`.
- Exact W1726 trace:

```text
frame 9068 W1737 buttons=downleftb  slot13 dx-1 dy31; slot6 dx4 dy48
frame 9073 W1732 buttons=downleftb  slot13 dx10 dy24; slot6 dx4 dy37
frame 9076 W1729 buttons=downleftb  slot6 dx4 dy29; slot13 dx17 dy18
frame 9078 W1727 buttons=downleftb  slot6 dx4 dy23; slot12 dx32 dy1
frame 9079 W1726 deathFlag=1        slot6 dx4 dy20; slot12 dx32 dy-1
```

Candidate hypothesis:

- In W1720-W1740, when a low/side dynamic body threat is under or near the player, stop the `down+left+B` retreat.
- Force:

```text
right+down+B, no A, no up, no left
```

- Also inherit W1205 safe recovery and W1360 right-under station-crowd behavior so the candidate can reach the W1726 window.

TDD:

- RED test added `headless route-plan probe can isolate W1726 danger low-side body escape`.
- The test asserts three required behaviors:
  - inherited W1205 safe recovery;
  - inherited W1360 right-under station-crowd escape;
  - W1726 low-side body threat switches to `right+down+B`.
- RED failed before implementation because the candidate was absent.
- GREEN added:
  - `w1726-danger-low-side-body` candidate flag;
  - W1726 low/side body detector;
  - W1205 and W1360 inheritance for this candidate only.

Targeted test:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

```text
tests 30
pass 30
fail 0
```

Runtime candidate trial:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1726-danger-low-side-body
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=10410
maxProgression=2001
finalProgression=1873
progressStallFrames=0
```

Failure-window trace:

```text
frame 10400 W1670 buttons=upleftab  slot6 dx14 dy-24; slot13 dx-22 dy-25
frame 10404 W1666 buttons=uplefta   slot6 dx16 dy-2;  slot13 dx-18 dy-19
frame 10408 W1662 buttons=upleftab  slot6 dx20 dy-2;  slot13 dx-14 dy-13
frame 10409 W1661 buttons=uplefta   slot6 dx21 dy-2;  slot13 dx-13 dy-12
frame 10410 W1660 deathFlag=1       slot13 dx-12 dy-10; slot6 dx22 dy-2
```

Decision:

- `w1726-danger-low-side-body` is rejected.
- It is strong evidence:
  - it chains through W1205, W1360, and W1726;
  - it improves the best observed max progression from W1758 to W2001;
  - it still dies at W1660 after a retreat/regression state, so it is not promotable.
- Do not promote it into live `survival-v0`.
- Report updated:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs tests\segmentedTrainingSearch.test.mjs
```

```text
tests 38
pass 38
fail 0
```

Next inference:

- The next blocker is W1660 retreat/regression after reaching deeper danger-segment progress.
- The next candidate should not weaken W1726. It should add a recovery guard around W1658-W1672:

```text
W1660 retreat-regression guard =
  if current progression regresses into W1658-W1672 and rear/side enemy is dx -24..0, dy -28..0:
    do not keep up-left retreat;
    prefer right-up or neutral up-fire until rear body clears
```

Final verification before saving version:

```powershell
npm run build
```

```text
exit 0
vite build completed; chunk-size warning only
```

```powershell
npm test
```

```text
tests 325
pass 325
fail 0
```

## 2026-06-10 - Operation-training web research checkpoint

Scope:

- Re-check public operation-training, emulator-training, imitation-learning, and TAS references.
- Decide what can be borrowed into the current FC/NES companion workflow.
- Keep this checkpoint as research guidance only; no gameplay runtime change is made in this step.

Primary references checked:

- Gym Retro integration documentation: starting state, memory variables, reward function, and done condition are separate integration artifacts.
- OpenAI Gym Retro article: movie/replay files store starting state plus button sequence and can be used as compact training data; reward farming can create loops.
- FCEUX FM2 documentation: FM2 contains header plus input log; ROM checksum, GUID, movie length, and per-frame input rows are sync anchors.
- FCEUX TAS Editor operations: TAS input can be recorded, imported, edited, and bookmarked at frame windows.
- TASVideos emulator requirements/features: replay quality depends on movie files, sync-robust savestates, emulator settings, ROM checksum, emulator version, and frame-by-frame input data.
- DAgger documentation: demonstration cloning is not enough; the trained policy must run, expose its own off-route states, then receive expert corrections.
- DQfD paper: small demonstration sets can accelerate learning, but still need online/self-generated data and evaluation.

Borrowed conclusions:

- Keep our current default: strategy-fragment training, not generic neural-network training.
- Use human/TAS/AI runs as baseline sources, not final controllers.
- Preserve sync anchors for every replay-derived asset:
  - ROM checksum;
  - emulator/runtime identity;
  - movie framecount;
  - input row index;
  - entry point;
  - state snapshot or deterministic context.
- Treat failure windows as valuable training data. The next candidate should be generated from the exact failed state, not from a full-stage guess.
- Every TrainingScenario must keep variables, reward-like scoring, terminal conditions, and failure conditions separate.
- Do not approve a strategy by score, kill count, or reward pickup alone; progress, survival, stuck-loop detection, and safety gates must pass.
- Add perturbation checks before any future "verified" label: 1-2 frame offset, small coordinate offset, and alternate enemy-slot state where practical.

Impact on current work:

- The current W1660 blocker should be handled by segmented correction, not by replaying a whole TAS stream.
- TAS data remains a high-value route knowledge source and test fixture.
- The training UI should keep showing:
  - baseline source;
  - training method;
  - trace/evidence status;
  - validation quality gates;
  - strategy result metrics.
- The next engineering step remains the W1660 retreat/regression guard candidate, under `--candidate-trial`, with tests and runtime smoke before any promotion.

## 2026-06-10 - W1660 retreat-regression guard rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` segmented strategy development.
- Implement only an isolated candidate trial.
- Do not change the default/live strategy.

Root-cause evidence from previous rejected candidate:

```text
w1726-danger-low-side-body reached W2001 but died at W1660.
frame 10400 W1670 buttons=upleftab slot6 dx14 dy-24; slot13 dx-22 dy-25
frame 10409 W1661 buttons=uplefta  slot6 dx21 dy-2;  slot13 dx-13 dy-12
frame 10410 W1660 deathFlag=1      slot13 dx-12 dy-10
```

Candidate added:

```text
w1660-retreat-regression-guard
```

Candidate behavior:

- inherits W1205 safe recovery;
- inherits W1360 station-crowd escape;
- inherits W1726 low-side body escape;
- adds W1658-W1672 rear/side retreat-regression guard;
- adds W1638-W1650 left-edge overhead-body guard after trace showed the first runtime failure was earlier than W1660.

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
W1660 candidate initially failed because it did not inherit existing W1205/W1360/W1726 candidate behavior.
After that passed, a second RED was added from runtime trace at W1641.
The W1641 trace showed up-left retreat at the left screen edge with an overhead body threat.
```

GREEN:

```text
tests 31
pass 31
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1660-retreat-regression-guard
```

Result:

```text
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=9867
maxProgression=1820
finalProgression=811
progressStallFrames=1848
```

Failure-window trace:

```text
frame 9848 W1645 X29 Y212 btn=ab       enemy slot6 dx37 dy-2
frame 9850 W1645 X29 Y212 btn=upleftab enemy slot13 dx3 dy-34
frame 9861 W1641 X25 Y212 btn=upleftab enemy slot13 dx7 dy-18
frame 9866 W1645 X29 Y212 btn=downb    enemy slot13 dx3 dy-10
frame 9867 W1644 X28 Y212 deathFlag=1  enemy slot13 dx4 dy-9
```

Decision:

- `w1660-retreat-regression-guard` is rejected.
- It delayed the left-edge death slightly and recovered after loss, but a strategy candidate that dies is not promotable.
- The rejected attempt is archived in:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\segmentedTrainingSearch.test.mjs
```

```text
tests 9
pass 9
fail 0
```

Final verification:

```powershell
npm run build
```

```text
exit 0
vite build completed; existing chunk-size warning only
```

```powershell
npm test
```

```text
tests 327
pass 327
fail 0
```

Next inference:

- The next blocker is no longer the rear/side W1660 window alone.
- The earlier root problem is W1641-W1645 left-edge overhead body compression:

```text
if player is grounded at left screen edge around W1640-W1648
and a body threat descends at dx 3..8, dy -34..-9:
  simple up-left retreat and simple prone fire both fail;
  next candidate should test a stronger escape rule, probably earlier rightward jump/advance or fixed-target pressure reduction before the compression forms.
```

Do not promote this candidate into live `survival-v0`.

## 2026-06-10 - W1726 grounded overhead duck advance rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` candidate search after `w1658-overhead-guard-preclear` still failed around W1726.
- Test whether a grounded W1726 low-lane / overhead body compression can be held with down-right fire instead of falling back to generic up-left jump.
- Keep all behavior isolated behind `--candidate-trial`.

Candidate added:

```text
w1726-grounded-overhead-duck-advance
```

Root cause:

```text
The previous W1726 detector only covered airborne/landing low-side body threats.
The W1658/W1664 combined route reached W1726 grounded at Y212.
Low-lane object residue was ignored, then the overhead close body won generic close-body arbitration and produced up-left jump.
```

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
New W1726 grounded overhead test first failed because the candidate did not exist.
After first implementation, a second RED showed the hold window was too narrow at W1727 when the overhead object shifted to dx -7.
```

GREEN:

```text
tests 40
pass 40
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1726-grounded-overhead-duck-advance
```

Result:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=10744
maxProgression=1784
finalProgression=82
progressStallFrames=0
```

Failure-window evidence:

```text
preLost frame 10743:
  W1684 X66 Y212 buttons=up+left+a+b
  slot5 type5 dx0 dy-26
  slot12 type1 dx-36 dy9
  slot13 type1 dx32 dy-13

lost frame 10744:
  W1683 X65 Y212 deathFlag=1
  slot5 type5 dx1 dy-24
  slot12 type1 dx-35 dy11
  slot13 type1 dx32 dy-12
```

Decision:

- `w1726-grounded-overhead-duck-advance` is rejected.
- It can force the W1726 grounded compression frame into down-right fire, but the combined route regresses into an earlier W1683/W1684 close-body death.
- It is worse than the current useful partial `w1648-left-edge-precompression-advance` and does not solve the stage segment.
- The useful lesson: local W1726 holding is not enough. The next candidate should prevent entering the W1683 low/upper body stack before the fixed-threat platform, not add another single-frame W1726 hold.

Archived:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('json-ok')"
```

```text
headlessRoutePlanProbe: tests 40, pass 40, fail 0
segmentedTrainingSearch: tests 18, pass 18, fail 0
json-ok
```

Next inference:

```text
Stop adding late W1726-only holds.
Target W1683-W1684 route formation:
  prevent up-left jump into the close upper body;
  avoid the low/upper body stack before it reaches direct contact;
  keep the fixed-threat platform route from collapsing back to spawn.
```

Do not promote this candidate into live `survival-v0`.

## 2026-06-10 - W1658 overhead guard preclear rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` candidate search after W1664 same-lane preclear regressed to an earlier W1658/W1659 death.
- Test whether the W1658 overhead-left body can be guarded first, then allow W1664 same-lane preclear.
- Keep all behavior isolated behind `--candidate-trial`.

Candidate added:

```text
w1658-overhead-guard-preclear
```

Hypothesis:

```text
At W1656-W1662, when a left/overhead body is already in contact range,
use down+right+B to avoid the left-up death route.
After that, inherit W1664 same-lane B-pulse preclear.
```

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
New W1658 overhead guard test failed because candidate did not exist and did not hold the expected down-right guard.
```

GREEN:

```text
tests 39
pass 39
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1658-overhead-guard-preclear
```

Result:

```text
status=recovered-after-loss
reason=gameplay-loss-recovered
lostActiveFrame=10193
maxProgression=1825
finalProgression=550
progressStallFrames=1272
```

Failure-window evidence:

```text
preLost frame 10192:
  W1726 X110 Y212 buttons=up+left+a+b
  slot3 type5 dx-12 dy6
  slot12 type1 dx-1 dy-18

lost frame 10193:
  W1726 X110 Y212 deathFlag=1
  slot3 type5 dx-12 dy6
  slot12 type1 dx-2 dy-17
```

Decision:

- `w1658-overhead-guard-preclear` is rejected.
- It prevents the immediate W1658 regression from `w1664-same-lane-preclear-pulse`, but still dies at W1726 and recovers back to the bridge segment.
- It is not better than the current useful partial baseline `w1648-left-edge-precompression-advance`.
- The useful lesson: W1658 guard is a partial component, not a complete route. The later W1726 close-body/right-side route must be handled without reintroducing progress collapse.

Archived:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('json-ok')"
```

```text
headlessRoutePlanProbe: tests 39, pass 39, fail 0
segmentedTrainingSearch: tests 17, pass 17, fail 0
json-ok
```

Next inference:

```text
Best useful partial remains W1648 precompression.
W1658 guard is useful only if paired with a W1726 route that prevents close-body left-up collapse.
Next candidate should target W1726 close-body route after W1658 guard, not promote the combined candidate.
```

Do not promote this candidate into live `survival-v0`.

## 2026-06-10 - W1664 same-lane preclear pulse rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` candidate search after the W1678/W1686 recovery actions failed.
- Move investigation earlier into the W1650-W1680 setup window.
- Keep candidate behavior isolated behind `--candidate-trial`.

Trace sampling:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1648-left-edge-precompression-advance --trace-start=10780 --trace-end=11000
```

Important trace:

```text
W1664-W1673:
  slot6 type5 same-lane body moves from dx18/dy6 to dx9/dy6.
  AI buttons are mostly right+B.
  traceSummary shows no forward player bullets in that window.

W1678-W1686:
  same-lane/upper-body stack is already formed.
  prior jump/stance recovery candidates fail after this point.
```

Inference:

```text
The preclear issue is real: B is held but not producing useful forward bullets.
However, the route also has an earlier overhead-left body threat around W1658/W1659.
```

Candidate added:

```text
w1664-same-lane-preclear-pulse
```

Hypothesis:

```text
At W1662-W1678, when a same-lane body is ahead,
use down+right and pulse B to create a new fire edge before the low contact stack forms.
```

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
New W1664 preclear-pulse test failed because candidate did not exist and the behavior still fell back to left/old route logic.
```

GREEN:

```text
tests 38
pass 38
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1664-same-lane-preclear-pulse
```

Result:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9862
maxProgression=1930
finalProgression=82
progressStallFrames=0
```

Failure-window evidence:

```text
preLost frame 9861:
  W1658 X42 Y212 buttons=up+right+a+b
  slot13 type1 dx-10 dy-18
  slot6 type5 dx24 dy6

lost frame 9862:
  W1659 X43 Y212 deathFlag=1
  slot13 type1 dx-11 dy-16
  slot6 type5 dx23 dy6
```

Decision:

- `w1664-same-lane-preclear-pulse` is rejected.
- It produced player bullets, but it regressed to an earlier W1658/W1659 overhead-left body death.
- It is slightly worse than `w1648-left-edge-precompression-advance` (`maxProgression=1931`, `lostActiveFrame=11000`).
- The useful lesson: same-lane preclear cannot weaken the W1658 overhead-body guard.

Archived:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('json-ok')"
```

```text
headlessRoutePlanProbe: tests 38, pass 38, fail 0
segmentedTrainingSearch: tests 16, pass 16, fail 0
json-ok
```

Next inference:

```text
Next candidate must protect W1658 first.
Then, only after the overhead-left threat is no longer lethal,
revisit W1664 same-lane preclear with B-pulse.
```

Do not promote this candidate into live `survival-v0`.

## 2026-06-10 - W1678 upper-body jump-edge rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` candidate search after `w1648-left-edge-precompression-advance` remained the best partial route.
- Investigate the W1678/W1679 death window from current runtime trace before changing default strategy.
- Keep all behavior isolated behind `--candidate-trial`.

Root-cause evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1648-left-edge-precompression-advance --trace-start=10940 --trace-end=11005
```

Important trace:

```text
preLost frame 10999:
  W1679 X63 Y212 buttons=up+left+a+b
  nearest slot4 type5 dx6 dy-26

lost frame 11000:
  W1678 X62 Y212 deathFlag=1
  nearest slot4 type5 dx6 dy-24
```

Inference:

```text
The W1648 route was not dying to terrain or fixed targets.
It held/returned to left-up fire against an upper-body threat,
and the held A input did not produce a fresh jump edge.
```

Candidate added:

```text
w1678-upper-body-jump-edge
```

Hypothesis:

```text
At W1676-W1686, when grounded and an upper/same-lane body threat closes in,
release A for a jump edge, then continue right+up+A+B instead of left retreat.
```

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
Initial W1678 upper-body test failed because candidate did not exist and kept left=true.
Second W1683 carry-through test failed because the narrow first version fell back to left retreat after one frame.
```

GREEN:

```text
tests 37
pass 37
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1678-upper-body-jump-edge
```

Result:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9264
maxProgression=1812
finalProgression=82
progressStallFrames=0
```

Failure-window evidence:

```text
preLost frame 9263:
  W1686 X70 Y212 buttons=up+left+a+b
  slot12 type1 dx10 dy-1

lost frame 9264:
  W1687 X71 Y212 deathFlag=1
  slot12 type1 dx7 dy0
```

Decision:

- `w1678-upper-body-jump-edge` is rejected.
- The narrow first version briefly raised `maxProgression` to W1942 but died earlier around W1682.
- The extended version regressed to W1812 and still died from same-lane body contact.
- The useful lesson is stronger than the previous late-jump result: W1686 is already too late to recover with input shaping.

Archived:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('json-ok')"
```

```text
headlessRoutePlanProbe: tests 37, pass 37, fail 0
segmentedTrainingSearch: tests 15, pass 15, fail 0
json-ok
```

Next inference:

```text
Stop testing recovery actions at W1686+.
Next candidate must start earlier:
  1. pre-clear slot12/same-lane runner before W1680, or
  2. bias the route before W1670 so the player does not meet slot12 at dx <= 10.
```

Do not promote this candidate into live `survival-v0`.

## 2026-06-10 - W1678 low-stack jump-clear rejected

Scope:

- Continue the Contra US Stage 1 `survival-v0` segment-search loop.
- Test whether a route-level jump clear can escape the W1685-W1700 low-stack contact after the W1678 stance candidates failed.
- Keep the candidate isolated behind `--candidate-trial`.
- Do not change the default/live strategy.

Candidate added:

```text
w1678-low-stack-jump-clear
```

Hypothesis:

```text
Instead of crouching or level-carrying through W1685-W1693,
jump clear the low-stack contact with right+up+A+B.
```

Candidate behavior:

- inherits W1205 safe recovery;
- inherits W1360 station-crowd escape;
- inherits W1726 low-side body escape;
- inherits W1660 rear/side retreat guard;
- inherits W1641/W1648 precompression escape work;
- changes the W1680-W1700 grounded low-stack contact response to right+up+jump+fire.

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
New candidate initially failed because it did not exist and the low-stack window still allowed left/retreat behavior.
```

GREEN:

```text
tests 36
pass 36
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1678-low-stack-jump-clear
```

Result:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9254
maxProgression=1812
finalProgression=82
progressStallFrames=0
```

Failure-window evidence:

```text
frame 9253 W1700 X84 Y212 btn=uprightab nearest threats:
  slot12 type1 dx9 dy-8
  slot3 type5 dx14 dy6
  slot13 type1 dx9 dy21

frame 9254 W1701 X85 Y212 deathFlag=1 nearest threats:
  slot12 dx6 dy-8
  slot3 dx13 dy6
  slot13 dx8 dy21
```

Decision:

- `w1678-low-stack-jump-clear` is rejected.
- It regresses versus `w1648-left-edge-precompression-advance` (`lostActiveFrame=11000`, `maxProgression=1931`).
- The useful lesson is timing: jumping after the W1692 stack forms is too late.
- Keep W1648 precompression as a useful sub-fragment, but the next route work must start before W1685-W1693.

Archived:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
node -e "JSON.parse(require('fs').readFileSync('data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json','utf8')); console.log('json-ok')"
```

```text
headlessRoutePlanProbe: tests 36, pass 36, fail 0
segmentedTrainingSearch: tests 14, pass 14, fail 0
json-ok
```

Next inference:

```text
Do not test more late stance toggles inside W1685-W1700.
Next useful hypothesis:
  pre-clear the same-lane runner before W1685, or
  alter the approach route so the W1692 low-stack never forms around the player.
```

Do not promote this candidate into live `survival-v0`.

Final verification:

```powershell
npm run build
```

```text
exit 0
vite build completed; existing chunk-size warning only
```

```powershell
npm test
```

```text
tests 329
pass 329
fail 0
```

## 2026-06-10 - Operation training research notes

Scope:

- Review public references for operation training, TAS movie usage, imitation learning, and retro-game RL integration.
- Extract only items that can improve the FC AI Companion training workflow.

Useful references:

- Gym Retro / Stable-Retro game integration:
  - use per-game memory variable manifests, reward definitions, done conditions, ROM hashes, and savestate starts;
  - this maps directly to our `GameProfile`, `ROMProfile`, `ConditionRegistry`, `RewardDefinition`, `TerminalCondition`, and training window model.
- FCEUX / TASVideos movie formats:
  - TAS movie files are input logs, not videos;
  - exact ROM checksum, emulator/version, movie length, and frame input rows matter for sync;
  - this supports our rule that TAS is a training baseline/evidence source, not the live controller.
- Imitation learning / DAgger:
  - pure behavior cloning is useful for starting from demonstrations but fails when the bot drifts into states not present in the original demonstration;
  - DAgger-style loops run the current policy, collect the states where it fails, ask for expert correction, and add those corrections to the dataset.

Decision for this project:

- Do not switch the current Contra strategy work to full neural-network training.
- Keep the current engineering path:
  - TAS / human / AI run = baseline source;
  - TraceEvidence = what actually happened;
  - segmented window = where the strategy failed;
  - candidate fragment = proposed correction;
  - validation replay + perturbation checks = promotion gate.
- Add a future standard update for:
  - per-game reward/done definitions;
  - behavior primitive names;
  - DAgger-style failure correction workflow;
  - perturbation validation around the corrected window;
  - strategy package provenance and rollback metadata.

Immediate training implication:

```text
For Contra Stage 1, keep training in short windows.
Do not run full-stage guessing loops as the primary method.
For the current W1641 blocker, collect a pre-compression window before the death,
then add a candidate that acts before the direct collision window.
```

## 2026-06-10 - W1648 precompression candidate and W1678 follow-ups rejected

Scope:

- Continue Contra US Stage 1 `survival-v0` segmented training from the W1641/W1648 left-edge body-compression blocker.
- Keep all changes isolated behind `--candidate-trial`.
- Do not promote anything into live `survival-v0`.

Root-cause trace:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1641-left-edge-right-jump --trace-start=9800 --trace-end=9863
```

Key window:

```text
9823-9834: W1650 X34, buttons downleft..., AI is pinned at the left edge.
9841: W1648 X32, slot13 appears above at dx0 dy-48.
9844-9861: right-jump starts only after the overhead body is already in collision range.
9862: death at W1648/X32, slot13 dx0 dy-16.
```

Conclusion:

- The W1641 direct collision response is too late.
- The actionable window is the earlier W1648-W1650 precompression state, before slot13 reaches the player body.

Candidate 1:

```text
w1648-left-edge-precompression-advance
```

Behavior:

- inherits prior W1205/W1360/W1726/W1660/W1641 candidate chain;
- detects the W1650 left-edge fixed-pin + low-body/pre-overhead compression;
- forces `right+up+A+B` before the direct body-overlap frame.

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1648-left-edge-precompression-advance
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=11000
maxProgression=1931
finalProgression=1845
progressStallFrames=0
```

Decision:

- Rejected because it still dies.
- Useful learning: it fixes the immediate W1648 compression class and moves the blocker later to W1678/W1679.

Candidate 2:

```text
w1678-forward-body-duck-carry
```

Behavior:

- inherits `w1648-left-edge-precompression-advance`;
- tries to resolve the W1678 forward/body contact with `right+down+B`.

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1678-forward-body-duck-carry
```

```text
status=stalled-active
reason=progress-stalled
lostActiveFrame=null
maxProgression=1744
finalProgression=1692
progressStallFrames=2959
```

Decision:

- Rejected as a stuck-loop.
- Important negative constraint: `down+right` is not a valid advance action in this water/low-lane context. It avoids death but pins movement.

Candidate 3:

```text
w1678-forward-body-level-carry
```

Behavior:

- inherits `w1648-left-edge-precompression-advance`;
- replaces W1678 crouch carry with level fire advance.

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1678-forward-body-level-carry
```

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9260
maxProgression=1812
finalProgression=82
progressStallFrames=0
```

Decision:

- Rejected because it regresses to an earlier same-lane contact death around W1692/W1693.
- This confirms that the W1678 window needs a different route-level solution, not a simple stance swap.

Archived evidence:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Tests added:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
node --test tests\segmentedTrainingSearch.test.mjs
```

```text
route-plan probe: tests 35, pass 35, fail 0
segmented report: tests 13, pass 13, fail 0
```

Next inference:

```text
Keep W1648 precompression as a useful sub-fragment, but do not promote it alone.
Next W1678 work should not test more stance toggles.
Instead, collect or derive a route-level correction:
  either avoid entering W1685-W1693 low-lane body stack,
  or clear the same-lane runner before it reaches dx <= 16.
```

## 2026-06-10 - W1641 left-edge right-jump rejected

Scope:

- Continue the Contra US Stage 1 `survival-v0` segment-search loop.
- Test the next isolated hypothesis for the W1641-W1645 left-edge compression blocker.
- Do not change the default/live strategy.

Prior blocker:

```text
W1641-W1645 left-edge overhead body compression:
  up-left retreat fails;
  prone/down fire delays death but still fails;
  the next candidate should test earlier rightward jump/advance.
```

Candidate added:

```text
w1641-left-edge-right-jump
```

Candidate behavior:

- inherits W1205 safe recovery;
- inherits W1360 station-crowd escape;
- inherits W1726 low-side body escape;
- inherits W1660 rear/side retreat guard;
- changes the W1641-W1650 left-edge overhead-body response to right+jump+up-fire.

TDD evidence:

```powershell
node --test tests\headlessRoutePlanProbe.test.mjs
```

RED:

```text
New candidate initially failed because it did not exist and could not inherit the prior candidate chain.
```

GREEN:

```text
tests 32
pass 32
fail 0
```

Runtime evidence:

```powershell
node scripts\headless-runtime-smoke.mjs --frames=12000 --strategy=survival-v0 --probe=route-plan --candidate-trial=w1641-left-edge-right-jump
```

Result:

```text
status=lost-active
reason=gameplay-lost
lostActiveFrame=9862
maxProgression=1930
finalProgression=82
progressStallFrames=0
```

Failure-window evidence:

```text
frame 9861 W1649 X33 Y212 btn=uprightab enemy slot13 dx-1 dy-18
frame 9862 W1648 X32 Y212 deathFlag=1 enemy slot13 dx0 dy-16
```

Decision:

- `w1641-left-edge-right-jump` is rejected.
- It improves over `w1660-retreat-regression-guard` in max progression, but still dies at the same compression class.
- The key lesson is timing: the right-jump starts too late when triggered by the W1641-W1650 body-overlap window.
- The rejected attempt is archived in:

```text
data/training/contra/runtime_runs/contra-us-good/segment-search-reports/contra-us-stage1-w1205-survival-baseline.json
```

Verification:

```powershell
node --test tests\segmentedTrainingSearch.test.mjs
```

```text
tests 10
pass 10
fail 0
```

Next inference:

```text
W1641 pre-compression escape =
  if player approaches W1632-W1640 at low lane / left edge risk
  and slot13 overhead body is forming above or fixed target keeps the route pinned:
    trigger right-jump before body dx reaches 0..8;
    do not wait for the direct overhead collision window.
```

Do not promote this candidate into live `survival-v0`.
