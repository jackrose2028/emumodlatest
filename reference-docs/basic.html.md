# `basic.html`

| | |
|---|---|
| **Path** | `basic.html` |
| **Category** | Page (player launcher) |
| **Size** | 13.2 KB |
| **Lines** | 142 |

## What it is

The Basic page: the original home page of this edition, kept whole when `index.html` became the start page of the ten use cases.

## How it works

- Loads `assets/app.js`, which runs the game library, recent games, file drop, engine choice and every launcher option.
- Old links to `index.html?rom=…` are sent here by `assets/start.js`.
- Its description and layout are the ones documented in `index.html.md` before round 17.

## Why it exists

People who just want to play their own files keep the page they know, one tap from the start page.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `assets/app.js`
- `assets/early-view.js`
- `assets/start.js`
- `index.html`
- `links.html`
- `sw.js`
