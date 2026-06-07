# Contra ROM Profile Strategy

Last updated: 2026-06-07 05:45 CST

## Decision

Contra strategy development should use a dual-track ROM profile model.

## Track 1: Japan ROM As Standard Strategy Source

Purpose:

- Build the standard operation strategy database faster.
- Extract route knowledge from public TAS and speedrun material.
- Treat TAS as a route and tactic knowledge source, not as a controller replay.

Expected value:

- Faster discovery of jump points, stand points, weapon choices, boss cadence, and 2P cooperation patterns.
- Better source material for route fragments than pure trial-and-error.

Limits:

- Japan TAS input must not be replayed directly on USA ROM.
- Frame counts, RNG, stage transitions, enemy slots, and exact timing can differ.
- Every imported fragment must be verified against the target ROM profile.

## Track 2: USA ROM As Current Runtime Verification Target

Purpose:

- Continue current browser/jsnes real ROM testing with `contra-us`.
- Keep all fixes grounded in RAM snapshots and botrun death traces.
- Validate which Japan-derived fragments transfer cleanly.

Expected value:

- Strategy fragments are immediately usable in the current app.
- Current RAM map, UI, tests, and ROM fingerprint remain stable.

Limits:

- Slower than TAS-guided extraction.
- Without Japan/TAS reference, development becomes one failure point at a time.

## Product Architecture Requirement

The platform must support multiple ROM profiles:

- `contra-us`
- `contra-jp`
- future Contra variants

Each strategy fragment should declare:

- `game`
- `romProfile`
- `romHash` or accepted hash set
- `stage`
- `worldXRange`
- transfer status: `native`, `tas-derived`, `verified`, `needs-calibration`, or `rejected`

## Current Direction

Do not abandon current USA progress.

Next correct path:

1. Continue making `contra-us` survival strategy pass Stage 1 with real botrun data.
2. Add `contra-jp` as a research ROM profile when the matching ROM is available.
3. Use Japan TAS to build a standard strategy mother database.
4. Migrate fragments into USA only after RAM/WorldX verification.

## Summary

Japan ROM is better for fast standard strategy extraction.

USA ROM is better for current app verification because it is already wired into the runtime.

The long-term answer is not choosing only one version, but building a multi-profile strategy database.
