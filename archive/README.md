# Preservation archive

`archive.html` is a catalogue of public-domain and rights-cleared software. Each record describes one file: what it
is, who made it, where this copy came from, the licence that allows it to be shared, and its checksums. The page
checks the file against those checksums in the visitor's browser before it is played.

## What may be catalogued

Only software that may be shared:

- public domain, or dedicated to it (`CC0-1.0`, `public-domain`)
- free licences (`MIT`, `BSD-2-Clause`, `BSD-3-Clause`, `Zlib`, `Unlicense`, `CC-BY-4.0`, `CC-BY-SA-4.0`, GPL/LGPL)
- written permission from the rights holder: `"licence": { "id": "permission", "evidence": "…" }`, where `evidence`
  says where the permission is kept (a letter, an email, a public statement with its link)

Commercial games without such permission do not belong here. `tools/generate-archive-index.mjs` refuses any other
licence.

## Adding a record

1. Make a folder `archive/<name>/` with a `record.json` (fields below). The file itself can live anywhere on the
   site, for example next to the record or in `homebrew/`; `file.path` is relative to the site root.
2. Check the file against a trusted source if there is one (the author's release, a catalogue entry), then run
   `node tools/generate-archive-index.mjs --write` once. It records the size, CRC32, MD5 and SHA-1 in `record.json`.
3. Push. The workflow runs the generator with `--strict` on every change, so a file that changes or gets damaged
   fails the build instead of being served as the catalogued copy.

The record's page is `archive.html?id=<id>`. Ids are permanent: never reuse or change one.

## record.json fields

| Field | Required | What it is |
|---|---|---|
| `id` | yes | Permanent catalogue number: lower-case letters, digits and dashes, e.g. `ejsa-0004` |
| `title` | yes | Title as shown on the software or its packaging |
| `alternateTitles` | no | Other titles (translations, working titles) |
| `creator` | yes | Who made it (person, group or company) |
| `publisher` | no | Who released it |
| `year` | yes | Year of release |
| `platform` | yes | System id: `nes`, `snes`, `gb`, `gba`, `segaMD`, `atari2600`, … |
| `core` | no | A specific emulator core, if the default one is wrong for it |
| `format` | no | File format and hardware details (board, mapper, memory) |
| `region`, `version` | no | As printed or reported |
| `description` | no | What it is, in a paragraph |
| `subjects` | no | Keywords for searching |
| `notes` | no | List of remarks (known problems, how it was tested) |
| `licence` | yes | `{ id, name, url, statement, evidence }`; `id` from the list above |
| `provenance` | yes | List of events, oldest first: `{ date, event, by, details }` (created, released, dumped, received, catalogued) |
| `file` | yes | `{ path, size, crc32, md5, sha1 }`; the checksums are written by `--write` |
| `media` | no | Pictures: `{ kind, path, caption }` (screenshot, box, cartridge, manual page) |
| `attachments` | no | Other files: `{ kind, path, label }` (source code, manual PDF, tools) |
| `related` | no | Ids of related records |
| `cataloguer`, `catalogued`, `updated` | no | Who catalogued it, when, and when the record last changed |

## Exports

The catalogue page exports the whole catalogue as JSON or CSV, or as a zip with every record and every file, medium
and attachment, so the collection can be copied, mirrored or deposited elsewhere.
