# 浏览器驾驶舱真实 ROM 冒烟测试 - 2026-06-05

## 范围

正式项目浏览器驾驶舱真实 ROM 冒烟测试。

## 运行时

- 应用：`apps/browser-cockpit`
- 模拟器：`jsnes@2.1.0`
- 本地地址：`http://127.0.0.1:5173/`
- 冒烟地址：`http://127.0.0.1:5173/?autoload=1&autorun=1&smoke=1`
- ROM 来源：通过已忽略的 `.env.local` 配置本地用户自有文件

## 验证

- `npm run check`：通过
- 页面 HTTP 状态：`200`
- `/api/local-test-rom`：`200`，`131088` 字节
- Chrome headless 桌面截图：真实 Contra 标题画面已渲染
- Chrome headless 冒烟截图：延迟开始键输入后进入真实 Stage 1 画面
- Codex 内部浏览器：中文界面已加载，真实 ROM 运行中
- 声音入口：已接入 Web Audio；浏览器要求真实用户点击“启用声音”

## 结果

正式项目现在具备真实 ROM 冒烟运行时。它可以加载已配置的本地 ROM，运行 JSNES，把画面绘制到 canvas，注入手柄输入，并在用户点击后启用声音。

## 剩余缺口

这还不是战术 AI。

下一步必须完成：

- RAM State Schema
- CameraX / PlayerX / WorldX derivation
- Danger Detector V0
- Route Script V0
- Action Lock V0
- FSM V0
