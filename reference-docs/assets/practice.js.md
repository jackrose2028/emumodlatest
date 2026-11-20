# `practice.js`

| | |
|---|---|
| **Path** | `assets/practice.js` |
| **Category** | Page script (use case 9) |
| **Size** | 39.3 KB |
| **Lines** | 792 |

## What it is

The module behind `practice.html`.

## How it works

- Segments with save points (IndexedDB `EJS-practice`); a timer that counts the console's own frames.
- Practice attempts against the best, full runs with splits, golds and sum of best.
- Save points shared as links (`#sp=`, deflate-raw and base64url) or files; races with two games side by side; CSV and JSON export.

## Why it exists

Exact, repeatable practice and fair races, all in the browser.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `practice.html`
- `sw.js`
