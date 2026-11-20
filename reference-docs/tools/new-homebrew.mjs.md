# `new-homebrew.mjs`

| | |
|---|---|
| **Path** | `tools/new-homebrew.mjs` |
| **Category** | Build tool (Node) |
| **Size** | 3.9 KB |
| **Lines** | 59 |

## What it is

Publishes a homebrew game to the showcase in one command.

## How it works

- `node tools/new-homebrew.mjs game.nes --title … --author … --license …` creates `homebrew/<folder>/`, copies the ROM, writes `game.json` and rebuilds the index.
- Options for system, core, year, version, updated, genre, players, tags, description, screenshots (repeatable), video and folder; it writes a first credit and version entry.

## Why it exists

Makes publishing a game quicker than writing the JSON by hand.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `assets/devtour.js`
- `homebrew.html`
- `homebrew/README.md`
- `package.json`
