# Contra Japan TAS Training Base

This directory stores derived, machine-readable training-base artifacts generated from `data/tas/contra/contra-j-good`.

Current state:

- Raw FM2 TAS files are available.
- `training-base.json` defines the first standard TAS-derived candidate fragment set.
- `side-baselines.json` splits the verified 2P any% TAS into side-owned 1P and 2P baseline windows.
- The candidates are not validated StrategyPack fragments yet.
- A candidate becomes usable for runtime AI only after schema conversion, Safety Override review, and real browser or FCEUX trace validation.

## Side Baseline Use

`side-baselines.json` is the current bridge from TAS viewing to strategy training.

- It is generated from `mars608,aiqiyou5-contra-nes-2players.fm2`.
- Each window is stored twice: once for `1P`, once for `2P`.
- Each side baseline records frame window, pressed-frame ratio, per-button counts, dominant input patterns, and intent hints.
- The data is suitable for selecting a training baseline, comparing human/AI input, and proposing StrategyFragment candidates.
- The data is not a live controller script. Promotion still requires exact ROM hash match, Safety Override, and real runtime trace evidence.
