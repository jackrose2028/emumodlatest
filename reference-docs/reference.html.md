# `reference.html`

| | |
|---|---|
| **Path** | `reference.html` |
| **Category** | Page (reference docs viewer) |
| **Size** | 1.9 KB |
| **Lines** | 39 |

## What it is

The reference docs viewer: lists the documents in `reference-docs/` and renders the chosen one.

## How it works

- `assets/reference.js` reads `reference-docs/files.json`, renders Markdown with a local copy of marked and cleans it with a local copy of DOMPurify.
- `reference.html?doc=assets/app.js.md` opens a document; links between documents open in place.
- Nothing is loaded from outside the site.

## Why it exists

Every file of the project is explained next to the site itself, and works offline.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `assets/app.css`
- `assets/devtour.js`
- `assets/reference.js`
- `basic.html`
- `index.html`
- `links.html`
- `play.html`
- `sw.js`
- `tools/generate-reference-index.mjs`
