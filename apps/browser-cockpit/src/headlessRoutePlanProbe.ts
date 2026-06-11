import {
  rewardStationFallingThreatPatch,
  stageOneCloseBodyThreatPatch,
  stageOneOpeningLowFixedThreatPatch,
  type StageOneRewardButtonPatch
} from "./contraStage1RewardTactics";
import { decideBossWallMicroAction, type BossWallEnemy, type BossWallSnapshot } from "./contraStage1BossWall";
import { routeActionOverlayPatch, type RouteActionOverlayInput } from "./routeActionOverlay";
import type { StageRouteSegment } from "./stageOneStrategyPlan";

type HeadlessButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
type HeadlessButtonState = Record<HeadlessButtonName, boolean>;

type RoutePlanProbeEnemy = {
  fixed: boolean;
  hp: number;
  kind: string;
  priority?: number;
  routine?: number;
  threat: boolean;
  type: number;
  x: number;
  y: number;
};

type RoutePlanProbeSnapshot = {
  bulletCount?: number;
  bullets?: unknown[];
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
  candidateOverlay?: RouteActionOverlayInput;
  forceCandidateOverlay?: boolean;
  candidateTrial?:
    | "w1205-falling-threat-priority"
    | "w1205-falling-threat-contact-interrupt"
    | "w1205-contact-jump-preload"
    | "w1205-precontact-station-clear"
    | "w1205-force-upright-through"
    | "w1205-duck-under-contact"
    | "w1205-pulsed-right-fire"
    | "w1205-post-retreat-low-lane-recovery"
    | "w1205-vertical-fixed-station"
    | "w1205-post-upper-recovery"
    | "w1205-post-upper-safe-recovery"
    | "w1360-right-under-station-crowd"
    | "w1440-descent-lower-body-right-carry"
    | "w1454-airborne-fixed-contact-right-carry"
    | "w1454-airborne-fixed-contact-pulse-carry"
    | "w1456-air-route-hold-right"
    | "w1751-precontact-right-fire"
    | "w1755-descent-right-fire-carry"
    | "w1765-reentry-right-fire-carry"
    | "w1765-rear-contact-duck-carry"
    | "w1765-grounded-rear-micro-duck"
    | "w1769-reentry-right-extend"
    | "w2287-weapon-gate-jump-suppress"
    | "w2331-air-preclear-up-fire"
    | "w1686-left-edge-close-body-right-guard"
    | "w1686-left-edge-overhead-duck-guard"
    | "w1686-left-edge-duck-hold-guard"
    | "w1721-airborne-upper-preclear-right-fire"
    | "w1735-danger-stack-right-carry"
    | "w1735-same-lane-right-carry"
    | "w1726-danger-low-side-body"
    | "w1660-retreat-regression-guard"
    | "w1641-left-edge-right-jump"
    | "w1648-left-edge-precompression-advance"
    | "w1658-overhead-guard-preclear"
    | "w1726-grounded-overhead-duck-advance"
    | "w1664-same-lane-preclear-pulse"
    | "w1678-forward-body-duck-carry"
    | "w1678-forward-body-level-carry"
    | "w1678-low-stack-jump-clear"
    | "w1678-upper-body-jump-edge"
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

function hasBossWallImmediateAirBodyOverlap(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.jumpState !== 0
    && snapshot.worldX >= 3183
    && snapshot.worldX <= 3198
    && snapshot.playerX >= 108
    && snapshot.playerX <= 132
    && snapshot.playerY >= 150
    && snapshot.playerY <= 176
    && snapshot.enemies.some((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -8
        && dx <= 8
        && dy >= -8
        && dy <= 8;
    });
}

function hasBossWallImmediateRearAirBodyOverlap(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.jumpState !== 0
    && snapshot.worldX >= 3193
    && snapshot.worldX <= 3198
    && snapshot.playerX >= 108
    && snapshot.playerX <= 132
    && snapshot.playerY >= 150
    && snapshot.playerY <= 176
    && snapshot.enemies.some((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -8
        && dx <= 0
        && dy >= -8
        && dy <= 8;
    });
}

function hasBossWallForwardFallingBodyCorridor(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.jumpState !== 0
    && snapshot.worldX >= 3194
    && snapshot.worldX <= 3200
    && snapshot.playerX >= 122
    && snapshot.playerX <= 128
    && snapshot.playerY >= 176
    && snapshot.playerY <= 194
    && snapshot.enemies.some((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= 0
        && dx <= 6
        && dy >= -42
        && dy <= 4;
    });
}

function hasBossWallRearFallingBodyCorridor(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.jumpState !== 0
    && snapshot.worldX >= 3194
    && snapshot.worldX <= 3200
    && snapshot.playerX >= 122
    && snapshot.playerX <= 128
    && snapshot.playerY >= 176
    && snapshot.playerY <= 194
    && snapshot.enemies.some((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -8
        && dx <= 0
        && dy >= -42
        && dy <= 4;
    });
}

function hasBossWallUpperStationRearBodyOverlap(snapshot: RoutePlanProbeSnapshot) {
  return snapshot.jumpState !== 0
    && snapshot.worldX >= 3204
    && snapshot.worldX <= 3212
    && snapshot.playerX >= 132
    && snapshot.playerX <= 146
    && snapshot.playerY >= 128
    && snapshot.playerY <= 154
    && snapshot.enemies.some((enemy) => {
      if (!enemy.threat || enemy.hp <= 0 || enemy.fixed) return false;
      if ((enemy.routine ?? 0) === 0) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -12
        && dx <= 0
        && dy >= -12
        && dy <= 8;
    });
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

function routePlanProbeEnemyPriority(enemy: RoutePlanProbeEnemy) {
  return enemy.priority ?? (enemy.threat ? Math.max(1, Math.min(9, enemy.hp)) : 0);
}

function asBossWallSnapshot(snapshot: RoutePlanProbeSnapshot): BossWallSnapshot {
  return {
    ...snapshot,
    bossDefeated: 0,
    enemies: snapshot.enemies.map((enemy): BossWallEnemy => ({
      ...enemy,
      priority: routePlanProbeEnemyPriority(enemy),
      routine: enemy.routine ?? 0
    }))
  };
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

function hasW1205VerticalFixedStation(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1196 || snapshot.worldX > 1212) return false;
  if (snapshot.playerY < 196) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 18 && dy >= -104 && dy <= -64;
  });
}

function hasW1205PostUpperRecoveryStation(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1144 || snapshot.worldX > 1168) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 48 && dx <= 78 && dy >= -104 && dy <= -64;
  });
}

function hasW1205PostUpperSameLaneBodyThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1144 || snapshot.worldX > 1168) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 24 && dy >= -16 && dy <= 18;
  });
}

function hasW1360RightUnderStationCrowd(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1356 || snapshot.worldX > 1370) return false;
  if (snapshot.playerY < 204) return false;

  const hasOverheadFixedTarget = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 24 && dy >= -112 && dy <= -72;
  });
  if (!hasOverheadFixedTarget) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 5 && enemy.type !== 1 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -4 && dx <= 12 && dy >= -42 && dy <= -20;
  });
}

function hasW1440DescentLowerBodyRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1436 || snapshot.worldX > 1444) return false;
  if (snapshot.playerY < 160 || snapshot.playerY > 184) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 5 && enemy.type !== 1 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 0 && dx <= 14 && dy >= 16 && dy <= 32;
  });
}

function hasW1454AirborneFixedContactRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1448 || snapshot.worldX > 1456) return false;
  if (snapshot.playerY < 132 || snapshot.playerY > 150) return false;

  const hasForwardFixedContact = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 8 && dx <= 24 && dy >= -20 && dy <= 0;
  });
  if (!hasForwardFixedContact) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 5 && enemy.type !== 1 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 4 && dx <= 24 && dy >= 40 && dy <= 72;
  });
}

function findW1456AirRouteFormationThreat(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1444 || snapshot.worldX > 1464) return null;
  if (snapshot.playerY < 140 || snapshot.playerY > 188) return null;

  const hasForwardFixedTarget = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 28 && dy >= -90 && dy <= -10;
  });
  if (!hasForwardFixedTarget) return null;

  return snapshot.enemies.find((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 5 && enemy.type !== 1 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 10 && dx <= 34 && dy >= -45 && dy <= 34;
  }) ?? null;
}

function hasW1465GroundedStallRightUpFire(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.weapon !== 0) return false;
  if (snapshot.worldX < 1450 || snapshot.worldX > 1488) return false;
  if (snapshot.playerX < 118 || snapshot.playerX > 136) return false;
  if (snapshot.playerY < 188 || snapshot.playerY > 204) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -24 && dx <= -8 && dy >= 24 && dy <= 44;
  });
}

function hasW1726DangerLowSideBodyThreat(snapshot: RoutePlanProbeSnapshot) {
  if (snapshot.worldX < 1720 || snapshot.worldX > 1740) return false;
  if (snapshot.playerY < 140 || snapshot.playerY > 188) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -6 && dx <= 12 && dy >= 16 && dy <= 52;
  });
}

function hasW1735SameLaneContactRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1736 || snapshot.worldX > 1752) return false;
  if (snapshot.playerY < 150 || snapshot.playerY > 180) return false;

  const hasFixedTargetAhead = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 8 && dx <= 30 && dy >= -60 && dy <= -20;
  });
  if (!hasFixedTargetAhead) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -4 && dx <= 6 && dy >= 8 && dy <= 18;
  });
}

function findW1751PrecontactForwardBody(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1748 || snapshot.worldX > 1754) return null;
  if (snapshot.playerY < 146 || snapshot.playerY > 158) return null;

  const hasFixedTargetAhead = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 4 && dx <= 28 && dy >= -60 && dy <= -10;
  });
  if (!hasFixedTargetAhead) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= 28 && dx <= 44 && dy >= 0 && dy <= 18;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function findW1755DescentRightFireBody(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1740 || snapshot.worldX > 1756) return null;
  if (snapshot.playerY < 138 || snapshot.playerY > 176) return null;

  const hasFixedTargetAhead = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 4 && dx <= 32 && dy >= -64 && dy <= -8;
  });
  if (!hasFixedTargetAhead) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -2 && dx <= 34 && dy >= 8 && dy <= 32;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function findW1765ReentryForwardBody(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1751 || snapshot.worldX > 1768) return null;
  if (snapshot.playerY < 140 || snapshot.playerY > 173) return null;

  const hasFixedTargetAhead = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 20 && dx <= 52 && dy >= -80 && dy <= -8;
  });
  if (!hasFixedTargetAhead) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= 24 && dx <= 42 && dy >= -18 && dy <= 12;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function findW1769ReentryRightCarryBody(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1768 || snapshot.worldX > 1770) return null;
  if (snapshot.playerY < 142 || snapshot.playerY > 170) return null;

  const hasFixedTargetAhead = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.type !== 4 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 20 && dx <= 58 && dy >= -84 && dy <= -8;
  });
  if (!hasFixedTargetAhead) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= 18 && dx <= 44 && dy >= -20 && dy <= 20;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function hasW1686LeftEdgeCloseBodyRightGuard(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1684 || snapshot.worldX > 1720) return false;
  if (snapshot.playerX > 60 || snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
    if (enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 6 && dx <= 42 && dy >= -38 && dy <= 6;
  });
}

function hasW1686LeftEdgeOverheadDuckGuard(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1686 || snapshot.worldX > 1710) return false;
  if (snapshot.playerX > 52 || snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
    if (enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 5 && enemy.kind !== "enemy") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 8 && dx <= 44 && dy >= -30 && dy <= -12;
  });
}

function hasW1686LeftEdgeDuckHoldGuard(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1686 || snapshot.worldX > 1708) return false;
  if (snapshot.playerX > 52 || snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
    if (enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 5 && enemy.kind !== "enemy") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 8 && dx <= 30 && dy >= -12 && dy <= 8;
  });
}

function hasW1721AirborneUpperPreclearThreat(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1686 || snapshot.worldX > 1724) return false;
  if (snapshot.playerX < 24 || snapshot.playerX > 72) return false;
  if (snapshot.playerY < 136 || snapshot.playerY > 174) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredThreatForSnapshot(snapshot, enemy)) return false;
    if (enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 5 && enemy.kind !== "enemy") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 0 && dx <= 16 && dy >= -34 && dy <= -4;
  });
}

function findW1765RearSameLaneContact(snapshot: RoutePlanProbeSnapshot) {
  if (snapshot.worldX < 1758 || snapshot.worldX > 1768) return null;
  if (snapshot.playerY < 170 || snapshot.playerY > 204) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -20 && dx <= -4 && dy >= -14 && dy <= 20;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function findW1765GroundedRearSameLaneContact(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1762 || snapshot.worldX > 1768) return null;
  if (snapshot.playerY < 190 || snapshot.playerY > 204) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -12 && dx <= -4 && dy >= -4 && dy <= 8;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function findW1769LowerLaneRightClearContact(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1686 || snapshot.worldX > 1820) return null;
  if (snapshot.playerY < 190 || snapshot.playerY > 216) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -12 && dx <= 34 && dy >= -44 && dy <= 24;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function hasW241AirCloseType5NeutralFire(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 232 || snapshot.worldX > 246) return false;
  if (snapshot.playerX < 74 || snapshot.playerX > 90) return false;
  if (snapshot.playerY < 78 || snapshot.playerY > 94) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed || !enemy.threat || enemy.hp <= 0) return false;
    if (enemy.type !== 5 && enemy.kind !== "enemy") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 5 && dx <= 16 && dy >= 10 && dy <= 24;
  });
}

function hasW1787LowerLaneSpawnPreclearCue(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1784 || snapshot.worldX > 1804) return false;
  if (snapshot.playerY < 190 || snapshot.playerY > 204) return false;

  return snapshot.enemies.some((enemy) => {
    if (!enemy.threat || enemy.fixed) return false;
    if (enemy.kind !== "object" || enemy.type !== 5 || enemy.hp !== 0) return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 0 && dx <= 12 && dy >= -36 && dy <= -24;
  });
}

function hasW1812UpperAirFixedRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1790 || snapshot.worldX > 1924) return false;
  if (snapshot.playerY < 132 || snapshot.playerY > 204) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 0 && dx <= 44 && dy >= -76 && dy <= 8;
  });
}

function findW1835AirSameLaneRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return null;
  if (snapshot.worldX < 1830 || snapshot.worldX > 1845) return null;
  if (snapshot.playerY < 148 || snapshot.playerY > 184) return null;

  return snapshot.enemies
    .filter((enemy) => {
      if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
      if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -4 && dx <= 12 && dy >= -28 && dy <= 8;
    })
    .sort((a, b) => {
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      return distanceA - distanceB;
    })[0] ?? null;
}

function hasW1914LowLaneFallBrake(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1914 || snapshot.worldX > 1952) return false;
  return snapshot.playerY >= 196 && snapshot.playerY <= 240;
}

function hasW1986PitAirRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1986 || snapshot.worldX > 2020) return false;
  return snapshot.playerY >= 100 && snapshot.playerY <= 236;
}

function hasW1730UpperAirRightFireCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1730 || snapshot.worldX > 1775) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 70 && snapshot.playerY <= 130;
}

function hasW1930PitEntryAirRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1920 || snapshot.worldX > 1985) return false;
  return snapshot.playerY >= 112 && snapshot.playerY <= 192;
}

function hasW1940PitEntryEarlyGroundCarry(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1940 || snapshot.worldX > 1958) return false;
  return snapshot.playerY >= 148 && snapshot.playerY <= 188;
}

function hasW1959PitEntryDelayedJump(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1959 || snapshot.worldX > 1972) return false;
  return snapshot.playerY >= 148 && snapshot.playerY <= 188;
}

function hasW2018PitExitPlatformRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2018 || snapshot.worldX > 2025) return false;
  return snapshot.playerY >= 148 && snapshot.playerY <= 188;
}

function hasW2026PitExitPlatformJump(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2026 || snapshot.worldX > 2040) return false;
  return snapshot.playerY >= 148 && snapshot.playerY <= 188;
}

function hasW2068GroundedPlatformJump(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2068 || snapshot.worldX > 2092) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 100 && snapshot.playerY <= 160;
}

function hasW2148WeaponGateAirCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2148 || snapshot.worldX > 2172) return false;
  return snapshot.playerY >= 12 && snapshot.playerY <= 236;
}

function hasW2468BossApproachMidPlatformEdgeJump(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2438 || snapshot.worldX > 2700) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 148 && snapshot.playerY <= 232;
}

function hasW2812BossApproachLateEdgeJump(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2812 || snapshot.worldX > 2842) return false;
  if (snapshot.playerX < 120 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 190 && snapshot.playerY <= 236;
}

function hasW2763BossApproachGroundRun(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2763 || snapshot.worldX > 2782) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 126 && snapshot.playerY <= 180;
}

function hasW2738BossApproachAirRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2738 || snapshot.worldX > 2768) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 72 && snapshot.playerY <= 150;
}

function hasW2782BossApproachHeldJump(snapshot: RoutePlanProbeSnapshot) {
  if (snapshot.worldX < 2782 || snapshot.worldX > 2812) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 70 && snapshot.playerY <= 230;
}

function hasW2813BossApproachAirRightCarry(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2813 || snapshot.worldX > 2880) return false;
  if (snapshot.playerX < 116 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 70 && snapshot.playerY <= 236;
}

function hasW2896BossApproachEntryJump(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2896 || snapshot.worldX > 2964) return false;
  if (snapshot.playerX < 118 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 140 && snapshot.playerY <= 236;
}

function hasW3145BossEntryDuckFire(snapshot: RoutePlanProbeSnapshot) {
  if (snapshot.worldX < 3145 || snapshot.worldX > 3185) return false;
  if (snapshot.playerX < 112 || snapshot.playerX > 136) return false;
  return snapshot.playerY >= 96 && snapshot.playerY <= 150;
}

function hasW2287WeaponGateJumpSuppress(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2280 || snapshot.worldX > 2300) return false;
  if (snapshot.playerY < 80 || snapshot.playerY > 112) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 2 && enemy.kind !== "durable") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 4 && dx <= 16 && dy >= 20 && dy <= 56;
  });
}

function hasW2331WeaponGateAirPreclear(snapshot: RoutePlanProbeSnapshot) {
  if (isGrounded(snapshot)) return false;
  if (snapshot.worldX < 2331 || snapshot.worldX > 2342) return false;
  if (snapshot.playerY < 52 || snapshot.playerY > 86) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed || enemy.hp <= 0) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 2 && dx <= 24 && dy >= 8 && dy <= 56;
  });
}

function hasW1726GroundedOverheadDuckAdvance(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1720 || snapshot.worldX > 1732) return false;
  if (snapshot.playerY < 204) return false;

  const hasOverheadContact = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -10 && dx <= 8 && dy >= -30 && dy <= -8;
  });
  if (!hasOverheadContact) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -20 && dx <= -6 && dy >= -4 && dy <= 16;
  });
}

function hasW1660RetreatRegressionBodyThreat(snapshot: RoutePlanProbeSnapshot) {
  if (snapshot.worldX < 1658 || snapshot.worldX > 1672) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -24 && dx <= 0 && dy >= -28 && dy <= 0;
  });
}

function hasW1660LeftEdgeOverheadBodyThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1638 || snapshot.worldX > 1650) return false;
  if (snapshot.playerX > 32 || snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 0 && dx <= 16 && dy >= -40 && dy <= -12;
  });
}

function hasW1641LeftEdgeRightJumpThreat(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1638 || snapshot.worldX > 1650) return false;
  if (snapshot.playerX > 34 || snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 0 && dx <= 16 && dy >= -44 && dy <= -12;
  });
}

function hasW1648LeftEdgePrecompressionAdvance(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1646 || snapshot.worldX > 1652) return false;
  if (snapshot.playerX < 30 || snapshot.playerX > 36 || snapshot.playerY < 204) return false;

  const hasFixedPin = snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || !enemy.fixed) return false;
    if (enemy.hp <= 0) return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -8 && dx <= 8 && dy >= -96 && dy <= -64;
  });
  if (!hasFixedPin) return false;

  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    const overheadCompression = dx >= -4 && dx <= 12 && dy >= -56 && dy <= -16;
    const lowLanePin = dx >= 8 && dx <= 28 && dy >= 8 && dy <= 26;
    return overheadCompression || lowLanePin;
  });
}

function hasW1664SameLanePreclearPulse(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1662 || snapshot.worldX > 1678) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= 6 && dx <= 22 && dy >= -4 && dy <= 10;
  });
}

function hasW1658OverheadBodyGuardPreclear(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1656 || snapshot.worldX > 1662) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -16 && dx <= -4 && dy >= -28 && dy <= -8;
  });
}

function hasW1678RearLowBodyAdvance(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1688 || snapshot.worldX > 1704) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    return dx >= -24 && dx <= -5 && dy >= -2 && dy <= 12;
  });
}

function hasW1678ForwardUpperBodyDuckCarry(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1676 || snapshot.worldX > 1692) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    const overheadCompression = dx >= -4 && dx <= 12 && dy >= -44 && dy <= -20;
    const sameLaneContact = dx >= 10 && dx <= 22 && dy >= -8 && dy <= 8;
    return overheadCompression || sameLaneContact;
  });
}

function hasW1678UpperBodyJumpEdge(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1676 || snapshot.worldX > 1686) return false;
  if (snapshot.playerY < 204) return false;
  return snapshot.enemies.some((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    const upperBody = dx >= 0 && dx <= 14 && dy >= -34 && dy <= -18;
    const sameLaneClose = dx >= 10 && dx <= 22 && dy >= -8 && dy <= 8;
    return upperBody || sameLaneClose;
  });
}

function hasW1678LowStackJumpClear(snapshot: RoutePlanProbeSnapshot) {
  if (!isGrounded(snapshot)) return false;
  if (snapshot.worldX < 1680 || snapshot.worldX > 1700) return false;
  if (snapshot.playerY < 204) return false;
  const activeBodies = snapshot.enemies.filter((enemy) => {
    if (isIgnoredEnemy(enemy) || enemy.fixed) return false;
    if (enemy.type !== 1 && enemy.type !== 5 && enemy.kind !== "enemy" && enemy.kind !== "object") return false;
    const dx = enemy.x - snapshot.playerX;
    const dy = enemy.y - snapshot.playerY;
    const sameLaneContact = dx >= 4 && dx <= 24 && dy >= -10 && dy <= 12;
    const lowLanePile = dx >= 12 && dx <= 28 && dy >= 12 && dy <= 28;
    return sameLaneContact || lowLanePile;
  });
  return activeBodies.length >= 2 || activeBodies.some((enemy) => {
    const dx = enemy.x - snapshot.playerX;
    return dx >= 4 && dx <= 12;
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
  candidateOverlay = null,
  candidateTrial = null,
  forceCandidateOverlay = false,
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
  const shouldUsePromotedDefaultRoute = !candidateTrial
    || Boolean(candidateOverlay)
    || candidateTrial === "w2287-weapon-gate-jump-suppress"
    || candidateTrial === "w2331-air-preclear-up-fire";
  const overlayPatch = routeActionOverlayPatch(snapshot, candidateOverlay, frame);
  const openingLowFixedThreatPatch = stageOneOpeningLowFixedThreatProbePatch(snapshot, frame);
  if (openingLowFixedThreatPatch) {
    applyStageOneRewardPatch(buttons, openingLowFixedThreatPatch);
    return buttons;
  }
  if (forceCandidateOverlay && overlayPatch) {
    applyStageOneRewardPatch(buttons, overlayPatch);
    return buttons;
  }
  if (hasBossWallImmediateRearAirBodyOverlap(snapshot)) {
    return {
      ...buttons,
      b: true,
      up: true,
      right: true
    };
  }
  if (hasBossWallImmediateAirBodyOverlap(snapshot)) {
    return {
      ...buttons,
      b: true,
      up: true,
      left: true
    };
  }
  if (hasBossWallForwardFallingBodyCorridor(snapshot)) {
    return {
      ...buttons,
      b: true,
      up: true,
      right: true
    };
  }
  if (hasBossWallRearFallingBodyCorridor(snapshot)) {
    return {
      ...buttons,
      b: true,
      up: true,
      right: true
    };
  }
  if (hasBossWallUpperStationRearBodyOverlap(snapshot)) {
    return {
      ...buttons,
      b: true,
      up: true,
      right: true
    };
  }
  if (hasW3145BossEntryDuckFire(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-boss-entry-duck-fire",
      right: false,
      up: false
    });
    return buttons;
  }
  const bossWallMicroAction = decideBossWallMicroAction(asBossWallSnapshot(snapshot), frame);
  if (bossWallMicroAction) return bossWallMicroAction.buttons;
  if (overlayPatch) {
    applyStageOneRewardPatch(buttons, overlayPatch);
    return buttons;
  }
  if (hasW241AirCloseType5NeutralFire(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-w241-air-close-type5-neutral-fire",
      right: false,
      up: false
    });
    return buttons;
  }
  if (candidateTrial === "w2331-air-preclear-up-fire" && hasW2331WeaponGateAirPreclear(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-weapon-gate-air-preclear",
      right: true,
      up: true
    });
    return buttons;
  }
  if (candidateTrial === "w2287-weapon-gate-jump-suppress" && hasW2287WeaponGateJumpSuppress(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-weapon-gate-jump-suppress",
      right: true,
      up: false
    });
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
  if (candidateTrial === "w1205-vertical-fixed-station" && hasW1205VerticalFixedStation(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-mid-fixed-threat-high-station",
      right: false,
      up: true
    });
    return buttons;
  }
  if (candidateTrial === "w1205-post-upper-recovery" && hasW1205PostUpperRecoveryStation(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-mid-fixed-threat-recovery",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1205-post-upper-safe-recovery"
      || candidateTrial === "w1360-right-under-station-crowd"
      || candidateTrial === "w1726-danger-low-side-body"
      || candidateTrial === "w1660-retreat-regression-guard"
      || candidateTrial === "w1641-left-edge-right-jump"
      || candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1205PostUpperRecoveryStation(snapshot)
    && !hasW1205PostUpperSameLaneBodyThreat(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-mid-fixed-threat-recovery",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1360-right-under-station-crowd"
      || candidateTrial === "w1726-danger-low-side-body"
      || candidateTrial === "w1660-retreat-regression-guard"
      || candidateTrial === "w1641-left-edge-right-jump"
      || candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1360RightUnderStationCrowd(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-mid-fixed-threat-recovery",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    candidateTrial === "w1456-air-route-hold-right"
    || candidateTrial === "w1751-precontact-right-fire"
    || candidateTrial === "w1755-descent-right-fire-carry"
    || candidateTrial === "w1765-reentry-right-fire-carry"
    || candidateTrial === "w1765-rear-contact-duck-carry"
    || candidateTrial === "w1765-grounded-rear-micro-duck"
    || candidateTrial === "w1769-reentry-right-extend"
    || candidateTrial === "w1686-left-edge-close-body-right-guard"
    || candidateTrial === "w1686-left-edge-overhead-duck-guard"
    || candidateTrial === "w1686-left-edge-duck-hold-guard"
    || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
    || candidateTrial === "w1735-danger-stack-right-carry"
    || candidateTrial === "w1735-same-lane-right-carry"
  ) {
    const routeFormationThreat = findW1456AirRouteFormationThreat(snapshot);
    if (routeFormationThreat) {
      const dy = routeFormationThreat.y - snapshot.playerY;
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: dy >= 12,
        left: false,
        reason: "stage-one-air-route-hold-right",
        right: true,
        up: dy <= -12
      });
      return buttons;
    }
  }
  if (
    candidateTrial === "w1454-airborne-fixed-contact-pulse-carry"
    && hasW1454AirborneFixedContactRightCarry(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: !pulseWindow(frame, 6, 2),
      down: true,
      left: false,
      reason: "stage-one-airborne-fixed-contact-pulse-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1456-air-route-hold-right"
      || candidateTrial === "w1751-precontact-right-fire"
      || candidateTrial === "w1755-descent-right-fire-carry"
      || candidateTrial === "w1765-reentry-right-fire-carry"
      || candidateTrial === "w1765-rear-contact-duck-carry"
      || candidateTrial === "w1765-grounded-rear-micro-duck"
      || candidateTrial === "w1769-reentry-right-extend"
      || candidateTrial === "w1686-left-edge-close-body-right-guard"
      || candidateTrial === "w1686-left-edge-overhead-duck-guard"
      || candidateTrial === "w1686-left-edge-duck-hold-guard"
      || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
      || candidateTrial === "w1735-danger-stack-right-carry"
      || candidateTrial === "w1735-same-lane-right-carry"
      || candidateTrial === "w1454-airborne-fixed-contact-right-carry"
      || candidateTrial === "w1440-descent-lower-body-right-carry"
      || candidateTrial === "w1726-danger-low-side-body"
      || candidateTrial === "w1660-retreat-regression-guard"
      || candidateTrial === "w1641-left-edge-right-jump"
      || candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1454AirborneFixedContactRightCarry(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-airborne-fixed-contact-right-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1456-air-route-hold-right"
      || candidateTrial === "w1751-precontact-right-fire"
      || candidateTrial === "w1755-descent-right-fire-carry"
      || candidateTrial === "w1765-reentry-right-fire-carry"
      || candidateTrial === "w1765-rear-contact-duck-carry"
      || candidateTrial === "w1765-grounded-rear-micro-duck"
      || candidateTrial === "w1769-reentry-right-extend"
      || candidateTrial === "w1686-left-edge-close-body-right-guard"
      || candidateTrial === "w1686-left-edge-overhead-duck-guard"
      || candidateTrial === "w1686-left-edge-duck-hold-guard"
      || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
      || candidateTrial === "w1735-danger-stack-right-carry"
      || candidateTrial === "w1735-same-lane-right-carry"
      || candidateTrial === "w1454-airborne-fixed-contact-pulse-carry"
      || candidateTrial === "w1454-airborne-fixed-contact-right-carry"
      || candidateTrial === "w1440-descent-lower-body-right-carry"
      || candidateTrial === "w1726-danger-low-side-body"
      || candidateTrial === "w1660-retreat-regression-guard"
      || candidateTrial === "w1641-left-edge-right-jump"
      || candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1440DescentLowerBodyRightCarry(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-descent-lower-body-right-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1751-precontact-right-fire"
    || candidateTrial === "w1755-descent-right-fire-carry"
    || candidateTrial === "w1765-reentry-right-fire-carry"
    || candidateTrial === "w1765-rear-contact-duck-carry"
    || candidateTrial === "w1765-grounded-rear-micro-duck"
    || candidateTrial === "w1769-reentry-right-extend"
    || candidateTrial === "w1686-left-edge-close-body-right-guard"
    || candidateTrial === "w1686-left-edge-overhead-duck-guard"
    || candidateTrial === "w1686-left-edge-duck-hold-guard"
    || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
  ) {
    const precontactBody = findW1751PrecontactForwardBody(snapshot);
    if (precontactBody) {
      const dy = precontactBody.y - snapshot.playerY;
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: dy > 12,
        left: false,
        reason: "stage-one-w1751-precontact-right-fire",
        right: true,
        up: dy <= 12
      });
      return buttons;
    }
  }
  if (
    candidateTrial === "w1755-descent-right-fire-carry"
    || candidateTrial === "w1765-reentry-right-fire-carry"
    || candidateTrial === "w1765-rear-contact-duck-carry"
    || candidateTrial === "w1765-grounded-rear-micro-duck"
    || candidateTrial === "w1769-reentry-right-extend"
    || candidateTrial === "w1686-left-edge-close-body-right-guard"
    || candidateTrial === "w1686-left-edge-overhead-duck-guard"
    || candidateTrial === "w1686-left-edge-duck-hold-guard"
    || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
  ) {
    const descentBody = findW1755DescentRightFireBody(snapshot);
    if (descentBody) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: true,
        left: false,
        reason: "stage-one-w1755-descent-right-fire-carry",
        right: true,
        up: false
      });
      return buttons;
    }
  }
  if (candidateTrial === "w1765-grounded-rear-micro-duck") {
    const groundedRearContact = findW1765GroundedRearSameLaneContact(snapshot);
    if (groundedRearContact) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: true,
        left: false,
        reason: "stage-one-w1765-grounded-rear-micro-duck",
        right: true,
        up: false
      });
      return buttons;
    }
  }
  if (candidateTrial === "w1765-rear-contact-duck-carry") {
    const rearContact = findW1765RearSameLaneContact(snapshot);
    if (rearContact) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: true,
        left: false,
        reason: "stage-one-w1765-rear-contact-duck-carry",
        right: true,
        up: false
      });
      return buttons;
    }
  }
  if (
    candidateTrial === "w1765-reentry-right-fire-carry"
    || candidateTrial === "w1765-rear-contact-duck-carry"
    || candidateTrial === "w1765-grounded-rear-micro-duck"
    || candidateTrial === "w1769-reentry-right-extend"
    || candidateTrial === "w1686-left-edge-close-body-right-guard"
    || candidateTrial === "w1686-left-edge-overhead-duck-guard"
    || candidateTrial === "w1686-left-edge-duck-hold-guard"
    || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
  ) {
    const reentryBody = findW1765ReentryForwardBody(snapshot);
    if (reentryBody) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1765-reentry-right-fire-carry",
        right: true,
        up: true
      });
      return buttons;
    }
  }
  if (
    candidateTrial === "w1769-reentry-right-extend"
    || candidateTrial === "w1686-left-edge-close-body-right-guard"
    || candidateTrial === "w1686-left-edge-overhead-duck-guard"
    || candidateTrial === "w1686-left-edge-duck-hold-guard"
    || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
  ) {
    const reentryExtensionBody = findW1769ReentryRightCarryBody(snapshot);
    if (reentryExtensionBody) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1769-reentry-right-extend",
        right: true,
        up: true
      });
      return buttons;
    }
  }
  if (
    (
      candidateTrial === "w1686-left-edge-overhead-duck-guard"
      || candidateTrial === "w1686-left-edge-duck-hold-guard"
    )
    && hasW1686LeftEdgeOverheadDuckGuard(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-w1686-left-edge-overhead-duck-guard",
      right: false,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1686-left-edge-duck-hold-guard"
    && hasW1686LeftEdgeDuckHoldGuard(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-w1686-left-edge-duck-hold-guard",
      right: false,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1721-airborne-upper-preclear-right-fire"
    && hasW1721AirborneUpperPreclearThreat(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-w1721-airborne-upper-preclear-right-fire",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1686-left-edge-close-body-right-guard"
      || candidateTrial === "w1686-left-edge-overhead-duck-guard"
      || candidateTrial === "w1686-left-edge-duck-hold-guard"
      || candidateTrial === "w1721-airborne-upper-preclear-right-fire"
    )
    && hasW1686LeftEdgeCloseBodyRightGuard(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: true,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-w1686-left-edge-close-body-right-guard",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    candidateTrial === "w1735-same-lane-right-carry"
    && hasW1735SameLaneContactRightCarry(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-same-lane-contact-right-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1726-danger-low-side-body"
      || candidateTrial === "w1735-danger-stack-right-carry"
      || candidateTrial === "w1735-same-lane-right-carry"
      || candidateTrial === "w1660-retreat-regression-guard"
      || candidateTrial === "w1641-left-edge-right-jump"
      || candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1726DangerLowSideBodyThreat(snapshot)
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
  if (
    candidateTrial === "w1726-grounded-overhead-duck-advance"
    && hasW1726GroundedOverheadDuckAdvance(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-grounded-overhead-duck-advance",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
    )
    && hasW1658OverheadBodyGuardPreclear(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-overhead-body-guard-preclear",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
    )
    && hasW1664SameLanePreclearPulse(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: frame % 6 >= 2,
      down: true,
      left: false,
      reason: "stage-one-same-lane-preclear-pulse",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1664-same-lane-preclear-pulse"
    && hasW1664SameLanePreclearPulse(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: frame % 6 >= 2,
      down: true,
      left: false,
      reason: "stage-one-same-lane-preclear-pulse",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1678-upper-body-jump-edge"
    && hasW1678UpperBodyJumpEdge(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: frame % 4 !== 2,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-upper-body-jump-edge",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    candidateTrial === "w1678-low-stack-jump-clear"
    && hasW1678LowStackJumpClear(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: true,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-low-stack-jump-clear",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    candidateTrial === "w1678-forward-body-duck-carry"
    && hasW1678ForwardUpperBodyDuckCarry(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-forward-body-duck-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1678-forward-body-level-carry"
    && hasW1678ForwardUpperBodyDuckCarry(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-forward-body-level-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (
    candidateTrial === "w1678-forward-body-level-carry"
    && hasW1678RearLowBodyAdvance(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-rear-body-advance",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    candidateTrial === "w1678-forward-body-duck-carry"
    && hasW1678RearLowBodyAdvance(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-rear-body-advance",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1648LeftEdgePrecompressionAdvance(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: true,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-left-edge-precompression-advance",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1641LeftEdgeRightJumpThreat(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: true,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-left-edge-right-jump-guard",
      right: true,
      up: true
    });
    return buttons;
  }
  if (candidateTrial === "w1641-left-edge-right-jump" && hasW1641LeftEdgeRightJumpThreat(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: true,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-left-edge-right-jump-guard",
      right: true,
      up: true
    });
    return buttons;
  }
  if (candidateTrial === "w1660-retreat-regression-guard" && hasW1660LeftEdgeOverheadBodyThreat(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-left-edge-overhead-body-guard",
      right: false,
      up: false
    });
    return buttons;
  }
  if (candidateTrial === "w1660-retreat-regression-guard" && hasW1660RetreatRegressionBodyThreat(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-retreat-regression-guard",
      right: true,
      up: true
    });
    return buttons;
  }
  if (candidateTrial === "w1641-left-edge-right-jump" && hasW1660RetreatRegressionBodyThreat(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-retreat-regression-guard",
      right: true,
      up: true
    });
    return buttons;
  }
  if (
    (
      candidateTrial === "w1648-left-edge-precompression-advance"
      || candidateTrial === "w1658-overhead-guard-preclear"
      || candidateTrial === "w1726-grounded-overhead-duck-advance"
      || candidateTrial === "w1664-same-lane-preclear-pulse"
      || candidateTrial === "w1678-forward-body-duck-carry"
      || candidateTrial === "w1678-forward-body-level-carry"
      || candidateTrial === "w1678-low-stack-jump-clear"
      || candidateTrial === "w1678-upper-body-jump-edge"
    )
    && hasW1660RetreatRegressionBodyThreat(snapshot)
  ) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-retreat-regression-guard",
      right: true,
      up: true
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
  if (hasW1465GroundedStallRightUpFire(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-w1465-grounded-stall-right-up-fire",
      right: true,
      up: true
    });
    return buttons;
  }
  if (shouldUsePromotedDefaultRoute && hasW1730UpperAirRightFireCarry(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: false,
      left: false,
      reason: "stage-one-w1730-upper-air-right-fire-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  const routeFormationThreat = findW1456AirRouteFormationThreat(snapshot);
  if (routeFormationThreat) {
    const dy = routeFormationThreat.y - snapshot.playerY;
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: dy >= 12,
      left: false,
      reason: "stage-one-air-route-hold-right",
      right: true,
      up: dy <= -12
    });
    return buttons;
  }
  if (shouldUsePromotedDefaultRoute) {
    if (hasW1730UpperAirRightFireCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1730-upper-air-right-fire-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    const precontactBody = findW1751PrecontactForwardBody(snapshot);
    if (precontactBody) {
      const dy = precontactBody.y - snapshot.playerY;
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: dy > 12,
        left: false,
        reason: "stage-one-w1751-precontact-right-fire",
        right: true,
        up: dy <= 12
      });
      return buttons;
    }
    const descentBody = findW1755DescentRightFireBody(snapshot);
    if (descentBody) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: true,
        left: false,
        reason: "stage-one-w1755-descent-right-fire-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    const reentryBody = findW1765ReentryForwardBody(snapshot);
    if (reentryBody) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1765-reentry-right-fire-carry",
        right: true,
        up: true
      });
      return buttons;
    }
    const reentryExtensionBody = findW1769ReentryRightCarryBody(snapshot);
    if (reentryExtensionBody) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1769-reentry-right-extend",
        right: true,
        up: true
      });
      return buttons;
    }
    if (hasW1787LowerLaneSpawnPreclearCue(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1769-reentry-right-extend",
        right: true,
        up: true
      });
      return buttons;
    }
    if (hasW1812UpperAirFixedRightCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1769-reentry-right-extend",
        right: true,
        up: true
      });
      return buttons;
    }
    const airSameLaneContact = findW1835AirSameLaneRightCarry(snapshot);
    if (airSameLaneContact) {
      const dy = airSameLaneContact.y - snapshot.playerY;
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-w1769-reentry-right-extend",
        right: true,
        up: dy <= -12
      });
      return buttons;
    }
    const lowerLaneContact = findW1769LowerLaneRightClearContact(snapshot);
    if (lowerLaneContact) {
      const dy = lowerLaneContact.y - snapshot.playerY;
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: dy > -14,
        left: false,
        reason: "stage-one-w1765-grounded-rear-micro-duck",
        right: true,
        up: dy <= -14
      });
      return buttons;
    }
    if (hasW1986PitAirRightCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-danger-low-lane-fall",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2068GroundedPlatformJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-weapon-gate-platform-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2148WeaponGateAirCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: snapshot.playerY >= 190,
        b: true,
        down: snapshot.playerY < 120,
        left: false,
        reason: "stage-one-weapon-gate-air-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2738BossApproachAirRightCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-high-air-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2782BossApproachHeldJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-held-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2763BossApproachGroundRun(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-ground-run",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2813BossApproachAirRightCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-high-air-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2468BossApproachMidPlatformEdgeJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: pulseWindow(frame, 14, 1),
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-mid-platform-edge-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2812BossApproachLateEdgeJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-late-edge-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2896BossApproachEntryJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-boss-approach-entry-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2026PitExitPlatformJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-pit-exit-platform-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW2018PitExitPlatformRightCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-pit-exit-platform-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW1959PitEntryDelayedJump(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-pit-entry-delayed-jump",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW1940PitEntryEarlyGroundCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: false,
        left: false,
        reason: "stage-one-pit-entry-ground-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW1930PitEntryAirRightCarry(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: false,
        b: true,
        down: snapshot.playerY < 132,
        left: false,
        reason: "stage-one-pit-entry-right-carry",
        right: true,
        up: false
      });
      return buttons;
    }
    if (hasW1914LowLaneFallBrake(snapshot)) {
      applyStageOneRewardPatch(buttons, {
        a: true,
        b: true,
        down: false,
        left: true,
        reason: "stage-one-danger-low-lane-fall",
        right: false,
        up: false
      });
      return buttons;
    }
  }
  if (hasW1454AirborneFixedContactRightCarry(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-airborne-fixed-contact-right-carry",
      right: true,
      up: false
    });
    return buttons;
  }
  if (hasW1440DescentLowerBodyRightCarry(snapshot)) {
    applyStageOneRewardPatch(buttons, {
      a: false,
      b: true,
      down: true,
      left: false,
      reason: "stage-one-descent-lower-body-right-carry",
      right: true,
      up: false
    });
    return buttons;
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
