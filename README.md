# EmulatorJS (local build)

A self-contained copy of [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) that runs from local files only:
no CDN, no external requests, ready for GitHub Pages.

## Quick start

1. Copy your core archives (`*.7z`, unchanged) into `data/cores/`.
2. Refresh the core list: `node tools/generate-core-manifest.mjs`
   (a `manifest.json` for the 187 archives supplied with this project is already included).
3. Serve the folder with a local web server: on Windows double-click `start-windows.bat`; elsewhere run
   `python3 serve.py 8000` and open `http://localhost:8000`. Both need Python installed.

Opening `index.html` straight from disk (`file://`) does not work: browsers block ES modules there.

## Publish on GitHub Pages

1. Commit everything, including `data/cores/*.7z` (largest archive is about 8 MB; the whole set is about 284 MB).
2. In the repository: **Settings -> Pages -> Deploy from a branch -> `main` / root**.
3. Open `https://<user>.github.io/<repo>/`.

All paths are relative, so it works in a sub-folder. `.nojekyll` is included so GitHub serves every file as-is.

## Links page and ObsoleteMod

`links.html` (Links on the home page and the game page) lists every part of the site. It includes **ObsoleteMod**
(`obsoletemod/`), the Emu retro game shelf, which runs on this site's EmulatorJSMod engine and cores with no outside
requests. Put its ROMs in `obsoletemod/roms/<system>/` and list them in `obsoletemod/roms/manifest.json`
(see `obsoletemod/README.md`).

## Start page, Basic and the ten use cases

`index.html` is now a start page that offers ten use cases (see `ROADMAP.md` for the 10-phase plan). **Basic**
(`basic.html`) is the full player as it was before. Phase 1, **My Collection** (`collection.html`), keeps your own
game backups in this browser with covers, favourites and play time, and moves the whole collection with its saves
to another device as one zip (Export / Import collection). All ten phases are built. A second pass added duplicate detection by content, shelves, status and notes, your own covers, bulk changes with undo, a list view, keyboard and controller navigation, and exports split into parts.

## Homebrew showcase (phase 2)

`homebrew.html` lists the games in `homebrew/`, and `homebrew.html?game=<folder>` is each game's own page:
screenshots, credits, licence, description, links, a controls table (keyboard key, controller button and touch)
and a Play button. To publish a game, add a folder with the ROM and a `game.json`, or run:

```
node tools/new-homebrew.mjs path/to/game.nes --title "My Game" --author "Me" --license MIT
```

then push. The GitHub workflow rebuilds `homebrew/index.json` (`node tools/generate-homebrew-index.mjs --strict`
checks every folder). All `game.json` fields are described in `homebrew/README.md`. Two small CC0 test programs
(Palette Explorer, Button Check) are included; only add games you made or have permission to share. A second
pass added sorting, genre and tag filters, New badges, author pages and a random pick to the list. Each game page
gained Play here, a picture viewer and trailer, credits and release notes, a checksum check, Add to My Collection,
Download, Share and Embed. Publishing now also writes link-preview share pages and an Atom feed (set the site's
public address in the Site kit for full previews).

## Museum and exhibit kiosk (phase 3)

`kiosk.html` runs a public screen unattended. On first opening, choose the approved games, the time per visitor, the
walk-away reset and a staff PIN, then press **Start kiosk**. The screen shows an attract loop, then a game list,
then a timed game in a locked-down player, and returns to the attract loop on its own. Staff reach the settings
with five quick taps in the top-left corner (or Ctrl+Shift+K) and the PIN. **Prepare for offline** copies the
games and cores into the browser so the kiosk works without a network. **Export settings** writes `kiosk.json`:
import it on another screen, or put it next to `kiosk.html` so new screens start with it. On iPhone and iPad, add
the page to the Home Screen for full screen, and use Guided Access to keep visitors in the app. A second pass added
a second visitor language (six built in), How to play for each game, a visitor sound button, opening hours with a
closed screen, dimming when nobody plays, a game order, Check every game, visitor numbers per game and day with a
CSV download, and screens that follow the site's `kiosk.json`.

## Classroom (phase 4)

`classroom.html` runs a game beside live views of what the console is doing: the picture at its own resolution,
palettes, sprites, the background map, tile drawings, sound channels, memory, frame timing and input, with pause and
frame-by-frame stepping. Six lessons each give a 45-minute plan with "Show me" buttons, a printable worksheet and an
answer key. The views read NES games in most detail; Sprite Lab in `homebrew/sprite-lab/` was written for the lessons.
A second pass added a presenter (step by step, with timers and clicker keys), exit-ticket quizzes, a seventh lesson
on binary and hex, saved moments, watched bytes that can be changed, a byte finder, tile bit planes, how long each
button was held, pictures saved as PNG, and a link for students.

## Web development case study (phase 5)

`devtour.html` is a guided tour of how the site is built: static ES modules, the service worker, cross-origin
isolation, WebAssembly cores, the WebGL picture pipeline, Web Audio, browser storage, input, the phone layout, file
detection and publishing. Each stop shows live values from your device, an excerpt of the real code read from the
site's files, and links to the reference docs. Six exercises (add a hotkey, a platform folder, a homebrew game, a
new game-page field, a service worker update, a lesson) have hints and a **Check my work** button. A second pass
added stops on checksums, iframes and postMessage, one-file branding and accessibility, and exercises for a kiosk
language and branding. It also added highlighted code with Copy, quiz scores, a printable exercise handout, and
reference docs for every file added since they were first written.

## Preservation archive (phase 6)

`archive.html` catalogues public-domain and rights-cleared software. Each record (`archive.html?id=…`, a permanent
link) has its metadata, provenance, licence, media and a citation. Your browser computes the file's CRC32, MD5 and
SHA-1 and compares them with the record before you play it, in place on the page. You can also identify a file you
have, verify every file, and export the catalogue (JSON, CSV, or a zip with every file). To add a record, see
`archive/README.md`, then run `npm run archive` once to record the checksums. The workflow rechecks every file on
each push.

## Accessible and comfort play (phase 7)

`comfort.html` plays a game with comfort options beside it: presets (Relaxed, Low vision, One hand, One switch) and
each option on its own. Game speed, rewind, save anywhere and auto-save; hold-to-toggle buttons, auto-fire and
one-hand keyboards; large touch controls you can move; colour filters; captions and flashes for sounds; and
one-switch scanning (Space, Enter, a tap or any controller button). Settings are remembered per game.

## Community spaces (phase 8)

`community.html` is a locked-down, low-power game launcher for schools, libraries, shelters, hospitals and waiting
rooms. Staff choose the games, opening and quiet hours, a volume limit, turn length and break reminders, and
whether saves are cleared between visitors. **Prepare this device** keeps everything offline in the browser, and
**Download offline package** makes a zip for a laptop with no internet: unzip it and double-click
`START-COMMUNITY.bat` (or run `start-community.sh`); it needs Python 3.

## Events and speedrun practice (phase 9)

`practice.html` splits a game into segments with save points. **Practice** repeats one segment with a frame-accurate
timer and shows each attempt against your best; **Full run** gives splits, personal bests, best segments and sum of
best; **Share** turns a save point into a link; **Race** runs two copies side by side for two players with a
countdown (W A S D and Q to finish, arrow keys and P to finish, or two controllers). Results export as JSON or CSV.

## Build your own arcade (phase 10)

Edit one file, `site.json`, to brand the whole site: name, tagline, logo, colours, which parts and systems are shown,
a start page, featured games and footer links. `kit.html` writes it for you with a live preview, offers starting
points (game jam, creator, class project, museum), and makes a branding pack with a matching app manifest. The same
page has a step-by-step guide to publishing on GitHub Pages and a check for the published file.

## Opening a game file

When you drop or pick a ROM or zip on the Basic page, a Load game dialog shows the detected system (zips are
identified from the game file inside them) and the emulator core, and lets you change both before the game starts.
"Use this core for every ... game" remembers a core for that system, also for games from the library folders.

## 2.5D mode

The **2.5D** button on the home page plays NES and SNES games with depth: level tiles, platforms and characters
become raised, lit blocks with shadows in front of a dimmed background. Shift+F8 switches it in game, and the F1
panel has sliders for block height, shadows, background brightness and highlights (saved per game). `?depth25=1` or
`?depth25=0` on a game address overrides the button. It runs in EmulatorJSMod (`data/src/depth25.js`).

## Phones and iPhone

On phones and small tablets the site switches to a touch layout that follows rotation: portrait puts the game on top
and the controls below, landscape gives the game the whole screen between the controls. The menu button (or the handle
at the top in landscape) opens saves, game choice, engine and on-screen controls. On iPhone, Share > Add to Home Screen
opens the site full screen. Browser mode in the home page options (or `?view=phone|desktop|auto`) forces a layout.

## Reference docs

`reference.html` (Reference docs on the home page and the Links page) shows the documents in `reference-docs/`: one page
per project file, an overview and an asset index, with a filter box. After adding or renaming documents run
`node tools/generate-reference-index.mjs` (the GitHub workflow does it on push).

## Engines

When the site opens you choose the emulation engine (asked once per browser session unless you tick "Remember"):

| | EmulatorJSMod | NostalgistMod |
| --- | --- | --- |
| Code | `engines/EmulatorJSMod.js` → `data/loader.js`, `data/src` | `engines/NostalgistMod.js` (Nostalgist.js, MIT) |
| Interface | EmulatorJS menu bar, settings, touch gamepad, cheats, netplay, F1 hotkey panel | Minimal canvas with a toolbar |
| Systems | Every installed core, threaded ones too (PSP, DOS) | Single-threaded cores only |
| Saves | IndexedDB (`/data/saves`, `EmulatorJS-states`) | IndexedDB (`NostalgistMod-saves`) |

Both use the same `.7z` cores in `data/cores`. Switch with **Change** on the home page or the **Engine** dropdown on the
game page. To rebuild NostalgistMod after editing `tools/nostalgist-mod/src`: `npm i -D esbuild ini` then
`node tools/nostalgist-mod/build.mjs`.

## Game library

Put ROMs or zips in the platform folders inside `data/`:

| Folder | Platform |
| --- | --- |
| `data/A2600` | Atari 2600 |
| `data/GB` | Game Boy |
| `data/GBC` | Game Boy Color |
| `data/GG` | Sega Game Gear |
| `data/NES` | Nintendo Entertainment System |
| `data/SNES` | Super Nintendo |
| `data/N64` | Nintendo 64 |

The home page lists them once the cores have loaded. GitHub Pages cannot list folders, so each folder has an
`index.json`: on GitHub the workflow in `.github/workflows/update-indexes.yml` rebuilds it after every push
(Settings → Actions → General must allow workflows to run). Locally, `start-windows.bat` / `serve.py` show new files
straight away; otherwise run `node tools/generate-rom-index.mjs`. Add more platforms in `data/platforms.json`.
Only add games you have the right to share: the site is public.

## Using it

- Click a game in the library, a recent game, or drop a ROM on the page (a BIOS and an IPS/BPS/UPS patch can be
  dropped with it). Games open on `play.html`, which has a **Home** link and **Platform** / **Game** dropdowns to
  switch games.
- The system is found from the folder, the extension, the file header, or the names inside a zip.
- Hover any option (or tap its **?**) for a short explanation. **What's changed from the original EmulatorJS** opens
  `ENHANCEMENTS.txt` with every change.
- In game, press **F1** for hotkeys and options: F2 save, F4 load, F3 slot, F5 pause, F6 fast forward,
  F8 screenshot, Shift+F8 2.5D view, Shift+F2 save slots with pictures, F9 mute, Shift+F9 performance mode, F10 FPS, Shift+F10 performance stats, F11 fullscreen. On a controller, hold Select and press R1/L1/R2/L2/Start.
- **Options → Export backup** saves all in-game saves, save states and settings to one file.
- `play.html` on its own is the game library inside the player (either engine): every ROM and zip in the folders,
  one click to play. `play.html?folder=NES` shows one folder, `&autoplay=1` starts its first game.
- Performance (EmulatorJSMod, F1 panel): performance mode, render resolution, audio latency, run-ahead, low-latency
  canvas, a picture-sized render buffer (draws only the game picture, 26–65% fewer pixels), audio suspended while paused or in the background, a lean opaque game
  surface (no blending with the page, no unused depth/stencil buffers on 2D systems) and a low-battery
  power saver, saved per game. See the addenda in ENHANCEMENTS.txt.
- Links: `play.html?folder=NES&file=Game.nes`, `play.html?url=roms/game.nes&core=nes`; old `index.html?rom=` (forwarded to Basic)
  links still work.

## Threads on GitHub Pages

Threaded cores (PSP and DOS need them, others run faster with them) require `SharedArrayBuffer`, which needs
two response headers GitHub Pages cannot send. `sw.js` adds them on the first visit: the page reloads once,
then **Options -> Threads** is available. This needs https (or `localhost`).

The service worker also caches the app and recently used cores so repeat visits and offline use are fast.
If you change files in `data/` or `assets/`, bump `VERSION` in `sw.js` so visitors pick the change up at once.

## Cores

Core archives are used exactly as built: `<core>[-thread][-legacy]-wasm.7z`. The loader picks the best
variant that exists (threaded if enabled, WebGL2 or legacy WebGL1) and falls back to a variant that is present.
Run `node tools/generate-core-manifest.mjs` whenever cores are added, removed or updated; the file sizes in the
manifest are used as cache-busting versions.

## Optional: minified build

`npm install && npm run minify` writes `data/emulator.min.js` and `.css`. Set `window.EJS_useMinified = true`
before loading `data/loader.js` to use them.

## License

EmulatorJS is licensed under GPL-3.0 (see `LICENSE`). Keep that file and the license notices when you publish
a copy. Cores are built from other projects under their own licenses (each archive contains `license.txt`).
Only host ROMs and BIOS files you have the right to share.
