# ROM 与资产政策

本仓库不得包含 ROM、BIOS、即时存档、受版权保护的游戏资产，或下载得到的商业游戏压缩包。

允许：

- 源代码
- 文档
- RAM 映射
- 派生状态 schema
- 路线地标
- 使用合法 homebrew / demo ROM 的测试
- 本地加载用户自有 ROM 的说明

禁止：

- 提交 `.nes`、`.fds`、`.zip`、`.7z`、`.rar`、即时存档或 BIOS 文件
- ROM 下载地址
- 打包商业资产

本地用户自有文件必须放在仓库外，或放在已忽略的本地专用目录中。

## 本地开发运行时

浏览器驾驶舱可以通过仅限开发使用的端点读取本地用户自有 ROM：

```text
/api/local-test-rom
```

端点必须从 `.env.local` 里的 `FC_AI_COMPANION_ROM_PATH` 读取路径。

规则：

- `.env.local` 被 Git 忽略。
- 不提交真实 ROM 路径。
- 不提交 ROM 字节、即时存档、BIOS 文件或下载归档。
- 该端点只用于本地开发。

## ROM 版本匹配

策略、RAM map、TAS、Route Script、Boss 打法、训练轨迹和语料资料必须绑定明确 ROM 版本。

规则：

- ROM 版本识别优先使用 `MD5 + SHA1 + SHA256`，文件名只能作为辅助信息。
- 外部资料必须标注适配等级：`精确匹配`、`已验证兼容`、`仅参考`。
- 未识别 ROM 默认只允许人类操作和 RAM 观察；正式 AI 策略必须等待版本确认或实验模式标记。
- TAS 只能作为路线知识库，不作为实时控制器。
- 不同游戏或改版必须分开建资料，不得把 Contra、Super C、Contra Force、中文改版和 Probotector 混用。

版本矩阵见：

```text
docs/09_ROM_VERSION_MATRIX.md
```
