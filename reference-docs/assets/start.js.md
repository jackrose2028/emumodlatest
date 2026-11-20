# `start.js`

| | |
|---|---|
| **Path** | `assets/start.js` |
| **Category** | Page script (start page) |
| **Size** | 6.4 KB |
| **Lines** | 118 |

## What it is

The module behind `index.html`, the start page of the ten use cases.

## How it works

- Offers each use case (and Basic), with the last choice as Continue.
- Applies `site.json`: name, tagline, logo, which tiles show, featured games and footer.
- Old links (`index.html?rom=…`) are sent to the Basic page; registers the service worker.

## Why it exists

One clear front door to everything the site does.

## Referenced by

Files in this project that mention this asset by name or path:

- `assets/devtour.js`
- `index.html`
- `sw.js`
