# `early-view.js`

| | |
|---|---|
| **Path** | `assets/early-view.js` |
| **Category** | Shared script (classic, in <head>) |
| **Size** | 5.6 KB |
| **Lines** | 82 |

## What it is

A small classic script loaded in every page's `<head>`, before the stylesheet, so the first paint is already right.

## How it works

- Phone view: sets `m-phone`, `m-touch`, `m-ios` and friends on `<html>` (then `assets/mobile.js` keeps them up to date).
- Branding: applies the colours of the last `site.json` as CSS variables (`--accent`, `--primary`, `--bg`, `--card`, `--text`, `--muted`, `--line`), then fetches the file fresh; `window.EJS_SITE_READY` resolves with it.
- `?site=<base64url JSON>` previews a design for one page load; pages turned off in `uses` send the visitor to the start page.

## Why it exists

Without it, phones and branded sites would flash the wrong layout or colours for a moment.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `ROADMAP.md`
- `archive.html`
- `assets/devtour.js`
- `assets/kit.js`
- `basic.html`
- `classroom.html`
- `collection.html`
- `comfort.html`
- `community.html`
- `devtour.html`
- `homebrew.html`
- `index.html`
- `kiosk.html`
- `kit.html`
- `links.html`
- `play.html`
- `practice.html`
- `reference.html`
- `sw.js`
