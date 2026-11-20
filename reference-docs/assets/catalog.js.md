# `catalog.js`

| | |
|---|---|
| **Path** | `assets/catalog.js` |
| **Category** | Shared module |
| **Size** | 2.5 KB |
| **Lines** | 45 |

## What it is

Builds one list of games for pages that let staff or teachers pick games: the kiosk, the Classroom, Community spaces and others.

## How it works

- `loadCatalog()` returns `[{ id, source, title, system, core, url | cid, image, caption, controls }]` from `homebrew/index.json`, the `data/` library folders and My Collection.
- Only systems with an installed core are listed.
- `controlsText()` turns a showcase game's controls into one line, grouping buttons that do the same thing; `firstSentences()` shortens descriptions into captions.

## Why it exists

Every page that picks games sees the same games with the same ids.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/classroom.js`
- `assets/comfort.js`
- `assets/community.js`
- `assets/kiosk.js`
- `assets/practice.js`
- `sw.js`
