# `generate-reference-index.mjs`

| | |
|---|---|
| **Path** | `tools/generate-reference-index.mjs` |
| **Category** | Build tool (Node) |
| **Size** | 1.8 KB |
| **Lines** | 36 |

## What it is

Lists every Markdown document in `reference-docs/` with its title (first heading) and size.

## How it works

- Writes `reference-docs/files.json`.
- Run after adding, renaming or removing documents; the GitHub workflow does it on push.

## Why it exists

GitHub Pages can't list folders, so the viewer needs this list.

## Referenced by

Files in this project that mention this asset by name or path:

- `.github/workflows/update-indexes.yml`
- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `README.md`
- `package.json`
