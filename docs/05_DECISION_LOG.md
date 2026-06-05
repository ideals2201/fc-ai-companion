# Decision Log

## 2026-06-05: Clean Repository Mode

Decision: create a new clean project repository and treat existing folders as historical references.

Reason: the current workspace contains prior test packages and local user files. The new product needs a controlled GitHub-ready structure.

## 2026-06-05: Current Bot Reality

Decision: record that the AI already has basic action control.

The current problem is tactical ability, not button ability.

## 2026-06-05: Tactical Priority

Decision: prioritize Danger Detector, Route Script, Action Lock, and FSM.

Reason: the bot can operate but dies without tactical survival logic.

## 2026-06-05: TAS Boundary

Decision: TAS is a route knowledge base, not a controller.

## 2026-06-05: Browser / Training Split

Decision: browser is the product platform. Python/Gym Retro is the later training platform.

## 2026-06-05: PM-Controlled Subdialogues

Decision: use this main thread as the PM Control Console and create three pinned read-only initialization subdialogues.

Agents:

- 01 Emulator Engineer Agent
- 02 RAM Reverse Engineering Agent
- 03 Bot Behavior Engineer Agent

Reason: the project needs focused technical review while preserving PM control over priorities, architecture, and compliance boundaries.

## 2026-06-05: First Formal Development Step

Decision: start formal implementation with the Browser Cockpit shell.

Scope:

- Vite / React / TypeScript app under `apps/browser-cockpit`
- cockpit layout
- dual control pods
- realtime controller visualization shell
- tactical stack status shell
- event stream shell

Boundary:

- no ROM loading yet
- no emulator runtime yet
- no complex voice
- no live streaming
- no advanced animation
- no LLM fast-brain control

Reason: the project needs a runnable product surface before wiring emulator and RAM adapters, while keeping tactical logic as the next core work.

## 2026-06-05: Version Guidance Rule

Decision: PM Control Console should actively recommend when to save a checkpoint or upgrade the project version.

Rules:

- PM can independently make ordinary commits after coherent work and verification.
- PM should recommend version bumps, tags, releases, or merges when justified.
- The project owner must approve merges to `main`, tags, releases, version-number changes, GitHub pushes, branch deletion, and history rewriting.

Reason: version control should protect momentum without letting process decisions silently change the project state.
