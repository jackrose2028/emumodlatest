# `kiosk.html`

| | |
|---|---|
| **Path** | `kiosk.html` |
| **Category** | Page (use case 3) |
| **Size** | 11.8 KB |
| **Lines** | 195 |

## What it is

The kiosk page for unattended public screens: an attract loop, a game list, a timed game, and staff settings behind a hidden gesture and a PIN.

## How it works

- Screens: attract loop, game list, playing (with the HUD and How to play), closed, PIN pad and staff settings.
- All behaviour in `assets/kiosk.js`; games play in `play.html?kiosk=1` in a fresh frame per visitor.
- Staff open the settings with five quick taps in the top-left corner or Ctrl+Shift+K.

## Why it exists

A museum screen must run a day on its own, recover from anything, and give every visitor the same fresh start.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `assets/app.css`
- `assets/devtour.js`
- `assets/early-view.js`
- `assets/play.js`
- `assets/start.js`
- `index.html`
- `links.html`
- `sw.js`
