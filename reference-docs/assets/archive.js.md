# `archive.js`

| | |
|---|---|
| **Path** | `assets/archive.js` |
| **Category** | Page script (use case 6) |
| **Size** | 20.4 KB |
| **Lines** | 404 |

## What it is

The module behind `archive.html`.

## How it works

- The catalogue: search, filters by system, licence and decade, Verify every file, Identify a file (finds a record by checksum), exports.
- A record: metadata, provenance, licence, checksums checked in this browser with `assets/hashes.js`, media, attachments, a citation, and the game playable in place.
- Reads `archive/index.json`.

## Why it exists

Lets anyone confirm that a preserved file is exactly the catalogued one, and cite it.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `archive.html`
- `assets/devtour.js`
- `sw.js`
