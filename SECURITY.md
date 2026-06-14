# Security Policy / 安全策略

## Supported Versions / 支持版本

The first public support line is `v0.1.x`.

首个公开支持线是 `v0.1.x`。

## Reporting a Vulnerability / 报告安全问题

Do not submit private keys, tokens, local filesystem paths, ROM files, save states, or other sensitive data in public issues.

不要在公开 issue 中提交私钥、token、本地文件系统路径、ROM 文件、即时存档或其他敏感数据。

Please report security issues to the maintainer privately first, then publish details only after the issue has been handled. If the GitHub repository has not yet configured a private security contact, configure one before opening public vulnerability reports.

请先通过私密渠道向项目维护者报告安全问题，处理后再公开细节。如果 GitHub 仓库尚未配置私密安全联系渠道，请先配置后再开放公开漏洞报告。

## Repository Safety Rules / 仓库安全规则

- Do not commit `.env`, `.env.local`, ROMs, BIOS files, save states, or local run artifacts. / 不提交 `.env`、`.env.local`、ROM、BIOS、即时存档或本地运行产物。
- Do not paste private tokens or account credentials into logs, issues, or discussions. / 不在日志、issue 或 discussion 中粘贴私密 token 或账号凭据。
- Keep local ROM directories outside the repository. / 本地 ROM 目录应放在仓库外。
- Treat generated runtime search outputs as local artifacts unless they have been deliberately promoted into a sanitized fixture or documented evidence file. / 生成的运行时搜索输出默认视为本地产物，除非已经明确提升为脱敏 fixture 或文档化证据文件。
