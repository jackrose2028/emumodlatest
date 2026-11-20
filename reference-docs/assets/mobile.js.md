# `mobile.js`

| | |
|---|---|
| **Path** | `assets/mobile.js` |
| **Category** | Shared module |
| **Size** | 5.0 KB |
| **Lines** | 107 |

## What it is

Works out what the visitor is on and keeps the `<html>` classes and CSS variables up to date.

## How it works

- `device` holds the facts (touch, iOS, Android, standalone); `isPhoneView()` and `viewSetting()` follow the Browser mode option and `?view=`.
- `initDevice()` sets `m-phone`, `m-touch`, `m-portrait` … and `--app-h` (the real visible height), and follows rotation and resizing.
- `assets/early-view.js` applies the same rules before the first paint.

## Why it exists

One set of pages works on phones, tablets and computers.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/app.css`
- `assets/app.js`
- `assets/archive.js`
- `assets/classroom.js`
- `assets/collection.js`
- `assets/comfort.js`
- `assets/community.js`
- `assets/devtour.js`
- `assets/early-view.js`
- `assets/homebrew.js`
- `assets/kiosk.js`
- `assets/kit.js`
- `assets/nostalgist-player.js`
- `assets/play.js`
- `assets/practice.js`
- `assets/reference.js`
- `assets/start.js`
- `links.html`
- `sw.js`
