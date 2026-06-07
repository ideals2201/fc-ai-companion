export type TraceSide = "1P" | "2P";

export type TraceInputSample = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  start: boolean;
  select: boolean;
};

export type TraceEnemySample = {
  slot: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  routine: number;
  kind: string;
  threat: boolean;
  fixed: boolean;
  priority: number;
};

export type PlayTraceSampleLike = {
  frame: number;
  gameplayActive: boolean;
  runtimeStatus: string;
  routeSegment: string;
  routeAction: string;
  p1Input: TraceInputSample;
  p2Input: TraceInputSample;
  ram: null | {
    level: number;
    screen: number;
    scroll: number;
    cameraX: number;
    worldX: number;
    playerX: number;
    playerY: number;
    p2PlayerX: number;
    p2PlayerY: number;
    p2WorldX: number;
    p1State: number;
    p2State: number;
    jumpState: number;
    p2JumpState: number;
    deathFlag: number;
    p2DeathFlag: number;
    p1Score: number;
    p2Score: number;
    weapon: number;
    p2Weapon: number;
    bossDefeated: number;
    twoPlayerActive: boolean;
    enemies: TraceEnemySample[];
  };
};

export type TraceKillKind = "infantry" | "turret" | "flying" | "boss" | "unknown";

export type TraceTimelineEvent = {
  kind: "kill" | "weapon" | "fast-pass" | "stall" | "death" | "route";
  frame: number;
  worldX: number | null;
  routeSegment: string;
  label: string;
  detail?: Record<string, unknown>;
};

export type TraceKillEvent = {
  frame: number;
  worldX: number | null;
  routeSegment: string;
  slot: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  kind: TraceKillKind;
  reason: "hp-zero" | "disappeared";
};

export type TraceWeaponEvent = {
  frame: number;
  worldX: number | null;
  routeSegment: string;
  fromCode: number;
  toCode: number;
  changeKind: "pickup" | "loss" | "change";
};

export type TraceRunFragment = {
  startFrame: number;
  endFrame: number;
  startWorldX: number | null;
  endWorldX: number | null;
  routeSegment: string;
  frames: number;
  distance: number;
  averageWorldXPerFrame: number;
};

export type TraceDeathEvent = {
  frame: number;
  worldX: number | null;
  routeSegment: string;
  playerX: number | null;
  playerY: number | null;
  input: string;
};

export type PlayTraceAnalysisReport = {
  schema: "fc-ai-play-trace-report-v1";
  side: TraceSide;
  sampleCount: number;
  gameplaySampleCount: number;
  startFrame: number | null;
  endFrame: number | null;
  startWorldX: number | null;
  endWorldX: number | null;
  maxWorldX: number | null;
  startScore: number | null;
  endScore: number | null;
  startWeapon: number | null;
  endWeapon: number | null;
  routeSegments: Array<{
    id: string;
    startFrame: number;
    endFrame: number;
    startWorldX: number | null;
    endWorldX: number | null;
    frames: number;
    distance: number;
    scoreDelta: number;
  }>;
  kills: {
    total: number;
    byKind: Record<TraceKillKind, number>;
    events: TraceKillEvent[];
  };
  weaponPickups: {
    total: number;
    events: TraceWeaponEvent[];
  };
  weaponChanges: {
    total: number;
    pickups: number;
    losses: number;
    changes: number;
    events: TraceWeaponEvent[];
  };
  fastPasses: TraceRunFragment[];
  stalls: TraceRunFragment[];
  deaths: TraceDeathEvent[];
  timeline: TraceTimelineEvent[];
};

function emptyKillCounts(): Record<TraceKillKind, number> {
  return {
    infantry: 0,
    turret: 0,
    flying: 0,
    boss: 0,
    unknown: 0
  };
}

function scoreForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const score = side === "1P" ? sample.ram.p1Score : sample.ram.p2Score;
  return typeof score === "number" ? score : null;
}

function weaponForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const weapon = side === "1P" ? sample.ram.weapon : sample.ram.p2Weapon;
  return typeof weapon === "number" ? weapon : null;
}

function worldXForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const worldX = side === "1P" ? sample.ram.worldX : sample.ram.p2WorldX;
  return typeof worldX === "number" ? worldX : null;
}

function playerXForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const playerX = side === "1P" ? sample.ram.playerX : sample.ram.p2PlayerX;
  return typeof playerX === "number" ? playerX : null;
}

function playerYForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const playerY = side === "1P" ? sample.ram.playerY : sample.ram.p2PlayerY;
  return typeof playerY === "number" ? playerY : null;
}

function stateForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const state = side === "1P" ? sample.ram.p1State : sample.ram.p2State;
  return typeof state === "number" ? state : null;
}

function deathFlagForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  if (!sample.ram) return null;
  const deathFlag = side === "1P" ? sample.ram.deathFlag : sample.ram.p2DeathFlag;
  return typeof deathFlag === "number" ? deathFlag : null;
}

function inputForSide(sample: PlayTraceSampleLike, side: TraceSide) {
  return side === "1P" ? sample.p1Input : sample.p2Input;
}

function inputLabel(input: TraceInputSample) {
  return [
    input.up ? "up" : "",
    input.down ? "down" : "",
    input.left ? "left" : "",
    input.right ? "right" : "",
    input.a ? "A" : "",
    input.b ? "B" : "",
    input.select ? "select" : "",
    input.start ? "start" : ""
  ].filter(Boolean).join("+") || "none";
}

function weaponChangeKind(fromCode: number, toCode: number): TraceWeaponEvent["changeKind"] {
  const fromBase = fromCode & 0x0f;
  const toBase = toCode & 0x0f;
  const fromRapid = (fromCode & 0x10) !== 0;
  const toRapid = (toCode & 0x10) !== 0;
  if (toBase === 0 && !toRapid) return "loss";
  if (fromBase === 0 && toBase > 0) return "pickup";
  if (!fromRapid && toRapid) return "pickup";
  if (fromBase !== toBase && toBase > 0) return "pickup";
  return "change";
}

function isVisibleEnemy(enemy: TraceEnemySample) {
  return enemy.hp > 0 && enemy.x > 8 && enemy.x < 248 && enemy.y > 8 && enemy.y < 232;
}

function classifyKill(enemy: TraceEnemySample, level: number): TraceKillKind {
  const commonTurrets = new Set([0x04, 0x07, 0x08, 0x0e, 0x10]);
  const commonInfantry = new Set([0x01, 0x05, 0x06, 0x0c, 0x12]);
  if (enemy.type === 0x02 || enemy.type === 0x03) return "flying";
  if (enemy.type === 0x0a || enemy.type === 0x11) return "boss";
  if (commonTurrets.has(enemy.type)) return "turret";
  if (commonInfantry.has(enemy.type)) return "infantry";
  if (level === 0 && enemy.fixed && enemy.hp >= 8) return "turret";
  if (enemy.fixed && enemy.hp >= 8) return "boss";
  return "unknown";
}

function enemyMap(sample: PlayTraceSampleLike) {
  return new Map((sample.ram?.enemies ?? []).map((enemy) => [enemy.slot, enemy]));
}

function buildRunFragment(samples: PlayTraceSampleLike[], side: TraceSide): TraceRunFragment | null {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return null;
  const startWorldX = worldXForSide(first, side);
  const endWorldX = worldXForSide(last, side);
  const frames = Math.max(1, last.frame - first.frame);
  const distance = startWorldX === null || endWorldX === null ? 0 : Math.max(0, endWorldX - startWorldX);
  return {
    startFrame: first.frame,
    endFrame: last.frame,
    startWorldX,
    endWorldX,
    routeSegment: first.routeSegment,
    frames,
    distance,
    averageWorldXPerFrame: distance / frames
  };
}

function splitRouteSegments(samples: PlayTraceSampleLike[], side: TraceSide) {
  const segments: PlayTraceAnalysisReport["routeSegments"] = [];
  let current: PlayTraceSampleLike[] = [];
  for (const sample of samples) {
    if (current.length > 0 && current[0].routeSegment !== sample.routeSegment) {
      const segment = buildRouteSegment(current, side);
      if (segment) segments.push(segment);
      current = [];
    }
    current.push(sample);
  }
  const segment = buildRouteSegment(current, side);
  if (segment) segments.push(segment);
  return segments;
}

function buildRouteSegment(samples: PlayTraceSampleLike[], side: TraceSide) {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return null;
  const startScore = scoreForSide(first, side) ?? 0;
  const endScore = scoreForSide(last, side) ?? startScore;
  const startWorldX = worldXForSide(first, side);
  const endWorldX = worldXForSide(last, side);
  return {
    id: first.routeSegment,
    startFrame: first.frame,
    endFrame: last.frame,
    startWorldX,
    endWorldX,
    frames: Math.max(1, last.frame - first.frame),
    distance: startWorldX === null || endWorldX === null ? 0 : Math.max(0, endWorldX - startWorldX),
    scoreDelta: endScore - startScore
  };
}

export function analyzePlayTrace(samples: PlayTraceSampleLike[], side: TraceSide): PlayTraceAnalysisReport {
  const gameplaySamples = samples.filter((sample) => sample.gameplayActive && sample.ram);
  const ramSamples = samples.filter((sample) => sample.ram);
  const first = gameplaySamples[0] ?? samples[0] ?? null;
  const last = gameplaySamples[gameplaySamples.length - 1] ?? samples[samples.length - 1] ?? null;
  const kills: TraceKillEvent[] = [];
  const weaponChanges: TraceWeaponEvent[] = [];
  const deaths: TraceDeathEvent[] = [];
  const timeline: TraceTimelineEvent[] = [];

  for (let index = 1; index < gameplaySamples.length; index += 1) {
    const previous = gameplaySamples[index - 1];
    const current = gameplaySamples[index];
    const currentEnemies = enemyMap(current);
    const previousLevel = previous.ram?.level ?? 0;

    for (const previousEnemy of previous.ram?.enemies ?? []) {
      if (!isVisibleEnemy(previousEnemy)) continue;
      const currentEnemy = currentEnemies.get(previousEnemy.slot);
      const reason = currentEnemy
        ? previousEnemy.type === currentEnemy.type && previousEnemy.hp > 0 && currentEnemy.hp <= 0 ? "hp-zero" : null
        : "disappeared";
      if (!reason) continue;
      const kind = classifyKill(previousEnemy, previousLevel);
      const event: TraceKillEvent = {
        frame: current.frame,
        worldX: worldXForSide(current, side),
        routeSegment: current.routeSegment,
        slot: previousEnemy.slot,
        type: previousEnemy.type,
        hp: previousEnemy.hp,
        x: previousEnemy.x,
        y: previousEnemy.y,
        kind,
        reason
      };
      kills.push(event);
      timeline.push({
        kind: "kill",
        frame: event.frame,
        worldX: event.worldX,
        routeSegment: event.routeSegment,
        label: `${kind} slot${event.slot} type0x${event.type.toString(16)}`,
        detail: event
      });
    }

    const previousWeapon = weaponForSide(previous, side);
    const currentWeapon = weaponForSide(current, side);
    if (previous.gameplayActive && current.gameplayActive && previous.routeSegment !== "none" && current.routeSegment !== "none" && previousWeapon !== null && currentWeapon !== null && previousWeapon !== currentWeapon) {
      const changeKind = weaponChangeKind(previousWeapon, currentWeapon);
      const event: TraceWeaponEvent = {
        frame: current.frame,
        worldX: worldXForSide(current, side),
        routeSegment: current.routeSegment,
        fromCode: previousWeapon,
        toCode: currentWeapon,
        changeKind
      };
      weaponChanges.push(event);
      timeline.push({
        kind: "weapon",
        frame: event.frame,
        worldX: event.worldX,
        routeSegment: event.routeSegment,
        label: `weapon-${changeKind} ${event.fromCode}->${event.toCode}`,
        detail: event
      });
    }
  }

  for (let index = 1; index < ramSamples.length; index += 1) {
    const previous = ramSamples[index - 1];
    const current = ramSamples[index];
    const currentDead = stateForSide(current, side) === 2 || (deathFlagForSide(current, side) ?? 0) !== 0;
    const previousDead = stateForSide(previous, side) === 2 || (deathFlagForSide(previous, side) ?? 0) !== 0;
    if (!previousDead && currentDead) {
      const event: TraceDeathEvent = {
        frame: current.frame,
        worldX: worldXForSide(current, side),
        routeSegment: current.routeSegment,
        playerX: playerXForSide(current, side),
        playerY: playerYForSide(current, side),
        input: inputLabel(inputForSide(current, side))
      };
      deaths.push(event);
      timeline.push({
        kind: "death",
        frame: event.frame,
        worldX: event.worldX,
        routeSegment: event.routeSegment,
        label: `death ${event.input}`,
        detail: event
      });
    }
  }

  const routeSegments = splitRouteSegments(gameplaySamples, side);
  const fastPasses = routeSegments
    .filter((segment) => segment.frames >= 12 && segment.distance >= 48 && segment.distance / segment.frames >= 0.8)
    .map((segment) => ({
      startFrame: segment.startFrame,
      endFrame: segment.endFrame,
      startWorldX: segment.startWorldX,
      endWorldX: segment.endWorldX,
      routeSegment: segment.id,
      frames: segment.frames,
      distance: segment.distance,
      averageWorldXPerFrame: segment.distance / segment.frames
    }));
  for (const fragment of fastPasses) {
    timeline.push({
      kind: "fast-pass",
      frame: fragment.startFrame,
      worldX: fragment.startWorldX,
      routeSegment: fragment.routeSegment,
      label: `fast ${fragment.distance}/${fragment.frames}`,
      detail: fragment
    });
  }

  const stalls = routeSegments
    .filter((segment) => segment.frames >= 45 && segment.distance <= 8)
    .map((segment) => ({
      startFrame: segment.startFrame,
      endFrame: segment.endFrame,
      startWorldX: segment.startWorldX,
      endWorldX: segment.endWorldX,
      routeSegment: segment.id,
      frames: segment.frames,
      distance: segment.distance,
      averageWorldXPerFrame: segment.distance / segment.frames
    }));
  for (const fragment of stalls) {
    timeline.push({
      kind: "stall",
      frame: fragment.startFrame,
      worldX: fragment.startWorldX,
      routeSegment: fragment.routeSegment,
      label: `stall ${fragment.distance}/${fragment.frames}`,
      detail: fragment
    });
  }

  const byKind = emptyKillCounts();
  for (const kill of kills) byKind[kill.kind] += 1;
  timeline.sort((a, b) => a.frame - b.frame);
  const weaponPickups = weaponChanges.filter((event) => event.changeKind === "pickup");
  const weaponLosses = weaponChanges.filter((event) => event.changeKind === "loss");

  return {
    schema: "fc-ai-play-trace-report-v1",
    side,
    sampleCount: samples.length,
    gameplaySampleCount: gameplaySamples.length,
    startFrame: first?.frame ?? null,
    endFrame: last?.frame ?? null,
    startWorldX: first ? worldXForSide(first, side) : null,
    endWorldX: last ? worldXForSide(last, side) : null,
    maxWorldX: gameplaySamples.reduce<number | null>((max, sample) => {
      const worldX = worldXForSide(sample, side);
      if (worldX === null) return max;
      return max === null ? worldX : Math.max(max, worldX);
    }, null),
    startScore: first ? scoreForSide(first, side) : null,
    endScore: last ? scoreForSide(last, side) : null,
    startWeapon: first ? weaponForSide(first, side) : null,
    endWeapon: last ? weaponForSide(last, side) : null,
    routeSegments,
    kills: {
      total: kills.length,
      byKind,
      events: kills
    },
    weaponPickups: {
      total: weaponPickups.length,
      events: weaponPickups
    },
    weaponChanges: {
      total: weaponChanges.length,
      pickups: weaponPickups.length,
      losses: weaponLosses.length,
      changes: weaponChanges.length - weaponPickups.length - weaponLosses.length,
      events: weaponChanges
    },
    fastPasses,
    stalls,
    deaths,
    timeline
  };
}
