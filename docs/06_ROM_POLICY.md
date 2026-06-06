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
