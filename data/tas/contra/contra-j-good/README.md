# Contra Japan TAS Raw Archive

ROMProfile: `contra-j-good`

Matched ROM:

- Full MD5: `0e40bc1b049c16c5d7246cc28399cb5d`
- Headerless MD5: `d306c54ccfdf5cb4f8ec588f19b3e33d`
- SHA1: `376836361f404c815d404e1d5903d5d11f4eff0e`
- FM2 `romChecksum`: `base64:0wbFTM/fXLT47FiPGbPjPQ==`

Use:

- Raw TAS files are research inputs for route knowledge and training-base extraction.
- They are not live controller scripts.
- Any extracted fragment must be bound to `contra-j-good` and validated with real runtime traces before promotion.

## File Notes

| File | English title | Chinese title | Primary use | Recommended baselines |
| --- | --- | --- | --- | --- |
| `mars608,aiqiyou-contraj-1p.fm2` | Contra Japan 1P any% TAS | 魂斗罗日版 1P 任意通关 TAS | Single-player route, bridge timing, fixed-target handling, boss-wall rhythm | survival-v0, speedrun-v0, combat-v0 |
| `mars608,aiqiyou5-contra-nes-2players.fm2` | Contra Japan 2P any% TAS | 魂斗罗日版 2P 任意通关 TAS | Two-player spacing, shared damage windows, screen-push cooperation | survival-v0, speedrun-v0, guard-v0 |
| `mars608,aiqiyou6-contra-pacifist.fm2` | Contra Japan pacifist TAS | 魂斗罗日版少杀/避战 TAS | Threat avoidance, non-combat progress windows, safety analysis | survival-v0, special-reference |
| `mars608_aiqiyou-contraj-nes-2p,lowp.fm2` | Contra Japan 2P low% TAS | 魂斗罗日版 2P 低收集 TAS | Low-resource two-player routing, conservative cooperation, no-strong-weapon reference | survival-v0, guard-v0, special-reference |

## Important Boundaries

- FM2 files contain deterministic controller inputs from power-on frame 0. They do not contain natural-language strategy explanations.
- For viewing, the cockpit may fast-forward the early non-gameplay frames, but it must still simulate those frames internally to keep RAM state synchronized.
- For AI strategy development, TAS data is a route knowledge source and training baseline. It is not the runtime companion controller.
- Any extracted fragment must record its source file, ROMProfile, frame or WorldX window, validation trace, and safety overrides before promotion to a StrategyPack.
