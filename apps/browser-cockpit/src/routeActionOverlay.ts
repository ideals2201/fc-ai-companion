export type RouteActionOverlayAction =
  | "duck_fire"
  | "left"
  | "left_duck_fire"
  | "left_fire"
  | "left_up_fire"
  | "jump_right_fire"
  | "left_jump_fire"
  | "neutral_fire"
  | "pulse_jump_right"
  | "pulse_jump_right_fire"
  | "pulse_up_jump_right"
  | "pulse_right_fire"
  | "right"
  | "right_duck_fire"
  | "right_fire"
  | "jump_right"
  | "up_fire"
  | "right_up_fire";

export type RouteActionOverlayRange = [number, number];

export type RouteActionOverlayEnemyGuard = {
  dx?: RouteActionOverlayRange;
  dy?: RouteActionOverlayRange;
  fixed?: boolean;
  hpMax?: number;
  hpMin?: number;
  kind?: string;
  threat?: boolean;
  type?: number;
};

export type RouteActionOverlayGuard = {
  airborne?: boolean;
  enemy?: RouteActionOverlayEnemyGuard;
  frame?: RouteActionOverlayRange;
  grounded?: boolean;
  playerX?: RouteActionOverlayRange;
  playerY?: RouteActionOverlayRange;
  weapon?: number;
  worldX?: RouteActionOverlayRange;
};

export type RouteActionOverlay = {
  action: RouteActionOverlayAction;
  guard: RouteActionOverlayGuard;
  id: string;
  pulse?: {
    firePeriod?: number;
    fireWidth?: number;
    jumpPeriod?: number;
    jumpWidth?: number;
  };
};

export type RouteActionOverlayInput = RouteActionOverlay | RouteActionOverlay[] | null;

export type RouteActionOverlayEnemy = {
  fixed: boolean;
  hp: number;
  kind: string;
  threat: boolean;
  type: number;
  x: number;
  y: number;
};

export type RouteActionOverlaySnapshot = {
  enemies: RouteActionOverlayEnemy[];
  jumpState: number;
  playerX: number;
  playerY: number;
  weapon: number;
  worldX: number;
};

export type RouteActionOverlayPatch = {
  a?: boolean;
  b?: boolean;
  down?: boolean;
  left?: boolean;
  reason: `overlay:${string}`;
  right?: boolean;
  up?: boolean;
};

function inRange(value: number, range?: RouteActionOverlayRange) {
  if (!range) return true;
  return value >= range[0] && value <= range[1];
}

function isGrounded(snapshot: RouteActionOverlaySnapshot) {
  return snapshot.jumpState === 0;
}

function pulseWindow(frame: number, period = 1, width = 1) {
  return period > 0 && width > 0 && frame % period < width;
}

function matchesEnemyGuard(
  enemy: RouteActionOverlayEnemy,
  snapshot: RouteActionOverlaySnapshot,
  guard: RouteActionOverlayEnemyGuard
) {
  if (guard.threat !== undefined && enemy.threat !== guard.threat) return false;
  if (guard.threat === undefined && !enemy.threat) return false;
  if (guard.fixed !== undefined && enemy.fixed !== guard.fixed) return false;
  if (guard.kind !== undefined && enemy.kind !== guard.kind) return false;
  if (guard.type !== undefined && enemy.type !== guard.type) return false;
  if (guard.hpMin !== undefined && enemy.hp < guard.hpMin) return false;
  if (guard.hpMax !== undefined && enemy.hp > guard.hpMax) return false;
  if (guard.hpMin === undefined && guard.hpMax === undefined && enemy.hp <= 0) return false;

  const dx = enemy.x - snapshot.playerX;
  const dy = enemy.y - snapshot.playerY;
  return inRange(dx, guard.dx) && inRange(dy, guard.dy);
}

function matchesOverlayGuard(snapshot: RouteActionOverlaySnapshot, guard: RouteActionOverlayGuard, frame: number) {
  if (!inRange(frame, guard.frame)) return false;
  if (!inRange(snapshot.worldX, guard.worldX)) return false;
  if (!inRange(snapshot.playerX, guard.playerX)) return false;
  if (!inRange(snapshot.playerY, guard.playerY)) return false;
  if (guard.weapon !== undefined && snapshot.weapon !== guard.weapon) return false;
  if (guard.grounded === true && !isGrounded(snapshot)) return false;
  if (guard.grounded === false && isGrounded(snapshot)) return false;
  if (guard.airborne === true && isGrounded(snapshot)) return false;
  if (guard.airborne === false && !isGrounded(snapshot)) return false;
  if (guard.enemy && !snapshot.enemies.some((enemy) => matchesEnemyGuard(enemy, snapshot, guard.enemy!))) {
    return false;
  }
  return true;
}

function patchForAction(overlay: RouteActionOverlay, frame: number): RouteActionOverlayPatch {
  const reason = `overlay:${overlay.id}:${overlay.action}` as const;
  switch (overlay.action) {
    case "duck_fire":
      return { a: false, b: true, down: true, left: false, reason, right: false, up: false };
    case "left":
      return { a: false, b: false, down: false, left: true, reason, right: false, up: false };
    case "left_duck_fire":
      return { a: false, b: true, down: true, left: true, reason, right: false, up: false };
    case "left_fire":
      return { a: false, b: true, down: false, left: true, reason, right: false, up: false };
    case "left_up_fire":
      return { a: false, b: true, down: false, left: true, reason, right: false, up: true };
    case "jump_right_fire":
      return { a: true, b: true, down: false, left: false, reason, right: true, up: false };
    case "left_jump_fire":
      return { a: true, b: true, down: false, left: true, reason, right: false, up: false };
    case "neutral_fire":
      return { a: false, b: true, down: false, left: false, reason, right: false, up: false };
    case "pulse_jump_right": {
      const period = overlay.pulse?.jumpPeriod ?? 6;
      const width = overlay.pulse?.jumpWidth ?? 2;
      return { a: pulseWindow(frame, period, width), b: false, down: false, left: false, reason, right: true, up: false };
    }
    case "pulse_jump_right_fire": {
      const period = overlay.pulse?.jumpPeriod ?? 6;
      const width = overlay.pulse?.jumpWidth ?? 2;
      return { a: pulseWindow(frame, period, width), b: true, down: false, left: false, reason, right: true, up: false };
    }
    case "pulse_up_jump_right": {
      const period = overlay.pulse?.jumpPeriod ?? 6;
      const width = overlay.pulse?.jumpWidth ?? 2;
      return { a: pulseWindow(frame, period, width), b: false, down: false, left: false, reason, right: true, up: true };
    }
    case "pulse_right_fire": {
      const period = overlay.pulse?.firePeriod ?? 6;
      const width = overlay.pulse?.fireWidth ?? 2;
      return { a: false, b: pulseWindow(frame, period, width), down: false, left: false, reason, right: true, up: false };
    }
    case "right":
      return { a: false, b: false, down: false, left: false, reason, right: true, up: false };
    case "right_duck_fire":
      return { a: false, b: true, down: true, left: false, reason, right: true, up: false };
    case "right_fire":
      return { a: false, b: true, down: false, left: false, reason, right: true, up: false };
    case "jump_right":
      return { a: true, b: false, down: false, left: false, reason, right: true, up: false };
    case "up_fire":
      return { a: false, b: true, down: false, left: false, reason, right: false, up: true };
    case "right_up_fire":
      return { a: false, b: true, down: false, left: false, reason, right: true, up: true };
  }
}

export function routeActionOverlayPatch(
  snapshot: RouteActionOverlaySnapshot | null,
  overlay: RouteActionOverlayInput,
  frame: number
): RouteActionOverlayPatch | null {
  if (!snapshot || !overlay) return null;
  const overlays = Array.isArray(overlay) ? overlay : [overlay];
  const matchingOverlay = overlays.find((candidate) => matchesOverlayGuard(snapshot, candidate.guard, frame)) ?? null;
  return matchingOverlay ? patchForAction(matchingOverlay, frame) : null;
}
