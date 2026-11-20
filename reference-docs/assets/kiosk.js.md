# `kiosk.js`

| | |
|---|---|
| **Path** | `assets/kiosk.js` |
| **Category** | Page script (use case 3) |
| **Size** | 68.8 KB |
| **Lines** | 1490 |

## What it is

The module behind `kiosk.html`.

## How it works

- Attract loop (with picture capture), game list, a timed game in a fresh `play.html?kiosk=1` frame, idle and time-up notices, a nightly restart.
- Visitor languages (six built in, `LANGS`), How to play, a sound button, opening hours and dimming.
- Staff settings behind a PIN: games in order, check every game, offline copies (`ejs-kiosk-files`), visitor numbers per day and game (`ejs-kiosk-stats2`), export and import, and following the site's `kiosk.json`.

## Why it exists

Lets a public screen run unattended all day and recover on its own.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/devtour.js`
- `kiosk.html`
- `sw.js`
