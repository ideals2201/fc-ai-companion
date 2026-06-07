export type BossWallPhaseButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";

export type BossWallPhaseButtonState = Record<BossWallPhaseButtonName, boolean>;

export type BossWallPhaseEnemy = {
  slot?: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  routine?: number;
  vx?: number;
  vy?: number;
  kind: string;
  threat: boolean;
  fixed: boolean;
  priority: number;
};

export type BossWallPhaseSnapshot = {
  level: number;
  bossDefeated: number;
  worldX: number;
  playerX: number;
  playerY: number;
  jumpState: number;
  weapon?: number;
  enemies: BossWallPhaseEnemy[];
};

export type BossWallPhaseName =
  | "idle"
  | "enter-station"
  | "damage-fixed-target"
  | "reposition"
  | "cleared";

export type BossWallPhaseState = {
  phase: BossWallPhaseName;
  fixedHpTotal: number;
  lastFixedHpTotal: number | null;
  noDamageFrames: number;
  lastFrame: number | null;
  attempts: number;
};

export type BossWallPhaseDecision = {
  phase: BossWallPhaseName;
  reason: string;
  buttons: BossWallPhaseButtonState;
};

export type BossWallPhaseTargetTelemetry = {
  slot?: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  kind: string;
  fixed: boolean;
  priority: number;
};

export type BossWallPhaseTelemetry = {
  active: boolean;
  phase: BossWallPhaseName;
  fixedHpTotal: number;
  lastFixedHpTotal: number | null;
  noDamageFrames: number;
  attempts: number;
  containment: {
    active: boolean;
    reason: "none" | "fixed-hp-deep-entry";
  };
  stationCrowdGate: {
    active: boolean;
    reason: "none" | "recovery-lane-occupied";
    threats: BossWallPhaseTargetTelemetry[];
  };
  primaryTarget: BossWallPhaseTargetTelemetry | null;
  targets: BossWallPhaseTargetTelemetry[];
};

const STAGE_ONE_LEVEL_INDEX = 0;
const BOSS_WALL_PHASE_START_WORLD_X = 3148;
const BOSS_WALL_DEEP_ENTRY_WORLD_X = 3198;
const BOSS_WALL_STATION_MIN_X = 112;
const BOSS_WALL_STATION_MAX_X = 124;
const BOSS_WALL_INEFFECTIVE_FIRE_FRAMES = 60;

const buttonNames: BossWallPhaseButtonName[] = ["up", "down", "left", "right", "select", "start", "b", "a"];

function buttons(held: Partial<BossWallPhaseButtonState> = {}): BossWallPhaseButtonState {
  return Object.fromEntries(buttonNames.map((button) => [button, Boolean(held[button])])) as BossWallPhaseButtonState;
}

function pulseWindow(frame: number, period: number, width: number) {
  return period > 0 && width > 0 && frame % period < width;
}

function bossWallFireHeld(snapshot: BossWallPhaseSnapshot, frame: number) {
  const weaponCode = (snapshot.weapon ?? 0) & 0x0f;
  if (weaponCode === 0) return pulseWindow(frame, 6, 5);
  return true;
}

export function createBossWallPhaseState(): BossWallPhaseState {
  return {
    phase: "idle",
    fixedHpTotal: 0,
    lastFixedHpTotal: null,
    noDamageFrames: 0,
    lastFrame: null,
    attempts: 0
  };
}

function isBossWallPhaseSnapshot(
  snapshot: BossWallPhaseSnapshot | null | undefined
): snapshot is BossWallPhaseSnapshot {
  return Boolean(
    snapshot
    && snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= BOSS_WALL_PHASE_START_WORLD_X
  );
}

function isFixedBossWallTarget(enemy: BossWallPhaseEnemy) {
  return enemy.hp > 0
    && (enemy.fixed || enemy.type === 0x10 || enemy.type === 0x11 || enemy.kind === "boss" || enemy.kind === "durable")
    && enemy.type !== 0x02;
}

function fixedBossWallTargets(snapshot: BossWallPhaseSnapshot) {
  return snapshot.enemies
    .filter(isFixedBossWallTarget)
    .sort((a, b) => {
      const score = (enemy: BossWallPhaseEnemy) => {
        const boss = enemy.type === 0x11 || enemy.kind === "boss" ? 120 : 0;
        const turret = enemy.type === 0x10 ? 80 : 0;
        const dy = Math.abs(enemy.y - snapshot.playerY);
        const sameLane = dy <= 12 ? 110 : 0;
        const distancePenalty = Math.abs(enemy.x - snapshot.playerX) * 0.2 + dy * 2;
        return boss + turret + sameLane + enemy.priority * 16 + enemy.hp - distancePenalty;
      };
      return score(b) - score(a);
    });
}

function fixedHpTotal(snapshot: BossWallPhaseSnapshot) {
  return fixedBossWallTargets(snapshot).reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0);
}

function targetTelemetry(enemy: BossWallPhaseEnemy): BossWallPhaseTargetTelemetry {
  return {
    slot: enemy.slot,
    type: enemy.type,
    hp: enemy.hp,
    x: enemy.x,
    y: enemy.y,
    kind: enemy.kind,
    fixed: enemy.fixed,
    priority: enemy.priority
  };
}

function isStationCrowdThreat(enemy: BossWallPhaseEnemy) {
  return enemy.hp > 0
    && enemy.threat
    && !enemy.fixed
    && enemy.type !== 0x02
    && enemy.kind !== "reward";
}

function stationCrowdThreats(snapshot: BossWallPhaseSnapshot) {
  return snapshot.enemies
    .filter((enemy) => {
      if (!isStationCrowdThreat(enemy)) return false;
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return dx >= -36
        && dx <= 48
        && dy >= -56
        && dy <= 60;
    })
    .sort((a, b) => {
      const score = (enemy: BossWallPhaseEnemy) => {
        const dx = enemy.x - snapshot.playerX;
        const dy = enemy.y - snapshot.playerY;
        const immediateContact = dx >= -4 && dx <= 14 && dy >= -16 && dy <= 16 ? 120 : 0;
        const stationLane = dx >= -8 && dx <= 32 && dy >= -28 && dy <= 42 ? 60 : 0;
        return immediateContact + stationLane - Math.abs(dx) - Math.abs(dy);
      };
      return score(b) - score(a);
    });
}

function stationCrowdGate(snapshot: BossWallPhaseSnapshot, state: BossWallPhaseState) {
  const threats = stationCrowdThreats(snapshot);
  const nearStationRecovery = snapshot.worldX >= BOSS_WALL_PHASE_START_WORLD_X
    && snapshot.worldX <= BOSS_WALL_DEEP_ENTRY_WORLD_X
    && snapshot.playerX <= BOSS_WALL_STATION_MIN_X
    && state.fixedHpTotal > 0;
  const active = nearStationRecovery && (
    threats.length >= 2
    || Boolean(threats[0] && threats[0].x >= snapshot.playerX - 4 && threats[0].x <= snapshot.playerX + 14)
  );
  return {
    active,
    reason: active ? "recovery-lane-occupied" as const : "none" as const,
    threats
  };
}

function stationCrowdBodyContactThreat(snapshot: BossWallPhaseSnapshot, threats: BossWallPhaseEnemy[]) {
  if (snapshot.jumpState !== 0) return null;
  return threats.find((threat) => {
    const dx = threat.x - snapshot.playerX;
    const dy = threat.y - snapshot.playerY;
    return dx >= -6
      && dx <= 8
      && dy >= -24
      && dy <= -12;
  }) ?? null;
}

function hasFixedHpDamage(previous: BossWallPhaseState, currentHpTotal: number) {
  return previous.lastFixedHpTotal !== null && currentHpTotal < previous.lastFixedHpTotal;
}

function frameDelta(previous: BossWallPhaseState, frame: number) {
  if (previous.lastFrame === null) return 0;
  return Math.max(1, Math.min(120, frame - previous.lastFrame));
}

function shouldReposition(snapshot: BossWallPhaseSnapshot, noDamageFrames: number, fixedHp: number) {
  if (fixedHp <= 0) return false;
  if (snapshot.worldX >= BOSS_WALL_DEEP_ENTRY_WORLD_X && snapshot.playerX > BOSS_WALL_STATION_MAX_X) return true;
  return noDamageFrames >= BOSS_WALL_INEFFECTIVE_FIRE_FRAMES;
}

export function updateBossWallPhaseState(
  previous: BossWallPhaseState,
  snapshot: BossWallPhaseSnapshot | null,
  frame: number
): BossWallPhaseState {
  if (!isBossWallPhaseSnapshot(snapshot)) return createBossWallPhaseState();
  if (snapshot?.bossDefeated) {
    return {
      ...createBossWallPhaseState(),
      phase: "cleared",
      lastFrame: frame
    };
  }

  const hp = fixedHpTotal(snapshot);
  const damaged = hasFixedHpDamage(previous, hp);
  const delta = frameDelta(previous, frame);
  const noDamageFrames = damaged ? 0 : previous.noDamageFrames + delta;
  const attempts = previous.phase === "reposition" && !shouldReposition(snapshot, previous.noDamageFrames, hp)
    ? previous.attempts + 1
    : previous.attempts;

  let phase: BossWallPhaseName = "damage-fixed-target";
  if (hp <= 0) phase = "cleared";
  else if (snapshot.playerX < BOSS_WALL_STATION_MIN_X) phase = "enter-station";
  else if (shouldReposition(snapshot, noDamageFrames, hp)) phase = "reposition";
  else if (snapshot.playerX > BOSS_WALL_STATION_MAX_X) phase = "enter-station";

  return {
    phase,
    fixedHpTotal: hp,
    lastFixedHpTotal: hp,
    noDamageFrames,
    lastFrame: frame,
    attempts
  };
}

function aimAtFixedTarget(snapshot: BossWallPhaseSnapshot, next: BossWallPhaseButtonState) {
  const target = fixedBossWallTargets(snapshot)[0] ?? null;
  if (!target) return;
  const dy = target.y - snapshot.playerY;
  if (dy < -18) next.up = true;
  if (dy > 30) next.down = true;
}

export function shouldUseBossWallPhaseSafetyOverride(reason: string | null | undefined) {
  return reason === "ground-contact-breakout"
    || reason === "ground-contact-fire"
    || reason === "ground-contact-jump"
    || reason === "ground-low-projectile-jump"
    || reason === "boss-wall-bailout"
    || reason === "air-contact-hold";
}

export function applyBossWallPhaseContainmentClamp(
  snapshot: BossWallPhaseSnapshot | null | undefined,
  state: BossWallPhaseState,
  rawButtons: BossWallPhaseButtonState
) {
  const next = { ...rawButtons };
  if (!isBossWallPhaseSnapshot(snapshot)) return next;
  const fixedHpStillBlocking = state.fixedHpTotal > 0;
  const overDeepEntry = snapshot.worldX >= BOSS_WALL_DEEP_ENTRY_WORLD_X || snapshot.playerX > BOSS_WALL_STATION_MAX_X;
  if (fixedHpStillBlocking && overDeepEntry) {
    next.right = false;
    if (snapshot.playerX > BOSS_WALL_STATION_MAX_X || state.phase === "reposition") {
      next.left = true;
    }
  }
  return next;
}

export function shouldBypassAiActionLockForBossWallPhase(
  snapshot: BossWallPhaseSnapshot | null | undefined,
  state: BossWallPhaseState
) {
  if (!isBossWallPhaseSnapshot(snapshot)) return false;
  if (snapshot.bossDefeated || state.fixedHpTotal <= 0) return false;
  return stationCrowdGate(snapshot, state).active;
}

export function describeBossWallPhaseTelemetry(
  snapshot: BossWallPhaseSnapshot | null | undefined,
  state: BossWallPhaseState
): BossWallPhaseTelemetry {
  if (!isBossWallPhaseSnapshot(snapshot)) {
    return {
      active: false,
      phase: state.phase,
      fixedHpTotal: state.fixedHpTotal,
      lastFixedHpTotal: state.lastFixedHpTotal,
      noDamageFrames: state.noDamageFrames,
      attempts: state.attempts,
      containment: {
        active: false,
        reason: "none"
      },
      stationCrowdGate: {
        active: false,
        reason: "none",
        threats: []
      },
      primaryTarget: null,
      targets: []
    };
  }

  const targets = fixedBossWallTargets(snapshot).map(targetTelemetry);
  const containmentActive = state.fixedHpTotal > 0
    && (snapshot.worldX >= BOSS_WALL_DEEP_ENTRY_WORLD_X || snapshot.playerX > BOSS_WALL_STATION_MAX_X);
  const crowdGate = stationCrowdGate(snapshot, state);

  return {
    active: true,
    phase: state.phase,
    fixedHpTotal: state.fixedHpTotal,
    lastFixedHpTotal: state.lastFixedHpTotal,
    noDamageFrames: state.noDamageFrames,
    attempts: state.attempts,
    containment: {
      active: containmentActive,
      reason: containmentActive ? "fixed-hp-deep-entry" : "none"
    },
    stationCrowdGate: {
      active: crowdGate.active,
      reason: crowdGate.reason,
      threats: crowdGate.threats.map(targetTelemetry)
    },
    primaryTarget: targets[0] ?? null,
    targets
  };
}

export function decideBossWallPhaseAction(
  snapshot: BossWallPhaseSnapshot | null,
  state: BossWallPhaseState,
  frame: number
): BossWallPhaseDecision | null {
  if (!isBossWallPhaseSnapshot(snapshot)) return null;
  if (snapshot.bossDefeated || state.phase === "cleared" || state.fixedHpTotal <= 0) return null;

  const crowdGate = stationCrowdGate(snapshot, state);
  if (crowdGate.active) {
    const contactThreat = stationCrowdBodyContactThreat(snapshot, crowdGate.threats);
    if (contactThreat) {
      const dy = contactThreat.y - snapshot.playerY;
      return {
        phase: "enter-station",
        reason: "station-crowd-contact-jump",
        buttons: buttons({
          a: true,
          b: bossWallFireHeld(snapshot, frame),
          up: dy <= -12,
          down: dy >= 18
        })
      };
    }

    const primaryThreat = crowdGate.threats[0] ?? null;
    const next = buttons({ b: bossWallFireHeld(snapshot, frame) });
    if (primaryThreat) {
      const dy = primaryThreat.y - snapshot.playerY;
      next.up = dy <= -12;
      next.down = dy >= 10;
    }
    return {
      phase: "enter-station",
      reason: "station-crowd-gate-clear",
      buttons: next
    };
  }

  if (snapshot.playerX < BOSS_WALL_STATION_MIN_X && state.phase === "reposition") {
    const lowLane = snapshot.playerY >= 188;
    return {
      phase: "enter-station",
      reason: lowLane ? "recover-low-lane-station" : "recover-pre-entry-station",
      buttons: buttons({
        a: true,
        b: bossWallFireHeld(snapshot, frame),
        right: true,
        up: lowLane
      })
    };
  }

  if (state.phase === "reposition" || snapshot.playerX > BOSS_WALL_STATION_MAX_X) {
    const next = buttons({ b: bossWallFireHeld(snapshot, frame), left: true });
    aimAtFixedTarget(snapshot, next);
    next.a = false;
    next.right = false;
    return {
      phase: "reposition",
      reason: "fixed-hp-no-delta-reposition",
      buttons: next
    };
  }

  if (snapshot.playerX < BOSS_WALL_STATION_MIN_X) {
    const next = buttons({ b: bossWallFireHeld(snapshot, frame), right: true });
    aimAtFixedTarget(snapshot, next);
    return {
      phase: "enter-station",
      reason: "move-to-pre-entry-station",
      buttons: next
    };
  }

  const next = buttons({ b: bossWallFireHeld(snapshot, frame) });
  aimAtFixedTarget(snapshot, next);
  return {
    phase: "damage-fixed-target",
    reason: state.noDamageFrames > 0 ? "fixed-hp-monitoring" : "fixed-hp-damage-station",
    buttons: next
  };
}
