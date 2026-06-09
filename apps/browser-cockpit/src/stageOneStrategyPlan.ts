export type StageOneStrategyKey =
  | "off"
  | "placeholder"
  | "rules-v0"
  | "survival-v0"
  | "speedrun-v0"
  | "combat-v0"
  | "loot-v0"
  | "guard-v0"
  | "personal-v0"
  | "follow-test"
  | "input-mirror";

export type RouteAction = "advance" | "cautious" | "hold-fire" | "loot" | "guard" | "survive";
export type RouteFireMode = "pulse" | "threat" | "always";

export type StageRouteSegment = {
  id: string;
  label: string;
  worldStart: number;
  worldEnd: number;
  action: RouteAction;
  fire: RouteFireMode;
  jumpEvery?: number;
};

export type StageStrategyPlan = {
  game: string;
  gameId: string;
  romProfileId: string;
  compatibilityGroup: string;
  stage: number;
  strategy: StageOneStrategyKey;
  version: number;
  description: string;
  segments: StageRouteSegment[];
};

export type LoadedStrategyPlans = Partial<Record<StageOneStrategyKey, StageStrategyPlan>>;

export type StageOneRouteSnapshot = {
  level: number;
  worldX: number;
};

export const STAGE_ONE_LEVEL_INDEX = 0;
export const STAGE_ONE_BOSS_WALL_WORLD_X = 2960;
export const CONTRA_GAME_ID = "contra";
export const CONTRA_LEGACY_GAME_ID = "contra-us";
export const CONTRA_US_ROM_PROFILE_ID = "contra-us-good";
export const CONTRA_US_COMPATIBILITY_GROUP = "contra-us";

export const stageOneStrategyFiles: Partial<Record<StageOneStrategyKey, string>> = {
  "survival-v0": "/strategies/contra/stage1/stage1-survival.json",
  "speedrun-v0": "/strategies/contra/stage1/stage1-speedrun.json",
  "combat-v0": "/strategies/contra/stage1/stage1-combat.json",
  "loot-v0": "/strategies/contra/stage1/stage1-loot.json",
  "guard-v0": "/strategies/contra/stage1/stage1-guard.json"
};

export const fallbackStageOnePlans: LoadedStrategyPlans = {
  "survival-v0": {
    game: CONTRA_LEGACY_GAME_ID,
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "survival-v0",
    version: 1,
    description: "Fallback stage 1 survival route.",
    segments: [
      { id: "start-survive", label: "start-survive", worldStart: 0, worldEnd: 520, action: "survive", fire: "threat", jumpEvery: 190 },
      { id: "bridge-survive", label: "bridge-survive", worldStart: 520, worldEnd: 930, action: "survive", fire: "threat", jumpEvery: 130 },
      { id: "mid-survive", label: "mid-survive", worldStart: 930, worldEnd: 1550, action: "survive", fire: "always", jumpEvery: 120 },
      { id: "danger-survive", label: "danger-survive", worldStart: 1550, worldEnd: 2048, action: "survive", fire: "always", jumpEvery: 72 },
      { id: "weapon-gate-survive", label: "weapon-gate-survive", worldStart: 2048, worldEnd: 2366, action: "loot", fire: "always", jumpEvery: 0 },
      { id: "boss-approach-survive", label: "boss-approach-survive", worldStart: 2366, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 0 },
      { id: "boss-wall-survive", label: "boss-wall-survive", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 0 }
    ]
  },
  "speedrun-v0": {
    game: CONTRA_LEGACY_GAME_ID,
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "speedrun-v0",
    version: 1,
    description: "Fallback stage 1 speed route.",
    segments: [
      { id: "start-run", label: "start-run", worldStart: 0, worldEnd: 520, action: "advance", fire: "pulse", jumpEvery: 150 },
      { id: "first-bridge", label: "first-bridge", worldStart: 520, worldEnd: 930, action: "advance", fire: "always", jumpEvery: 95 },
      { id: "mid-jungle", label: "mid-jungle", worldStart: 930, worldEnd: 1550, action: "cautious", fire: "always", jumpEvery: 70 },
      { id: "bridge-danger", label: "bridge-danger", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 60 },
      { id: "boss-approach", label: "boss-approach", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-wall", label: "boss-wall", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  },
  "combat-v0": {
    game: CONTRA_LEGACY_GAME_ID,
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "combat-v0",
    version: 1,
    description: "Fallback stage 1 combat route.",
    segments: [
      { id: "start-clear", label: "start-clear", worldStart: 0, worldEnd: 520, action: "advance", fire: "always", jumpEvery: 160 },
      { id: "bridge-clear", label: "bridge-clear", worldStart: 520, worldEnd: 930, action: "cautious", fire: "always", jumpEvery: 130 },
      { id: "mid-clear", label: "mid-clear", worldStart: 930, worldEnd: 1550, action: "cautious", fire: "always", jumpEvery: 140 },
      { id: "danger-clear", label: "danger-clear", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 95 },
      { id: "boss-approach-clear", label: "boss-approach-clear", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-wall-clear", label: "boss-wall-clear", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  },
  "loot-v0": {
    game: CONTRA_LEGACY_GAME_ID,
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "loot-v0",
    version: 1,
    description: "Fallback stage 1 loot route.",
    segments: [
      { id: "start-loot", label: "start-loot", worldStart: 0, worldEnd: 520, action: "loot", fire: "threat", jumpEvery: 150 },
      { id: "bridge-loot", label: "bridge-loot", worldStart: 520, worldEnd: 930, action: "loot", fire: "threat", jumpEvery: 120 },
      { id: "mid-loot", label: "mid-loot", worldStart: 930, worldEnd: 1550, action: "loot", fire: "always", jumpEvery: 80 },
      { id: "danger-loot", label: "danger-loot", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 60 },
      { id: "boss-approach-loot", label: "boss-approach-loot", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-wall-loot", label: "boss-wall-loot", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  },
  "guard-v0": {
    game: CONTRA_LEGACY_GAME_ID,
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "guard-v0",
    version: 1,
    description: "Fallback stage 1 guard route.",
    segments: [
      { id: "start-guard", label: "start-guard", worldStart: 0, worldEnd: 520, action: "guard", fire: "threat", jumpEvery: 170 },
      { id: "bridge-guard", label: "bridge-guard", worldStart: 520, worldEnd: 930, action: "guard", fire: "always", jumpEvery: 140 },
      { id: "mid-guard", label: "mid-guard", worldStart: 930, worldEnd: 1550, action: "guard", fire: "always", jumpEvery: 150 },
      { id: "danger-guard", label: "danger-guard", worldStart: 1550, worldEnd: 2050, action: "cautious", fire: "always", jumpEvery: 80 },
      { id: "boss-approach-guard", label: "boss-approach-guard", worldStart: 2050, worldEnd: STAGE_ONE_BOSS_WALL_WORLD_X, action: "guard", fire: "always", jumpEvery: 80 },
      { id: "boss-wall-guard", label: "boss-wall-guard", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  }
};

export function createDefaultPersonalPlan(): StageStrategyPlan {
  const basePlan = fallbackStageOnePlans["speedrun-v0"];
  return {
    game: CONTRA_LEGACY_GAME_ID,
    gameId: CONTRA_GAME_ID,
    romProfileId: CONTRA_US_ROM_PROFILE_ID,
    compatibilityGroup: CONTRA_US_COMPATIBILITY_GROUP,
    stage: 1,
    strategy: "personal-v0",
    version: 1,
    description: "Personal stage 1 route script.",
    segments: basePlan?.segments.map((segment) => ({ ...segment })) ?? [
      { id: "start-run", label: "start-run", worldStart: 0, worldEnd: 520, action: "advance", fire: "pulse", jumpEvery: 150 },
      { id: "boss-wall", label: "boss-wall", worldStart: STAGE_ONE_BOSS_WALL_WORLD_X, worldEnd: 9999, action: "hold-fire", fire: "always", jumpEvery: 45 }
    ]
  };
}

export const defaultStrategyPlans: LoadedStrategyPlans = {
  ...fallbackStageOnePlans,
  "personal-v0": createDefaultPersonalPlan()
};

export function routeKeyForStrategy(strategyKey: StageOneStrategyKey): StageOneStrategyKey | null {
  if (strategyKey === "rules-v0") return "speedrun-v0";
  if (strategyKey === "follow-test") return "guard-v0";
  if (
    strategyKey === "survival-v0"
    || strategyKey === "speedrun-v0"
    || strategyKey === "combat-v0"
    || strategyKey === "loot-v0"
    || strategyKey === "guard-v0"
    || strategyKey === "personal-v0"
  ) {
    return strategyKey;
  }
  return null;
}

export function planForStrategy(strategyKey: StageOneStrategyKey, plans: LoadedStrategyPlans) {
  const routeKey = routeKeyForStrategy(strategyKey);
  if (!routeKey) return null;
  return plans[routeKey]
    ?? fallbackStageOnePlans[routeKey]
    ?? (routeKey === "personal-v0" ? createDefaultPersonalPlan() : null);
}

export function activeRouteSegmentForPlan(
  snapshot: StageOneRouteSnapshot | null,
  plan: StageStrategyPlan | null
) {
  if (!snapshot || snapshot.level !== STAGE_ONE_LEVEL_INDEX || !plan) return null;
  return plan.segments.find((segment) => (
    snapshot.worldX >= segment.worldStart && snapshot.worldX < segment.worldEnd
  )) ?? plan.segments[plan.segments.length - 1] ?? null;
}
