# `reference.js`

| | |
|---|---|
| **Path** | `assets/reference.js` |
| **Category** | Page script (reference docs) |
| **Size** | 6.7 KB |
| **Lines** | 151 |

## What it is

The module behind `reference.html`.

## How it works

- Lists the documents from `reference-docs/files.json` with a filter.
- Renders Markdown with a local marked, sanitises it with a local DOMPurify, and resolves links between documents so they open in place.

## Why it exists

Reference docs that work offline and load nothing from other sites.

## Referenced by

Files in this project that mention this asset by name or path:

- `ENHANCEMENTS.txt`
- `reference.html`
- `sw.js`
