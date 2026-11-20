# Ten use cases, ten phases

The start page (`index.html`) offers the ten use cases below. **Basic** (`basic.html`) is the full player as it was
before, and stays available. Each phase adds one use case as its own page, built on the same engines, cores, saves,
phone layout and offline support, and leaves the others untouched.

Status: **All ten phases are done.**

| Phase | Use case | Page | Status |
|---|---|---|---|
| 1 | My Collection | `collection.html` | Done |
| 2 | Homebrew showcase | `homebrew.html` | Done |
| 3 | Museum and exhibit kiosk | `kiosk.html` | Done |
| 4 | Classroom: how retro games work | `classroom.html` | Done |
| 5 | Web development case study | `devtour.html` | Done |
| 6 | Preservation archive | `archive.html` | Done |
| 7 | Accessible and comfort play | `comfort.html` | Done |
| 8 | Community spaces | `community.html` | Done |
| 9 | Events and speedrun practice | `practice.html` | Done |
| 10 | Build your own arcade | `kit.html` + `site.json` | Done |

## Phase 1: My Collection (done)
Goal: a person's own game backups in one place on every device they use.
- Add games by file, by whole folder (desktop) or by dropping files and folders on the page.
- Every file is reviewed before it is stored: detected system (zips are read from the inside), core, and a choice
  where detection is unsure; non-game files are left out; re-adding a game updates it instead of duplicating it.
- A grid with covers taken from the game itself after 25 seconds of play, favourites, play time, last played,
  search, sorting and filters by system; details to rename, change system or core, or remove.
- Export collection: one zip with the games, covers, details and every save; Import collection restores it on
  another device. Storage use is shown, and the browser is asked to keep the collection.
- Done when: games added on one device can be exported, imported on another, and continued from their saves.
- Second pass: duplicates by SHA-1, games recognised from the showcase and archive, shelves, status, notes, own
  covers, select mode with bulk changes and undo, list view, Continue playing, Surprise me, keyboard and controller
  navigation, a space check, adding the Basic page's recent games, and exports in parts with multi-file import.

## Phase 2: Homebrew showcase (done)
Goal: homebrew developers publish a playable page per game.
- `homebrew/<game>/game.json` (title, author, year, licence, controls, description, links, screenshots) plus the ROM.
- A showcase grid and a game page with credits, controls drawn for keyboard, controller and touch, and Play.
- A small generator script (`tools/new-homebrew.mjs`) and a GitHub workflow that lists the games.
- Done when: adding a folder with `game.json` and a ROM publishes a working game page.
- Shipped with two small CC0 test programs (Palette Explorer and Button Check) so the showcase is never empty;
  `tools/generate-homebrew-index.mjs --strict` checks every folder and fails the build on a broken one.
- Second pass (round 28): sort, genre and tag filters, New badges, author pages, a random pick; on a game page Play
  here, a picture viewer and trailer, credits, release notes, a checksum check, Add to My Collection, Share and
  Embed; share pages with link previews, an Atom feed and stricter checks when publishing.

## Phase 3: Museum and exhibit kiosk (done)
Goal: unattended public screens.
- Kiosk mode: full screen, an approved playlist, attract mode (rotating games and captions when idle), a session
  time limit, reset to the start screen after inactivity, all browser and site menus hidden.
- A hidden staff gesture plus PIN for settings; large touch controls; works offline after setup.
- Done when: a kiosk runs a day unattended, recovering from idle, errors and reloads on its own.
- Built as: each visitor's game runs in a fresh frame (`play.html?kiosk=1`) that is thrown away afterwards; a game
  that fails to start is skipped, a nightly restart and a restart every 100 sessions keep memory fresh, and the
  approved games and cores live in their own offline cache that survives site updates.
- Second pass (round 29): a second visitor language, How to play, a visitor sound button, a one-minute warning,
  opening hours, dimming, a game order, a check of every game, settings that close by themselves, visitor numbers
  per game and day (CSV), and screens managed from the site's `kiosk.json`.

## Phase 4: Classroom: how retro games work (done)
Goal: lessons beside a running game.
- Live views: colour palette in use, sprite and tile counts, screen resolution, frame timing, input as it happens;
  pause and step frame by frame; side-by-side "what the console sees" and "what you see".
- Lesson cards (palettes, sprites, scrolling, sound channels, memory limits) with printable worksheets.
- Done when: a teacher can run a 45-minute lesson from the page without other material.
- Built as: six lessons (palettes, sprites, tiles and scrolling, sound channels, memory, frames and input), each a
  45-minute plan with "Show me" steps, key facts, questions, and a worksheet with an answer key. NES games are read
  from the console's own memory (palette RAM, sprite list, nametables, scroll, sound registers, RAM); other systems
  get the picture-based views. A teaching program, Sprite Lab (CC0, source included), was added to homebrew/.
- Second pass (round 30): a presenter with step and lesson clocks, exit tickets, a seventh lesson (binary and hex),
  saved moments, watched and changeable bytes, a byte finder, tile bit planes, button hold times, PNG pictures and a
  link for students.

## Phase 5: Web development case study (done)
Goal: the site itself as a teaching example.
- A guided tour: service worker and cross-origin isolation, WebGL picture pipeline, IndexedDB storage, threads,
  responsive phone layout; each stop shows the live value on this device and links to the reference docs.
- Exercises with hints (for example "add a hotkey", "add a platform folder").
- Done when: a learner can follow the tour and complete the exercises with only this site.
- Built as: 11 stops with live measurements, code excerpts read from the site's own files (always current),
  reference-doc links and a self-check each; 6 exercises with hints and an automatic "Check my work".
- Second pass (round 31): 15 stops (checksums, iframes and postMessage, branding, accessibility), 8 exercises (a
  kiosk language, branding), checks that no longer go stale, highlighted code, quiz scores, an exercise handout,
  and 38 new reference docs.

## Phase 6: Preservation archive (done)
Goal: playable catalogue records for public-domain and rights-cleared software.
- Records with title, publisher, year, platform, provenance, licence, checksums (CRC32, MD5, SHA-1) checked in the
  browser, notes and media; search and filters; a permanent link per record; export of the catalogue.
- Done when: every record can be verified (checksum match) and played from its page.
- Built as: records in `archive/<folder>/record.json`; the generator records and rechecks checksums (the workflow
  fails on a mismatch); the page checks CRC32, MD5 and SHA-1 in the browser and plays in place. Only public-domain,
  freely licensed or permission-documented software is accepted.

## Phase 7: Accessible and comfort play (done)
Goal: one place for options that make games playable for more people.
- Presets (relaxed, low vision, one hand, one switch) combining slow motion, rewind, save anywhere, auto-fire,
  hold-to-toggle buttons, larger and movable touch controls, high-contrast and colour-blind filters, captions for
  sound cues where possible; per-game memory of the preset.
- Done when: each preset is usable end to end with keyboard only, touch only and a single switch.
- Built as: the page sits on the emulator's input function, so hold-to-toggle, auto-fire and one-switch rules apply
  to every input source; the comfort touch pad, filters, captions (from the NES sound chip, or from the sound for
  other systems) and settings live in the page around the embedded player.

## Phase 8: Community spaces (done)
Goal: schools, shelters, hospitals and waiting rooms on old or donated devices.
- A locked-down launcher with a curated list, time-of-day rules, volume limit, low-power defaults, automatic
  clearing of saves between users if wanted, and an offline package for devices without internet.
- Done when: an old laptop or Chromebook runs it offline for a day with nothing to configure by visitors.
- Built as: a launcher with time rules, volume limits, turns that end on their own and saves cleared between
  visitors; offline through its own cache on the device, or an offline package (site, games, cores, settings,
  start scripts) that opens straight into the launcher.

## Phase 9: Events and speedrun practice (done)
Goal: community nights and practice.
- Shareable links that open a game at a chosen save point, practice save points, an on-screen timer with splits,
  personal bests per segment, a "race" view for two players on one screen, results export.
- Done when: a runner can practise a segment repeatedly and see split times improve.
- Built as: a timer counted in console frames, segments with save points kept in the browser, practice attempts
  with best and improvement, full runs with PB, golds and sum of best, save points shared in a link, two-player
  races on one screen with separate input, JSON and CSV export.

## Phase 10: Build your own arcade (done)
Goal: brand and publish the site for a creator, a game jam or an educational project.
- One `site.json` (name, colours, logo, which use cases and systems to show, featured games) applied across the
  pages; a setup page that writes it; a guide for publishing on GitHub Pages.
- Done when: a new site can be branded and published by editing one file.
- Built as: site.json read on every page by early-view.js (cached so colours apply before the first paint); the
  kit page writes it with presets, a live preview of the real pages, checks, a branding pack and a publishing guide.

## Content rule for every phase
Public pages should only carry homebrew, public-domain or properly licensed games. Personal backups belong in My
Collection on the player's own device, not in a public repository.
