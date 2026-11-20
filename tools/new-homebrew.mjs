// Adds a homebrew game to the showcase: creates homebrew/<folder>/, copies the ROM, writes game.json, updates the index.
//   node tools/new-homebrew.mjs path/to/game.nes --title "My Game" --author "Me" --license MIT
//     [--system nes] [--core fceumm] [--year 2026] [--version 1.0] [--updated 2026-11-19] [--genre Puzzle] [--players 2]
//     [--tags "puzzle,short"] [--description "..."] [--screenshot shot.png]... [--video trailer.mp4] [--folder my-game]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rom = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const opt = (name) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : null; };
const opts = (name) => args.flatMap((a, i) => (a === "--" + name && args[i + 1] ? [args[i + 1]] : []));
if (!rom || !fs.existsSync(rom)) {
    console.error('Usage: node tools/new-homebrew.mjs path/to/game.nes --title "My Game" --author "Me" --license MIT [--system nes]');
    process.exit(1);
}
const EXT = { nes: "nes", sfc: "snes", smc: "snes", gb: "gb", gbc: "gb", gba: "gba", md: "segaMD", gen: "segaMD", sms: "segaMS", gg: "segaGG", a26: "atari2600", n64: "n64", z64: "n64", v64: "n64", pce: "pce", lnx: "lynx", ws: "ws", wsc: "ws", ngp: "ngp", ngc: "ngp", col: "coleco", a78: "atari7800" };
const ext = path.extname(rom).slice(1).toLowerCase();
const system = opt("system") || EXT[ext];
if (!system) {
    console.error(`Can't tell the system from .${ext}; add --system <id> (nes, snes, gb, gba, segaMD, ...).`);
    process.exit(1);
}
const title = opt("title") || path.basename(rom, path.extname(rom));
const folder = opt("folder") || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game";
const target = path.join(root, "homebrew", folder);
for (const f of [...opts("screenshot"), opt("video")].filter(Boolean)) {
    if (!fs.existsSync(f)) { console.error(`Can't find ${f}.`); process.exit(1); }
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(folder)) {
    console.error(`"${folder}" can't be a folder name: use lower-case letters, digits and dashes.`);
    process.exit(1);
}
if (fs.existsSync(target)) {
    console.error(`homebrew/${folder} already exists.`);
    process.exit(1);
}
fs.mkdirSync(target, { recursive: true });
const romName = path.basename(rom);
fs.copyFileSync(rom, path.join(target, romName));
const copyIn = (f) => { const name = path.basename(f); fs.copyFileSync(f, path.join(target, name)); return name; };
const today = new Date().toISOString().slice(0, 10);
const version = opt("version") || "1.0";
const game = {
    title, author: opt("author") || "Unknown", year: Number(opt("year")) || new Date().getFullYear(), version,
    updated: opt("updated") || today, system, ...(opt("core") ? { core: opt("core") } : {}), rom: romName,
    license: opt("license") || "All rights reserved, free to play",
    ...(opt("genre") ? { genre: opt("genre") } : {}), ...(Number(opt("players")) ? { players: Number(opt("players")) } : {}),
    description: opt("description") || "", controls: {}, screenshots: opts("screenshot").map(copyIn),
    ...(opt("video") ? { video: copyIn(opt("video")) } : {}), links: [],
    tags: (opt("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
    credits: [{ name: opt("author") || "Unknown", role: "Made by" }],
    versions: [{ version, date: opt("updated") || today, notes: "First release here." }]
};
fs.writeFileSync(path.join(target, "game.json"), JSON.stringify(game, null, 4) + "\n");
console.log(`Created homebrew/${folder}/ (edit game.json to add${game.description ? "" : " a description,"} controls${game.screenshots.length ? "" : ", screenshots"} and links).`);
execFileSync(process.execPath, [path.join(root, "tools", "generate-homebrew-index.mjs")], { stdio: "inherit" });
