# Contra US Stage 1 Human Run Analysis

Source files:
- Raw report: `2026-06-06T23-55-55-772Z-human-run-raw.json`
- Compact report: `2026-06-06T23-55-55-772Z-human-run-summary.json`

## Scope

This run was a multi-attempt human demonstration, not a single clean no-death route. It is still useful because it contains repeatable fragments for fast movement, weapon collection, turret clearing, and boss-wall completion. Unsafe death-causing fragments must be treated as negative examples.

## Recorded Totals

- Samples: 33010
- Gameplay samples: 26235
- Max WorldX: 3321
- Final runtime level: 1
- Final score: 22900
- Total detected combat events: 205
- Detected by kind: infantry 126, turret 23, flying 35, boss 3, unknown 18
- Fast-pass fragments: 10
- Stall fragments: 3

Note: the first generated compact report counted all weapon changes as pickups. The analyzer was corrected after this run to separate pickups from weapon loss/reset.

## Attempts

1. Attempt 1: WorldX 401 -> 1312, 9 kills, 1 turret, 1 weapon change, reached mid section.
2. Attempt 2: WorldX 112 -> 2341, 49 kills, 3 turrets, 2 boss-like clear events, reached boss approach.
3. Attempt 3: WorldX 48 -> 2621, 32 kills, 5 turrets, reached late boss approach.
4. Attempt 4: WorldX 48 -> 2328, 25 kills, 3 turrets, reached boss approach.
5. Attempt 5: WorldX 48 -> 2880, 39 kills, 5 turrets, reached late approach.
6. Attempt 6: WorldX 48 -> 3321, 42 kills, 6 turrets, 1 boss core event, reached level 1 transition.
7. Post-clear/menu/level-2 noise: WorldX 112, not useful for stage-1 route copying.

## Good Strategy Fragments

- Start fast pass: WorldX 48 -> 519, recurring 531-547 frames.
- Bridge fast pass: WorldX 520 -> 929, recurring 412 frames in stronger attempts.
- Mid fast pass: WorldX 930 -> 1549, 754 frames in the final attempt.
- First rapid/weapon upgrade pattern appeared around WorldX 363-477.
- Spread pickup appeared around WorldX 2345-2349 in later attempts.
- Boss-wall pre-clear: turret type 4 killed at WorldX 3023 and 3032.
- Boss-wall core kill: type 0x11 killed at WorldX 3208.

## Negative Examples

- Death at frame 29247, WorldX 2622, player 128,233, input `up+right`, route `boss-approach-survive`. Treat as failed pit/edge/jump-window data.
- Death at frame 31446, WorldX 3208, player 136,196, input `up+right+B`, route `boss-wall-survive`. Treat as failed boss-wall station/landing data.
- Deaths after level transition at WorldX 112 are level-2/menu noise and not stage-1 strategy data.

## Engineering Actions

1. Split human trace data into positive fragments and negative fragments.
2. Add a stage-1 route-fragment file that stores the reusable WorldX windows.
3. Repair boss-approach jump window around WorldX 2622.
4. Repair boss-wall fixed-target station around WorldX 3023-3208.
5. Re-run AI botrun only after the fragments are encoded.
