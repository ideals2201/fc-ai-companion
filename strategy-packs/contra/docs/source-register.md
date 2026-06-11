# Contra Strategy Pack Source Register

Pack: `contra-stage1-strategy-v0`

## Internal Sources

- `docs/STRATEGY_PROTOCOL_CORE.md`: Protocol 1.0.0 requirements.
- `references/contra-us/IMPLEMENTATION_GUIDE.md`: Contra-specific implementation notes.
- `references/contra-us/play-traces/`: Human play trace notes and analysis, when present.
- `apps/browser-cockpit/public/strategies/contra/stage1/`: Runtime export target, not the source of truth.

## External Sources

No external ROM, TAS input file, or copyrighted resource is included in this strategy pack.

Registered local research assets:

- `data/tas/contra/contra-j-good`: local raw FM2 TAS archive area for `contra-j-good`.
- Target ROM checksum: `base64:0wbFTM/fXLT47FiPGbPjPQ==` / headerless MD5 `d306c54ccfdf5cb4f8ec588f19b3e33d`.
- Extracted knowledge: Japanese Contra TAS route knowledge and optional training baseline candidates.
- Boundary: TAS is not used as the live controller; it must be converted into strategy fragments and validated by real runtime traces.

Registered training-experience notes:

- `docs/contra1-training-experience.md`: durable Contra Japan training lessons for this strategy pack.
- Comparison source: `D:/2026TEST/contra-ai/strategy-packs/contra/docs/contra1-training-experience.md`.
- External method references: TASVideos TAS workflow/resources, NESdev controller timing, FCEUX Lua scripting, OpenAI Gym Retro/Stable-Retro, behavior cloning/imitation learning, Contra-specific RL/Gym examples, StrategyWiki Stage 1, Contra Wiki Stage 1, GameFAQs Stage 1 walkthrough, and NESMaps Stage 1 map.
- Extracted knowledge: exact-ROM validation, survival-first branching, bounded validation windows, weapon-and-bullet-slot-aware fire control, TAS-style branch search, demonstration fragment mining, curriculum windows, prioritized failure replay, failed-run ledger updates, bridge jump windows, Spread/Rapid weapon priority, and boss-gate safe-station priority.
- Boundary: FCEUX, TAS, public walkthrough, and US-ROM findings are hypotheses only until replayed against `contra-j-good` in the browser/jsnes runtime.

Any future external source must be registered with:

- title
- URL or local source note
- author or publisher when known
- license or usage status
- extracted knowledge
- affected fragment IDs
