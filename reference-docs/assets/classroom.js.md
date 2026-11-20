# `classroom.js`

| | |
|---|---|
| **Path** | `assets/classroom.js` |
| **Category** | Page script (use case 4) |
| **Size** | 79.2 KB |
| **Lines** | 1677 |

## What it is

The module behind `classroom.html`. It runs a game in a same-origin frame and reads the running emulator directly.

## How it works

- The picture is read from the game canvas; NES games are also read from the console's memory in a save state taken in memory four times a second (palette RAM, sprite list, nametables, scroll, sound registers, 2 KB RAM).
- Pause, step one or ten frames, slow motion; saved moments in IndexedDB `EJS-classroom`.
- Memory tools: watched bytes, Find a byte, and Set (writes a byte into a save state and loads it back).
- Lessons from `assets/lessons.js`: the presenter (step clocks, clicker keys), exit tickets, printable worksheets and answer keys.

## Why it exists

Shows students the real numbers inside a game while they play it.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/devtour.js`
- `classroom.html`
- `sw.js`
