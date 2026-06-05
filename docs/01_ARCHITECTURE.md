# Architecture

## Runtime Layers

```text
UI Layer
Social Layer
AI Layer
Emulator Layer
```

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

