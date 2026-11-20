# `hashes.js`

| | |
|---|---|
| **Path** | `assets/hashes.js` |
| **Category** | Shared module |
| **Size** | 4.5 KB |
| **Lines** | 108 |

## What it is

Checksums computed in the browser, for the Preservation archive and the Homebrew showcase.

## How it works

- `checksums(blob, onProgress)` returns `{ size, crc32, md5, sha1 }`, reading the file in 4 MB slices.
- SHA-1 uses Web Crypto (secure contexts only); CRC32 and a streaming MD5 (RFC 1321) are written out here because Web Crypto has neither.
- Exports the pieces too: `crc32Start`, `crc32Update`, `crc32End` and the `MD5` class.

## Why it exists

Preservation catalogues publish these three checksums; checking them needs no server.

## Referenced by

Files in this project that mention this asset by name or path:

- `CHANGES.md`
- `ENHANCEMENTS.txt`
- `assets/archive.js`
- `assets/devtour.js`
- `assets/homebrew.js`
- `sw.js`
