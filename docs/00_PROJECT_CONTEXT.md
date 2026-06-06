# Project Context

## Project Goal

Build an AI companion cockpit running in the browser.

The user should experience playing together with an AI teammate, not watching an AI replace the player.

This is an FC/NES companion platform. Contra is the first supported game profile, not the only target game.

## Product Positioning

FC AI Companion Cockpit is a controllable, switchable, expressive, stream-friendly companion system.

The platform should support multiple FC/NES games through separate Game Profiles. Each game profile owns its ROM versions, RAM schema, route scripts, strategy pack, and training corpus metadata.

It is not:

- a game cheat
- an auto-clear tool
- a raw TAS player
- a computer-vision bot
- an LLM-controlled fast-action bot

## Current Reality

The bot can already operate the controller. It can move, run, jump, shoot, and send button input.

The major gap is tactical control. It can operate, but it often dies because it lacks survival-aware route and state logic.

## Core Technical Split

Browser:

- product platform
- emulator runtime
- cockpit UI
- controller injection
- RAM reading
- live visualization

Python / Gym Retro:

- later training platform
- offline experiments
- reinforcement learning research after V0 stability
