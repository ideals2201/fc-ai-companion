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
