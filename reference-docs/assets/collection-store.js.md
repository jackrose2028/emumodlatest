# `collection-store.js`

| | |
|---|---|
| **Path** | `assets/collection-store.js` |
| **Category** | Shared module |
| **Size** | 7.1 KB |
| **Lines** | 149 |

## What it is

Storage for My Collection in IndexedDB `EJS-collection`: store `games` (details) and store `files` (game bytes and cover pictures).

## How it works

- `add()` stores a game and its file (re-adding the same name and size updates it); `sha1Of()` and `findBySha1()` find the same file under any name.
- `setCover()` and `removeCover()` keep a picture; a player's own cover is never replaced by an automatic one.
- `played()` adds play time and counts sessions; `list()`, `get()`, `file()`, `update()` and `remove()` do the rest.

## Why it exists

Every page that adds to or plays from the collection uses the same rules.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/catalog.js`
- `assets/classroom.js`
- `assets/collection.js`
- `assets/community.js`
- `assets/devtour.js`
- `assets/homebrew.js`
- `assets/play.js`
- `sw.js`
