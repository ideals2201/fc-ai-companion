export type BotRunStrategyKey = "survival-v0" | "speedrun-v0" | "combat-v0" | "loot-v0" | "guard-v0";

const botRunStrategyKeys = new Set<string>([
  "survival-v0",
  "speedrun-v0",
  "combat-v0",
  "loot-v0",
  "guard-v0"
]);

export function parseBotRunStrategyParam(params: URLSearchParams): BotRunStrategyKey {
  const strategy = params.get("strategy") ?? "";
  return botRunStrategyKeys.has(strategy) ? strategy as BotRunStrategyKey : "survival-v0";
}
