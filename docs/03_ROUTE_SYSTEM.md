# Route System

## Rule

The route system must exist.

It must not be a fixed screen-coordinate script.

## World Coordinate

```text
WorldX = CameraX + PlayerX
```

CameraX should be derived from emulator/RAM scroll state. PlayerX is the player sprite/runtime x position.

Route decisions should target WorldX windows and route landmarks, not raw screen-only positions.

## TAS Positioning

TAS is a route knowledge base.

TAS is not a controller.

Allowed:

- extract where to jump
- extract where to stop
- extract where to switch layer
- extract where danger appears

Forbidden:

- directly replay TAS buttons as the bot controller

## V0 Route Tasks

1. Define Stage 1 route landmarks with WorldX.
2. Convert existing route-assisted knowledge into route windows.
3. Add Action Lock for critical route actions.
4. Validate from power-on without route JSON assist.

