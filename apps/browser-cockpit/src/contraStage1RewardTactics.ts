export type StageOneRewardAim = "auto" | "level" | "up" | "down";

export type StageOneRewardTarget = {
  category: string;
  distance: number;
  aim: StageOneRewardAim;
};

export type StageOneRewardHorizon = {
  rewardAhead: StageOneRewardTarget | null;
};

export type StageOneMidWeaponTurretHorizon<T extends StageOneRewardTarget> = {
  fixedAhead: T | null;
  rewardAhead: T | null;
};

export type StageOneMidWeaponTurretSnapshot<T extends StageOneRewardTarget> = {
  horizon: StageOneMidWeaponTurretHorizon<T> | null;
  level: number;
  playerY: number;
  weapon: number;
  worldX: number;
};

export type StageOneMidWeaponTurretTarget<T extends StageOneRewardTarget> = {
  fixedTarget: T;
  kind: "weapon-turret-stall";
  rewardTarget: T;
};

export type StageOneRewardButtonPatch = {
  a?: boolean;
  b?: boolean;
  down?: boolean;
  left?: boolean;
  reason:
    | "reward-station-falling-threat"
    | "mid-weapon-turret-breakout"
    | "stage-one-close-body-threat"
    | "stage-one-red-turret-low-threat"
    | "stage-one-boss-approach-close-body"
    | "stage-one-boss-approach-high-air-carry"
    | "stage-one-boss-approach-high-edge-jump"
    | "stage-one-boss-approach-mid-platform-capture"
    | "stage-one-boss-approach-platform-jump"
    | "stage-one-boss-approach-jump-edge"
    | "stage-one-bridge-low-fixed-crowd"
    | "stage-one-danger-low-lane-fall"
    | "stage-one-left-edge-overhead-body-guard"
    | "stage-one-left-edge-precompression-advance"
    | "stage-one-left-edge-right-jump-guard"
    | "stage-one-mandatory-spread-gate"
    | "stage-one-mid-fixed-close-body-cover"
    | "stage-one-mid-fixed-threat-high-station"
    | "stage-one-mid-fixed-threat-recovery"
    | "stage-one-opening-low-fixed-threat"
    | "stage-one-rear-body-advance"
    | "stage-one-retreat-regression-guard"
    | "stage-one-forward-body-duck-carry"
    | "stage-one-forward-body-level-carry"
    | "stage-one-low-stack-jump-clear"
    | "stage-one-upper-body-jump-edge"
    | "stage-one-spread-exit-jump"
    | "stage-one-spread-jump-edge"
    | "stage-one-spread-turret-suppression"
    | "stage-one-spread-rush";
  right?: boolean;
  up?: boolean;
};

export type StageOneRewardThreat = {
  fixed: boolean;
  hp: number;
  kind: string;
  routine: number;
  threat: boolean;
  type: number;
  x: number;
  y: number;
};

export type StageOneRewardThreatSnapshot<T extends StageOneRewardThreat> = {
  enemies: T[];
  level: number;
  playerX: number;
  playerY: number;
  worldX: number;
};

export type StageOneRuntimeFragmentDraftIntent = {
  intent: string;
  weight?: number;
};

export type StageOneRuntimeFragmentDraft = {
  fragment?: {
    actionAdvice?: {
      intent?: string;
      intentCombination?: StageOneRuntimeFragmentDraftIntent[];
      parameters?: {
        prohibitedRouteClass?: string;
        requiredValidation?: string;
        routeClass?: string;
      };
    };
    failureCounterexamples?: string[];
    id?: string;
    progressionWindow?: {
      end?: number;
      start?: number;
      strictEnd?: boolean;
    };
    safetyOverrides?: string[];
  };
  runtimeUse?: string;
  schema?: string;
  sourceProposal?: {
    tasIsController?: boolean;
  };
  status?: string;
  validation?: {
    status?: string;
  };
};

export type StageOneRuntimeFragmentDraftDecision = {
  actionAdvice: {
    intent: string;
    requiredValidation: string | null;
  };
  draftId: string;
  failureCounterexamples: string[];
  prohibitedRouteClass: string | null;
  routeClass: string;
  runtimeUse: "training-fragment-draft";
  safetyOverrides: string[];
  semanticIntents: string[];
  sourceRouteClass: string | null;
  tasIsController: false;
  validationStatus: string;
};

export type StageOneRedTurretLowThreatSnapshot<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
> = StageOneRewardThreatSnapshot<Threat> & {
  horizon: StageOneMidWeaponTurretHorizon<Target> | null;
};

export type StageOneSpreadRushSnapshot<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
> = StageOneRedTurretLowThreatSnapshot<Target, Threat> & {
  weapon: number;
};

function weaponCode(weapon: number) {
  return weapon & 0x0f;
}

function isSpreadWeapon(weapon: number) {
  return weaponCode(weapon) === 0x03;
}

function isPotentialWeaponReward(enemy: StageOneRewardThreat) {
  return enemy.hp > 0
    && (enemy.type === 0x00 || enemy.type === 0x02 || enemy.type === 0x03 || enemy.type === 0x12);
}

function trainingRouteClassForDraft(fragmentId: string) {
  const fragmentRoute = fragmentId
    .replace(/^draft-fragment-1p-combat-v0-/, "")
    .replace(/^draft-fragment-/, "");
  const stageRoute = fragmentRoute.startsWith("stage-one-") ? fragmentRoute : `stage-one-${fragmentRoute}`;
  return `training-draft:${stageRoute}`;
}

function hasBossApproachHighAirCluster<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>
) {
  const highForwardThreat = snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.hp <= 0) return false;
    if (!enemy.fixed && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 12 && dx <= 132 && dy >= -72 && dy <= -18;
  });
  const closeBodyThreat = snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -12 && dx <= 44 && dy >= 8 && dy <= 58;
  });
  return highForwardThreat && closeBodyThreat;
}

export function createStageOneRuntimeFragmentDraftDecision<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  draft: StageOneRuntimeFragmentDraft,
  options: { activeRouteClass?: string | null } = {}
): StageOneRuntimeFragmentDraftDecision | null {
  if (snapshot.level !== 0) return null;
  if (draft.schema !== "fc-ai-strategy-fragment-draft-v1") return null;
  if (draft.runtimeUse !== "training-fragment-draft") return null;
  if (draft.status !== "candidate-unvalidated") return null;
  if (draft.validation?.status !== "missing") return null;
  if (draft.sourceProposal?.tasIsController !== false) return null;

  const fragment = draft.fragment;
  const actionAdvice = fragment?.actionAdvice;
  const progressionWindow = fragment?.progressionWindow;
  if (!fragment?.id || !actionAdvice || !progressionWindow) return null;
  if (typeof progressionWindow.start !== "number" || typeof progressionWindow.end !== "number") return null;
  if (snapshot.worldX < progressionWindow.start) return null;
  if (progressionWindow.strictEnd ? snapshot.worldX > progressionWindow.end : snapshot.worldX >= progressionWindow.end) {
    return null;
  }

  const prohibitedRouteClass = actionAdvice.parameters?.prohibitedRouteClass ?? null;
  if (prohibitedRouteClass && options.activeRouteClass === prohibitedRouteClass) return null;
  if (!hasBossApproachHighAirCluster(snapshot)) return null;

  return {
    actionAdvice: {
      intent: actionAdvice.intent ?? "advance",
      requiredValidation: actionAdvice.parameters?.requiredValidation ?? null
    },
    draftId: fragment.id,
    failureCounterexamples: [...(fragment.failureCounterexamples ?? [])],
    prohibitedRouteClass,
    routeClass: trainingRouteClassForDraft(fragment.id),
    runtimeUse: "training-fragment-draft",
    safetyOverrides: [...(fragment.safetyOverrides ?? [])],
    semanticIntents: (actionAdvice.intentCombination ?? []).map((entry) => entry.intent),
    sourceRouteClass: actionAdvice.parameters?.routeClass ?? null,
    tasIsController: false,
    validationStatus: draft.validation.status
  };
}

export function midFixedScriptRewardOverride<T extends StageOneRewardTarget>(
  horizon: { rewardAhead: T | null } | null
): T | null {
  const reward = horizon?.rewardAhead ?? null;
  if (!reward || reward.category !== "reward") return null;
  if (reward.distance < -24 || reward.distance > 190) return null;
  return reward;
}

export function findRewardStationFallingThreat<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>
): T | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 1040 || snapshot.worldX > 1210) return null;
  if (snapshot.playerY < 188) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 5 && enemy.kind !== "enemy") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -8 && dx <= 48 && dy >= -112 && dy <= -16;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

export function rewardStationFallingThreatPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  const threat = findRewardStationFallingThreat(snapshot);
  if (!threat) return null;

  return {
    a: grounded,
    b: frame % 5 < 4,
    down: false,
    left: false,
    reason: "reward-station-falling-threat",
    right: threat.x >= snapshot.playerX - 4,
    up: true
  };
}

export function stageOneCloseBodyThreatPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 1040 || snapshot.worldX > 2200) return null;

  const threat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.fixed || enemy.hp <= 0) return false;
      if (isGroundedLowLaneObjectResidue(snapshot, enemy, grounded)) return false;
      if (enemy.type !== 5 && enemy.type !== 1 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -18 && dx <= 36 && dy >= -34 && dy <= 28;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!threat) return null;

  if (!grounded && snapshot.worldX >= 1960 && snapshot.worldX <= 2060 && snapshot.playerY <= 132) {
    const dy = threat.y - snapshot.playerY;
    return {
      a: true,
      b: true,
      down: dy > 10,
      left: false,
      reason: "stage-one-close-body-threat",
      right: true,
      up: dy < -10
    };
  }

  const threatAhead = threat.x >= snapshot.playerX - 2;
  const dy = threat.y - snapshot.playerY;
  return {
    a: grounded,
    b: frame % 5 < 4,
    down: dy > 10,
    left: threatAhead,
    reason: "stage-one-close-body-threat",
    right: grounded ? !threatAhead : !threatAhead,
    up: dy <= 10
  };
}

function isGroundedLowLaneObjectResidue<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  enemy: T,
  grounded: boolean
) {
  if (!grounded || snapshot.playerY < 188) return false;
  if (enemy.fixed || enemy.kind !== "object" || enemy.routine !== 0) return false;
  if (enemy.type !== 1 && enemy.type !== 5) return false;
  const dx = enemy.x - snapshot.playerX;
  const dy = enemy.y - snapshot.playerY;
  return dx >= -48 && dx <= 56 && dy >= -8 && dy <= 32;
}

export function stageOneRedTurretLowThreatPatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneRedTurretLowThreatSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 1760 || snapshot.worldX > 1848) return null;
  if (snapshot.playerY < 148 || snapshot.playerY > 190) return null;

  const fixedTarget = snapshot.horizon?.fixedAhead ?? null;
  if (!fixedTarget || (fixedTarget.category !== "fixed" && fixedTarget.category !== "boss")) return null;
  if (fixedTarget.distance < 0 || fixedTarget.distance > 72) return null;

  const lowThreat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 5 && enemy.kind !== "enemy") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -16 && dx <= 30 && dy >= 10 && dy <= 48;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!lowThreat) return null;

  return {
    a: grounded && frame % 24 < 6,
    b: frame % 5 < 4,
    down: true,
    left: false,
    reason: "stage-one-red-turret-low-threat",
    right: true,
    up: false
  };
}

export function stageOneOpeningLowFixedThreatPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  void frame;
  void grounded;
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 248 || snapshot.worldX > 324) return null;
  if (snapshot.playerY < 96 || snapshot.playerY > 184) return null;

  const lowFixedThreat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || !enemy.fixed) return false;
      if (enemy.type !== 6 && enemy.kind !== "durable") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      const landingThreat = snapshot.playerY <= 148 && dy >= 64 && dy <= 112;
      const contactThreat = snapshot.playerY >= 148 && dy >= 24 && dy <= 58;
      return dx >= 18 && dx <= 70 && (landingThreat || contactThreat);
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!lowFixedThreat) return null;

  return {
    a: false,
    b: false,
    down: false,
    left: false,
    reason: "stage-one-opening-low-fixed-threat",
    right: true,
    up: false
  };
}

export function stageOneBridgeLowFixedCrowdPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  void grounded;
  void frame;
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 614 || snapshot.worldX > 640) return null;
  if (snapshot.playerY < 72 || snapshot.playerY > 148) return null;

  const lowFixedThreat = snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.hp <= 0 || !enemy.fixed) return false;
    if (enemy.type !== 6 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 8 && dx <= 80 && dy >= 48 && dy <= 132;
  });
  if (!lowFixedThreat) return null;

  const crowdThreat = snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -18 && dx <= 74 && dy >= -16 && dy <= 84;
  });
  if (!crowdThreat) return null;

  return {
    a: false,
    b: true,
    down: true,
    left: false,
    reason: "stage-one-bridge-low-fixed-crowd",
    right: true,
    up: false
  };
}

export function stageOneDangerLowLaneFallPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  void grounded;
  void frame;
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 1914 || snapshot.worldX > 1952) return null;
  if (snapshot.playerY < 176 || snapshot.playerY > 240) return null;

  const lowLaneDanger = snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.hp <= 0) return false;
    if (
      enemy.type !== 1
      && enemy.type !== 2
      && enemy.type !== 5
      && enemy.type !== 6
      && enemy.kind !== "enemy"
      && enemy.kind !== "object"
      && enemy.kind !== "durable"
    ) return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -150 && dx <= -8 && dy >= -112 && dy <= 36;
  });
  if (!lowLaneDanger) return null;

  return {
    a: false,
    b: true,
    down: false,
    left: true,
    reason: "stage-one-danger-low-lane-fall",
    right: false,
    up: false
  };
}

export function stageOneSpreadRushPatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneSpreadRushSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 1960 || snapshot.worldX > 2017) return null;
  if (snapshot.weapon !== 0) return null;
  if (snapshot.playerY >= 180) return null;

  const rewardTarget = snapshot.horizon?.rewardAhead ?? null;
  if (!rewardTarget || rewardTarget.category !== "reward") return null;
  if (rewardTarget.distance < 35 || rewardTarget.distance > 86) return null;

  const turretPressure = snapshot.enemies.some((enemy) => (
    enemy.threat
    && enemy.hp > 0
    && (enemy.fixed || enemy.hp > 1 || enemy.kind === "durable")
    && enemy.x >= snapshot.playerX + 18
    && enemy.x <= snapshot.playerX + 96
    && enemy.y >= snapshot.playerY + 8
    && enemy.y <= snapshot.playerY + 72
  ));

  return {
    a: grounded && !turretPressure && frame % 30 < 8,
    b: true,
    down: true,
    left: false,
    reason: "stage-one-spread-rush",
    right: true,
    up: false
  };
}

export function stageOneSpreadExitJumpPatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneSpreadRushSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 2018 || snapshot.worldX > 2140) return null;
  if (snapshot.playerY < 132) return null;

  const rewardTarget = snapshot.horizon?.rewardAhead ?? null;
  if (rewardTarget && rewardTarget.category === "reward" && rewardTarget.distance > 34 && snapshot.playerY < 180) return null;

  return {
    a: true,
    b: frame % 6 < 4,
    down: false,
    left: false,
    reason: "stage-one-spread-exit-jump",
    right: true,
    up: false
  };
}

export function stageOneBossApproachCloseBodyPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 2760 || snapshot.worldX > 2860) return null;
  if (snapshot.playerY < 148 || snapshot.playerY > 210) return null;

  const closeThreat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -12 && dx <= 34 && dy >= -10 && dy <= 42;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!closeThreat) return null;

  const dy = closeThreat.y - snapshot.playerY;
  return {
    a: false,
    b: frame % 6 < 5,
    down: dy >= 6,
    left: false,
    reason: "stage-one-boss-approach-close-body",
    right: false,
    up: dy <= -8
  };
}

export function stageOneBossApproachHighEdgeJumpPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (!grounded) return null;
  if (snapshot.worldX < 2776 || snapshot.worldX > 2786) return null;
  if (snapshot.playerX < 140) return null;
  if (snapshot.playerY < 126 || snapshot.playerY > 144) return null;

  return {
    a: true,
    b: true,
    down: false,
    left: false,
    reason: "stage-one-boss-approach-high-edge-jump",
    right: true,
    up: false
  };
}

export function stageOneBossApproachHighAirCarryPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (grounded) return null;
  if (snapshot.worldX < 2836 || snapshot.worldX > 2864) return null;
  if (snapshot.playerX < 140) return null;
  if (snapshot.playerY < 132 || snapshot.playerY > 230) return null;

  return {
    a: false,
    b: frame % 6 < 5,
    down: snapshot.playerY >= 184,
    left: false,
    reason: "stage-one-boss-approach-high-air-carry",
    right: true,
    up: false
  };
}

export function stageOneBossApproachMidPlatformCapturePatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (grounded) return null;
  if (snapshot.worldX < 2842 || snapshot.worldX > 2852) return null;
  if (snapshot.playerX < 140) return null;
  if (snapshot.playerY < 152 || snapshot.playerY > 226) return null;

  return {
    a: false,
    b: frame % 6 < 5,
    down: snapshot.playerY >= 188,
    left: true,
    reason: "stage-one-boss-approach-mid-platform-capture",
    right: false,
    up: false
  };
}

export function stageOneBossApproachPlatformJumpPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (!grounded) return null;
  if (snapshot.worldX < 2814 || snapshot.worldX > 2828) return null;
  if (snapshot.playerY < 192 || snapshot.playerY > 210) return null;

  return {
    a: true,
    b: frame % 6 < 5,
    down: false,
    left: false,
    reason: "stage-one-boss-approach-platform-jump",
    right: true,
    up: false
  };
}

export function stageOneMandatorySpreadGatePatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneSpreadRushSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (isSpreadWeapon(snapshot.weapon)) return null;
  if (snapshot.worldX < 2048 || snapshot.worldX > 2365) return null;
  if (snapshot.playerY < 96 || snapshot.playerY > 226) return null;

  const visibleReward = snapshot.enemies
    .filter((enemy) => {
      if (!isPotentialWeaponReward(enemy)) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -18 && dx <= 150 && dy >= -150 && dy <= 92;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;

  const rewardTarget = snapshot.horizon?.rewardAhead ?? null;
  const horizonRewardActive = Boolean(
    rewardTarget
    && rewardTarget.category === "reward"
    && rewardTarget.distance >= -72
    && rewardTarget.distance <= 220
  );
  if (!visibleReward && !horizonRewardActive) return null;

  const dy = visibleReward ? visibleReward.y - snapshot.playerY : 0;
  const aimUp = visibleReward ? dy < -20 : rewardTarget?.aim === "up";
  const aimDown = visibleReward ? dy > 16 : rewardTarget?.aim === "down";

  return {
    a: Boolean(grounded && aimUp && frame % 30 < 7),
    b: true,
    down: aimDown,
    left: false,
    reason: "stage-one-mandatory-spread-gate",
    right: true,
    up: aimUp
  };
}

export function stageOneSpreadJumpEdgePatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneSpreadRushSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (!grounded) return null;
  if (snapshot.worldX < 1964 || snapshot.worldX > 1968) return null;
  if (snapshot.playerY < 160 || snapshot.playerY > 172) return null;

  return {
    a: false,
    b: frame % 8 < 4,
    down: false,
    left: false,
    reason: "stage-one-spread-jump-edge",
    right: true,
    up: false
  };
}

export function stageOneBossApproachJumpEdgePatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneSpreadRushSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 2060 || snapshot.worldX > 2065) return null;
  if (snapshot.playerY < 144 || snapshot.playerY > 164) return null;

  return {
    a: false,
    b: frame % 8 < 4,
    down: false,
    left: false,
    reason: "stage-one-boss-approach-jump-edge",
    right: true,
    up: false
  };
}

export function stageOneMidFixedThreatRecoveryPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 2048 || snapshot.worldX > 2100) return null;
  if (snapshot.playerY < 112 || snapshot.playerY > 170) return null;

  const highForwardFixedThreat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.hp <= 0) return false;
      if (!enemy.fixed && enemy.kind !== "durable") return false;
      if (enemy.type !== 7 && enemy.type !== 6 && enemy.type !== 4 && enemy.type !== 2 && enemy.kind !== "durable") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= 64 && dx <= 132 && dy >= -72 && dy <= 12;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (highForwardFixedThreat) {
    return {
      a: false,
      b: frame % 6 < 5,
      down: false,
      left: false,
      reason: "stage-one-mid-fixed-threat-high-station",
      right: false,
      up: true
    };
  }

  const fixedThreat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.hp <= 0) return false;
      if (!enemy.fixed && enemy.kind !== "durable" && enemy.hp <= 1) return false;
      if (enemy.type !== 7 && enemy.type !== 6 && enemy.type !== 4 && enemy.type !== 2 && enemy.kind !== "durable") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -28 && dx <= 72 && dy >= -40 && dy <= 72;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!fixedThreat) return null;

  return {
    a: true,
    b: frame % 6 < 5,
    down: false,
    left: false,
    reason: "stage-one-mid-fixed-threat-recovery",
    right: true,
    up: fixedThreat.y < snapshot.playerY - 18
  };
}

export function stageOneMidFixedCloseBodyCoverPatch<T extends StageOneRewardThreat>(
  snapshot: StageOneRewardThreatSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (!grounded) return null;
  if (snapshot.worldX < 1368 || snapshot.worldX > 1404) return null;
  if (snapshot.playerY < 196) return null;

  const hasFixedPressure = snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.hp <= 0) return false;
    if (!enemy.fixed && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -140 && dx <= 80 && dy >= -132 && dy <= 16;
  });
  if (!hasFixedPressure) return null;

  const closeBodyThreat = snapshot.enemies
    .filter((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= 4 && dx <= 56 && dy >= -36 && dy <= 18;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!closeBodyThreat) return null;

  return {
    a: false,
    b: frame % 6 < 5,
    down: false,
    left: false,
    reason: "stage-one-mid-fixed-close-body-cover",
    right: false,
    up: closeBodyThreat.y < snapshot.playerY - 8
  };
}

export function stageOneSpreadTurretSuppressionPatch<
  Target extends StageOneRewardTarget,
  Threat extends StageOneRewardThreat
>(
  snapshot: StageOneSpreadRushSnapshot<Target, Threat>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 2018 || snapshot.worldX > 2058) return null;

  const closeTurret = snapshot.enemies
    .filter((enemy) => (
      enemy.threat
      && enemy.hp > 0
      && (enemy.fixed || enemy.hp > 1 || enemy.kind === "durable")
      && enemy.x >= snapshot.playerX + 18
      && enemy.x <= snapshot.playerX + 62
      && enemy.y >= snapshot.playerY - 20
      && enemy.y <= snapshot.playerY + 44
    ))
    .sort((a, b) => (a.x - snapshot.playerX) - (b.x - snapshot.playerX))[0] ?? null;
  if (!closeTurret) return null;

  if (!grounded && snapshot.playerY <= 132) {
    return {
      a: true,
      b: true,
      down: closeTurret.y > snapshot.playerY + 18,
      left: false,
      reason: "stage-one-spread-turret-suppression",
      right: true,
      up: closeTurret.y < snapshot.playerY - 18
    };
  }

  return {
    a: false,
    b: true,
    down: closeTurret.y > snapshot.playerY + 20,
    left: true,
    reason: "stage-one-spread-turret-suppression",
    right: false,
    up: closeTurret.y < snapshot.playerY - 18
  };
}

export function findMidWeaponTurretStallTarget<T extends StageOneRewardTarget>(
  snapshot: StageOneMidWeaponTurretSnapshot<T>
): StageOneMidWeaponTurretTarget<T> | null {
  if (snapshot.level !== 0) return null;
  if (snapshot.worldX < 1288 || snapshot.worldX > 1412) return null;
  if (snapshot.playerY < 188) return null;
  if (snapshot.weapon !== 0) return null;

  const rewardTarget = snapshot.horizon?.rewardAhead ?? null;
  const fixedTarget = snapshot.horizon?.fixedAhead ?? null;
  if (!rewardTarget || rewardTarget.category !== "reward") return null;
  if (!fixedTarget || (fixedTarget.category !== "fixed" && fixedTarget.category !== "boss")) return null;
  if (rewardTarget.distance < -36 || rewardTarget.distance > 58) return null;
  if (fixedTarget.distance < 32 || fixedTarget.distance > 150) return null;

  return {
    fixedTarget,
    kind: "weapon-turret-stall",
    rewardTarget
  };
}

export function midWeaponTurretBreakoutPatch<T extends StageOneRewardTarget>(
  snapshot: StageOneMidWeaponTurretSnapshot<T>,
  grounded: boolean,
  frame: number
): StageOneRewardButtonPatch | null {
  const target = findMidWeaponTurretStallTarget(snapshot);
  if (!target) return null;
  const urgentBreakout = target.rewardTarget.distance < 0 || target.fixedTarget.distance <= 72;

  return {
    a: grounded && (urgentBreakout || frame % 36 < 12),
    b: frame % 6 < 4,
    down: false,
    left: false,
    reason: "mid-weapon-turret-breakout",
    right: true,
    up: false
  };
}
