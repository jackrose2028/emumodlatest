# Asset index

**ROM evaluation:** [02-ROM-EVALUATION-GameEvauationTestGame.md](02-ROM-EVALUATION-GameEvauationTestGame.md) (full evaluation of the supplied SNES ROM)

179 assets, one reference document each. Each link opens the document that mirrors the asset's path.

## (project root)

| Asset | Category | Summary |
|---|---|---|
| [`.gitattributes`](.gitattributes.md) | Git configuration | Line-ending and binary rules for Git |
| [`.gitignore`](.gitignore.md) | Git configuration | Files Git should ignore: `node_modules/`, `dist/`, `data/emulator.min.*`, `.DS_Store`, `*.tgz` |
| [`.nojekyll`](.nojekyll.md) | Hosting marker | An empty file |
| [`archive.html`](archive.html.md) | Page (use case 6) | The Preservation archive: catalogue records with provenance, licences and checksums, playable in place |
| [`basic.html`](basic.html.md) | Page (player launcher) | The full player as it was before the start page: library, recent games, drop a file, options |
| [`CHANGES.md`](CHANGES.md.md) | Documentation | The release-style changelog in Markdown (about 50 KB) |
| [`classroom.html`](classroom.html.md) | Page (use case 4) | Classroom: a running game beside live views of what the console is doing, with lessons |
| [`collection.html`](collection.html.md) | Page (use case 1) | My Collection: the player's own game backups, with covers, shelves and one-file export |
| [`comfort.html`](comfort.html.md) | Page (use case 7) | Accessible and comfort play: presets and options for speed, rewind, buttons, touch, colour, captions, one switch |
| [`community.html`](community.html.md) | Page (use case 8) | Community spaces: a locked-down, low-power launcher with opening hours, volume limits and fresh saves |
| [`devtour.html`](devtour.html.md) | Page (use case 5) | Web development case study: a guided tour of how this site works, with live values and exercises |
| [`ENHANCEMENTS.txt`](ENHANCEMENTS.txt.md) | Documentation | A long plain-text change log (about 34 KB) that lists every difference between this edition and the original EmulatorJS 4.3.0-pre source |
| [`homebrew.html`](homebrew.html.md) | Page (use case 2) | Homebrew showcase: a page per homebrew game, with credits, controls, play in place, share and embed |
| [`index.html`](index.html.md) | Page (entry point) | The home page of the site |
| [`kiosk.html`](kiosk.html.md) | Page (use case 3) | Museum and exhibit kiosk: attract loop, approved games, timed sessions, opening hours, staff PIN |
| [`kit.html`](kit.html.md) | Page (use case 10) | Site kit: writes site.json with a live preview, a branding pack and a publishing guide |
| [`LICENSE`](LICENSE.md) | Legal | The full text of the GNU General Public License version 3 (GPL-3.0) |
| [`links.html`](links.html.md) | Page (links) | Every part of the site in one list, including ObsoleteMod and the reference docs |
| [`manifest.webmanifest`](manifest.webmanifest.md) | Web app configuration | A Progressive Web App manifest named "EmulatorJS" (standalone display, dark `#111418` theme, `docs/Logo.png` as the icon) |
| [`package.json`](package.json.md) | Build configuration | The npm manifest for the project (name `emulatorjs-local`, version `4.3.0-local`, `type: module`, private, GPL-3.0) |
| [`play.html`](play.html.md) | Page (game player) | The game page |
| [`practice.html`](practice.html.md) | Page (use case 9) | Events and speedrun practice: segments, a frame timer, full runs with splits, shared save points, races |
| [`README.md`](README.md.md) | Documentation | The project's main readme |
| [`reference.html`](reference.html.md) | Page (reference docs viewer) | Viewer for the reference docs: one document per project file, rendered locally |
| [`ROADMAP.md`](ROADMAP.md.md) | Documentation | The ten use cases and their phases, each marked done, with what each second pass added |
| [`serve.py`](serve.py.md) | Local server script | A tiny Python 3 development web server built on `http.server` |
| [`site.json`](site.json.md) | Settings file (branding) | Name, logo, colours, use cases, systems, featured games and public address of this copy of the site |
| [`start-windows.bat`](start-windows.bat.md) | Local server script | A Windows double-click launcher for `serve.py` |
| [`sw.js`](sw.js.md) | Service worker | The site's service worker (its cache version changes with every release) |

## .github

| Asset | Category | Summary |
|---|---|---|
| [`.github/workflows/update-indexes.yml`](.github/workflows/update-indexes.yml.md) | CI workflow | A GitHub Actions workflow named "Update game and core indexes" |

## assets

| Asset | Category | Summary |
|---|---|---|
| [`assets/app.css`](assets/app.css.md) | Stylesheet | The dark-theme stylesheet shared by `index.html` and `play.html` (about 9 KB) |
| [`assets/app.js`](assets/app.js.md) | Launcher script (home page) | The ES module that powers `index.html` (about 20 KB) |
| [`assets/archive.js`](assets/archive.js.md) | Page script (use case 6) | Catalogue, record pages, in-browser checksum checks and identifying a file for the Preservation archive |
| [`assets/backup.js`](assets/backup.js.md) | Launcher shared module | Export and import of all player progress as one JSON file |
| [`assets/catalog.js`](assets/catalog.js.md) | Shared module | One list of every game the site can offer (showcase, library folders, My Collection) for pages that pick games |
| [`assets/classroom.js`](assets/classroom.js.md) | Page script (use case 4) | Live views of a running game (palette, sprites, tiles, sound, memory, timing, input), lessons and the presenter |
| [`assets/collection-store.js`](assets/collection-store.js.md) | Shared module | IndexedDB storage for My Collection: games, files, covers, play time, SHA-1 lookups |
| [`assets/collection.js`](assets/collection.js.md) | Page script (use case 1) | My Collection: grid and list, shelves, status, notes, covers, select mode with undo, export and import |
| [`assets/comfort.js`](assets/comfort.js.md) | Page script (use case 7) | Comfort rules on the emulator's input (hold-to-toggle, auto-fire, one switch), speed, filters, captions |
| [`assets/common.js`](assets/common.js.md) | Launcher shared module | Helpers shared by the home page and the game page |
| [`assets/community.js`](assets/community.js.md) | Page script (use case 8) | Community launcher: hours, quiet hours, volume cap, turns, clearing saves, offline package |
| [`assets/detect.js`](assets/detect.js.md) | Launcher shared module | Figures out which console a dropped file belongs to |
| [`assets/devtour.js`](assets/devtour.js.md) | Page script (use case 5) | Tour stops with live values and real code, exercises with checks, quizzes, progress and a handout |
| [`assets/early-view.js`](assets/early-view.js.md) | Shared script (classic, in <head>) | Sets phone-view classes and site.json colours before the first paint; gates pages turned off |
| [`assets/folders.js`](assets/folders.js.md) | Launcher shared module | Finds the games stored in the site's `data/<FOLDER>/` directories |
| [`assets/hashes.js`](assets/hashes.js.md) | Shared module | CRC32, MD5 and SHA-1 of a file in the browser, read in 4 MB pieces |
| [`assets/homebrew.js`](assets/homebrew.js.md) | Page script (use case 2) | Showcase list and game pages: filters, play in place, gallery, checksums, Add to My Collection, share, embed |
| [`assets/kiosk.js`](assets/kiosk.js.md) | Page script (use case 3) | Kiosk: attract loop, game list, timed sessions, languages, opening hours, staff settings, visitor numbers |
| [`assets/kit.js`](assets/kit.js.md) | Page script (use case 10) | Site kit: form for site.json with checks, live preview and output |
| [`assets/lessons.js`](assets/lessons.js.md) | Content module | The Classroom's seven lessons: plans, Show me steps, facts, questions, worksheets, exit tickets |
| [`assets/library.js`](assets/library.js.md) | Launcher shared module | The 'Recent games' store |
| [`assets/mobile.js`](assets/mobile.js.md) | Shared module | Phone and tablet view: device facts, html classes, --app-h, rotation |
| [`assets/nostalgist-player.js`](assets/nostalgist-player.js.md) | Engine adapter (player) | The game-page player for the NostalgistMod engine |
| [`assets/play.js`](assets/play.js.md) | Launcher script (game page) | The ES module for `play.html` (about 15 KB) |
| [`assets/practice.js`](assets/practice.js.md) | Page script (use case 9) | Speedrun practice: segments, frame timer, runs with splits, shared save points, two-player races |
| [`assets/reference.js`](assets/reference.js.md) | Page script (reference docs) | Renders the reference docs with local marked and DOMPurify |
| [`assets/start.js`](assets/start.js.md) | Page script (start page) | The start page: use case tiles, Continue, site branding and featured games |
| [`assets/tooltips.js`](assets/tooltips.js.md) | Launcher shared module | Tiny tooltip system for any element with a `data-tip` attribute |
| [`assets/touch-pad.js`](assets/touch-pad.js.md) | Shared module | On-screen controller for NostalgistMod on phones: multi-touch, sliding between buttons, vibration |

## data

| Asset | Category | Summary |
|---|---|---|
| [`data/A2600/README.txt`](data/A2600/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/A2600/` game folder (Atari 2600) |
| [`data/A2600/index.json`](data/A2600/index.json.md) | Data (generated) | The game list for `data/A2600/` |
| [`data/GB/README.txt`](data/GB/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/GB/` game folder (Game Boy) |
| [`data/GB/index.json`](data/GB/index.json.md) | Data (generated) | The game list for `data/GB/` |
| [`data/GBC/README.txt`](data/GBC/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/GBC/` game folder (Game Boy Color) |
| [`data/GBC/index.json`](data/GBC/index.json.md) | Data (generated) | The game list for `data/GBC/` |
| [`data/GG/README.txt`](data/GG/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/GG/` game folder (Sega Game Gear) |
| [`data/GG/index.json`](data/GG/index.json.md) | Data (generated) | The game list for `data/GG/` |
| [`data/N64/README.txt`](data/N64/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/N64/` game folder (Nintendo 64) |
| [`data/N64/index.json`](data/N64/index.json.md) | Data (generated) | The game list for `data/N64/` |
| [`data/NES/README.txt`](data/NES/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/NES/` game folder (Nintendo Entertainment System) |
| [`data/NES/index.json`](data/NES/index.json.md) | Data (generated) | The game list for `data/NES/` |
| [`data/SNES/README.txt`](data/SNES/README.txt.md) | Documentation (game folder) | Placeholder instructions for the `data/SNES/` game folder (Super Nintendo) |
| [`data/SNES/index.json`](data/SNES/index.json.md) | Data (generated) | The game list for `data/SNES/` |
| [`data/compression/extract7z.js`](data/compression/extract7z.js.md) | Web worker (vendored) | A 7-Zip extractor (about 280 KB) that runs as a web worker |
| [`data/compression/extractzip.js`](data/compression/extractzip.js.md) | Web worker (vendored) | A zip extractor (about 196 KB) run as a web worker |
| [`data/compression/libunrar.js`](data/compression/libunrar.js.md) | Web worker (vendored) | Emscripten JavaScript glue (about 67 KB) for the UnRAR library |
| [`data/compression/libunrar.wasm`](data/compression/libunrar.wasm.md) | Binary (WebAssembly) | The compiled UnRAR decompressor (about 174 KB) |
| [`data/cores/README.md`](data/cores/README.md.md) | Documentation | Instructions for the (here empty) `data/cores/` folder |
| [`data/cores/manifest.json`](data/cores/manifest.json.md) | Data (generated) | Index of the supplied core archives (about 18 KB) |
| [`data/emulator.css`](data/emulator.css.md) | Stylesheet | The EmulatorJS player's stylesheet (about 38 KB) |
| [`data/loader.js`](data/loader.js.md) | Engine bootstrap | The script that boots EmulatorJS |
| [`data/localization/ar.json`](data/localization/ar.json.md) | Localization | Arabic translation of the EmulatorJS player interface (`ar`) |
| [`data/localization/bn.json`](data/localization/bn.json.md) | Localization | Bengali translation of the EmulatorJS player interface (`bn`) |
| [`data/localization/de.json`](data/localization/de.json.md) | Localization | German translation of the EmulatorJS player interface (`de`) |
| [`data/localization/el.json`](data/localization/el.json.md) | Localization | Greek translation of the EmulatorJS player interface (`el`) |
| [`data/localization/en.json`](data/localization/en.json.md) | Localization | English translation of the EmulatorJS player interface (`en`) |
| [`data/localization/es.json`](data/localization/es.json.md) | Localization | Spanish translation of the EmulatorJS player interface (`es`) |
| [`data/localization/fa.json`](data/localization/fa.json.md) | Localization | Persian (Farsi) translation of the EmulatorJS player interface (`fa`) |
| [`data/localization/fr.json`](data/localization/fr.json.md) | Localization | French translation of the EmulatorJS player interface (`fr`) |
| [`data/localization/hi.json`](data/localization/hi.json.md) | Localization | Hindi translation of the EmulatorJS player interface (`hi`) |
| [`data/localization/it.json`](data/localization/it.json.md) | Localization | Italian translation of the EmulatorJS player interface (`it`) |
| [`data/localization/ja.json`](data/localization/ja.json.md) | Localization | Japanese translation of the EmulatorJS player interface (`ja`) |
| [`data/localization/jv.json`](data/localization/jv.json.md) | Localization | Javanese translation of the EmulatorJS player interface (`jv`) |
| [`data/localization/km.json`](data/localization/km.json.md) | Localization | Khmer translation of the EmulatorJS player interface (`km`) |
| [`data/localization/ko.json`](data/localization/ko.json.md) | Localization | Korean translation of the EmulatorJS player interface (`ko`) |
| [`data/localization/pt.json`](data/localization/pt.json.md) | Localization | Portuguese translation of the EmulatorJS player interface (`pt`) |
| [`data/localization/retroarch.json`](data/localization/retroarch.json.md) | Localization (reference data) | A list of about 615 RetroArch core-option identifiers (keys like `fceumm region`) with matching display text |
| [`data/localization/ro.json`](data/localization/ro.json.md) | Localization | Romanian translation of the EmulatorJS player interface (`ro`) |
| [`data/localization/ru.json`](data/localization/ru.json.md) | Localization | Russian translation of the EmulatorJS player interface (`ru`) |
| [`data/localization/tr.json`](data/localization/tr.json.md) | Localization | Turkish translation of the EmulatorJS player interface (`tr`) |
| [`data/localization/ua.json`](data/localization/ua.json.md) | Localization | Ukrainian translation of the EmulatorJS player interface (`ua`) |
| [`data/localization/ur.json`](data/localization/ur.json.md) | Localization | Urdu translation of the EmulatorJS player interface (`ur`) |
| [`data/localization/vi.json`](data/localization/vi.json.md) | Localization | Vietnamese translation of the EmulatorJS player interface (`vi`) |
| [`data/localization/zh.json`](data/localization/zh.json.md) | Localization | Chinese translation of the EmulatorJS player interface (`zh`) |
| [`data/platforms.json`](data/platforms.json.md) | Data (configuration) | The list of game-library platforms: A2600, GB, GBC, GG, NES, SNES, N64 |
| [`data/src/GameManager.js`](data/src/GameManager.js.md) | Engine core module | `EJS_GameManager`: the bridge between JavaScript and the compiled RetroArch core |
| [`data/src/cache.js`](data/src/cache.js.md) | Engine core module | Download manager and persistent cache (about 40 KB) |
| [`data/src/compression.js`](data/src/compression.js.md) | Engine core module | `EJS_COMPRESSION`: archive detection and extraction |
| [`data/src/consts.js`](data/src/consts.js.md) | Engine core module | Constant tables |
| [`data/src/emulator.js`](data/src/emulator.js.md) | Engine core module | The main `EmulatorJS` class (about 122 KB) |
| [`data/src/enhancements.js`](data/src/enhancements.js.md) | Engine feature module (added by this edition) | `EJS_Enhancements`: play-session features layered on the core player (about 27 KB) |
| [`data/src/frontend.js`](data/src/frontend.js.md) | Engine UI module | `EJS_Frontend`: all user-interface code of the player (the biggest file, about 216 KB) |
| [`data/src/gamepad.js`](data/src/gamepad.js.md) | Engine core module | `GamepadHandler`: event layer over the browser Gamepad API |
| [`data/src/license.js`](data/src/license.js.md) | Engine data module | Exports the GPL-3.0 text as the string `EJS_license` |
| [`data/src/netplay.js`](data/src/netplay.js.md) | Engine feature module | `Netplay`: WebRTC multiplayer (about 88 KB) |
| [`data/src/performance.js`](data/src/performance.js.md) | Engine feature module (added by this edition) | `EJS_Performance`: measurement and tuning features (about 21 KB) |
| [`data/src/setup.js`](data/src/setup.js.md) | Engine core module | `EJS_SETUP`: small configuration normaliser run at startup |
| [`data/src/shaders.js`](data/src/shaders.js.md) | Engine data module | `EJS_SHADERS`: a dictionary of 13 built-in video shaders (about 140 KB) |
| [`data/src/storage.js`](data/src/storage.js.md) | Engine core module | `EJS_STORAGE` (IndexedDB key-value wrapper) and `EJS_DUMMYSTORAGE` (no-op) |
| [`data/src/utils.js`](data/src/utils.js.md) | Engine core module | Utility functions |
| [`data/src/vendor/nipplejs.js`](data/src/vendor/nipplejs.js.md) | Third-party library | nipplejs, a virtual joystick library (minified) |
| [`data/src/vendor/socket.io.min.js`](data/src/vendor/socket.io.min.js.md) | Third-party library | Socket.IO client v4.8.1 (MIT, Guillermo Rauch), minified |
| [`data/version.json`](data/version.json.md) | Data (configuration) | Version marker: `version: "4.2.3"` and a legacy `current_version: 999999` |

## docs

| Asset | Category | Summary |
|---|---|---|
| [`docs/CACHING.md`](docs/CACHING.md.md) | Documentation | Design document for EmulatorJS's caching system (about 16 KB) |
| [`docs/Logo-light.png`](docs/Logo-light.png.md) | Image | Light version of the logo, 500×500 RGBA PNG |
| [`docs/Logo.png`](docs/Logo.png.md) | Image | The EmulatorJS logo, 500×500 RGBA PNG (dark-background version) |
| [`docs/Logo.svg`](docs/Logo.svg.md) | Image | Vector (SVG) version of the logo, 500×500 with CSS classes for the colours (`#0098c5`, `#0b3351`…) |
| [`docs/contributors.json`](docs/contributors.json.md) | Data | Machine-readable contributor lists: an `ignore` list of logins and a `missing` list with contributions, avatar URL and profile URL |
| [`docs/contributors.md`](docs/contributors.md.md) | Documentation | Credits page for upstream EmulatorJS contributors (owner Ethan O'Brien and others), with avatar badges |
| [`docs/emulatorjs-logo-and-type.svg`](docs/emulatorjs-logo-and-type.svg.md) | Image | SVG with the logo plus the 'EmulatorJS' wordmark |
| [`docs/emulatorjs-type.svg`](docs/emulatorjs-type.svg.md) | Image | SVG of the 'EmulatorJS' wordmark only (white fill, 1000×1000 viewBox) |
| [`docs/favicon.ico`](docs/favicon.ico.md) | Image | Multi-size favicon (six images, 16×16 up to 64×64) |
| [`docs/old-Logo.svg`](docs/old-Logo.svg.md) | Image | The previous generation of the logo as SVG (about 174 KB, much more detailed) |

## engines

| Asset | Category | Summary |
|---|---|---|
| [`engines/EmulatorJSMod.js`](engines/EmulatorJSMod.js.md) | Engine adapter | The entry point that lets the site start the full EmulatorJS player (the 'EmulatorJSMod' engine) |
| [`engines/NostalgistMod.js`](engines/NostalgistMod.js.md) | Engine bundle (generated) | A single ~116 KB ES-module bundle of Nostalgist.js (MIT, by arianrhodsandlot), modified to run this site's local EmulatorJS core builds |

## minify

| Asset | Category | Summary |
|---|---|---|
| [`minify/README.md`](minify/README.md.md) | Documentation | Short instructions for the optional minified build |
| [`minify/minify.js`](minify/minify.js.md) | Build script | Node script that produces `data/emulator.min.js` and `data/emulator.min.css` |

## tools

| Asset | Category | Summary |
|---|---|---|
| [`tools/generate-archive-index.mjs`](tools/generate-archive-index.mjs.md) | Build tool (Node) | Writes archive/index.json from every record.json, checking every file's checksums |
| [`tools/generate-core-manifest.mjs`](tools/generate-core-manifest.mjs.md) | Maintenance script | Node script that builds `data/cores/manifest.json` from the `.7z` core archives |
| [`tools/generate-homebrew-index.mjs`](tools/generate-homebrew-index.mjs.md) | Build tool (Node) | Builds homebrew/index.json, the share pages and the Atom feed, checking every game |
| [`tools/generate-reference-index.mjs`](tools/generate-reference-index.mjs.md) | Build tool (Node) | Writes reference-docs/files.json, the list the reference viewer reads |
| [`tools/generate-rom-index.mjs`](tools/generate-rom-index.mjs.md) | Maintenance script | Node script that writes `data/<FOLDER>/index.json` for every platform in `data/platforms.json` |
| [`tools/new-homebrew.mjs`](tools/new-homebrew.mjs.md) | Build tool (Node) | Adds a homebrew game: folder, ROM, game.json and an updated index, in one command |
| [`tools/nostalgist-mod/build.mjs`](tools/nostalgist-mod/build.mjs.md) | Build script | esbuild script that bundles the modified Nostalgist.js TypeScript source into `engines/NostalgistMod.js` |
| [`tools/nostalgist-mod/LICENSE.txt`](tools/nostalgist-mod/LICENSE.txt.md) | Legal | The MIT license text for Nostalgist.js |
| [`tools/nostalgist-mod/src/classes/ejs-input-bridge.ts`](tools/nostalgist-mod/src/classes/ejs-input-bridge.ts.md) | TypeScript source (added by this edition) | `EjsInputBridge`: keyboard and gamepad input for EmulatorJS-built cores |
| [`tools/nostalgist-mod/src/classes/emulator-file-system.ts`](tools/nostalgist-mod/src/classes/emulator-file-system.ts.md) | TypeScript source (core) | `EmulatorFileSystem`: a typed wrapper around the Emscripten in-memory file system |
| [`tools/nostalgist-mod/src/classes/emulator-options.ts`](tools/nostalgist-mod/src/classes/emulator-options.ts.md) | TypeScript source (core) | `EmulatorOptions`: resolves everything the emulator needs before launch |
| [`tools/nostalgist-mod/src/classes/emulator.ts`](tools/nostalgist-mod/src/classes/emulator.ts.md) | TypeScript source (core) | The `Emulator` class (about 30 KB) that actually boots and controls RetroArch in the browser |
| [`tools/nostalgist-mod/src/classes/nostalgist.ts`](tools/nostalgist-mod/src/classes/nostalgist.ts.md) | TypeScript source (core) | The public `Nostalgist` class (about 22 KB), the API that `assets/nostalgist-player.js` uses |
| [`tools/nostalgist-mod/src/classes/resolvable-file.ts`](tools/nostalgist-mod/src/classes/resolvable-file.ts.md) | TypeScript source (core) | `ResolvableFile`: turns almost anything into a file with a name and bytes |
| [`tools/nostalgist-mod/src/constants/core-info.ts`](tools/nostalgist-mod/src/constants/core-info.ts.md) | TypeScript source (data) | A table of about 260 lines describing libretro cores (display name, whether save states, cheats or no-game launch are supported) |
| [`tools/nostalgist-mod/src/constants/keyboard-code-map.ts`](tools/nostalgist-mod/src/constants/keyboard-code-map.ts.md) | TypeScript source (data) | Map from friendly key names (`enter`, `ctrl`, `up`, `numpad…`) to `KeyboardEvent.code` values |
| [`tools/nostalgist-mod/src/constants/system.ts`](tools/nostalgist-mod/src/constants/system.ts.md) | TypeScript source (data) | Default core per system for shortcut launchers: gb/gba/gbc→mgba, megadrive→genesis_plus_gx, nes→fceumm, snes→snes9x |
| [`tools/nostalgist-mod/src/entries/esm.ts`](tools/nostalgist-mod/src/entries/esm.ts.md) | TypeScript source (entry) | The ES-module entry that `build.mjs` bundles into `engines/NostalgistMod.js` |
| [`tools/nostalgist-mod/src/entries/umd.ts`](tools/nostalgist-mod/src/entries/umd.ts.md) | TypeScript source (entry) | UMD-style entry that exports `Nostalgist` as the default export |
| [`tools/nostalgist-mod/src/index.ts`](tools/nostalgist-mod/src/index.ts.md) | TypeScript source (entry) | Package entry |
| [`tools/nostalgist-mod/src/libs/cheats.ts`](tools/nostalgist-mod/src/libs/cheats.ts.md) | TypeScript source (library) | Cheat parsing and normalisation |
| [`tools/nostalgist-mod/src/libs/emscripten.ts`](tools/nostalgist-mod/src/libs/emscripten.ts.md) | TypeScript source (library) | Helpers for the Emscripten module's logging and overrides |
| [`tools/nostalgist-mod/src/libs/emulator-utils.ts`](tools/nostalgist-mod/src/libs/emulator-utils.ts.md) | TypeScript source (library) | Prepares core JavaScript for use as an ES module |
| [`tools/nostalgist-mod/src/libs/options.ts`](tools/nostalgist-mod/src/libs/options.ts.md) | TypeScript source (library) | Default and global options for Nostalgist (about 8 KB) |
| [`tools/nostalgist-mod/src/libs/path-shim.ts`](tools/nostalgist-mod/src/libs/path-shim.ts.md) | TypeScript source (library) | A minimal POSIX `path` implementation (join, dirname, basename, extname, parse, normalize) |
| [`tools/nostalgist-mod/src/libs/set-immediate-polyfill.ts`](tools/nostalgist-mod/src/libs/set-immediate-polyfill.ts.md) | TypeScript source (library) | Polyfill for `setImmediate` using `MessageChannel` (fallback `setTimeout`) |
| [`tools/nostalgist-mod/src/libs/utils.ts`](tools/nostalgist-mod/src/libs/utils.ts.md) | TypeScript source (library) | General helpers: URL basename, valid file names, absolute-URL test, style updater, `delay`, `merge`, abort check, `getResult` for resolvable values, zip signature check |
| [`tools/nostalgist-mod/src/libs/vendors.ts`](tools/nostalgist-mod/src/libs/vendors.ts.md) | TypeScript source (library) | Central export of third-party helpers: `ini` and the local `path` shim |
| [`tools/nostalgist-mod/src/types/nostalgist-options.ts`](tools/nostalgist-mod/src/types/nostalgist-options.ts.md) | TypeScript source (types) | Type definitions for all launch and global options (about 10 KB): core, rom, bios, shader, state, SRAM, cheats, element, size, style, log handler, retroarch config |
| [`tools/nostalgist-mod/src/types/retroarch-command.ts`](tools/nostalgist-mod/src/types/retroarch-command.ts.md) | TypeScript source (types) | Union type of RetroArch network-control commands (`SAVE_STATE`, `LOAD_STATE`, `FAST_FORWARD`, `FULLSCREEN_TOGGLE`, `RESET`, …) |
| [`tools/nostalgist-mod/src/types/retroarch-config/index.ts`](tools/nostalgist-mod/src/types/retroarch-config/index.ts.md) | TypeScript source (types) | Combines all RetroArch config interfaces into one `RetroArchConfig` type |
| [`tools/nostalgist-mod/src/types/retroarch-config/input-player.ts`](tools/nostalgist-mod/src/types/retroarch-config/input-player.ts.md) | TypeScript source (types) | Config keys for each player's controls (`input_player1_a_axis`, `…_mbtn`, gun and analog options…), about 27 KB |
| [`tools/nostalgist-mod/src/types/retroarch-config/input.ts`](tools/nostalgist-mod/src/types/retroarch-config/input.ts.md) | TypeScript source (types) | Config keys for global input hotkeys (e.g |
| [`tools/nostalgist-mod/src/types/retroarch-config/notification.ts`](tools/nostalgist-mod/src/types/retroarch-config/notification.ts.md) | TypeScript source (types) | On-screen notification toggles (`notification_show_save_state`, screenshot duration…) |
| [`tools/nostalgist-mod/src/types/retroarch-config/quick-menu.ts`](tools/nostalgist-mod/src/types/retroarch-config/quick-menu.ts.md) | TypeScript source (types) | Quick-menu visibility toggles (`quick_menu_show_cheats`, `…_close_content`…) |
| [`tools/nostalgist-mod/src/types/retroarch-config/rewind.ts`](tools/nostalgist-mod/src/types/retroarch-config/rewind.ts.md) | TypeScript source (types) | Four rewind keys: buffer size, step, enable, granularity |
| [`tools/nostalgist-mod/src/types/retroarch-config/run-ahead.ts`](tools/nostalgist-mod/src/types/retroarch-config/run-ahead.ts.md) | TypeScript source (types) | Four run-ahead keys: enabled, frames, hide warnings, secondary instance |
| [`tools/nostalgist-mod/src/types/retroarch-config/save.ts`](tools/nostalgist-mod/src/types/retroarch-config/save.ts.md) | TypeScript source (types) | Save-related keys: save file and state directories, compression, auto index, thumbnails |
| [`tools/nostalgist-mod/src/types/retroarch-config/skeleton.ts`](tools/nostalgist-mod/src/types/retroarch-config/skeleton.ts.md) | TypeScript source (types) | The full RetroArch 'skeleton' config reference (about 2,250 lines, ~67 KB) with documentation comments copied from RetroArch's `retroarch.cfg` |
| [`tools/nostalgist-mod/src/types/retroarch-config/theme.ts`](tools/nostalgist-mod/src/types/retroarch-config/theme.ts.md) | TypeScript source (types) | Menu theme keys for the Ozone and MaterialUI menu drivers |
| [`tools/nostalgist-mod/src/types/retroarch-config/video.ts`](tools/nostalgist-mod/src/types/retroarch-config/video.ts.md) | TypeScript source (types) | Video config keys (`video_driver`, `video_filter`, `video_adaptive_vsync`, aspect ratio, overscan…) |
| [`tools/nostalgist-mod/src/types/retroarch-emscripten.ts`](tools/nostalgist-mod/src/types/retroarch-emscripten.ts.md) | TypeScript source (types) | Type of the RetroArch Emscripten module (`callMain`, `canvas`, cheat exports available in RetroArch ≥1.21) |
