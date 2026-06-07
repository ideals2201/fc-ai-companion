export type BotRunTerminalSnapshot = {
  gameOver: number;
  p1State: number;
  deathFlag: number;
  bossDefeated: number;
};

export type BotRunTerminalState = {
  status: "death" | "complete";
  reason: "game-over" | "death-state" | "death-flag" | "boss-defeated";
};

export function classifyBotRunTerminalState(
  snapshot: BotRunTerminalSnapshot | null,
  gameplayActive: boolean
): BotRunTerminalState | null {
  if (!snapshot) return null;
  if (snapshot.gameOver !== 0) {
    return {
      status: "death",
      reason: "game-over"
    };
  }
  if (snapshot.p1State === 2) {
    return {
      status: "death",
      reason: "death-state"
    };
  }
  if (snapshot.deathFlag !== 0) {
    return {
      status: "death",
      reason: "death-flag"
    };
  }
  if (gameplayActive && snapshot.bossDefeated) {
    return {
      status: "complete",
      reason: "boss-defeated"
    };
  }
  return null;
}
