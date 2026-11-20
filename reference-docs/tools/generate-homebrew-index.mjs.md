# `generate-homebrew-index.mjs`

| | |
|---|---|
| **Path** | `tools/generate-homebrew-index.mjs` |
| **Category** | Build tool (Node) |
| **Size** | 11.9 KB |
| **Lines** | 183 |

## What it is

Builds the Homebrew showcase from every `homebrew/<folder>/game.json`.

## How it works

- Writes `homebrew/index.json` (with size and CRC32, MD5, SHA-1), a share page per game (`homebrew/<folder>/index.html` with link-preview tags) and `homebrew/feed.xml`.
- Checks folder names, required fields, ROM size, licences, screenshots, video, controls per system, dates, links and duplicate titles; `--strict` fails on errors.
- Reads `site.json` for the public address used in previews.

## Why it exists

GitHub Pages can't list folders, and a checked list never drifts from the files.

## Referenced by

Files in this project that mention this asset by name or path:

- `.github/workflows/update-indexes.yml`
- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `assets/devtour.js`
- `homebrew/README.md`
- `homebrew/button-check/index.html`
- `homebrew/palette-explorer/index.html`
- `homebrew/sprite-lab/index.html`
- `package.json`
- `tools/new-homebrew.mjs`
