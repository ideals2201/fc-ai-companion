# Strategy Learning Pipeline Design

## Goal

Build a repeatable strategy-learning pipeline so FC/NES AI behavior is learned from verified frame traces and reusable strategy fragments, not from endless local coordinate patches.

## Problem

The current Contra survival work has proved that direct runtime patching is too slow. A failed botrun produces a death point, then code is adjusted around that point. This works for small blockers but scales poorly: patches overlap, a failed route class can keep being tuned, and human demonstrations cannot be reused unless they are captured as frame-level state and input data.

## Direction

The new workflow is:

`trace capture -> trace analysis -> fragment extraction -> strategy pack update -> runtime execution -> botrun validation -> failure evidence feedback`

Runtime code remains RAM-driven and frame-synchronous. The browser is the product platform. Python or external tooling may be used later for training, but it is not required for the browser runtime.

## Core Concepts

Trace capture records full frame samples:

- frame number
- player input
- WorldX/progression state
- player position and state
- weapon state
- active enemies and fixed targets
- route segment and route action
- death and boss/objective state

Trace analysis turns those samples into evidence:

- kills by type
- weapon changes and pickups
- fast-pass fragments
- stall fragments
- death counterexamples
- route segment performance

Fragment extraction converts evidence into strategy-pack candidates:

- bridge jump window
- fixed threat clear
- reward pickup
- platform capture
- boss or progression barrier station
- recovery / anti-loop branch

Runtime execution consumes approved fragments through existing route, FSM, action-lock, and safety layers. It must not mechanically replay an entire route when human or AI cooperation can change the situation. Fragments guide intent; RAM safety checks still override unsafe actions.

## No-Loop Rule

If a branch objective fails in the same class after one evidence-based adjustment and one retest, stop that branch. Record the failure as a counterexample and switch one of:

- route class
- fragment source
- state-action patch from a verified trace
- instrumentation gap fix

Do not keep tuning the same WorldX window when the route class has already been disproved.

## Strategy Pack Output

Each game strategy package must include:

- game profile
- ROM profile
- entity taxonomy
- stage fragments
- known failures
- trace evidence
- validation reports

Trace evidence is not optional. A strategy marked validated must point to runtime evidence that proves the target behavior.

## Contra Immediate Application

For Contra US Stage 1, stop tuning the failed high-platform pre-boss jump/carry branch. The next useful work is to create a standard trace evidence artifact for `WorldX 2500-2960`, then use that evidence to build a mid/low platform capture fragment.

The current human trace files are analysis reports, not complete replayable frame input traces. They are useful for event-level evidence, but they cannot directly replay human movement. Future demonstrations must export full frame samples.
