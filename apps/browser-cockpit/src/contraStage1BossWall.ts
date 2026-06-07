export type BossWallButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";

export type BossWallButtonState = Record<BossWallButtonName, boolean>;

export type BossWallEnemy = {
  type: number;
  hp: number;
  x: number;
  y: number;
  routine: number;
  vx?: number;
  vy?: number;
  kind: string;
  threat: boolean;
  fixed: boolean;
  priority: number;
};

export type BossWallSnapshot = {
  level: number;
  bossDefeated: number;
  worldX: number;
  playerX: number;
  playerY: number;
  jumpState: number;
  enemies: BossWallEnemy[];
};

export type BossWallMicroDecision = {
  reason:
    | "ground-contact-breakout"
    | "ground-contact-fire"
    | "ground-contact-jump"
    | "ground-fixed-fire"
    | "ground-low-projectile-jump"
    | "ground-prejump"
    | "boss-wall-bailout"
    | "air-contact-hold"
    | "air-carry";
  buttons: BossWallButtonState;
};

const STAGE_ONE_LEVEL_INDEX = 0;
const STAGE_ONE_BOSS_WALL_WORLD_X = 2960;
const BOSS_WALL_MICRO_ENGAGE_WORLD_X = 3148;
const BOSS_WALL_UPPER_STATION_X = 150;

const bossWallButtonNames: BossWallButtonName[] = ["up", "down", "left", "right", "select", "start", "b", "a"];

function bossWallButtons(held: Partial<BossWallButtonState> = {}): BossWallButtonState {
  return Object.fromEntries(
    bossWallButtonNames.map((button) => [button, Boolean(held[button])])
  ) as BossWallButtonState;
}

function pulseWindow(frame: number, period: number, width: number) {
  return period > 0 && width > 0 && frame % period < width;
}

function contactFirePulse(frame: number) {
  return frame % 8 !== 3;
}

function isBossWallReward(enemy: BossWallEnemy) {
  return (enemy.type === 0x00 || enemy.type === 0x12) && enemy.hp <= 1 && enemy.kind !== "boss";
}

function isBossWallSpawnSensor(enemy: BossWallEnemy) {
  return enemy.type === 0x02;
}

export function isBossWallContactHazard(enemy: BossWallEnemy) {
  return enemy.threat
    && enemy.hp > 0
    && !enemy.fixed
    && !isBossWallReward(enemy)
    && !isBossWallSpawnSensor(enemy);
}

function findBossWallContactHazard(snapshot: BossWallSnapshot) {
  const rearReach = snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X && snapshot.playerY >= 160 ? 32 : 8;
  return snapshot.enemies
    .filter((enemy) => (
      isBossWallContactHazard(enemy)
      && enemy.x >= snapshot.playerX - rearReach
      && enemy.x <= snapshot.playerX + 52
      && enemy.y >= snapshot.playerY - 42
      && enemy.y <= snapshot.playerY + 72
    ))
    .sort((a, b) => {
      const score = (enemy: BossWallEnemy) => {
        const dx = enemy.x - snapshot.playerX;
        const dy = enemy.y - snapshot.playerY;
        const distance = Math.abs(dx) + Math.abs(dy);
        const overheadBody = dx >= -4 && dx <= 18 && dy >= -28 && dy <= 4 ? 56 : 0;
        const rearNoisePenalty = dx < -4 ? 34 : 0;
        return distance + rearNoisePenalty - overheadBody;
      };
      return score(a) - score(b);
    })[0] ?? null;
}

function isBossWallFixedTarget(enemy: BossWallEnemy) {
  return enemy.hp > 0
    && !isBossWallReward(enemy)
    && !isBossWallSpawnSensor(enemy)
    && (enemy.fixed || enemy.type === 0x10 || enemy.type === 0x11 || enemy.kind === "boss" || enemy.kind === "durable");
}

function findBossWallFixedTarget(snapshot: BossWallSnapshot) {
  return snapshot.enemies
    .filter((enemy) => (
      isBossWallFixedTarget(enemy)
      && enemy.x >= snapshot.playerX - 24
      && enemy.x <= snapshot.playerX + 220
      && enemy.y >= snapshot.playerY - 96
      && enemy.y <= snapshot.playerY + 96
    ))
    .sort((a, b) => {
      const turretA = a.type === 0x10 ? 360 : 0;
      const turretB = b.type === 0x10 ? 360 : 0;
      const coreA = a.type === 0x11 || a.kind === "boss" ? 72 : 0;
      const coreB = b.type === 0x11 || b.kind === "boss" ? 72 : 0;
      const distanceA = Math.abs(a.x - snapshot.playerX) + Math.abs(a.y - snapshot.playerY);
      const distanceB = Math.abs(b.x - snapshot.playerX) + Math.abs(b.y - snapshot.playerY);
      const scoreA = turretA + coreA + a.priority * 32 + a.hp * 8 - distanceA;
      const scoreB = turretB + coreB + b.priority * 32 + b.hp * 8 - distanceB;
      return scoreB - scoreA;
    })[0] ?? null;
}

function findBossWallCoreCollisionTarget(snapshot: BossWallSnapshot) {
  return snapshot.enemies
    .filter((enemy) => {
      const dx = enemy.x - snapshot.playerX;
      const dy = enemy.y - snapshot.playerY;
      return enemy.hp > 0
        && (enemy.type === 0x11 || enemy.kind === "boss")
        && dx >= 12
        && dx <= 46
        && dy >= -32
        && dy <= 16;
    })
    .sort((a, b) => {
      const score = (enemy: BossWallEnemy) => {
        const dx = enemy.x - snapshot.playerX;
        const dy = enemy.y - snapshot.playerY;
        return Math.abs(dx - 24) + Math.abs(dy);
      };
      return score(a) - score(b);
    })[0] ?? null;
}

function isBossWallCoreCollisionForecast(snapshot: BossWallSnapshot, coreCollisionTarget: BossWallEnemy | null) {
  if (!coreCollisionTarget || coreCollisionTarget.hp <= 0) return false;
  const dx = coreCollisionTarget.x - snapshot.playerX;
  const dy = coreCollisionTarget.y - snapshot.playerY;
  return snapshot.worldX >= 3194
    && snapshot.worldX <= 3202
    && snapshot.playerX >= 124
    && snapshot.playerX <= 132
    && snapshot.playerY >= 150
    && snapshot.playerY <= 176
    && dx >= 28
    && dx <= 44
    && dy >= -4
    && dy <= 24;
}

function isBossWallFallingSoldierConvergence(
  snapshot: BossWallSnapshot,
  contactHazard: BossWallEnemy | null,
  fixedTarget: BossWallEnemy | null
) {
  if (!contactHazard || !fixedTarget || snapshot.jumpState === 0) return false;
  const dx = contactHazard.x - snapshot.playerX;
  const dy = contactHazard.y - snapshot.playerY;
  return snapshot.worldX >= 3196
    && snapshot.worldX <= 3210
    && snapshot.playerX >= 124
    && snapshot.playerX <= 138
    && snapshot.playerY >= 156
    && snapshot.playerY <= 188
    && contactHazard.hp > 0
    && !contactHazard.fixed
    && dx >= -2
    && dx <= 14
    && dy >= -44
    && dy <= -8;
}

function isBossWallHighHpCrowdedLowLaneGate(snapshot: BossWallSnapshot, fixedTarget: BossWallEnemy | null) {
  const contactHazard = findBossWallContactHazard(snapshot);
  if (contactHazard) {
    const dx = contactHazard.x - snapshot.playerX;
    const dy = contactHazard.y - snapshot.playerY;
    if (
      snapshot.playerY >= 188
      && dx >= -4
      && dx <= 22
      && dy >= -12
      && dy <= 24
    ) {
      return false;
    }
  }
  return Boolean(
    fixedTarget
    && fixedTarget.hp >= 8
    && snapshot.worldX >= 3198
    && snapshot.worldX <= 3210
    && snapshot.playerX >= 128
    && snapshot.playerX <= 140
    && snapshot.playerY >= 188
    && bossWallNearbyDynamicThreatCount(snapshot) >= 2
  );
}

function isBossWallProjectileLike(enemy: BossWallEnemy) {
  return enemy.kind === "projectile"
    || enemy.type >= 0x40
    || Math.abs(enemy.vx ?? 0) >= 2
    || Math.abs(enemy.vy ?? 0) >= 2;
}

function findBossWallLowProjectile(snapshot: BossWallSnapshot) {
  if (snapshot.playerY < 188 || snapshot.jumpState !== 0) return null;
  return snapshot.enemies
    .filter((enemy) => (
      enemy.threat
      && enemy.hp > 0
      && isBossWallProjectileLike(enemy)
      && enemy.x >= snapshot.playerX - 48
      && enemy.x <= snapshot.playerX + 10
      && enemy.y >= snapshot.playerY + 4
      && enemy.y <= snapshot.playerY + 24
    ))
    .sort((a, b) => Math.abs(a.x - snapshot.playerX) - Math.abs(b.x - snapshot.playerX))[0] ?? null;
}

function isStageOneBossWall(snapshot: BossWallSnapshot) {
  return snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.worldX >= STAGE_ONE_BOSS_WALL_WORLD_X
    && !snapshot.bossDefeated;
}

function isBossWallLowLaneSpawnTrap(snapshot: BossWallSnapshot, fixedTarget: BossWallEnemy | null) {
  return Boolean(
    fixedTarget
    && snapshot.worldX >= 3204
    && snapshot.worldX <= 3224
    && snapshot.playerX >= 128
    && snapshot.playerX <= 146
    && snapshot.playerY >= 188
  );
}

function bossWallNearbyDynamicThreatCount(snapshot: BossWallSnapshot) {
  return snapshot.enemies.filter((enemy) => (
    isBossWallContactHazard(enemy)
    && enemy.x >= snapshot.playerX - 72
    && enemy.x <= snapshot.playerX + 64
    && enemy.y >= snapshot.playerY - 88
    && enemy.y <= snapshot.playerY + 72
  )).length;
}

function isBossWallUpperSwarmTrap(snapshot: BossWallSnapshot, fixedTarget: BossWallEnemy | null) {
  return Boolean(
    fixedTarget
    && snapshot.worldX >= 3204
    && snapshot.worldX <= 3224
    && snapshot.playerX >= 132
    && snapshot.playerX <= 146
    && snapshot.playerY >= 132
    && snapshot.playerY <= 168
    && bossWallNearbyDynamicThreatCount(snapshot) >= 4
  );
}

function isBossWallOverextendedFixedStation(snapshot: BossWallSnapshot, fixedTarget: BossWallEnemy | null) {
  return Boolean(
    fixedTarget
    && fixedTarget.hp >= 8
    && snapshot.worldX >= 3198
    && snapshot.worldX <= 3224
    && snapshot.playerX >= 128
    && snapshot.playerY >= 124
    && snapshot.playerY <= 150
  );
}

function isBossWallMidEntryBodyTrap(
  snapshot: BossWallSnapshot,
  fixedTarget: BossWallEnemy | null,
  contactHazard: BossWallEnemy | null
) {
  if (!fixedTarget || !contactHazard) return false;
  const dx = contactHazard.x - snapshot.playerX;
  const dy = contactHazard.y - snapshot.playerY;
  return snapshot.worldX >= 3198
    && snapshot.worldX <= 3224
    && snapshot.playerX >= 124
    && snapshot.playerX <= 132
    && snapshot.playerY >= 150
    && snapshot.playerY <= 170
    && dx >= -12
    && dx <= 8
    && dy >= -18
    && dy <= 18;
}

function isBossWallPreEntrySuppressionStation(snapshot: BossWallSnapshot, fixedTarget: BossWallEnemy | null) {
  return Boolean(
    fixedTarget
    && fixedTarget.hp >= 8
    && snapshot.jumpState === 0
    && snapshot.worldX >= 3150
    && snapshot.worldX <= 3198
    && snapshot.playerX >= 112
    && snapshot.playerX <= 122
    && snapshot.playerY >= 116
    && snapshot.playerY <= 138
  );
}

export function isBossWallBailoutInput(snapshot: BossWallSnapshot, buttons: BossWallButtonState) {
  const fixedTarget = findBossWallFixedTarget(snapshot);
  const contactHazard = findBossWallContactHazard(snapshot);
  const coreCollisionTarget = findBossWallCoreCollisionTarget(snapshot);
  const fallingConvergence = isBossWallFallingSoldierConvergence(snapshot, contactHazard, fixedTarget);
  const highHpCrowdedLowLaneGate = isBossWallHighHpCrowdedLowLaneGate(snapshot, fixedTarget);
  const retreatBailout = (
    (
      isBossWallLowLaneSpawnTrap(snapshot, fixedTarget)
      || isBossWallUpperSwarmTrap(snapshot, fixedTarget)
      || isBossWallOverextendedFixedStation(snapshot, fixedTarget)
      || isBossWallMidEntryBodyTrap(snapshot, fixedTarget, contactHazard)
      || isBossWallCoreCollisionForecast(snapshot, coreCollisionTarget)
      || highHpCrowdedLowLaneGate
    )
    && buttons.b
    && buttons.left
    && !buttons.right
  );
  const holdBailout = (fallingConvergence || highHpCrowdedLowLaneGate)
    && buttons.b
    && !buttons.left
    && !buttons.right;
  return Boolean(
    isStageOneBossWall(snapshot)
    && (retreatBailout || holdBailout)
  );
}

export function decideBossWallMicroAction(
  snapshot: BossWallSnapshot,
  frame: number
): BossWallMicroDecision | null {
  if (!isStageOneBossWall(snapshot)) return null;

  let contactHazard: BossWallEnemy | null = findBossWallContactHazard(snapshot);
  const fixedTarget = findBossWallFixedTarget(snapshot);
  const coreCollisionTarget = findBossWallCoreCollisionTarget(snapshot);
  const lowProjectile = findBossWallLowProjectile(snapshot);
  if (contactHazard && fixedTarget && snapshot.playerY >= 188) {
    const dx = contactHazard.x - snapshot.playerX;
    const dy = contactHazard.y - snapshot.playerY;
    if (dx < -4 && dy < -24) contactHazard = null;
  }
  if (contactHazard && fixedTarget && snapshot.playerY < 170 && contactHazard.y >= 180) {
    contactHazard = null;
  }

  if (isBossWallFallingSoldierConvergence(snapshot, contactHazard, fixedTarget)) {
    return {
      reason: "air-contact-hold",
      buttons: bossWallButtons({
        b: true,
        up: true
      })
    };
  }

  if (isBossWallHighHpCrowdedLowLaneGate(snapshot, fixedTarget)) {
    return {
      reason: "ground-fixed-fire",
      buttons: bossWallButtons({
        b: true,
        up: true,
        left: true
      })
    };
  }

  if (isBossWallCoreCollisionForecast(snapshot, coreCollisionTarget)) {
    return {
      reason: "boss-wall-bailout",
      buttons: bossWallButtons({
        b: true,
        left: true
      })
    };
  }

  if (lowProjectile && snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X) {
    return {
      reason: "ground-low-projectile-jump",
      buttons: bossWallButtons({
        a: true,
        b: true,
        right: true
      })
    };
  }

  if (isBossWallMidEntryBodyTrap(snapshot, fixedTarget, contactHazard)) {
    return {
      reason: "boss-wall-bailout",
      buttons: bossWallButtons({
        b: true,
        left: true
      })
    };
  }

  if (
    contactHazard
    && fixedTarget
    && snapshot.jumpState === 0
    && snapshot.worldX >= 3198
    && snapshot.worldX <= 3224
    && snapshot.playerX >= 128
    && snapshot.playerX <= 146
    && snapshot.playerY >= 132
    && snapshot.playerY < 170
  ) {
    const dx = contactHazard.x - snapshot.playerX;
    const dy = contactHazard.y - snapshot.playerY;
    if (dx >= -8 && dx <= 12 && dy >= -18 && dy <= 8) {
      return {
        reason: "ground-contact-fire",
        buttons: bossWallButtons({
          b: true,
          up: true,
          left: true
        })
      };
    }
  }

  if (snapshot.jumpState === 0 && isBossWallOverextendedFixedStation(snapshot, fixedTarget)) {
    return {
      reason: "boss-wall-bailout",
      buttons: bossWallButtons({
        b: true,
        up: true,
        left: true
      })
    };
  }

  if (isBossWallPreEntrySuppressionStation(snapshot, fixedTarget)) {
    return {
      reason: "ground-fixed-fire",
      buttons: bossWallButtons({
        b: true
      })
    };
  }

  if (
    fixedTarget
    && snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X
    && snapshot.worldX <= 3224
    && snapshot.playerY >= 124
    && snapshot.playerY < 170
    && snapshot.jumpState === 0
      && fixedTarget.type === 0x10
  ) {
    const contactDx = contactHazard ? contactHazard.x - snapshot.playerX : 0;
    const contactDy = contactHazard ? contactHazard.y - snapshot.playerY : 0;
    const bodyBlocksStation = Boolean(
      contactHazard
      && contactDx >= 6
      && contactDx <= 18
      && Math.abs(contactDy) <= 22
    );
    if (!bodyBlocksStation) {
      const dy = fixedTarget.y - snapshot.playerY;
      const targetAhead = fixedTarget.x > snapshot.playerX + 8;
      return {
        reason: "ground-fixed-fire",
        buttons: bossWallButtons({
          b: pulseWindow(frame, 6, 5),
          up: dy < 8,
          down: false,
          left: false,
          right: snapshot.playerX < BOSS_WALL_UPPER_STATION_X || targetAhead
        })
      };
    }
  }

  if (contactHazard && snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X && snapshot.jumpState === 0) {
    const dx = contactHazard.x - snapshot.playerX;
    const dy = contactHazard.y - snapshot.playerY;
    if (
      snapshot.playerX > 128
      && snapshot.playerY <= 174
      && dx >= -2
      && dx <= 16
      && dy >= -4
      && dy <= 24
    ) {
      return {
        reason: "ground-contact-breakout",
        buttons: bossWallButtons({
          a: true,
          b: true,
          down: dy > 8,
          left: true
        })
      };
    }

    if (dx >= -4 && dx <= 18 && Math.abs(dy) <= 18) {
      if (snapshot.playerX > 120) {
        const lowLaneBodyCollisionBreakout = Boolean(
          fixedTarget
          && snapshot.playerY >= 188
          && dx >= -2
          && dx <= 20
          && dy >= -22
          && dy <= 16
        );
        if (lowLaneBodyCollisionBreakout) {
          return {
            reason: "ground-contact-breakout",
            buttons: bossWallButtons({
              a: true,
              b: true,
              right: true
            })
          };
        }
        const upperLaneEscapeRight = Boolean(
          fixedTarget
          && snapshot.playerY < 170
          && dx <= 2
          && snapshot.playerX < 142
        );
        const lowLaneStationRight = Boolean(
          fixedTarget
          && snapshot.playerY >= 188
          && dy < -8
          && dx <= 10
          && snapshot.playerX < 150
        );
        return {
          reason: "ground-contact-fire",
          buttons: bossWallButtons({
            b: fixedTarget ? pulseWindow(frame, 6, 5) : true,
            up: upperLaneEscapeRight || lowLaneStationRight || dy < -10,
            down: dy > 10,
            left: !upperLaneEscapeRight && !(snapshot.playerY >= 188 && dy < -8),
            right: upperLaneEscapeRight || lowLaneStationRight
          })
        };
      }

      return {
        reason: "ground-contact-jump",
        buttons: bossWallButtons({
          a: true,
          b: true
        })
      };
    }

    if (dx >= -4) {
      const lowLaneHighThreatStationRight = Boolean(
        fixedTarget
        && snapshot.playerY >= 188
        && dy < -18
        && dx <= 24
        && snapshot.playerX < 150
      );
      return {
        reason: "ground-contact-fire",
        buttons: bossWallButtons({
          b: fixedTarget ? pulseWindow(frame, 6, 5) : true,
          up: lowLaneHighThreatStationRight || dy < -10,
          down: dy > 10,
          right: lowLaneHighThreatStationRight || (dy < -18 && dx > 18 && snapshot.playerX < 142)
        })
      };
    }

    return {
      reason: "ground-contact-jump",
      buttons: bossWallButtons({
        a: true,
        b: true,
        up: dy < -22,
        down: dy > 24,
        right: dx < -4
      })
    };
  }

  if (snapshot.jumpState === 0 && isBossWallLowLaneSpawnTrap(snapshot, fixedTarget)) {
    return {
      reason: "boss-wall-bailout",
      buttons: bossWallButtons({
        a: true,
        b: true,
        left: true
      })
    };
  }

  if (
    fixedTarget
    && snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X
    && snapshot.worldX <= 3224
    && snapshot.playerY >= 124
    && snapshot.jumpState === 0
  ) {
    const dy = fixedTarget.y - snapshot.playerY;
    const sideTurretTarget = fixedTarget.type === 0x10;
    const aimUp = sideTurretTarget ? dy < -8 : dy < -24;
    const aimDown = dy > 26;
    const targetAhead = fixedTarget.x > snapshot.playerX + 12;
    const lowStanceRightFire = snapshot.playerY >= 188 && targetAhead;
    return {
      reason: "ground-fixed-fire",
      buttons: bossWallButtons({
        b: pulseWindow(frame, 6, 5),
        up: aimUp,
        down: aimDown,
        left: snapshot.playerX > 154,
        right: snapshot.playerX < 116
          || lowStanceRightFire
          || (sideTurretTarget && targetAhead && snapshot.playerX < 142)
          || (targetAhead && (aimUp || aimDown))
      })
    };
  }

  if (
    snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X
    && snapshot.worldX <= 3212
    && snapshot.playerY >= 132
    && snapshot.jumpState === 0
  ) {
    return {
      reason: "ground-prejump",
      buttons: bossWallButtons({
        a: true,
        b: pulseWindow(frame, 6, 3),
        right: true
      })
    };
  }

  if (
    snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X
    && snapshot.worldX <= 3224
    && snapshot.jumpState !== 0
  ) {
    const dx = contactHazard ? contactHazard.x - snapshot.playerX : 0;
    const dy = contactHazard ? contactHazard.y - snapshot.playerY : 0;
    const fixedDy = fixedTarget ? fixedTarget.y - snapshot.playerY : 0;
    if (isBossWallLowLaneSpawnTrap(snapshot, fixedTarget)) {
      return {
        reason: "boss-wall-bailout",
        buttons: bossWallButtons({
          b: true,
          left: true
        })
      };
    }
    if (isBossWallUpperSwarmTrap(snapshot, fixedTarget)) {
      return {
        reason: "boss-wall-bailout",
        buttons: bossWallButtons({
          b: true,
          up: true,
          left: true
        })
      };
    }
    const coreCollisionDy = coreCollisionTarget ? coreCollisionTarget.y - snapshot.playerY : 0;
    const coreCollisionStationFire = Boolean(
      coreCollisionTarget
      && snapshot.worldX >= 3204
      && snapshot.worldX <= 3224
      && snapshot.playerX >= 132
      && snapshot.playerX < 146
      && snapshot.playerY >= 173
      && snapshot.playerY <= 198
    );
    const directBodyOverlapBreakout = Boolean(
      contactHazard
      && snapshot.worldX >= 3204
      && snapshot.worldX <= 3224
      && snapshot.playerX >= 132
      && snapshot.playerX < 146
      && snapshot.playerY >= 184
      && snapshot.playerY <= 198
      && dx >= -4
      && dx <= 20
      && dy >= -8
      && dy <= 16
    );
    const fallingSoldierStrafe = Boolean(
      contactHazard
      && snapshot.worldX >= 3208
      && snapshot.playerX >= 136
      && snapshot.playerY >= 160
      && dx > 6
      && dx <= 24
      && dy < -12
      && dy >= -46
    );
    const stationRecoveryRight = Boolean(
      contactHazard
      && !fallingSoldierStrafe
      && snapshot.worldX >= BOSS_WALL_MICRO_ENGAGE_WORLD_X
      && snapshot.worldX <= 3207
      && snapshot.playerX < 136
      && snapshot.playerY >= 160
      && dx > 6
      && dx <= 32
      && dy < -12
      && dy >= -50
    );
    const landingBodyStrafe = Boolean(
      contactHazard
      && snapshot.worldX >= 3208
      && snapshot.playerX >= 132
      && snapshot.playerY >= 170
      && dx >= -4
      && dx <= 26
      && dy >= -6
      && dy <= 38
    );
    const fixedTargetLandingStationHold = Boolean(
      landingBodyStrafe
      && fixedTarget
      && snapshot.playerX >= 132
      && snapshot.playerX < 142
      && snapshot.playerY >= 168
      && snapshot.playerY <= 198
      && dx >= -2
      && dx <= 22
    );
    const rearLowBodyFire = Boolean(
      contactHazard
      && fixedTarget
      && snapshot.worldX >= 3204
      && snapshot.worldX <= 3224
      && snapshot.playerX >= 132
      && snapshot.playerX < 146
      && snapshot.playerY >= 160
      && dx >= -32
      && dx < -4
      && dy >= -18
      && dy <= 34
    );
    const highLandingBodyStrafe = Boolean(
      contactHazard
      && snapshot.worldX >= 3208
      && snapshot.playerX >= 132
      && snapshot.playerY >= 132
      && snapshot.playerY <= 150
      && dx >= -6
      && dx <= 18
      && dy >= -24
      && dy <= 4
    );
    const upperAirStationRight = Boolean(
      contactHazard
      && fixedTarget
      && snapshot.playerY < 170
      && snapshot.playerX < 142
      && dx >= -4
      && dx <= 18
      && dy >= -24
      && dy <= 8
    );
    const lateUpperDescentStationRight = Boolean(
      contactHazard
      && fixedTarget
      && snapshot.worldX >= 3204
      && snapshot.worldX <= 3207
      && snapshot.playerX < 142
      && snapshot.playerY >= 170
      && snapshot.playerY < 188
      && dx >= 6
      && dx <= 24
      && dy >= -8
      && dy <= 24
    );
    return {
      reason: contactHazard ? "air-contact-hold" : "air-carry",
      buttons: bossWallButtons({
        b: (directBodyOverlapBreakout || coreCollisionStationFire || landingBodyStrafe || highLandingBodyStrafe || lateUpperDescentStationRight)
          ? true
          : (rearLowBodyFire ? true : (contactHazard ? contactFirePulse(frame) : pulseWindow(frame, 6, fixedTarget ? 5 : 3))),
        up: Boolean(directBodyOverlapBreakout
          ? false
          : coreCollisionStationFire
            ? coreCollisionDy <= 4
            : ((contactHazard && (dy < -18 || highLandingBodyStrafe || upperAirStationRight || lateUpperDescentStationRight)) || (!contactHazard && fixedTarget && fixedDy < -8))),
        down: Boolean(!directBodyOverlapBreakout && !coreCollisionStationFire && (rearLowBodyFire || (contactHazard && dy > 10) || (!contactHazard && fixedTarget && fixedDy > 26))),
        right: directBodyOverlapBreakout || (coreCollisionStationFire || (!rearLowBodyFire && (lateUpperDescentStationRight || fixedTargetLandingStationHold || (!fallingSoldierStrafe && !landingBodyStrafe && !highLandingBodyStrafe && (!contactHazard || dx < -4 || stationRecoveryRight || upperAirStationRight))))),
        left: !directBodyOverlapBreakout && (!coreCollisionStationFire && (rearLowBodyFire || (!lateUpperDescentStationRight && !fixedTargetLandingStationHold && (fallingSoldierStrafe || landingBodyStrafe || highLandingBodyStrafe))))
      })
    };
  }

  return null;
}
