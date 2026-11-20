# `kit.js`

| | |
|---|---|
| **Path** | `assets/kit.js` |
| **Category** | Page script (use case 10) |
| **Size** | 17.3 KB |
| **Lines** | 274 |

## What it is

The module behind `kit.html`.

## How it works

- Fills the form from `site.json` or a starting design; checks colours, the logo, the public address (must start with `https://`) and featured games.
- Previews real pages with `?site=` so nothing is saved.
- Writes `site.json` and a branding pack (site.json, logo, manifest).

## Why it exists

Branding without editing code or JSON by hand.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/devtour.js`
- `kit.html`
- `sw.js`
