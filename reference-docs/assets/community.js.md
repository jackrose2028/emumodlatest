# `community.js`

| | |
|---|---|
| **Path** | `assets/community.js` |
| **Category** | Page script (use case 8) |
| **Size** | 36.8 KB |
| **Lines** | 728 |

## What it is

The module behind `community.html`.

## How it works

- Opening hours and quiet hours (with a lower volume limit), a turn length and break reminders.
- Each turn ends when the visitor walks away; their saves (`EmulatorJS-states`, `/data/saves`) can be cleared for the next person.
- Offline copies in Cache Storage `ejs-community-files`; an offline package zip with the site, games, cores and settings.
- Low-power mode through `EJS_perfOverride`.

## Why it exists

Shared devices in public places need limits, privacy between visitors and no staff time.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `community.html`
- `sw.js`
