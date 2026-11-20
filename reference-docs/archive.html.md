# `archive.html`

| | |
|---|---|
| **Path** | `archive.html` |
| **Category** | Page (use case 6) |
| **Size** | 4.3 KB |
| **Lines** | 62 |

## What it is

The page for the Preservation archive. It lists catalogue records for public-domain and rights-cleared software and opens each one at its permanent link (`archive.html?id=ejsa-0001`).

## How it works

- Markup only: a catalogue section (search, filters, Verify every file, Identify a file, export) and a record section filled by `assets/archive.js`.
- Records come from `archive/index.json`, built by `tools/generate-archive-index.mjs`.
- A record plays in an embedded player (`play.html?embed=1`) inside the page.

## Why it exists

Game preservation needs more than a playable file: where it came from, who allowed it, and proof that it is unchanged.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `ROADMAP.md`
- `archive/README.md`
- `assets/archive.js`
- `assets/devtour.js`
- `assets/early-view.js`
- `assets/start.js`
- `index.html`
- `kit.html`
- `links.html`
- `sw.js`
