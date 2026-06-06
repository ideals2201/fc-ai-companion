# ROM 版本矩阵与外部资料匹配规则

本项目允许保存 ROM 版本识别资料、RAM map、路线地标、TAS 输入参考和训练语料元数据，但不保存 ROM 文件、ROM 下载地址、即时存档或受版权保护资产。

## 硬规则

- 所有策略、TAS、RAM map、Route Script、Boss 打法、敌人类型表、训练轨迹和语料资料，必须绑定到明确 ROM 版本。
- ROM 版本优先用 `MD5 + SHA1 + SHA256` 识别，文件名只能作为辅助信息。
- 未识别 ROM 不允许直接套用正式 AI 策略，只能进入“实验 / 仅观察”状态。
- 外部资料必须标注适配等级：`精确匹配`、`已验证兼容`、`仅参考`。
- 不同游戏不得混用策略：`Contra`、`Super C`、`Contra Force`、`Super Contra 7`、中文改版、黑客改版都要分开建资料。

## 已知 Contra 版本

来源：TASVideos Contra Game Versions、Contra US annotated disassembly。

| 版本标签 | 区域 | MD5 | SHA1 | 当前用途 |
| --- | --- | --- | --- | --- |
| `contra-us-good` | U | `7bdad8b4a7a56a634c9649d20bd3011b` | `c9ea66bb7cb30ad5343f1721b1d4d3219859319b` | 当前主支持版本，默认 RAM / Route / AI 策略目标 |
| `contra-japan-good-a` | J | `0e40bc1b049c16c5d7246cc28399cb5d` | `376836361f404c815d404e1d5903d5d11f4eff0e` | 参考版本，需单独验证 RAM 与路线 |
| `contra-japan-good-b` | J | `d306c54ccfdf5cb4f8ec588f19b3e33d` | `be9dd65be8db897978dd34533dd3a037784a8ee9` | 参考版本，需单独验证 RAM 与路线 |
| `contra-kc` | U | `2686c4b168a7e82bdb2c6fb3061fcbfd` | `0103887f489bcce044c73ad49057a714753b0517` | Konami Collector's Series，需单独验证 |
| `probotector-e-good` | E | `7127f616c13b58087481dd9e93aeb2ff` | `6531ff3a062c2a83fa9683bf8a859a3500e8d9af` | 欧版机器人版，参考版本，需单独策略资料 |
| `contra-j-english-hack` | J hack | `337eb76fc979a62961837a2cb258a6cd` | `8e9c886ab94ce5fd17a875f4bb0cfdd47daa6bf9` | 改版，仅参考，不进入正式策略 |

## 适配等级

| 等级 | 判定标准 | 可用于 |
| --- | --- | --- |
| `精确匹配` | 外部资料明确标注同一 ROM 哈希，或资料来源项目要求同一 MD5/SHA1 | 可直接进入正式候选策略 |
| `已验证兼容` | 哈希不同，但经真实运行验证 RAM 地址、WorldX、敌人槽、分数、死亡、路线段一致 | 可作为兼容策略使用，并记录验证证据 |
| `仅参考` | 同系列、同关卡、同区域或玩法相近，但未验证 RAM / 路线 / 输入同步 | 只能作为人工分析资料，不能直接驱动 AI |

## 外部资料使用规则

- RAM map / 反汇编：必须绑定 ROM 版本。`nes-contra-us` 的主资料只默认适配 `contra-us-good`，Probotector 另行标注。
- TAS / `.fm2`：必须标注 TAS 使用的 ROM 版本、模拟器版本、目标类型。TAS 只能作为路线知识库，不作为实时控制器。
- 地图 / 攻略：按关卡和区域标注，优先转成 `WorldX` 地标；未验证前只能作为路线草稿。
- 训练语料：每条轨迹必须带 `romProfileId`、哈希、模拟器、策略、帧数范围、是否人工/AI/混合。
- 用户自定义策略：默认绑定当前加载 ROM 的 `romProfileId`；切换 ROM 后需要重新确认兼容性。

## 本地扫描结论

2026-06-06 在 `D:\Ai-Play` 内按文件名搜索 `contra / probotector / 魂斗罗`：

- `.nes` 匹配文件：15 个。
- 按 MD5 去重：11 个不同 ROM 内容。
- 当前运行测试 ROM 与 `contra-us-good` 哈希一致。

本结论只保存数量和哈希判断，不保存 ROM 文件、下载地址或本地绝对路径清单。

## 下一步实现要求

- 本地 ROM 端点同时返回 `MD5`、`SHA1`、`SHA256`。
- 浏览器驾驶舱显示 ROM 版本识别：已支持、参考版本、未知版本。
- Route Script 增加目标 ROM 版本字段，例如 `romProfileId` 或 `targetRom`.
- 未知 ROM 默认只允许人类操作和 RAM 观察；AI 策略进入安全待机，除非标记为实验模式。
- 建立外部资料登记表，字段包含：资料类型、来源 URL、目标 ROM、适配等级、可转化内容、验证状态。

## 来源

- TASVideos Contra Game Versions: https://tasvideos.org/18G
- Contra US annotated disassembly: https://github.com/vermiceli/nes-contra-us
- Contra regional differences: https://contra.fandom.com/wiki/Contra_(video_game)/Regional_differences

## 2026-06-06 实现状态

- 已建立当前工作目录 ROM 子目录：`D:\Ai-Play\ROM`。
- 当前运行 ROM 已复制为：`D:\Ai-Play\ROM\contra_us_test.nes`。
- 本地开发端点 `/api/local-test-rom` 已返回 `MD5`、`SHA1`、`SHA256` 三种校验值。
- 浏览器主机界面已显示 ROM 路径、版本档案、支持状态、MD5、SHA1、SHA256。
- 当前 ROM 识别为 `contra-us-good`，支持状态为 `正式适配`。
- 第一关 Route Script JSON 已绑定 `gameId: contra`、`romProfileId: contra-us-good`、`compatibilityGroup: contra-us`。
