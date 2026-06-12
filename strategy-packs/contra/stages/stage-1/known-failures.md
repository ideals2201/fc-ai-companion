# Contra Stage 1 Known Failures

Pack: `contra-stage1-strategy-v0`

## Failure Points

- `stage1-w2622-progression-barrier-jump-failure`: jump timing near a progression barrier can fail when the action lock starts late.
- `stage1-w2854-preboss-platform-capture-failure`: Boss-approach high-platform jump/carry reaches `WorldX 2854` but misses the safe platform capture and falls. Do not keep tuning the same `WorldX 2776-2864` high arc. Evidence: `trace-evidence/2026-06-07-boss-high-air-carry-failure.json`.
- `stage1-w2836-mid-platform-capture-failure`: Boss-approach mid-platform left correction changes the death point to `WorldX 2836/y236` but still misses safe capture. Do not keep tuning left/right correction in this same falling window. Evidence: `trace-evidence/2026-06-07-mid-platform-capture-failure.json`.
- `stage1-w2839-lower-platform-edge-trigger-failure`: Boss-approach lower-platform edge trigger releases A before landing and re-triggers at `WorldX 2814-2828`, but still dies at `WorldX 2839/y234`. Do not keep tuning the same lower-platform A-edge window. Evidence: `trace-evidence/2026-06-07-lower-platform-edge-trigger-failure.json`.
- `stage1-w3208-barrier-node-station-failure`: barrier station and aim can fail if the AI does not hold the correct firing angle.
- `stage1-w1534-spread-window-live-state-rejected`: the single-player `debug-w1590-before-spread-window.json` state starts with `weapon = 0`; twelve W1500-W1688 direct fire-angle/jump overlays produced no RAM weapon transition and best no-death only W2178. Do not rescan this window unless an earlier W300-W390 route rebuild enters it with the correct nonzero weapon state. Evidence: `jp-s1-w1534-spread-window-live-rejected-20260612`.
- `stage1-w1210-w1460-weapon16-prestate-rebuild-rejected`: W1210 weapon16 prestate changes can move the local ceiling from W1461 to W1833, but the tested W1160-W1235 and W1420-W1495 variants all lose active before reconnecting to W2390/W2945. Do not repeat W1440 stance-only sweeps; inspect W1757-W1834 geometry or rebuild earlier from W674. Evidence: `jp-s1-w1210-prew1450-rebuild-rejected-20260612`.
- `stage1-bridge-reward-missed`: reward or weapon targets before the bridge can be skipped when route pressure is too high.
- `stage1-fixed-threat-no-fire`: fixed threats can be visible but not attacked if classification or aim mapping fails.

## Required Follow-Up

Each failure must become either a corrected fragment, a safety override, or a trace evidence counterexample before the related strategy can be marked validated.
