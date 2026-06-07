export const SUPPORTED_LANGUAGES = ["zh-CN", "en-US"] as const;

export type UiLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: UiLanguage = "zh-CN";

export const uiTranslations = {
  "zh-CN": {
    "language.label": "界面语言",
    "language.zh": "中文",
    "language.en": "English",
    "tas.windowTitle": "TAS 观赏 / 训练基座",
    "tas.fileList": "TAS 文件列表",
    "tas.noMatch": "无匹配 TAS",
    "tas.noMatchDetail": "当前卡带没有匹配的 TAS 原始档。可继续用人工演示和实机 trace 训练策略。",
    "tas.source": "来源",
    "tas.keyMoments": "关键点",
    "tas.risk": "风险",
    "tas.trainingBase": "训练基准",
    "tas.checksum": "校验",
    "tas.progress": "进度",
    "tas.phase": "阶段",
    "tas.currentInput": "当前输入",
    "tas.commentaryMode": "TAS 解说模式",
    "tas.load": "载入",
    "tas.trialReplay": "试播",
    "tas.pause": "暂停",
    "tas.stop": "停止",
    "console.host": "主机",
    "console.hostStatus": "主机状态",
    "console.path": "位置",
    "console.romDirectory": "ROM 目录",
    "console.chooseRomDirectory": "选择 ROM 目录",
    "console.romList": "ROM 目录卡带列表",
    "console.waitingRomDirectory": "等待 ROM 目录",
    "console.selectedRomInfo": "选中 ROM 信息",
    "console.chineseTitle": "中文名",
    "console.localRomInserted": "本地 ROM 已插入",
    "console.waitingCartridge": "等待加载卡带",
    "console.loadCartridgeHint": "先在上方 ROM 目录选择卡带，再按更换卡带。",
    "console.selectRomHint": "请选择 ROM 目录中的卡带。"
  },
  "en-US": {
    "language.label": "UI Language",
    "language.zh": "Chinese",
    "language.en": "English",
    "tas.windowTitle": "TAS Watch / Training Base",
    "tas.fileList": "TAS File List",
    "tas.noMatch": "No matched TAS",
    "tas.noMatchDetail": "No raw TAS file matches the current cartridge. You can keep training from human demos and runtime traces.",
    "tas.source": "Source",
    "tas.keyMoments": "Key Moments",
    "tas.risk": "Risk",
    "tas.trainingBase": "Training Base",
    "tas.checksum": "Checksum",
    "tas.progress": "Progress",
    "tas.phase": "Phase",
    "tas.currentInput": "Current Input",
    "tas.commentaryMode": "TAS Commentary Mode",
    "tas.load": "Load",
    "tas.trialReplay": "Trial Replay",
    "tas.pause": "Pause",
    "tas.stop": "Stop",
    "console.host": "Console",
    "console.hostStatus": "Console Status",
    "console.path": "Path",
    "console.romDirectory": "ROM Directory",
    "console.chooseRomDirectory": "Choose ROM Directory",
    "console.romList": "ROM Cartridge List",
    "console.waitingRomDirectory": "Waiting for ROM Directory",
    "console.selectedRomInfo": "Selected ROM Info",
    "console.chineseTitle": "Chinese Title",
    "console.localRomInserted": "Local ROM Inserted",
    "console.waitingCartridge": "Waiting for Cartridge",
    "console.loadCartridgeHint": "Select a cartridge from the ROM directory above, then load it.",
    "console.selectRomHint": "Select a cartridge from the ROM directory."
  }
} as const;

export type UiTextKey = keyof typeof uiTranslations[UiLanguage];

export function normalizeLanguage(value: unknown): UiLanguage {
  return SUPPORTED_LANGUAGES.includes(value as UiLanguage) ? value as UiLanguage : DEFAULT_LANGUAGE;
}

export function t(language: UiLanguage, key: string) {
  return (uiTranslations[language] as Record<string, string>)[key] ?? key;
}
