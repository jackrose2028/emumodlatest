// Use case 8, Community spaces: a locked-down, low-power game launcher for schools, libraries, shelters, hospital
// wards and waiting rooms on old or donated devices. Staff choose the games, opening hours, quiet hours, a volume
// limit, turn length and break reminders; each visitor's turn ends by itself when they walk away, and their saves
// can be cleared for the next person. Works offline once prepared, or from an offline package (a zip with the site,
// the games, their cores and these settings, run with python serve.py).
//   Settings: localStorage "ejs-community" (or community.json next to this page, e.g. in an offline package).
//   Offline copies: Cache Storage "ejs-community-files" (served by sw.js).
import { $, banner, loadManifest, isAvailable, setupServiceWorker, coreFileFor, preferredCore, readOptions, coresFor, installedCores } from "./common.js";
import { labelFor } from "./detect.js";
import { loadCatalog } from "./catalog.js";
import * as collection from "./collection-store.js";
import { initDevice } from "./mobile.js";

initDevice();
const params = new URLSearchParams(location.search);
const KEY = "ejs-community";
const FILES = "ejs-community-files";
const DEFAULTS = {
    version: 1, name: "Games", welcome: "Pick a game. When you're done, press End my turn so the next person starts fresh.",
    games: [], hours: [], quietFrom: "", quietTo: "", quietVolume: 0.2, maxVolume: 0.6,
    turnMinutes: 0, breakMinutes: 30, idleMinutes: 4, clearSaves: true, lowPower: true, fullscreen: true, pinHash: null
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT = { nes: "NES", snes: "SNES", gb: "Game Boy", gba: "Game Boy Advance", segaMD: "Mega Drive", segaMS: "Master System", segaGG: "Game Gear", atari2600: "Atari 2600", n64: "Nintendo 64" };
const sys = (s) => SHORT[s] || labelFor(s);

let config = null;
let mode = "boot";
let catalog = [];
let current = null;      // { game, frame, started, startedAt, playedMs, paused, nextBreak, deadline }
let notice = null;
let lastActivity = Date.now();
let turns = 0;
const bootedAt = Date.now();

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}
const now = () => Date.now();
function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function show(id) {
    for (const s of ["cmHome", "cmClosed", "cmPlay", "cmBye", "cmSetup"]) $(s).hidden = s !== id;
    document.documentElement.classList.toggle("k-running", id !== "cmSetup");
}
async function hashPin(pin) {
    const text = "ejs-kiosk:" + pin;
    if (window.crypto && crypto.subtle) {
        const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return "sha256:" + [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0x811c9dc5;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
    return "fnv:" + h.toString(16);
}

// ---------- time rules ----------
const minutes = (hhmm) => { const [h, m] = String(hhmm || "").split(":").map(Number); return h * 60 + (m || 0); };
const fmtTime = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
function inRange(day, mins, row) {
    const from = minutes(row.from), to = row.to === "23:59" ? 1440 : minutes(row.to);
    if (from === to) return row.days.includes(day);
    if (from < to) return row.days.includes(day) && mins >= from && mins < to;
    // Overnight (e.g. 20:00 to 02:00): the evening belongs to the start day, the early hours to the day after
    return (row.days.includes(day) && mins >= from) || (row.days.includes((day + 6) % 7) && mins < to);
}
function openNow(d = new Date()) {
    const rows = (config.hours || []).filter((r) => r.days && r.days.length && r.from && r.to);
    if (!rows.length) return true;
    return rows.some((r) => inRange(d.getDay(), d.getHours() * 60 + d.getMinutes(), r));
}
function nextChange(d = new Date()) {
    // Steps through the next 8 days minute by minute until the open/closed state changes (cheap: at most 11,520 checks)
    const start = openNow(d);
    const t = new Date(d);
    t.setSeconds(0, 0);
    for (let i = 1; i <= 8 * 24 * 60; i++) {
        t.setMinutes(t.getMinutes() + 1);
        if (openNow(t) !== start) return new Date(t);
    }
    return null;
}
function quietNow(d = new Date()) {
    if (!config.quietFrom || !config.quietTo) return false;
    return inRange(d.getDay(), d.getHours() * 60 + d.getMinutes(), { days: [0, 1, 2, 3, 4, 5, 6], from: config.quietFrom, to: config.quietTo });
}
const volumeCap = () => Math.min(Number(config.maxVolume), quietNow() ? Number(config.quietVolume) : 1);
function whenText(t) {
    if (!t) return "";
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (t.toDateString() === today.toDateString()) return time;
    if (t.toDateString() === tomorrow.toDateString()) return "tomorrow at " + time;
    return t.toLocaleDateString([], { weekday: "long" }) + " at " + time;
}

// ---------- visitor screens ----------
let filter = "";
function home() {
    if (!openNow()) return closed();
    if (pendingReload) return reloadPage(pendingReload);
    mode = "home";
    show("cmHome");
    keepAwake(true);
    $("cmPlace").textContent = config.name || DEFAULTS.name;
    $("cmWelcome").textContent = config.welcome || "";
    const games = config.games.filter((g) => isAvailable(g.system));
    const systems = [...new Set(games.map((g) => g.system))];
    const chips = $("cmChips");
    chips.textContent = "";
    chips.hidden = systems.length < 2;
    for (const [v, label] of [["", "All games"], ...systems.map((s) => [s, sys(s)])]) {
        const b = el("button", "cm-chip" + (filter === v ? " on" : ""), label);
        b.type = "button";
        b.addEventListener("click", () => { filter = v; home(); });
        chips.appendChild(b);
    }
    const tiles = $("cmTiles");
    tiles.textContent = "";
    for (const g of games.filter((x) => !filter || x.system === filter)) {
        const li = el("li");
        const b = el("button", "k-tile cm-tile");
        b.type = "button";
        const pic = el("span", "k-tile-pic");
        if (g.image) pic.style.backgroundImage = `url("${g.image}")`;
        pic.dataset.system = sys(g.system);
        const text = el("span", "k-tile-text");
        text.appendChild(el("strong", null, g.title));
        text.appendChild(el("span", null, g.caption || sys(g.system)));
        b.append(pic, text);
        b.addEventListener("click", () => startTurn(g));
        li.appendChild(b);
        tiles.appendChild(li);
    }
    if (!games.length) tiles.appendChild(el("li", "cm-empty", "No games are set up yet. Staff: press Staff below."));
    updateClock();
}
function closed() {
    mode = "closed";
    show("cmClosed");
    $("cmClosedPlace").textContent = config.name || DEFAULTS.name;
    const next = nextChange();
    $("cmNextOpen").textContent = next ? "They open again " + whenText(next) + "." : "";
    // Closed: the screen may sleep, which saves power on old devices
    keepAwake(false);
}
function updateClock() {
    const d = new Date();
    $("cmClock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const rows = (config.hours || []).filter((r) => r.days && r.days.length);
    const next = rows.length ? nextChange(d) : null;
    $("cmHours").textContent = rows.length ? (next ? "Open until " + whenText(next) : "Open") : "";
    $("cmNote").textContent = quietNow() ? "Quiet hours: the sound is turned down." : "";
}

// ---------- a turn ----------
function freshFrame() {
    const old = $("cmFrame");
    const frame = document.createElement("iframe");
    frame.id = "cmFrame";
    frame.title = "Game";
    frame.setAttribute("allow", old.getAttribute("allow"));
    old.replaceWith(frame);
    return frame;
}
function frameSrc(g) {
    const q = new URLSearchParams({ kiosk: "1", engine: "emulatorjs", volume: String(volumeCap()) });
    if (config.lowPower) q.set("lowpower", "1");
    if (g.cid) q.set("cid", g.cid);
    else { q.set("url", g.url); q.set("core", g.core || g.system); }
    return "play.html?" + q.toString();
}
function startTurn(g) {
    goFullscreen();
    mode = "play";
    show("cmPlay");
    hideNotice();
    $("cmGameTitle").textContent = g.title;
    $("cmLoading").hidden = false;
    $("cmLoadingTitle").textContent = g.title;
    $("cmTime").hidden = true;
    const frame = freshFrame();
    current = { game: g, frame, started: false, startedAt: 0, playedMs: 0, paused: false, nextBreak: 0, deadline: now() + 90000 };
    lastActivity = now();
    frame.src = frameSrc(g);
    frame.addEventListener("load", () => { try { frame.contentWindow.focus(); } catch (e) { /* not ready */ } });
}
const emu = () => { try { return current && current.frame.contentWindow.EJS_emulator; } catch (e) { return null; } };
function played() {
    if (!current || !current.started) return 0;
    return current.playedMs + (current.paused ? 0 : now() - current.startedAt);
}
function pause() {
    const E = emu();
    if (!current || !current.started || current.paused) return;
    current.playedMs += now() - current.startedAt;
    current.paused = true;
    if (E && !E.paused) E.pause();
}
function resume() {
    const E = emu();
    if (!current || !current.started || !current.paused) return;
    current.paused = false;
    current.startedAt = now();
    if (E && E.paused) E.play();
    try { current.frame.contentWindow.focus(); } catch (e) { /* frame gone */ }
}
async function endTurn(reason) {
    if (!current && mode !== "play") return;
    const frame = current ? current.frame : null;
    current = null;
    hideNotice();
    if (frame) { try { frame.src = "about:blank"; } catch (e) { /* gone */ } freshFrame(); }
    turns++;
    mode = "bye";
    show("cmBye");
    $("cmByeText").textContent = (reason ? reason + " " : "") + (config.clearSaves ? "Clearing the saves for the next person…" : "");
    if (config.clearSaves) {
        await clearSaves();
        $("cmByeText").textContent = (reason ? reason + " " : "") + "The saves are cleared for the next person.";
    }
    setTimeout(() => {
        if (mode !== "bye") return;
        if (turns >= 50) return reloadPage("after 50 turns");
        home();
    }, 3000);
}
function deleteDb(name) {
    return new Promise((resolve) => {
        try {
            const r = indexedDB.deleteDatabase(name);
            r.onsuccess = r.onerror = () => resolve();
            r.onblocked = () => setTimeout(resolve, 1500);
        } catch (e) { resolve(); }
    });
}
async function clearSaves() {
    // Save states (and their pictures) and in-game saves; the games and cores stay
    await new Promise((r) => setTimeout(r, 300));
    await Promise.all(["EmulatorJS-states", "/data/saves"].map(deleteDb));
}

// ---------- notices ----------
function showNotice(kind, title, text, seconds, done, go, end) {
    notice = { kind, ends: seconds ? now() + seconds * 1000 : 0, done };
    $("cmNotice").hidden = false;
    $("cmNotice").dataset.kind = kind;
    $("cmNoticeTitle").textContent = title;
    $("cmNoticeText").textContent = text;
    $("cmNoticeGo").hidden = !go;
    $("cmNoticeGo").textContent = go || "";
    $("cmNoticeEnd").hidden = !end;
    $("cmNoticeCount").textContent = "";
    $("cmNoticeGo").focus();
}
function hideNotice() { notice = null; $("cmNotice").hidden = true; }
$("cmNoticeGo").addEventListener("click", () => { hideNotice(); lastActivity = now(); resume(); });
$("cmNoticeEnd").addEventListener("click", () => endTurn(""));
$("cmEnd").addEventListener("click", () => endTurn(""));
$("cmSave").addEventListener("click", () => {
    const E = emu();
    if (!E) return;
    try { E.gameManager.quickSave("1"); E.frontend.displayMessage("SAVED"); } catch (e) { /* not supported */ }
    try { current.frame.contentWindow.focus(); } catch (e) { /* gone */ }
});
$("cmLoad").addEventListener("click", () => {
    const E = emu();
    if (!E) return;
    try { E.gameManager.quickLoad("1"); } catch (e) { /* none */ }
    try { current.frame.contentWindow.focus(); } catch (e) { /* gone */ }
});

// ---------- the clock ----------
let lastMinute = -1;
function tick() {
    const t = now();
    if (notice && notice.ends) {
        const left = Math.ceil((notice.ends - t) / 1000);
        $("cmNoticeCount").textContent = left > 0 ? String(left) : "";
        if (left <= 0) { const done = notice.done; hideNotice(); if (done) done(); }
    }
    const minute = new Date().getMinutes();
    if (minute !== lastMinute) {
        lastMinute = minute;
        if (mode === "home") { if (!openNow()) closed(); else updateClock(); }
        else if (mode === "closed") {
            if (openNow()) home();
            else if (t - bootedAt > 6 * 3600000) reloadPage("daily restart while closed");
        }
    }
    if (mode !== "play" || !current) return;
    const E = emu();
    if (!current.started) {
        if (t > current.deadline && !notice) showNotice("error", "Sorry, this game won't start", "Please choose another one.", 6, () => endTurn(""));
        return;
    }
    // Volume: never above the limit (or the quiet-hours limit), whatever the visitor does
    if (E && typeof E.volume === "number" && E.volume > volumeCap() + 0.001) {
        try { E.setVolume(volumeCap()); } catch (e) { /* no audio */ }
    }
    const playedMs = played();
    const limit = Number(config.turnMinutes) * 60000;
    if (limit > 0) {
        const left = limit - playedMs;
        $("cmTime").hidden = false;
        $("cmTime").textContent = Math.max(0, Math.ceil(left / 60000)) + " min left";
        $("cmTime").classList.toggle("warn", left <= 60000);
        if (left <= 0 && !notice) { pause(); showNotice("timeup", "Time's up!", "Thanks for playing. It's the next person's turn.", 10, () => endTurn("")); }
    }
    if (!openNow() && !notice) { pause(); showNotice("closing", "Closing time", "The games are closing now. Thanks for playing!", 30, () => endTurn("")); }
    const brk = Number(config.breakMinutes) * 60000;
    if (brk > 0 && !notice && playedMs >= current.nextBreak + brk) {
        current.nextBreak = playedMs;
        pause();
        showNotice("break", "Time for a short break?", "Look away from the screen, stretch, have a drink of water. Your game waits for you.", 0, null, "Keep playing", true);
    }
    const idle = Math.max(1, Number(config.idleMinutes)) * 60000;
    if (t - lastActivity > idle && (!notice || notice.kind === "break")) {
        pause();
        showNotice("idle", "Are you still playing?", "Touch the screen or press a button to carry on. Otherwise the turn ends.", 30, () => endTurn("The turn ended because nobody was playing."), "Keep playing");
    }
}
setInterval(tick, 1000);
function activity() {
    lastActivity = now();
    if (notice && notice.kind === "idle") { hideNotice(); resume(); }
}
window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.source !== "ejs-kiosk-frame" || !current || e.source !== current.frame.contentWindow) return;
    const t = e.data.type;
    if (t === "activity") activity();
    else if (t === "started" && !current.started) {
        current.started = true;
        current.startedAt = now();
        lastActivity = now();
        $("cmLoading").hidden = true;
        try { const E = emu(); if (E) E.setVolume(Math.min(E.volume, volumeCap())); } catch (err) { /* no audio */ }
    } else if (t === "error" && !current.started && !notice) showNotice("error", "Sorry, this game won't start", "Please choose another one.", 6, () => endTurn(""));
    else if (t === "exit") endTurn("");
    else if (t === "staff") openPin();
});
window.addEventListener("pointerdown", (e) => { if (mode === "play" && !e.target.closest("#cmPin")) activity(); goFullscreen(); }, true);
window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) { e.preventDefault(); openPin(); return; }
    if (mode === "play") activity();
});

// ---------- staff PIN ----------
let pinEntry = "", pinWrong = 0, pinLocked = 0, pinTimer = null, pinPaused = false;
function openPin() {
    if (mode === "setup") return;
    if (!config.pinHash) return openSetup();
    pinEntry = "";
    $("cmPin").hidden = false;
    $("cmPinMsg").textContent = "";
    renderPin();
    $("cmPinPad").firstChild.focus();
    if (mode === "play" && current && current.started && !current.paused) { pause(); pinPaused = true; }
    clearTimeout(pinTimer);
    pinTimer = setTimeout(closePin, 20000);
}
function closePin() {
    clearTimeout(pinTimer);
    $("cmPin").hidden = true;
    if (pinPaused) { pinPaused = false; resume(); }
}
function renderPin() { $("cmPinShow").textContent = pinEntry ? "●".repeat(pinEntry.length) : "Enter the PIN"; }
async function pinKey(k) {
    clearTimeout(pinTimer);
    pinTimer = setTimeout(closePin, 20000);
    if (now() < pinLocked) { $("cmPinMsg").textContent = "Too many wrong PINs. Wait a minute."; return; }
    if (k === "cancel") return closePin();
    if (k === "back") pinEntry = pinEntry.slice(0, -1);
    else if (k === "ok") {
        if ((await hashPin(pinEntry)) === config.pinHash) {
            pinWrong = 0;
            pinPaused = false;
            $("cmPin").hidden = true;
            clearTimeout(pinTimer);
            return openSetup();
        }
        pinEntry = "";
        $("cmPinMsg").textContent = "Wrong PIN.";
        if (++pinWrong >= 5) { pinWrong = 0; pinLocked = now() + 60000; }
    } else if (pinEntry.length < 8) pinEntry += k;
    renderPin();
}
{
    const pad = $("cmPinPad");
    for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"]) {
        const b = el("button", "k-pin-key" + (k === "ok" ? " primary" : ""), k === "back" ? "⌫" : k === "ok" ? "OK" : k);
        b.type = "button";
        b.addEventListener("click", () => pinKey(k));
        pad.appendChild(b);
    }
    const c = el("button", "k-pin-cancel", "Cancel");
    c.type = "button";
    c.addEventListener("click", () => pinKey("cancel"));
    pad.after(c);
    $("cmPin").addEventListener("keydown", (e) => {
        const map = { Backspace: "back", Enter: "ok", Escape: "cancel" };
        const k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
        if (!k) return;
        e.preventDefault();
        e.stopPropagation();
        pinKey(k);
    });
}
$("cmStaff").addEventListener("click", openPin);
$("cmStaff2").addEventListener("click", openPin);

// ---------- staff settings ----------
let selected = new Map();
let hoursRows = [];
async function openSetup() {
    if (current) { const f = current.frame; current = null; try { f.src = "about:blank"; } catch (e) { /* gone */ } freshFrame(); hideNotice(); }
    mode = "setup";
    show("cmSetup");
    keepAwake(false);
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* not in full screen */ }
    $("cmName").value = config.name;
    $("cmWelcomeIn").value = config.welcome;
    $("cmQuietFrom").value = config.quietFrom || "";
    $("cmQuietTo").value = config.quietTo || "";
    $("cmQuietVol").value = Math.round(config.quietVolume * 100);
    $("cmMaxVol").value = Math.round(config.maxVolume * 100);
    $("cmTurn").value = config.turnMinutes;
    $("cmBreak").value = config.breakMinutes;
    $("cmIdle").value = config.idleMinutes;
    $("cmClear").checked = !!config.clearSaves;
    $("cmLowPower").checked = !!config.lowPower;
    $("cmFull").checked = !!config.fullscreen;
    $("cmPin1").value = $("cmPin2").value = "";
    $("cmPinNote").textContent = config.pinHash ? "A PIN is set. Leave these empty to keep it." : "Choose the PIN staff will use to reach these settings (the Staff button, or Ctrl+Shift+K). It is required.";
    hoursRows = clone(config.hours || []);
    renderHours();
    selected = new Map(config.games.map((g) => [g.id, Object.assign({}, g)]));
    renderStatus();
    $("cmGames").textContent = "Looking for games…";
    catalog = await loadCatalog();
    renderGames();
}
const clone = (o) => JSON.parse(JSON.stringify(o));
function renderStatus() {
    const box = $("cmStatus");
    box.textContent = "";
    box.appendChild(el("h2", null, "This device"));
    const dl = el("dl", "hb-facts");
    const fact = (k, v) => { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); };
    const off = readJSON(KEY + "-offline");
    fact("Games", config.games.length ? config.games.length + " chosen" : "none yet");
    fact("Right now", openNow() ? "open" + (quietNow() ? " (quiet hours)" : "") : "closed");
    fact("Turns since start", String(turns));
    fact("Network", navigator.onLine ? "online" : "offline");
    fact("Offline copy", off ? `${off.files - off.failed} of ${off.files} files, ${new Date(off.at).toLocaleString()}` : "not prepared yet");
    fact("Installed as an app", window.matchMedia("(display-mode: standalone)").matches ? "yes" : "no");
    box.appendChild(dl);
}
function renderHours() {
    const host = $("cmHoursRows");
    host.textContent = "";
    hoursRows.forEach((row, i) => {
        const r = el("div", "cm-hours-row");
        const days = el("div", "cf-row");
        [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
            const l = el("label", "cf-chip");
            const c = el("input");
            c.type = "checkbox";
            c.checked = row.days.includes(d);
            c.addEventListener("change", () => { row.days = c.checked ? [...row.days, d] : row.days.filter((x) => x !== d); });
            l.append(c, document.createTextNode(" " + DAYS[d]));
            days.appendChild(l);
        });
        const from = el("input");
        from.type = "time";
        from.value = row.from;
        from.setAttribute("aria-label", "Opens at");
        from.addEventListener("change", () => { row.from = from.value; });
        const to = el("input");
        to.type = "time";
        to.value = row.to;
        to.setAttribute("aria-label", "Closes at");
        to.addEventListener("change", () => { row.to = to.value; });
        const del = el("button", "", "Remove");
        del.type = "button";
        del.addEventListener("click", () => { hoursRows.splice(i, 1); renderHours(); });
        const times = el("div", "cm-hours-times");
        times.append(el("span", null, "from"), from, el("span", null, "to"), to, del);
        r.append(days, times);
        host.appendChild(r);
    });
}
$("cmAddHours").addEventListener("click", () => { hoursRows.push({ days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" }); renderHours(); });
function renderGames() {
    const host = $("cmGames");
    host.textContent = "";
    const find = $("cmFind").value.toLowerCase().trim();
    const all = catalog.slice();
    for (const g of selected.values()) if (!all.some((c) => c.id === g.id)) all.push(Object.assign({ source: "From imported settings" }, g));
    if (!all.length) { host.appendChild(el("p", "muted", "No games found.")); return; }
    let last = null;
    for (const g of all) {
        if (find && !(g.title + " " + g.source + " " + sys(g.system)).toLowerCase().includes(find)) continue;
        if (g.source !== last) { host.appendChild(el("h3", "k-source", g.source)); last = g.source; }
        const row = el("div", "k-game-row");
        const label = el("label", "k-game-pick");
        const box = el("input");
        box.type = "checkbox";
        box.checked = selected.has(g.id);
        const name = el("span");
        name.appendChild(el("strong", null, g.title));
        name.appendChild(el("span", "small muted", " · " + sys(g.system)));
        label.append(box, name);
        box.addEventListener("change", () => { if (box.checked) selected.set(g.id, Object.assign({}, g)); else selected.delete(g.id); });
        row.appendChild(label);
        host.appendChild(row);
    }
}
$("cmFind").addEventListener("input", renderGames);
$("cmAll").addEventListener("click", () => { for (const b of $("cmGames").querySelectorAll("input:not(:checked)")) { b.checked = true; b.dispatchEvent(new Event("change")); } });
$("cmNone").addEventListener("click", () => { selected.clear(); renderGames(); });
async function collect() {
    const p1 = $("cmPin1").value.trim(), p2 = $("cmPin2").value.trim();
    if (p1 || p2) {
        if (!/^\d{4,8}$/.test(p1)) throw new Error("The PIN must be 4 to 8 digits.");
        if (p1 !== p2) throw new Error("The two PINs are not the same.");
    }
    const order = new Map(catalog.map((g, i) => [g.id, i]));
    const games = [...selected.values()].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9))
        .map((g) => ({ id: g.id, title: g.title, caption: g.caption || "", system: g.system, core: g.core || null, url: g.url || null, cid: g.cid || null, image: g.image || null }));
    const num = (id, min, max, d) => { const v = Number($(id).value); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d; };
    for (const r of hoursRows) if (!r.days.length || !r.from || !r.to) throw new Error("Each opening-hours row needs at least one day and both times.");
    return Object.assign({}, config, {
        name: $("cmName").value.trim() || DEFAULTS.name,
        welcome: $("cmWelcomeIn").value.trim(),
        games, hours: clone(hoursRows),
        quietFrom: $("cmQuietFrom").value, quietTo: $("cmQuietTo").value, quietVolume: num("cmQuietVol", 0, 100, 20) / 100,
        maxVolume: num("cmMaxVol", 0, 100, 60) / 100,
        turnMinutes: num("cmTurn", 0, 240, 0), breakMinutes: num("cmBreak", 0, 240, 30), idleMinutes: num("cmIdle", 1, 60, 4),
        clearSaves: $("cmClear").checked, lowPower: $("cmLowPower").checked, fullscreen: $("cmFull").checked,
        pinHash: p1 ? await hashPin(p1) : config.pinHash
    });
}
$("cmStart").addEventListener("click", async () => {
    try {
        const next = await collect();
        if (!next.games.length) throw new Error("Tick at least one game.");
        if (!next.pinHash) throw new Error("Choose a staff PIN first.");
        config = next;
        if (!writeJSON(KEY, config)) throw new Error("This browser would not save the settings.");
        $("cmSetupMsg").textContent = "";
        if (navigator.onLine) prepare().catch(() => {});
        if (config.clearSaves) await clearSaves();
        home();
    } catch (e) { $("cmSetupMsg").textContent = e.message; }
});
$("cmClearNow").addEventListener("click", async () => { await clearSaves(); $("cmSetupMsg").textContent = "All saves are cleared."; });
$("cmForget").addEventListener("click", async () => {
    if (!confirm("Remove the community settings, PIN and offline copies from this device?")) return;
    try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + "-offline"); await caches.delete(FILES); } catch (e) { /* blocked */ }
    location.href = "index.html";
});
$("cmExport").addEventListener("click", async () => {
    try { download("community.json", JSON.stringify(await collect(), null, 2), "application/json"); } catch (e) { $("cmSetupMsg").textContent = e.message; }
});
$("cmImport").addEventListener("change", async () => {
    const f = $("cmImport").files[0];
    $("cmImport").value = "";
    if (!f) return;
    try {
        const data = JSON.parse(await f.text());
        if (!data || !Array.isArray(data.games)) throw new Error("This is not a community settings file.");
        config = Object.assign({}, DEFAULTS, data, { pinHash: config.pinHash || data.pinHash || null });
        await openSetup();
        banner("Settings imported. Check them, then press Open the games.", "ok");
    } catch (e) { $("cmSetupMsg").textContent = "Import failed: " + e.message; }
});
function download(name, data, type) {
    const a = el("a");
    a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// ---------- offline: this device, and a package for another one ----------
function coreFor(g) { return g.core || preferredCore(g.system) || installedCores(g.system)[0] || coresFor(g.system)[0]; }
async function prepare(report = () => {}) {
    if (!("caches" in window)) throw new Error("This browser has no offline storage.");
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const cache = await caches.open(FILES);
    const list = [];
    for (const g of config.games) {
        if (g.url) list.push(new URL(g.url, location.href).href);
        if (g.image) list.push(new URL(g.image, location.href).href);
        const c = coreFileFor(g.system, "emulatorjs", readOptions(), coreFor(g));
        if (c) list.push(new URL(c, location.href).href);
    }
    const unique = [...new Set(list)];
    let failed = 0;
    for (let i = 0; i < unique.length; i++) {
        report(`Downloading ${i + 1} of ${unique.length}…`);
        try { if (!(await cache.match(unique[i]))) { const r = await fetch(unique[i], { cache: "no-cache" }); if (!r.ok) throw new Error(); await cache.put(unique[i], r); } } catch (e) { failed++; }
    }
    for (const req of await cache.keys()) if (!unique.includes(req.url)) await cache.delete(req);
    const res = { at: new Date().toISOString(), files: unique.length, failed };
    writeJSON(KEY + "-offline", res);
    report(failed ? `${unique.length - failed} of ${unique.length} files ready; ${failed} could not be downloaded.` : `Ready offline: ${unique.length} files (games, pictures and cores).`);
    return res;
}
$("cmPrepare").addEventListener("click", async () => {
    try {
        const next = await collect();
        if (!next.games.length) throw new Error("Tick at least one game first.");
        config.games = next.games;
        await prepare((t) => { $("cmOfflineMsg").textContent = t; });
        renderStatus();
    } catch (e) { $("cmOfflineMsg").textContent = e.message; }
});
// Files the player needs beyond the service worker's list of site files
const ENGINE_FILES = ["sw.js", "serve.py", "LICENSE", "data/version.json", "data/src/license.js", "data/src/netplay.js", "data/src/vendor/socket.io.min.js",
    "data/compression/extract7z.js", "data/compression/extractzip.js", "data/compression/libunrar.js", "data/compression/libunrar.wasm",
    ...["ar", "bn", "de", "el", "en", "es", "fa", "fr", "hi", "it", "ja", "jv", "km", "ko", "pt", "retroarch", "ro", "ru", "tr", "ua", "ur", "vi", "zh"].map((l) => `data/localization/${l}.json`)];
const START_BAT = '@echo off\r\ntitle Community games\r\ncd /d "%~dp0"\r\nset PORT=8000\r\nset PY=\r\nwhere python >nul 2>nul && set PY=python\r\nif not defined PY where py >nul 2>nul && set PY=py\r\nif not defined PY (\r\n  echo Python 3 is needed: https://www.python.org/downloads/ (tick "Add python.exe to PATH").\r\n  pause\r\n  exit /b 1\r\n)\r\nstart "" "http://localhost:%PORT%/community.html"\r\n%PY% serve.py %PORT%\r\n';
const START_SH = '#!/bin/sh\n# Community games: serves this folder and opens the launcher. Needs Python 3.\ncd "$(dirname "$0")"\nPORT=8000\n( sleep 2; (xdg-open "http://localhost:$PORT/community.html" || open "http://localhost:$PORT/community.html") >/dev/null 2>&1 ) &\nexec python3 serve.py $PORT\n';
const README = "Community games: offline package\r\n\r\n1. Unzip this folder onto the laptop (or a USB stick).\r\n2. Windows: double-click START-COMMUNITY.bat. Mac or Linux: run start-community.sh.\r\n   Python 3 must be installed (python.org). No internet is needed.\r\n3. The browser opens the game launcher with the settings in community.json.\r\n   Staff settings: the Staff button, or Ctrl+Shift+K, and the PIN chosen when the package was made.\r\n\r\nTip: in Chrome or Edge, use the browser menu to Install the page as an app, and set it to open at start-up.\r\nThe games and their cores are included; everything runs from these files.\r\n";
$("cmPackage").addEventListener("click", async () => {
    const msg = (t) => { $("cmOfflineMsg").textContent = t; };
    try {
        const cfg = await collect();
        if (!cfg.games.length) throw new Error("Tick at least one game first.");
        if (!cfg.pinHash) throw new Error("Choose a staff PIN first; the package keeps it.");
        msg("Collecting the site files…");
        const JSZip = (await import("./vendor/jszip.js")).default;
        const zip = new JSZip();
        const sw = await (await fetch("sw.js", { cache: "no-cache" })).text();
        const shell = [...(sw.match(/SHELL_FILES = \[([\s\S]*?)\];/) || ["", ""])[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "./");
        const files = new Map();   // path in zip -> url
        for (const f of [...shell, ...ENGINE_FILES]) files.set(f, f);
        // Each game's file, picture and core (both graphics builds, so the package runs on old and new devices)
        const manifest = await (await fetch("data/cores/manifest.json")).json();
        const packaged = clone(cfg);
        for (const g of packaged.games) {
            if (g.image) files.set(g.image.split("?")[0], g.image);
            if (g.url) files.set(decodeURIComponent(g.url.split("?")[0]), g.url);
            const core = coreFor(g);
            for (const name of Object.keys(manifest.files || {})) {
                if (name === core + "-wasm.7z" || name === core + "-legacy-wasm.7z") files.set("data/cores/" + name, "data/cores/" + name);
            }
        }
        let n = 0;
        for (const [path, url] of files) {
            msg(`Adding ${++n} of ${files.size + packaged.games.filter((g) => g.cid).length}: ${path}`);
            try { const r = await fetch(url); if (r.ok) zip.file(path, await r.blob(), { binary: true }); } catch (e) { /* optional file */ }
        }
        // Games from My Collection on this device are copied into the package as files
        for (const g of packaged.games) {
            if (!g.cid) continue;
            const rec = await collection.get(g.cid).catch(() => null);
            const blob = rec && await collection.file(g.cid).catch(() => null);
            if (!blob) continue;
            const path = "community-games/" + rec.name.replace(/[^\w.-]+/g, "_");
            zip.file(path, blob, { binary: true });
            g.url = path;
            g.cid = null;
        }
        zip.file("community.json", JSON.stringify(packaged, null, 2));
        zip.file("START-COMMUNITY.bat", START_BAT);
        zip.file("start-community.sh", START_SH, { unixPermissions: "755" });
        zip.file("README-OFFLINE.txt", README);
        msg("Packing…");
        const blob = await zip.generateAsync({ type: "blob", compression: "STORE", platform: "UNIX" });
        download(`community-games-${new Date().toLocaleDateString("en-CA")}.zip`, blob);
        msg(`Package ready: ${packaged.games.length} games, ${(blob.size / 1048576).toFixed(1)} MB.`);
    } catch (e) { msg("The package could not be made: " + e.message); }
});

// ---------- device ----------
function goFullscreen() {
    if (!config || !config.fullscreen || document.fullscreenElement || mode === "setup" || mode === "boot") return;
    const root = document.documentElement;
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) try { const p = req.call(root, { navigationUI: "hide" }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* needs a touch */ }
}
let wakeLock = null;
async function keepAwake(on) {
    try {
        if (!on) { if (wakeLock) { await wakeLock.release(); wakeLock = null; } return; }
        if ("wakeLock" in navigator && !wakeLock && document.visibilityState === "visible") {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => { wakeLock = null; });
        }
    } catch (e) { /* not allowed */ }
}
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && (mode === "home" || mode === "play")) keepAwake(true);
    if (document.hidden && mode === "play") pause();
});
history.pushState({ c: 1 }, "");
window.addEventListener("popstate", () => { if (mode !== "setup") history.pushState({ c: 1 }, ""); });
window.addEventListener("contextmenu", (e) => { if (mode !== "setup") e.preventDefault(); });
let pendingReload = null;
function reloadPage(reason) {
    try { sessionStorage.setItem("ejs-community-reload", reason); } catch (e) { /* blocked */ }
    location.reload();
}

async function main() {
    await loadManifest();
    let c = readJSON(KEY);
    if (!c) {
        try { const r = await fetch("community.json", { cache: "no-cache" }); if (r.ok) { c = await r.json(); writeJSON(KEY, c); } } catch (e) { /* none */ }
    }
    config = Object.assign({}, DEFAULTS, c || {});
    setupServiceWorker({ shouldReload: () => mode !== "play", onUpdate: () => { pendingReload = "site update"; } }).catch(() => {});
    if (config.games.length && config.pinHash && params.get("setup") !== "1") {
        home();
        if (navigator.onLine) prepare().catch(() => {});
    } else if (config.pinHash) { home(); openPin(); } else openSetup();
}
main().catch((e) => { console.error(e); setTimeout(() => location.reload(), 30000); });
