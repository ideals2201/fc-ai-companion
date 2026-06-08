# Contra Japan Runtime Run Evidence

This directory stores browser runtime evidence for `contra-j-good`.

Current archived artifacts:

- `trace-evidence/candidate-1p-survival-v0-ai-run-mid-fixed-threat-death-worldx2068.json`
- `trace-evidence/candidate-1p-survival-v0-mid-fixed-recovery-death-worldx2087.json`
- `trace-evidence/candidate-1p-survival-v0-mid-fixed-high-station-death-worldx2087.json`
- `trace-evidence/matrix-1p-survival-v0-death-worldx2087.json`
- `trace-evidence/matrix-1p-speedrun-v0-death-worldx625.json`
- `trace-evidence/matrix-1p-combat-v0-death-worldx286.json`
- `trace-evidence/matrix-1p-loot-v0-death-worldx1943.json`
- `trace-evidence/matrix-1p-guard-v0-death-worldx2038.json`
- `trace-evidence/candidate-1p-combat-v0-opening-low-fixed-stall-worldx286.json`
- `trace-evidence/candidate-1p-combat-v0-opening-right-down-death-worldx290.json`
- `trace-evidence/candidate-1p-combat-v0-opening-right-only-death-worldx290.json`
- `trace-evidence/candidate-1p-combat-v0-opening-descent-carry-death-worldx626.json`
- `trace-evidence/candidate-1p-combat-v0-bridge-low-fixed-crowd-death-worldx1943.json`
- `trace-evidence/candidate-1p-combat-v0-danger-low-lane-fall-death-worldx2038.json`
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

The third trace evidence comes from the high fixed-threat station check:

- URL: `http://127.0.0.1:5173/?autoload=1&rom=contra-j%2FContra%20(J).nes&botrun=1&botframes=20000&run=mid-fixed-high-station-check-20260608b`
- Result: `death`
- WorldX: `2087`
- Deaths: `1`
- Score: `2400`
- Last input: `up+B`
- Strategy state: `survival-v0`, `weapon-gate-survive`, `p03-mid-fixed-threat`
- Runtime patch: `stage-one-mid-fixed-threat-high-station`

The high-station patch changed the final input and raised score from `2300` to `2400`, but the AI still died at the same WorldX with the high fixed threat alive.
This proves the local station patch is not enough; the next hypothesis must be route-level weapon/safety handling before this death window.

The strategy matrix evidence comes from five independent browser AI botruns using the `strategy=` URL parameter:

| Strategy | Run | Result | WorldX | Score | Weapon |
| --- | --- | --- | ---: | ---: | ---: |
| `survival-v0` | `matrix-survival-20260608` | `death` | `2087` | `2400` | `0` |
| `speedrun-v0` | `matrix-speedrun-20260608` | `death` | `625` | `1800` | `16` |
| `combat-v0` | `matrix-combat-detail-20260608` | `death` | `286` | `100` | `0` |
| `loot-v0` | `matrix-loot-20260608` | `death` | `1943` | `4300` | `16` |
| `guard-v0` | `matrix-guard-20260608` | `death` | `2038` | `4700` | `0` |

This matrix proves the current package has no validated `contra-j-good` Stage 1 strategy yet.
The initial matrix earliest blocker was `combat-v0` at `WorldX 286`; the best-scoring initial branch was `guard-v0` at `WorldX 2038`, but it still died.

The combat opening follow-up evidence comes from four browser AI botruns that tested the low fixed-threat opening route class:

| Route class | Run | Result | WorldX | Score | Weapon | Last input |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `stage-one-opening-low-fixed-threat` | `combat-opening-low-fixed-check-20260608` | `stopped` | `286` | `100` | `0` | `down+B` |
| `stage-one-opening-low-fixed-threat-right-down` | `combat-opening-right-down-check-20260608` | `death` | `290` | `100` | `0` | `down+right+B` |
| `stage-one-opening-low-fixed-threat-right-only` | `combat-opening-right-only-check-20260608` | `death` | `290` | `100` | `0` | `right` |
| `stage-one-opening-low-fixed-threat-descent-carry` | `combat-opening-descent-carry-y-check-20260608` | `death` | `626` | `1700` | `16` | `down+right+A+B` |
| `stage-one-bridge-low-fixed-crowd` | `combat-bridge-low-fixed-crowd-check-20260608` | `death` | `1943` | `4500` | `16` | `right+A+B` |
| `stage-one-danger-low-lane-fall` | `combat-danger-low-lane-fall-check-20260608c` | `death` | `2038` | `4700` | `16` | `B` |

The current `combat-v0` opening branch is progress evidence, not validation.
It moves the failure class from the original `WorldX 286-290` opening low fixed-threat death to the bridge-clear blocker at `WorldX 626`, then to `danger-clear` deaths at `WorldX 1943` and `WorldX 2038`.
The next combat hypothesis must target the `WorldX 2038` danger-clear fixed-threat cluster and stationary `B`-only death, and must not claim clearance without a passing validation report.
