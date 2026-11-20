// Use case 1, My Collection: the player's own game backups in one place on every device they use.
// Second pass: duplicates found by content (SHA-1), games recognised from the Homebrew showcase and the archive,
// shelves, status and notes, your own cover pictures, select mode with bulk changes, a list view, "Continue playing"
// and "Surprise me", keyboard and controller navigation, undo for removals, a space check before adding, adding
// the Basic page's recent games, and exports split into parts (all, shown or selected games) with multi-part import.
import { $, banner as showBanner, loadManifest, isAvailable, installedCores, preferredCore, coreNeedsThreads, coreSingleThread, ENGINES, getEngine, setEngine, setupServiceWorker, prefetchCore } from "./common.js";
import { SYSTEMS, labelFor, detectSystem, extensionOf, PATCH_EXTENSIONS } from "./detect.js";
import { playUrl } from "./folders.js";
import { initDevice, device } from "./mobile.js";
import * as library from "./library.js";
import { exportBackup, importBackup } from "./backup.js";
import * as store from "./collection-store.js";

const { timeAgo, formatPlaytime, playtimeFor } = library;
const FORMAT = "emulatorjs-collection";
const SKIP = /\.(txt|nfo|diz|md|pdf|html?|xml|dat|url|jpe?g|png|gif|bmp|webp|srm|sav|state|cht|db|ini|json|DS_Store)$/i;
const SHORT = { nes: "NES", snes: "SNES", gb: "Game Boy", gba: "GBA", n64: "N64", nds: "DS", segaMD: "Genesis", segaMS: "Master System", segaGG: "Game Gear", atari2600: "Atari 2600", psx: "PlayStation", psp: "PSP", arcade: "Arcade", mame: "MAME", pce: "PC Engine", lynx: "Lynx", atari7800: "Atari 7800", sega32x: "32X", segaCD: "Sega CD", segaSaturn: "Saturn", vb: "Virtual Boy", ws: "WonderSwan", ngp: "Neo Geo Pocket", coleco: "ColecoVision" };
const STATUS = [["", "No status"], ["want", "Want to play"], ["playing", "Playing"], ["finished", "Finished"], ["completed", "100 % completed"], ["paused", "On hold"], ["dropped", "Gave up"]];
const STATUS_ORDER = ["playing", "paused", "want", "", "finished", "completed", "dropped"];
const statusLabel = (s) => (STATUS.find(([k]) => k === s) || ["", ""])[1];
const shortName = (system) => SHORT[system] || labelFor(system);

let available = [];
let games = [];
let filterSystem = "";
let filterShelf = "";
let selecting = false;
const selected = new Set();
const coverUrls = new Map();
let known = null;   // sha1 -> { title, source, image } from the Homebrew showcase and the archive

initDevice();
try { sessionStorage.setItem("ejs-home", "collection.html"); } catch (e) { /* storage blocked */ }
// Good news fades away by itself; warnings and questions stay until dismissed
function banner(text, kind, actions) {
    const close = showBanner(text, kind, actions);
    if (kind === "ok" && !actions) setTimeout(close, 6000);
    return close;
}
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + " MB";
    return (bytes / 1073741824).toFixed(1) + " GB";
}
/** Play time: what My Collection counted, or the emulator's own count for the game when that is higher. */
const seconds = (g) => Math.max(g.playSeconds || 0, playtimeFor(g.title) || 0, playtimeFor(g.name.replace(/\.[^.]+$/, "")) || 0);
const shelvesOf = (g) => g.shelves || [];
const allShelves = () => [...new Set(games.flatMap(shelvesOf))].sort((a, b) => a.localeCompare(b));
const parseShelves = (text) => [...new Set(String(text || "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 12);

// ---------- known games (recognised by their SHA-1) ----------
async function knownGames() {
    if (known) return known;
    known = new Map();
    try {
        for (const g of (await (await fetch("homebrew/index.json")).json()).games || []) {
            if (g.sha1) known.set(g.sha1, { title: g.title, source: "Homebrew showcase", image: g.screenshots && g.screenshots[0] ? `homebrew/${g.folder}/${g.screenshots[0]}` : null });
        }
    } catch (e) { /* no showcase */ }
    try {
        for (const r of (await (await fetch("archive/index.json")).json()).records || []) {
            if (r.file && r.file.sha1 && !known.has(r.file.sha1)) known.set(r.file.sha1, { title: r.title, source: "Preservation archive " + r.id, image: r.media && r.media[0] ? r.media[0].path : null });
        }
    } catch (e) { /* no archive */ }
    return known;
}

// ---------- list ----------
function sorted(list) {
    const sort = $("colSort").value;
    const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
    const by = {
        recent: (a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || byTitle(a, b),
        title: byTitle,
        played: (a, b) => seconds(b) - seconds(a) || byTitle(a, b),
        added: (a, b) => (b.added || 0) - (a.added || 0),
        system: (a, b) => shortName(a.system).localeCompare(shortName(b.system)) || byTitle(a, b),
        size: (a, b) => (b.size || 0) - (a.size || 0),
        status: (a, b) => STATUS_ORDER.indexOf(a.status || "") - STATUS_ORDER.indexOf(b.status || "") || byTitle(a, b)
    }[sort] || byTitle;
    return list.slice().sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || by(a, b));
}
function shownGames() {
    const words = $("colSearch").value.toLowerCase().split(/\s+/).filter(Boolean);
    return sorted(games).filter((g) =>
        (!filterSystem || (filterSystem === "favorites" ? g.favorite : g.system === filterSystem)) &&
        (!filterShelf || (filterShelf.startsWith("status:") ? (g.status || "") === filterShelf.slice(7) : shelvesOf(g).includes(filterShelf))) &&
        words.every((w) => [g.title, g.name, shortName(g.system), ...shelvesOf(g), statusLabel(g.status), g.notes || ""].join(" ").toLowerCase().includes(w)));
}
function chipsInto(box, items, current, onPick) {
    box.textContent = "";
    for (const [value, label] of items) {
        const b = el("button", "chip" + (current === value ? " on" : ""), label);
        b.type = "button";
        b.setAttribute("aria-pressed", String(current === value));
        b.addEventListener("click", () => onPick(current === value && value !== "" ? "" : value));
        box.appendChild(b);
    }
}
function renderFilters() {
    const counts = {};
    for (const g of games) counts[g.system] = (counts[g.system] || 0) + 1;
    const systems = Object.keys(counts).sort((a, b) => shortName(a).localeCompare(shortName(b)));
    const sysItems = [["", `All (${games.length})`], ["favorites", `★ Favourites (${games.filter((g) => g.favorite).length})`], ...systems.map((s) => [s, `${shortName(s)} (${counts[s]})`])];
    $("colSystems").hidden = games.length < 2;
    chipsInto($("colSystems"), sysItems, filterSystem, (v) => { filterSystem = v; renderFilters(); renderGrid(); });
    const shelves = allShelves();
    const statuses = STATUS.filter(([k]) => k && games.some((g) => g.status === k));
    const shelfItems = [...shelves.map((s) => [s, `▤ ${s} (${games.filter((g) => shelvesOf(g).includes(s)).length})`]), ...statuses.map(([k, l]) => ["status:" + k, `${l} (${games.filter((g) => g.status === k).length})`])];
    $("colShelves").hidden = !shelfItems.length;
    chipsInto($("colShelves"), shelfItems, filterShelf, (v) => { filterShelf = v; renderFilters(); renderGrid(); });
    $("shelfList").textContent = "";
    for (const s of shelves) $("shelfList").appendChild(new Option(s));
}
let coverObserver = null;
function lazyCover(pic, id) {
    pic.dataset.coverId = id;
    if (!coverObserver) {
        coverObserver = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                coverObserver.unobserve(e.target);
                loadCover(e.target.dataset.coverId).then((url) => { if (url) e.target.style.backgroundImage = `url("${url}")`; });
            }
        }, { rootMargin: "300px" }) : null;
    }
    if (coverObserver) coverObserver.observe(pic);
    else loadCover(id).then((url) => { if (url) pic.style.backgroundImage = `url("${url}")`; });
}
function card(g, mini) {
    const li = el("li", "col-card" + (selected.has(g.id) ? " picked" : ""));
    li.dataset.id = g.id;
    const play = el("a", "col-play");
    play.href = playUrl({ cid: g.id });
    play.title = "Play " + g.title;
    play.addEventListener("pointerenter", () => prefetchCore(g.system));
    play.addEventListener("click", (e) => {
        if (!selecting || mini) return;
        e.preventDefault();
        toggleSelect(g.id);
    });
    const pic = el("div", "col-cover");
    pic.dataset.system = shortName(g.system);
    if (g.hasCover) lazyCover(pic, g.id);
    const name = el("strong", null, g.title);
    const meta = el("span");
    const s = seconds(g);
    meta.textContent = shortName(g.system) + (s >= 60 ? " · " + formatPlaytime(s) : "") + (g.lastPlayed ? " · " + timeAgo(g.lastPlayed) : " · new");
    play.append(pic, name, meta);
    if (!mini) {
        const extra = el("span", "col-extra");
        if (g.status) extra.appendChild(el("em", "col-status s-" + g.status, statusLabel(g.status)));
        for (const sh of shelvesOf(g).slice(0, 3)) extra.appendChild(el("em", "col-shelf", sh));
        extra.appendChild(el("em", "col-size", formatSize(g.size || 0)));
        play.appendChild(extra);
    }
    li.appendChild(play);
    if (mini) return li;
    if (selecting) {
        const box = el("input", "col-pick");
        box.type = "checkbox";
        box.checked = selected.has(g.id);
        box.setAttribute("aria-label", "Select " + g.title);
        box.addEventListener("change", () => toggleSelect(g.id));
        li.appendChild(box);
    } else {
        const star = el("button", "col-star" + (g.favorite ? " on" : ""), g.favorite ? "★" : "☆");
        star.type = "button";
        star.setAttribute("aria-pressed", String(!!g.favorite));
        star.setAttribute("aria-label", (g.favorite ? "Remove from favourites: " : "Add to favourites: ") + g.title);
        star.addEventListener("click", () => toggleFavourite(g));
        li.appendChild(star);
    }
    const more = el("button", "col-more", "⋯");
    more.type = "button";
    more.setAttribute("aria-label", "Details for " + g.title);
    more.addEventListener("click", () => edit(g));
    li.appendChild(more);
    return li;
}
async function toggleFavourite(g) {
    await store.update(g.id, { favorite: !g.favorite });
    await refresh(g.id);
}
function renderGrid(focusId) {
    const grid = $("colGrid");
    const shown = shownGames();
    grid.textContent = "";
    grid.classList.toggle("col-list", $("colView").value === "list");
    $("colEmpty").hidden = games.length > 0;
    const total = games.reduce((n, g) => n + (g.size || 0), 0);
    $("colSummary").textContent = games.length
        ? `${games.length} game${games.length === 1 ? "" : "s"} · ${formatSize(total)} on this device` + (shown.length !== games.length ? ` · ${shown.length} shown` : "")
        : "No games yet";
    for (const g of shown) grid.appendChild(card(g));
    if (!shown.length && games.length) grid.appendChild(el("li", "muted col-none", "No game matches. Clear the search or the filters."));
    // Continue playing: the last few games played this month, when nothing is filtered
    const recent = games.filter((g) => g.lastPlayed && Date.now() - g.lastPlayed < 30 * 86400000).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 4);
    const showRow = recent.length > 0 && games.length > 4 && !filterSystem && !filterShelf && !$("colSearch").value && !selecting;
    $("colContinue").hidden = !showRow;
    $("continueGrid").textContent = "";
    if (showRow) for (const g of recent) $("continueGrid").appendChild(card(g, true));
    if (focusId) {
        const target = grid.querySelector(`[data-id="${CSS.escape(focusId)}"] .col-play`);
        if (target) target.focus({ preventScroll: true });
    }
    renderBulk();
}
async function loadCover(id) {
    if (coverUrls.has(id)) return coverUrls.get(id);
    const blob = await store.cover(id).catch(() => null);
    const url = blob ? URL.createObjectURL(blob) : null;
    coverUrls.set(id, url);
    return url;
}
function dropCoverUrl(id) {
    const url = coverUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    coverUrls.delete(id);
}
async function refresh(focusId) {
    games = await store.list();
    for (const id of [...selected]) if (!games.some((g) => g.id === id)) selected.delete(id);
    renderFilters();
    renderGrid(focusId);
}

// ---------- select mode and bulk changes ----------
function setSelecting(on) {
    selecting = on;
    if (!on) selected.clear();
    $("selectMode").setAttribute("aria-pressed", String(on));
    $("selectMode").textContent = on ? "Selecting…" : "Select";
    $("colBulk").hidden = !on;
    document.body.classList.toggle("col-selecting", on);
    renderGrid();
}
function toggleSelect(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    const li = $("colGrid").querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (li) {
        li.classList.toggle("picked", selected.has(id));
        const box = li.querySelector(".col-pick");
        if (box) box.checked = selected.has(id);
    }
    renderBulk();
}
function renderBulk() {
    $("bulkCount").textContent = `${selected.size} selected`;
    for (const id of ["bulkFav", "bulkShelf", "bulkStatus", "bulkSystem", "bulkExport", "bulkRemove"]) $(id).disabled = !selected.size;
}
const pickedGames = () => games.filter((g) => selected.has(g.id));
async function pick(title, build) {
    const dialog = $("pickDialog");
    $("pickTitle").textContent = title;
    $("pickBody").textContent = "";
    const read = build($("pickBody"));
    dialog.returnValue = "";
    dialog.showModal();
    const choice = await new Promise((r) => dialog.addEventListener("close", () => r(dialog.returnValue), { once: true }));
    return choice === "ok" ? read() : null;
}
$("selectMode").addEventListener("click", () => setSelecting(!selecting));
$("bulkDone").addEventListener("click", () => setSelecting(false));
$("bulkAll").addEventListener("click", () => { for (const g of shownGames()) selected.add(g.id); renderGrid(); });
$("bulkFav").addEventListener("click", async () => {
    const list = pickedGames();
    const on = !list.every((g) => g.favorite);
    for (const g of list) await store.update(g.id, { favorite: on });
    await refresh();
    banner(`${list.length} game${list.length === 1 ? "" : "s"} ${on ? "added to" : "removed from"} favourites.`, "ok");
});
$("bulkShelf").addEventListener("click", async () => {
    const value = await pick("Add to a shelf", (body) => {
        const i = el("input");
        i.type = "text";
        i.setAttribute("list", "shelfList");
        i.placeholder = "Shelf name, e.g. Family";
        i.setAttribute("aria-label", "Shelf name");
        const l = el("label", "cf-check");
        const rm = el("input");
        rm.type = "checkbox";
        l.append(rm, document.createTextNode(" Take them off this shelf instead"));
        body.append(i, l);
        setTimeout(() => i.focus(), 50);
        return () => ({ shelves: parseShelves(i.value), remove: rm.checked });
    });
    if (!value || !value.shelves.length) return;
    for (const g of pickedGames()) {
        const now = value.remove ? shelvesOf(g).filter((s) => !value.shelves.includes(s)) : [...new Set([...shelvesOf(g), ...value.shelves])];
        await store.update(g.id, { shelves: now });
    }
    await refresh();
});
$("bulkStatus").addEventListener("click", async () => {
    const value = await pick("Set the status", (body) => {
        const s = el("select");
        s.setAttribute("aria-label", "Status");
        for (const [k, l] of STATUS) s.add(new Option(l, k));
        body.appendChild(s);
        return () => s.value;
    });
    if (value === null) return;
    for (const g of pickedGames()) await store.update(g.id, { status: value });
    await refresh();
});
$("bulkSystem").addEventListener("click", async () => {
    const value = await pick("Change the system", (body) => {
        const s = el("select");
        s.setAttribute("aria-label", "System");
        for (const [id, label] of available) s.add(new Option(label, id));
        body.append(s, el("p", "small muted", "Only for games that were added with the wrong system. Their core goes back to the system's default."));
        return () => s.value;
    });
    if (!value) return;
    for (const g of pickedGames()) await store.update(g.id, { system: value, core: null });
    await refresh();
});
$("bulkExport").addEventListener("click", () => openExport("selected"));
$("bulkRemove").addEventListener("click", async () => {
    const list = pickedGames();
    if (!confirm(`Remove ${list.length} game${list.length === 1 ? "" : "s"} from your collection? Their saves stay in this browser.`)) return;
    await removeWithUndo(list);
});

// ---------- removing, with undo ----------
async function removeWithUndo(list) {
    const kept = [];
    for (const g of list) {
        kept.push({ g, file: await store.file(g.id).catch(() => null), cover: g.hasCover ? await store.cover(g.id).catch(() => null) : null });
        await store.remove(g.id);
        dropCoverUrl(g.id);
    }
    await refresh();
    const close = banner(`Removed ${list.length === 1 ? `"${list[0].title}"` : list.length + " games"}.`, "ok", [["Undo", async () => {
        for (const k of kept) {
            if (!k.file) continue;
            const g = k.g;
            await store.add({ file: new File([k.file], g.name), name: g.name, system: g.system, core: g.core, title: g.title, added: g.added, lastPlayed: g.lastPlayed, favorite: g.favorite, playSeconds: g.playSeconds, sessions: g.sessions, sha1: g.sha1 || null, shelves: g.shelves || [], status: g.status || "", notes: g.notes || "", source: g.source || "" });
            if (k.cover) await store.setCover(store.idFor(g.name, k.file.size), k.cover, { custom: !!g.customCover, auto: false });
        }
        await refresh();
        banner("Brought back.", "ok");
    }], ["Dismiss", null]]);
    setTimeout(close, 15000);
}

// ---------- storage ----------
async function freeSpace() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return quota ? quota - usage : null;
}
async function showStorage() {
    const line = $("colStorage");
    if (!navigator.storage || !navigator.storage.estimate) return;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    line.textContent = `This site uses ${formatSize(usage)} of ${formatSize(quota)} available here. `;
    if (persisted) {
        line.append("Kept safe: the browser will not clear it on its own.");
    } else if (navigator.storage.persist) {
        const b = el("button", "link-btn", "Keep my collection on this device");
        b.type = "button";
        b.title = "Asks the browser not to clear the collection when space runs low or after weeks without a visit";
        b.addEventListener("click", async () => {
            const ok = await navigator.storage.persist().catch(() => false);
            banner(ok ? "The browser will keep your collection." : device.ios ? "Safari keeps it best when the site is added to the Home Screen (Share, Add to Home Screen)." : "The browser did not agree this time. It usually does after you have used the site a few times.", ok ? "ok" : "warn");
            showStorage();
        });
        line.appendChild(b);
    }
}

// ---------- adding games: every file is reviewed with its system and core before it is stored ----------
async function filesFromDrop(items) {
    const out = [];
    const walk = (entry) => new Promise((resolve) => {
        if (entry.isFile) entry.file((f) => { out.push(f); resolve(); }, () => resolve());
        else if (entry.isDirectory) {
            const reader = entry.createReader();
            const all = [];
            const next = () => reader.readEntries(async (batch) => {
                if (!batch.length) {
                    for (const e of all) await walk(e);
                    resolve();
                } else {
                    all.push(...batch);
                    next();
                }
            }, () => resolve());
            next();
        } else resolve();
    });
    const entries = [...items].map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    for (const e of entries) await walk(e);
    return out;
}
async function review(files, presets = {}) {
    const candidates = files.filter((f) => !SKIP.test(f.name) && !PATCH_EXTENSIONS.includes(extensionOf(f.name)) && f.size > 0);
    const skipped = files.length - candidates.length;
    if (!candidates.length) {
        banner(skipped ? "Those files are not games (text, pictures, saves or patches)." : "No files to add.", "warn");
        return;
    }
    const dialog = $("reviewDialog");
    const list = $("reviewList");
    list.textContent = "";
    $("reviewText").textContent = "Checking the files…";
    $("reviewSpace").hidden = true;
    $("reviewShelf").value = filterShelf && !filterShelf.startsWith("status:") ? filterShelf : "";
    $("reviewAdd").disabled = true;
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    const rows = [];
    const knownMap = await knownGames();
    let dupes = 0;
    for (const file of candidates) {
        const preset = presets[file.name] || {};
        const [{ system, reason }, sha1] = await Promise.all([
            preset.system ? Promise.resolve({ system: preset.system, reason: "the game you played" }) : detectSystem(file, available).catch(() => ({ system: null })),
            store.sha1Of(file)
        ]);
        const same = sha1 ? games.find((g) => g.sha1 === sha1) : null;
        const recognised = sha1 ? knownMap.get(sha1) : null;
        const row = el("div", "review-row" + (same ? " dupe" : ""));
        const name = el("div", "review-name", file.webkitRelativePath || file.name);
        const hint = el("div", "review-hint small " + (same ? "warn" : system ? "ok" : "warn"));
        const include = el("input");
        include.type = "checkbox";
        include.checked = !same;
        include.setAttribute("aria-label", "Add " + file.name);
        const incLabel = el("label", "review-include");
        incLabel.append(include, document.createTextNode(same ? " add again" : " add"));
        if (same) { hint.textContent = `Already in your collection as "${same.title}"`; dupes++; }
        else if (recognised) hint.textContent = `Recognised: ${recognised.title} (${recognised.source})`;
        else hint.textContent = system ? "Detected from " + reason : "Choose the system";
        const sys = el("select");
        sys.setAttribute("aria-label", "System for " + file.name);
        sys.add(new Option("Choose a system…", ""));
        for (const [id, label] of available) sys.add(new Option(label, id));
        sys.value = system || "";
        const core = el("select");
        core.setAttribute("aria-label", "Core for " + file.name);
        sys.addEventListener("change", () => { fillCores(core, sys.value); check(); });
        include.addEventListener("change", check);
        fillCores(core, sys.value, preset.core);
        row.append(name, hint, sys, core, incLabel);
        list.appendChild(row);
        rows.push({ file, sys, core, include, sha1, recognised });
    }
    async function check() {
        const chosen = rows.filter((r) => r.include.checked);
        const missing = chosen.filter((r) => !r.sys.value).length;
        $("reviewAdd").disabled = !chosen.length || missing > 0;
        $("reviewAdd").textContent = !chosen.length ? "Nothing to add" : missing ? `Choose ${missing} more system${missing === 1 ? "" : "s"}` : `Add ${chosen.length} game${chosen.length === 1 ? "" : "s"}`;
        const need = chosen.reduce((n, r) => n + r.file.size, 0);
        const free = await freeSpace();
        if (free !== null && need > free * 0.9) {
            $("reviewSpace").hidden = false;
            $("reviewSpace").textContent = `These games need ${formatSize(need)}, but this browser has only about ${formatSize(free)} free for the site. Add fewer, or remove games you no longer play.`;
        } else $("reviewSpace").hidden = true;
    }
    $("reviewText").textContent = `Check the system and core for each game${skipped ? ` (${skipped} non-game file${skipped === 1 ? "" : "s"} left out)` : ""}${dupes ? `. ${dupes} ${dupes === 1 ? "is" : "are"} already in your collection (the same file, even under another name) and won't be added twice unless you tick them` : ""}.`;
    check();
    const choice = await new Promise((resolve) => dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true }));
    if (choice !== "add") return;
    const shelves = parseShelves($("reviewShelf").value);
    let added = 0;
    const failed = [];
    for (const r of rows.filter((x) => x.include.checked)) {
        try {
            const rec = await store.add({ file: r.file, name: r.file.name, system: r.sys.value, core: r.core.value || null, sha1: r.sha1, shelves, title: r.recognised ? r.recognised.title : undefined, source: r.recognised ? r.recognised.source : "" });
            // A recognised game starts with its published screenshot as the cover
            if (r.recognised && r.recognised.image && !rec.hasCover) {
                const pic = await fetch(r.recognised.image).then((x) => (x.ok ? x.blob() : null)).catch(() => null);
                if (pic) await store.setCover(rec.id, pic);
            }
            added++;
        } catch (e) {
            failed.push(r.file.name + ": " + e.message);
        }
    }
    await refresh();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    showStorage();
    banner(failed.length ? `Added ${added}; ${failed.length} could not be stored (${failed[0]}).` : `Added ${added} game${added === 1 ? "" : "s"} to your collection.`, failed.length ? "warn" : "ok");
}
function fillCores(select, system, chosen) {
    select.textContent = "";
    if (!system) { select.disabled = true; return; }
    const cores = installedCores(system);
    const engineId = getEngine() || "emulatorjs";
    cores.forEach((c, i) => select.add(new Option(c + (i === 0 ? " (default)" : "") + (engineId === "nostalgist" && !coreSingleThread(c) ? " (EmulatorJSMod)" : "") + (coreNeedsThreads(c) ? " · threads" : ""), c)));
    select.disabled = cores.length < 2;
    const want = chosen || preferredCore(system);
    select.value = want && cores.includes(want) ? want : cores[0];
}
/** The Basic page's recent games (files opened there) can be added in one go. */
async function addRecent() {
    const entries = library.listRecent();
    const files = [];
    const presets = {};
    for (const e of entries) {
        try {
            const { rom } = await library.open(e);
            let file = rom;
            if (typeof rom === "string") {
                const r = await fetch(rom);
                if (!r.ok) continue;
                file = new File([await r.blob()], e.name);
            }
            if (!file) continue;
            files.push(file);
            presets[file.name] = { system: e.system, core: e.core || null };
        } catch (err) { /* skip that one */ }
    }
    if (!files.length) return banner("Your recent games are no longer stored in this browser.", "warn");
    review(files, presets);
}

// ---------- details ----------
async function edit(g) {
    const dialog = $("editDialog");
    $("editName").value = g.title;
    const sys = $("editSystem");
    sys.textContent = "";
    for (const [id, label] of available) sys.add(new Option(label, id));
    if (![...sys.options].some((o) => o.value === g.system)) sys.add(new Option(labelFor(g.system), g.system));
    sys.value = g.system;
    fillCores($("editCore"), g.system, g.core);
    sys.onchange = () => fillCores($("editCore"), sys.value);
    const st = $("editStatus");
    st.textContent = "";
    for (const [k, l] of STATUS) st.add(new Option(l, k));
    st.value = g.status || "";
    $("editShelves").value = shelvesOf(g).join(", ");
    $("editNotes").value = g.notes || "";
    const coverBox = $("editCover");
    coverBox.dataset.system = shortName(g.system);
    coverBox.style.backgroundImage = "";
    if (g.hasCover) loadCover(g.id).then((url) => { if (url) coverBox.style.backgroundImage = `url("${url}")`; });
    let newCover = null, dropCover = false;
    $("editCoverFile").onchange = () => {
        const f = $("editCoverFile").files[0];
        $("editCoverFile").value = "";
        if (!f) return;
        newCover = f;
        dropCover = false;
        coverBox.style.backgroundImage = `url("${URL.createObjectURL(f)}")`;
    };
    $("editCoverRemove").onclick = () => { newCover = null; dropCover = true; coverBox.style.backgroundImage = ""; };
    const s = seconds(g);
    $("editInfo").textContent = `${g.name} · ${formatSize(g.size)} · added ${timeAgo(g.added)}` + (s >= 60 ? ` · played ${formatPlaytime(s)}` : "") + (g.sessions ? ` in ${g.sessions} session${g.sessions === 1 ? "" : "s"}` : "") + (g.sha1 ? ` · SHA-1 ${g.sha1.slice(0, 12)}…` : "") + (g.source ? ` · from the ${g.source}` : "");
    dialog.returnValue = "";
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    const choice = await new Promise((resolve) => dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true }));
    if (choice === "save") {
        await store.update(g.id, { title: $("editName").value.trim() || g.title, system: sys.value, core: $("editCore").value || null, status: st.value, shelves: parseShelves($("editShelves").value), notes: $("editNotes").value.trim().slice(0, 4000) });
        if (newCover) { await store.setCover(g.id, await shrink(newCover), { custom: true, auto: false }); dropCoverUrl(g.id); }
        else if (dropCover) { await store.removeCover(g.id); dropCoverUrl(g.id); }
        await refresh(g.id);
    } else if (choice === "remove") {
        await removeWithUndo([g]);
    } else await refresh(g.id);
}
/** Pictures chosen as covers are scaled down to 480 px wide (a phone photo would waste megabytes). */
async function shrink(file) {
    try {
        const bmp = await createImageBitmap(file);
        const w = Math.min(480, bmp.width);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = Math.round(w * bmp.height / bmp.width);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        return await new Promise((r) => c.toBlob((b) => r(b || file), "image/jpeg", 0.85));
    } catch (e) { return file; }
}

// ---------- surprise me ----------
$("surprise").addEventListener("click", () => {
    const pool = shownGames().filter((g) => isAvailable(g.system));
    if (!pool.length) return banner("There is no game to pick here.", "warn");
    // Favour games not played for a while
    const weights = pool.map((g) => 1 + Math.min(30, g.lastPlayed ? (Date.now() - g.lastPlayed) / 86400000 : 30));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let g = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { g = pool[i]; break; } }
    const target = $("colGrid").querySelector(`[data-id="${CSS.escape(g.id)}"]`);
    if (target) { target.scrollIntoView({ block: "center", behavior: "smooth" }); target.classList.add("flash"); setTimeout(() => target.classList.remove("flash"), 1600); target.querySelector(".col-play").focus({ preventScroll: true }); }
    banner(`How about ${g.title}?`, "ok", [["Play it", () => { location.href = playUrl({ cid: g.id }); }], ["Not now", null]]);
});

// ---------- keyboard and controller ----------
function cards() { return [...$("colGrid").querySelectorAll(".col-card[data-id]")]; }
function focusedIndex(list) { return list.findIndex((li) => li.contains(document.activeElement)); }
function move(dx, dy) {
    const list = cards();
    if (!list.length) return;
    let i = focusedIndex(list);
    if (i < 0) { list[0].querySelector(".col-play").focus(); return; }
    const top = list[0].getBoundingClientRect().top;
    const cols = $("colGrid").classList.contains("col-list") ? 1 : Math.max(1, list.filter((li) => Math.abs(li.getBoundingClientRect().top - top) < 4).length);
    i = Math.max(0, Math.min(list.length - 1, i + dx + dy * cols));
    list[i].querySelector(".col-play").focus();
    list[i].scrollIntoView({ block: "nearest" });
}
function focusedGame() {
    const list = cards();
    const i = focusedIndex(list);
    return i < 0 ? null : games.find((g) => g.id === list[i].dataset.id) || null;
}
window.addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea, dialog")) return;
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key] && (focusedIndex(cards()) >= 0 || document.activeElement === document.body)) { e.preventDefault(); move(...moves[e.key]); return; }
    const g = focusedGame();
    if (!g) return;
    if (e.key === "d" || e.key === "D") { e.preventDefault(); edit(g); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFavourite(g); }
    else if (e.key === " " && selecting) { e.preventDefault(); toggleSelect(g.id); }
});
const padPrev = new Map();
setInterval(() => {
    if (!navigator.getGamepads || document.querySelector("dialog[open]") || document.hidden) return;
    for (const p of navigator.getGamepads()) {
        if (!p) continue;
        const prev = padPrev.get(p.index) || {};
        const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
        const x = p.axes[0] || 0, y = p.axes[1] || 0;
        const now = { l: b(14) || x < -0.6, r: b(15) || x > 0.6, u: b(12) || y < -0.6, d: b(13) || y > 0.6, a: b(0), x: b(2), y: b(3) };
        if (now.l && !prev.l) move(-1, 0);
        if (now.r && !prev.r) move(1, 0);
        if (now.u && !prev.u) move(0, -1);
        if (now.d && !prev.d) move(0, 1);
        const g = focusedGame();
        if (g && now.a && !prev.a) { if (selecting) toggleSelect(g.id); else location.href = playUrl({ cid: g.id }); }
        if (g && now.x && !prev.x) edit(g);
        if (g && now.y && !prev.y) toggleFavourite(g);
        padPrev.set(p.index, now);
    }
}, 80);

// ---------- carry the collection to another device: zips with games, covers, details and saves ----------
function openExport(which) {
    if (!games.length) return banner("There is nothing to export yet.", "warn");
    const dialog = $("exportDialog");
    const sizes = (list) => formatSize(list.reduce((n, g) => n + (g.size || 0), 0));
    const shown = shownGames();
    $("expAll").textContent = `All games (${games.length}, ${sizes(games)})`;
    $("expShown").textContent = `The games shown now (${shown.length}, ${sizes(shown)})`;
    $("expSelected").textContent = `The selected games (${selected.size}, ${sizes(pickedGames())})`;
    const radios = dialog.querySelectorAll('input[name="which"]');
    radios[2].disabled = !selected.size;
    radios[1].disabled = shown.length === games.length;
    for (const r of radios) r.checked = r.value === (which || "all");
    const total = games.reduce((n, g) => n + (g.size || 0), 0);
    // Phones get smaller parts: a whole part is held in memory while it is made
    $("exportSplit").value = total > (device.touch ? 262144000 : 1073741824) ? (device.touch ? "262144000" : "1073741824") : "0";
    const info = () => {
        const list = chosenForExport();
        const limit = Number($("exportSplit").value);
        $("exportInfo").textContent = `${list.length} games, ${sizes(list)}` + (limit ? ` · about ${Math.max(1, partsFor(list, limit).length)} part${partsFor(list, limit).length === 1 ? "" : "s"}` : "");
    };
    for (const r of radios) r.onchange = info;
    $("exportSplit").onchange = info;
    info();
    dialog.returnValue = "";
    dialog.showModal();
    dialog.addEventListener("close", () => { if (dialog.returnValue === "go") exportCollection(chosenForExport(), Number($("exportSplit").value), $("exportSaves").checked); }, { once: true });
}
function chosenForExport() {
    const which = ($("exportDialog").querySelector('input[name="which"]:checked') || {}).value || "all";
    return which === "selected" ? pickedGames() : which === "shown" ? shownGames() : games.slice();
}
function partsFor(list, limit) {
    if (!limit) return [list];
    const parts = [[]];
    let size = 0;
    for (const g of list) {
        if (size + (g.size || 0) > limit && parts[parts.length - 1].length) { parts.push([]); size = 0; }
        parts[parts.length - 1].push(g);
        size += g.size || 0;
    }
    return parts;
}
async function exportCollection(list, limit, withSaves) {
    if (!list.length) return banner("No games to export.", "warn");
    const button = $("exportCol");
    button.disabled = true;
    const parts = partsFor(list, limit);
    const stamp = new Date().toLocaleDateString("en-CA");
    let records = 0, saveRecords = 0, bytes = 0;
    try {
        const JSZip = (await import("./vendor/jszip.js")).default;
        for (let p = 0; p < parts.length; p++) {
            button.textContent = parts.length > 1 ? `Exporting part ${p + 1} of ${parts.length}…` : "Exporting…";
            const zip = new JSZip();
            const out = [];
            for (const g of parts[p]) {
                const data = await store.file(g.id);
                if (!data) continue;
                const path = "games/" + g.id.replace(/[^\w.-]+/g, "_").slice(0, 120) + "." + (extensionOf(g.name) || "bin");
                zip.file(path, data);
                let coverPath = null;
                if (g.hasCover) {
                    const c = await store.cover(g.id);
                    if (c) { coverPath = path.replace(/^games\//, "covers/") + ".jpg"; zip.file(coverPath, c); }
                }
                out.push(Object.assign({}, g, { path, coverPath }));
            }
            // Saves go in the first part only (they are small and cover every game)
            if (withSaves && p === 0) {
                const saves = await exportBackup();
                zip.file("saves.json", saves.blob);
                saveRecords = saves.records;
            }
            zip.file("collection.json", JSON.stringify({ format: FORMAT, version: 2, created: new Date().toISOString(), part: p + 1, parts: parts.length, games: out }, null, 1));
            zip.file("README.txt", "My Collection export from EmulatorJS.\r\nOpen My Collection on another device and choose Import to restore these games, their details and saves." + (parts.length > 1 ? `\r\nThis is part ${p + 1} of ${parts.length}: import all the parts (in one go or one by one).` : "") + "\r\n");
            const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
            const a = el("a");
            a.href = URL.createObjectURL(blob);
            a.download = `my-collection-${stamp}` + (parts.length > 1 ? `-part${p + 1}of${parts.length}` : "") + ".zip";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
            records += out.length;
            bytes += blob.size;
            // Give the browser a moment between downloads (some ask before saving several files)
            if (p < parts.length - 1) await new Promise((r) => setTimeout(r, 1200));
        }
        banner(`Exported ${records} games${withSaves ? ` and ${saveRecords} save records` : ""} in ${parts.length} file${parts.length === 1 ? "" : "s"} (${formatSize(bytes)}). Import ${parts.length === 1 ? "it" : "them"} in My Collection on your other device.`, "ok");
    } catch (e) {
        banner("Export failed: " + e.message + (/memory|allocation/i.test(e.message) ? " Choose smaller parts and try again." : ""), "error");
    } finally {
        button.disabled = false;
        button.textContent = "Export…";
    }
}
async function importCollection(files) {
    let count = 0, skippedSame = 0, saves = 0;
    const done = [];
    try {
        const current = await store.list();
        const JSZip = (await import("./vendor/jszip.js")).default;
        for (const [n, file] of files.entries()) {
            const zip = await JSZip.loadAsync(file);
            const meta = zip.file("collection.json");
            if (!meta) throw new Error(`${file.name} is not a My Collection export. To add games, use Add games instead.`);
            const data = JSON.parse(await meta.async("string"));
            if (data.format !== FORMAT) throw new Error(`${file.name} is not a My Collection export.`);
            const list = data.games || [];
            for (const [i, g] of list.entries()) {
                $("colSummary").textContent = `Importing ${files.length > 1 ? `file ${n + 1} of ${files.length}: ` : ""}${i + 1} of ${list.length} games…`;
                const entry = zip.file(g.path);
                if (!entry) continue;
                const existing = current.find((x) => x.id === store.idFor(g.name, g.size) || (g.sha1 && x.sha1 === g.sha1));
                if (existing && existing.size === g.size && (existing.lastPlayed || 0) >= (g.lastPlayed || 0) && (existing.playSeconds || 0) >= (g.playSeconds || 0)) { skippedSame++; continue; }
                const bytes = await entry.async("blob");
                const record = await store.add({ file: new File([bytes], g.name), name: g.name, system: g.system, core: g.core, title: g.title, added: g.added, lastPlayed: g.lastPlayed, favorite: g.favorite, playSeconds: g.playSeconds, sessions: g.sessions || 0, sha1: g.sha1 || undefined, shelves: g.shelves || [], status: g.status || "", notes: g.notes || "", source: g.source || "" });
                if (g.coverPath && zip.file(g.coverPath)) await store.setCover(record.id, await zip.file(g.coverPath).async("blob"), { custom: !!g.customCover, auto: false });
                count++;
            }
            const savesFile = zip.file("saves.json");
            if (savesFile) saves += await importBackup(new File([await savesFile.async("blob")], "saves.json"));
            if (data.parts > 1) done.push(`part ${data.part} of ${data.parts}`);
        }
        await refresh();
        showStorage();
        banner(`Imported ${count} games${skippedSame ? ` (${skippedSame} already here and up to date)` : ""} and ${saves} save records${done.length ? " from " + done.join(", ") : ""}.`, "ok");
    } catch (e) {
        await refresh().catch(() => {});
        banner("Import failed: " + e.message + (count ? ` (${count} games were imported before the problem)` : ""), "error");
    }
}

// ---------- engine ----------
function fillEngine() {
    const select = $("colEngine");
    select.textContent = "";
    for (const engine of Object.values(ENGINES)) select.add(new Option(engine.name, engine.id));
    select.value = getEngine() || "emulatorjs";
    select.addEventListener("change", () => setEngine(select.value, true));
}

// ---------- start ----------
async function main() {
    await loadManifest();
    available = SYSTEMS.filter(([id]) => isAvailable(id));
    if (!getEngine()) setEngine("emulatorjs");
    fillEngine();
    // iPhone and iPad cannot pick folders; dropping is not available on touch screens
    if (device.ios || typeof $("addFolder").webkitdirectory === "undefined") $("addFolderBtn").hidden = true;
    $("addRecent").hidden = !library.listRecent().length;
    $("addRecent").addEventListener("click", addRecent);
    $("addFiles").addEventListener("change", () => { review([...$("addFiles").files]); $("addFiles").value = ""; });
    $("addFolder").addEventListener("change", () => { review([...$("addFolder").files]); $("addFolder").value = ""; });
    $("importCol").addEventListener("change", () => { const f = [...$("importCol").files]; $("importCol").value = ""; if (f.length) importCollection(f); });
    $("exportCol").addEventListener("click", () => openExport(selected.size ? "selected" : "all"));
    $("colSearch").addEventListener("input", () => renderGrid());
    for (const [id, key] of [["colSort", "ejs-collection-sort"], ["colView", "ejs-collection-view"]]) {
        try { const v = localStorage.getItem(key); if (v && [...$(id).options].some((o) => o.value === v)) $(id).value = v; } catch (e) { /* default */ }
        $(id).addEventListener("change", () => {
            try { localStorage.setItem(key, $(id).value); } catch (e) { /* storage blocked */ }
            renderGrid();
        });
    }
    // Drag and drop files or whole folders anywhere on the page
    let depth = 0;
    window.addEventListener("dragenter", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) { depth++; $("dropCover").hidden = false; } });
    window.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) $("dropCover").hidden = true; });
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", async (e) => {
        e.preventDefault();
        depth = 0;
        $("dropCover").hidden = true;
        const files = e.dataTransfer.items && e.dataTransfer.items[0] && e.dataTransfer.items[0].webkitGetAsEntry ? await filesFromDrop(e.dataTransfer.items) : [...e.dataTransfer.files];
        review(files);
    });
    try {
        await refresh();
    } catch (e) {
        $("colSummary").textContent = "This browser does not allow storing games (private browsing can block it).";
    }
    showStorage();
    setupServiceWorker({ shouldReload: () => false }).catch(() => {});
    // Games added before this version have no SHA-1 yet: fill it in quietly, a few at a time
    for (const g of games.filter((x) => !x.sha1).slice(0, 50)) {
        const blob = await store.file(g.id).catch(() => null);
        const sha1 = blob ? await store.sha1Of(blob) : null;
        if (sha1) await store.update(g.id, { sha1 });
    }
}
main();
