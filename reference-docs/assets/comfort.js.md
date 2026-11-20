# `comfort.js`

| | |
|---|---|
| **Path** | `assets/comfort.js` |
| **Category** | Page script (use case 7) |
| **Size** | 35.1 KB |
| **Lines** | 776 |

## What it is

The module behind `comfort.html`. The game runs in an embedded player; this script wraps the emulator's input function so every press passes through the comfort rules.

## How it works

- Presets (Relaxed, Low vision, One hand, One switch) and options: speed, rewind, save anywhere, hold-to-toggle, auto-fire, a movable comfort pad, colour filters (SVG matrices), sound captions and flash warnings, one-switch scanning.
- Settings per game in localStorage `ejs-comfort`.

## Why it exists

Makes games playable for people who can't hold buttons, react fast or hear the sound.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/devtour.js`
- `comfort.html`
- `sw.js`
