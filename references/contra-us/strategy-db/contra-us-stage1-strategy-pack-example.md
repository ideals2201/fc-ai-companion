# Contra US Stage 1 StrategyPack 示例

## 1. 示例状态

这是 `contra-us-good` 的第一关策略包示例文件，用于展示《FC 游戏 AI 操作策略核心协议》如何落地到一个具体游戏。

当前状态：`candidate`

原因：

- 已有真实 ROM 运行。
- 已有 RAM 读取和手柄写入。
- 已有人类轨迹分析。
- 已有第一关部分 WorldX 片段。
- 但单 AI 稳健生存尚未完成完整通关验收。
- 人类 + AI 和双 AI 尚未完成验收。

本文件是示例和入库蓝本，不是最终完成版 StrategyPack。

## 2. 目标 ROMProfile

```json
{
  "schemaVersion": "1.0.0",
  "gameProfileId": "contra",
  "romProfileId": "contra-us-good",
  "compatibilityGroup": "contra-us",
  "displayName": "Contra (USA)",
  "region": "US",
  "hashes": {
    "md5": "7bdad8b4a7a56a634c9649d20bd3011b",
    "sha1": "c9ea66bb7cb30ad5343f1721b1d4d3219859319b",
    "sha256": ""
  },
  "compatibilityStatus": "exact-match",
  "sourcePolicy": {
    "romFileNotIncluded": true,
    "userMustProvideOwnRom": true
  }
}
```

## 3. 示例目录

```text
contra-us-stage1-strategy-pack/
  manifest.json
  game-profile.json
  rom-profiles/
    contra-us-good.json
  research/
    ram-map.json
    condition-registry.json
    entity-taxonomy.json
    action-map.json
    strategy-types.json
  stages/
    stage-1/
      stage-plan.json
      fragments.json
      validation-report.md
      known-failures.md
  trace-evidence/
    2026-06-06T23-55-55-772Z-human-run-summary.json
  schemas/
  docs/
    implementation-notes.md
    source-register.md
```

## 4. Manifest 示例

```json
{
  "schemaVersion": "1.0.0",
  "packId": "contra-us-stage1-survival-v0",
  "packVersion": "0.1.0",
  "gameProfileId": "contra",
  "romProfileIds": ["contra-us-good"],
  "strategyKeys": [
    "survival-v0",
    "speed-v0",
    "combat-v0",
    "loot-v0",
    "guard-v0"
  ],
  "supportedModes": ["single-ai", "human-ai", "dual-ai"],
  "status": "candidate",
  "standards": {
    "strategyProtocol": "1.0.0",
    "jsonSchema": "2020-12",
    "versioning": "semver-2.0.0",
    "licenseIdentifiers": "spdx"
  },
  "files": {
    "gameProfile": "game-profile.json",
    "romProfiles": ["rom-profiles/contra-us-good.json"],
    "conditionRegistry": "research/condition-registry.json",
    "entityTaxonomy": "research/entity-taxonomy.json",
    "actionMap": "research/action-map.json",
    "strategyTypes": "research/strategy-types.json",
    "stages": ["stages/stage-1/stage-plan.json"],
    "fragments": ["stages/stage-1/fragments.json"]
  },
  "quality": {
    "confidence": 0.35,
    "evidenceCount": 1,
    "validatedModes": [],
    "knownFailures": [
      "stage1-w2622-progression-barrier-jump-failure",
      "stage1-w3208-barrier-node-station-failure",
      "stage1-bridge-reward-missed",
      "stage1-fixed-threat-no-fire"
    ]
  }
}
```

## 5. GameProfile 摘要

```json
{
  "schemaVersion": "1.0.0",
  "gameProfileId": "contra",
  "displayName": "Contra",
  "platform": "fc-nes",
  "supportedModes": ["single-ai", "human-ai", "dual-ai"],
  "progressionMetrics": [
    {
      "id": "progression.primary",
      "displayName": "WorldX",
      "unit": "ContraWorldPixels",
      "formula": {
        "type": "expression",
        "inputs": [
          "ram.levelScreenNumber",
          "ram.levelScreenScrollOffset",
          "player.1.screenX"
        ],
        "expression": "(levelScreenNumber * 256 + levelScreenScrollOffset) + player1ScreenX"
      },
      "verified": true
    }
  ],
  "conditionRegistry": "research/condition-registry.json",
  "entityTaxonomy": "research/entity-taxonomy.json",
  "actionMapping": "research/action-map.json",
  "strategyTypes": "research/strategy-types.json"
}
```

## 6. Condition Registry 示例

```json
{
  "schemaVersion": "1.0.0",
  "refs": {
    "stage.id": {
      "type": "integer",
      "source": "ram.0x0030",
      "verified": true
    },
    "progression.primary": {
      "type": "number",
      "source": "computed.worldX",
      "verified": true
    },
    "player.1.alive": {
      "type": "boolean",
      "source": "player-state-and-death-flag",
      "verified": true
    },
    "player.1.position": {
      "type": "object",
      "source": "ram.0x0334-and-0x031A",
      "verified": true
    },
    "player.1.weapon": {
      "type": "integer",
      "source": "ram.0x00AA",
      "verified": true
    },
    "threat.fixed.count": {
      "type": "integer",
      "source": "entity-taxonomy",
      "verified": false
    },
    "objective.barrier.active": {
      "type": "boolean",
      "source": "entity-taxonomy-and-ram",
      "verified": false
    }
  }
}
```

## 7. EntityTaxonomy 示例

```json
{
  "schemaVersion": "1.0.0",
  "classes": {
    "fixed-threat-target": {
      "description": "固定炮台、墙体火力点、必须处理的固定攻击源。",
      "dangerPolicy": "clear-or-avoid"
    },
    "dynamic-threat": {
      "description": "普通移动敌人和近身敌人。",
      "dangerPolicy": "predict-collision"
    },
    "projectile": {
      "description": "敌方子弹和飞行威胁。",
      "dangerPolicy": "predict-trajectory"
    },
    "pickup": {
      "description": "武器箱、飞行胶囊和掉落奖励。",
      "dangerPolicy": "never-avoid-as-danger"
    },
    "progression-barrier-node": {
      "description": "阻挡关卡推进的门、墙、核心或阶段目标。",
      "dangerPolicy": "clear-required"
    },
    "high-value-component": {
      "description": "Boss 核心、高价值防御或攻击部件。",
      "dangerPolicy": "priority-target"
    },
    "non-combat-visual": {
      "description": "爆炸、特效、空槽或无威胁动画。",
      "dangerPolicy": "ignore"
    }
  }
}
```

## 8. ActionMap 示例

```json
{
  "schemaVersion": "1.0.0",
  "intents": {
    "advance": {
      "description": "沿关卡主进度方向推进。",
      "defaultInput": {
        "right": true
      }
    },
    "fire_target": {
      "description": "根据目标相对位置射击。",
      "requiresTarget": true,
      "candidateInputs": [
        "b",
        "right+b",
        "up+right+b",
        "down+right+b"
      ]
    },
    "clear_fixed_threat": {
      "description": "处理固定威胁目标，使用 HP 变化确认攻击有效。",
      "requiresTarget": true,
      "lockRecommended": true
    },
    "collect_pickup": {
      "description": "打出并拾取奖励，不得覆盖立即生存。",
      "requiresTarget": true
    },
    "recover_from_stuck": {
      "description": "使用右向偏移解除循环，同时保留避弹。",
      "defaultInput": {
        "right": true
      }
    }
  }
}
```

## 9. StrategyTypes 示例

```json
{
  "schemaVersion": "1.0.0",
  "types": {
    "survival": {
      "description": "稳健生存，默认策略。",
      "successCriteria": "目标关卡完成，死亡数满足策略目标。"
    },
    "speed": {
      "description": "快速推进，跳过非必要战斗和低价值奖励。"
    },
    "combat": {
      "description": "清敌优先，处理敌人和固定火力。"
    },
    "loot": {
      "description": "奖励优先，获取关键武器。"
    },
    "guard": {
      "description": "护卫队友，适用于人类 + AI 或双 AI。"
    },
    "objective": {
      "description": "处理关卡进展障碍节点。"
    }
  }
}
```

## 10. StagePlan 示例

```json
{
  "schemaVersion": "1.0.0",
  "gameProfileId": "contra",
  "romProfileId": "contra-us-good",
  "stageId": "stage-1",
  "strategyKey": "survival-v0",
  "segments": [
    {
      "id": "stage1-start-fast-pass",
      "progressionWindow": {
        "metric": "progression.primary",
        "start": 48,
        "end": 519,
        "unit": "ContraWorldPixels"
      },
      "intent": "advance",
      "notes": "开局快速推进正例。"
    },
    {
      "id": "stage1-first-bridge-fast-pass",
      "progressionWindow": {
        "metric": "progression.primary",
        "start": 520,
        "end": 929,
        "unit": "ContraWorldPixels"
      },
      "intent": "jump-and-advance",
      "notes": "第一桥快速通过。需要动作锁和避弹覆盖。"
    },
    {
      "id": "stage1-barrier-preclear",
      "progressionWindow": {
        "metric": "progression.primary",
        "start": 3000,
        "end": 3060,
        "unit": "ContraWorldPixels"
      },
      "intent": "clear_fixed_threat",
      "notes": "Boss 墙前固定炮台预清。"
    }
  ]
}
```

## 11. Fragment 示例

```json
{
  "id": "stage1-w3000-3060-fixed-threat-preclear",
  "label": "Stage 1 固定威胁预清",
  "status": "candidate",
  "strategyTypes": ["survival", "combat", "objective"],
  "progressionWindow": {
    "metric": "progression.primary",
    "start": 3000,
    "end": 3060,
    "unit": "ContraWorldPixels",
    "strictEnd": true
  },
  "conditions": [
    {
      "ref": "stage.id",
      "op": "eq",
      "value": 0
    },
    {
      "ref": "threat.fixed.count",
      "op": "gt",
      "value": 0
    }
  ],
  "actionAdvice": {
    "intent": "clear_fixed_threat",
    "priority": 180,
    "parameters": {
      "targetClass": "fixed-threat-target",
      "hpMonitor": true,
      "fireMode": "sustain-if-hp-drops",
      "fallback": "change-position-if-no-hp-change"
    },
    "lockFrames": 18
  },
  "safetyOverrides": [
    {
      "ref": "danger.immediate",
      "intent": "evade"
    }
  ],
  "exitConditions": [
    {
      "ref": "progression.primary",
      "op": "gt",
      "value": 3060
    },
    {
      "ref": "threat.fixed.count",
      "op": "eq",
      "value": 0
    }
  ],
  "failureCounterexamples": [
    "stage1-w3208-barrier-node-station-failure"
  ],
  "telemetry": {
    "requiredRefs": [
      "progression.primary",
      "player.1.position",
      "threat.fixed.count",
      "runtime.finalInput"
    ]
  }
}
```

## 12. 已知失败反例

```json
[
  {
    "id": "stage1-w2622-progression-barrier-jump-failure",
    "progression": 2622,
    "type": "jump-window-failure",
    "lesson": "关卡进展障碍前必须建立起跳窗口和动作锁。"
  },
  {
    "id": "stage1-w3208-barrier-node-station-failure",
    "progression": 3208,
    "type": "station-and-landing-failure",
    "lesson": "固定目标站位和落地阶段不能丢失 Action Lock。"
  },
  {
    "id": "stage1-bridge-reward-missed",
    "type": "loot-and-aiming-failure",
    "lesson": "奖励点需要固定射击角度和拾取确认。"
  },
  {
    "id": "stage1-fixed-threat-no-fire",
    "type": "targeting-failure",
    "lesson": "看见固定威胁时必须进入战备状态，不能因为路线推进而不开枪。"
  }
]
```

## 13. 当前不能标记 validated 的原因

- 单 AI 稳健生存尚未完成第一关全流程无重大失败验收。
- 固定威胁 HP Monitor 尚未完全闭环。
- Reward / loot 片段还没有稳定证据。
- 2P 坐标、生命、武器、跳跃 RAM map 未完成验证。
- 人类 + AI 和双 AI 没有完成模式验收。

因此该包只能是 `candidate`。

## 14. 下一步入库要求

1. 把本示例拆成实际 JSON 文件。
2. 用 JSON Schema 校验。
3. 接入 Runtime API 输入输出校验。
4. 执行单 AI 稳健生存 botrun。
5. 把成功和失败都写入 TraceEvidence。
6. 更新 Validation Report。
7. 通过后再考虑升级为 `validated-single-ai`。
