# Contra Japan Runtime Run Evidence

This directory stores browser runtime evidence for `contra-j-good`.

Current archived artifacts:

- `trace-evidence/candidate-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json`
- `trace-evidence/candidate-1p-survival-v0-mid-fixed-recovery-death-worldx2087.json`
- `candidate-fragments/candidate-fragment-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json`

The first trace evidence comes from a real browser AI botrun:

- URL: `http://127.0.0.1:5173/?autoload=1&rom=contra-j%2FContra%20(J).nes&botrun=1&botframes=20000&run=post-fragment-j-check-20260608`
- Result: `death`
- WorldX: `2068`
- Deaths: `1`
- Strategy state: `survival-v0`, `weapon-gate-survive`, `p03-mid-fixed-threat`

The candidate fragment proposal combines that failure evidence with the `fixed-threat-route` TAS side baseline.
It is a candidate correction only. It is not validated, not a live TAS controller, and not proof of Stage 1 clearance.

The second trace evidence comes from the follow-up runtime patch check:

- URL: `http://127.0.0.1:5173/?autoload=1&rom=contra-j%2FContra%20(J).nes&botrun=1&botframes=20000&run=mid-fixed-recovery-check-20260608`
- Result: `death`
- WorldX: `2087`
- Deaths: `1`
- Strategy state: `survival-v0`, `weapon-gate-survive`, `p03-mid-fixed-threat`
- Runtime patch: `stage-one-mid-fixed-threat-recovery`

The recovery patch moved the failure from `WorldX 2068` to `WorldX 2087` and changed the final input from `down+B` to `right+A+B`.
This is measurable progress evidence only. It is still a failed route class and not Stage 1 clearance.
