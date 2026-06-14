# ROM and Asset Policy / ROM 与资产政策

This repository must not include copyrighted game ROMs, BIOS files, save states, downloaded commercial game archives, or other protected game assets.

本仓库不得包含受版权保护的游戏 ROM、BIOS、即时存档、下载得到的商业游戏压缩包或其他受保护游戏资产。

Allowed repository content / 允许提交的内容：

- Source code / 源代码
- Documentation / 文档
- Strategy package metadata / 策略包元数据
- RAM maps and schema files / RAM 映射和 schema 文件
- Generated evidence that does not include ROM bytes or save-state payloads / 不包含 ROM 字节或即时存档载荷的证据文件
- Instructions for loading a user's own local ROM files / 加载用户自有本地 ROM 的说明

Forbidden repository content / 禁止提交的内容：

- `.nes`, `.fds`, `.unf`, `.unif`, `.zip`, `.7z`, `.rar`, BIOS, save-state, or save files / ROM、BIOS、即时存档、存档或压缩包
- ROM download links / ROM 下载链接
- Bundled commercial game assets / 打包的商业游戏资产

User-owned local files must be kept outside the repository or inside ignored local-only directories.

用户自有本地文件必须放在仓库外，或放在已忽略的本地专用目录中。

## Local Development Runtime / 本地开发运行时

The browser cockpit exposes development-only local endpoints such as:

浏览器驾驶舱提供仅用于本地开发的端点，例如：

```text
/__fc-local-rom
/__fc-local-rom-info
/__fc-local-resource
```

Rules / 规则：

- `.env.local` is ignored by Git. / `.env.local` 已被 Git 忽略。
- Do not commit local ROM paths that reveal private filesystem details. / 不提交会暴露私人文件系统信息的本地 ROM 路径。
- Do not commit ROM bytes, BIOS files, save states, or downloaded archives. / 不提交 ROM 字节、BIOS、即时存档或下载压缩包。
- These endpoints are for local development only. / 这些端点仅用于本地开发。

## ROM Profiles / ROM Profile

Strategy, RAM maps, TAS-derived knowledge, route scripts, training traces, and corpus assets must be tied to explicit ROM Profile metadata.

策略、RAM 映射、TAS 派生知识、路线脚本、训练轨迹和语料资产必须绑定明确的 ROM Profile 元数据。

Rules / 规则：

- Prefer checksum identification with MD5, SHA1, and SHA256. / 优先使用 MD5、SHA1、SHA256 校验和识别。
- Treat filenames as helper labels only. / 文件名只能作为辅助标签。
- External material must state whether it is an exact match, validated compatible, or reference-only. / 外部资料必须标明是精确匹配、已验证兼容，还是仅供参考。
- Unknown ROMs default to human play and RAM observation until compatibility is confirmed. / 未识别 ROM 默认只允许人类游玩和 RAM 观察，直到确认兼容性。
- TAS material is evidence and route knowledge, not an automatic live controller. / TAS 材料是证据和路线知识，不是自动实时控制器。
- Different games, regional releases, hacks, and translations must be modeled as separate profiles. / 不同游戏、区域版本、改版和翻译版必须建模为不同 profile。
