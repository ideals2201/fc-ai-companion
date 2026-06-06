# Architecture

## Runtime Layers

```text
UI Layer
Social Layer
AI Layer
Game Profile Layer
Emulator Layer
```

## Platform Split

The browser cockpit is an FC/NES companion platform, not a Contra-only app.

Platform core:

- emulator runtime
- ROM identity
- controller input routing
- frame loop
- cockpit UI
- generic telemetry

Game Profile:

- ROM version matrix
- RAM schema
- state adapter
- route scripts
- danger detector
- action lock
- FSM
- strategy pack
- game-specific data labels

Contra is the first supported Game Profile. Future games must be added through separate Game Profiles instead of hardcoding game-specific behavior into the platform core.

## Fast Brain

Responsibilities:

- read RAM
- derive game state
- run FSM and tactical rules
- output controller state

Constraint:

```text
read state -> decide -> write input -> run one frame
```

The fast brain must not depend on LLM calls.

## Slow Brain

Responsibilities:

- receive game events
- produce banter, praise, blame, rescue requests, and replay text
- drive personality and relationship state

The slow brain is asynchronous and must never block the game loop.

## V0 Tactical Stack

```text
L0 input safety
L1 survival
L2 route
L3 cooperation
L4 combat
```

Priority:

```text
survival > route > cooperation > combat > advance
```
