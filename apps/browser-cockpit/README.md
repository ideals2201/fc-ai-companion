# Browser Cockpit App

This app will become the browser product platform.

V0 responsibilities:

- emulator host
- frame loop
- RAM state read adapter
- controller input adapter
- cockpit UI
- human/AI control switching

Do not implement complex voice, live streaming, or advanced UI animation before the tactical baseline is stable.

## Current Shell

The current implementation is a runnable cockpit shell. It does not load ROMs or run an emulator yet.

Run from the repository root:

```powershell
npm run dev:cockpit
```
