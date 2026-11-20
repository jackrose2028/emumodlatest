# `touch-pad.js`

| | |
|---|---|
| **Path** | `assets/touch-pad.js` |
| **Category** | Shared module |
| **Size** | 7.4 KB |
| **Lines** | 156 |

## What it is

The on-screen controller used by NostalgistMod on phones and tablets (EmulatorJSMod has its own).

## How it works

- `createTouchPad({ parent, system, press })` builds the pad for the system (NES: B A; SNES: Y X B A, L, R).
- Tracks every finger on its own; a finger can slide between buttons and around the d-pad, with a short vibration where supported.

## Why it exists

Makes touch play feel like a real pad.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/nostalgist-player.js`
- `sw.js`
