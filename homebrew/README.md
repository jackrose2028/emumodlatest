# Homebrew showcase

Every folder here is one homebrew game with its own page on the site (`homebrew.html?game=<folder>`).

## Add a game

Easiest: `node tools/new-homebrew.mjs path/to/game.nes --title "My Game" --author "Me" --license MIT`
(the system is detected from the file; add `--system snes` etc. to set it). It creates the folder, copies the ROM,
writes `game.json` and updates `homebrew/index.json`. More options fill in the rest in one go:
`--genre Puzzle --players 2 --tags "puzzle,short" --description "..." --screenshot title.png --screenshot level.png
--video trailer.mp4 --core fceumm --version 1.1 --updated 2026-11-19 --folder my-game`.

By hand: make `homebrew/<folder>/` with the ROM and a `game.json`, then run `node tools/generate-homebrew-index.mjs`
(the GitHub workflow runs it for you on every push).

## game.json

| Field | Needed | Meaning |
|---|---|---|
| `title` | yes | Game name |
| `author` | yes | Person or team |
| `system` | yes | `nes`, `snes`, `gb`, `gba`, `segaMD`, `segaMS`, `segaGG`, `atari2600`, `n64`, ... |
| `rom` | yes | File name of the game in this folder (a ROM or a zip) |
| `license` | yes | How others may use it, e.g. `MIT`, `CC-BY-4.0`, `CC0-1.0`, `All rights reserved, free to play` |
| `year`, `version`, `genre`, `players` | no | Shown on the page |
| `updated` | no | Date of the latest release (YYYY-MM-DD), shown as "Updated" |
| `core` | no | A specific emulator core, e.g. `nestopia` |
| `description` | no | A paragraph or two |
| `controls` | no | Button to action, e.g. `{ "A": "Jump", "B": "Run", "Start": "Pause" }`. Buttons: `A B X Y L R Select Start Up Down Left Right` (Mega Drive also `C`, Master System and Game Gear `1 2`, Atari 2600 `Fire`, N64 `Z`) |
| `screenshots` | no | Image files in this folder; the first is the card picture |
| `links` | no | `[{ "label": "itch.io page", "url": "https://..." }]` |
| `tags` | no | Words for search; the most common genres and tags become filter buttons on the list |
| `video` | no | A short `.mp4` or `.webm` trailer in this folder, shown above the screenshots |
| `credits` | no | `[{ "name": "Ana", "role": "Music" }]`; each name links to that person's games |
| `versions` | no | Release notes, newest first: `[{ "version": "1.1", "date": "2026-11-19", "notes": "Two new levels" }]` |

A game whose `updated` date is in the last 60 days gets a "New" badge (or "Updated" when it has more than one version).

## What the index builder makes and checks

`node tools/generate-homebrew-index.mjs` (add `--strict` to fail on errors, as the workflow does) writes:

- `homebrew/index.json`, the list the page reads, with the size and CRC32, MD5 and SHA-1 checksums of each game file
  (the game page checks the file against them and shows the result);
- `homebrew/<folder>/index.html`, a share page for each game: links to it show a picture, the title and the
  description in chat apps and social networks, and opening it goes straight to the game page. For the picture to
  show everywhere, set the site's public address (`url` in `site.json`, or "Public address" in the Site kit);
- `homebrew/feed.xml`, an Atom feed of releases for feed readers.

It warns or stops on: a folder name that isn't lower-case letters, digits and dashes; missing or broken `game.json`;
missing required fields; a missing ROM, or one over 100 MB (over 50 MB is a warning); a licence that isn't an SPDX id
and doesn't say what's allowed; missing screenshots or ones over 2 MB; a video that isn't mp4 or webm; buttons in
`controls` the system doesn't have; a bad `updated` date; links without an address; and two games with the same title.

## On the game page

Play in place or in the full player, Add to My Collection, Download, Share (the share page link) and Embed (an
`<iframe>` code for another site that plays the game from this one). Screenshots open full size (arrow keys move
between them). Search on the list covers titles, authors, credits, genres, tags, descriptions and controls;
`homebrew.html?author=<name>` lists one person's games and `homebrew.html?q=<words>` opens a search.

Only publish games you made or have permission to share.
