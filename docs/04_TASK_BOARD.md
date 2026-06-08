# 任务板

## 当前

- 验收物理化浏览器驾驶舱 V0 外壳。
- 验收左右 1P / 2P 实体手柄舱。
- 验收中间电视与电视下方三按钮主机布局。
- 验收 RAM Reader V0、WorldX 推导和入局后战绩统计。
- 验收 1P / 2P 名称随人类、AI、混合模式自动变化。
- 验收 AI 操作层 V0：自动入局、向右推进、射击、基础跳跃。
- 验收 2P 门禁：未检测到双人模式时，2P AI 不写入手柄、不累计战绩。
- 验收 autorun 不干扰主机暂停 / 继续。
- 验收中等宽度下仍保持 1P / 电视 / 2P 三栏物理布局。
- 将不可靠 killCount 文案降级为“疑似击破”。
- 数据流增加运行状态，暂停时统计显示“暂停中”。
- 2P 面板接入死亡事件统计；双人局中显示队伍级“疑似击破”推导值。
- 接入 Score & Destruction Tracker V0：真实分数、四格战果、武器获得、行为数据分行显示。
- 接入陪玩策略 V0：快速推进、清敌优先、奖励优先、护卫队友。
- 接入第一关 Route Script V0：独立策略 JSON、运行时加载、按 WorldX 段落执行、Boss 停位射击。
- 接入 1P AI 双人菜单辅助：当 1P 处于 AI / 混合且 2P 请求 AI / 混合时，由 1P 按真实菜单逻辑选择双人局。
- 接入策略设计窗口 V0：编辑第一关 Route Script JSON，保存为浏览器本地个人策略，并可设为 1P / 2P 当前策略。
- 接入全面数据显化 V0：运行、路线、1P、2P、战斗、累计、敌人槽、子弹槽和人类轨迹记录/导出。
- 接入玩家卡片双开关控制：头像卡通战士，右侧人类 / AI 双开关表达人类、AI、混合三种模式。
- 接入策略按钮组：去掉 AI 策略下拉和重复模式信息，玩家常用区只保留正式策略按钮。
- 新增稳健生存策略，并设为 1P / 2P 默认 AI 策略；AI 未启用时不显示策略选中态。
- 建立 ROM 版本矩阵：外部资料、TAS、RAM map、Route Script 和语料资料必须绑定 ROM 版本。
- 建立 FC 通用平台 Game Profile 架构：魂斗罗作为第一个 Game Profile，不作为平台边界。
- 建立首批 Game Profile 路线图：先魂斗罗系列，再赤色要塞，首批八强覆盖不同 FC 游戏能力。
- 发布 FC 游戏 AI 操作策略标准手册 1.0.0：`docs/16_OPERATION_STRATEGY_STANDARD.md` 是标准手册总入口，已包含策略分类、形成过程、输入资料、输出文件、Runtime 调用、语义化意图融合、输入采样延迟、RNG 影响范围、安全守则、验收等级、数据可信度和统一开发流程；通用核心协议以 `docs/STRATEGY_PROTOCOL_CORE.md` 为准；Contra US 专用落地经验进入 `references/contra-us/IMPLEMENTATION_GUIDE.md`；当前 Contra US 第一关 StrategyPack 示例进入 `references/contra-us/strategy-db/contra-us-stage1-strategy-pack-example.md`。

## 下一步

- 按操作策略标准拆解 `2026-06-06T23-55-55-772Z-human-run-analysis.md`，把人工正例和反例写入 Contra US 第一关策略片段库。
- 按 `docs/STRATEGY_PROTOCOL_CORE.md` 把 Contra US 示例 StrategyPack 拆成实际 JSON 文件：`manifest.json`、`game-profile.json`、`rom-profile.json`、`condition-registry.json`、`entity-taxonomy.json`、`action-map.json`、`strategy-types.json`、`stage-plan.json`、`fragments.json`。
- 为 StrategyPack 建立 `schemas/` 文件清单，并先实现 `manifest.schema.json`、`rom-profile.schema.json`、`condition-registry.schema.json`、`entity-taxonomy.schema.json`、`action-map.schema.json`、`fragments.schema.json` 和 `runtime-api.schema.json`。
- 在策略加载器里增加 ROM 兼容等级和错误码：`exact-match`、`compatible-tested`、`reference-only`、`blocked`。
- 本地 ROM 端点增加 MD5 / SHA1 / SHA256 三种哈希输出。
- 浏览器驾驶舱显示 ROM Profile 支持状态：已支持 / 实验 / 仅参考 / 未支持。
- Route Script 增加 `gameId` 和 `romProfileId` 或兼容组字段。
- 将当前 `public/strategies/contra` 逐步迁移到 `public/game-profiles/contra`。
- 建立外部资料登记表：来源 URL、资料类型、目标 ROM、适配等级、验证状态。
- 按 `docs/11_GAME_PROFILE_ROADMAP.md` 执行首批八强路线，不在魂斗罗主 profile 稳定前深度接入第二游戏。
- 验收双手柄输入不破坏 V0.1.0 的 1P 输入。
- 验收主机三按钮：更换卡带 / 暂停继续 / Reset。
- 验证 RAM state schema 在真实 ROM 运行中的稳定性。
- 验证 WorldX 推导与 Stage 1 路线地标是否匹配。
- 补 2P 坐标、生命、武器、跳跃等 RAM map。
- 验证双人模式 RAM 字段 `0x0022` 在真实双人局中的稳定性。
- 验证 `p2State / p2DeathFlag` 死亡事件统计在真实双人局中的稳定性。
- 验证 killCount 推导过滤条件。
- 验证 Score & Destruction Tracker V0 的战果分类：普通敌兵 / 炮台火力 / 飞行物 / Boss部件。
- 验证 `0x0588 + slot` Enemy Score Collision 与分数上涨事件的对应关系。
- 验证玩家子弹 owner 字段对 1P / 2P 实际发弹归属的稳定性。
- 验证武器获得统计：M / S / F / L / R / B。
- 验证陪玩策略 V0 在真实双人局中的输入稳定性。
- 验证护卫队友策略在 2P 坐标接入前的边界是否符合玩家直觉。
- 验证第一关 Route Script V0 的三类通关：单 AI、人类 + AI、双 AI。
- 标定第一关 WorldX 路线段、Boss 停位点和危险跳跃点。
- 将 Contra US 第一关 Boss 墙从局部阈值补丁升级为阶段控制器：进入站位、清贴身兵、固定目标输出、脱身重进、击破确认。
- 基于人类实战轨迹，把个人策略窗口升级为“观察 -> 生成候选策略 -> 保存”。
- 用人类模式打一局并导出轨迹 JSON，标定第一关关键跳跃、停位、开火和死亡点。
- 基于 RAM Reader V0 实现 Danger Detector V0。
- 设计并实现 V0 战术调试驾驶舱面板。
- 实现 Danger Detector V0。
- 验证并迭代 Route Script V0。
- 实现 Action Lock V0。
- 实现 FSM V0。

## 后续

- 陪玩文字事件流。
- 性格与协同系统。
- TTS。
- 训练管线。
- 强化学习实验。

## 禁止 / 延后

- 复杂语音系统。
- 直播功能。
- 高级 UI 动画。
- 强化学习优先。
- 计算机视觉主路线。
- 截图 / OCR 驱动 Bot 逻辑。
- LLM 控制快脑。
## 2026-06-07 StrategyPack 1.0 Migration

Current:
- Contra Stage 1 has a Protocol 1.0 source pack under `strategy-packs/contra/`.
- Browser runtime route files under `apps/browser-cockpit/public/strategies/contra/stage1/` are generated compatibility outputs.
- `npm run sync:strategies` exports the current standard pack to the browser runtime route format.
- `tests/strategyPackStandard.test.mjs` protects the required 1.0 directory structure and generated runtime metadata.

Next:
- Future Contra tactical fixes must edit `strategy-packs/contra/` first.
- After each tactical change, run `npm run sync:strategies`, then `npm test`, then the relevant browser/ROM runtime test.
- Do not mark `single-ai`, `human-ai`, or `dual-ai` validated until real trace evidence is recorded.

## 2026-06-07 Strategy Standard 2.0 Reference

Current:
- Added `docs/17_STRATEGY_STANDARD_V2_REFERENCE.md` as the holding document for Strategy Standard 2.0 candidate ideas.
- The first candidate topic is strategy artifact productization and dual-mode optimization:
  - Offline/Base Mode: local trace analysis and deterministic patch suggestions without external API dependency.
  - Online/Expert Mode: optional AI-assisted analysis over play traces, known failures, and candidate fragments.
  - Optimization levels: Level 0 Manual, Level 1 Automated, Level 2 Augmented.

Rule:
- Do not modify the published 1.0 standard from this candidate note alone.
- Promote this into 2.0 only after schema design, sample pack migration, and real validation evidence.

## 2026-06-07 Training Cockpit V0

Current:
- Replaced each controller bay's per-side data stream surface with a side-owned training panel.
- 1P and 2P now show their own baseline strategy, training source, capture status, candidate fragment count, failure summary, and archive target.
- Added the global training console to the bottom of the host console, not between the TV and host.
- Global training console owns shared trace capture controls and shows Offline/Base Mode, optimization level, sample count, validation summary, botrun status, and strategy-pack evidence target.

Rule:
- Per-side panels describe ownership and side-specific training state.
- Global training remains system-level evidence control and does not directly mark any strategy as validated.
- Training V0 is Offline/Base Mode only; Online/Expert Mode remains a future Strategy Standard 2.0 candidate.

## 2026-06-07 Contra Japan TAS Matching

Current:
- Added local ROM library copy: `D:\Ai-Play\ROM\contra-j\Contra (J).nes`.
- Added `contra-j-good` as a Contra ROMProfile for Japanese Contra research.
- Added TAS registry matching by ROMProfile, full MD5, headerless MD5 and SHA1.
- Browser cockpit should show matched TAS status after selecting or loading the Japanese ROM.

Rule:
- ROM files remain outside the strategy pack and repository.
- TAS data is a training baseline and route knowledge source, not a live controller.
- Current Stage 1 strategy remains validated only for `contra-us-good` until `contra-j-good` gets separate trace validation.

## 2026-06-07 Contra US Survival Priority

Current evidence:
- `survival-v0` still fails Stage 1 at the Boss wall on real botrun.
- Local Boss wall anti-loop fixes are implemented and covered by tests:
  - low-lane bailout
  - airborne low-lane bailout
  - upper-lane swarm bailout
  - overextended fixed-station retreat
  - Action Lock bailout override
- `npm run check` passes with 83 tests and a production build.

Active priority:
- Stop same-point Boss wall threshold patching.
- Implement pre-entry fixed-target suppression before `WorldX 3200`.
- Add fixed-target HP delta monitoring for turret/core damage validation.
- Re-evaluate whether Spread or another weapon reward is mandatory for the stable survival route.

Validation rule:
- Do not advance to AI+AI dual mode or all-stage claims until single-AI Stage 1 has a real `bossDefeated` or stage-clear trace.

## 2026-06-07 Contra US Boss Wall Stop Rule

Current evidence:
- Additional real botruns still die in the Boss wall entry class:
  - `20260607-core-forecast-focused`: death at frame `5649`, `WorldX 3196`, `x124/y162`, input `left+B`.
  - `20260607-falling-convergence-focused`: death at frame `5649`, `WorldX 3196`, `x124/y162`, input `left+B`.
  - `20260607-hp-gate-focused`: death at frame `5700`, `WorldX 3208`, `x136/y196`, input `up+B`.
  - `20260607-lowlane-retreat-gate`: death at frame `5653`, `WorldX 3198`, `x126/y171`, input `left+B`.
- In all runs, Boss wall fixed targets remain full HP or effectively undamaged.
- `node --test tests/contraBossWall.test.mjs` currently passes `56/56`, so unit coverage exists for the local micro rules, but real clearance is still blocked.

Stop rule:
- Do not add more same-area Boss wall micro-threshold patches.
- The next implementation must be a route/phase controller with fixed-target HP-delta verification.

Next required task:
- Implement `survival-v0` Boss wall phase controller:
  - pre-entry station
  - fixed-target damage loop
  - HP-delta check
  - bounded reposition
  - entry only after fixed-target HP drops or barrier state changes
- Re-evaluate mandatory weapon route for survival mode before claiming Stage 1 single-AI progress.

## 2026-06-07 Contra US Boss Wall Phase Controller Status

Current:
- Boss wall phase controller exists and is wired into `survival-v0`.
- Focused tests pass:
  - `node --test tests/contraBossWallPhase.test.mjs`: `7/7`.
  - `node --test tests/contraBossWall.test.mjs`: `56/56`.
- Real botruns after the phase controller still fail Stage 1:
  - `20260607-phase-controller-focused`: death at `WorldX 3159`, input `down+right+B`, fixed HP full.
  - `20260607-phase-safety-focused`: death at `WorldX 3198`, input `left+B`, fixed HP full.
  - `20260607-phase-containment-focused`: death at `WorldX 3153`, input `B`, fixed HP full, low-lane body contact.

Active stop rule:
- Do not continue same Boss wall local input threshold patching.
- Do not run repeated botruns at the same Boss wall failure class without a new route-level hypothesis.

Next:
- Add runtime phase telemetry: phase, fixed HP total, no-damage frames, safety override reason, containment clamp reason.
- Move Boss wall handling into an upper-lane pre-entry station plan before `WorldX 3150-3200` failure states.
- Gate deeper Boss wall entry on fixed-target HP delta.
- Re-evaluate whether `survival-v0` must route to a better weapon before the Boss wall.

## 2026-06-07 Contra US Boss Wall Telemetry And Recovery

Current:
- Boss wall phase telemetry is now available in runtime debug and death trace samples.
- Phase recovery now stops indefinite left retreat once the AI is left of the station.
- Real botrun `20260607-boss-recovery-check` changed the failure class:
  - Previous failure: low-lane death at `WorldX 3153`, fixed HP `72`.
  - Current failure: upper-lane recovery death at `WorldX 3172`, fixed HP `70`.
- This proves two things:
  - Fixed-target HP damage is now happening.
  - Station recovery still enters a crowded infantry lane unsafely.

Next:
- Implement Boss wall `station-crowd-gate`.
- Add close dynamic threat telemetry to Boss wall phase reports.
- Before station entry, clear or wait out nearby infantry instead of using raw `A+B` recovery.
- Do not tune the `WorldX 3172` death frame directly.

## 2026-06-07 Contra US Boss Wall Station Crowd Gate Status

Current:
- Station crowd telemetry and gate behavior are implemented.
- Gate output now bypasses generic Action Lock and runs before Boss wall micro overrides.
- Contact jump is covered for narrow overhead/body pressure.
- Focused verification:
  - `node --test tests/contraBossWallPhase.test.mjs`: `14/14`.
  - `node --test tests/contraBossWall.test.mjs`: `56/56`.
  - `npm run build --workspace @fc-ai/browser-cockpit`: passed.

Real botrun evidence:
- `20260607-station-crowd-gate-check`: death at `WorldX 3176`; gate active but Action Lock still produced `up+right+B`.
- `20260607-crowd-gate-bypass-lock-check`: Action Lock fixed, but raw micro still produced `up+right+B`.
- `20260607-phase-gate-before-micro-check`: phase gate owns control; death moved to `WorldX 3183`, input `B`, fixed HP `72`.
- `20260607-crowd-contact-jump-check`: contact jump triggered, but death remains `WorldX 3183`, fixed HP `72`.

Active stop rule:
- Do not add more local Boss wall contact or aim thresholds for `WorldX 3176-3183`.
- Do not rerun repeated botruns at this same station unless the route-level station hypothesis changes.

Next:
- Redesign the Boss wall station as a route-level fixed-target damage station.
- Require fixed-target HP delta before allowing station entry/deeper commitment.
- Decide whether `survival-v0` must route through Spread or another weapon before Boss wall.

## 2026-06-07 Contra US Default-Weapon Boss Wall Branch Stop

Current:
- Boss wall phase controller now pulses B for default weapon fire.
- Station crowd gate includes the `playerX=112` station boundary.
- Close lower station-crowd threats trigger down-fire.
- Focused verification:
  - `node --test tests/contraBossWallPhase.test.mjs`: `18/18`.
  - `node --test tests/contraBossWall.test.mjs`: `56/56`.
  - `npm run build --workspace @fc-ai/browser-cockpit`: passed.

Real botrun evidence:
- `20260607-boss-phase-pulse-fire-check`: fixed HP dropped to `69`, proving pulse fire works, but death remained at Boss wall.
- `20260607-boss-phase-downfire-check`: death at `WorldX 3183`, fixed HP `71`.
- `20260607-boss-station-boundary-gate-check`: boundary gate active, death at `WorldX 3184`, fixed HP `71`.

Active stop rule:
- Stop further default-weapon Boss wall station threshold work.
- Do not add more local contact/aim/boundary patches for `WorldX 3159-3184`.

Next:
- Make weapon acquisition a `survival-v0` route requirement before Boss wall.
- Rework the Stage 1 route so the AI reaches Boss wall with Spread or another validated stronger weapon.
- Keep Boss-wall pulse fire and HP telemetry for the later weapon-equipped run.

## 2026-06-07 TAS Replay Window And Commentary Candidate

Current decision:
- The next TAS window should serve two goals:
  - player viewing: let users watch interesting TAS runs for games they care about.
  - AI strategy support: convert TAS timing, route and action windows into strategy baseline evidence.
- Add an AI commentary layer for TAS viewing, but keep it separate from fast-brain controller logic.

Required first version:
- TAS list by matched ROMProfile.
- TAS Chinese/English metadata: filename, title, author, category, ROM checksum and short Chinese summary.
- Strategy baseline recommendation for each TAS:
  - survival
  - speedrun
  - combat
  - loot
  - guard
  - special/reference-only
- Replay controls:
  - play
  - pause
  - restart
  - step frame
  - speed
  - key event jump points
- Commentary modes:
  - expert viewing
  - teaching
  - companion/emotional
  - strategy analysis
  - casual entertainment

Rules:
- TAS replay and commentary are product/experience features, not AI fast-brain control.
- AI-generated commentary must be grounded in TAS metadata, input logs, RAM traces, WorldX windows or verified strategy fragments.
- Commentary must not claim unverified clear ability.
- Commentary output may propose candidate StrategyFragments, but cannot mark them as validated without real ROM trace evidence.

## 2026-06-07 Contra US Mandatory Weapon Route Status

Current:
- Mandatory weapon gate is implemented for Stage 1 `survival-v0`.
- Runtime route now includes `weapon-gate-survive` before Boss approach.
- Focused and full verification passed:
  - `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
  - `npm test`: `115/115`.
  - `npm run build`: passed.

Real botrun evidence:
- `20260607-mandatory-spread-gate-check`: reached Boss approach with non-default weapon `4`, then died at `WorldX 2809`.
- `20260607-boss-approach-close-body-check`: previous `WorldX 2809` close-body death moved to `WorldX 2839`.
- `20260607-boss-platform-jump-check`: early platform-jump patch did not move the failure; still death at `WorldX 2839`, `x128/y234`.

Active stop rule:
- Do not keep widening the `WorldX 2798-2828` jump window.
- Do not repeat botruns at the same `WorldX 2839` fall unless the route-level pre-Boss platform rhythm has changed.

Next:
- Rebuild the pre-Boss platform rhythm before `WorldX 2788`.
- Treat `WorldX 2788-2839` as a route-state transition with stable ground/jump ownership.
- Keep mandatory weapon acquisition as the current survival route direction.

## 2026-06-07 Contra US Pre-Boss High-Platform Branch Stop

Current:
- High-platform edge jump and high-air carry patches are implemented and tested.
- Verification:
  - `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
  - `npm test`: `117/117`.
  - `npm run build`: passed.

Real botrun evidence:
- `20260607-boss-high-edge-jump-check`: death moved to `WorldX 2854/y236`; the high jump changed the arc but did not land safely.
- `20260607-boss-high-air-carry-check`: right carry stayed active, but death remained `WorldX 2854/y236`.

Active stop rule:
- Stop high-platform local tuning around `WorldX 2776-2864`.
- Do not add more jump-window, right-carry, or aim-threshold patches for the same high arc.
- Do not rerun this same failure class unless the route class changes.

Next:
- Replace this branch with a different route class for Boss approach.
- Candidate route classes: lower/mid-platform capture route, or recorded human route fragment converted into a standard state-action patch.
- Preserve mandatory weapon gate and Boss-wall fixed HP telemetry.

## 2026-06-07 Strategy Learning Pipeline Switch

Current:
- Strategy learning method changed from repeated coordinate patching to trace evidence plus fragment extraction.
- Added pure trace-evidence module and tests.
- Current `WorldX 2854/y236` high-platform failure is now stored as machine-readable evidence:
  - `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-boss-high-air-carry-failure.json`
- Strategy-pack standard test now validates trace-evidence files.

Verification:
- `node --test tests/strategyTraceEvidence.test.mjs`: `2/2`.
- `node --test tests/strategyPackStandard.test.mjs`: `5/5`.

Active stop rule:
- Do not continue the `high-platform-jump-carry` branch.
- Do not run another botrun at `WorldX 2854/y236` unless the runtime route class has changed.

Next:
- Build the Stage 1 pre-Boss `mid/low-platform-capture` route class from evidence.
- Then run exactly one real botrun for that new route class.

## 2026-06-07 Contra US Mid-Platform Capture Branch Stop

Current:
- `stage-one-boss-approach-mid-platform-capture` was implemented and tested as a distinct route class.
- Real botrun `20260607-mid-platform-capture-check` still died.
- Death moved to `WorldX 2836/y236`, proving the branch changes the route but does not solve safe capture.
- Evidence stored:
  - `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-mid-platform-capture-failure.json`

Verification:
- `node --test tests/contraStage1RewardTactics.test.mjs`: passed.
- `npm test`: `122/122`.
- `npm run build`: passed.

Active stop rule:
- Do not keep tuning left/right correction in the `WorldX 2835-2854` fall.
- Do not rerun this route class unless the source becomes a human frame trace or a lower-route state fragment.

Next:
- Add a short-segment trace recording workflow for `WorldX 2600-2960`.
- Ask the owner to demonstrate only that segment once the recorder is ready.

## 2026-06-07 Contra US Lower-Platform Edge Trigger Branch Stop

Current:
- The lower-platform A-edge experiment was implemented and tested.
- Real botrun `lower-platform-edge-trigger-1780817803410` still died at `WorldX 2839/y234`.
- Evidence stored:
  - `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-lower-platform-edge-trigger-failure.json`

Stop rule:
- Do not keep tuning the `WorldX 2814-2828` lower-platform A-edge window.
- Do not rerun the same pre-Boss platform route unless the source changes to a frame-level human trace, a different route class, or a verified spawn/table-derived segment.

Next:
- Collect/export a full frame trace for the owner's `WorldX 2600-2960` demonstration.
- Use that trace to generate a state-action Strategy Fragment instead of another local coordinate patch.

## 2026-06-08 Side Training TraceEvidence Archive Bridge

Current:
- Side-owned training archival now produces standard `fc-ai-strategy-trace-evidence-v1` output instead of only exporting raw play traces.
- `createSideTrainingTraceEvidence()` derives side, selected strategy key, selected baseline id, ROMProfile, stage id, input summary, enemy summary, and observed progression window from captured samples.
- The cockpit keeps latest 1P and 2P evidence in runtime state and exposes hidden JSON outputs for browser verification and future package-export wiring.

Verification:
- `node --test tests/strategyTraceEvidence.test.mjs`: `3/3`.
- `node --test tests/trainingPanelLayout.test.mjs`: `12/12`.
- `npm test`: `186/186`.
- `npm run build`: passed.
- Browser check: page loaded at `http://127.0.0.1:5173/?autoload=1`; both side training panels and all side evidence outputs were present.

Next:
- Wire validated evidence into the strategy-package save flow.
- Keep raw trace export separate from strategy archival so package evidence remains schema-bound.

## 2026-06-08 Side Training Queued vs Active UI

Current:
- Side training selection is now visually separated from active training ownership.
- Selected but inactive side panels show `待启动` / queued styling, while active training side panels show `训练中` / active styling.
- Top game controls remain available while a side is only queued; they lock only after `启动训练` activates that side.

Verification:
- `node --test tests/trainingPanelLayout.test.mjs`: `13/13`.
- `node --test tests/layoutStabilityCss.test.mjs`: `4/4`.
- `npm test`: `187/187`.
- `npm run build`: passed.
- Browser check: initial 1P panel showed `待启动` with unlocked top controls; after `启动训练`, 1P showed `训练中` and the 1P top controls were locked.

## 2026-06-08 Strategy Package Evidence Save Gate

Current:
- Strategy package saving now consumes side-owned `TraceEvidence` from `sideTrainingTraceEvidence`.
- Validation replay now creates a schema-bound `fc-ai-strategy-validation-report-v1` report before save is enabled.
- Save is blocked when selected-side evidence is missing, validation report is missing, replay desynced, death count is above zero, replay is incomplete, or ROMProfile compatibility fails.
- Package evidence export includes a manifest patch, selected TraceEvidence files, and selected ValidationReport files. ROM files are not bundled.
- Stage 1 and full-game Contra roadmap artifacts remain `candidate` or `gap`; no full-clear validation is claimed.

Verification:
- `node --test tests/strategyPackageEvidence.test.mjs`: `6/6`.
- `node --test tests/trainingPanelLayout.test.mjs`: `15/15`.
- `node --test tests/standardizedOperationManualDoc.test.mjs`: `3/3`.
- `npm test`: `202/202`.
- `npm run build`: passed with the existing Vite chunk-size warning.

Next:
- Generate candidate StrategyFragments from TAS side-baselines plus archived TraceEvidence.
- Keep TAS as evidence and baseline material only, not a live controller.
- Run real runtime validation before upgrading any Contra strategy from `candidate`.

## 2026-06-08 TAS Baseline To Candidate AI Strategy Fragment

Current:
- TAS side-baselines can now be analyzed as baseline strategy material and converted into candidate AI StrategyFragment proposals when a selected side also has archived `TraceEvidence`.
- Generated candidate fragments stay `candidate`, carry semantic `actionAdvice`, and keep `tasIsController: false`.
- Strategy package save now exports candidate fragment proposals under `stages/<stageId>/candidate-fragments/` and references them from `manifest.sideArtifacts`.
- Package save still requires selected-side TraceEvidence plus a passing `ValidationReport`; TAS baseline material cannot bypass validation.

Verification:
- `node --test tests/strategyFragmentProposal.test.mjs`: `3/3`.
- `node --test tests/strategyPackageEvidence.test.mjs`: `7/7`.
- `node --test tests/trainingPanelLayout.test.mjs`: `15/15`.
- `node --test tests/standardizedOperationManualDoc.test.mjs`: `4/4`.
- Browser check: visible Chrome at `http://127.0.0.1:5173/?autoload=1`; clicking `启动1P训练` changed `1P Training` from `已选择，待启动` to `训练中`.

Next:
- Use a TAS-matched Contra ROMProfile for the TAS baseline training path, or archive a human/AI trace for the current `contra-us-good` ROMProfile.
- Run validation replay before any candidate fragment or package is upgraded beyond `candidate`.
- Continue stage-by-stage Contra clearance with separate survival, speed, combat, loot, and guard evidence.

## 2026-06-08 TAS Boss Approach Training TraceEvidence

Current:
- `contra-j-good` TAS watch-mode now has a standard compact TraceEvidence artifact for the Stage 1 boss-approach platform-capture window.
- The artifact is stored at `data/training/contra/tas_bases/contra-j-good/trace-evidence/candidate-1p-survival-v0-tas-boss-approach-platform-capture.json`.
- A generated candidate StrategyFragment proposal is stored at `data/training/contra/tas_bases/contra-j-good/candidate-fragments/candidate-fragment-1p-survival-v0-tas-boss-approach-platform-capture.json`.
- `training-base.json` indexes the artifacts through `derivedArtifacts.traceEvidence` and `derivedArtifacts.candidateFragments`.
- The captured runtime window is 1P WorldX `2500-2960`, `466` samples, first frame `2914`, last frame `3379`, death trace count `0`.
- This remains TAS-derived training evidence only. It is not a validated AI strategy and cannot upgrade the Strategy Pack without Safety Override review and a passing ValidationReport.

Verification:
- Browser CDP against visible Chrome at `http://127.0.0.1:5173/?autoload=1&rom=contra-j%2FContra%20(J).nes&record=tas-boss-approach-platform-capture&recordStart=2500&recordEnd=2960&recordStopOnDeath=1&recordStopOnEnd=1`: TAS matched, `contra-j-good` visible, `466` trace samples, WorldX `2500-2960`, death trace count `0`.
- `node --test tests/tasTrainingTraceEvidence.test.mjs`: `3/3`.
- `npm test`: `211/211`.
- `npm run build`: passed with the existing Vite chunk-size warning.
- ROM compliance scan with `rg --files -g "*.nes" -g "*.fds" -g "*.unf" -g "*.unif" -g "*.rom" -g "*.bin"`: no ROM-like files listed.

Next:
- Run browser validation replay before saving or exporting any AI strategy package that claims this window.
- Keep US and Japan ROMProfile evidence separate until a migration validation proves compatibility.

## 2026-06-08 Contra Japan AI Botrun Failure Check

Current:
- A real browser botrun against `contra-j-good` still fails before the boss-approach training window.
- The run ended with `status=death`, `reason=death-count`, `frameCount=3986`, `deaths=1`, `finalWorldX=2068`, `finalPlayerX=123`, `finalPlayerY=134`, `finalScore=2200`, `finalWeapon=0`, `bossDefeated=0`.
- The final runtime route was `weapon-gate-survive` / `loot`, script action `p03-mid-fixed-threat`, script mode `fixed-hp-fire`, last input `↓B`, primary threat `slot15:type0x07@118,160/hp6`, active threat count `15`.
- This proves the newly generated boss-approach `platform-capture` candidate is not yet reachable by the current AI route on `contra-j-good`.
- The failure is now archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json`.
- A candidate correction proposal generated from that failure evidence plus the TAS `fixed-threat-route` 1P baseline is stored at `data/training/contra/runtime_runs/contra-j-good/candidate-fragments/candidate-fragment-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json`.

Verification:
- Browser CDP against visible Chrome at `http://127.0.0.1:5173/?autoload=1&rom=contra-j%2FContra%20(J).nes&botrun=1&botframes=20000&run=post-fragment-j-check-20260608`.
- Hidden `bot-run-report-json`: schema `fc-ai-bot-run-v1`, `status=death`, `deathTraceSamples=900`.
- `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `2/2`.

Next:
- Review the generated `fixed-threat-hp-lock` candidate and convert it into an executable runtime strategy change only after adding regression tests for the `WorldX 1444-2073` failure window.
- Do not claim Stage 1 pass or full clear; current verified pass amount remains `0` stages.

## 2026-06-08 Contra Japan Mid Fixed-Threat Recovery Patch

Current:
- Added executable runtime recovery behavior `stage-one-mid-fixed-threat-recovery` for the `contra-j-good` mid fixed-threat failure window.
- Added follow-up high fixed-threat station behavior `stage-one-mid-fixed-threat-high-station` for the `WorldX 2087` counterexample.
- The patch is wired into `p03-mid-fixed-threat` before the mandatory spread gate and clears the old crouch-fire lock by advancing with jump/fire when a close fixed threat is present.
- Real browser botrun `mid-fixed-recovery-check-20260608` still ended in death, but moved the failure from `WorldX 2068` to `WorldX 2087`.
- Real browser botrun `mid-fixed-high-station-check-20260608b` still died at `WorldX 2087`, but changed the final input from `right+A+B` to `up+B` and final score from `2300` to `2400`.
- The new death evidence is archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-mid-fixed-recovery-death-worldx2087.json`.
- The high-station death evidence is archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-survival-v0-mid-fixed-high-station-death-worldx2087.json`.
- Final observed state: `status=death`, `frameCount=3991`, `deaths=1`, `finalWorldX=2087`, `finalPlayerX=128`, `finalPlayerY=121`, `finalScore=2300`, `finalWeapon=0`, `bossDefeated=0`, `lastInput=right+A+B`, primary threat `slot14:type0x07@232,64/hp8`.
- Final high-station state: `status=death`, `frameCount=3991`, `deaths=1`, `finalWorldX=2087`, `finalPlayerX=128`, `finalPlayerY=121`, `finalScore=2400`, `finalWeapon=0`, `bossDefeated=0`, `lastInput=up+B`, action lock `aim-fire:6`, primary threat `slot14:type0x07@232,64/hp8`.
- External route references reinforce the next direction: StrategyWiki's NES Stage 1 guide prioritizes Spread and clearing the boss sniper/turrets before the core, while TASVideos' Contra resource notes boss HP can only drop by `1 HP/frame`, so stable hit registration matters more than holding fire blindly.

Verification:
- `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `4/4`.
- `node --test tests/contraStage1RewardTactics.test.mjs`: `41/41`.
- Browser CDP botrun against visible Chrome on `127.0.0.1:9223`: `status=death`, `finalWorldX=2087`, `lastInput=up+B`, `finalScore=2400`.

Rule:
- This is progress evidence, not a pass.
- Do not mark `contra-j-good` Stage 1 or full-game clearance as validated; current verified pass amount remains `0` stages.
- Do not keep stacking same-point `WorldX 2087` aim patches. The next route hypothesis must prevent default-weapon arrival into this threat window or create a validated pre-entry safety/weapon route.

## 2026-06-08 Contra Japan Strategy Matrix First Run

Current:
- Browser botrun now supports the `strategy=` URL parameter for `survival-v0`, `speedrun-v0`, `combat-v0`, `loot-v0`, and `guard-v0`.
- Ran five independent real browser botruns against `contra-j-good`.
- Every strategy still ended in `death`; no Stage 1 or full-game clearance is validated.
- Matrix TraceEvidence files are archived under `data/training/contra/runtime_runs/contra-j-good/trace-evidence/`.

Matrix:
- `survival-v0`: `matrix-survival-20260608`, death at `WorldX 2087`, score `2400`, weapon `0`.
- `speedrun-v0`: `matrix-speedrun-20260608`, death at `WorldX 625`, score `1800`, weapon `16`.
- `combat-v0`: `matrix-combat-detail-20260608`, death at `WorldX 286`, score `100`, weapon `0`.
- `loot-v0`: `matrix-loot-20260608`, death at `WorldX 1943`, score `4300`, weapon `16`.
- `guard-v0`: `matrix-guard-20260608`, death at `WorldX 2038`, score `4700`, weapon `0`.

Verification:
- Browser CDP at `127.0.0.1:9223` read `bot-run-report-json` after each run.
- `node --test tests/botRunConfig.test.mjs`: `2/2`.
- `node --test tests/contraJStrategyMatrixEvidence.test.mjs`: `1/1`.

Rule:
- The strategy matrix is failure evidence, not validation evidence.
- The next implementation should fix the earliest common survival blocker class before trying to promote any strategy package.
- TAS remains baseline/training evidence only; none of these runs used TAS as the controller.

## 2026-06-08 Contra Japan Combat Opening Descent Carry

Current:
- `combat-v0` opening low fixed-threat work has four archived browser AI botrun TraceEvidence artifacts under `data/training/contra/runtime_runs/contra-j-good/trace-evidence/`.
- The direct station variant avoided death but stalled at `WorldX 286`, so it is not valid.
- The right-down and late right-only variants still died at `WorldX 290`, proving the problem was earlier descent ownership, not only the contact frame.
- The current descent-carry patch moved the real botrun failure to `WorldX 626`, with score `1700`, weapon `16`, route segment `bridge-clear`, and last input `down+right+A+B`.
- This is progress evidence only: the run still ended with `deaths=1`, `bossDefeated=0`, and no Stage 1 clearance.

Verification:
- `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `8/8`.
- `node --test tests/contraStage1RewardTactics.test.mjs`: covered in full test run.
- `npm test`: `230/230`.
- `npm run build`: passed with the existing Vite chunk-size warning.
- ROM compliance scan `rg --files -g "*.nes" -g "*.fds" -g "*.unf" -g "*.unif" -g "*.rom" -g "*.bin"`: no ROM-like files listed.

Next:
- Treat `WorldX 626` as the active `combat-v0` blocker for `contra-j-good`.
- Add a focused regression test for the `WorldX 614-626` bridge low fixed-threat crowd window before changing runtime behavior again.
- Do not claim any strategy type validated until a real botrun produces a passing `ValidationReport` with `deaths=0`.

## 2026-06-08 Contra Japan Combat Bridge Low Fixed Crowd

Current:
- `stage-one-bridge-low-fixed-crowd` is implemented and wired into `combat-v0` runtime handling.
- Real browser botrun `combat-bridge-low-fixed-crowd-check-20260608` moved the failure from `WorldX 626` to `WorldX 1943`.
- The run still ended with `status=death`, `deaths=1`, `bossDefeated=0`, final score `4500`, weapon `16`, and last input `right+A+B`.
- Standard TraceEvidence is archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-bridge-low-fixed-crowd-death-worldx1943.json`.

Verification:
- `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `9/9`.
- `node --test tests/contraStage1RewardTactics.test.mjs`: `46/46`.

Next:
- Treat `WorldX 1943` / `danger-clear` as the active `combat-v0` blocker for `contra-j-good`.
- Add the next route-level regression test for the `WorldX 1914-1943` falling low-lane danger state before changing runtime behavior.
- Keep this as progress evidence only; do not mark any strategy package validated without a passing `ValidationReport`.

## 2026-06-08 Contra Japan Combat Danger Low Lane Fall

Current:
- `stage-one-danger-low-lane-fall` is implemented and wired into runtime handling.
- Real browser botrun `combat-danger-low-lane-fall-check-20260608c` moved the failure from `WorldX 1943` to `WorldX 2038`.
- The run still ended with `status=death`, `deaths=1`, `bossDefeated=0`, final score `4700`, weapon `16`, and last input `B`.
- Standard TraceEvidence is archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-danger-low-lane-fall-death-worldx2038.json`.

Verification:
- `node --test tests/contraStage1RewardTactics.test.mjs`: `49/49`.
- `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `10/10`.
- Browser CDP botrun at `127.0.0.1:9223`: `status=death`, `finalWorldX=2038`, `finalScore=4700`, `finalWeapon=16`.

Next:
- Treat `WorldX 2038` / `danger-clear` fixed-threat cluster as the active `combat-v0` blocker.
- Add a focused regression test for stationary `B`-only death against `slot15:type0x07@153,160/hp2` before changing runtime behavior.
- Keep this as progress evidence only; do not mark any strategy package validated without a passing `ValidationReport`.

## 2026-06-08 Contra Japan Combat Spread Turret Suppression

Current:
- Existing `stage-one-spread-turret-suppression` behavior is now wired into final runtime tactical handling and action-lock bypass.
- Real browser botrun `combat-spread-turret-suppression-check-20260608b` moved the failure from `WorldX 2038` to `WorldX 2112`.
- The run still ended with `status=death`, `deaths=1`, `bossDefeated=0`, final score `4800`, weapon `16`, and last input `right+A+B`.
- Standard TraceEvidence is archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-spread-turret-suppression-death-worldx2112.json`.

Verification:
- TDD RED: `node --test tests/contraStage1RewardTactics.test.mjs` failed because runtime lacked `applyStageOneSpreadTurretSuppression`.
- TDD GREEN: `node --test tests/contraStage1RewardTactics.test.mjs`: `51/51`.
- Evidence RED: `node --test tests/contraJRuntimeTraceEvidence.test.mjs` failed with missing W2112 evidence.
- Evidence GREEN: `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `11/11`.
- Browser CDP botrun at `127.0.0.1:9223`: `status=death`, `finalWorldX=2112`, `finalScore=4800`, `finalWeapon=16`.

Next:
- Treat `WorldX 2111-2112` / `boss-approach-clear` sniper/fall transition as the active `combat-v0` blocker.
- Add a focused regression test for the `right+A+B` fall death with top threat `slot14:type0x07@207,64/hp8`.
- Keep this as progress evidence only; do not mark any strategy package validated without a passing `ValidationReport`.

## 2026-06-08 Contra Japan Combat Boss Approach Early Pit Jump

Current:
- The W2112 last-frame left-brake hypothesis was rejected by real runtime evidence: it changed the final input to `up+left+B` but regressed the death to `WorldX 2108`.
- The kept change is route-level timing: the boss-approach late pit jump now starts at `WorldX 2068` instead of `WorldX 2078`.
- Real browser botrun `combat-boss-approach-early-pit-jump-check-20260608c` moved the failure from `WorldX 2112` to `WorldX 2174`.
- The run still ended with `status=death`, `deaths=1`, `bossDefeated=0`, final score `4900`, weapon `16`, and last input `down+right+B`.
- Standard TraceEvidence is archived at `data/training/contra/runtime_runs/contra-j-good/trace-evidence/candidate-1p-combat-v0-boss-approach-early-pit-jump-death-worldx2174.json`.

Verification:
- TDD RED: `node --test tests/contraStage1RewardTactics.test.mjs` failed because the runtime still used the old `{ start: 2078, end: 2138, minY: 160 }` jump window.
- TDD GREEN: `node --test tests/contraStage1RewardTactics.test.mjs`: `52/52`.
- Evidence RED: `node --test tests/contraJRuntimeTraceEvidence.test.mjs` failed with missing W2174 evidence.
- Evidence GREEN: `node --test tests/contraJRuntimeTraceEvidence.test.mjs`: `12/12`.
- Browser CDP botrun at `127.0.0.1:9223`: `status=death`, `finalWorldX=2174`, `finalScore=4900`, `finalWeapon=16`.

Next:
- Treat `WorldX 2173-2174` / `boss-approach-clear` high-air contact with `slot14:type0x07@145,64/hp6` as the active `combat-v0` blocker.
- Add a focused regression test for the `down+right+B` high-air contact death before changing runtime behavior.
- Keep this as progress evidence only; do not mark any strategy package validated without a passing `ValidationReport`.
