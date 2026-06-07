# FM2/BK2 Format Notes for Contra TAS Research

Last checked: 2026-06-07

Scope: reference notes only. This file records public format facts and parsing rules for building a Contra route knowledge base. It does not include ROMs, TAS movie files, full input logs, or executable replay code.

## Purpose

The project uses Contra USA ROM MD5 `7BDAD8B4A7A56A634C9649D20BD3011B`, normalized as lowercase `7bdad8b4a7a56a634c9649d20bd3011b`. TAS input files should be treated as route evidence and timing research, not as a controller source for direct playback.

The browser runtime contract remains:

1. Read RAM for the current frame.
2. Decide from RAM-derived state and strategy fragments.
3. Write final controller state.
4. Run `nes.frame()`.

## Primary FM2 Source

FCEUX documents `.fm2` as its movie capture format:

- Source: https://fceux.com/web/FM2.html
- Format: header plus input log.
- Header: ASCII key-value lines.
- Input log: starts at a line beginning with `|`.
- Text input log: one `|...|` line per frame.
- Binary input log: possible when header contains `binary 1`.

Relevant header fields:

- `version`: movie file format version, typically `3`.
- `emuVersion`: FCEUX version used.
- `romFilename`: ROM filename used by the author.
- `romChecksum`: base64 of the hexified ROM MD5 according to FCEUX documentation.
- `palFlag`: PAL timing flag.
- `port0`, `port1`, `port2`: device configuration.
- `fourscore`: four-controller mode flag.
- `binary`: whether input log is binary.
- `length`: number of frame records when present.
- `savestate`: if present, movie may not start from power-on.

For Contra research, reject or quarantine any movie with:

- a different game hash than the expected source category,
- `palFlag 1`,
- unexpected devices other than standard gamepads,
- savestate start when route timing needs power-on comparability,
- missing or ambiguous version metadata.

## FM2 Text Input Log

For ordinary two-controller NES/Famicom gamepad movies, each text record is conceptually:

```text
|commands|port0|port1|port2|
```

For `SI_GAMEPAD`, each port field has eight button columns:

```text
RLDUTSBA
```

Meaning:

- `R`: Right
- `L`: Left
- `D`: Down
- `U`: Up
- `T`: Start
- `S`: Select
- `B`: B
- `A`: A

In text FM2, `.` or a space means not pressed. Any other character in that button column means pressed.

The `commands` field is a bit field for emulator-level events such as reset/power/disk events. For route extraction, command frames should be preserved in metadata but not converted into gameplay intent.

## FM2 Binary Input Log

If `binary 1`, parse fixed-size frame records instead of text lines:

- first byte: command bit field;
- each `SI_GAMEPAD` port adds one byte;
- gamepad byte bits:
  - bit0: A
  - bit1: B
  - bit2: Select
  - bit3: Start
  - bit4: Up
  - bit5: Down
  - bit6: Left
  - bit7: Right

The project should normalize both text and binary FM2 into the same internal frame-input shape for analysis:

```text
frameIndex
commands
p1: { right, left, down, up, start, select, b, a }
p2: { right, left, down, up, start, select, b, a }
sourceMovieId
```

Do not store full normalized frame input in committed strategy files unless explicitly approved. The useful artifact for this project is a derived route segment, not a replay stream.

## BK2 Notes

BizHawk `.bk2` files are zip archives, not plain text files.

- Source: https://tasvideos.org/BizHawk/BK2Format
- Header data is stored in text files such as `Header.txt`.
- Input data is stored in `Input Log.txt`.
- The first input-log line is a Log Key naming button order.
- Every subsequent line beginning with `|` represents one frame.
- For boolean buttons, `.` means off and any other character means on.
- Button order varies by core and controller configuration, so BK2 parsing must read the Log Key before interpreting columns.

For Contra USA research, BK2 is relevant because some public or submitted materials are BizHawk movies rather than FCEUX FM2 movies.

## Format Boundary for This Project

Allowed to record in project references:

- source URL,
- TASVideos movie/submission/user-file id,
- publication or upload date,
- emulator and movie format,
- ROM version and hash when public page lists it,
- frame count and goal category,
- high-level tactics observed,
- derived landmarks and WorldX segment descriptions.

Not allowed in project references without further approval:

- ROM files,
- ROM download links,
- TAS movie files copied into the repo,
- complete per-frame input logs,
- replay tooling that directly drives the controller from TAS input,
- generated strategy files that contain a direct TAS playback stream.

## Recommended Parser Output for Research Runs

The shortest useful parser output is not a controller script. It is a trace-alignment aid:

```text
movieId
sourceUrl
gameVersion
romHash
emulator
format
frameCount
frameInputSummary:
  movementPhases
  jumpWindows
  firingCadence
  weaponSwitchOrPickupFrames
  deathOrRespawnFrames
  bossDamageWindows
```

The full input stream can be used transiently during local analysis, but should collapse into segment-level knowledge before entering project references.
