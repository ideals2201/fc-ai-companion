import type { RomMetadata } from "./romMetadata";

export type TasMatchStatus = "exact-match" | "reference-only";

export type TasStrategyBaseline =
  | "survival-v0"
  | "speedrun-v0"
  | "combat-v0"
  | "loot-v0"
  | "guard-v0"
  | "special-reference";

export type TasCommentaryMode =
  | "expert-viewing"
  | "teaching"
  | "companion-emotional"
  | "strategy-analysis"
  | "casual-entertainment";

export type TasMovieEntry = {
  id: string;
  fileName: string;
  title: {
    en: string;
    zh: string;
  };
  category: string;
  players: "1P" | "2P";
  summaryZh: string;
  playbackStartFrame: number;
  sourceNote: string;
  recommendedBaselines: TasStrategyBaseline[];
  commentaryModes: TasCommentaryMode[];
  keyMoments: string[];
  riskNotes: string[];
};

export type TasRegistryEntry = {
  tasProfileId: string;
  gameId: string;
  romProfileId: string;
  label: string;
  status: TasMatchStatus;
  romChecksum: {
    fm2Base64: string;
    headerlessMd5: string;
    fullMd5: string;
    sha1: string;
  };
  categories: string[];
  rawArchivePath: string;
  trainingBasePath: string;
  sourceFiles: string[];
  movies: TasMovieEntry[];
};

const commonCommentaryModes: TasCommentaryMode[] = [
  "expert-viewing",
  "teaching",
  "companion-emotional",
  "strategy-analysis",
  "casual-entertainment"
];

export const tasRegistry: TasRegistryEntry[] = [
  {
    tasProfileId: "contra-j-fm2-archive-2026-06-04",
    gameId: "contra",
    romProfileId: "contra-j-good",
    label: "Contra (J) TAS 基座",
    status: "exact-match",
    romChecksum: {
      fm2Base64: "0wbFTM/fXLT47FiPGbPjPQ==",
      headerlessMd5: "d306c54ccfdf5cb4f8ec588f19b3e33d",
      fullMd5: "0e40bc1b049c16c5d7246cc28399cb5d",
      sha1: "376836361f404c815d404e1d5903d5d11f4eff0e"
    },
    categories: ["1P", "2P", "pacifist", "low%"],
    rawArchivePath: "data/tas/contra/contra-j-good",
    trainingBasePath: "data/training/contra/tas_bases/contra-j-good",
    sourceFiles: [
      "mars608,aiqiyou-contraj-1p.fm2",
      "mars608,aiqiyou5-contra-nes-2players.fm2",
      "mars608,aiqiyou6-contra-pacifist.fm2",
      "mars608_aiqiyou-contraj-nes-2p,lowp.fm2"
    ],
    movies: [
      {
        id: "contra-j-1p-any-percent",
        fileName: "mars608,aiqiyou-contraj-1p.fm2",
        title: {
          en: "Contra Japan 1P any% TAS",
          zh: "魂斗罗日版 1P 任意通关 TAS"
        },
        category: "1P any%",
        players: "1P",
        summaryZh: "单人高速通关基准，适合提取稳健生存、快速推进、Boss 处理和关键跳跃窗口。",
        playbackStartFrame: 450,
        sourceNote: "FM2 原始输入档，作者 Mars608 & aiqiyou；仅绑定 contra-j-good ROMProfile。",
        recommendedBaselines: ["survival-v0", "speedrun-v0", "combat-v0"],
        commentaryModes: commonCommentaryModes,
        keyMoments: [
          "开局菜单输入与起跑节奏",
          "第一关桥段 WorldX 起跳窗口",
          "固定炮台与 Boss 墙处理",
          "死亡风险最低的推进节奏"
        ],
        riskNotes: [
          "TAS 是确定性输入，不等于可直接应对人类合作中的抢屏和延迟。",
          "提取策略片段后必须经过 Safety Override 和实机 trace 验证。"
        ]
      },
      {
        id: "contra-j-2p-any-percent",
        fileName: "mars608,aiqiyou5-contra-nes-2players.fm2",
        title: {
          en: "Contra Japan 2P any% TAS",
          zh: "魂斗罗日版 2P 任意通关 TAS"
        },
        category: "2P any%",
        players: "2P",
        summaryZh: "双人高速通关基准，适合研究 1P/2P 站位、抢屏风险、共同输出和双 AI 配合节奏。",
        playbackStartFrame: 450,
        sourceNote: "FM2 原始输入档，双控制器输入完整；仅绑定 contra-j-good ROMProfile。",
        recommendedBaselines: ["survival-v0", "speedrun-v0", "guard-v0"],
        commentaryModes: commonCommentaryModes,
        keyMoments: [
          "双人开局菜单选择",
          "桥段前后两名角色的纵向错位",
          "固定目标共同输出",
          "同屏推进与等待节奏"
        ],
        riskNotes: [
          "双人 TAS 对帧同步敏感，不能直接作为人类+AI 的唯一控制逻辑。",
          "提取配合策略时要保持队友安全距离和屏幕推进边界。"
        ]
      },
      {
        id: "contra-j-1p-pacifist",
        fileName: "mars608,aiqiyou6-contra-pacifist.fm2",
        title: {
          en: "Contra Japan pacifist TAS",
          zh: "魂斗罗日版少杀/避战 TAS"
        },
        category: "pacifist",
        players: "1P",
        summaryZh: "避战路线基准，适合研究绕开动态威胁、降低无意义交火和构建危险预测窗口。",
        playbackStartFrame: 450,
        sourceNote: "FM2 原始输入档，少杀思路更适合作为威胁规避参考，而非清敌策略基准。",
        recommendedBaselines: ["survival-v0", "special-reference"],
        commentaryModes: commonCommentaryModes,
        keyMoments: [
          "敌人生成后不交火的通过窗口",
          "跳跃和蹲伏避弹的安全边界",
          "不杀敌时的推进优先级"
        ],
        riskNotes: [
          "避战片段不能直接套用到稳健清敌策略。",
          "如果人类玩家要求杀敌或吃奖励，必须切换到 combat/loot 基座。"
        ]
      },
      {
        id: "contra-j-2p-low-percent",
        fileName: "mars608_aiqiyou-contraj-nes-2p,lowp.fm2",
        title: {
          en: "Contra Japan 2P low% TAS",
          zh: "魂斗罗日版 2P 低收集 TAS"
        },
        category: "2P low%",
        players: "2P",
        summaryZh: "双人低收集基准，适合研究不依赖强力武器时的站位、火力分配和保守通关策略。",
        playbackStartFrame: 450,
        sourceNote: "FM2 原始输入档，适合做困难条件参考；仅绑定 contra-j-good ROMProfile。",
        recommendedBaselines: ["survival-v0", "guard-v0", "special-reference"],
        commentaryModes: commonCommentaryModes,
        keyMoments: [
          "低资源条件下的固定目标处理",
          "双人分工和避免互相拖拽屏幕",
          "失去武器收益时的保守推进"
        ],
        riskNotes: [
          "低收集 TAS 不代表最适合普通玩家的陪玩体验。",
          "作为参考片段时要标注 resource-limited 场景。"
        ]
      }
    ]
  }
];

const baselineLabels: Record<TasStrategyBaseline, string> = {
  "survival-v0": "稳健生存",
  "speedrun-v0": "快速推进",
  "combat-v0": "清敌战斗",
  "loot-v0": "奖励收集",
  "guard-v0": "护卫协作",
  "special-reference": "特殊参考"
};

const commentaryLabels: Record<TasCommentaryMode, string> = {
  "expert-viewing": "专家观赏",
  teaching: "教学说明",
  "companion-emotional": "陪伴情绪",
  "strategy-analysis": "策略分析",
  "casual-entertainment": "轻松娱乐"
};

function normalizeHash(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function identifyTasForRom(metadata: RomMetadata | null) {
  if (!metadata) return null;
  const md5 = normalizeHash(metadata.md5);
  const headerlessMd5 = normalizeHash(metadata.headerlessMd5);
  const sha1 = normalizeHash(metadata.sha1);
  return tasRegistry.find((entry) => (
    entry.romProfileId === metadata.romProfileId
    || (!!headerlessMd5 && entry.romChecksum.headerlessMd5 === headerlessMd5)
    || (!!md5 && entry.romChecksum.fullMd5 === md5)
    || (!!sha1 && entry.romChecksum.sha1 === sha1)
  )) ?? null;
}

export function tasStatusLabel(entry: TasRegistryEntry | null) {
  if (!entry) return "无匹配 TAS";
  return entry.status === "exact-match" ? "TAS 已匹配" : "TAS 仅参考";
}

export function tasBaseLabel(entry: TasRegistryEntry | null) {
  if (!entry) return "无匹配基座";
  return `${entry.label} / ${entry.categories.join("/")}`;
}

export function tasMoviesForEntry(entry: TasRegistryEntry | null) {
  return entry?.movies ?? [];
}

export function selectDefaultTasMovie(entry: TasRegistryEntry | null) {
  const movies = tasMoviesForEntry(entry);
  return movies.find((movie) => movie.id === "contra-j-1p-any-percent") ?? movies[0] ?? null;
}

export function recommendationLabel(movie: TasMovieEntry | null) {
  if (!movie) return "无推荐基准";
  return movie.recommendedBaselines.map((baseline) => baselineLabels[baseline]).join(" / ");
}

export function commentaryModeLabel(mode: TasCommentaryMode) {
  return commentaryLabels[mode];
}

export function buildTasCommentary(movie: TasMovieEntry, mode: TasCommentaryMode) {
  const modeLabel = commentaryModeLabel(mode);
  const baselines = recommendationLabel(movie);
  const firstMoment = movie.keyMoments[0] ?? "关键帧窗口";
  const risk = movie.riskNotes[0] ?? "需要实机验证后再入库";
  return `${modeLabel}：${movie.title.zh}。策略分析重点是 ${firstMoment}，优先观察 WorldX 触发、输入节奏和安全覆盖。推荐训练基准：${baselines}。注意：${risk}`;
}
