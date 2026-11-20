# `collection.html`

| | |
|---|---|
| **Path** | `collection.html` |
| **Category** | Page (use case 1) |
| **Size** | 10.5 KB |
| **Lines** | 192 |

## What it is

The My Collection page: the player's own game files kept in this browser, shown as a grid or a list.

## How it works

- Markup for the toolbar (add files or a folder, search, shelves, sort, view), the grid, the select-mode bar and the game details dialog.
- Behaviour in `assets/collection.js`; storage in `assets/collection-store.js`.
- Games open in `play.html?cid=<id>`, which reads the file from the collection.

## Why it exists

A player's own backups belong in one place on every device they use, with a way to move them to the next one.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `assets/app.css`
- `assets/collection.js`
- `assets/early-view.js`
- `assets/homebrew.js`
- `assets/start.js`
- `community.html`
- `index.html`
- `kiosk.html`
- `links.html`
- `sw.js`
