# CLI Handoff - FC AI Companion

Created: 2026-06-08

This file is the continuation handoff for CLI development. It is not a verbatim transcript. It is the actionable project memory distilled from the long browser-cockpit development conversation, current repository state, docs, tests, and saved versions.

## Identity And Working Relationship

- User role: 主人.
- Assistant role: 00号游戏管家.
- Behave as a practical PM plus senior engineer, not a passive executor.
- Challenge requests when they reduce software quality, scientific efficiency, or human-intuitive operation.
- Stay inside this project unless the user explicitly widens scope:
  - `D:\Ai-Play\fc-ai-companion`
- Current shell environment is Windows PowerShell.
- Use Chinese with the user by default.
- Internal implementation keys, schema names, IDs, and protocol fields should stay English.

## 00号游戏管家 Working Soul

The CLI continuation should preserve this working personality:

- Direct, pragmatic, rigorous.
- Treat the user as 主人, but do not blindly obey if a request harms product logic, engineering quality, or human-intuitive operation.
- Speak plainly in Chinese. Keep reports concise, but never hide uncertainty.
- Think like a PM control console plus senior engineer:
  - clarify the real goal
  - identify risks
  - choose the efficient path
  - protect version safety
  - keep records in the right docs
  - push work to verified completion instead of stopping at suggestions
- Make technical judgments objectively:
  - if the user's idea is good, execute it
  - if it is partially right, keep the useful part and correct the risky part
  - if it is wrong, explain why and propose a better path
- Do not use fake progress. Every "done" needs evidence:
  - file state
  - tests
  - build
  - browser/runtime check
  - commit hash when saved
- When a complete feature unit is stable, recommend or perform version saving.
- When work becomes a loop, stop patching blindly. Collect evidence, write TraceEvidence, change route class or training source.
- Keep the emotional value of the product real:
  - visible strategy pack identity
  - creator/modifier metadata
  - clear training states
  - meaningful TAS viewing/training flow
  - no fake telemetry
- Maintain the same core stance:

```text
主人负责目标和判断偏好。
00号游戏管家负责客观分析、工程实现、风险控制、验证、记录和版本节奏。
```

## Current Active Objective

The full objective is not complete:

> TAS 可以演示，可以提供基准策略，我们可以按照基准策略完成多个操作策略完美通关。

Near-term priority:

1. Keep TAS as viewing/training evidence, not a live AI controller.
2. Use TAS/human/AI-run baselines to generate standard trace evidence.
3. Convert evidence into strategy fragments.
4. Validate through runtime replay and real bot runs.
5. Build usable strategy packages that can be saved, shared, imported, validated, and rolled back.
6. Continue toward robust Contra Stage 1 survival clearance before claiming strategy completion.

## Latest Saved Versions

Latest clean feature commit before this handoff file:

```text
85d0b2e fix: clarify queued training state
```

Recent commits:

```text
85d0b2e fix: clarify queued training state
6c6834b feat: archive side training trace evidence
0eeedcc feat: refine side training control states
2be9184 feat: lock cockpit controls during training
733cc12 feat: add strategy package provenance workflow
```

Before continuing, run:

```powershell
git status --short
git log -5 --oneline
```

Expected clean state after this handoff commit should include `CLI_HANDOFF.md` as the latest committed change. Use `git log -1 --oneline` in CLI to see the final handoff commit hash.

## Runtime And Browser

Current app URL used in the in-app browser:

```text
http://127.0.0.1:5173/?autoload=1
```

Common commands:

```powershell
npm test
npm run build
npm run dev --workspace @fc-ai/browser-cockpit
```

Recent verification before this handoff:

- `npm test`: `187/187` passed.
- `npm run build`: passed.
- Browser check: page loaded at `http://127.0.0.1:5173/?autoload=1`.

## Core Product Direction

This is an FC/NES AI companion platform, not a single-game ROM project.

Initial game focus:

1. Contra series first.
2. Then Jackal / 赤色要塞 and other major FC action games.

Current development target:

- Browser cockpit first.
- RAM-driven game-state reading.
- AI writes controller input before `nes.frame()`.
- No screenshot/OCR play logic.
- No ROM distribution.

Current mechanism summary:

```text
Every frame:
read emulator RAM -> build structured game state -> decide AI/TAS/training behavior -> write 1P/2P controller inputs -> run nes.frame()
```

Important product state:

- The AI already can control basic actions:
  - up/down/left/right
  - run
  - jump
  - shoot
  - keyboard/gamepad/panel input paths
- The real problem is tactical ability, not basic action ability.
- Biggest bot problem from the product view:
  - missing or incomplete Danger Detector
  - Route Script
  - Action Lock
  - FSM
  - loop-exit / anti-deadlock
  - strategy evidence and validated fragments

## Non-Negotiable Technical Principles

### World Coordinates

For Contra side-scrolling route logic:

```text
WorldX = CameraX + PlayerX
```

Route decisions must key off WorldX windows and route landmarks, not fixed screen coordinates.

For the cross-game standard, this is abstracted as `progression.primary` or game-defined ProgressionUnits through GameProfile/Condition Registry.

### TAS Positioning

TAS is:

```text
route knowledge + timing evidence + training baseline
```

TAS is not:

```text
the live controller
```

TAS-derived data must become:

- `training-base.json`
- `side-baselines.json`
- StrategyFragment candidates
- TraceEvidence
- ValidationReport

It must not directly become "AI input playback" for production strategy.

### Browser vs Training Split

- Browser cockpit = product platform and runtime demo/operation surface.
- Python/FCEUX/Lua or other external tooling = optional research/training platform.
- Current repo work should keep browser-first runtime and standard data artifacts aligned.

## Current Standards

Key standards:

- `docs/STRATEGY_PROTOCOL_CORE.md`
- `docs/STRATEGY_TRAINING_STANDARD.md`
- `docs/STRATEGY_PACK_STANDARD.md`
- `docs/19_FC_AI_DECISION_ENGINE_ENGINEERING_MANUAL_DRAFT_1_0.md`

Important standard concepts:

- GameProfile
- ROMProfile
- Condition Registry
- EntityTaxonomy
- ActionMap / semantic intent mapping
- StrategyTypes
- StagePlan
- StrategyFragment
- TraceEvidence
- ValidationReport
- TrainingScenario
- StrategyPack manifest
- provenance, parent hash, rollback snapshots
- negative constraints and safety override
- perturbation / robustness validation
- deterministic context and RNG sensitivity

Strategy Pack is a distributable data product. It must not include commercial ROM files.

## Strategy Pack Physical Direction

Canonical strategy-pack shape:

```text
strategy-packs/<game-profile-id>/
  manifest.json
  game-profile.json
  rom-profiles/
  condition-registry.json
  entity-taxonomy.json
  action-map.json
  strategy-types.json
  stages/
    <stage-id>/
      stage-plan.json
      fragments.json
      trace-evidence/
      validation-report.json
  research/
    training-scenarios.json
  README.md
```

Community/share direction:

- Export as `.zip`.
- Must include manifest, schema-bound fragments/evidence, README.
- Must pass ROM hash compatibility.
- Must pass schema validation.
- Must pass sandbox/shadow validation before marked safe.
- Community packages must mount under user/community area and must not overwrite official core files or ROM maps.

Rollback:

- Snapshot-based, not author-based.
- Author/latest modifier are visible metadata.
- Rollback target requires valid hash, compatible ROMProfile, and restorable snapshot path.

Edit count:

- Do not limit how many times a draft pack can be modified.
- Limit promotion quality instead.

## Current Browser Cockpit State

Major implemented areas:

- Physical-style cockpit:
  - left 1P controller bay
  - center TV/game screen
  - right 2P controller bay
  - host/console area
  - TAS viewing/training base section
  - Operation Strategy Control under TAS
- 1P/2P modes:
  - human
  - AI
  - mixed/hybrid
  - training lock states
  - TAS replay lock states
- 1P/2P training panels in each controller bay.
- Global Operation Strategy Control in center/console area.
- ROM library and ROMProfile display.
- Contra Japan mapper 23 support for jsnes.
- TAS registry for Contra Japan matched by exact ROM checksum.
- TAS side-baseline artifact:
  - `data/training/contra/tas_bases/contra-j-good/side-baselines.json`
- Trace evidence generation:
  - `apps/browser-cockpit/src/strategyTraceEvidence.ts`
  - `createSideTrainingTraceEvidence()`
- Side training archive now produces standard:
  - `fc-ai-strategy-trace-evidence-v1`

Recent UI rule:

- Selecting a side training panel only queues it.
- Queued state displays `待启动`.
- Top game controls remain usable while queued.
- Clicking `启动训练` activates training.
- Active state displays `训练中`.
- Only active training locks the matching top game area.
- 1P and 2P training are not mutually exclusive.
- Each side training locks only its own play area.

## Current Files To Know

Runtime:

- `apps/browser-cockpit/src/main.tsx`
- `apps/browser-cockpit/src/styles.css`
- `apps/browser-cockpit/src/strategyTraceEvidence.ts`
- `apps/browser-cockpit/src/playTraceAnalysis.ts`
- `apps/browser-cockpit/src/tasRegistry.ts`
- `apps/browser-cockpit/src/fm2Movie.ts`
- `apps/browser-cockpit/src/tasPlaybackGate.ts`
- `apps/browser-cockpit/src/romMetadata.ts`
- `apps/browser-cockpit/src/jsnesMapper23Patch.ts`

Tests:

- `tests/trainingPanelLayout.test.mjs`
- `tests/layoutStabilityCss.test.mjs`
- `tests/strategyTraceEvidence.test.mjs`
- `tests/tasRegistry.test.mjs`
- `tests/tasSideBaseline.test.mjs`
- `tests/strategyPackStandard.test.mjs`
- `tests/romMetadata.test.mjs`

Project records:

- `docs/04_TASK_BOARD.md`
- `docs/05_DECISION_LOG.md`

Standards:

- `docs/STRATEGY_PROTOCOL_CORE.md`
- `docs/STRATEGY_TRAINING_STANDARD.md`
- `docs/STRATEGY_PACK_STANDARD.md`

Strategy data:

- `strategy-packs/contra/`
- `data/tas/contra/`
- `data/training/contra/`

## ROM And TAS Context

ROM policy:

- Do not commit ROM files.
- Do not package ROM files.
- Do not provide ROM download URLs.
- Strategy data must bind exact ROMProfile/hash.

Contra US:

- Existing strategy work started around Contra US.
- It has tactical patches and trace evidence.
- It is not yet fully validated for perfect Stage 1 survival clearance.

Contra Japan:

- Added as a ROMProfile branch under existing Contra GameProfile, not a new project.
- Reason: many TAS resources are Japan-version oriented.
- Known local ROM was copied into local ROM library outside repo.
- `contra-j-good` headerless MD5 matches known TAS checksum.
- Current TAS matching logic requires exact checksum match, not just profile name.

Important:

- US and Japan strategy fragments must not be falsely treated as interchangeable.

## Current Strategy State

The current AI strategy is not complete.

Known stage-1 problem history:

- Repeated local coordinate patching around the pre-Boss/platform section caused route-class loops.
- Decision was made to stop blind coordinate-patch loops and move to trace-evidence pipeline.
- Existing failures are saved as machine-readable trace evidence.

Stop rule:

- If a route class loops/repeats failure, do not keep adding small threshold patches.
- Store TraceEvidence.
- Change route class, collect human/TAS/bot trace, or write a state-action fragment.

Current strong direction:

- Use standard trace evidence as input.
- Convert evidence into fragments.
- Validate with real runtime.
- Do not claim clearance until real botrun clears without death.

## Important User-Driven UX Decisions

- All visible UI should support Chinese, with internal keys/schema in English.
- Data panes must be compact but not randomly scrollable.
- ROM list can scroll.
- Non-log panels should generally show content fully and keep stable size.
- Training panels should sit inside 1P/2P controller bays.
- Operation Strategy Control belongs under TAS window/host area.
- Resource pack name should be prominent for emotional value.
- 1P and 2P can use different strategy packs.
- Different strategy packs can create interesting cooperative behavior, but compatibility and safety must be explicit.
- Strategy package author for current Contra pack was set to `理想` in prior work.

## Current Verification Baseline

Known good before this handoff:

```powershell
npm test
```

Expected:

```text
187/187 pass
```

Build:

```powershell
npm run build
```

Expected:

```text
tsc and vite build pass
Vite may warn that chunks are larger than 500 kB
```

Browser smoke:

1. Open or reload `http://127.0.0.1:5173/?autoload=1`.
2. Confirm both 1P and 2P training panels render.
3. Confirm queued training side shows `待启动`.
4. Click `启动训练`.
5. Confirm matching side shows `训练中`.
6. Confirm only matching top controller bay is locked.
7. Stop training.

## Immediate Next Engineering Tasks

Recommended next sequence:

1. Wire archived side `TraceEvidence` into the strategy-package save flow.
   - Current side archive creates evidence and hidden JSON outputs.
   - Save flow still needs to consume this evidence.
2. Add validation replay result gating.
   - Save Strategy should require compatible ROMProfile, evidence, validation replay, and no desync/death failure.
3. Create/import strategy package zip workflow.
   - The user showed an external candidate zip from `D:\2026FCEUX`.
   - Current browser project does not yet fully import ZIP strategy packages.
4. Use TAS side-baselines to generate candidate fragments.
   - TAS remains source material.
   - Candidate fragments still need Safety Override and runtime trace validation.
5. Continue Contra Stage 1 robust survival strategy.
   - Do not resume blind coordinate patching.
   - Use trace evidence plus state-action fragment approach.

## External Candidate Zip Context

The user showed a dialog from another workspace:

```text
D:\2026FCEUX\strategy-packs\contra
D:\2026FCEUX\dist\strategy-packs\contra-survival-0.1.0.zip
Status: candidate
ROM: 未复制、未内置、未分发
```

Interpretation:

- This is a candidate Strategy Pack zip.
- It is not a ROM.
- It is not an official validated strategy.
- ROM not bundled is correct.
- Future flow in this browser project should import the ZIP, read manifest, check ROMProfile/hash, show candidate/validated/incompatible, then validate before use.

Keep current work scoped to `D:\Ai-Play\fc-ai-companion` unless the user explicitly asks to work in `D:\2026FCEUX`.

## Do Not Do

- Do not commit or bundle ROMs.
- Do not treat TAS as the live controller.
- Do not route on fixed screen coordinates when WorldX/progression data is available.
- Do not claim Stage 1 strategy completion until verified by real runtime/botrun evidence.
- Do not mark candidate packs as validated without TraceEvidence and ValidationReport.
- Do not blindly obey UI requests if they make control ownership confusing.
- Do not hide training/source/side ownership in logs only.
- Do not use placeholder telemetry as real telemetry.
- Do not keep patching a dead-loop route class after evidence shows it failed.

## If CLI Continues Now

Start with:

```powershell
cd D:\Ai-Play\fc-ai-companion
git status --short
git log -5 --oneline
npm test
```

Then read:

```text
CLI_HANDOFF.md
docs/04_TASK_BOARD.md
docs/05_DECISION_LOG.md
docs/STRATEGY_TRAINING_STANDARD.md
docs/STRATEGY_PACK_STANDARD.md
```

Recommended first task:

```text
Implement strategy-package save flow that consumes sideTrainingTraceEvidence and writes/exports schema-bound package evidence, with tests first.
```

Suggested test target:

```text
tests/trainingPanelLayout.test.mjs
tests/strategyTraceEvidence.test.mjs
tests/strategyPackStandard.test.mjs
```

Suggested implementation target:

```text
apps/browser-cockpit/src/main.tsx
apps/browser-cockpit/src/strategyTraceEvidence.ts
strategy-packs/contra/
```

Keep the goal active until TAS viewing, TAS-derived baseline generation, strategy package validation, and Contra robust survival strategy are all verified.
