export type TasPlaybackPhase = "init" | "active" | "desynced";

export type TasDesyncReason =
  | "game-over"
  | "player-death"
  | "respawn-regression";

export type TasRuntimeSnapshot = {
  gameOver: number;
  p1State: number;
  deathFlag: number;
  playerX: number;
  playerY: number;
  worldX: number;
};

export type TasPlaybackGuardState = {
  playbackStartFrame: number;
  entryConfirmed: boolean;
  maxWorldX: number;
};

export type TasPlaybackGuardResult =
  | {
      ok: true;
      phase: Exclude<TasPlaybackPhase, "desynced">;
      state: TasPlaybackGuardState;
      message: string;
    }
  | {
      ok: false;
      phase: "desynced";
      reason: TasDesyncReason;
      state: TasPlaybackGuardState;
      message: string;
    };

const PLAYER_ALIVE_STATE = 1;
const PLAYER_DEAD_STATE = 2;
const RESPAWN_REGRESSION_MIN_WORLD_X = 256;
const RESPAWN_REGRESSION_WORLD_X = 96;
const RESPAWN_REGRESSION_GRACE_FRAMES = 60;

export function createTasPlaybackGuardState(playbackStartFrame = 0): TasPlaybackGuardState {
  return {
    playbackStartFrame,
    entryConfirmed: false,
    maxWorldX: 0
  };
}

export function isTasActivePhaseSnapshot(snapshot: TasRuntimeSnapshot | null) {
  return Boolean(snapshot)
    && snapshot?.gameOver === 0
    && snapshot?.p1State === PLAYER_ALIVE_STATE
    && snapshot?.deathFlag === 0
    && (snapshot?.playerX ?? 0) > 0
    && (snapshot?.playerY ?? 0) > 0;
}

function desyncResult(
  reason: TasDesyncReason,
  snapshot: TasRuntimeSnapshot,
  state: TasPlaybackGuardState,
  frameIndex: number
): TasPlaybackGuardResult {
  return {
    ok: false,
    phase: "desynced",
    reason,
    state,
    message: `TAS desync: ${reason} at frame ${frameIndex}, WorldX ${snapshot.worldX}, maxWorldX ${state.maxWorldX}`
  };
}

export function evaluateTasPlaybackGuard(
  snapshot: TasRuntimeSnapshot | null,
  state: TasPlaybackGuardState,
  frameIndex: number
): TasPlaybackGuardResult {
  if (!snapshot) {
    return {
      ok: true,
      phase: state.entryConfirmed ? "active" : "init",
      state,
      message: "TAS waiting for RAM"
    };
  }

  const nextState: TasPlaybackGuardState = {
    ...state,
    maxWorldX: Math.max(state.maxWorldX, snapshot.worldX)
  };

  if (snapshot.gameOver !== 0) return desyncResult("game-over", snapshot, nextState, frameIndex);
  if (snapshot.p1State === PLAYER_DEAD_STATE || snapshot.deathFlag !== 0) {
    return desyncResult("player-death", snapshot, nextState, frameIndex);
  }

  const entryConfirmed = state.entryConfirmed || isTasActivePhaseSnapshot(snapshot);
  nextState.entryConfirmed = entryConfirmed;

  const framesSinceEntry = frameIndex - state.playbackStartFrame;
  const looksLikeRespawnRegression = entryConfirmed
    && framesSinceEntry > RESPAWN_REGRESSION_GRACE_FRAMES
    && state.maxWorldX >= RESPAWN_REGRESSION_MIN_WORLD_X
    && snapshot.worldX <= RESPAWN_REGRESSION_WORLD_X;
  if (looksLikeRespawnRegression) {
    return desyncResult("respawn-regression", snapshot, nextState, frameIndex);
  }

  return {
    ok: true,
    phase: entryConfirmed ? "active" : "init",
    state: nextState,
    message: entryConfirmed ? "TAS active phase" : "TAS init phase"
  };
}
