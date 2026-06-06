# 浏览器驾驶舱应用

这个应用是项目的浏览器产品平台。

V0 职责：

- 模拟器承载
- 帧循环
- RAM 状态读取适配器
- 手柄输入适配器
- 驾驶舱界面
- 玩家 / AI 控制切换

战术基线稳定之前，不做复杂语音、直播、高级 UI 动画。

## 当前状态

当前实现是可运行的驾驶舱外壳，已经接入真实 JSNES 冒烟运行时。

它可以通过开发端点加载本地用户自有 ROM：

```text
/api/local-test-rom
```

端点从仓库根目录的 `.env.local` 读取 `FC_AI_COMPANION_ROM_PATH`。`.env.local` 已被 Git 忽略。

从仓库根目录运行：

```powershell
npm run dev:cockpit
```

可选冒烟测试地址：

```text
http://127.0.0.1:5173/?autoload=1&autorun=1&smoke=1
```

声音不会自动播放。浏览器要求用户手势，进入页面后需要点击“启用声音”。
