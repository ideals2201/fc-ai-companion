# 决策日志

## 2026-06-05：干净仓库模式

决策：创建新的干净项目仓库，把已有文件夹作为历史参考。

原因：当前工作区包含历史测试包和本地用户文件。新产品需要一个可控、可进入 GitHub 模式的结构。

## 2026-06-05：当前 Bot 现实

决策：记录 AI 已经具备基础动作控制能力。

当前问题是战术能力，不是按键能力。

## 2026-06-05：战术优先级

决策：优先实现 Danger Detector、Route Script、Action Lock 和 FSM。

原因：Bot 已经会操作，但缺少战术生存逻辑，所以经常死亡。

## 2026-06-05：TAS 边界

决策：TAS 是路线知识库，不是控制器。

## 2026-06-05：浏览器 / 训练分工

决策：浏览器是产品平台。Python / Gym Retro 是后续训练平台。

## 2026-06-05：PM 控制的子对话

决策：使用本主线程作为 PM 总控台，并创建三个置顶、只读初始化子对话。

Agent：

- 01 模拟器工程师 Agent
- 02 RAM 逆向工程师 Agent
- 03 Bot 行为工程师 Agent

原因：项目需要聚焦的技术审查，同时保持 PM 对优先级、架构和合规边界的控制。

## 2026-06-05：第一个正式开发步骤

决策：从浏览器驾驶舱外壳开始正式实现。

范围：

- `apps/browser-cockpit` 下的 Vite / React / TypeScript 应用
- 驾驶舱布局
- 双控制舱
- 实时手柄可视化外壳
- 战术栈状态外壳
- 事件流外壳

边界：

- ROM 加载只走本地 `.env.local`，且该文件被 Git 忽略
- 模拟器运行时当前仅为 JSNES 冒烟运行时
- 不做复杂语音
- 不做直播
- 不做高级动画
- 不做 LLM 快脑控制

原因：项目需要先拥有可运行的产品表面，再接入模拟器与 RAM 适配器；战术逻辑仍是下一阶段核心工作。

## 2026-06-05：真实 ROM 冒烟运行时

决策：用真实 JSNES 冒烟运行时替换模拟游戏画面。

范围：

- `jsnes@2.1.0`
- Vite 开发端点 `/api/local-test-rom`
- 通过本地 `.env.local` 配置用户自有 ROM 测试路径
- NES canvas 渲染
- 手动手柄输入
- 延迟开始键和右 + B 输入冒烟测试
- Web Audio 声音入口
- 中文产品界面

边界：

- 不提交 ROM
- 不提交真实 ROM 路径
- 尚无路线 AI
- 尚无 RAM schema
- 尚无 WorldX
- 不做 TAS 直接控制

原因：参考程序已经证明真实运行路径可行；正式项目应该从真实本地 ROM 测试开始，而不是继续保留模拟画面。

## 2026-06-05：版本建议规则

决策：PM 总控台应该主动建议何时保存检查点或升级项目版本。

规则：

- PM 可以在完成一组连贯工作并验证后，独立创建普通 commit。
- 当理由充分时，PM 应该建议版本号升级、tag、release 或 merge。
- merge 到 `main`、tag、release、版本号变化、推送 GitHub、删除分支、改写历史，必须由项目主人批准。

原因：版本控制应该保护推进速度，但不能让流程决策静默改变项目状态。

## 2026-06-06：新增界面 / 产品体验子对话

决策：新增 `04 界面 / 产品体验 Agent`，作为 PM 总控台管理下的只读初始化子对话。

范围：

- 中文界面一致性
- 浏览器驾驶舱布局
- 真实 ROM 测试可读性
- 玩家 / AI 状态展示
- 声音、手柄、事件流交互体验
- RAM / WorldX / Danger Detector / Route Script / Action Lock / FSM 的测试可观察性

边界：

- 不决定技术路线
- 不改变项目方向
- 不提交 ROM、BIOS、存档或商业资产
- 不把界面做成只好看但不利于调试的展示页
- 当前只读初始化，不直接改代码

原因：浏览器是产品平台，界面必须同时服务玩家体验和真实调试，不应仅由模拟器、RAM 或 Bot 行为 Agent 顺带处理。

## 2026-06-06：第一个验收版本 V0.1.0

决策：保存第一个正式验收版本 `V0.1.0`。

验收结论：

- 模拟器运行正常。
- 手动操作输入正常。

范围：

- 浏览器驾驶舱应用
- JSNES 真实 ROM 冒烟运行时
- 本地用户自有 ROM 加载
- Canvas 画面渲染
- 1P 手动输入
- 中文界面
- 声音入口

边界：

- 不提交 ROM
- 不提交真实 ROM 路径
- 尚无 RAM state schema
- 尚无 WorldX
- 尚无战术 AI

原因：当前版本已经满足“真实模拟器运行 + 手动输入正常”的第一个可运行验收点，应作为 V0.1.0 固定下来。

## 2026-06-06：子对话回报规则

决策：PM 总控台每次向子对话下达指令时，必须要求子对话完成后回报 PM。

规则：

- 派发不等于完成。
- 子对话必须返回固定报告。
- PM 总控台回收并验收报告后，才能把专项判断转成代码任务或项目决策。
- 子对话默认不直接修改主线代码；除非 PM 明确派发实现任务并规定边界。

原因：这样可以保持主线程的项目控制权，同时利用子对话做专项分析，提高协作效率。

## 2026-06-06：双手柄与控制模式路线

决策：在 V0.1.0 之后接入 1P / 2P 双手柄输入路由，并为每路提供人类、AI、混合模式。

范围：

- 1P / 2P 独立按钮状态
- 1P / 2P 独立写入 JSNES controller 1 / 2
- 键盘双人映射
- 浏览器 Gamepad API 轮询
- 每路人类 / AI / 混合模式切换
- AI 模式当前为安全占位，不代表战术 AI 已完成

边界：

- 不改变 ROM 加载方式
- 不改变 JSNES 模拟器选型
- 不推进 RAM / WorldX / 战术 AI
- 不破坏 V0.1.0 已验收的 1P 手动输入

原因：双手柄通道是后续 AI 接管 2P、混合控制、Action Lock、FSM 的基础。

## 2026-06-06：物理化驾驶舱布局

决策：浏览器驾驶舱按真实物理设备组织界面。

布局：

- 左侧是 1P 实体手柄舱。
- 中间是电视，承载游戏画面、帧数、屏幕数占位、全屏、声音和颜色调节。
- 右侧是 2P 实体手柄舱。
- 电视下方是主机，位于 1P / 2P 中间。

手柄舱范围：

- 人类 / AI / 混合模式。
- AI 策略模型选择。
- 手柄按钮状态。
- 击杀、死亡、路线、危险等数据槽位。
- AI 对话文字。
- 每路数据流。

边界：

- 击杀、死亡、屏幕数、WorldX、Danger Detector、Route Script、Action Lock、FSM 当前仍等待 RAM / 战术层接入。
- AI 策略模型当前只是安全占位，不代表战术 AI 已完成。
- 不把界面做成纯装饰。

原因：项目需要让玩家感受到“正在和 1P/2P 手柄、电视、主机互动”，同时让 PM / RAM / Bot 行为测试可以读到控制权、输入、数据流和战术占位状态。

## 2026-06-06：主机按钮收敛

决策：主机只保留三个物理功能按钮。

范围：

- 更换卡带。
- 暂停 / 继续。
- Reset。

边界：

- Start 属于 1P / 2P 手柄，不属于主机。
- 声音、全屏、颜色调节属于电视，不属于主机。
- 声音启用合并到电视音量控制，不单独保留声音按钮。
- 输入测试属于开发冒烟测试，不作为主机常驻按钮。
- Reset 是主机断电重启；按下后先停止帧循环，再复位游戏，随后自动 Power On。
- 暂停 / 继续只控制帧循环，不销毁当前卡带。
- 帧数 / 存活帧属于电视运行指标，不放在 1P / 2P 手柄或主机里重复显示。

原因：主机应该模仿实体 FC/NES 主机的核心操作，避免把调试按钮堆在主机区域，降低产品真实感和操作清晰度。

## 2026-06-06：RAM Reader V0 与战绩统计口径

决策：浏览器版以 JSNES RAM 作为游戏状态来源，每帧读取 CPU RAM，生成结构化状态，再推进模拟器帧。

范围：

- 读取 1P 基础状态、关卡、屏幕、卷轴、死亡标记、玩家坐标和敌人槽。
- V0 推导 `CameraX = screen * 256 + scroll`。
- V0 推导 `WorldX = CameraX + PlayerX`。
- 死亡数使用 1P 状态转移 / 死亡标记上升沿，并使用 latch 防止重复计数。
- 击杀数使用敌人槽生命周期推导，界面标为“推导”，不声明完全准确。
- 开枪、跳跃、移动等输入战绩只在 RAM 判断已经进入可操作游戏状态后累计。

边界：

- 2P 专属 RAM map 尚未验证，2P 生命、坐标、死亡等仍待接入。
- killCount V0 可能混入滚屏回收、槽复用或脚本清理，需要后续验证过滤条件。
- 本阶段不推进 Danger Detector、Route Script、Action Lock、FSM。
- 不做截图 / OCR / 计算机视觉主路线。

原因：当前 Bot 已经会按键操作，真正缺口是战术判断；RAM Reader V0 是 Danger Detector、路线系统和 FSM 的前置地基。

## 2026-06-06：AI 操作层 V0 与动态玩家身份

决策：1P / 2P 面板名称随控制模式自动变化，并接入最小 AI 操作层 V0。

范围：

- 人类模式显示玩家身份。
- AI 模式显示 AI 接管 / AI 伙伴身份。
- 混合模式显示玩家 + AI 辅助身份。
- 切到 AI / 混合模式时，如果当前策略仍为关闭或安全占位，自动切到规则基线 V0。
- 规则基线 V0 在 `nes.frame()` 前写入 AI 手柄输入。
- 未入局时 AI 周期性按 Start。
- 入局后 AI 向右推进、射击，并进行基础跳跃。
- 混合模式下人类输入优先，AI 在无人类输入时补助。

边界：

- 安全占位 Bot 仍保持不写动作。
- AI 操作层 V0 不是战术 AI。
- 当前 AI 没有 Danger Detector、Route Script、Action Lock、FSM，所以会操作但仍会经常死亡。
- 2P 专属 RAM map 仍待验证。

原因：项目现状不是“AI 不会操作”，而是“AI 会操作但没有战术能力”。本阶段先把真实手柄写入能力接到正式浏览器项目，再进入危险检测和路线系统。

## 2026-06-06：2P 接入必须符合真实 FC 操作

决策：2P 不能自己启动游戏；2P AI / 混合模式只有在 RAM 明确检测到双人模式后才允许写入手柄和累计战绩。

范围：

- 使用 `0x0022 Player Mode` 判断双人模式：`0x00 = single player`，`0x01 = 2 player`。
- `0x001D` 只作为调试显示，不作为门禁依据，因为实测中它会在单人局产生误判。
- 未检测到双人模式时，2P 面板可选择 AI 身份，但显示“等待双人局”。
- 未检测到双人模式时，2P AI 输出为空，`ai.write=idle`。
- 未检测到双人模式时，2P 的开枪、跳跃、移动不累计战绩。
- 1P AI 仍可在单人模式下自动入局并操作。

边界：

- 不由 2P AI 自动选择双人菜单。
- 不把 2P lives / state / deathFlag 当作双人模式判据。
- 2P 专属 RAM map 仍需后续验证。

原因：软件行为必须符合真实 FC/NES 操作直觉：几人模式由游戏菜单启动，2P 控制器不能在单人局里凭空生成角色。

## 2026-06-06：autorun 与主机暂停边界

决策：`autorun=1` 只执行一次，不得在用户按暂停后自动恢复运行。

原因：自动运行参数属于启动辅助，不应覆盖主机实体按钮的暂停 / 继续操作。

## 2026-06-06：驾驶舱数据可信度修正

决策：优先修正界面可读性和数据口径，不继续堆叠新 AI 功能。

范围：

- 在中等宽度下保持 1P / 电视 / 2P 三栏物理布局。
- 敌人槽生命周期推导值不再显示为“击杀”，改为“疑似击破”。
- 数据流增加 `runtime.status`，区分模拟器运行状态和 RAM gameplay 状态。
- 暂停时玩家统计显示“暂停中”。
- 事件流中的声音状态只保留最新一条，避免“已开启”和“等待点击”同时出现。

原因：当前阶段必须保证界面和数据可信；不可靠的数据应降级展示，不能伪装成精确战绩。

## 2026-06-06：2P 战绩显示口径

决策：2P 面板不再显示“等待 2P RAM”的空战绩；在双人局中接入 2P 死亡事件统计，并显示队伍级“疑似击破”推导值。

范围：

- 2P 死亡使用 `p2State / p2DeathFlag` 的状态转移和上升沿统计。
- 1P / 2P 死亡 latch 分开，避免互相影响。
- 敌人槽生命周期推导无法判断最后一击来自 1P 还是 2P，因此 2P 的“疑似击破”显示为队伍级推导，不声明为个人击杀。
- 2P 数据流增加 `p2.deathFlag`，便于后续实测校验。

边界：

- 2P 坐标、生命、武器、跳跃等 RAM map 仍待验证。
- 当前 killCount 仍是推导值，不能作为精确击杀数。

原因：界面不能长期显示空数据，但也不能把队伍推导值伪装成个人精确战绩。

## 2026-06-06：Score & Destruction Tracker V0

决策：把玩家面板从单一“疑似击破”升级为四类战果、武器获得、行为数据和真实分数分组展示。

范围：

- 读取官方 RAM 分数：`0x07E2` 为 1P，`0x07E4` 为 2P，`0x07E0` 为最高分。
- 分数按 16-bit 计数单位显示为 `units * 100`。
- 读取 `0x0588 + slot` Enemy Score Collision，保留 score code / collision code。
- 只有在玩家分数上涨且敌人对象出现 HP 归零或可见槽位消失时，才计入战果分类。
- 战果分为四格：普通敌兵、炮台火力、飞行物、Boss部件。
- 武器获得分为 M、S、F、L、R、B，并显示当前武器和总数。
- 行为数据分为移动、跳跃、按枪、实际发弹。

边界：

- 战果分类是高精度推导，不等同于反编译级完全归因。
- 如果同一帧 1P / 2P 同时得分，暂时进入未归因，不强行分配个人击杀。
- 玩家子弹 owner 字段仍需在真实双人局验证。
- 武器重复拾取但状态不变化时，V0 可能无法计数，后续需结合 weapon item 事件完善。

原因：用户需要把游戏黑盒数据显化。分数是游戏官方精确数据；战果、武器和行为需要基于 RAM 事件做可信推导，必须清楚区分精确值与推导值。

## 2026-06-06：陪玩策略 V0

决策：AI 不再只有单一规则基线，改为可选择的陪玩策略。

范围：

- `快速推进`：优先向右推进，前方有威胁时射击，近身危险时跳跃。
- `清敌优先`：优先处理屏幕威胁，敌人靠近时放缓推进并持续射击。
- `奖励优先`：优先追踪武器箱、飞行胶囊和掉落奖励，发现目标时靠近并射击。
- `护卫队友`：优先射击 1P 周围威胁，作为 2P AI 的默认陪玩策略。
- `跟随/待机测试`：保留为低频推进和点射的稳定性测试策略。
- 1P 切换 AI / 混合时默认进入 `快速推进`。
- 2P 切换 AI / 混合时默认进入 `护卫队友`。
- 数据流增加 `ai.behavior`，用于观察当前策略行为标签。

边界：

- 当前策略仍是 RAM 规则策略，不是训练模型。
- 护卫队友 V0 以 1P 坐标和 1P 周围威胁为中心；2P 坐标 RAM map 尚未验证，因此暂不做精确站位跟随。
- 奖励优先 V0 能识别武器箱、飞行胶囊和武器物品，但路线仍是屏幕内短程趋近，不是完整 Route Script。
- 这些策略不替代 Danger Detector、Route Script、Action Lock、FSM，后续仍需要正式战术层。

原因：项目现状是 AI 已经能按键，但缺战术。陪玩策略 V0 先把“AI 想做什么”显化成可选行为模式，为后续 FSM 和路线系统提供清晰接口。

## 2026-06-06：第一关 Route Script V0

决策：第一关攻略策略以独立 JSON 文件保存，浏览器运行时加载后由 AI 每帧按 `WorldX` 选择当前路线段。

范围：

- 新增 `apps/browser-cockpit/public/strategies/contra/stage1/` 策略目录。
- 第一关提供 `快速推进`、`清敌优先`、`奖励优先`、`护卫队友` 四类路线文件。
- 路线段包含 `worldStart / worldEnd / action / fire / jumpEvery`。
- AI 控制器仍然只负责写入手柄；路线文件是 TAS 式知识库，不是控制器。
- 数据流增加 `route.segment` 和 `route.action`，中间快脑显示当前 1P 路线段。
- Boss 墙段采用停位射击，避免通用推进策略冲过安全位置。
- 当 1P 处于 AI / 混合且 2P 请求 AI / 混合时，1P AI 可在菜单阶段按真实 SELECT + START 逻辑进入双人局。

边界：

- 当前是 Route Script V0，不代表第一关已通过完整实测验收。
- Danger Detector V0、Action Lock V0、FSM V0 仍需继续实现。
- 2P 坐标 RAM map 尚未验证，护卫队友仍以 1P 坐标和 1P 周围威胁作为 V0 基准。
- 人类 1P + AI 2P 模式下，不强行劫持 1P 人类菜单输入；需要人类按真实操作选择双人局，或后续单独设计“主机自动开双人局”功能。

原因：当前 AI 已经会操作，真正缺口是战术路线。第一关路线文件把“怎么打”从控制器里拆出来，后续玩家可以编辑、训练或替换策略，而不会破坏模拟器输入层。

## 2026-06-06：策略设计窗口 V0

决策：在浏览器驾驶舱中加入策略设计窗口，允许玩家编辑并保存个人第一关 Route Script。

范围：

- 新增 `个人策略` AI 策略项。
- 策略窗口编辑标准 Route Script JSON。
- 保存位置是浏览器 `localStorage`，不会自动写入仓库文件。
- 保存后可以设为 1P 或 2P 当前策略。
- 刷新页面后个人策略会重新加载。

边界：

- 当前只支持 Contra 第一关 Route Script。
- 当前不是训练器，只是人工编辑和本地保存。
- 个人策略不会自动成为正式项目策略文件；进入 Git 版本必须由 PM 判断并经项目主人确认。
- 后续人类打法观察应记录 `frame / WorldX / PlayerX/Y / 输入 / 敌人槽 / 分数 / 死亡 / 武器`，再转成候选策略。

原因：策略应该是可编辑、可保存、可训练的数据资产。先用本地个人策略验证工作流，再考虑导入导出、轨迹生成和训练平台。

## 2026-06-06：全面数据显化 V0

决策：在浏览器驾驶舱增加全面数据显化面板，并接入人类轨迹记录器。

范围：

- 显示运行状态、声音状态、帧数、关卡、双人局、GameOver、RAM 模式字段。
- 显示屏幕、卷轴、CameraX、WorldX、玩家坐标、当前路线段、Boss 标记。
- 显示 1P / 2P 控制模式、策略、路线库、生命、状态、跳跃、武器、护盾和当前输入。
- 显示敌人槽数量、威胁数、固定火力、奖励目标、子弹槽、1P/2P 子弹和最高分。
- 显示 1P / 2P 累计分数、死亡、发弹和战果。
- 展开敌人槽 Top 8 和子弹槽 Top 8。
- 支持开始 / 停止 / 导出 / 清空轨迹，轨迹字段包含 `frame / RAM / WorldX / 输入 / 敌人槽 / 子弹槽 / 分数 / 死亡 / 武器`。

边界：

- 2P 坐标仍未验证，因此 2P 路线和位置仍以现有 RAM 口径展示，不声明精确跟随。
- 敌人槽、子弹槽是实时槽位数据，不等同于反编译语义。
- 战果仍是高精度推导，不是完全归因。
- 轨迹导出在浏览器下载，不自动提交到仓库。

原因：玩家打法和 AI 策略必须变成可复盘数据。全面显化先保证“看到的都是真实数据或明确推导”，再用人类轨迹反推 Route Script、Danger Detector、Action Lock 和 FSM。

## 2026-06-06：玩家卡片双开关模式

决策：把 1P / 2P 玩家卡片改为头像 + 右侧双开关，不再常驻三个模式按钮。

范围：

- 玩家头像使用卡通战士风格，1P 为蓝色，2P 为红色。
- 右侧只保留 `人类` 和 `AI` 两个开关。
- 仅 `人类` 开启时，对应 `human` 模式。
- 仅 `AI` 开启时，对应 `ai` 模式。
- `人类` 和 `AI` 同时开启时，对应 `hybrid` 混合模式。
- 为避免控制权失效，不允许两个开关同时关闭；如果操作会导致全关，自动回到人类模式。

原因：这个交互比三枚按钮更像真实“控制权开关”，玩家能直观看到人类和 AI 是否同时参与，同时不引入无控制权的异常状态。

## 2026-06-06：默认 AI 策略改为稳健生存

决策：新增 `稳健生存` 策略，并将其设为 1P / 2P 的默认 AI 策略。

范围：

- 玩家常用策略按钮保留正式玩法策略，不显示关闭、占位、输入镜像等调试策略。
- `稳健生存` 使用第一关 Route Script 文件，可像其它策略一样加载和后续编辑。
- `稳健生存` 优先处理近身危险、威胁过密和低风险推进。
- 1P / 2P 初始策略和切换到 AI 时的自动默认策略均为 `稳健生存`。
- `护卫队友` 仍保留为可选陪玩策略，不再作为默认策略。

原因：当前 AI 已经具备移动、跳跃、射击等动作能力，最大 Bot 问题是缺少战术生存能力。默认策略应该先降低死亡率，再让玩家按目标切换到快速推进、清敌优先、奖励优先或护卫队友。

## 2026-06-06：外部资料必须绑定 ROM 版本

决策：所有网络资料、TAS、RAM map、Route Script、Boss 打法、训练轨迹和语料资料必须绑定明确 ROM 版本。

范围：

- ROM 版本识别优先使用 `MD5 + SHA1 + SHA256`，文件名只作为辅助信息。
- 外部资料适配等级分为 `精确匹配`、`已验证兼容`、`仅参考`。
- 当前主支持 ROM Profile 是 `contra-us-good`。
- 未识别 ROM 不自动运行正式 AI 策略，只允许人类操作、RAM 观察或明确实验模式。
- 建立 `docs/09_ROM_VERSION_MATRIX.md` 保存版本矩阵、适配等级和资料登记规则。

原因：不同区域、版本、改版可能存在 CHR、关卡、敌人行为、RAM 结构或输入同步差异。AI 策略如果混用资料，会出现路线错位、危险识别错误、TAS 输入失效和训练语料污染。

## 2026-06-06：FC 通用平台采用 Game Profile 架构

决策：项目定位为 FC/NES AI Companion 通用平台，魂斗罗只是第一个 Game Profile。

范围：

- 平台核心保持游戏无关：模拟器、ROM 识别、输入路由、帧循环、驾驶舱 UI、通用 telemetry。
- 游戏专属内容进入 Game Profile：ROM Profiles、RAM Schema、State Adapter、Route Script、Danger Detector、Action Lock、FSM、Strategy Pack、Data Labels。
- 未来新游戏必须新建 Game Profile，不得把游戏专属逻辑继续堆进平台核心。
- 建立 `docs/10_GAME_PROFILE_ARCHITECTURE.md` 作为后续迁移和新游戏接入规范。

原因：后续会接入不同 FC 游戏。只有把平台核心和游戏资料分开，才能让魂斗罗策略、其它游戏策略、训练语料和 UI 数据长期可维护。

## 2026-06-06：首批 Game Profile 路线图

决策：先把魂斗罗系列做好，再进入赤色要塞；首批建立八个代表性 Game Profile 方向。

首批八强：

- `contra` / 魂斗罗：当前主线。
- `super-c` / 超级魂斗罗：魂斗罗系列第二 profile。
- `contra-force` / 魂斗罗外传：同品牌不同引擎隔离验证。
- `jackal` / 赤色要塞：第一个非魂斗罗双人俯视射击 profile。
- `battle-city` / 坦克大战：固定防守和空间阻挡。
- `double-dragon-ii` / 双截龙 II：近战、朝向、包围。
- `ninja-gaiden` / 忍者龙剑传：高精度跳跃和 Action Lock。
- `mega-man-2` / 洛克人 2：武器选择和 Boss 策略。

边界：

- 当前不开始赤色要塞代码实现。
- 魂斗罗主 profile 未稳定前，不深度接入第二游戏。
- 改版和中文 hack 不作为主支持版本，除非完成独立 ROM Profile 和验证。

原因：八强不是按知名度排列，而是按平台能力覆盖排列。这样能逐步验证通用平台，而不是把所有代码写成魂斗罗专用。

## 2026-06-07：操作策略标准文档

决策：建立 `docs/16_OPERATION_STRATEGY_STANDARD.md` 作为项目操作策略系统的总标准。

范围：

- 策略分类统一为稳健生存、快速推进、清敌优先、奖励优先、护卫队友、个人策略。
- 策略数据库分层为 Game Profile、ROM Profile、Stage Strategy Plan、Strategy Fragment、Trace Evidence。
- 标准输出产品定义为 Strategy Pack，入口为 `manifest.json`，并包含 `game-profile.json`、`rom-profile.json`、`stage-plan.json`、`fragments.json`、`trace-evidence/` 和验收文档。
- 所有 Strategy Pack 必须强制说明目标 ROM Profile 和哈希；策略包不得包含商业 ROM 文件，用户必须提供自己的 ROM。
- 策略片段以 WorldX、RAM 条件、Action Advice、Safety Override、Exit Conditions 和 Telemetry 为核心。
- 人工轨迹必须拆成正例和反例，不能把多次尝试混合轨迹当成单次完美路线。
- TAS 的定位冻结为路线知识库，不作为实时控制器。
- 单 AI、人类 + AI、双 AI 必须分开验收。
- 采用 JSON Schema Draft 2020-12 作为 Strategy Pack、Trace Evidence 和 Runtime API 的结构校验标准。
- 采用 Semantic Versioning 2.0.0 作为 `schemaVersion`、`packVersion`、`strategyVersion`、`fragmentVersion` 的版本升级语义。
- 采用 SPDX License List 作为策略数据、外部资料和文档授权来源的标识标准。
- 跨程序调用必须先校验 schema、ROM Profile、ROM 哈希、RAM map、坐标体系、按键语义和 Runtime API。
- 未通过 `exact-match` 或 `compatible-tested` 的 ROM，不得自动启用正式 AI。

原因：当前项目已经进入从“会操作”到“会战术”的阶段。如果没有标准，策略会变成散落在代码、聊天和临时 JSON 里的局部补丁。统一标准后，人工打法、TAS 资料、RAM 研究、策略片段、AI 测试和子对话产出都能进入同一套数据库和验收流程。项目目标是让大家统一一套可调用的操作策略数据文件，而不是共享 ROM 文件；只要 schema、ROM Profile、RAM map、坐标体系、按键语义和运行时优先级一致，不同程序就可以调用同一 Strategy Pack。

## 2026-06-07：FC 通用策略协议拆分

决策：将 `docs/16_OPERATION_STRATEGY_STANDARD.md` 定位为 FC 游戏 AI 操作策略标准手册总入口，并将具体内容拆分为通用核心协议和 Contra US 实现手册。

范围：

- `docs/16_OPERATION_STRATEGY_STANDARD.md` 成为标准手册总入口，负责定义标准体系和文档关系。
- `docs/STRATEGY_PROTOCOL_CORE.md` 成为 FC/NES 通用策略协议。
- `references/contra-us/IMPLEMENTATION_GUIDE.md` 记录 Contra US 的 ROM、RAM、WorldX、实体分类、动作映射、第一关路线、失败反例和当前策略经验。
- `references/contra-us/strategy-db/contra-us-stage1-strategy-pack-example.md` 作为 Contra US 第一关 StrategyPack 示例。
- 通用协议引入 `ProgressionMetric`，不再默认所有游戏都是 `WorldX = CameraX + PlayerX`。
- 通用协议引入 `Condition Registry`，StrategyFragment 不得直接引用 RAM 地址。
- 通用协议引入 `Intent-to-Action Mapping`，策略层输出 intent，GameProfile 再映射到具体按键；Runtime 最终仍输出 `finalInput`。
- Runtime API 增加 `contextualState`、`rngState`、`inputSamplingDelay`、`intentCombination` 和 `latencyCompensationFrames`。
- GameProfile 增加 `rngSensitivity` 和 `rngControlStrategy`，用于声明 RNG 对策略复现的影响范围及可否通过等待、暂停或空操作影响随机数。
- 安全仲裁升级为 Safety Code of Conduct：所有 StrategyFragment 执行前必须经过 Safety Override，速度、清敌、奖励和目标节点策略不得绕过立即生存。
- 每个游戏专用 StrategyPack 必须明确包含 manifest、GameProfile、ROMProfile、Condition Registry、EntityTaxonomy、ActionMap、StrategyTypes、StagePlan、Fragments、TraceEvidence、Schemas 和来源登记。
- 项目根目录 `strategy-packs/` 作为正式操作策略源码目录和标准存档目录；每个游戏一个子目录；浏览器 `public/strategies/` 或后续 `public/game-profiles/` 只能作为运行时加载目录或构建产物目录。
- 标准手册必须包含策略分类、策略形成过程、标准输入资料、标准输出文件、Runtime 调用标准、验收等级、数据可信度标准和开发者统一使用流程，确保不同人按同一标准开发出的操作策略可以被统一调用。
- 标准手册不记录某个游戏的当前落地状态、下一阶段执行顺序、未完成项或验收进度；这些内容必须进入对应游戏的 `IMPLEMENTATION_GUIDE.md` 或 StrategyPack 档案。
- `schemas/` 下的 JSON Schema 必须保持跨游戏通用，只约束结构、类型、必填字段、版本和枚举，不得写入具体游戏名称、ROM 哈希、RAM 地址、关卡坐标或策略片段 ID。

原因：原标准混入了大量 Contra US 第一关具体数值和术语，不适合作为 FC 通用平台协议。拆分后，通用核心保持抽象，Contra 经验单独沉淀；未来赤色要塞、忍者龙剑传等新 GameProfile 可以复用协议，而不继承 Contra 的坐标和打法假设。

## 2026-06-07：FC 游戏 AI 操作策略标准 1.0.0 发布

决策：发布 FC 游戏 AI 操作策略标准 1.0.0。

范围：

- `docs/16_OPERATION_STRATEGY_STANDARD.md` 标记为标准手册 1.0.0。
- `docs/STRATEGY_PROTOCOL_CORE.md` 标记为核心协议 1.0.0。
- 当前发布对象是策略标准，不是浏览器应用 1.0.0。
- 当前 StrategyPack 示例仍为 `candidate`，不代表 Contra US 第一关策略已完成验收。

原因：标准手册已经具备统一开发所需的策略分类、形成过程、输入资料、输出文件、Runtime API、安全守则、RNG 规范、Schema 通用性、验收等级、数据可信度和开发流程。可以作为后续所有游戏策略包开发的 1.0 基线。
## 2026-06-07: StrategyPack 1.0 migration becomes the default development path

Decision: all future FC/NES AI strategy development and testing must follow Strategy Protocol 1.0.0.

Scope:
- `strategy-packs/` is the source of truth for reusable strategy data.
- Runtime directories such as `apps/browser-cockpit/public/strategies/` are generated/export targets, not the source of truth.
- A game strategy must bind `GameProfile`, `ROMProfile`, `Condition Registry`, `EntityTaxonomy`, `ActionMap`, `StrategyTypes`, `StagePlan`, `StrategyFragments`, validation notes, known failures, schemas, and source register.
- Strategy fragments must use abstract condition refs and semantic intents. They must not directly store RAM addresses or direct controller buttons.
- Browser runtime can keep legacy route fields only as generated compatibility output while the current cockpit loader still needs them.
- A strategy cannot be marked validated until real trace evidence proves the target mode. `single-ai`, `human-ai`, and `dual-ai` are separate validation targets.
- Any tactical change must update the standard StrategyPack first, then run the sync/export step, then run tests.

Reason: the project goal is a reusable FC game AI operation strategy standard, not a Contra-only route script. Keeping the standard pack as the source of truth prevents context loss, makes subdialogue output mergeable, and lets different developers build compatible strategy files.

## 2026-06-07: Boss wall local threshold patching is frozen

Decision: stop widening Boss wall one-frame avoidance thresholds for `survival-v0` until the strategy has a pre-entry suppression and fixed-target HP-delta loop.

Evidence:
- Low-lane bailout, airborne low-lane bailout, upper swarm bailout, overextended station retreat, and Action Lock override are implemented and covered by tests.
- `npm run check` passes with 83 tests and a production build.
- Real botruns still die at the Boss wall with fixed targets mostly undamaged:
  - `20260607110752-air-bailout`: death at `WorldX 3208`, `x136/y138`.
  - `20260607111229-upper-swarm-bailout`: death at `WorldX 3203`, `x131/y142`.
  - `20260607111526-upper-contact-earlier`: same `WorldX 3203`, `x131/y142` failure class.

Reason: repeated deaths show the root problem is not a missing dodge frame. The AI reaches the Boss wall with default weapon, high-HP turrets/core, and no verified damage loop. A survival strategy must first prevent bad entry and verify fixed-target damage before allowing deeper station movement.

Next design direction:
- Add pre-entry fixed-target suppression before `WorldX 3200`.
- Add target persistence / HP-delta monitoring.
- Add a bounded bailout when HP is not dropping.
- Treat Spread route or another weapon route as a candidate survival requirement, not optional loot, until proven otherwise.

## 2026-06-07: Boss wall input micro-patching must stop

Decision: no more same-position Boss wall input threshold patches for `survival-v0`.

Evidence:
- The local Boss wall module now covers core collision forecast, falling soldier convergence, crowded low-lane HP gate, and Action Lock override.
- `node --test tests/contraBossWall.test.mjs` passes with `56/56` tests.
- Real botruns after those changes still die in the same Boss wall entry class:
  - `20260607-core-forecast-focused`: frame `5649`, `WorldX 3196`, `x124/y162`, input `left+B`.
  - `20260607-falling-convergence-focused`: frame `5649`, `WorldX 3196`, `x124/y162`, input `left+B`.
  - `20260607-hp-gate-focused`: frame `5700`, `WorldX 3208`, `x136/y196`, input `up+B`.
  - `20260607-lowlane-retreat-gate`: frame `5653`, `WorldX 3198`, `x126/y171`, input `left+B`.
- Boss wall core/turrets remain full HP in the failure reports, so the route is entering the danger zone before producing fixed-target damage.

Reason:
The failure is now architectural within the Stage 1 route: fixed-target damage is not a validated precondition for Boss wall entry. More local dodge rules increase complexity without solving the product goal.

Required next direction:
- Implement a Boss wall phase controller in the route/strategy layer.
- Add HP-delta monitoring for fixed targets.
- Add bounded reposition when HP does not drop.
- Treat weapon acquisition as a survival-route dependency until evidence proves default weapon is stable.

## 2026-06-07: Boss wall phase controller proves route-level blocker

Decision: keep the phase-controller code and tests, but stop using further local input patches as the primary path to Stage 1 survival clearance.

Evidence:
- `tests/contraBossWallPhase.test.mjs` now covers phase station entry, HP-delta timer reset, no-damage reposition, same-lane fixed target aim, safety override handoff, and containment clamp.
- `tests/contraBossWall.test.mjs` still passes `56/56`.
- Real botruns after the phase-controller work:
  - `20260607-phase-controller-focused`: phase controller caused `down+right+B` at `WorldX 3159`; fixed HP remained full.
  - `20260607-phase-safety-focused`: safety override avoided that frame but still allowed deep entry; death at `WorldX 3198`; fixed HP remained full.
  - `20260607-phase-containment-focused`: containment prevented deep entry but retreated/fell to low lane; death at `WorldX 3153`; fixed HP remained full.

Reason:
The remaining blocker is not a missing single-frame dodge. The AI does not own a reliable upper-lane pre-entry station and does not produce fixed-target HP damage before entering or escaping the Boss wall. Continuing local Boss wall threshold changes would be a dead loop.

Required next direction:
- Add phase telemetry before more runtime tests.
- Redesign Boss wall route entry around upper-lane station and HP-delta gates.
- Decide whether the survival route requires a weapon pickup before Boss wall.

## 2026-06-07: Boss wall recovery exposes station crowd gate requirement

Decision: continue the phase-controller path, but the next behavior change must be a station crowd gate, not another single-frame contact patch.

Evidence:
- `BossWallPhaseTelemetry` is now recorded in runtime debug and death trace samples.
- `20260607-boss-telemetry-check` confirmed the old low-lane failure had `phase=reposition`, `fixedHpTotal=72`, and `noDamageFrames=157`.
- After adding recovery from over-retreat, `20260607-boss-recovery-check` changed the failure:
  - Death moved to `WorldX 3172`, `x100/y134`.
  - Fixed HP dropped from `72` to `70`.
  - Runtime phase became `enter-station`.
  - The death frame had multiple close infantry in the recovery lane.

Reason:
The phase controller now proves it can recover from over-retreat and can produce fixed-target damage, but it lacks a gate that decides whether the station lane is safe to re-enter. Repeating input changes around `A+B` at the death frame would be another local loop.

Required next direction:
- Add `station-crowd-gate` to the Boss wall phase controller.
- Report close dynamic threats in phase telemetry.
- Station entry must wait, clear, or reposition when the recovery lane is occupied.

## 2026-06-07: Station crowd gate is not enough; stop same-point Boss wall patches

Decision: keep the station crowd gate, Action Lock bypass, phase-before-micro arbitration, and narrow contact jump, but stop adding more local Boss wall thresholds around `WorldX 3176-3183`.

Evidence:
- `20260607-station-crowd-gate-check` proved the gate detected the crowded station but Action Lock still forced `up+right+B`.
- `20260607-crowd-gate-bypass-lock-check` proved Action Lock bypass works, but Boss wall micro still preempted the phase gate.
- `20260607-phase-gate-before-micro-check` proved phase gate ownership works, but the AI died at `WorldX 3183` with `fixedHpTotal=72`.
- `20260607-crowd-contact-jump-check` proved contact jump triggers, but the same station still dies with `fixedHpTotal=72`.
- Focused tests pass: `contraBossWallPhase` `14/14`, `contraBossWall` `56/56`, browser cockpit build passed.

Reason:
The current upper-lane station is invalid for a stable default-weapon survival route. The AI is no longer failing because one input is overwritten; it is failing because it stands in a crowded lane without producing fixed-target HP damage. More local contact thresholds would recreate the same dead-loop pattern.

Required next direction:
- Redesign Boss wall as a route-level fixed-target damage station.
- Gate deeper commitment on actual fixed-target HP delta.
- Re-evaluate mandatory Spread/weapon routing for `survival-v0` before claiming Stage 1 single-AI progress.

## 2026-06-07: Default weapon Boss wall branch is not the next path

Decision: stop default-weapon Boss wall station threshold work and move `survival-v0` priority to mandatory weapon acquisition before Boss wall.

Evidence:
- Adding B-pulse fire changed the real result: `20260607-boss-phase-pulse-fire-check` reduced fixed HP to `69`, proving that long-held B was a real cause of no-damage behavior.
- Adding close lower-crowd down-fire did not clear the branch: `20260607-boss-phase-downfire-check` still died at `WorldX 3183`, fixed HP `71`.
- Expanding the crowd gate to include the station boundary did not clear the branch: `20260607-boss-station-boundary-gate-check` still died at `WorldX 3184`, fixed HP `71`.
- The branch has now repeated after a tactical adjustment, so continuing local Boss wall thresholds would violate the no-dead-loop rule.

Reason:
Default weapon can damage Boss-wall fixed targets, but it is too slow and too exposed for the current survival route. Stable survival should arrive with a stronger weapon, then reuse the HP telemetry and pulse-fire station logic.

Required next direction:
- Promote Spread/weapon pickup from optional reward to survival prerequisite for Stage 1.
- Validate the route reaches Boss wall with non-default weapon before more Boss-wall combat tuning.

## 2026-06-07: Mandatory weapon gate exposes pre-Boss platform rhythm blocker

Decision: keep the mandatory weapon route and stop local jump-threshold tuning at the `WorldX 2839` Boss-approach fall.

Evidence:
- `stageOneMandatorySpreadGatePatch` and the `weapon-gate-survive` runtime segment now route `survival-v0` through the late weapon gate before Boss approach.
- Full verification passed after the platform-jump patch: `npm test` `115/115`, `npm run build` passed.
- `20260607-mandatory-spread-gate-check` reached the Boss approach with non-default weapon `4`, replacing the old default-weapon Boss-wall failure with a new route-control failure.
- `20260607-boss-approach-close-body-check` moved the death from `WorldX 2809` to `WorldX 2839`, proving the close-body lower-soldier patch had an effect.
- `20260607-boss-platform-jump-check` still died at `WorldX 2839`, `x128/y234`. The trace showed the player was already falling from `WorldX 2788/y133`, so the attempted early jump patch was not controlling the real precondition.

Reason:
The blocker is now a route rhythm problem before the Boss approach platform, not a missing one-frame jump input. Continuing to widen or shift the same local jump window would recreate the dead-loop behavior the project explicitly forbids.

Required next direction:
- Rebuild the pre-Boss platform rhythm as an explicit route-state segment before `WorldX 2788`.
- Make that segment own movement/jump timing until the player reaches a stable platform state.
- Only then resume Boss-approach aiming and fixed-target combat tuning.

## 2026-06-07: Stop high-platform Boss-approach jump branch

Decision: stop tuning the high-platform jump/carry branch around `WorldX 2776-2864` and switch to a different Boss-approach route class.

Evidence:
- Added `stage-one-boss-approach-high-edge-jump`, tested against the recorded `WorldX 2778/y132` pre-fall state.
- `20260607-boss-high-edge-jump-check` changed the failure from `WorldX 2839/y234` to `WorldX 2854/y236`, proving the high edge jump affects the route.
- Added `stage-one-boss-approach-high-air-carry`, tested against the recorded `WorldX 2839/y151` state where right movement was previously cancelled.
- `20260607-boss-high-air-carry-check` preserved rightward carry but still died at `WorldX 2854/y236`.
- Full verification stayed green: `npm test` `117/117`, build passed.

Reason:
The remaining blocker is not the absence of a high jump or the loss of right input. The high-platform route itself does not currently produce a safe landing. More local threshold patches in this same arc would violate the no-dead-loop rule.

Required next direction:
- Replace the high-platform arc with another route class, preferably a lower/mid-platform capture route or a recorded human state-action fragment.
- Keep the current code only as evidence-backed route components, not as proof of clearance.
- Do not claim Stage 1 survival progress as complete until a real botrun clears the section without death.

## 2026-06-07: Strategy learning must use trace evidence, not coordinate-patch loops

Decision: switch the operation-strategy learning method from repeated runtime coordinate patches to a trace-evidence pipeline.

Evidence:
- The high-platform Boss-approach branch repeated after two meaningful changes: edge jump and air carry.
- The compact evidence file `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-boss-high-air-carry-failure.json` records `731` samples for `WorldX 2500-2960`.
- The same file proves final death at frame `5194`, `WorldX 2854`, `x128/y236`, with final input `down+right+B`.
- This means the blocker is not simply missing right movement or missing fire; the route class does not produce safe platform capture.
- New focused verification passed:
  - `node --test tests/strategyTraceEvidence.test.mjs`: `2/2`.
  - `node --test tests/strategyPackStandard.test.mjs`: `5/5`.

Reason:
Manual patching around the latest death point creates overlapping local rules and repeats failed route classes. A reusable FC/NES AI strategy standard requires every learned behavior to be backed by frame-level evidence and converted into strategy fragments.

Required next direction:
- Treat trace evidence as required input for strategy learning.
- Store branch failures in `trace-evidence/` before changing route code.
- Replace the failed high-platform route with a new `mid/low-platform-capture` route class before the next real botrun.

## 2026-06-07: Mid-platform local correction is also a failed route class

Decision: stop the `mid-platform-capture` local left/right correction branch after one evidence-backed test.

Evidence:
- `stage-one-boss-approach-mid-platform-capture` was added as a separate route class from the high-edge takeoff.
- Focused tests, full tests, and build passed after implementation.
- Botrun `20260607-mid-platform-capture-check` changed the failure from `WorldX 2854/y236` to `WorldX 2836/y236`.
- The last alive state used `down+left+B`, proving the left correction was applied, but the AI still fell.
- Machine-readable evidence is stored at `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-mid-platform-capture-failure.json`.

Reason:
The branch had measurable effect but did not produce a safe platform capture. Continuing with more local left/right or aim edits in the same fall window would repeat the dead-loop pattern.

Required next direction:
- Collect a frame-level human route for `WorldX 2600-2960`, or design a lower-route state fragment from another evidence source.
- Provide a short-segment recording workflow before asking the owner to demonstrate.
- Do not run another pre-Boss platform botrun until the route source changes.

## 2026-06-07: Lower-platform A-edge trigger is also a failed route class

Decision: stop tuning the `WorldX 2814-2828` lower-platform A-edge route.

Evidence:
- `stage-one-boss-approach-platform-jump` was changed to release A during the pre-landing fall and re-trigger A only near lower-platform contact.
- Focused verification passed: `node --test tests/contraStage1RewardTactics.test.mjs` and `npm run build --workspace @fc-ai/browser-cockpit`.
- Real botrun `lower-platform-edge-trigger-1780817803410` still died at frame `5179`, `WorldX 2839`, `x128/y234`, input `up+right+B`.
- The trace shows A was re-triggered from `WorldX 2814-2828`, but the route still fell through, so this is not a missing A-edge issue.
- Machine-readable evidence: `strategy-packs/contra/stages/stage-1/trace-evidence/2026-06-07-lower-platform-edge-trigger-failure.json`.

Reason:
The branch had a precise hypothesis and a targeted implementation, but it did not change the death class. Another local threshold in the same lower-platform edge window would be the same dead-loop pattern.

Required next direction:
- Use a frame-level human trace for `WorldX 2600-2960`, a different route class, or a verified spawn/table-derived segment.
- Do not run another pre-Boss platform botrun until the route source changes.

## 2026-06-07: Add Contra Japan as a ROMProfile branch, not a new project

Decision: add `contra-j-good` under the existing Contra GameProfile so Japanese Contra TAS data can become a standard training baseline.

Evidence:
- Local ROM library now contains `D:\Ai-Play\ROM\contra-j\Contra (J).nes`.
- The ROM full MD5 is `0e40bc1b049c16c5d7246cc28399cb5d`.
- The ROM headerless MD5 is `d306c54ccfdf5cb4f8ec588f19b3e33d`, matching the known FM2 TAS `romChecksum` base64 value `0wbFTM/fXLT47FiPGbPjPQ==`.
- `strategy-packs/contra/rom-profiles/contra-j-good.json` records the ROMProfile and TAS compatibility.

Reason:
The platform is an FC game AI companion, not a single Contra US project. However, strategy and TAS assets must stay ROM-bound. Adding the Japanese version as a ROMProfile branch lets the UI auto-match TAS data while preventing US strategy fragments from being falsely treated as validated for Japan.

Rule:
- ROM files stay outside the repo and strategy pack.
- TAS is route knowledge and training evidence, not the live controller.
- `contra-j-good` must collect its own trace evidence before any strategy is marked validated.

## 2026-06-08: Side training archive must produce standard TraceEvidence

Decision: side controller training panels must archive captured samples as `fc-ai-strategy-trace-evidence-v1`, while raw trace export remains a separate debugging/export action.

Evidence:
- `createSideTrainingTraceEvidence()` was added as the side-owned bridge from captured frame samples to standard evidence.
- The archive handler now binds evidence to side, selected strategy key, selected baseline id, loaded ROMProfile, and stage id.
- The browser runtime exposes latest 1P/2P archived evidence through hidden JSON outputs for automated validation and future packaging.
- Verification passed:
  - `node --test tests/strategyTraceEvidence.test.mjs`: `3/3`.
  - `node --test tests/trainingPanelLayout.test.mjs`: `12/12`.
  - `npm test`: `186/186`.
  - `npm run build`: passed.

Reason:
Strategy packs, rollback, and sharing need schema-bound evidence. A raw play trace is useful for debugging, but it is not enough to prove which side, baseline, strategy category, ROMProfile, and progression window a candidate fragment belongs to.

Required next direction:
- Use archived side evidence as the input for validation replay and strategy-package save.
- Do not mark a candidate strategy package as validated until its archived evidence and validation report both pass.

## 2026-06-08: Strategy package save requires TraceEvidence plus ValidationReport

Decision: `Save Strategy` must consume archived side `TraceEvidence` and a schema-bound `ValidationReport` before exporting package evidence.

Evidence:
- `apps/browser-cockpit/src/strategyPackageEvidence.ts` defines `fc-ai-strategy-package-evidence-export-v1` and `fc-ai-strategy-validation-report-v1`.
- `createStrategyPackageEvidenceExport()` now rejects missing selected-side evidence, missing validation reports, replay desync, death count above zero, incomplete replay, and ROMProfile mismatch.
- `apps/browser-cockpit/src/main.tsx` stores the latest validation report, invalidates it when evidence/scope/resource/name changes, and exposes it through `strategy-package-validation-report-json`.
- Package export includes `manifest.side-artifacts.patch.json`, selected side TraceEvidence, and selected side validation report paths. ROM files are not included.
- Verification passed:
  - `node --test tests/strategyPackageEvidence.test.mjs`: `6/6`.
  - `node --test tests/trainingPanelLayout.test.mjs`: `15/15`.
  - `node --test tests/standardizedOperationManualDoc.test.mjs`: `3/3`.
  - `npm test`: `202/202`.
  - `npm run build`: passed with the existing Vite chunk-size warning.

Reason:
The strategy pack save path is now a real standardization gate instead of a UI-only download. TAS-derived playback can contribute evidence, but it remains a candidate source and cannot bypass death, desync, ROMProfile, or missing-evidence checks.

Required next direction:
- Build candidate StrategyFragment generation from TAS side-baselines plus archived TraceEvidence.
- Keep every generated fragment `candidate` until real runtime validation produces a passing ValidationReport for its declared mode.
