// Use case 2, Homebrew showcase: a page per homebrew game (homebrew/<folder>/game.json), with credits, licence,
// controls drawn for keyboard, controller and touch, screenshots, links and a Play button.
// Second pass: sort, genre and tag chips, author pages, "New" and "Updated" badges, a random game; on a game page,
// play in place, a screenshot gallery with a full-size viewer, an optional video, credits, release notes, the file
// checked against its published checksums, Add to My Collection, download, more by the same author, your play
// time, a share link with a link preview (homebrew/<folder>/) and an embed code for other sites.
import { $, banner, loadManifest, isAvailable, siteAllows, setupServiceWorker, prefetchCore, getEngine, setEngine } from "./common.js";
import { labelFor } from "./detect.js";
import { playUrl } from "./folders.js";
import { initDevice, device } from "./mobile.js";
import { playtimeFor, formatPlaytime } from "./library.js";
import { checksums } from "./hashes.js";

initDevice();
const params = new URLSearchParams(location.search);

// RetroPad button -> default EmulatorJS keyboard key, and the button's place on a standard controller
const RETROPAD = {
    up: ["Up arrow", "D-pad up"], down: ["Down arrow", "D-pad down"], left: ["Left arrow", "D-pad left"], right: ["Right arrow", "D-pad right"],
    a: ["Z", "Right face button (Xbox B, PlayStation ○)"], b: ["X", "Bottom face button (Xbox A, PlayStation ✕)"],
    x: ["A", "Top face button (Xbox Y, PlayStation △)"], y: ["S", "Left face button (Xbox X, PlayStation □)"],
    l: ["Q", "Left bumper (LB / L1)"], r: ["E", "Right bumper (RB / R1)"], l2: ["Tab", "Left trigger (LT / L2)"],
    select: ["V", "View / Select / Share"], start: ["Enter", "Menu / Start / Options"]
};
// The console's own button names, per system, mapped to RetroPad buttons
const SYSTEM_BUTTONS = {
    nes: { A: "a", B: "b", Select: "select", Start: "start" },
    gb: { A: "a", B: "b", Select: "select", Start: "start" },
    gba: { A: "a", B: "b", L: "l", R: "r", Select: "select", Start: "start" },
    snes: { A: "a", B: "b", X: "x", Y: "y", L: "l", R: "r", Select: "select", Start: "start" },
    segaMD: { A: "y", B: "b", C: "a", Mode: "select", Start: "start" },
    segaMS: { 1: "b", 2: "a", Pause: "start" },
    segaGG: { 1: "b", 2: "a", Start: "start" },
    atari2600: { Fire: "b", Select: "select", Reset: "start" },
    n64: { A: "b", B: "y", Z: "l2", L: "l", R: "r", Start: "start" }
};
const DPAD = { Up: "up", Down: "down", Left: "left", Right: "right" };
const NEW_DAYS = 60;

let games = [];
let filterChip = "";
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const shortSystem = (s) => ({ nes: "NES", snes: "SNES", gb: "Game Boy", gba: "GBA", segaMD: "Mega Drive", segaMS: "Master System", segaGG: "Game Gear", atari2600: "Atari 2600", n64: "N64" })[s] || labelFor(s);
const folderUrl = (g, file) => `homebrew/${encodeURIComponent(g.folder)}/${encodeURIComponent(file)}`;
const isNew = (g) => g.updated && (Date.now() - Date.parse(g.updated)) / 86400000 <= NEW_DAYS;
const firstPara = (t) => String(t || "").split(/\n\s*\n/)[0];
function playHref(game) { return playUrl({ url: `homebrew/${game.folder}/${game.rom}`, core: game.core || game.system }); }

// ---------- the list ----------
function card(game) {
    const li = el("li", "col-card");
    const a = el("a", "col-play");
    a.href = "homebrew.html?game=" + encodeURIComponent(game.folder);
    a.addEventListener("pointerenter", () => prefetchCore(game.system));
    const pic = el("div", "col-cover");
    pic.dataset.system = shortSystem(game.system);
    if (game.screenshots[0]) pic.style.backgroundImage = `url("${folderUrl(game, game.screenshots[0])}")`;
    if (isNew(game)) pic.appendChild(el("span", "hb-badge", game.versions && game.versions.length > 1 ? "Updated" : "New"));
    const name = el("strong", null, game.title);
    const meta = el("span", null, [game.author, game.year, shortSystem(game.system)].filter(Boolean).join(" · "));
    a.append(pic, name, meta);
    if (game.genre) a.appendChild(el("span", "hb-genre", game.genre));
    li.appendChild(a);
    return li;
}
function shown() {
    const words = $("hbSearch").value.toLowerCase().split(/\s+/).filter(Boolean);
    const system = $("hbSystem").value;
    const author = params.get("author");
    const sort = $("hbSort").value;
    const list = games.filter((g) => (!system || g.system === system) && (!author || g.author === author || (g.credits || []).some((c) => c.name === author)) &&
        (!filterChip || g.genre === filterChip || (g.tags || []).includes(filterChip)) &&
        words.every((w) => [g.title, g.author, g.genre, g.description, ...(g.tags || []), ...(g.credits || []).map((c) => c.name), ...Object.values(g.controls || {}), shortSystem(g.system)].join(" ").toLowerCase().includes(w)));
    const by = {
        new: (a, b) => String(b.updated || b.year || "").localeCompare(String(a.updated || a.year || "")) || a.title.localeCompare(b.title),
        title: (a, b) => a.title.localeCompare(b.title),
        author: (a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title),
        year: (a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title)
    }[sort];
    return list.sort(by);
}
function renderChips() {
    const counts = new Map();
    for (const g of games) for (const t of new Set([g.genre, ...(g.tags || [])].filter(Boolean))) counts.set(t, (counts.get(t) || 0) + 1);
    const top = [...counts.entries()].filter(([t, n]) => n < games.length || t === filterChip).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 16);
    const box = $("hbChips");
    box.textContent = "";
    box.hidden = top.length < 2;
    for (const [t, n] of top) {
        const b = el("button", "chip" + (filterChip === t ? " on" : ""), `${t} (${n})`);
        b.type = "button";
        b.setAttribute("aria-pressed", String(filterChip === t));
        b.addEventListener("click", () => { filterChip = filterChip === t ? "" : t; renderChips(); renderList(); });
        box.appendChild(b);
    }
}
function renderList() {
    const list = shown();
    const grid = $("hbGrid");
    grid.textContent = "";
    for (const g of list) grid.appendChild(card(g));
    if (!list.length) grid.appendChild(el("li", "muted", games.length ? "No game matches that search." : "No homebrew games are published yet."));
    const author = params.get("author");
    $("hbSummary").textContent = author
        ? `${list.length} game${list.length === 1 ? "" : "s"} by ${author}.`
        : `${games.length} homebrew game${games.length === 1 ? "" : "s"}: new games for old consoles, made by today's developers. Free to play here.`;
}

// ---------- a game ----------
function controlsTable(game) {
    const names = Object.assign({}, DPAD, SYSTEM_BUTTONS[game.system] || SYSTEM_BUTTONS.snes);
    const rows = Object.entries(game.controls || {});
    if (!rows.length) return null;
    const table = el("table", "hb-controls");
    const head = table.createTHead().insertRow();
    for (const h of ["Button", "Does", "Keyboard", "Controller", device.touch ? "Touch" : null].filter(Boolean)) head.appendChild(el("th", null, h));
    const body = table.createTBody();
    for (const [button, action] of rows) {
        const pad = names[button] || names[button[0].toUpperCase() + button.slice(1)] || null;
        const [key, controller] = (pad && RETROPAD[pad]) || ["–", "–"];
        const row = body.insertRow();
        row.appendChild(el("td", "hb-btn", button));
        row.appendChild(el("td", null, action));
        const kbd = el("td");
        kbd.appendChild(el("kbd", null, key));
        row.appendChild(kbd);
        row.appendChild(el("td", "small", controller));
        if (device.touch) row.appendChild(el("td", "small", pad ? (DPAD[button] ? "On-screen d-pad" : "On-screen " + button) : "–"));
    }
    return table;
}
function section(title) {
    const s = el("section", "card");
    if (title) s.appendChild(el("h2", null, title));
    return s;
}
async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); banner(label + " copied.", "ok"); } catch (e) { prompt("Copy this:", text); }
}
let lightbox = { game: null, index: 0 };
function openLightbox(game, index) {
    lightbox = { game, index };
    showLight();
    $("hbLightbox").showModal();
}
function showLight() {
    const { game, index } = lightbox;
    const file = game.screenshots[index];
    $("hbLightImg").src = folderUrl(game, file);
    $("hbLightImg").alt = `${game.title}, screenshot ${index + 1}`;
    $("hbLightCaption").textContent = `${index + 1} of ${game.screenshots.length}`;
    $("hbLightPrev").disabled = $("hbLightNext").disabled = game.screenshots.length < 2;
}
$("hbLightPrev").addEventListener("click", () => { const n = lightbox.game.screenshots.length; lightbox.index = (lightbox.index + n - 1) % n; showLight(); });
$("hbLightNext").addEventListener("click", () => { lightbox.index = (lightbox.index + 1) % lightbox.game.screenshots.length; showLight(); });
$("hbLightbox").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") $("hbLightPrev").click();
    else if (e.key === "ArrowRight") $("hbLightNext").click();
});

function showGame(game) {
    $("hbList").hidden = true;
    const box = $("hbGame");
    box.hidden = false;
    box.textContent = "";
    document.title = game.title + " – Homebrew – EmulatorJS";
    if (window.EJS_SITE && window.EJS_SITE.name) document.title = document.title.replace(/EmulatorJS/g, window.EJS_SITE.name);
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", firstPara(game.description).slice(0, 200));
    $("hbTitle").textContent = game.title;
    $("hbBack").textContent = "← Homebrew showcase";
    $("hbBack").href = "homebrew.html";
    const summary = $("hbSummary");
    summary.textContent = "";
    const byLink = el("a", null, game.author);
    byLink.href = "homebrew.html?author=" + encodeURIComponent(game.author);
    summary.append("by ", byLink, " · " + [game.year, shortSystem(game.system), game.genre, game.players && (game.players === 1 ? "1 player" : game.players + " players")].filter(Boolean).join(" · "));
    if (isNew(game)) summary.append(" ", el("span", "hb-badge inline", game.versions && game.versions.length > 1 ? "Updated" : "New"));
    try { sessionStorage.setItem("ejs-home", "homebrew.html?game=" + game.folder); } catch (e) { /* storage blocked */ }

    // Player (in place) and the facts beside it
    const top = el("div", "hb-top");
    const stage = el("div", "hb-stage");
    if (game.screenshots[0]) stage.style.backgroundImage = `url("${folderUrl(game, game.screenshots[0])}")`;
    const playable = isAvailable(game.system);
    const playHere = el("button", "primary hb-play-here", playable ? "▶ Play here" : `${labelFor(game.system)} core not installed`);
    playHere.type = "button";
    playHere.disabled = !playable;
    playHere.addEventListener("click", () => {
        const frame = el("iframe");
        frame.title = game.title;
        frame.setAttribute("allow", "autoplay; fullscreen; gamepad; cross-origin-isolated");
        frame.src = "play.html?" + new URLSearchParams({ embed: "1", engine: "emulatorjs", url: `homebrew/${game.folder}/${game.rom}`, core: game.core || game.system }).toString();
        stage.textContent = "";
        stage.style.backgroundImage = "";
        stage.classList.add("playing");
        stage.appendChild(frame);
        frame.addEventListener("load", () => { try { frame.contentWindow.focus(); } catch (e) { /* not ready */ } });
    });
    playHere.addEventListener("pointerenter", () => prefetchCore(game.system));
    stage.appendChild(playHere);
    const side = el("div", "hb-side");
    const full = el("a", "button primary hb-playbtn", "▶ Full-screen player");
    if (playable) full.href = playHref(game); else { full.classList.add("disabled"); full.textContent = "Not playable here"; }
    side.appendChild(full);
    const facts = el("dl", "hb-facts");
    const fact = (k, v) => { if (!v) return; facts.appendChild(el("dt", null, k)); facts.appendChild(el("dd", null, String(v))); };
    fact("Author", game.author);
    fact("Year", game.year);
    fact("Version", game.version);
    fact("System", labelFor(game.system));
    fact("Licence", game.license);
    fact("Size", game.size < 1048576 ? Math.max(1, Math.round(game.size / 1024)) + " KB" : (game.size / 1048576).toFixed(1) + " MB");
    fact("Updated", game.updated);
    const mine = Math.max(playtimeFor(game.title) || 0, playtimeFor(game.rom.replace(/\.[^.]+$/, "")) || 0);
    if (mine >= 60) fact("You played", formatPlaytime(mine));
    side.appendChild(facts);
    const check = el("p", "small hb-check", "Checking the file…");
    side.appendChild(check);
    const tools = el("div", "hb-tools");
    const add = el("button", "", "＋ Add to My Collection");
    add.type = "button";
    add.addEventListener("click", () => addToCollection(game, add));
    const dl = el("a", "button", "Download");
    dl.href = `homebrew/${game.folder}/${game.rom}`;
    dl.download = game.rom;
    dl.title = "Licence: " + game.license;
    const share = el("button", "", "Share");
    share.type = "button";
    share.addEventListener("click", async () => {
        // The share page (homebrew/<folder>/) gives chat apps and social networks a preview with the picture
        const url = new URL(`homebrew/${game.folder}/`, location.href).href;
        if (navigator.share && device.touch) {
            try { await navigator.share({ title: game.title, text: `${game.title} by ${game.author}: play it in the browser`, url }); return; } catch (e) { if (e.name === "AbortError") return; }
        }
        copy(url, "Link");
    });
    const embed = el("button", "", "Embed");
    embed.type = "button";
    embed.title = "Put this game on another web page";
    embed.addEventListener("click", () => {
        const src = new URL("play.html?" + new URLSearchParams({ embed: "1", url: `homebrew/${game.folder}/${game.rom}`, core: game.core || game.system }).toString(), location.href).href;
        copy(`<iframe src="${src}" title="${game.title.replace(/"/g, "&quot;")}" width="640" height="560" allow="autoplay; fullscreen; gamepad" style="border:0"></iframe>`, "Embed code");
    });
    tools.append(add, dl, share, embed);
    side.appendChild(tools);
    top.append(stage, side);
    box.appendChild(top);

    // Gallery
    if (game.screenshots.length || game.video) {
        const gal = section("Pictures" + (game.video ? " and video" : ""));
        const row = el("div", "hb-gallery");
        if (game.video) {
            const v = el("video");
            v.src = folderUrl(game, game.video);
            v.controls = true;
            v.preload = "metadata";
            v.playsInline = true;
            if (game.screenshots[0]) v.poster = folderUrl(game, game.screenshots[0]);
            row.appendChild(v);
        }
        game.screenshots.forEach((s, i) => {
            const b = el("button", "hb-thumb");
            b.type = "button";
            b.style.backgroundImage = `url("${folderUrl(game, s)}")`;
            b.setAttribute("aria-label", `Screenshot ${i + 1}, open full size`);
            b.addEventListener("click", () => openLightbox(game, i));
            row.appendChild(b);
        });
        gal.appendChild(row);
        box.appendChild(gal);
    }
    if (game.description) {
        const about = section("About");
        for (const para of String(game.description).split(/\n{2,}/)) about.appendChild(el("p", null, para));
        box.appendChild(about);
    }
    const table = controlsTable(game);
    if (table) {
        const controls = section("Controls");
        const wrap = el("div", "table-wrap");
        wrap.appendChild(table);
        controls.appendChild(wrap);
        controls.appendChild(el("p", "small muted", "Keys are the player's defaults; they can be changed in the game's controls menu. On phones and tablets the on-screen buttons appear by themselves."));
        box.appendChild(controls);
    }
    const credits = game.credits || [];
    if (credits.length || (game.versions || []).length) {
        const cols = el("div", "hb-two");
        if (credits.length) {
            const c = section("Credits");
            const dlc = el("dl", "hb-facts");
            for (const p of credits) {
                dlc.appendChild(el("dt", null, p.role || "Made by"));
                const dd = el("dd");
                const a = el("a", null, p.name);
                a.href = "homebrew.html?author=" + encodeURIComponent(p.name);
                dd.appendChild(a);
                dlc.appendChild(dd);
            }
            c.appendChild(dlc);
            cols.appendChild(c);
        }
        if ((game.versions || []).length) {
            const v = section("Release notes");
            const ol = el("ol", "hb-versions");
            for (const r of game.versions) {
                const li = el("li");
                li.appendChild(el("strong", null, r.version + (r.date ? " · " + r.date : "")));
                if (r.notes) li.appendChild(el("p", null, r.notes));
                ol.appendChild(li);
            }
            v.appendChild(ol);
            cols.appendChild(v);
        }
        box.appendChild(cols);
    }
    const links = game.links || [];
    if (links.length || (game.tags || []).length) {
        const more = section(links.length ? "Links" : null);
        if (links.length) {
            const ul = el("ul", "hb-links");
            for (const l of links) {
                const li = el("li");
                const a = el("a", null, l.label || l.url);
                a.href = /^https?:\/\//.test(l.url) ? l.url : `homebrew/${game.folder}/${l.url}`;
                if (/^https?:\/\//.test(l.url)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
                li.appendChild(a);
                ul.appendChild(li);
            }
            more.appendChild(ul);
        }
        if ((game.tags || []).length) {
            const tags = el("p", "chips");
            for (const t of game.tags) {
                const a = el("a", "chip", t);
                a.href = "homebrew.html?q=" + encodeURIComponent(t);
                tags.appendChild(a);
            }
            more.appendChild(tags);
        }
        box.appendChild(more);
    }
    // More by the same author
    const others = games.filter((g) => g !== game && (g.author === game.author || (g.credits || []).some((c) => c.name === game.author)));
    if (others.length) {
        const s = section("More by " + game.author);
        const ul = el("ul", "col-grid hb-more");
        for (const g of others.slice(0, 6)) ul.appendChild(card(g));
        s.appendChild(ul);
        box.appendChild(s);
    }
    const sums = el("p", "small muted hb-sum");
    sums.textContent = `SHA-1 ${game.sha1}` + (game.md5 ? ` · MD5 ${game.md5}` : "") + (game.crc32 ? ` · CRC32 ${game.crc32}` : "");
    sums.title = "Checksums of the game file, so anyone can confirm they have the file the author published";
    box.appendChild(sums);
    verify(game, check);
}
async function verify(game, out) {
    try {
        const r = await fetch(`homebrew/${game.folder}/${game.rom}`, { cache: "no-cache" });
        if (!r.ok) throw new Error(String(r.status));
        const got = await checksums(await r.blob());
        const ok = got.sha1 ? got.sha1 === game.sha1 : got.md5 === game.md5;
        out.textContent = ok ? "✓ The file matches the published checksums." : "✗ The file does not match the published checksums: it changed after the list was built.";
        out.className = "small hb-check " + (ok ? "ok" : "bad");
    } catch (e) {
        out.textContent = "The file could not be checked here.";
    }
}
async function addToCollection(game, button) {
    button.disabled = true;
    try {
        const store = await import("./collection-store.js");
        const existing = await store.findBySha1(game.sha1);
        if (existing.length) { banner(`${game.title} is already in My Collection.`, "ok", [["Open My Collection", () => { location.href = "collection.html"; }], ["Dismiss", null]]); return; }
        const blob = await (await fetch(`homebrew/${game.folder}/${game.rom}`)).blob();
        const rec = await store.add({ file: new File([blob], game.rom), name: game.rom, system: game.system, core: game.core || null, title: game.title, sha1: game.sha1, source: "Homebrew showcase" });
        if (game.screenshots[0]) {
            const pic = await fetch(folderUrl(game, game.screenshots[0])).then((x) => (x.ok ? x.blob() : null)).catch(() => null);
            if (pic) await store.setCover(rec.id, pic);
        }
        banner(`Added ${game.title} to My Collection on this device.`, "ok", [["Open My Collection", () => { location.href = "collection.html"; }], ["Dismiss", null]]);
    } catch (e) {
        banner("Could not add it: " + e.message, "warn");
    } finally {
        button.disabled = false;
    }
}

async function main() {
    await loadManifest();
    if (!getEngine()) setEngine("emulatorjs");
    try {
        const response = await fetch("homebrew/index.json", { cache: "no-cache" });
        games = ((await response.json()).games || []).filter((g) => siteAllows(g.system));
    } catch (e) {
        games = [];
    }
    const wanted = params.get("game");
    const game = wanted && games.find((g) => g.folder === wanted);
    if (game) {
        showGame(game);
    } else {
        try { sessionStorage.setItem("ejs-home", "homebrew.html"); } catch (e) { /* storage blocked */ }
        const systems = [...new Set(games.map((g) => g.system))];
        for (const s of systems) $("hbSystem").add(new Option(shortSystem(s), s));
        $("hbSystem").hidden = systems.length < 2;
        if (params.get("q")) $("hbSearch").value = params.get("q");
        try { const s = localStorage.getItem("ejs-homebrew-sort"); if (s) $("hbSort").value = s; } catch (e) { /* default */ }
        $("hbSearch").addEventListener("input", renderList);
        $("hbSystem").addEventListener("change", renderList);
        $("hbSort").addEventListener("change", () => { try { localStorage.setItem("ejs-homebrew-sort", $("hbSort").value); } catch (e) { /* blocked */ } renderList(); });
        $("hbRandom").addEventListener("click", () => {
            const pool = shown().length ? shown() : games;
            if (pool.length) location.href = "homebrew.html?game=" + encodeURIComponent(pool[Math.floor(Math.random() * pool.length)].folder);
        });
        const author = params.get("author");
        if (author) {
            const note = $("hbAuthorNote");
            note.hidden = false;
            note.append(`Showing games by ${author}. `);
            const all = el("a", null, "Show all games");
            all.href = "homebrew.html";
            note.appendChild(all);
        }
        renderChips();
        renderList();
        if (wanted) banner(`There is no homebrew game called "${wanted}" here.`, "warn");
    }
    setupServiceWorker({ shouldReload: () => false }).catch(() => {});
}
main();
