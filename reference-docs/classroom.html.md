# `classroom.html`

| | |
|---|---|
| **Path** | `classroom.html` |
| **Category** | Page (use case 4) |
| **Size** | 5.5 KB |
| **Lines** | 86 |

## What it is

The Classroom page: a game on the left, "what the console sees" on the right (palettes, sprites, background, tiles, sound, memory, timing, input), and lesson cards below.

## How it works

- Markup for the game frame, the transport buttons (pause, step, slow motion, restart, save moment), the view tabs, the lesson panel and the presenter bar.
- All behaviour lives in `assets/classroom.js`; lesson content in `assets/lessons.js`.
- A hidden print area holds the worksheet while it prints.

## Why it exists

Teachers get a 45-minute lesson with live evidence from a real game, without any other material.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `archive/index.json`
- `archive/sprite-lab/record.json`
- `assets/classroom.js`
- `assets/devtour.js`
- `assets/early-view.js`
- `assets/start.js`
- `homebrew/index.json`
- `homebrew/sprite-lab/game.json`
- `index.html`
- `links.html`
- `sw.js`
