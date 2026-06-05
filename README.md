# FC AI Companion Cockpit

FC AI Companion Cockpit is a browser-based AI companion cockpit for NES/FC games.

The project goal is not to build an auto-clear bot. The goal is to let a player feel like they are playing with an AI teammate.

## First Principles

- Player experience is more important than AI strength.
- Companion play is more important than stage clear.
- The fast brain must be RAM-driven and frame-synchronous.
- The slow brain must be event-driven and must never block gameplay.
- Training is deferred until the rule/FSM baseline is stable.

## Current Project Baseline

The AI already has basic action control:

- up / down / left / right
- run
- jump
- shoot
- controller input

The current problem is not action ability. The current problem is tactical ability.

The missing tactical layer is:

- Danger Detector
- Route Script
- Action Lock
- FSM

## MVP Scope

- Platform: NES/FC
- Game target: Contra 1, Stage 1
- Mode: two-player companion cockpit
- Runtime: browser product platform
- Training/research platform: Python / Gym Retro later

## Repository Mode

This is the clean project repository. Historical test packages and local ROM folders are references only and must not be developed in place.

ROMs, BIOS files, save states, and copyrighted game assets must not be committed.

## Priority

```text
survival > route > cooperation > combat > advance
```

