# Subdialogue Registry

This file records the active Codex subdialogues used by the PM Control Console.

The current main thread is the PM Control Console. Subdialogues do not change project direction by themselves. They report back to PM, and PM routes decisions to the project owner.

## Active Subdialogues

| Agent | Thread ID | Status | Current Mode | Boundary |
| --- | --- | --- | --- | --- |
| 01 Emulator Engineer Agent | `019e9805-b4b8-7b22-8b2e-f1184a63f234` | active, pinned | read-only initialization | emulator host, frame loop, RAM read adapter, controller input adapter |
| 02 RAM Reverse Engineering Agent | `019e9806-4162-7be2-9b06-31fdd891e28c` | active, pinned | read-only initialization | RAM state schema, CameraX, PlayerX, WorldX, validation |
| 03 Bot Behavior Engineer Agent | `019e9806-6330-7cc2-bd56-9205f2693845` | active, pinned | read-only initialization | Danger Detector, Route Script, Action Lock, FSM |

## Delegation Rules

- Dispatch is not completion.
- A subdialogue must return a fixed report before PM accepts its work.
- Subdialogues may not modify architecture, model route, directory structure, business direction, or compliance boundary without PM review and project owner approval.
- Current initialization tasks are read-only.
- Code changes start only after PM turns the returned reports into an accepted task.

## Fixed Return Report

Every subdialogue report must include:

1. What it read.
2. What it concludes.
3. What it proposes next.
4. What it needs from PM.
5. What it must not do.

