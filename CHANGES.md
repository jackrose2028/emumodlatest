# Changes

# 4.3.0-local.31: addendum, phase 5 second pass (Web development case study)

The Web development case study (`devtour.html`, `assets/devtour.js`) and the reference docs, reviewed and extended.
The site version is now `ejs-local-32`.

Fixes:

- **"Write a lesson card" passed before anything was done.** It counted more than six lessons, and the Classroom
  ships seven since round 30. It now compares against the list of lessons that come with the site. It also asks for
  an exit ticket and checks that each answer points at one of its options.
- **"Ship an update" no longer needs a version kept in step by hand.** It remembers the `sw.js` version from when
  the learner first opened it and passes once that has changed and the new caches are in use. `SHIPPED_VERSION` is
  gone from `devtour.js`, so a release only changes `sw.js`.
- `collection.html` had the Basic page's description; it now describes My Collection.

New tour stops (15 now):

- **Checksums in the browser.** Web Crypto's SHA-1 next to the CRC32 and MD5 written in `assets/hashes.js`. The
  live table shows SHA-1 of "abc" and the time for 1 MB. The demo hashes any file on the device, with a speed.
- **Pages inside pages: iframes and postMessage.** How the kiosk, the Classroom and the embedded player talk, and
  why messages are checked by origin and source. In the demo, the page sends a message to a small framed page and
  the frame replies.
- **One file brands every page.** `site.json` and `assets/early-view.js` applying CSS variables before the first
  paint. The live table shows the current colours; the demo changes `--accent` on the page and puts it back.
- **Accessibility built in.** aria-live announcements, reduced motion, real buttons and labels, and focus. The live
  table shows the system settings; the demo announces a message.
- The storage and publishing stops now mention the practice, Classroom and archive pieces.

New exercises (8 now):

- **Add a language to the kiosk.** The check finds new `LANGS` entries, makes sure every text is translated, and
  makes sure `{t}` and `{when}` are kept.
- **Brand your copy.** The check reads `site.json`, rejects colours that aren't `#rrggbb`, and makes sure this page
  shows the new accent.

Reading and learning:

- Code excerpts have colours (comments, strings, keywords, numbers), a Copy button and Show 10 more lines.
- Every quiz explains its answer. Only the first answer counts, and the progress line shows "quizzes N of M right
  first time".
- **Start over** forgets progress on this device. **Print the exercises** prints a handout with every exercise,
  its files and its hints.
- **← and →** move between pages, except while typing or on the input stop, whose demo shows key presses.
- A reference-doc link for a file with no doc yet opens the file itself, marked "(source)".

**Reference docs:**

- 38 new documents in the house format (facts, What it is, How it works, Why it exists, Referenced by). They cover
  every page, script and tool added since round 10: the 13 use-case pages, 19 scripts in `assets/`, 4 tools,
  `site.json` and `ROADMAP.md`.
- The asset index lists 179 assets, and its `sw.js` row no longer names an old cache version.
- Written with a generator that computes the facts and the cross-references; `reference-docs/files.json` was
  rebuilt (182 documents).

Tested in Chrome on desktop and emulated iPhone:

- 15 stops and 8 exercises.
- Highlighted excerpts, Show more lines, and every stop's excerpt still found in its file.
- A first-try wrong answer counted as wrong, and → moving to the next stop.
- The new stops' live tables, the framed page replying, the accent colour changing and going back.
- All 8 exercises reporting "Not yet" on the shipped site (the lesson exercise no longer passes on its own).
- Start over, the printed handout (8 exercises), a new reference doc in the viewer, and tour links opening docs.
- No sideways scrolling on iPhone.

# 4.3.0-local.30: addendum, phase 4 second pass (Classroom)

The Classroom (`classroom.html`, `assets/classroom.js`, `assets/lessons.js`), reviewed and extended. The site
version is now `ejs-local-31`.

Teaching:

- **Presenter.** "▶ Start teaching" on a lesson opens a bar at the bottom of the screen.
  - It shows the current step and its notes, a clock for the step (amber when over its planned minutes) and one
    for the whole lesson.
  - It has Back, Show me, Next and End buttons. Next runs each step's Show me.
  - Presentation clickers work: Page Down and Page Up, even while the game has the keyboard.
  - The current step is highlighted in the plan, and the screen stays awake while teaching.
- **Exit tickets.** Every lesson ends with four multiple-choice questions. On screen, a tap shows right or wrong
  with a one-line reason and keeps a running score. The worksheet prints them as "circle one", and the answer key
  prints the answers.
- **A seventh lesson, "Binary and hex: how the console counts".**
  - It watches the robot's position ($0013) as decimal, hex and binary while it moves.
  - Students type new values to make the robot jump, and see it wrap around at 255.
  - It ends with a conversion worksheet and an exit ticket.
- The memory lesson's detective step now uses Find a byte, and its Show me steps can preset watched bytes.
- **Copy link** gives a link that opens the same game, view and lesson, for students' own devices.

Looking inside:

- **Saved moments.** "📌 Save moment" keeps the whole console at that frame, with a picture, in this browser
  (IndexedDB `EJS-classroom`). Moments show under the game: press one to go back to it, rename it, or delete it.
  They are made for repeatable demos.
- **Watched bytes** (Memory view). Click a square of the memory map to watch that byte. It is shown as a decimal
  number, in hex and in binary, with its last values. **Set** changes it: the byte is written into a save state that
  is loaded back.
- **Find a byte.** Start a search, change something in the game, then press Changed, Didn't change, Went up, Went
  down or Equals until a few bytes are left. Click one to watch it.
- **Tile detail** (Tiles view). Click a tile to see it as an 8 × 8 grid of pixel numbers in the chosen palette,
  with each row's low and high bytes in binary and hex.
- **Input view.** Each release shows how many frames (and milliseconds) the button was held, or that it was
  released in the same frame. The shortest press so far is shown for the "fastest tap" challenge.
- **Save picture (PNG)** on the Screen, Background and Tiles views saves the picture at the console's own size.
- On phones, the watched bytes become cards and the presenter bar is shorter.

Tested in Chrome on desktop and emulated iPhone with Sprite Lab:

- Watching $0013 by clicking the memory map.
- Find a byte narrowed to $0013 and the robot's copies in the sprite list (5 bytes) in two rounds.
- Set $0013 to 128, a saved moment taking it back from 20 to 128, an A press held 10 frames, the bit planes of
  tile $01, and a PNG.
- The binary lesson in the presenter:
  - step 1 loads Palette Explorer;
  - Next loads Sprite Lab with $0013 and $0014 watched;
  - Page Down moves on, and End closes the bar.
- The exit ticket's right and wrong answers and score, Copy link, and the printed worksheet with the exit ticket.
- No sideways scrolling on iPhone.

# 4.3.0-local.29: addendum, phase 3 second pass (Museum and exhibit kiosk)

The kiosk (`kiosk.html`, `assets/kiosk.js`), reviewed and extended. The site version is now `ejs-local-30`.

For visitors:

- **Languages.** Visitor text is built in for English, Español, Français, Deutsch, Italiano and Português.
  - Staff choose the screen's language and, optionally, a second one.
  - With two languages, the attract loop takes turns between them. A language button on the attract loop and the
    game list switches language, and a visitor who wakes the screen gets the language that was on show.
  - Each game can have a caption and How to play in both languages. The title and call to action can be set per
    language, or left empty to use the built-in wording.
- **How to play.** Each game has a short How to play text, shown while it starts and behind a How to play button
  that pauses the game (and its clock). Showcase games fill it in from their controls, and buttons that do the same
  thing share one entry ("Up/Down/Left/Right: Move the robot").
- **Sound button.** Visitors can turn the sound down or off. It is never louder than the staff's volume, and it is
  reset for each visitor.
- **One-minute warning.** With a time limit over two minutes, a "one minute left" message appears without pausing
  the game.
- **Opening hours.** Rows of days and times, overnight included. Outside them the screen is dark and shows when it
  opens again. A visitor playing at closing time gets a short goodbye. Touches do nothing while closed, but the staff
  gesture still works.
- **Dimming.** After a set time without visitors (30 minutes by default, 0 for never), only the call to action
  stays, dimmed. It moves now and then to avoid screen burn-in, as the closed screen's text does. A touch wakes it.
- On phones, the in-game buttons shrink to their symbols so they fit in one row.

For staff:

- **Game order.** "On this screen, in this order" lists the ticked games with Move up, Move down and Remove. The
  captions and How to play are edited there.
- **Check every game.** Starts each approved game once in a hidden, silent player and reports which ones started and
  how long they took. The last result is kept.
- **Settings left open.** After five minutes without a touch, the settings close and the screen goes back to the
  attract loop with the saved settings.
- **Visitor numbers** are kept per day (60 days), per game and per hour.
  - The status shows the busiest hour today and a 14-day table with the most played games.
  - **Download visitor numbers (CSV)** writes them for a spreadsheet.
  - The old totals for today carry over.
- **Follow the site's kiosk.json.** A screen with this ticked checks the file at start and every half hour, and uses
  any change between visitors (never during a game). A PIN in the file wins, so many screens can be managed from one
  file. A new screen that starts from a `kiosk.json` with `"managed": true` follows it from then on.
- The status also shows opening hours (open or closed, and the next change) and where the settings come from.

Engine side: the kiosk player (`play.html?kiosk=1`) obeys a new "volume" message. The shared game list
(`assets/catalog.js`) gives showcase games a How to play text (`controlsText`).

Tested in Chrome on desktop and emulated iPhone:

- The attract loop taking turns between English and Spanish, the language button on the attract loop and game list,
  and Spanish captions, loading text, HUD and How to play.
- How to play pausing and resuming the game, and the sound button (loud, quiet at 35%, off).
- A session recorded per game and hour; the closed screen ignoring touches.
- Dimming after one minute and waking to the game list.
- The PIN; reordering and adding games; How to play filled from the showcase; an opening-hours row.
- Check every game with three working games and one broken game.
- Saving, the 14-day table and most played games, and the CSV.
- A managed screen taking a new `kiosk.json` (title, French, games, PIN kept).
- Settings closing by themselves (tested with a six-second timeout).
- No sideways scrolling in the settings on iPhone, and the HUD on one row.

# 4.3.0-local.28: addendum, phase 2 second pass (Homebrew showcase)

The Homebrew showcase (`homebrew.html`, `assets/homebrew.js`, `tools/generate-homebrew-index.mjs`,
`tools/new-homebrew.mjs`, `homebrew/README.md`), reviewed and extended.

The list:

- Sort by newest, A to Z, author or year; the choice is remembered.
- Filter buttons for the most common genres and tags, with counts. A tag that every game has is left out, because
  it filters nothing.
- A "New" badge on games updated in the last 60 days ("Updated" when the game has more than one release).
- A Random game button that picks from what the current filters show.
- `homebrew.html?author=<name>` lists one person's games (matching credits too), and `homebrew.html?q=<words>`
  opens a search.
- Search now also covers descriptions, credits, genres and control actions.

A game's page:

- **Play here** runs the game inside the page (the embedded player); the full-screen player is one button away.
- A Pictures section with thumbnails that open full size, with Previous/Next and arrow keys, and an optional
  trailer video (`video` in game.json, mp4 or webm).
- Credits (each name lists that person's games), release notes (`versions`), genre and players.
- The game file is checked in the browser against its published checksums, and the result is shown.
- **Add to My Collection** copies the game with its screenshot as the cover, and says so if it's already there
  (found by SHA-1).
- **Download** (with the licence as its tooltip).
- **Share** gives the share page link (below) through the phone's share sheet or the clipboard.
- **Embed** copies an `<iframe>` code for putting the game on another site.
- "More by" the same author, and your own play time once you have played.

Publishing:

- The index builder now checks much more. It looks at folder names, JSON, required fields and ROM size (warning at
  50 MB, error at 100 MB). It warns about a licence that is not an SPDX id, and checks screenshots (missing ones,
  and any over 2 MB), the video type, and the buttons named in `controls` against the system. It also checks the
  `updated` date, links and duplicate titles. `--strict` fails on errors only.
- It writes a share page for each game, `homebrew/<folder>/index.html`. It has Open Graph, Twitter and schema.org
  data, so links show a picture, title and description in chat apps and social networks, and it forwards to the
  game page.
- It also writes an Atom feed of releases, `homebrew/feed.xml`, linked from the page.
- Index entries now carry credits, versions, video, genre, players and tags, plus CRC32, MD5 and SHA-1.
- `site.json` has a new `url`, the public address. Set it in the Site kit ("Public address"; it must start with
  `https://`). With it, share pages and the feed use full addresses so previews show the picture everywhere.
- `tools/new-homebrew.mjs` takes these options:
  - `--genre`, `--players`, `--tags`, `--description`, `--core`, `--version`, `--updated` and `--folder`;
  - `--screenshot` (repeatable) and `--video`, which copy the files in.

  It also writes a first credit and version entry.
- Sprite Lab's game.json gains credits, a version entry and a genre, as an example.

Tested in Chrome on desktop and emulated iPhone:

- The list: sort, a tag filter, search, the author page, badges, and no sideways scrolling on the phone.
- Sprite Lab's page:
  - the checksum check passes;
  - adding it to My Collection twice adds it once, with its cover and source;
  - Play here starts the game in the page;
  - the full-size picture viewer opens and closes;
  - the share page forwards to the game page.
- The index builder, with `--strict`.
- `new-homebrew.mjs` with every option, in a copy.

Share and Embed use the clipboard, which headless Chrome doesn't grant, so only the code that builds their text was
checked.

# 4.3.0-local.27: addendum, phase 1 second pass (My Collection)

My Collection (`collection.html`, `assets/collection.js`, `assets/collection-store.js`), reviewed and extended:
1. Duplicates found by content: every game's SHA-1 is stored. Adding the same file under another name is caught ("Already in your collection as …") and left out unless ticked. Games added before this version get their SHA-1 in the background.
2. Games recognised: a file that matches a game in the Homebrew showcase or the Preservation archive gets its proper title and its published screenshot as the cover, and remembers where it came from.
3. Shelves, status and notes:
    - shelves: your own groups, such as Family, Racing or Finished; a game can be on several, and added games can go straight onto one
    - status: Want to play, Playing, Finished, 100 % completed, On hold, Gave up
    - notes: passwords, where you got to; shelves and statuses get filter chips, and the search covers shelves, status and notes too
4. Your own cover pictures: choose a picture in the details (it is scaled down to 480 pixels), or remove it. A picture you chose is never replaced by the one taken from the game.
5. Select mode with bulk changes: favourite, add to or take off a shelf, set status, change system, export the selected games, and remove them all at once.
6. Removing has Undo for 15 seconds (single games and bulk removals), bringing back the file, details and cover.
7. List view (cover, title, system, status, shelves, size) alongside the cover grid; the view and the sort order are remembered. New sorts: system, size, status.
8. Continue playing: a row with the last games played this month, shown when nothing is filtered.
9. Surprise me: picks a game for you, preferring ones not played for a while, highlights it and offers to play it.
10. Keyboard and controller navigation: arrow keys or the d-pad move between games; Enter or A plays, D or X opens the details, F or Y adds to favourites, and Space selects in select mode. Couches and TVs work without a mouse.
11. A space check before adding: if the games need more room than the browser has left for the site, the review says so before anything is stored.
12. Add recent games: files opened on the Basic page can be added in one step, keeping the system and core they were played with.
13. Exports in parts, so phones can manage big collections:
    - export all games, the games shown now, or the selected ones
    - split into parts of 250 MB, 500 MB, 1 GB or 2 GB (phones default to smaller parts)
    - saves are optional and go in the first part
    - import takes several zip files at once (all the parts) with progress, and skips games already there and up to date
    - exports keep shelves, status, notes, sessions, SHA-1 and your own covers; exports from the first version still import
14. Play sessions are counted and shown in the details with the play time, SHA-1 and source. Messages about things that worked fade away by themselves.
15. Tested:
    - three games added and recognised from the showcase
    - a renamed copy caught as a duplicate
    - details edited, with search finding the notes
    - two games removed and brought back with Undo
    - an export split into three parts and imported in one go into an emptied collection, covers included
    - keyboard navigation and Surprise me
    - recent games added from the Basic page
    - a chosen cover kept after 30 seconds of play, with the session counted
    - the layout and details dialog on an emulated iPhone

# 4.3.0-local.26: addendum, phase 10 (Build your own arcade)

Phase 10: Build your own arcade (`site.json`, `kit.html`, `assets/kit.js`)
1. The start page tile "Build your own arcade" is now Ready. All ten use cases from the plan are built.
2. One file brands the whole site: `site.json` at the top of the site sets:
    - the name (in every page title and the start page heading), the tagline and the logo
    - the colours: background, cards, text, quiet text, lines, accent and main buttons, used by every page
    - which parts are offered (`uses`); parts left out disappear from the start page, and their pages send visitors to it
    - an optional start page (`startPage`), so the site opens straight into, say, the Homebrew showcase
    - which systems are shown (`systems`): game lists, the showcase, the archive and the player show only those
    - featured games at the top of the start page (homebrew games, archive records or library games)
    - a footer line and links, and whether the project's own footer links are hidden
3. How it applies: `assets/early-view.js`, already on every page, keeps the last site.json so colours apply before the first paint, then fetches it fresh. Pages that list games wait for it, so the system choice is never late. Removing site.json brings back the standard look. The service worker always asks the network first for site.json.
4. The kit page (`kit.html`) writes site.json with a form:
    - starting points: this site as it is, Game jam, Creator's games page, Class project, Museum or library
    - name, tagline, logo (a path, or an uploaded image), and colour pickers with live contrast checks for text, buttons and links
    - parts, start page, systems, featured games, footer text and links
    - a live preview of the real pages (start page, showcase, archive, links) with the new branding, which changes nothing on the site
    - the finished site.json with problems listed, to download or copy, or to open an existing one
    - a branding pack (zip): site.json, a matching manifest.webmanifest (the installed app's name and colours) and the logo
5. A publishing guide on the same page: copying the site to GitHub (with only the cores you need), replacing site.json, adding games, switching on GitHub Pages, a custom domain, and "Check the published site.json", which checks the live file and its logo.
6. The ten pages share a "main button" colour (`--primary`), so brand colours reach every button.
7. Tested: a site.json for a creator's page opened the site straight into the showcase with the new name and colours, sent visitors away from a part that was left out, showed only the chosen parts, two featured games, and the footer, and the published-file check passed. Putting the standard site.json back restored the standard look.

# 4.3.0-local.25: addendum, phase 9 (Events and speedrun practice)

Phase 9: Events and speedrun practice (`practice.html`, `assets/practice.js`)
1. The start page tile "Events and speedrun practice" is now Ready. It has three modes beside the running game: Practice, Full run and Race.
2. Frame-accurate timer: the time is counted from the console's own frames at the console's real rate (60.0988 per second for NES and SNES, 59.7275 for Game Boy, and so on), so it is exact, the same on fast and slow computers, and stops while the game is paused. It shows on the game with the segment name and the time against your best.
3. Segments and save points: split a game into named segments, play to the start of one and press "Set start here" to give it a save point. Segments can be renamed, reordered and deleted. Save points are kept in the browser.
4. Practice: "Practise" loads a segment's save point and starts the timer, and Split (the . key in the game) records the attempt. It then starts again by itself (optional), so a segment can be repeated without touching anything else. Each segment shows:
    - number of attempts, best, last, average of the last five, and improvement against the first five
    - a chart of the last 40 attempts with the best marked
    - the last 10 times against the best, with Undo to remove a mistaken attempt
5. Full runs: Start run loads the first segment's save point. Split at the end of each segment; Skip and Undo split work as in speedrun timers. Each run shows best split, this run, +/− against the personal best (green ahead, red behind), segment times with best segments (golds) starred, personal best, sum of best segments, possible time save, and finished and reset runs.
6. Shareable links: "Share" puts a segment's save point, compressed, into a link (`practice.html?game=…&seg=…#sp=…`). Opening the link loads the game and adds the save point ready to practise. Save points too big for a link (over about 60 KB compressed) are saved as a file instead, and "Open a save point file" adds one.
7. Race: two copies of the game side by side from the same save point (or the start), with a 3, 2, 1, GO countdown and a timer each.
    - Player 1 plays with W A S D, F, G, T and R, and finishes with Q; player 2 uses the arrow keys, L, K, O and I, and finishes with P.
    - Controllers 1 and 2 also work: the d-pad or stick to move, and Select + Start together to finish.
    - Each game gets only its own player's input. Player 2's sound can be muted, and the players' menus are hidden.
    - The winner and the margin are shown and kept in a results table.
8. Results export: JSON (segments, every attempt, runs with splits, races, personal best and golds) or CSV (one row per attempt, run and race), for event leaderboards or spreadsheets.
9. Tested with Sprite Lab: three practice attempts improving from 2.01 to 1.39 seconds, two full runs (personal best 1.79, both golds), a share link of about 1 KB opened in a fresh tab and added as a segment, and a race with both robots moved by their own players' keys and the right winner.

# 4.3.0-local.24: addendum, phase 8 (Community spaces)

Phase 8: Community spaces (`community.html`, `assets/community.js`)
1. The start page tile "Community spaces" is now Ready. It is a game corner for a school, library, shelter, hospital ward or waiting room, on an old or donated laptop, Chromebook or tablet. Staff set it up once; visitors only pick a game and play.
2. Visitor launcher: the place's name and welcome line, a clock, "Open until …", big game tiles with pictures and captions, and system filter chips. A small Staff button opens the PIN pad. Nothing else on the page can be changed.
3. Opening hours: one or more rows of days and times; overnight hours work too. Outside them the screen says the games are closed and when they open again (for example "Saturday at 10:00"), and lets the screen sleep to save power. A game in progress at closing time gets a 30-second goodbye.
4. Quiet hours with their own volume, and a loudest-volume limit at all times. The limit is enforced every second, so turning the game up has no effect.
5. Turns: an optional time per turn with a clock in the bar, an optional break reminder ("Time for a short break?", which pauses the game), and the turn ends by itself when nobody plays for a set time ("Are you still playing?", 30-second countdown). Save and Load buttons work within a turn. "End my turn" ends it.
6. Fresh saves: when a turn ends, the save states and in-game saves are cleared so the next person starts fresh (staff can switch this off, or clear everything now). The games and cores stay.
7. Low-power mode, on by default: the player runs in performance mode with the power saver, and these choices are not stored as the device's own settings. The screen is allowed to sleep while closed, and the page reloads itself while closed once it has run for six hours, and after 50 turns, to keep memory fresh.
8. Locked down: the same locked player as the kiosk (site menus, settings, cheats, saves menus and hotkeys hidden), the Back button and right-click blocked, and full screen on the first touch.
9. Offline on this device: "Prepare this device" keeps the chosen games, pictures and cores in their own cache (`ejs-community-files`, served by the service worker). It is refreshed on each start while online; on Chromebooks and tablets the site can also be installed as an app.
10. Offline package for another device: one zip with the site, the chosen games (including My Collection games, copied in as files), both graphics builds of their cores, these settings as `community.json`, `START-COMMUNITY.bat` (Windows), `start-community.sh` (Mac and Linux) and a README. Unzipped and started with Python 3, it opens straight into the launcher with nothing to configure. Tested: a 5.2 MB package served from its own folder showed the launcher and ran a game with the network switched off.
11. Staff settings: name, welcome line, games, opening hours, quiet hours, volume limit, turn length, break reminder, walk-away time, fresh saves, low power, full screen, PIN, and export or import of the settings.
12. Engine: `play.html?lowpower=1` runs one game in performance mode with the power saver without saving those settings. The service worker also serves the community offline cache.

# 4.3.0-local.23: addendum, phase 7 (Accessible and comfort play)

Phase 7: Accessible and comfort play (`comfort.html`, `assets/comfort.js`)
1. The start page tile "Accessible and comfort play" is now Ready. One page holds every option that makes a game easier to see, hear, hold and play, beside the running game.
2. Five presets, each a starting point. Any change turns it into Custom; the settings are remembered for each game (and the last ones for new games), and "Forget the settings for this game" resets them:
    - Standard
    - Relaxed: three-quarter speed, rewind, a save every 2 minutes, captions
    - Low vision: high contrast, brighter picture, larger controls and text, captions and flashes
    - One hand: B held after one press, auto-fire on A, a left-hand keyboard and touch controls on one side
    - One switch: scanning, 60 % speed, rewind, a save every minute
3. Speed and time: game speed from 25 % to 100 %, rewind (hold the Rewind button or Backspace, in 2-frame steps so it goes back about as fast as the game went forward), Save now, Load save, an automatic save every 1 to 10 minutes, and Back to auto-save.
4. Buttons: hold-to-toggle for any button (one press holds it, the next lets go), auto-fire for any button with an adjustable rate, and one-hand keyboard layouts. The left-hand layout is W A S D with Space, Left Shift, Q, E and keys for rewind, save and load; the right-hand layout uses the arrow keys with Enter, Right Shift and nearby keys. Every input source passes through these rules: keyboard, controller, touch and switch.
5. Touch controls: the page's own large touch pad. You can set it to show on touch screens, always or never, change its size (80 to 220 %) and opacity, and drag each group of buttons anywhere with "Move the touch controls". Positions are saved, the pad scales with the screen and stays inside it, and the player's own touch pad hides while it is on.
6. Seeing: colour filters for the game picture (high contrast; red-weak, green-weak and blue-weak friendly corrections; greyscale; inverted), brightness and contrast sliders, and larger text and controls for the page.
7. Hearing: captions for sounds and an optional flash at the screen edge. For NES games the captions come from the sound chip (beep or melody note, bass note, drum or noise, recorded sound). For other systems they are worked out from the sound itself: low thud, high beep, sound effect, music playing, music stopped.
8. One switch: a highlight moves through the chosen actions (directions, buttons, pause, rewind, save) at a set pace. Press the switch to choose: Space, Enter, any key if allowed, a tap anywhere on the game, or any controller button. Directions stay held until the next press, and buttons are pressed for a set time. Repeated presses within 250 ms count once, and other input is ignored so nothing interferes. Switch-access devices that send Space or Enter work directly.
9. Keyboard only: every setting is a normal control in order, with a skip link and strong focus outlines. In the game, Ctrl+M moves to the settings, Backspace (hold) rewinds, and - and = change the speed.
10. Tested end to end with the keyboard alone, touch alone and a single switch. Sprite Lab's position byte in memory confirmed that each input reached the game: rewind took it back, the switch latched Right and released it, and a tap chose Left.
11. Engine: a page that embeds the player can switch rewind on for one game (`play.html?embed=1&rewind=1`), without changing the player's saved settings.

# 4.3.0-local.22: addendum, phase 6 (Preservation archive)

Phase 6: Preservation archive (`archive.html`, `assets/archive.js`, `assets/hashes.js`, `archive/`)
1. The start page tile "Preservation archive" is now Ready. It is a catalogue of public-domain and rights-cleared software, one record per file.
2. Catalogue: search across titles, creators, subjects and notes; filters by platform, licence and decade; sort by catalogue number, title or year; and a verification badge for every file. "Verify every file" checks the whole list.
3. Record pages, each with a permanent link (`archive.html?id=ejsa-0003`). A page holds:
    - the full description with notes and subjects
    - catalogue data: number, titles, creator, publisher, year, platform, format and hardware, region, version, cataloguer
    - the licence with its statement, and the evidence when sharing rests on written permission
    - a provenance timeline: created, built, received or dumped, catalogued
    - media with captions, and attachments such as source code and tools
    - related records
    - a ready-made citation that includes the SHA-1, and buttons to copy the link or citation and to download the record as JSON
4. Checksums are checked in the browser. When a record opens, the page downloads the file and computes its size, CRC32, MD5 and SHA-1, then shows them beside the recorded values with a tick or a cross per value, and a verdict: verified, does not match (changed or damaged), or could not be checked. CRC32 and MD5 are written out in `assets/hashes.js`, because Web Crypto has no MD5. SHA-1 uses Web Crypto, which needs https or localhost. Large files are read in 4 MB pieces with progress shown.
5. Playable in place: "Play here" runs the game inside the record page, without leaving it. "Open in the full player" and "Download the file" are offered too, and Home in the full player returns to the record.
6. Identify a file you have: choose any file and the page computes its checksums and says which record it is, byte for byte. Nothing is uploaded.
7. Export: the catalogue as JSON or CSV (CSV opens in spreadsheets with the permanent links), or everything as one zip, for copying, mirroring or depositing the collection elsewhere. The zip holds every record plus each record's file, media and attachments.
8. Cataloguing: `archive/<folder>/record.json` (fields in `archive/README.md`). `tools/generate-archive-index.mjs`:
    - checks the required fields and that ids are unique and well-formed
    - accepts only public-domain or free licences, or "permission" with recorded evidence
    - checks that the files, media and attachments exist and that related records exist
    - checks every file against its recorded checksums
    - with `--write`, records the checksums the first time (`npm run archive`)
    - with `--strict` (used by the GitHub workflow), fails the build when a file no longer matches its record, so a changed or damaged file can't be served as the catalogued copy
9. First records: the three CC0 programs made for this site (Palette Explorer, Button Check and Sprite Lab), with full provenance and source attachments.
10. The homebrew and archive lists now take their dates from the records instead of file dates, which change on every checkout, so the workflow no longer rewrites the lists for nothing. `game.json` gains an optional `updated` field.

# 4.3.0-local.21: addendum, phase 5 (Web development case study)

Phase 5: Web development case study (`devtour.html`, `assets/devtour.js`)
1. The start page tile "Web development case study" is now Ready. The page is a guided tour of how this site is built, for learners and developers.
2. Eleven tour stops:
    1. a whole app from plain files (ES modules, no build step)
    2. the service worker (offline and caching rules)
    3. cross-origin isolation and threads
    4. WebAssembly cores
    5. the WebGL picture pipeline
    6. Web Audio and autoplay rules
    7. saving with IndexedDB, Cache Storage and localStorage
    8. keyboard, controllers and touch
    9. the responsive phone layout
    10. recognising a game file
    11. publishing with GitHub Pages and a workflow
3. Every stop has:
    - a short explanation and its key points
    - **Live on this device**: real measurements, for example whether the page is cross-origin isolated and which headers it has, the cache names and storage used, the graphics renderer and pixel ratio, the sample rate, the databases and settings stored, connected controllers, the safe-area insets and phone classes, and which NES core build this browser would load
    - **The code that does it**: an excerpt read live from the site's own files, with line numbers, so it always matches the code
    - something to explore in the browser's developer tools
    - links to the matching reference docs
    - a one-question self-check
4. Hands-on demos: smoothed and pixelated scaling side by side, a live key and controller readout, and a file inspector that shows a game file's first bytes and what the site detects it as. Nothing is uploaded.
5. Six exercises that change the site, each with step-by-step hints and a **Check my work** button that inspects the running site:
    - add a hotkey (the check reads enhancements.js)
    - add a platform folder (platforms.json and the folder's index.json)
    - publish a homebrew game (homebrew/index.json)
    - add a difficulty field to the game pages (the index and homebrew.js)
    - ship an update by changing the service worker version (the installed caches)
    - write a seventh Classroom lesson (lessons.js, with every plan adding up to 45 minutes)
6. Progress (stops visited, exercises done) is kept on the device. On phones the tour list becomes a menu.
7. Fixed: on phones, the card layout for tables on the homebrew game pages also applied to the Classroom tables. It now applies only on the game pages.

# 4.3.0-local.20: addendum, phase 4 (Classroom: how retro games work)

Phase 4: Classroom (`classroom.html`, `assets/classroom.js`, `assets/lessons.js`)
1. The start page tile "Classroom: how retro games work" is now Ready. The page shows a running game ("What you see") beside live views of what the console is working with ("What the console sees").
2. Pause, Step 1 frame, Step 10, Slow motion (quarter speed) and Restart, with a frame counter. While the game has the keyboard, "." steps one frame and "," pauses or plays, so a game button can be held while stepping.
3. Screen view: the picture at the console's own resolution, with an 8 × 8 tile grid and sprite boxes on top, a pixel inspector (position, colour, tile, nearest NES colour code), and the picture size compared with its size on your screen.
4. Palette view: the 8 palettes in the NES palette memory (with the shared backdrop marked), the 64-code master palette with the codes in use ringed, and the colours in the picture now.
5. Sprites view: sprites on screen out of 64, sprite size, the busiest line and how many sprites the 8-per-line limit cut off (drawn in red), and the sprite list itself (X, Y, tile, palette, flip, priority).
6. Background view: both screens of the background map rebuilt from the console's video memory, with the visible window moving as the game scrolls, the scroll position and the number of different tiles.
7. Tiles view: the cartridge's tile drawings (pattern tables), coloured with any palette in use, with the tiles on screen outlined. For every system it also shows how many of the 8 × 8 squares on screen repeat.
8. Sound view: the waveform and spectrum of the game's sound (any system); for NES games, the five channels with on/off, wave and duty, volume and pitch (Hz and note). "Hear each channel" buttons play a pulse wave at 12.5, 25 and 50 %, a triangle wave and noise.
9. Memory view: all 2,048 bytes of NES working memory as a heat map (red = just changed) with address, value and change count on hover, plus the sizes of RAM, video, sprite and palette memory and of the cartridge's program and graphics, compared with a phone photo.
10. Timing view: frames per second, the 16.7 ms frame budget and a bar chart of frame times. Input view: a controller that lights up with every press (keyboard, controller or touch) and a list of presses with the frame they happened in.
11. Six lessons, each a 45-minute plan (hook, explanation, hands-on, worksheet, wrap-up) with "Show me" buttons that load the game, open the view and pause or play: palettes; sprites and the 8-per-line limit; tiles and scrolling; sound channels; memory limits; frames and input. Each has key facts and discussion questions, a printable worksheet (name, class and date lines, answer lines, drawing grids, tables) and a separate answer key with the plan, for A4 or Letter. Projector mode makes everything larger.
12. How it reads the game: the game runs in an embedded player (`play.html?embed=1`). The picture is kept between frames so it can be read while paused, every button press passes through the emulator's input function, and the sound passes an analyser. For NES games the console's memory is read from an in-memory save state 4 times a second: palette RAM, sprite memory, nametables, scroll registers, sound registers and RAM. The cartridge file supplies the tile drawings and sizes; zipped games are opened. Other systems get the picture-based views.
13. New teaching program in the Homebrew showcase: Sprite Lab (CC0). A robot made of 4 sprites walks over a world of tiles that scrolls across two screens. Ten balls share one line, so two vanish; A turns flicker on, B starts scrolling, and Select changes the palette. A, B and Select also play the pulse, triangle and noise channels. Its Python build script and a small 6502 assembler are included so students can change and rebuild it.
14. Shared game list (`assets/catalog.js`) used by both the kiosk and the classroom. Homebrew game pages accept links to other pages of the site.

# 4.3.0-local.19: addendum, phase 3 (Museum and exhibit kiosk)

Phase 3: Museum and exhibit kiosk (`kiosk.html`, `assets/kiosk.js`)
1. The start page tile "Museum and exhibit kiosk" is now Ready. The page turns a screen, tablet or touch kiosk into an unattended exhibit.
2. Attract loop: while nobody plays, the approved games rotate full screen with their picture, system and caption, and "Touch the screen or press any button to play" (the wording can be changed). It works in landscape and portrait.
3. Game list: big tiles, played with touch, keyboard (arrows and Enter) or a controller (d-pad or stick and A). The touch that wakes the screen never starts a game by accident. With one approved game the list is skipped.
4. Timed sessions: an optional time per visitor with a clock on screen (red in the last minute), then "Time's up!" and back to the attract loop.
5. Walk-away reset: when nobody touches anything for the set time (90 seconds by default), the game pauses and asks "Still playing?" with a countdown. A touch, key or controller button carries on; otherwise the kiosk returns to the attract loop.
6. Locked-down player: the game runs in a frame (`play.html?kiosk=1`) with the site bar, menus and links hidden. The EmulatorJS bar keeps only pause, restart and sound. Saves, save slots, settings, control remapping, cheats, netplay, exit, the F1 panel and F-key hotkeys (except mute), the controller combos, the speed buttons and the owner tips are all off. The right-click menu, text selection, pinch zoom and the Back button are blocked. The cursor hides when the mouse rests, and the screen is kept awake.
7. Large touch controls: on touch screens the on-screen pad is a third bigger.
8. Staff access: five quick taps in the top-left corner (or Ctrl+Shift+K, also while a game is running) open a PIN pad. The PIN (4 to 8 digits) is stored only as a SHA-256 hash; five wrong tries lock the pad for a minute, and it closes on its own after 20 seconds. A game in progress is paused while the pad is open.
9. Staff settings: the approved games (from the Homebrew showcase, the data/ library folders and My Collection on this device) with a caption each; title and call to action; time per visitor; walk-away time; slide time; volume; nightly restart hour; full screen; whether visitors may leave a game for the list; and pictures for the attract loop. A status panel shows today's sessions, play time, time-ups, walk-aways, failed starts and automatic restarts, the uptime, the network and the offline copy.
10. Pictures: each game is photographed after 25 seconds of play and used in the attract loop and on its tile, for games that have no screenshot of their own.
11. Offline: "Prepare for offline" (and every start while online) copies each approved game, picture and emulator core into its own cache (`ejs-kiosk-files`). The service worker serves from it, and it survives site updates, so the kiosk keeps running with the network down. Tested by reloading and starting a game with the network switched off.
12. Recovering on its own: every visitor gets a new frame and the old game is thrown away whole. A game that does not start within 90 seconds, or reports an error before it starts, shows "Sorry, this game is resting" and is skipped after two failures. Repeated page errors between visitors restart the page. The page also restarts nightly at the chosen hour and after every 100 sessions, always between visitors. A site update is applied at the next attract loop, and after any reload the kiosk starts straight in the attract loop.
13. Moving settings: Export settings saves `kiosk.json`. Import it on another screen, or place it next to `kiosk.html` on the site so new screens start with it. "Turn off the kiosk on this device" removes the settings, PIN, offline copy and pictures.

# 4.3.0-local.18: addendum, phase 2 (Homebrew showcase)

Phase 2: Homebrew showcase (`homebrew.html`, `assets/homebrew.js`, `homebrew/`)
1. The start page tile "Homebrew showcase" is now Ready. The showcase lists every game in `homebrew/` as a card (first screenshot, title, author, year, system), with search by title, author, genre or tag and a system filter once more than one system is present.
2. Each game has its own page, `homebrew.html?game=<folder>`, that can be linked to and shared: screenshots, author, year, version, system, licence, file size and date, description, links (to the author, source code, a store page) and tags (a tag searches the showcase).
3. Controls drawn for every way to play: each button in `game.json` is shown with what it does, the keyboard key, the controller button (Xbox and PlayStation names) and, on phones and tablets, the on-screen button. System button names are translated (for example Mega Drive A/B/C, Master System 1/2, N64 Z). On phones the table becomes one small card per button.
4. Play starts the game on the game page with the system or core given in `game.json`; Home on the game page returns to that game's page. Unsupported systems (core not installed) show that instead of Play. Share uses the phone share sheet, or copies the link on computers.
5. A SHA-1 checksum is shown so players can confirm they have the file the author published.

Publishing
6. A game is a folder: `homebrew/<game>/game.json` plus the ROM (and optional screenshots). Required fields are title, author, system, rom and license; every field is described in `homebrew/README.md`.
7. `node tools/new-homebrew.mjs path/to/game.nes --title "My Game" --author "Me" --license MIT` creates the folder, copies the ROM, detects the system from the file type and writes `game.json` (also `npm run homebrew:new`).
8. `tools/generate-homebrew-index.mjs` builds `homebrew/index.json` (size, checksum, date) and checks each folder: missing fields, a missing ROM or screenshot are reported, and `--strict` fails the build. The GitHub workflow runs it whenever `homebrew/` changes, so pushing a folder publishes the page. `npm run index` runs it too.
9. Two small public-domain (CC0) test programs ship so the showcase works out of the box: Palette Explorer (walk through the 64 NES colours; its build script is included) and Button Check (screen turns red while A is held). No commercial games are included.
10. The showcase is listed on the Links page, cached for offline use, and works in the phone view.

# 4.3.0-local.17: addendum, start page with ten use cases, Basic, and phase 1 (My Collection)

Start page and Basic
1. `index.html` is a new start page: it offers the ten real-life use cases (see `ROADMAP.md`, the 10-phase plan), each marked Ready or with the phase that will build it, plus **Basic**. The last choice is offered as "Continue: ...". Old `index.html?rom=` links go to Basic as before.
2. **Basic** (`basic.html`) is the previous home page, unchanged apart from its title, a "Basic" label and a link back to the start page ("All uses").
3. "Home" on the game page (and after a game exits) returns to the page the game was started from: the start page, Basic or My Collection. The Links page lists the start page, Basic and My Collection.

Phase 1: My Collection (`collection.html`, `assets/collection.js`, `assets/collection-store.js`)
4. Your own game backups in one place: Add games (files), Add a folder (computers; iPhone and iPad cannot pick folders) or drop files and whole folders onto the page.
5. Every file is reviewed before it is stored, as asked for imports: the system detected (zips read from the inside, with how it was found), the core, and "Choose the system" where detection is unsure; Add stays disabled until every game has a system. Text, pictures, saves and patches are left out, and adding a game that is already there updates it instead of duplicating it.
6. The collection: cards with a cover taken from the game itself after 25 seconds of play (renewed each session), favourites (shown first), play time, last played, search, sort (recent, A to Z, most played, newest), filters by system and favourites, and a details dialog to rename, change system or core, or remove a game (its saves stay).
7. Games open on the game page with the core chosen for them (`play.html?cid=...`); play time and last played are counted while the game runs (not while paused or hidden).
8. Carry it anywhere: Export collection makes one zip with the games, covers, details and every save (in-game saves and save states); Import collection on another device restores all of it, so play continues where it stopped. The zip stores files without recompressing them, so exports are quick.
9. Storage: the page shows how much space the site uses and has "Keep my collection on this device", which asks the browser not to clear it (Safari keeps it best when the site is added to the Home Screen); adding games asks too.
10. Works on phones like the rest of the site (two-column grid, finger-sized controls), and offline after the first visit.

# 4.3.0-local.16: addendum, system and core chosen before a game file opens

Why: opening a zip with an N64 game could start it as an arcade game on the wrong core (FinalBurn Alpha 2012 CPS-1). Three things caused it: a zip was treated as arcade whenever its contents could not be read by name; the system picker remembered one answer per file type ("Remember for this file type" was ticked by default), so after one arcade zip every later zip went to arcade without asking; and a 7z was always taken for arcade.

1. Load game dialog: every ROM or zip opened on the home page (drop, file picker, Open file on phones) now shows the system it was detected as, how it was detected, and the emulator core that will run it, before anything starts. Both can be changed; Start game opens it, Cancel stops. When the system can't be told, the dialog asks for it and Start game waits until one is chosen.
2. Zips are read properly: the dialog looks inside the zip, decompresses the start of the largest file and checks its header, so an N64, NES, SNES, Game Boy, GBA, Mega Drive, Master System/Game Gear, Lynx or 7800 game is recognised even when the file inside has an odd name such as rom.bin; readme, picture and save files in the zip are ignored. File types inside the zip are the fallback.
3. Archives are never assumed to be arcade: a zip or 7z whose contents can't be identified asks for the system instead of picking arcade.
4. The old per-file-type answers ("every .zip is arcade") are deleted on the first visit after this update.
5. Core choice: the dialog lists the cores installed for the system (the default first) with a short note on each (for example "Mupen64Plus-Next: best compatibility", "FinalBurn Alpha 2012: Capcom CPS-1 arcade boards only"), and marks cores that need threads or that NostalgistMod cannot run. "Use this core for every <system> game" remembers the choice; it is then also used for games opened from the library folders, the player's library and links.
6. The chosen core really is used: it is stored with the game in Recent games and passed to the engine, and it takes priority over a core saved earlier in the EmulatorJS settings menu (which previously overrode it). `play.html?url=...&core=` also accepts a core name (for example `&core=parallel_n64`) as well as a system.
7. Threads follow the chosen core: a core that needs threads is only required when that core is picked.

# 4.3.0-local.15: addendum, 2.5D mode for NES and SNES

2.5D view (`data/src/depth25.js`, EmulatorJSMod)
1. A 2.5D button on the home page (next to the engine) turns 2.5D mode on or off; it is remembered, applies to NES and SNES games, and `?depth25=1` or `?depth25=0` on a game address overrides it for one game. With 2.5D on, NES and SNES games always start in EmulatorJSMod, which draws the effect.
2. How it looks: every frame is redrawn as a scene with depth. The colours that fill most of the screen (the backdrop, sky bands, a checkerboard) become a dimmed far layer; everything else (level tiles, platforms, characters, items, text) becomes raised blocks, one per game pixel, each with a lit top face above it, a light top edge, darker right and lower edges, and a soft shadow cast down and to the right onto the far layer, with shading where blocks meet it.
3. Backdrop colours are worked out from the picture several times a second, so the layering follows the game from screen to screen without any per-game setup.
4. Gameplay is untouched: the emulator, timing, input, saves, screenshots (F8 saves the flat game picture) and every other feature run as before; 2.5D only changes how the finished frame is shown, on a second canvas laid exactly over the game.
5. Adjustable while playing: Shift+F8 switches between 2.5D and the flat picture, and the F1 panel has a 2.5D section with Block height, Shadows, Background brightness and Highlights sliders, saved per game. The phone game menu has a "2.5D view" switch.
6. Keeps the game at full speed: the effect is computed in two GPU passes (one at the game's own resolution, one on screen). If frames start taking longer than the screen's refresh, it draws with fewer pixels (4, 3, then 2 per game pixel) and remembers the level for that device.
7. Limits: the depth is worked out from colours, not from the game's own layers (a browser emulator cannot see those), so it does not reproduce hand-made 3D remakes of particular games. Games with a plain backdrop (most NES games) show the clearest layering; very detailed SNES backgrounds are partly raised along with the foreground; the sliders tune the result per game.

# 4.3.0-local.14: addendum, iPhone and mobile review

Fixes and improvements from a full pass over the site on phones (emulated iPhone SE, iPhone 15 and 15 Pro Max, Android, portrait, landscape and rotating while playing, with real multi-touch input)
1. Landscape on small phones (iPhone SE): the game picture ran under the on-screen d-pad and buttons in both engines. It is now fitted between them and centred, so the whole picture stays visible; on wider phones nothing changes.
2. ObsoleteMod on phones: its page stylesheet limited the game canvas size, which shrank the picture to a quarter in a corner with the picture-sized buffer; the layout now takes precedence. Its header overflowed the screen on 375-pixel-wide phones (the SITE button is now on its LINKS page on phones) and its filter row was 8 pixels too wide on small phones.
3. No layout flash: phones get the phone layout before the page is first drawn (`assets/early-view.js`), instead of briefly showing the desktop layout.
4. Reference docs on phones: the header buttons now fit on one scrolling row, tables scroll sideways instead of breaking words letter by letter, and long names wrap.
5. Engine chooser: never taller than the screen, two columns in landscape; the "can't start this game" card has margins and full-width buttons.
6. Game menu in landscape: wider, with four tools per row and the pickers side by side, so it rarely needs scrolling; the "Full screen" button is no longer shown twice on Android.
7. iPhone home-screen app: the web app manifest allows both orientations and has an id; the Add to Home Screen tip mentions that saves are kept more reliably, and every game start asks the browser to keep saves (Safari otherwise clears site data after weeks without a visit).
8. The "rotate your device" message no longer appears in the phone layout, where portrait is a designed layout; it remains in other pages that embed the player.
9. Vibration on the NostalgistMod pad waits for the first tap (browsers block it before that and logged an error).
10. Home page: game counts no longer wrap; the engine chooser text mentions the NostalgistMod touch controls.

Checked and working on phones: no page is wider than the screen (all pages at 375 and 430 pixels); touch on the on-screen controls of both engines (holding a button, two fingers at once, release), the game menu (tap to open pauses the game, swipe down closes and resumes), the save slot picker by touch (pick, save, close), rotation during play, the library, the error screen, Links, reference docs and ObsoleteMod.

# 4.3.0-local.13: addendum, save slot picker with pictures (in-game UI)

One change to EmulatorJSMod (`data/src/enhancements.js`), available in every game
1. What it changes: the nine quick-save slots were invisible. You chose one by pressing F3 and reading a one-line message ("SAVE SLOT 4 (USED)"), with no way to see what a slot held, when it was saved, or to clear it. Now Shift+F2 opens a save slot picker over the game: all nine slots as cards with a picture of the game at the moment it was saved, how long ago that was, and which slot F2 and F4 use (marked with a star).
2. Pictures: every save into a slot (F2, the controller's Select+R1, the phone menu, the picker itself) stores a small JPEG of that moment next to the slot, about 8 KB for a SNES picture, kept in the browser with the save. Older saves made before this change show "No picture" until they are saved again.
3. Everything in one place: Save here (or save over), Load, Delete, Close. The slot you pick also becomes the F2 / F4 slot, so quick save and quick load keep working on it afterwards. Tapping a card selects it; tapping the selected card again loads it (or saves into it when empty).
4. Keyboard: arrow keys move, 1 to 9 jump to a slot, Enter loads (saves into an empty slot), S saves, L loads, Delete removes, Esc or Shift+F2 closes. Controller: Select+Up opens it, the d-pad moves, A loads, X saves, Y deletes, B closes. While it is open the keys and buttons drive the picker, not the game.
5. The game pauses while the picker is open and continues when it closes (unless you loaded a slot, which resumes from that slot). Its last frame is kept so a save made from the picker still gets a correct picture even though the game is paused.
6. It fits the screen without scrolling: three slots across in portrait and on desktop, five across on wide landscape screens such as a phone held sideways, re-laid out when the screen rotates or the window is resized; on touch screens the buttons are finger-sized and the phone's on-screen gamepad is hidden behind it.
7. Where to find it: Shift+F2 in game, Select+Up on a controller, "Save slots… (Shift+F2)" in the F1 panel, and "Save slots" in the phone game menu. F1's hotkey list includes the new keys.

# 4.3.0-local.12: addendum, idle audio suspension (audio efficiency)

One change to EmulatorJSMod (`data/src/performance.js`, plus a pause/play event in `data/src/emulator.js`), on by default
1. What it changes: RetroArch plays sound through a WebAudio context (Emscripten's OpenAL). EmulatorJS created it once and left it running for the whole session, so the browser's audio thread and the device's audio output kept working at full rate (44.1 or 48 kHz, hundreds of wake-ups a second) even when the emulator had stopped producing sound. Now the context is suspended whenever no sound can come out, and resumed when play continues.
2. When it suspends: the game is paused (F5, the F1 panel, the phone game menu, auto-pause when a controller disconnects) or the tab or app is in the background. It does not suspend while a game runs muted, because RetroArch then still feeds the audio queue and would wait for room.
3. Why sound comes back cleanly: the context is suspended, not closed, so the sound already queued is kept and playback continues from the same point. There is no skip, no burst of queued sound and no new audio setup on resume.
4. Measured (headless Chrome, SNES game paused for 10 seconds, three runs each): the browser used 45 to 50 units of CPU time with the context suspended against 55 to 58 with it running, about 18% less while paused, and the audio clock stopped advancing (0.00 s instead of 3.00 s over 3 seconds). On real hardware the larger saving is that the audio device can go idle, which most matters for laptops and phones on battery.
5. iPhone and iPad: Safari stops audio during calls, Siri or when you switch apps (the "interrupted" state) and the old code never restarted it, so the game came back silent. When the game is visible and running again the context is resumed, and if Safari needs a tap first, the next tap or key press brings the sound back.
6. Where to see it: Shift+F10 stats have a new Audio line, for example "44100 Hz, suspended (paused), idle audio stopped for 3 s", and the F1 panel's Performance section has a "Stop audio processing while paused or hidden" switch (saved per game) to compare with the old behaviour. Pausing and resuming, save and load states, fast forward and mute work as before.

# 4.3.0-local.11: addendum, phone and iPhone view

A separate layout for phones that adapts to the device (`assets/mobile.js`)
1. The site works out what it is running on (touch screen, phone or small tablet, iPhone/iPad, Android, opened from the home screen) and switches to a phone layout on touch devices whose short side is up to 820 px. Browser mode in the home page options now also chooses the layout (Auto, Desktop, Mobile), and `?view=phone|desktop|auto` overrides it for one visit.
2. Rotation is followed live: the page knows portrait from landscape, re-measures after iOS settles the new size, and lays the game out again for the new shape without reloading or interrupting play.
3. The visible height is measured from the visual viewport, so Safari's toolbars no longer push the bottom of the game or the controls off screen; notches, rounded corners and the home indicator are kept clear with safe-area insets on every page.

Game page on a phone
4. Portrait: a slim bar (Home, game title, menu button), the game picture directly below it at full width, and the touch controls in the lower half, so neither covers the other, like a handheld.
5. Landscape: the bar disappears and the game gets the whole screen, centred between the controls; a small translucent handle at the top opens the menu.
6. Game menu sheet (menu button or handle, swipe down or tap outside to close): pauses the game while open and resumes it when closed; it holds the Platform, Game and Engine choices, quick actions (EmulatorJSMod: save state, load state, undo load, reset, screenshot, fast forward; NostalgistMod: its toolbar), an on-screen controls switch, Full screen on Android, and links to Home, Library, Links and Docs.
7. No accidental zooming or pop-ups while playing: pinch, double-tap zoom, long-press callouts, text selection and page bounce are switched off over the game, while quick repeated button taps still register.
8. iPhone: Safari has no full-screen mode for web pages, so the menu explains Add to Home Screen once (dismissible); the pages carry the iOS web-app tags, so the site opens from the home-screen icon full screen with a dark status bar.

NostalgistMod on touch screens (`assets/touch-pad.js`)
9. A new on-screen controller (NostalgistMod had none, so it could not be played on a phone): d-pad with diagonals, face buttons matched to the system (NES and Game Boy B/A, SNES Y/X/B/A with L/R, Game Gear 1/2, Mega Drive A/B/C, Atari 2600 Fire, N64 A/B/Z/L/R), Select and Start.
10. Real multi-touch: every finger is tracked separately and can slide from one button to the next or around the d-pad; buttons light up while held, Android devices give a short vibration, and everything is released when the tab is hidden or the menu opens.
11. It sits below the picture in portrait and at the sides in landscape, hides itself while a physical controller is connected, and can be switched off in the menu (remembered).

Picture fixes found while testing on phones
12. Some phone browsers give RetroArch a drawing buffer in CSS pixels instead of device pixels. EmulatorJSMod's picture-sized buffer now measures the unit RetroArch really uses and sizes the canvas in it, so the picture is sharp and correctly placed on those phones as well (before, the buffer could end up a third of the intended resolution).
13. NostalgistMod no longer sets its own buffer size, which on such phones put the picture in one corner of the screen; RetroArch sizes it from the canvas box after every layout change, on phones and on desktops alike.

Home page and other pages on a phone
14. Home: a bottom bar with Open file, Library, Recent and Links; "Tap to open a game file" instead of the drop text; larger rows, game tiles in two columns (three in landscape); a compact header in landscape; no help badges in the link row; 16 px fields so iOS does not zoom when a field is tapped.
15. The game library in the player, the Links page and the reference docs viewer use the same phone layout, safe areas and touch sizes.

# 4.3.0-local.10: addendum, reference docs viewer

Reference docs (`reference-docs/`, `reference.html`)
1. The supplied reference documents are part of the site: 144 Markdown pages in `reference-docs/`, one for every file of the project in the same folder layout, plus a project overview (00), an asset index (01) and a ROM evaluation (02).
2. New viewer page `reference.html`: shows any document as a formatted page (tables, code blocks, headings), with a side list of all documents grouped by folder, a filter box (press / to jump to it; several words narrow the list, e.g. "nostalgist classes"), and Overview and Asset index buttons. On narrow screens the list opens from a Documents button.
3. Links between documents open in place and the address changes with them (`reference.html?doc=assets/app.js.md`), so Back and Forward work and any page can be bookmarked or shared; links to headings (`#data`) jump to them. Only documents in the list can be opened.
4. Everything is local: Markdown is rendered with a copy of marked (`assets/vendor/marked.esm.js`, MIT) and cleaned with DOMPurify (`assets/vendor/purify.es.mjs`, Apache-2.0 or MPL-2.0) before it is shown. The service worker now also keeps `.md` files, so the docs open offline after a first visit.
5. `tools/generate-reference-index.mjs` writes `reference-docs/files.json` (the list the viewer reads, since GitHub Pages cannot list folders); the GitHub workflow runs it on every push that changes the docs, and `npm run index` runs it too.

Links to it
6. Home page: a third link, "Reference docs", next to "What's changed from the original EmulatorJS" and "Links".
7. Links page: a third entry in Documents, after ENHANCEMENTS.txt and the README.

# 4.3.0-local.9: addendum, ObsoleteMod and the Links page

ObsoleteMod added to the site (`obsoletemod/`)
1. The ObsoleteMod project ("Emu", a seven-system retro game shelf with ten library views, folder/ZIP/ROM import, ROM asset export, touch controls, state saves and its own emulator configuration page) is now part of the site, in its own folder with its pages, styles and data files unchanged apart from the items below.
2. It runs on this site's EmulatorJSMod engine and the `.7z` cores in `data/cores` instead of the EmulatorJS CDN and its old `.data` core copies, so it works on GitHub Pages without any outside request and gets the F1 hotkeys, save slots and performance features (picture-sized buffer, lean surface and the rest).
3. JSZip (used for ZIP imports and the asset export) is served from `obsoletemod/vendor/jszip.min.js` instead of esm.sh; Google Fonts were removed and the styles fall back to system fonts. Both outside requests would also have been blocked by the cross-origin isolation the site uses for threads.
4. A SITE button in ObsoleteMod's header and on its ROM links page leads back to the site's Links page.
5. Its ROM files are not shipped with the site download; `obsoletemod/roms/<system>/` keeps the folders and `roms/manifest.json` and the catalogues keep listing the games, so copying the files back restores the library.

Links page
6. New `links.html`: one page with every part of the site: EmulatorJS home, the game library in the player, ObsoleteMod, ObsoleteMod's configuration, ROM links and readme, ENHANCEMENTS.txt and the README.
7. Reached from a Links link on the home page (next to "What's changed") and a Links button next to Home on the game page.

Engine fix found while adding ObsoleteMod
8. `data/loader.js` can now be loaded again on the same page. Pages that play several games without reloading (ObsoleteMod opens and closes its player) inject the loader once per game; the second time the browser stopped it with "already declared" errors, and the next game never started. The loader now runs in its own block.

# 4.3.0-local.8: addendum, lean opaque game surface (graphics efficiency)

One change to EmulatorJSMod (`data/src/performance.js`), on by default
1. What it changes: the WebGL surface the game is drawn on is now created opaque (alpha off) and, for 2D cores, without the depth and stencil buffers. EmulatorJS created it the WebGL default way: transparent (alpha on, premultiplied), plus a 24-bit depth and an 8-bit stencil buffer the size of the screen surface.
2. Why the transparent surface cost work: the browser had to treat the game as a see-through layer and blend every pixel of it with the page below, every frame. An opaque layer is simply copied, and Chrome, Edge and Safari can hand an opaque canvas to the GPU's hardware overlay (direct scan-out), skipping the page compositing step completely in full screen.
3. Why depth and stencil were waste: NES, SNES, Game Boy, Game Boy Color, Game Gear, Atari 2600 and every other 2D core draws its finished picture as one flat image; RetroArch's menu and shaders work in their own buffers. The two buffers cost 4 bytes of video memory per pixel: 4.3 MB at 1195×896, 8.9 MB at the old full-player 2000×1112, about 21 MB in 4K full screen, all freed. They no longer have to be resolved or cleared each frame either.
4. 3D cores keep both buffers: Nintendo 64 (mupen64plus_next, parallel_n64), PSP, DS, Dreamcast, Saturn, 3DS, hardware PlayStation renderers and DOS, plus any core whose name ends in _hw or gl. A site owner can keep them for every core by setting `keepDepthBuffer: true` in the EmulatorJS config.
5. Measured (Chrome with software graphics, SNES with the CRT Easymode shader at 2× density, the heaviest case available here, two runs each): 16.1 fps with the old surface, 16.9 fps with the lean one, about 5% faster with nothing else changed. Without a shader both run at a full 60 fps; on a real graphics chip the gain shows as lower GPU load and power use rather than higher fps.
6. Nothing looks different: the game picture, shaders, screenshots, save states and the black bars around the picture are unchanged (checked by reading back screenshots with and without a shader).
7. Where to see it: Shift+F10 stats have a new Surface line, e.g. "opaque, no depth/stencil (2D core)" or "depth/stencil kept (3D core)"; the F1 panel's Performance section shows it too and has a "Lean opaque game surface" switch (saved per game, applies from the next start) to compare with the old surface.

# 4.3.0-local.7: addendum, picture-sized render buffer (graphics efficiency)

One change to EmulatorJSMod (`data/src/performance.js`), on by default
1. What it changes: RetroArch makes its drawing buffer as large as the canvas box. EmulatorJS made that box the whole player area, black bars included, at the screen's full pixel density. A 256×224 SNES game in a 1000×555 player on a 2× (Retina / high-DPI) screen was drawn into a 2000×1112 buffer: 2.2 million pixels per frame, about a third of them black bars. Now the canvas box is exactly the game's picture, and on screens with enough pixels the buffer is a whole multiple of the game's own lines (×3 or more). The browser's compositor scales that buffer the last step to the picture size.
2. Measured (Chrome, SNES at 60 fps): 1× screen 1000×555 buffer → 740×555 (26% fewer pixels); 2× screen 2000×1112 → 1195×896 (52% fewer); 1920×1080 window with the NES test ROM 1920×882 → 878×672 (65% fewer). A 4K full screen drops from about 8.3 to 5.4 million pixels per frame for a 224-line game.
3. Why it is faster: every frame RetroArch clears, draws and presents fewer pixels, the WebGL buffer uses less video memory, and the browser has less to copy to the screen. This matters most on laptops and phones with high-density screens, integrated graphics, 4K monitors and full screen.
4. How the picture looks: the black bars are drawn by the page instead of the game. With the whole-number step, every game pixel is the same size (no uneven rows or shimmer when the screen scrolls); the browser's final smooth step of at most about 1.33× softens edges very slightly. When the picture has fewer than three screen pixels per game line, the buffer keeps full resolution and only the bars are removed, so a small player on a 1× screen looks exactly as before.
5. Follows the game: the layout is recalculated when the player is resized, on full screen, when the game changes resolution (menus, hi-res and interlaced modes, PAL/NTSC) and when the video rotation changes.
6. Works with the other performance features: render resolution and performance mode scale this smaller buffer further (performance mode on a 2× screen gives ×3 lines, 896×672).
7. Kept at full size where it matters: with a shader chosen the buffer keeps every screen pixel of the picture (CRT and scanline shaders need them; the bars are still left out); mouse and light-gun cores keep the original canvas so pointer positions stay exact.
8. Where to see it: Shift+F10 stats show a new Buffer line, e.g. "picture only, x4 lines, 52% fewer pixels than 2000×1112"; the F1 panel's Performance section shows the same and has a "Picture-sized render buffer" switch (saved per game) to compare with the old behaviour. Screenshots work as before.

# 4.3.0-local.6: addendum, 15 performance features and folder games in both engines

Performance features in EmulatorJSMod (`data/src/performance.js`)
1. Live performance stats, Shift+F10: emulation speed in % of full speed, frame time average and worst, late frames,
   display refresh rate, render resolution, graphics chip and WebGL version, core build, JS memory and startup time.
2. Startup timing: how long the core download, the game load and the boot took, shown in the stats and the F1 panel
   (and in the console with ?debug=1).
3. Slow-game detector: after a warm-up, a game that runs below 90% speed for 10 seconds offers performance mode once.
4. Performance mode, Shift+F9 or the F1 panel: one switch for features 5 to 7, on and off while playing.
5. Render resolution 100%, 75% or 50%: RetroArch draws into a smaller buffer that is stretched to the same size on
   screen, which cuts the GPU work on weak or very high-resolution screens. Mouse cores always use 100%.
6. Automatic frameskip: in performance mode, cores that offer a frameskip option are set to auto (or 1), and back again.
7. Shader bypass: in performance mode the chosen shader is switched off and restored afterwards.
8. Low-latency canvas: the game canvas is created with a desynchronized WebGL context, so frames reach the screen
   without waiting for the page compositor (less input lag where the browser supports it).
9. Run-ahead (optional, off by default): RetroArch's single-instance run-ahead of one frame removes a frame of
   built-in game lag at the cost of extra CPU. Skipped in performance mode.
10. Refresh-rate adaptation: the display rate is measured at start; on 120, 180 and 240 Hz screens RetroArch presents
    every 2nd, 3rd or 4th refresh so 60 fps games keep their normal speed and smooth pacing.
11. Audio latency choice: Low 32 ms, Normal 64 ms, Safe 96 ms or Stable 128 ms (was fixed at 64 ms). Lower is more
    responsive, higher stops crackling on slow devices.
12. Software graphics warning: when the browser draws WebGL in software (SwiftShader, llvmpipe, Basic Render Driver),
    a message explains how to turn on hardware acceleration and offers performance mode.
13. Per-game performance profiles: every setting above is saved per game, and a new game starts with the settings
    used last.
14. Core prefetch: pointing at (or tabbing to) a game on the home page or in the player's library downloads its core
    in the background, so it is cached when the game starts. Skipped with data saver or on 2G connections.
15. Low-battery power saver: on battery at 20% or less, performance mode turns on for the session, with a button to undo.

The F1 panel has a new Performance section with these settings. Run-ahead, audio latency, low-latency canvas and the refresh-rate adaptation apply from the next game start (RetroArch reads them at boot); the others apply at once.

Folder games in both engines
16. play.html without a game opens the game library inside the player: once the chosen engine and the core list are
    loaded, every ROM and zip in data/A2600, GB, GBC, GG, NES, SNES and N64 is listed by platform and starts with
    one click, in EmulatorJSMod or NostalgistMod. Platforms the engine cannot run are shown disabled with the reason.
17. play.html?folder=NES lists one folder; adding &autoplay=1 starts its first game.
18. The home page loads the chosen engine before listing the folders, marks platforms that engine cannot run, links to
    the library in the player, and lists the folders again when the engine is changed.
19. Only real game files count: a folder's ROM extensions plus zip and 7z. Readme files, cover art, saves and patches
    dropped into a folder no longer appear as games.
20. Two files with the same title (game.nes and game.zip) show their type in the library.
21. NostalgistMod requests cores with the same address as EmulatorJSMod (with ?v=), so both engines and the prefetch
    share one cached download.

# 4.3.0-local.5: two engines (EmulatorJSMod and NostalgistMod)

Engine choice
1. When the site opens, a dialog asks which engine to use: EmulatorJSMod or NostalgistMod. The question is asked once per
   browser session; "Remember my choice" stops it. The home page shows the current engine with a Change button.
2. The game page has an Engine dropdown that restarts the current game with the other engine; links between games keep it.
3. A file dropped while the question is open waits for the answer.
4. `engines/EmulatorJSMod.js` is the entry point for the existing engine (data/loader.js + data/src).

NostalgistMod (`engines/NostalgistMod.js`, source and build script in `tools/nostalgist-mod`)
5. Built from the Nostalgist.js source (MIT) with no CDN access at all: cores are read from `data/cores/*.7z` and unpacked
   with the site's own 7z worker; the CDN ROM and shader lookups and the zip.js download are removed.
6. Runs the EmulatorJS core builds as they are: a loader for their `EJS_Runtime` module format and `Module.parent`.
7. Input bridge: these builds take input through `simulate_input`, not RetroArch's keyboard driver, so keyboard
   (Nostalgist's default bindings), gamepads (standard layout, left stick also as d-pad, analog sticks) and
   `press()` / `pressDown()` / `pressUp()` are routed there. Held buttons are released on blur and when the tab is hidden.
8. Save and load state use the builds' in-memory state functions; screenshots read the builds' fixed screenshot path.
9. A `File` passed to Nostalgist keeps its name (it became data1.bin, which broke patches and cue/bin sets).
10. Only single-threaded core builds are used (Nostalgist does not start pthreads); PSP and DOS show a message with a
    button to switch to EmulatorJSMod.

NostalgistMod player on the game page (`assets/nostalgist-player.js`)
11. Toolbar: Pause/Resume, Reset, Save state, Load state, Screenshot, Fullscreen, Exit.
12. Hotkeys F2 save, F4 load, F5 pause, Shift+F5 reset, F8 screenshot, F11 fullscreen (same as EmulatorJSMod).
13. In-game saves (SRAM) are restored on start and written every 30 s, when the tab is hidden and on exit; save states are
    kept per game. Both live in IndexedDB ("NostalgistMod-saves").
14. Patches, BIOS files and zipped ROMs work as with EmulatorJSMod; the canvas follows the player size; sound starts on
    the first click or key press.

# 4.3.0-local.4: game library and game page

Game library folders
1. New folders `data/A2600`, `data/GB`, `data/GBC`, `data/GG`, `data/NES`, `data/SNES` and `data/N64` for ROMs and zips.
2. `data/platforms.json` maps each folder to its system; add a line and a folder to add another platform.
3. The home page lists the games in those folders after the core list has loaded, and only for platforms whose cores exist.
4. `tools/generate-rom-index.mjs` writes `data/<FOLDER>/index.json`, because GitHub Pages cannot list folders.
5. `.github/workflows/update-indexes.yml` regenerates the game lists and the core manifest on every push, so games
   uploaded through the GitHub website appear without running anything locally.
6. On a local server that lists folders (`serve.py`, `start-windows.bat`) new files appear without regenerating the index.

Game page (`play.html`)
7. Every game now opens on its own page with a Home link and the game name.
8. A Platform dropdown (folders with games, plus Recent games) and a Game dropdown switch to another game in one step.
9. Files opened from your device are stored with their BIOS and patch, so the game page (and a reload of it) can open them.
10. A BIOS or patch chosen under Options also applies to the next game opened from a library link.
11. Exiting the game, or "Back to menu" after an error, returns to the home page.

Home page
12. Every option, section and button has a three-sentence explanation on hover, on keyboard focus, or by tapping its "?" badge.
13. "What's changed from the original EmulatorJS" opens `ENHANCEMENTS.txt`, a full list of the changes.

Fixes found while building this
14. Engine: files downloaded from a URL keep their real name ("Green Test.nes", not "Green%20Test.nes", and no
    "?v=…" suffix), so patches and companion files (cue/bin, m3u) find each other.
15. Service worker: game lists and folder listings are always fetched fresh, and ROMs in the folders are not cached
    a second time (EmulatorJS keeps its own copy).
16. The core manifest no longer contains a timestamp, so it only changes when the cores change.

# 4.3.0-local.3: 50 engine improvements

Under-the-hood work in `data/src` (no change to how the page is used).

Saves and data safety
1. On exit, IndexedDB saves are flushed (`syncfs`) before `/data/saves` is unmounted; the last in-game save could be lost before.
2. In-game saves are written when the tab is hidden (mobile browsers often close hidden tabs without unload events).
3. Loading saves from IndexedDB can no longer hang startup: errors and a 10 s timeout fall back to in-memory saves with a warning.
4. In-game saves are not rewritten every interval while the game is paused.
5. `disableDatabases`, or a browser without IndexedDB, uses no-op save-state storage instead of failing.
6. Settings writes survive a full or blocked localStorage instead of throwing during page hide.
7. Per-game settings are parsed once and cached until the next write (they were re-parsed on every `getCore()` call).
8. A malformed per-game settings entry no longer stops volume and mute from loading.

Startup and errors
9. The first start error is kept on screen; follow-on errors no longer overwrite the real cause.
10. `startGameError` cannot throw halfway (it crashed when saved settings existed but the core had not loaded), so the error screen always appears.
11. Startup failures anywhere in the download/initialisation chain now show an error instead of stalling on the loading text.
12. A failed save-state download no longer leaves startup waiting forever.
13. Core archives are validated: a missing `.js`/`.wasm` or bad `core.json` gives "Invalid core archive" instead of a crash.
14. Missing PPSSPP assets (`ppsspp-assets.zip`, not in the supplied cores) no longer stop PSP games from starting.
15. In-memory ROM/BIOS data that cannot be read resolves as a failed download instead of hanging.
16. Errors in a local archive (corrupt zip/7z) are reported with the file name, labelled as game data, not "Game Core".
17. Archives that contain only junk entries report "No game file found".
18. Late progress updates after the game started no longer throw (loading text removed); errors recreate the text if needed.
19. The loader finds its own path when `document.currentScript` is unavailable, and shows a message in the player box when the engine files are missing.

Loading performance
20. Local uncompressed ROMs are used directly: no full-file hash and no second copy in IndexedDB (a 700 MB disc image was duplicated before).
21. Cache blob writes for one item happen in a single transaction, with the manifest written last so a partial write never looks complete.
22. Cache blob reads issue all chunk requests in one transaction and merge into one buffer.
23. `getKeys()` reads keys only; the old cursor loaded every cached chunk into memory during cleanup.
24. The cache database is opened once (it was opened in parallel by every download) and the probe connection is closed.
25. If the cache database cannot be opened the cache switches off and downloads continue.
26. Cache eviction removes the least recently used items; the old loop evicted the newest items first.
27. Directories created while unpacking archives are remembered instead of re-checked for every file.
28. External support files download in parallel, and one failure no longer affects the others.
29. Which cores exist locally is computed once from the manifest instead of scanning it on every lookup.

Input
30. Keys and buttons held while the window loses focus or the tab is hidden are released (they stayed pressed in the game).
31. Buttons held on a controller that disconnects are released for that player.
32. The emulator-hotkey input path no longer allocates an array per input event.
33. Quick load reports an empty slot ("SLOT n IS EMPTY") instead of claiming success.
34. Play/pause and autofire release are safe to call before the core is running.

Audio and video
35. Suspended audio resumes on the first click, key or tap on every browser (was Safari-only, polling every 10 ms); the Safari prompt closes on the audio state change.
36. Volume values are clamped to 0..1 and ignored safely before the core has loaded.
37. The WebGL2 support probe releases its context (browsers cap live WebGL contexts).
38. iPadOS (desktop user agent) and browsers with UA client hints are detected as mobile.
39. Screenshots use a valid image type (`jpg` becomes `image/jpeg`, unknown types fall back to PNG); a failed encode retries as PNG.
40. RetroArch-source screenshots time out after 5 s and fall back to the canvas instead of polling forever.
41. The player reacts to container size changes (ResizeObserver), not only window resizes.

Engine structure
42. Event handlers are isolated: one failing `on()` handler no longer stops the rest (or the game start).
43. `off(event, handler)` added.
44. Exit tears everything down: all DOM listeners (826 in a SNES session), timers, gamepad polling and the resize observer.
45. Only the ROM download renames `config.gameUrl`; a BIOS or patch passed as data used to overwrite it.
46. `getBaseFileName` and `saveInBrowserSupported` handle a `File` ROM (they threw on `.startsWith`).
47. Core options: configured defaults are always written, saved values override by exact key (a saved `foo_bar` used to hide
    the default for `foo`), and empty values are quoted.
48. RetroArch config values are stripped of quotes and line breaks so a value cannot break or inject config lines.
49. Multi-disc playlists sort naturally ("Disc 2" before "Disc 10") and no longer require names that start with a digit.
50. Routine logs only appear in debug mode (core download, extraction choices, repeated gameId warning).

Also fixed in the launcher: a file picked in the first seconds of a first visit could be lost to the one-time
service-worker reload; it now waits for setup, and that reload never happens under a running game.

# 4.3.0-local.2: 50 enhancements

New `data/src/enhancements.js` (engine) and a rebuilt launcher (`index.html`, `assets/*.js`).
Turn the engine layer off with `window.EJS_disableEnhancements = true` (config `disableEnhancements`).

In game: hotkeys and controls
1. Hotkey layer on F-keys: ignored while typing, remapping or in menus, and never sent to the game.
2. F1 panel: hotkey list, play time, used save slots and on/off switches for the options below (remembered).
3. F2 quick save to the current slot.
4. F3 / Shift+F3 next / previous slot, showing whether it is used or empty.
5. F4 quick load, with a clear "slot is empty" message instead of a silent no-op.
6. Shift+F4 undo the last load (or reset / resume).
7. F5 pause / resume.
8. Shift+F5 reset game (undoable).
9. F6 fast forward on / off.
10. F7 slow motion on / off.
11. F8 screenshot download.
12. F9 mute / unmute.
13. F10 FPS counter overlay.
14. F11 fullscreen.
15. Controller hotkeys while holding Select: R1 save, L1 load, R2 fast forward, L2 next slot, Start pause.
    The combo button is not passed to the game.
16. Controller rumble on save and load (when supported).

Saves
17. Quick-save slots are kept in IndexedDB and restored next time (they were lost on reload).
18. A resume point is saved when the tab is hidden, the page closes or the game exits.
19. On start, a prompt offers to resume from that point.
20. In-game (SRAM) saves are flushed every 30 s by default, unless an interval is configured.
21. Persistent storage is requested so the browser does not evict saves.
22. Save states work with the supplied 4.2-era cores: `getState` falls back to `save_state_info` when the
    core has no `EmulatorJSGetState` (previously every save state failed with these cores).

In game: session
23. Pause when the tab is hidden; resume when it comes back.
24. Pause when a controller disconnects.
25. Screen Wake Lock while playing.
26. Media Session: game title and play / pause from system media controls.
27. Tab title shows the game name.
28. Mouse cursor hides after 2.5 s idle.
29. Optional CRT scanline overlay.
30. Play time per game (shown in F1 panel and the recent games list).
31. Low battery (15 %, not charging): resume point saved and a warning shown.
32. Portrait-phone hint to rotate for a bigger picture.
33. WebGL context loss: message with a reload button instead of a frozen canvas.
34. "Back to menu" button when a game fails to start.

Engine: downloads and storage
35. Transient download failures are retried twice with backoff; 404s fail immediately.
36. Stalled downloads time out after 30 s without data (before, only the headers had a timeout).
37. Items are not cached when the storage quota cannot hold them.
38. IndexedDB opens at the existing version and reconnects after a close, so restored or upgraded databases stay readable.
39. The service worker also precaches the decompression workers and launcher modules.

Launcher
40. Recent games: ROMs are kept in IndexedDB for one-click play (12 most recent, up to 512 MB each).
41. Remove a game from the list; entries whose data is gone are cleaned up.
42. Each entry shows system, last played and play time.
43. Header detection for ambiguous files (.bin/.iso/.cue …): NES/FDS, N64, GB, GBA, NDS, Genesis, 32X,
    Master System, Game Gear, Lynx, Atari 7800, Sega CD, Saturn, 3DO, PlayStation and PSP.
44. Zip detection from the file names inside (no extraction), e.g. a zip containing a .nes runs as NES.
45. IPS / BPS / UPS patches applied on load (drop with the ROM, or choose in Options).
46. Multi-file drop: ROM, BIOS and patch are sorted out automatically.
47. Options are remembered; the system picker can remember a choice per extension and can be cancelled.
48. Installable as an app (web manifest) and warnings when WebAssembly, WebGL or https are missing.
49. "New version available" banner, plus storage usage and a "Clear download cache" button.
50. Export / import of all saves, save states and settings as one backup file.

# 4.3.0-local

Local-only build of 4.3.0-pre for static hosting. Behaviour is unchanged unless listed here.

1. No CDN use: the CDN core fallback, the update check and the "download minified files" hints are gone.
2. Cores load from `data/cores/<core>[-thread][-legacy]-wasm.7z` exactly as built (no renaming to `.data`).
3. The per-core `reports/*.json` request is gone. The reports are not part of the supplied cores, so it returned
   404 on every launch, and the random fallback version it then used meant the cached core was never found:
   the core was downloaded and unpacked again each time.
4. `data/cores/manifest.json` (generated by `tools/generate-core-manifest.mjs`) lists the cores that exist, their
   extensions and WebGL2 defaults. Variant selection falls back across thread/legacy builds that are present.
5. `loader.js` imports `emulator.js` directly instead of probing for a `.min` file, and fetches script, styles,
   language pack and manifest in parallel.
6. Netplay, socket.io and the license text are loaded on first use (about 170 kB less at startup).
7. IndexedDB: one shared connection per database instead of opening a new, never-closed connection for every call.
8. IndexedDB: `getAll`/`getKeys` use a single cursor, and the racy `?EJS_KEYS!` read-modify-write index is no
   longer maintained.
9. Cache keys use a word-wise 32-bit hash (about 22 ms for 10 MB) instead of a per-byte loop.
10. Cache `put` checks for an existing entry without loading its blobs; `get` no longer waits on the access-time write.
11. Downloads fill a pre-sized buffer (no chunk list + Blob + copy) and report progress once per percent.
12. `sw.js` caches the app and recently used cores for fast repeat visits and offline use.
13. `sw.js` adds COOP/COEP headers so threaded cores work on GitHub Pages.
14. Gamepad polling follows display frames while a pad is connected and idles at 2 Hz otherwise (was a 100 Hz timer
    with per-poll allocations).
15. Core script and wasm blob URLs are created once and released; `locateFile` no longer leaks a URL per call.
16. Decompression worker scripts are fetched once and reused, workers are terminated when done, and worker errors
    now surface instead of hanging.
17. ROM, BIOS, save state, parent and patch downloads run in parallel.
18. Window resize is throttled to one run per frame; fullscreen changes now actually re-run the resize handler
    (the old code only called `.bind`).
19. Settings are written to `localStorage` after a short debounce and when the page is hidden.
20. `getCores()` no longer mutates the shared table (on iOS Safari it reversed the N64 core order on every call).

Also: new `index.html` (system picker limited to available cores, whole-page drag and drop, exit returns to the
menu), cache manager no longer throws when the cache is disabled, `.gitignore` no longer excludes `data/cores`,
and upstream CI/dev-container/packaging files were removed.

# 4.3.0-pre

**This is a PRE RELEASE. It is not marked as stable for a reason. Running this in a prod environment where stability is needed is not advised.** Many, many things have changed. Cores are not inter-changable between versions

Many subsystems were completely redone in this release. Things may break. Please report them so I can yell at other maintainers

One thing I really like about this update is PPSSPP is significantly more playable (as in, it is. Runs even at 10x fastforward on my pc)

- Redo method used to read save states from the backend (may be slower but significantly less error-prone)
- Throw network errors instead of supressing them
- Add genesis_plus_gx_wide core
- Add bsnes core
- Add freeintv core
- Add azahar core
- Redo start game detection
- Move to ES6 modules
- Disable async for most cores
- Move to rwebaudio driver
- Fix hardware rendering for PPSSPP core
- Finish DOS support with a batch bootup file (this can be disabled)
- Update af-FR translation (Thanks to [@t3chnob0y](https://github.com/t3chnob0y))
- Fix custom broken buttons (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Redo language support (Thanks to [@allancoding](https://github.com/allancoding))
- Update ko translation (Thanks to [@UzuCore](https://github.com/UzuCore))
- Fix context menu visibility options (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Update ja translation (Thanks to someone who seems to have deleted their account)
- Fix `EJS_dontExtractBIOS` if the bios url has a "/" in its path (Thanks to [@daguile](https://github.com/daguile))
- Add jsdoc comments to compression.js (Thanks to [@gantoine](https://github.com/gantoine))
- Improve multi-disc handling for dosbox-pure (Thanks to [@daguile](https://github.com/daguile))
- Added netplay over WebRTC (Thanks to [@S-Coding23](https://github.com/S-Coding23))
- Fix screenshot return in EJS_onSaveState (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Fix bug in loadExternalFilesFixed function (Thanks to [@lxyongit](https://github.com/lxyongit))
- Redo the SVG logos (Thanks to [@milktoastrat](https://github.com/milktoastrat))
- Add event for when game save is updated (Thanks to [@cryptonaus](https://github.com/cryptonaus))
- Support a fixed save flushing interval (Thanks to [@cryptonaus](https://github.com/cryptonaus))
- Update ja translation (Thanks to [@paln21](https://github.com/paln21))
- Refactor cache system (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Refactor decompression system (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Refactor download system (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Improve UI in development index.html (Thanks to [@298A-E9E3](https://github.com/298A-E9E3))
- Ability to disable beforeUnload event listener (Thanks to [@duanyu5871](https://github.com/duanyu5871))
- Fix PSX labels (Thanks to [@joethun](https://github.com/joethun))
- Fix save state text (Thanks to [@joethun](https://github.com/joethun))
- Add support for dynamic cheat codes (Thanks to [@S-Coding23](https://github.com/S-Coding23))
- Automatic core detection in the development index.html for Sega Mega Drive games (Thanks to [@298A-E9E3](https://github.com/298A-E9E3))
- Fix Sega Genesis control scheme (Thanks to [@mikhailv](https://github.com/mikhailv))
- Add auto fire interval (Thanks to [@zees-dev](https://github.com/zees-dev))
- Add Khmer localization (Thanks to [@Novsochetra](https://github.com/Novsochetra))
- Update Turkish Translation (Thanks to [@Notenlish](https://github.com/Notenlish))
- Add exit confirmation prompt and exit callback functionality (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Fix localization for Quick Save and Quick Load (Thanks to [@leonardoman9](https://github.com/leonardoman9))
- Add Ukrainian Translation (Thanks to [@MrSosige](https://github.com/MrSosige))

# 4.2.3

Bug fix release

- Redo image capture features (Thanks to [@allancoding](https://github.com/allancoding))
- Fix issue with invalid button names (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Fix issues with canvas size
- Update zh-CN translations (Thanks to [@incredibleIdea](https://github.com/incredibleIdea))

# 4.2.2 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/a796c4a3866652d1b6cb74a2b90e9552955c2b13)

- Prioritize gameName over gameUrl for the local storage identifier
- Fix CSS parsing when setting a background image (Thanks to [@kellenmace](https://github.com/kellenmace))
- Add `EJS_dontExtractBIOS` option (Thanks to [@pjft](https://github.com/pjft))
- Delete old screenshot file before saving a new one (Thanks to [@gantoine](https://github.com/gantoine))
- Add `saveSaveFiles` event for when save files are updated
- Add `saveDatabaseLoaded` event, for when the `/data/saves` directory has been mounted
- Add ability to set a system save interval
- Add the ability to hide settings from the settings menu with the `EJS_hideSettings` option
- Attempt to auto-detect system language and attempt to load that file.
- Add `EJS_disableAutoLang` option to disable auto language detection in `loader.js`
- Update Japanese translation file (Thanks to [@noel-forester](https://github.com/noel-forester))
- Add dropdown selection for gamepads
- Correct N64 virtual gamepad inputs
- Change path to `retroarch.cfg`
- Add `joystickInput` property for virtual gamepad buttons
- Removed `this.listeners`
- Update Korean translation file (Thanks to [@SooHyuck](https://github.com/SooHyuck))
- Redo touchscreen detection (Thanks to [@allancoding](https://github.com/allancoding))
- Redo toolbar visibility method (Thanks to [@allancoding](https://github.com/allancoding))
- Add `dosbox_pure` core (requires threading)
- Add toggle for direct keyboard input
- Redo scrolling in settings menu
- Redo about menu CSS
- Add setting to enable/disable mouse lock
- Properly handle failed save states
- Fix unknown axis events being discarded
- Write core settings file before loading the core (Some core settings are required to be loaded from here on startup)
- Add option to disable `alt` key when using direct keyboard input
- Cleanup famicom controls
- Fix setting gamepad axis to input values 16 to 23
- Rework internal method of getting user settings, add `this.getSettingValue` function
- Add Romanian translation file (Thanks to [@jurcaalexandrucristian](https://github.com/jurcaalexandrucristian))
- Fix build stack size when building cores
- Fix CHD support

# 4.2.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/13362ef0786990e93462f06505de772031cfc4c2)

This was a bug-fix only release.

- Core-fetch failsafe now fetches a pinned version (Thanks to [@gantoine](https://github.com/n-at))
- Fixes video rotation on the arcade core (Thanks to [@allancoding](https://github.com/allancoding))
- Updated French `af-FR` translation (Thanks to [@t3chnob0y](https://github.com/t3chnob0y))
- Fixes switching between cores.
- Change: Localstorage settings are now stored by game instead of by system.
- Fixed gamepad input for c-down.
- Fixed RetroArch always assuming save is `.srm`.
- Fixed EJS exit event
- Hide the "save/load save files" buttons if unsupported.
- Corrects the order of the core list.
- Corrects behaviour of the placement of bios/parent/patch files.
- Fixed rar decompression.
- Fixed picodrive core (`sega32x`)
- Fixed libretro-uae core (`amiga`)

# 4.2.0 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/8d42d53d4fdf0166f71eaa07529cadf93350b76e)

In my opinion, this is the most stable release we've had in a while. Many features added in this release were just side affects of fixing up some bugs.

- Let same_cdi core handle zipped bios file directly (Thanks to [@pastisme](https://github.com/pastisme))
- Fix audio sliders/mute button (Thanks to [@n-at](https://github.com/n-at))
- Add ability to rotate video (Thanks to [@allancoding](https://github.com/allancoding))
- Added persian `fa-AF` language (Thanks to [@iits-reza](https://github.com/iits-reza))
- Added more catches for a start-game error
- Fixed default webgl2 option
- Organized settings menu, by dividing entries into sub-menus
- Fixed the EmulatorJS exit button
- Added the ability to internally add configurable retroarch.cfg variables
- Fixed default settings being saved to localstorage
- Fixed in browser SRM saves (finally)
- Read save state from WebAssembly Memory
- Fixed an issue when loading PPSSPP assets
- Refactored the internal downloadFile function to be promised based instead of callback based
- Added checks if core requires threads or webgl2
- Added ability to switch between cores in the settings menu
- Added the ability to enable/disable threads if SharedArrayBuffer is defined
- Added a PSP controller scheme for the control settings menu
- Fixed the volume slider background height in firefox
- Added handling for lightgun devices
- Refactored the EmulatorJS `build-emulatorjs.sh` build script
- Added `ppsspp` core

# 4.1.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/4951a28de05e072acbe939f46147645a91664a07)

- Fixed 2xScaleHQ and 2xScaleHQ shaders (Thanks to [@n-at](https://github.com/n-at))
- Added Vietnamese (`vi-VN`) (Thanks to [@TimKieu](https://github.com/TimKieu))
- Disable CUE generation for the PUAE core (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Updated German translation (Thanks to [@jonas0b1011001](https://github.com/jonas0b1011001))
- Add missing calls to translate (Thanks to [@angelmarfil](https://github.com/angelmarfil))
- Added Turkish (`tr-TR`) (Thanks to [@iGoodie](https://github.com/iGoodie))
- Fixed Gamepad support for some older browsers (Thanks to [@ZhaoTonggang](https://github.com/ZhaoTonggang))
- Default to webgl1 on lower end cores.
- Added ability to switch between webgl1 and webgl2.
- Check core compatibility with EmulatorJS.
- Added core license to right-click menu.
- Removed usage of `replaceAll`.
- Added the ability to change settings on game start crash.
- Added `exit` button, to properly shutdown and save files.
- Fixed mouse on mobile devices.
- Modularized EmulatorJS.
- Fixed WHLoader hdf roms.
- Added support for `File` objects (Thanks to [@pastisme](https://github.com/pastisme)).

# 4.0.12 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/c3ba473d1afc278db136f8e1252d0456050d6047)

- Fix scroll bar css (Thanks to [@allancoding](https://github.com/allancoding))
- Flip the context menu instead of going off the page
- Add hooks for save files (Thanks to [@gantoine](https://github.com/gantoine))
- Add class for each virtual gamepad button
- Add `EJS_forceLegacyCores` option
- Add `EJS_noAutoFocus` (this is only for advanced developers, not likely an option you will use)
- Added supported Amiga file extensions (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Display the file name of the ROM/disk when using M3U lists (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Added vsync option
- Added advanced shader configuration support (Thanks to [@n-at](https://github.com/n-at))

# 4.0.11 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/cafd80d023afa9562c7054e89a4240f3381d64ff)

- Added the ability to disable localstorage using `EJS_disableLocalStorage`. (Thanks to [@n-at](https://github.com/n-at))
- Added the ability to trigger `EJS_emulator.displayMessage` with a duration. (Thanks to [@allancoding](https://github.com/allancoding))
- `EJS_emulator.gameManager.getState` now returns a Uint8Array instead of a promise.
- Fixed broken save states from the 4.0.10 release.

# 4.0.10 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/390605d2ab48db16c07c8fb4fc2815033af5c3a6)

- Fixed bug with duplicate control inputs.
- Fixed mobile settings menu positioning.
- Ability to load custom files into the wasm instance.
- Renamed the `mame2003` system to `mame`.
- Removed mame disclaimers on `mame2003` core.
- Added VICE cores for C64, C128, VIC20, Plus/4, and PET (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Added a padding between popup body and buttons.
- Added ability to disabled cached databases.
- Fixed screenshot for some cores.
- Fixed game element not being focused after fullscreening.
- Added missing Famicom controls.
- Fixed volume slider shadow. (Thanks to [@allancoding](https://github.com/allancoding))

# 4.0.9 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/ddb5c6092f12a63a46d74ea67e6469726665ebc2)

- Repository history rewrite - expect faster cloning times.
- Prevent Vice64 from creating cue files (Thanks to [@michael-j-green](https://github.com/michael-j-green))
- Chinese translation updated (Thanks to [@oyepriyansh](https://github.com/oyepriyansh))
- Added button to open context menu (Thanks to [@andrigamerita](https://github.com/andrigamerita))
- Fixed menu bar text placement for items on the right.
- Fixed a bug in safari where fullscreen would not resize the game element.
- Fixed a bug in safari where the bottom menu would be visible on initial page load.
- Fixed game rom filename showing as "game" when the game name is set.
- Added legacy nintendo 64 cores for browsers that don't support webgl2.

# 4.0.8 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/f579eb4c080f612723fd6a119b02173cafb37503)

- Fixed typo in virtual gamepad dpad.
- Added updated desmume core.
- Fixed key mapping (Thanks to [@allancoding](https://github.com/allancoding))
- Fixed adblock message (Thanks to [@allancoding](https://github.com/allancoding))
- Added `EJS_startButtonName` option.
- Re-Added ability to drag and drop save states.
- Fixed cheats menu.
- Added popup message for Safari mobile users if game is not running.
- Added `EJS_softLoad` option.
- Added amiga core.
- Added c64 core.

# 4.0.7 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/f579eb4c080f612723fd6a119b02173cafb37503)

- Added rewind (Thanks to [@n-at](https://github.com/n-at))
- Added slowdown (Thanks to [@n-at](https://github.com/n-at))
- Fixed "zone" object in front of settings menu.
- Fixed virtual gamepad alignment.
- Add `EJS_fullscreenOnLoaded` option.
- Add virtual gamepad toggle to the control menu (for touchscreen devices)
- Fix gamepad ID showing as "undefined".
- Added threaded cores.
- Added joystick translations (Thanks to [@allancoding](https://github.com/allancoding))
- Fixed fullscreen button tooltip (Thanks to [@allancoding](https://github.com/allancoding))
- Added TurboGrafx-16, SuperGrafx, PC Engine, neo geo pocket, WonderSwan, PC-FX, and ColecoVision support. (Thanks to [@n-at](https://github.com/n-at))
- Fixed cue file loading (Thanks to [@n-at](https://github.com/n-at))
- Fixed ability to hide volume slider (Thanks to [@n-at](https://github.com/n-at))
- Added new mame2003_plus core (now default mame2003 core)
- Use keycodes instead of labels (Thanks to [@allancoding](https://github.com/allancoding))

# 4.0.6 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/5e338e7a888480cea331f6d4656bc8986a7d6b28)

- Fixed n64 on iOS safari
- virtual gamepads for atari2600, atari7800, lynx, jaguar, vb, 3do (Thanks to [@n-at](https://github.com/n-at))
- control buttons for gba, vb, 3do, atari2600, atari7800, lynx, jaguar (Thanks to [@n-at](https://github.com/n-at))
- Added `EJS_controlScheme` (Thanks to [@n-at](https://github.com/n-at))
- Added Fast Forward

# 4.0.5 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/5307e6294ed9df5daabd6958b2b307bae01f59f1)

- Added `pcsx_rearmed` core
- Made `pcsx_rearmed` core the default `psx` core (better compatibility)
- Added `fbneo` core
- Made `fbneo` core the default `arcade` core (better compatibility)
- Added picodrive core (sega32x)
- Cleaned up documentation
- Fixed/updated rar de-compression
- Added segaMD, segaCD, sega32x button labels and virtual gamepad (Thanks to [@n-at](https://github.com/n-at))
- Added ability to use threads (pre compiled cores not yet available)
- Fixed reversed gamepad button events (down was up, up was down)
- Fixed Gamepad axis release not triggering
- Add ***highly beta*** psp core - see readme

# 4.0.4 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/41491a738cf92ef9cee7d53f323aa2ab9732c053)

- Fix cheats "x" button
- Optimize memory usage
- Added ability to set urls to blob/arraybuffer/uint8array if needed

# 4.0.3 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/5219ab51227bc0fb60cbc7b60e476b0145c932c9)

- Remove RetroArch messages
- Center video at top

# 4.0.2 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/06fe386e780bb55ef6baa4fbc6addd486bee747a)

- Add link to RetroArch License on about page
- Fix gamepad support for legacy browsers

# 4.0.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/efbb9dd462ee0e4f2120a6947af312e02fcf657c)

Complete application re-write. Everything changed. Although some changes to note are:

- Optimization for smaller screens.
- No more dead code.
- Fix Gamepad for firefox.
- Store srm in browser.
- Ability to import/export srm files.
- No more old cores

And much much more was changed...

# 3.1.5 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/f7fa5d41487a424233b40e903020455606d68fee)

- Fixed iOS bug for iPads
- Added netplay! (only working on old cores)

# 3.1.0 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/614f5cb55e2768199ba05b756b47d0ab7ab283fd)

- Added ability to drag and drop save states.
- Fixed some "update" and "cancel" and "close" button confustion
- Removed save state retroarch messages
- Beta netplay cleanup (not yet working)
- (Theoretically) fixed a bug that did not allow iOS devices to work

# 3.0.5 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/44c31371fb3c314cd8dea36ccbaad89fb3ab98e6)

- Fixed screen recording on devices that do not support getUserMedia api.
- Added C label buttons to nintendo 64 virtual gamepad.
- Fixed EJS_color bug.
- Savestates are pulled from the core itself, to always be correct.
- Several new cores. (a5200, beetle_vb, desmume2015, fbalpha2012_cps1, fbalpha2012_cps2, fceumm, gambatte, mame2003, mednafen_psx, mednafen_psx_hw, melonds, mgba, mupen64plus_next, nestopia, snes9x)
- D-pad for virtual gamepad.
- Updated translation files to include new menu options.
- Ability to add more than one zone object to virtual gamepads.
- Added ability to set custom menu options.
- Virtual gamepad left handed mode.
- Fixed Screen record svg.
- Updated svg icons.
- Cache "clear all" button.
- Cache button moved to menu bar.
- Added feature that will display the current downloaded size when the content length is not available.

# 2.3.9 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/088942083e44510f07133f2074a2d63a8af477cd)

- Fixed incorrect variable referencing when update bios download data callback.
- Fixed rom storage size limits.
- Fixed download percent not showing with some files.

# 2.3.8 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/5f176b963e4b2055983b82396378d1e3837a69c4)

- Remove broken shader.
- Add download percent message.
- Fixed UI "saving state" message not going away.

# 2.3.7 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/8b9607becfe0aaad42b8b8486c7d379821b72125)

- Add more shaders.
- Add bold fontsize option to custom virtual gamepad settings.
- No longer set "normalOptions" from localization file.

# 2.3.6 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/b2919bc2c3d2d4c9fe3ab4f4486790a376b7acfe)

- Remove default control mappings for gamepads.
- Upgraded invalid character regex to catch more characters.

# 2.3.5 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/a5a9916aba041e75ee73815376ed4fd2e22701bd)

- Use regex to detect and replace invalid characters in filename/gamename settings.

# 2.3.4 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/45d982b6362cfd29cb2eda9721066e03893ba0d8)

- Add new arcade core.
- Fix patch file game id set bug.

# 2.3.4 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/45d982b6362cfd29cb2eda9721066e03893ba0d8)

- Add new arcade core.

# 2.3.3 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/11bddd5a4277aa04f80b941f05cc024b3de58bfc)

- Make version in loader.js reasonable.
- Created function to return the game id to prevent unnecessary data stored.

# 2.3.2 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/e9e017435f2c41c6c2b127024cc88ac51bdf04d9)

- Fix reference error.
- Fix bug in custom virtual gamepad processor where if value is set to 0 it will see that as the value being missing.

# 2.3.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/0fd6d58e2011fa1a39bd2e11ba3d2f17773f0961)

- Use let instead of var.

# 2.3.0 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/2fd0f545285151524262cc799efef6d996d7c6c1)

- Added ability to customize virtual gamepad UI.
- Fixed bug where shader is not set on start.

# 2.2.9 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/018c39d4065b866487f8f18ca88c9488eab69a6d)

- Added feature to save save files to indexeddb every 5 minutes.

# 2.2.8 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/9860d662d02b56417044cca11937448041d9cf43)

- Re-write gamepad handler.

# 2.2.7 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/c03d18990b6536c1503bba2c640dbc13db982bb3)

- Removed un-needed FS proxy functions.

# 2.2.6 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/fd71b5dfc2bd44d8e1f0e7c6c7b3ee1a1127a696)

- Added fps counter.
- Fixed gba core aspect.

# 2.2.5 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/4b444ec23918149a6052807d778af82f79883c01)

- Added ability to set custom control mappings.
- Added ability to set custom default volume value.
- Fixed gamepad axis as button, gamepad varaible compared to incorrect value.
- Added ability to hide/show menu/context menu buttons.
- Added ability to set game url to other data types.

# 2.2.3 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/41eed05677b4927bd114613040bfe4572c92c4b4)

- Fixed rar unarchiving function reference.
- Updated rar header detection.
- Removed netplay.

# 2.2.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/19980deb12c3f0790176db6fc7b8b2de4069bf4e)

- Added core menu options for new cores.
- Added new mame2003 core.
- Added support for debug emscripten setting for new cores.

# 2.0.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/a72222c39a793c4ff470ebb2b71c04829fee4b5e)

- Control mapping for beta cores.
- Updated beta cores.
- Beta cores now the default option!
- Added a5200 core.
- Fixed save state for new n64 core.

# 1.2.2 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/8ab7bb3f49da373ed5d291c5f72039bbabf2fbc8)

- Moved virtual gamepad menu button to the top left as 3 lines.
- Added screen orientation lock.
- Added beta n64 core!

# 1.2.1 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/638658e6202fd39cb5c94bedcfa00ccdf8b25840)

- Updated beta core files.

# 1.1.6 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/fa153ba76791184d978f9fb8b69991b05b161bc8)

- Replaced axios module with custom script.
- Added pause/play for beta cores.
- Sepperated css into its own file.
- Renamed emu-min.js to emulator.min.js.

# 1.1.5 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/2767c635b8a6e05c57e054d2f9d01ae0c4ff6d47)

- Cleaned up fetch error function.
- Cleaned up virtual gamepad event listeners.
- Add code of conduct.

# 1.1.2 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/64731dd8219931155b4e698aa98dbf65c2120038)

- Fixed error where mame files were misnamed.
- Fixed bug where variable referenced was not defined in loader.js.
- Added .gitignore
- Added nodejs script to minify js files.
- Added audio to screen recording.
- Removed lots of dead code from emulator.js file.
- Update axios module.
- Added CORS error message
- Update nodejs buffer module.

# 1.1.0 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/715ded4ae23c2135bc9a8b9b7599f12c905393b3)

- Added minify feature.
- Added emulatorjs logo.
- Added beta nds and gb core.
- Fixed bug where when wasm was supported on the beta cores and not the old cores, a network error would appear if not using beta.
- Added volume setting and cheats to beta cores.

# 1.0 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/fde44b095bb89e299daaaa4c8d7deebc79019865)

- Official release of the beta cores.
- Ability to use beta cores in production.
- Ability to use the old emulatorjs netplay server.
- Set screen recording out file name to gamename if present.
- Set screenshot out file name to gamename if present.
- Fixed virtual gamepad bug where a function was referenced to as an array.

# 0.4.26 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/0709829a11266b6ab4bbbf3e61d6dd6d3c372133)

- Sepperated emulator.js file into 2 files.
- Added support for a custom netplay server.
- Fixed netplay room password input bug.
- Fixed bug on iOS where virtual gamepad zone was un-responsive.
- Added save state location feature.
- Added mame core setting.
- Added beta cores!
- Added localization.
- Re-wrote virtual gamepad code.
- Added EJS_terminate function.
- Exposed simulate_input function to window.
- Update webrtc adapter.

# 0.4.25 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/ef3200ef87bffe57241e05ae9646cc201142ec46)

- Moved load state on start from loader.js file to emulator.js file.
- Moved data path function from loader.js file to emulator.js file.
- Added ability to set custom path to data through `EJS_pathtodata` variable.
- Added support for custom paths.
- Expose the module and loader to window.
- Added `EJS_startOnLoaded` to start the emulator on load.
- Added quick save state slots.
- Added save state message.
- Only show save state slot in settings when save states are supported.
- Added ds pointer lock.
- Added menu button to virtual gamepad. Menu will only open when clicked on mobile.
- Created licenese
- Created official emulatorjs website.

# 0.4.24 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/73ff641616bcd10f088a004002183760832a1afc)

- Deobsfocuted emulator.js and loader.js files to the most of my extent.
- Added quick save/load hotkeys.
- Added ability to use gamepad axis as button.
- Fixed typo in controls title.
- Only show needed inputs per system in control settings.
- Re-write the loader.js file.
- Exposed some variables to window.
- Cleaned up context menu code.
- Cleaned up some syntax in emulator.js file.
- Declared `EJS_AdUrl` through loader.js file.
- Fixed bug where mapping an axis as a button didn't work.
- Added missing legacy n64 core.
- Updated n64 core.

# 0.4.23-07 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/83e148c82cbc8b4e835a808dcf84456975f82a7c)

- Removed not needed code.
- Added reset button to control settings.
- Added clear button to control settings.
- Added `EJS_AdUrl` option, the ability to add an ad to the emulator.
- Cleaned up some file fetching.
- Fixed RAR unarchiving.

# 0.4.23-05 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/018c787ccf6daca58c863d38fff61910f33f98ec)

- No longer cache games with the protocols of `file:`, and `chrome-extension:`.
- Changed default keymappings.
- Added screen recording button.

# 0.4.23-04 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/6464bbedc1cd58c023cd66656540fc174aedde8b)

- Added mame2003, snes2002, snes2005, snes2010, and vbanext cores.
- Added asmjs for all supported cores.

# 0.4.23-03 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/c883f267e1e56ed6b6472b891f78704c6e4b4c17)

- Start loader.js deobsfocuting.
- Deobsfocute extractzip.js.
- Added `EJS_gameName`, the ability to change the file name of save states.

# 0.4.23-02 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/5d97620b25a81e49c6ba313e586fb37a5ce66002)

- Start emulator.js deobsfocuting.

# 0.4.23-01 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/42a7e129cfded266b72539e8d1b5978d5e4119d8)

- Added support for loading "blob:" urls.
- Added support for loading state on game start.

# 0.4.23 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/5f5cf5cbba29cfd772d525a4c73a4bc5ea26654c)

- Added update available message.
- Fixed a bug where the 'x' from the ad iframe was still visible on game start.
- Added a2600 and mame cores.
- Remove visible 'x'
- Add rar extraction support.

# 0.4.19 [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/4fd22871663e5896bb5d0ce29a50ad508462387a)

- Added support for 32x, 3do, a7800, arcade, bluemsx, jaguar, lynx, ngp, pce, saturn, sega, segacd, and ws cores.

# Initial release [View Tree](https://github.com/EmulatorJS/EmulatorJS/tree/be2db16cba8bd85bf901cd89ca6de51414cea792)

- Support for unzipping zip files.
- Support for unzipping 7zip files.
- Support for vb, snes, psx, nes, nds, n64, gba, and gb systems. Only support for WASM.
