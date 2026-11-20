# `practice.html`

| | |
|---|---|
| **Path** | `practice.html` |
| **Category** | Page (use case 9) |
| **Size** | 4.1 KB |
| **Lines** | 68 |

## What it is

The speedrun practice page: practise a game's segments from save points, do full runs with splits, and race two players on one screen.

## How it works

- Markup for the game stage (or two in a race), the segment list, the timer and the run tables.
- Behaviour in `assets/practice.js`; save points live in IndexedDB `EJS-practice`.
- A save point can be shared as a link (`#sp=` holds the compressed state) or a file.

## Why it exists

Speedrunners and event organisers need exact, repeatable practice and fair races.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `assets/early-view.js`
- `assets/practice.js`
- `assets/start.js`
- `index.html`
- `links.html`
- `sw.js`
