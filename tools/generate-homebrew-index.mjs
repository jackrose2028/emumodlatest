// Builds the Homebrew showcase from every homebrew/<folder>/game.json (GitHub Pages cannot list folders):
//   homebrew/index.json        the list the showcase page reads (with size, CRC32, MD5 and SHA-1 of each game)
//   homebrew/feed.xml          an Atom feed of releases, newest first, for feed readers and announcements
//   homebrew/<folder>/index.html  a small share page per game with its title, description and picture for link
//                              previews (social networks and chat apps don't run JavaScript), which opens the game page
// Checks each game: required fields, the ROM, screenshots, video, controls for the system, sizes, licence.
//   node tools/generate-homebrew-index.mjs           warn about problems; games with errors are left out
//   node tools/generate-homebrew-index.mjs --strict  fail on any error (for CI); warnings never fail
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "homebrew");
const strict = process.argv.includes("--strict");
const REQUIRED = ["title", "author", "system", "rom", "license"];
const BUTTONS = {
    _: ["Up", "Down", "Left", "Right", "A", "B", "X", "Y", "L", "R", "L2", "R2", "Select", "Start"],
    segaMD: ["Up", "Down", "Left", "Right", "A", "B", "C", "X", "Y", "Z", "Mode", "Start"],
    segaMS: ["Up", "Down", "Left", "Right", "1", "2", "Pause"], segaGG: ["Up", "Down", "Left", "Right", "1", "2", "Start"],
    atari2600: ["Up", "Down", "Left", "Right", "Fire", "Select", "Reset"], n64: ["Up", "Down", "Left", "Right", "A", "B", "Z", "L", "R", "Start", "C-Up", "C-Down", "C-Left", "C-Right"]
};
const KNOWN_LICENCE = /^(CC0-1\.0|CC-BY(-SA|-NC|-NC-SA|-ND|-NC-ND)?-[234]\.0|MIT|BSD-[23]-Clause|Apache-2\.0|Zlib|Unlicense|ISC|MPL-2\.0|GPL-[23]\.0(-only|-or-later)?|LGPL-[23]\.[01](-only|-or-later)?|AGPL-3\.0(-only|-or-later)?)$/;
const MB = 1024 * 1024;

const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
})();
function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");
}
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inFolder = (folder, file) => {
    const full = path.resolve(dir, folder, String(file || ""));
    return full.startsWith(path.join(dir, folder) + path.sep) ? full : null;
};

// The site's public address (site.json "url"), so link previews get absolute addresses
let siteUrl = "";
try { siteUrl = String(JSON.parse(fs.readFileSync(path.join(root, "site.json"), "utf8")).url || "").replace(/\/+$/, ""); } catch (e) { /* none */ }
let siteName = "EmulatorJS";
try { siteName = JSON.parse(fs.readFileSync(path.join(root, "site.json"), "utf8")).name || siteName; } catch (e) { /* default */ }

const games = [];
const errors = [];
const warnings = [];
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const file = path.join(dir, folder, "game.json");
    if (!fs.existsSync(file)) continue;
    const err = (m) => errors.push(`${folder}: ${m}`);
    const warn = (m) => warnings.push(`${folder}: ${m}`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(folder)) { err("the folder name must be lower-case letters, digits and dashes (it is part of the game's address)"); continue; }
    let game;
    try { game = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { err(`game.json is not valid JSON: ${e.message}`); continue; }
    const missing = REQUIRED.filter((k) => !game[k]);
    if (missing.length) { err(`game.json is missing ${missing.join(", ")}`); continue; }
    const romPath = inFolder(folder, game.rom);
    if (!romPath || !fs.existsSync(romPath)) { err(`the ROM "${game.rom}" is not in the folder`); continue; }
    const bytes = fs.readFileSync(romPath);
    if (bytes.length > 100 * MB) { err(`the ROM is ${Math.round(bytes.length / MB)} MB; GitHub refuses files over 100 MB`); continue; }
    if (bytes.length > 50 * MB) warn(`the ROM is ${Math.round(bytes.length / MB)} MB; GitHub warns about files over 50 MB, and visitors on phones wait for it`);
    if (!KNOWN_LICENCE.test(game.license)) warn(`licence "${game.license}" is not a standard SPDX id; that is fine for "free to play" terms, but say exactly what players may do`);
    const screenshots = (Array.isArray(game.screenshots) ? game.screenshots : []).filter((s) => {
        const p = inFolder(folder, s);
        if (!p || !fs.existsSync(p)) { warn(`screenshot "${s}" not found (left out)`); return false; }
        if (fs.statSync(p).size > 2 * MB) warn(`screenshot "${s}" is over 2 MB; a PNG of the game's own size is enough`);
        return true;
    });
    if (!screenshots.length) warn("no screenshots: the card shows the system name instead of a picture");
    let video = null;
    if (game.video) {
        const p = inFolder(folder, game.video);
        if (p && fs.existsSync(p) && /\.(mp4|webm)$/i.test(game.video)) {
            video = game.video;
            if (fs.statSync(p).size > 20 * MB) warn(`video "${game.video}" is over 20 MB`);
        } else warn(`video "${game.video}" must be an .mp4 or .webm file in the folder (left out)`);
    }
    const allowed = BUTTONS[game.system] || BUTTONS._;
    const controls = {};
    for (const [k, v] of Object.entries(game.controls || {})) {
        if (!allowed.includes(k)) warn(`control "${k}" is not a button of this system (${allowed.join(" ")})`);
        controls[k] = String(v);
    }
    if (String(game.description || "").length > 3000) warn("the description is very long; the first paragraph is what most people read");
    const links = (Array.isArray(game.links) ? game.links : []).filter((l) => {
        const ok = l && l.url && (/^https?:\/\//.test(l.url) || (/^[\w./?=&%:-]+$/.test(l.url) && !/^[a-z][\w+.-]*:/i.test(l.url)));
        if (!ok) warn(`link "${l && l.url}" left out (web addresses and pages of this site only)`);
        return ok;
    });
    const credits = (Array.isArray(game.credits) ? game.credits : []).filter((c) => c && c.name).map((c) => ({ name: String(c.name), role: String(c.role || "") }));
    const versions = (Array.isArray(game.versions) ? game.versions : []).filter((v) => v && v.version).map((v) => ({ version: String(v.version), date: v.date || null, notes: String(v.notes || "") }));
    if (game.updated && !/^\d{4}-\d{2}-\d{2}$/.test(game.updated)) warn(`updated "${game.updated}" should be a date like 2026-11-19`);
    games.push({
        folder,
        title: game.title, author: game.author, credits, year: game.year || null, version: game.version || (versions[0] && versions[0].version) || null,
        updated: game.updated || (versions[0] && versions[0].date) || null,
        system: game.system, core: game.core || null, rom: game.rom, license: game.license,
        genre: game.genre || null, players: game.players || null, tags: Array.isArray(game.tags) ? game.tags.map(String) : [],
        description: game.description || "", controls, links, screenshots, video, versions,
        size: bytes.length, crc32: crc32(bytes),
        md5: crypto.createHash("md5").update(bytes).digest("hex"),
        sha1: crypto.createHash("sha1").update(bytes).digest("hex")
    });
}
games.sort((a, b) => a.title.localeCompare(b.title));
for (const [i, g] of games.entries()) if (games.findIndex((x) => x.title.toLowerCase() === g.title.toLowerCase()) !== i) warnings.push(`${g.folder}: another game is also called "${g.title}"`);
for (const w of warnings) console.warn("note: " + w);
for (const e of errors) console.warn("error: " + e);

function write(rel, text, label) {
    const out = path.join(dir, rel);
    if (fs.existsSync(out) && fs.readFileSync(out, "utf8") === text) return false;
    fs.writeFileSync(out, text);
    if (label) console.log(label);
    return true;
}
const changed = write("index.json", JSON.stringify({ games }, null, 1) + "\n", `Wrote homebrew/index.json (${games.length} games).`);

// Share pages: link previews (Open Graph, Twitter cards, JSON-LD) and a jump to the game page
const abs = (rel) => (siteUrl ? siteUrl + "/" + rel : rel);
let pages = 0;
for (const g of games) {
    const page = `../../homebrew.html?game=${encodeURIComponent(g.folder)}`;
    const first = String(g.description || "").split(/\n\s*\n/)[0];
    const desc = first.length > 280 ? first.slice(0, 280).replace(/\s+\S*$/, "") + "…" : first;
    // Without the site's address (site.json "url"), addresses are relative to this page
    const image = siteUrl ? abs(g.screenshots[0] ? `homebrew/${g.folder}/${g.screenshots[0]}` : "docs/Logo.png") : (g.screenshots[0] || "../../docs/Logo.png");
    const ld = { "@context": "https://schema.org", "@type": "VideoGame", name: g.title, author: { "@type": "Person", name: g.author }, description: desc, gamePlatform: g.system, genre: g.genre || undefined, datePublished: g.year ? String(g.year) : undefined, image, license: g.license, url: siteUrl ? abs(`homebrew.html?game=${g.folder}`) : page };
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- Made by tools/generate-homebrew-index.mjs: a share page for link previews. Edit game.json, not this file. -->
<title>${esc(g.title)} – ${esc(siteName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(g.title)}${g.author ? " by " + esc(g.author) : ""}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
${siteUrl ? `<meta property="og:url" content="${esc(abs(`homebrew/${g.folder}/`))}">\n` : ""}<meta property="og:site_name" content="${esc(siteName)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(siteUrl ? abs(`homebrew.html?game=${g.folder}`) : page)}">
<meta http-equiv="refresh" content="0; url=${esc(page)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<script>location.replace(${JSON.stringify(page)} + location.hash);</script>
</head>
<body><p><a href="${esc(page)}">${esc(g.title)}</a>: play it in your browser.</p></body>
</html>
`;
    if (write(path.join(g.folder, "index.html"), html)) pages++;
}
if (pages) console.log(`Wrote ${pages} share page${pages === 1 ? "" : "s"} (homebrew/<game>/index.html).`);

// Atom feed of releases
const dated = games.filter((g) => g.updated || g.year).sort((a, b) => String(b.updated || b.year).localeCompare(String(a.updated || a.year)));
const when = (g) => (g.updated ? g.updated + "T00:00:00Z" : `${g.year}-01-01T00:00:00Z`);
const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(siteName)}: homebrew releases</title>
  <id>${esc(siteUrl ? abs("homebrew/feed.xml") : "urn:ejs-homebrew:feed")}</id>
  <link rel="alternate" href="${esc(abs("homebrew.html"))}"/>
  <updated>${dated.length ? when(dated[0]) : "2026-01-01T00:00:00Z"}</updated>
${dated.slice(0, 50).map((g) => `  <entry>
    <title>${esc(g.title)}${g.version ? " " + esc(g.version) : ""}</title>
    <id>${esc(siteUrl ? abs(`homebrew.html?game=${g.folder}`) + "#" + (g.version || g.updated || g.year) : `urn:ejs-homebrew:${g.folder}:${g.version || g.updated || g.year}`)}</id>
    <link rel="alternate" href="${esc(abs(`homebrew/${g.folder}/`))}"/>
    <updated>${when(g)}</updated>
    <author><name>${esc(g.author)}</name></author>
    <summary>${esc((g.versions[0] && g.versions[0].notes) || String(g.description).split(/\n\s*\n/)[0])}</summary>
  </entry>`).join("\n")}
</feed>
`;
write("feed.xml", feed, "Wrote homebrew/feed.xml.");
if (!changed) console.log("Homebrew index already up to date.");
if (strict && errors.length) process.exit(1);
