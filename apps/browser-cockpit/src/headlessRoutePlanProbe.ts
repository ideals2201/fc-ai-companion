import {
  rewardStationFallingThreatPatch,
  stageOneCloseBodyThreatPatch,
  stageOneOpeningLowFixedThreatPatch,
  type StageOneRewardButtonPatch
} from "./contraStage1RewardTactics";
import type { StageRouteSegment } from "./stageOneStrategyPlan";

type HeadlessButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
type HeadlessButtonState = Record<HeadlessButtonName, boolean>;

type RoutePlanProbeEnemy = {
  fixed: boolean;
  hp: number;
  kind: string;
  routine?: number;
  threat: boolean;
  type: number;
  x: number;
  y: number;
};

type RoutePlanProbeSnapshot = {
  enemies: RoutePlanProbeEnemy[];
  jumpState: number;
  level: number;
  playerX: number;
  playerY: number;
  weapon: number;
  worldX: number;
};

function createProbeButtonState(): HeadlessButtonState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
    select: false
  };
}

export type HeadlessRoutePlanProbeOptions = {
  candidateTrial?:
    | "w1205-falling-threat-priority"
    | "w1205-falling-threat-contact-interrupt"
    | "w1205-contact-jump-preload"
    | "w1205-precontact-station-clear"
    | "w1205-force-upright-through"
    | "w1205-duck-under-contact"
    | "w1205-pulsed-right-fire"
    | "w1205-post-retreat-low-lane-recovery"
    | null;
  frame: number;
  progressStallFrames?: number;
  routeSegment: Pick<StageRouteSegment, "id" | "action" | "fire" | "jumpEvery" | "worldStart" | "worldEnd"> | null;
  snapshot: RoutePlanProbeSnapshot | null;
};

function pulseWindow(frame: number, period: number, width: number) {
  return period > 0 && width > 0 && frame % period < width;
}

function isGrounded(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.jumpState === 0;
}

function isIgnoredEnemy(enemy: RoutePlanProbeEnemy) {
  return !enemy.threat || enemy.hp <= 0 || enemy.x <= 4 || enemy.x >= 252 || enemy.y <= 4 || enemy.y >= 236;
}

function isGroundedLowLaneObjectResidue(snapshot: RoutePlanProbeSnapshot, enemy: RoutePlanProbeEnemy) {
  if (!isGrounded(snapshot) || snapshot.playerY < 188) return false;
  if (enemy.fixed || enemy.kind !== "object" || (enemy.routine ?? 0) !== 0) return false;
  if (enemy.type !== 1 && enemy.type !== 5) return false;
  const dx = enemy.x - snapshot.playerX;
  const dy = enemy.y - snapshot.playerY;
  return dx >= -48 && dx <= 56 && dy >= -8 && dy <= 32;
}

function isIgnoredThreatForSnapshot(snapshot: RoutePlanProbeSnapshot, enemy: RoutePlanProbeEnemy) {
  return isIgnoredEnemy(enemy) || isGroundedLowLaneObjectResidue(snapshot, enemy);
}

function isCloseThreat(snapshot: RoutePlanProbeSnapshot, enemy: RoutePlanProbeEnemy) {
  if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
  const dx = enemy.x - snapshot.playerX;
  const dy = enemy.y - snapshot.playerY;
  return dx >= -16 && dx <= 52 && dy >= -36 && dy <= 56;
}

function hasThreatAhead(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 160 && dy >= -92 && dy <= 72;
  });
}

function hasCloseThreat(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.enemies.some((enemy) => isCloseThreat(snapshot, enemy));
}

function hasAirborneLowerEscapeThreat(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy)) return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dy > 14 && dy <= 36 && Math.abs(dx) <= 36;
  });
}

function findDirectBodyOverlapThreat(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.enemies
    .filter((enemy) => {
    if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 14 && dy >= -24 && dy <= 12;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function applyDirectBodyOverlapEscape(buttons: HeadlessButtonState, snapshot: RoutePlanProbeSnapshot, enemy: RoutePlanProbeEnemy) {
  const dx = enemy.x - snapshot.playerX;
  buttons.left = dx >= 0;
  buttons.right = dx < 0;
}

function applyStageOneRewardPatch(buttons: HeadlessButtonState, patch: StageOneRewardButtonPatch) {
  if (typeof patch.up === "boolean") buttons.up = patch.up;
  if (typeof patch.down === "boolean") buttons.down = patch.down;
  if (typeof patch.left === "boolean") buttons.left = patch.left;
  if (typeof patch.right === "boolean") buttons.right = patch.right;
  if (typeof patch.a === "boolean") buttons.a = patch.a;
  if (typeof patch.b === "boolean") buttons.b = patch.b;
}

function stageOneOpeningLowFixedThreatProbePatch(
  snapshot: RoutePlanProbeSnapshot,
  frame: number
) {
  return stageOneOpeningLowFixedThreatPatch({
    ...snapshot,
    enemies: snapshot.enemies.map((enemy) => ({
      ...enemy,
      routine: enemy.routine ?? 0
    }))
  }, isGrounded(snapshot), frame);
}

function rewardStationFallingThreatProbePatch(
  snapshot: RoutePlanProbeSnapshot,
  frame: number
) {
  return rewardStationFallingThreatPatch({
    ...snapshot,
    enemies: snapshot.enemies.map((enemy) => ({
      ...enemy,
      routine: enemy.routine ?? 0
    }))
  }, isGrounded(snapshot), frame);
}

function stageOneCloseBodyThreatProbePatch(
  snapshot: RoutePlanProbeSnapshot,
  frame: number
) {
  return stageOneCloseBodyThreatPatch({
    ...snapshot,
    enemies: snapshot.enemies.map((enemy) => ({
      ...enemy,
      routine: enemy.routine ?? 0
    }))
  }, isGrounded(snapshot), frame);
}

function hasW1205ContactInterruptThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1198 || snapshot.worldX > 1210) return false;
  if (snapshot.playerY < 188) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -6 && dx <= 10 && dy >= -30 && dy <= 4;
  });
}

function findW1205ContactPreloadThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1194 || snapshot.worldX > 1212) return null;
  if (snapshot.playerY < 188) return null;
  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -8 && dx <= 18 && dy >= -30 && dy <= 4;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function findW1205PrecontactThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1188 || snapshot.worldX > 1212) return null;
  if (snapshot.playerY < 188) return null;
  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -8 && dx <= 52 && dy >= -56 && dy <= 8;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function hasW1205PostRetreatLowLaneRecoveryThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1138 || snapshot.worldX > 1162) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -12 && dx <= 24 && dy >= 8 && dy <= 28;
  });
}

function hasEarlyBridgeLowLaneContactWindow(
  routeSegment: HeadlessRoutePlanProbeOptions["routeSegment"],
  snapshot: RoutePlanProbeSnapshot
) {
  if (routeSegment?.id !== "bridge-survive") return false;
  if (snapshot.worldX < 560 || snapshot.worldX > 610) return false;
  if (snapshot.playerY < 184) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -18 && dx <= 36 && dy >= -40 && dy <= -16;
  });
}

function hasEarlyBridgeLowFixedAdvanceWindow(
  routeSegment: HeadlessRoutePlanProbeOptions["routeSegment"],
  snapshot: RoutePlanProbeSnapshot
) {
  if (routeSegment?.id !== "bridge-survive") return false;
  if (snapshot.worldX < 580 || snapshot.worldX > 610) return false;
  if (snapshot.playerY < 196) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 6 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 28 && dx <= 76 && dy >= -36 && dy <= 12;
  });
}

function hasEarlyBridgeLowFixedBodyWindow(
  routeSegment: HeadlessRoutePlanProbeOptions["routeSegment"],
  snapshot: RoutePlanProbeSnapshot
) {
  if (routeSegment?.id !== "bridge-survive") return false;
  if (snapshot.worldX < 612 || snapshot.worldX > 638) return false;
  if (snapshot.playerY < 176 || snapshot.playerY > 212) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 6 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 12 && dx <= 28 && dy >= -8 && dy <= 24;
  });
}

function hasEarlyBridgePassedFixedEscapeWindow(
  routeSegment: HeadlessRoutePlanProbeOptions["routeSegment"],
  snapshot: RoutePlanProbeSnapshot
) {
  if (routeSegment?.id !== "bridge-survive") return false;
  if (snapshot.worldX < 636 || snapshot.worldX > 665) return false;
  if (snapshot.playerY < 136 || snapshot.playerY > 190) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 6 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -18 && dx <= 8 && dy >= 16 && dy <= 64;
  });
}

function aimAtNearestThreat(buttons: HeadlessButtonState, snapshot: RoutePlanProbeSnapshot) {
  const target = snapshot.enemies
    .filter((enemy) => !isIgnoredThreatForSnapshot(snapshot, enemy))
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
  if (!target) return;
  const dy = target.y - snapshot.playerY;
  const dx = target.x - snapshot.playerX;
  if (dy > 14 && Math.abs(dx) <= 36) buttons.down = true;
  if (dy < -28) buttons.up = true;
  if (dy > 30) buttons.down = true;
}

function applyRouteFire(buttons: HeadlessButtonState, routeSegment: HeadlessRoutePlanProbeOptions["routeSegment"], snapshot: RoutePlanProbeSnapshot, frame: number) {
  if (!routeSegment) {
    buttons.b = hasThreatAhead(snapshot) || pulseWindow(frame, 16, 4);
  } else if (routeSegment.fire === "always") {
    buttons.b = true;
  } else if (routeSegment.fire === "pulse") {
    buttons.b = pulseWindow(frame, 10, 4);
  } else {
    buttons.b = hasThreatAhead(snapshot);
  }
  if (buttons.b) aimAtNearestThreat(buttons, snapshot);
}

function applyRouteJump(buttons: HeadlessButtonState, routeSegment: HeadlessRoutePlanProbeOptions["routeSegment"], snapshot: RoutePlanProbeSnapshot, frame: number) {
  if (!isGrounded(snapshot)) return;
  if (hasCloseThreat(snapshot)) {
    buttons.a = true;
    return;
  }
  const jumpEvery = routeSegment?.jumpEvery ?? 0;
  if (jumpEvery > 0 && frame % jumpEvery < 8) buttons.a = true;
}

export function decideHeadlessRoutePlanProbeButtons({
  candidateTrial = null,
  frame,
  progressStallFrames = 0,
  routeSegment,
  snapshot
}: HeadlessRoutePlanProbeOptions) {
  const buttons = createProbeButtonState();
  if (!snapshot) return buttons;

  const action = routeSegment?.action ?? "advance";
  const closeThreat = hasCloseThreat(snapshot);
  const airborneLowerEscapeThreat = hasAirborneLowerEscapeThreat(snapshot);
  const directBodyOverlapThreat = findDirectBodyOverlapThreat(snapshot);
  const controlledAdvanceBias = progressStallFrames >= 900;
  const openingLowFixedThreatPatch = stageOneOpeningLowFixedThreatProbePatch(snapshot, frame);
  if (openingLowFixedThreatPatch) {
    applyStageOneRewardPatch(buttons, openingLowFixedThreatPatch);
    return buttons;
  }
  if (candidateTrial === "w1205-force-upright-through") {
    const precontactThreat = findW1205PrecontactThreat(snapshot);
    if (precontactThreat) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "reward-station-falling-threat",
        right: true,
        up: true
      });
      return buttons;
    }
  }
  if (candidateTrial === "w1205-duck-under-contact") {
    const precontactThreat = findW1205PrecontactThreat(snapshot);
    if (precontactThreat) {
      const dx = precontactThreat.x - snapshot.playerX;
      const dy = precontactThreat.y - snapshot.playerY;
      const shouldDuck = dx <= 16 && dy >= -30;
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: shouldDuck,
        left: false,
        reason: "stage-one-danger-low-lane-fall",
        right: true,
        up: false
      });
      return buttons;
    }
  }
  if (candidateTrial === "w1205-pulsed-right-fire") {
    const precontactThreat = findW1205PrecontactThreat(snapshot);
    if (precontactThreat) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: snapshot.worldX >= 1192 && pulseWindow(frame, 8, 2),
        down: false,
        left: false,
        reason: "reward-station-falling-threat",
        right: true,
        up: false
      });
      return buttons;
    }
  }
  if (
    candidateTrial === "w1205-post-retreat-low-lane-recovery"
    && progressStallFrames >= 900
    && hasW1205PostRetreatLowLaneRecoveryThreat(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-danger-low-lane-fall",
      right: true,
      up: false
    });
    return buttons;
  }
  if (candidateTrial === "w1205-precontact-station-clear") {
    const precontactThreat = findW1205PrecontactThreat(snapshot);
    if (precontactThreat) {
      const dx = precontactThreat.x - snapshot.playerX;
      const dy = precontactThreat.y - snapshot.playerY;
      applyStageOneRewardPatch(buttons, {
        a: dx <= 10,
        b: true,
        down: false,
        left: dx <= 10,
        reason: dx <= 10 ? "stage-one-close-body-threat" : "reward-station-falling-threat",
        right: false,
        up: dy <= 8
      });
      return buttons;
    }
  }
  if (candidateTrial === "w1205-contact-jump-preload") {
    const preloadThreat = findW1205ContactPreloadThreat(snapshot);
    const fallingThreatPatch = rewardStationFallingThreatProbePatch(snapshot, frame);
    if (preloadThreat && fallingThreatPatch) {
      const dx = preloadThreat.x - snapshot.playerX;
      if (dx > 10) {
        applyStageOneRewardPatch(buttons, { ...fallingThreatPatch, a: false });
      } else {
        applyStageOneRewardPatch(buttons, {
          a: true,
          b: true,
          down: false,
          left: true,
          reason: "stage-one-close-body-threat",
          right: false,
          up: true
        });
      }
      return buttons;
    }
    if (fallingThreatPatch) {
      applyStageOneRewardPatch(buttons, fallingThreatPatch);
      return buttons;
    }
  }
  if (candidateTrial === "w1205-falling-threat-contact-interrupt") {
    const fallingThreatPatch = rewardStationFallingThreatProbePatch(snapshot, frame);
    if (fallingThreatPatch) {
      const contactInterruptPatch = hasW1205ContactInterruptThreat(snapshot)
        ? stageOneCloseBodyThreatProbePatch(snapshot, frame)
        : null;
      applyStageOneRewardPatch(buttons, contactInterruptPatch ?? fallingThreatPatch);
      return buttons;
    }
  }
  if (candidateTrial === "w1205-falling-threat-priority") {
    const fallingThreatPatch = rewardStationFallingThreatProbePatch(snapshot, frame);
    if (fallingThreatPatch) {
      applyStageOneRewardPatch(buttons, fallingThreatPatch);
      return buttons;
    }
  }
  const closeBodyThreatPatch = stageOneCloseBodyThreatProbePatch(snapshot, frame);
  if (closeBodyThreatPatch) {
    applyStageOneRewardPatch(buttons, closeBodyThreatPatch);
    return buttons;
  }
  const fallingThreatPatch = rewardStationFallingThreatProbePatch(snapshot, frame);
  if (fallingThreatPatch) {
    applyStageOneRewardPatch(buttons, fallingThreatPatch);
    return buttons;
  }
  if (hasEarlyBridgeLowFixedAdvanceWindow(routeSegment, snapshot)) {
    buttons.right = true;
    buttons.b = true;
    return buttons;
  }
  if (hasEarlyBridgeLowFixedBodyWindow(routeSegment, snapshot)) {
    buttons.down = true;
    buttons.right = true;
    buttons.b = true;
    return buttons;
  }
  if (hasEarlyBridgePassedFixedEscapeWindow(routeSegment, snapshot)) {
    buttons.down = true;
    buttons.right = true;
    buttons.b = true;
    return buttons;
  }
  if (hasEarlyBridgeLowLaneContactWindow(routeSegment, snapshot)) {
    buttons.right = true;
    buttons.b = true;
    return buttons;
  }

  if (action === "hold-fire") {
    buttons.b = true;
    if (snapshot.playerY < 186) buttons.down = true;
    else buttons.up = true;
    return buttons;
  }

  if (action === "survive" || action === "guard") {
    if (directBodyOverlapThreat) {
      applyDirectBodyOverlapEscape(buttons, snapshot, directBodyOverlapThreat);
      applyRouteFire(buttons, routeSegment, snapshot, frame);
      applyRouteJump(buttons, routeSegment, snapshot, frame);
      return buttons;
    }
    buttons.right = controlledAdvanceBias
      || airborneLowerEscapeThreat
      || (!closeThreat && pulseWindow(frame, action === "guard" ? 36 : 48, action === "guard" ? 14 : 24));
    applyRouteFire(buttons, routeSegment, snapshot, frame);
    applyRouteJump(buttons, routeSegment, snapshot, frame);
    return buttons;
  }

  if (action === "cautious") {
    if (directBodyOverlapThreat) {
      applyDirectBodyOverlapEscape(buttons, snapshot, directBodyOverlapThreat);
      applyRouteFire(buttons, routeSegment, snapshot, frame);
      applyRouteJump(buttons, routeSegment, snapshot, frame);
      return buttons;
    }
    buttons.right = controlledAdvanceBias || airborneLowerEscapeThreat || !closeThreat;
    applyRouteFire(buttons, routeSegment, snapshot, frame);
    applyRouteJump(buttons, routeSegment, snapshot, frame);
    return buttons;
  }

  if (action === "loot") {
    buttons.right = true;
    applyRouteFire(buttons, routeSegment, snapshot, frame);
    applyRouteJump(buttons, routeSegment, snapshot, frame);
    return buttons;
  }

  buttons.right = true;
  applyRouteFire(buttons, routeSegment, snapshot, frame);
  applyRouteJump(buttons, routeSegment, snapshot, frame);
  return buttons;
}
