# `generate-archive-index.mjs`

| | |
|---|---|
| **Path** | `tools/generate-archive-index.mjs` |
| **Category** | Build tool (Node) |
| **Size** | 5.7 KB |
| **Lines** | 96 |

## What it is

Builds the Preservation archive catalogue.

## How it works

- Reads every `archive/<folder>/record.json` and checks the file against its recorded CRC32, MD5, SHA-1 and size.
- `--write` records missing checksums (the first, trusted pass); `--strict` fails on any problem, for CI.
- Run by the GitHub workflow and by `npm run archive`.

## Why it exists

A catalogue whose checksums are always checked against the files.

## Referenced by

Files in this project that mention this asset by name or path:

- `.github/workflows/update-indexes.yml`
- `CHANGES.md`
- `archive.html`
- `archive/README.md`
- `archive/button-check/record.json`
- `archive/index.json`
- `archive/palette-explorer/record.json`
- `archive/sprite-lab/record.json`
- `assets/archive.js`
- `assets/devtour.js`
- `package.json`
