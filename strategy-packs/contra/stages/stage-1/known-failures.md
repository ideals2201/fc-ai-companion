# Contra Stage 1 Known Failures

Pack: `contra-stage1-strategy-v0`

## Failure Points

- `stage1-w2622-progression-barrier-jump-failure`: jump timing near a progression barrier can fail when the action lock starts late.
- `stage1-w2854-preboss-platform-capture-failure`: Boss-approach high-platform jump/carry reaches `WorldX 2854` but misses the safe platform capture and falls. Do not keep tuning the same `WorldX 2776-2864` high arc. Evidence: `trace-evidence/2026-06-07-boss-high-air-carry-failure.json`.
- `stage1-w2836-mid-platform-capture-failure`: Boss-approach mid-platform left correction changes the death point to `WorldX 2836/y236` but still misses safe capture. Do not keep tuning left/right correction in this same falling window. Evidence: `trace-evidence/2026-06-07-mid-platform-capture-failure.json`.
- `stage1-w2839-lower-platform-edge-trigger-failure`: Boss-approach lower-platform edge trigger releases A before landing and re-triggers at `WorldX 2814-2828`, but still dies at `WorldX 2839/y234`. Do not keep tuning the same lower-platform A-edge window. Evidence: `trace-evidence/2026-06-07-lower-platform-edge-trigger-failure.json`.
- `stage1-w3208-barrier-node-station-failure`: barrier station and aim can fail if the AI does not hold the correct firing angle.
- `stage1-bridge-reward-missed`: reward or weapon targets before the bridge can be skipped when route pressure is too high.
- `stage1-fixed-threat-no-fire`: fixed threats can be visible but not attacked if classification or aim mapping fails.

## Required Follow-Up

Each failure must become either a corrected fragment, a safety override, or a trace evidence counterexample before the related strategy can be marked validated.
