# FC AI Companion

[English](README.md) | [中文](README.zh-CN.md)

First public release line: `v0.1.x`

FC AI Companion is a browser-based AI companion cockpit for NES/FC games.

The goal is not to build an auto-clear bot. The goal is to make the player feel that they are playing together with an AI teammate.

## Interface Preview

The screenshot shows the browser cockpit release, not the separate viewing/studio prototype. It is captured in a public-safe No ROM state and does not include ROM files or commercial game screenshots.

<img src="docs/assets/screenshots/browser-cockpit-en-v0.1.0.png" alt="FC AI Companion browser cockpit in English" width="560">

English pilot panels:

<table>
  <tr>
    <td><img src="docs/assets/screenshots/pilot-panel-1p-en-v0.1.0.png" alt="1P pilot panel in English" width="220"></td>
    <td><img src="docs/assets/screenshots/pilot-panel-2p-en-v0.1.0.png" alt="2P pilot panel in English" width="220"></td>
  </tr>
</table>

Feature detail views:

<img src="docs/assets/screenshots/cockpit-tv-v0.1.0.png" alt="Central TV and host controls" width="500">

<img src="docs/assets/screenshots/tas-training-v0.1.0.png" alt="TAS training baseline panel" width="500">

<img src="docs/assets/screenshots/strategy-training-progress-v0.1.0.png" alt="Strategy package training progress" width="500">

<img src="docs/assets/screenshots/fast-brain-panel-v0.1.0.png" alt="Fast brain tactical panel" width="500">

<img src="docs/assets/screenshots/data-dashboard-v0.1.0.png" alt="Runtime data dashboard" width="500">

## Quick Start

Requirements:

- Node.js 22 or newer
- npm
- A legally owned local NES/FC ROM file for runtime testing

Install dependencies:

```powershell
npm ci
```

Run the browser cockpit:

```powershell
npm run dev:cockpit
```

Open:

```text
http://localhost:5173/
```

Windows ROM path example:

```powershell
$env:FC_AI_COMPANION_ROM_PATH="D:\your-rom-folder\your-game.nes"
npm run dev:cockpit
```

macOS/Linux ROM path example:

```bash
FC_AI_COMPANION_ROM_PATH="/your-rom-folder/your-game.nes" npm run dev:cockpit
```

Verify the project:

```powershell
npm test
npm run build
```

## Product Principles

- Player experience is more important than AI strength.
- Companion play is more important than stage clear.
- The fast brain must be RAM-driven and frame-synchronous.
- The slow brain must be event-driven and must never block gameplay.
- Training is promoted only after the rule/FSM baseline is stable.

## Current Runtime Scope

The AI already has basic action control:

- Run left/right
- Jump
- Shoot
- Lie down
- Directional aiming
- Combined actions

The current challenge is not button output ability, but tactical quality.

The runtime is organized around:

- Danger Detector
- Route Script
- Action Lock
- FSM
- RAM Clock

## v0.1.0 Public Test

- Platform: NES/FC
- Game target: Contra 1, Stage 1
- Mode: two-player companion cockpit
- Runtime: browser product platform
- Strategy package: current Contra Stage 1 candidate pack

This is the first public test version. Requirements grew gradually during the development process, so the system is currently broad and relatively complex. Later versions should simplify workflows, modularize the architecture, and improve the user experience.

## Strategy Pack

The trained strategy data included in this first public release is located at:

```text
strategy-packs/contra/
apps/browser-cockpit/public/strategies/contra/stage1/
```

The strategy pack is released as a candidate package. It includes current training evidence and runtime route exports, but it is not claimed as a fully validated no-death clear package.

## Project Background

This project was started by a 50+ lifelong learner with no traditional technical background. AI made it possible to build and test an idea that would otherwise have been out of reach.

Everyone here is a learner. Communication should be respectful, practical, and focused on learning and improving together.

## Repository Policy

This is the clean public repository for the project. Historical test packages and local ROM folders are reference-only and should not be used as the active development location.

Do not commit ROMs, BIOS files, save states, save files, or copyrighted commercial game assets.

This repository is currently published as source-available. Read `LICENSE` before copying, modifying, or redistributing.

Public release notes and checklist:

- `docs/RELEASE_NOTES_v0.1.0.md`
- `docs/PUBLIC_RELEASE_CHECKLIST.md`
- `docs/PROJECT_BACKGROUND.md`
- `docs/DEVELOPMENT_PROCESS.md`
- `docs/06_ROM_POLICY.md`
