// Use case 9, Events and speedrun practice.
//   Practice: a game split into segments, each with a save point; practise one again and again with a timer that
//             counts the console's own frames, and see every attempt against the best.
//   Full run: splits for every segment, personal best, best segments (golds) and sum of best.
//   Race:     two copies of the game side by side from the same save point, a countdown, two timers; player 1 on
//             W A S D or controller 1, player 2 on the arrow keys or controller 2.
//   Share:    a save point as a link (practice.html?game=…#sp=…, the state compressed into the address) or a file.
// Data: localStorage "ejs-practice" (segments, attempts, runs, races per game); IndexedDB "EJS-practice" (save points).
import { $, banner, loadManifest, isAvailable, setupServiceWorker } from "./common.js";
import { labelFor } from "./detect.js";
import { loadCatalog } from "./catalog.js";
import { initDevice } from "./mobile.js";

initDevice();
const params = new URLSearchParams(location.search);
const STORE = "ejs-practice";
// Frames per second of each console (NTSC), so frame counts become exact times
const FPS = { nes: 60.0988, snes: 60.0988, gb: 59.7275, gbc: 59.7275, gba: 59.7275, segaMD: 59.9228, segaMS: 59.9228, segaGG: 59.9228, atari2600: 59.9227, n64: 60, psx: 59.94, pce: 59.826 };
const fps = () => (game && FPS[game.system]) || 60;

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}
function fmt(ms, signed) {
    if (ms === null || ms === undefined || !isFinite(ms)) return "–";
    const neg = ms < 0;
    let t = Math.abs(ms) / 1000;
    const m = Math.floor(t / 60);
    t -= m * 60;
    const s = (m ? String(Math.floor(t)).padStart(2, "0") : String(Math.floor(t))) + "." + String(Math.floor((t % 1) * 100)).padStart(2, "0");
    return (signed ? (neg ? "−" : "+") : neg ? "−" : "") + (m ? m + ":" : "") + s;
}
const status = (t) => { $("prStatus").textContent = t; };
const uid = () => Math.random().toString(36).slice(2, 9);

// ---------- storage ----------
function readAll() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; } }
function data() {
    const all = readAll();
    const d = (all.games || {})[game.id] || {};
    return Object.assign({ segments: [], attempts: {}, runs: [], races: [] }, d);
}
function saveData(d) {
    const all = readAll();
    all.games = all.games || {};
    all.games[game.id] = d;
    try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) { banner("Could not save: the browser's storage is full.", "warn"); }
}
let dbp = null;
function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
        const r = indexedDB.open("EJS-practice", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("states");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
    return dbp;
}
async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
        const t = d.transaction("states", mode);
        const req = fn(t.objectStore("states"));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
    });
}
const stateKey = (segId) => game.id + "|" + segId;
const putState = (segId, bytes) => idb("readwrite", (s) => s.put(bytes, stateKey(segId)));
const getState = (segId) => idb("readonly", (s) => s.get(stateKey(segId)));
const delState = (segId) => idb("readwrite", (s) => s.delete(stateKey(segId)));

// ---------- the games (one, or two in a race) ----------
let catalog = [];
let game = null;
let mode = "practice";
const players = [];   // { stage, frame, win, emu, fns, original, timer, finished, name }
function stageFor(i) {
    let stage = $("prStages").querySelector(`[data-player="${i}"]`);
    if (!stage) {
        stage = $("prStages").firstElementChild.cloneNode(true);
        stage.dataset.player = String(i);
        $("prStages").appendChild(stage);
    }
    return stage;
}
function frameSrc() {
    const q = new URLSearchParams({ embed: "1", engine: "emulatorjs" });
    if (game.cid) q.set("cid", game.cid);
    else { q.set("url", game.url); q.set("core", game.core || game.system); }
    return "play.html?" + q.toString();
}
async function loadInto(i) {
    const stage = stageFor(i);
    stage.hidden = false;
    const old = stage.querySelector("iframe");
    const frame = document.createElement("iframe");
    frame.className = "pr-frame";
    frame.title = i ? "Game, player 2" : "Game";
    frame.setAttribute("allow", old.getAttribute("allow"));
    old.replaceWith(frame);
    const wait = stage.querySelector(".pr-wait");
    wait.hidden = false;
    wait.textContent = "Starting " + game.title + "…";
    const p = players[i] = { stage, frame, win: null, emu: null, timer: { running: false, base: 0, ms: 0 }, finished: null, name: "" };
    frame.src = frameSrc();
    const ok = await new Promise((resolve) => {
        const t0 = Date.now();
        const tick = setInterval(() => {
            if (stage.querySelector("iframe") !== frame) { clearInterval(tick); return resolve(false); }
            const E = frame.contentWindow && frame.contentWindow.EJS_emulator;
            if (E && E.started) { clearInterval(tick); resolve(true); }
            else if ((E && E.failedToStart) || Date.now() - t0 > 90000) { clearInterval(tick); resolve(false); }
        }, 250);
    });
    if (!ok) { wait.textContent = game.title + " could not start."; return null; }
    wait.hidden = true;
    p.win = frame.contentWindow;
    p.emu = p.win.EJS_emulator;
    hookPlayer(p, i);
    return p;
}
async function loadGame(id) {
    const g = catalog.find((c) => c.id === id);
    if (!g) return;
    game = g;
    $("prGame").value = g.id;
    const url = new URL(location.href);
    url.searchParams.set("game", g.id);
    history.replaceState(null, "", url.pathname + url.search + location.hash);
    for (const p of players.splice(1)) if (p) p.stage.remove();
    selected = null;
    run = null;
    renderPanels();
    const p = await loadInto(0);
    if (!p) return;
    const shared = await takeSharedPoint();
    renderPanels();
    if (mode === "race") prepareRace();
    if (!shared) status(`${g.title} is ready.`);
}
// Input: in a race the page sends each player's keys and controller to their own game; their own input is ignored
function hookPlayer(p, i) {
    p.fns = p.emu.gameManager.functions;
    p.original = p.fns.simulateInput;
    p.fns.simulateInput = (player, index, value) => {
        if (mode === "race" && !p.injecting) return;
        return p.original(player, index, value);
    };
    p.send = (index, down) => { p.injecting = true; try { p.fns.simulateInput(0, index, down ? 1 : 0); } finally { p.injecting = false; } };
    // In a race, keys that land in a game (it had the keyboard before) go to the race controls like the page's own
    p.win.addEventListener("keyup", (e) => { if (mode === "race") raceKey(e); }, true);
    p.win.addEventListener("keydown", (e) => {
        if (mode === "race") return raceKey(e);
        if (e.repeat) return;
        const action = { ".": split, "'": again, ";": skip }[e.key];
        if (!action) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        action();
    }, true);
    applyRaceInput(p);
}
function applyRaceInput(p) {
    const race = mode === "race";
    p.frame.style.pointerEvents = race ? "none" : "";
    p.frame.tabIndex = race ? -1 : 0;
    // A race shows just the two games: the players' menus and bars are hidden
    try {
        const doc = p.win && p.win.document;
        if (!doc) return;
        let st = doc.getElementById("pr-race-style");
        if (!st) { st = doc.createElement("style"); st.id = "pr-race-style"; doc.head.appendChild(st); }
        st.textContent = race ? ".ejs_context_menu, .ejs_menu_bar, .ejs_virtualGamepad_parent { display: none !important; }" : "";
    } catch (e) { /* frame gone */ }
}
const focusGame = () => { try { if (mode !== "race" && players[0]) players[0].win.focus(); } catch (e) { /* gone */ } };

// ---------- timers (frames) ----------
const frameOf = (p) => { try { return p.emu.gameManager.getFrameNum(); } catch (e) { return 0; } };
function startTimer(p) { p.timer = { running: true, base: frameOf(p), ms: 0 }; p.finished = null; }
function elapsed(p) { return p.timer.running ? (frameOf(p) - p.timer.base) / fps() * 1000 : p.timer.ms; }
function stopTimer(p) { p.timer.ms = elapsed(p); p.timer.running = false; return p.timer.ms; }
function drawTimers() {
    for (const [i, p] of players.entries()) {
        if (!p) continue;
        const box = p.stage.querySelector(".pr-timer");
        box.querySelector(".pr-time").textContent = fmt(elapsed(p));
        box.classList.toggle("running", p.timer.running);
        box.querySelector(".pr-who").textContent = mode === "race" ? (raceNames[i] || "Player " + (i + 1)) : "";
        if (mode === "practice") {
            const seg = currentSegment();
            box.querySelector(".pr-seg").textContent = seg ? seg.name : "";
            box.querySelector(".pr-delta").textContent = "";
        } else if (mode === "run" && run) {
            const segs = data().segments;
            box.querySelector(".pr-seg").textContent = run.index < segs.length ? segs[run.index].name : "Finished";
            const pb = personalBest();
            const live = pb && run.index < segs.length && pb.splits[run.index] ? elapsed(p) - pb.splits[run.index] : null;
            const d = box.querySelector(".pr-delta");
            // The live delta shows once the run is behind the PB split, as speedrun timers do
            d.textContent = live !== null && live > 0 ? fmt(live, true) : run.lastDelta !== undefined ? fmt(run.lastDelta, true) : "";
            d.className = "pr-delta " + ((live !== null && live > 0) || run.lastDelta > 0 ? "behind" : "ahead");
        } else if (mode === "race") {
            box.querySelector(".pr-delta").textContent = "";
            box.querySelector(".pr-seg").textContent = p.finished !== null ? (p.place === 1 ? "🏆 First!" : "Finished") : "";
        }
    }
    requestAnimationFrame(drawTimers);
}
requestAnimationFrame(drawTimers);

// ---------- segments and practice ----------
let selected = null;
let autoAgain = true;
const currentSegment = () => data().segments.find((s) => s.id === selected) || null;
async function loadPoint(p, seg) {
    if (!p || !p.emu) return false;
    const state = seg && seg.hasState ? await getState(seg.id).catch(() => null) : null;
    if (state) p.emu.gameManager.loadState(state instanceof Uint8Array ? state : new Uint8Array(state));
    else p.emu.gameManager.restart();
    if (p.emu.paused) p.emu.play();
    return !!state;
}
async function practise(id) {
    selected = id;
    if (mode !== "practice") setMode("practice");
    const p = players[0];
    const seg = currentSegment();
    if (!p || !seg) return;
    const had = await loadPoint(p, seg);
    startTimer(p);
    status(`${seg.name}: ${had ? "from its save point" : "from the start of the game (no save point yet)"}. Press Split (.) at the end of the segment.`);
    renderPractice();
    focusGame();
}
async function setPoint(id) {
    const p = players[0];
    if (!p) return;
    const state = p.emu.gameManager.getState();
    await putState(id, state);
    const d = data();
    const seg = d.segments.find((s) => s.id === id);
    seg.hasState = true;
    seg.stateBytes = state.length;
    saveData(d);
    status(`Save point set for ${seg.name} (${(state.length / 1024).toFixed(1)} KB).`);
    renderPanels();
    focusGame();
}
function split() {
    const p = players[0];
    if (!p) return;
    if (mode === "practice") {
        const seg = currentSegment();
        if (!seg || !p.timer.running) return status("Press Practise on a segment first.");
        const ms = stopTimer(p);
        const d = data();
        const list = d.attempts[seg.id] = d.attempts[seg.id] || [];
        const best = list.length ? Math.min(...list.map((a) => a.ms)) : null;
        list.push({ ms, at: new Date().toISOString() });
        if (list.length > 500) list.splice(0, list.length - 500);
        saveData(d);
        status(`${seg.name}: ${fmt(ms)}${best !== null ? ` (${fmt(ms - best, true)} against your best${ms < best ? ": new best!" : ""})` : " (first attempt)"}.`);
        renderPractice();
        if (autoAgain) setTimeout(() => { if (mode === "practice" && selected === seg.id && !p.timer.running) practise(seg.id); }, 1500);
    } else if (mode === "run") {
        if (!run) return startRun();
        const segs = data().segments;
        if (run.index >= segs.length) return;
        const t = elapsed(p);
        const pb = personalBest();
        run.lastDelta = pb && pb.splits[run.index] ? t - pb.splits[run.index] : undefined;
        run.splits.push(t);
        run.index++;
        if (run.index >= segs.length) finishRun(true);
        renderRun();
    }
}
function skip() {
    if (mode !== "run" || !run) return;
    const segs = data().segments;
    if (run.index >= segs.length) return;
    run.splits.push(null);
    run.index++;
    run.lastDelta = undefined;
    if (run.index >= segs.length) finishRun(true);
    renderRun();
}
function undo() {
    if (mode === "run" && run && run.splits.length) {
        if (run.done) { run.done = false; players[0].timer.running = true; const d = data(); d.runs.pop(); saveData(d); }
        run.splits.pop();
        run.index--;
        run.lastDelta = undefined;
        renderRun();
    } else if (mode === "practice") {
        const seg = currentSegment();
        const d = data();
        if (seg && d.attempts[seg.id] && d.attempts[seg.id].length) { d.attempts[seg.id].pop(); saveData(d); renderPractice(); status("Last attempt removed."); }
    }
}
function again() {
    if (mode === "practice") { if (selected) practise(selected); }
    else if (mode === "run") { if (run && !run.done && run.splits.length) finishRun(false); startRun(); }
    else if (mode === "race") startRace();
}

// ---------- full runs ----------
let run = null;   // { splits: [cumulative ms or null], index, done }
function personalBest() {
    const d = data();
    const n = d.segments.length;
    const complete = d.runs.filter((r) => r.complete && r.splits.length === n && r.splits[n - 1] !== null);
    if (!complete.length) return null;
    return complete.reduce((a, b) => (b.splits[n - 1] < a.splits[n - 1] ? b : a));
}
function segmentTimes(splits) {
    const out = [];
    let prev = 0;
    for (const s of splits) {
        if (s === null) { out.push(null); prev = null; continue; }
        out.push(prev === null ? null : s - prev);
        prev = s;
    }
    return out;
}
function golds() {
    const d = data();
    return d.segments.map((seg, i) => {
        const times = [];
        for (const r of d.runs) { const t = segmentTimes(r.splits)[i]; if (t !== null && t !== undefined) times.push(t); }
        for (const a of d.attempts[seg.id] || []) times.push(a.ms);
        return times.length ? Math.min(...times) : null;
    });
}
async function startRun() {
    const segs = data().segments;
    if (!segs.length) return status("Add segments first (in Practice).");
    const p = players[0];
    if (!p) return;
    run = { splits: [], index: 0, done: false };
    await loadPoint(p, segs[0]);
    startTimer(p);
    status("Run started. Split (.) at the end of each segment.");
    renderRun();
    focusGame();
}
function finishRun(complete) {
    const p = players[0];
    const total = stopTimer(p);
    const d = data();
    const pb = personalBest();
    d.runs.push({ at: new Date().toISOString(), splits: run.splits.slice(), complete, total });
    if (d.runs.length > 200) d.runs.splice(0, d.runs.length - 200);
    saveData(d);
    run.done = true;
    const n = d.segments.length;
    if (complete && run.splits[n - 1] !== null) status(pb ? (total < pb.splits[n - 1] ? `New personal best: ${fmt(total)} (${fmt(total - pb.splits[n - 1], true)})!` : `Run finished: ${fmt(total)} (${fmt(total - pb.splits[n - 1], true)} against your best).`) : `First complete run: ${fmt(total)}.`);
    else status("Run reset.");
}

// ---------- races ----------
let raceNames = ["Player 1", "Player 2"];
let raceSeg = "";
let raceMute = true;
let raceOn = false;
async function prepareRace() {
    if (!game) return;
    if (!players[0]) await loadInto(0);
    if (!players[1]) { status("Starting the second game…"); await loadInto(1); }
    for (const p of players) if (p) { applyRaceInput(p); p.emu.pause(); }
    if (players[1]) players[1].emu.setVolume(raceMute ? 0 : players[0].emu.volume);
    status("Both games are ready. Press Start race.");
}
async function startRace() {
    if (!players[0] || !players[1]) await prepareRace();
    if (!players[1]) return;
    const seg = data().segments.find((s) => s.id === raceSeg) || null;
    for (const p of players) { await loadPoint(p, seg); p.emu.pause(); p.timer = { running: false, base: 0, ms: 0 }; p.finished = null; p.place = 0; }
    for (const p of players) for (let i = 0; i < 16; i++) p.original(0, i, 0);
    const cd = $("prCountdown");
    cd.hidden = false;
    for (const n of ["3", "2", "1"]) { cd.textContent = n; await new Promise((r) => setTimeout(r, 800)); }
    cd.textContent = "GO!";
    for (const p of players) { p.emu.play(); startTimer(p); }
    raceOn = true;
    setTimeout(() => { cd.hidden = true; }, 600);
    status(`Race on${seg ? " from " + seg.name : ""}! Player 1 finishes with Q, player 2 with P (or the Finish buttons).`);
}
function finish(i) {
    const p = players[i];
    if (!raceOn || !p || p.finished !== null || !p.timer.running) return;
    p.finished = stopTimer(p);
    p.emu.pause();
    p.place = players.filter((x) => x && x.finished !== null).length;
    if (players.every((x) => x && x.finished !== null)) {
        raceOn = false;
        const d = data();
        const seg = d.segments.find((s) => s.id === raceSeg);
        const [a, b] = players.map((x) => x.finished);
        d.races.push({ at: new Date().toISOString(), segment: seg ? seg.name : "Start of game", p1: raceNames[0], p2: raceNames[1], p1ms: a, p2ms: b, winner: a <= b ? raceNames[0] : raceNames[1] });
        saveData(d);
        status(`${a <= b ? raceNames[0] : raceNames[1]} wins by ${fmt(Math.abs(a - b))}.`);
        renderRace();
    }
}
// Keyboard and controllers for the race (the page has the keyboard; the games can't be clicked into)
const RACE_KEYS = [
    { KeyW: 4, KeyS: 5, KeyA: 6, KeyD: 7, KeyF: 8, KeyG: 0, KeyT: 3, KeyR: 2, KeyQ: "finish" },
    { ArrowUp: 4, ArrowDown: 5, ArrowLeft: 6, ArrowRight: 7, KeyL: 8, KeyK: 0, KeyO: 3, KeyI: 2, KeyP: "finish" }
];
function raceKey(e) {
    if (mode !== "race" || (e.target.closest && e.target.closest("input, select, textarea"))) return;
    const down = e.type === "keydown";
    for (const [i, map] of RACE_KEYS.entries()) {
        const target = map[e.code];
        if (target === undefined) continue;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        const p = players[i];
        if (target === "finish") { if (down) finish(i); }
        else if (p && raceOn) p.send(target, down);
        return;
    }
}
window.addEventListener("keydown", raceKey);
window.addEventListener("keyup", raceKey);
// Standard controller layout to RetroPad: bottom B, right A, left Y, top X, shoulders, Select, Start, d-pad
const PAD_MAP = { 0: 0, 1: 8, 2: 1, 3: 9, 4: 10, 5: 11, 8: 2, 9: 3, 12: 4, 13: 5, 14: 6, 15: 7 };
const padPrev = [new Map(), new Map()];
setInterval(() => {
    if (mode !== "race" || !navigator.getGamepads) return;
    const pads = [...navigator.getGamepads()].filter(Boolean).slice(0, 2);
    pads.forEach((pad, i) => {
        const p = players[i];
        if (!p) return;
        const prev = padPrev[i];
        const state = new Map();
        for (const [b, idx] of Object.entries(PAD_MAP)) state.set(idx, !!(pad.buttons[b] && pad.buttons[b].pressed));
        const x = pad.axes[0] || 0, y = pad.axes[1] || 0;
        if (x < -0.5) state.set(6, true); if (x > 0.5) state.set(7, true);
        if (y < -0.5) state.set(4, true); if (y > 0.5) state.set(5, true);
        for (const [idx, on] of state) if (on !== !!prev.get(idx) && raceOn) p.send(idx, on);
        // The controller's 'home' button (16), or Select + Start together, finishes
        if ((pad.buttons[16] && pad.buttons[16].pressed) || (state.get(2) && state.get(3))) finish(i);
        padPrev[i] = state;
    });
}, 16);

// ---------- sharing save points ----------
async function compress(bytes) {
    const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
}
async function decompress(bytes) {
    const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
}
function b64url(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(t) {
    const s = atob(t.replace(/-/g, "+").replace(/_/g, "/"));
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
}
const MAX_LINK = 60000;
async function share(id) {
    const seg = data().segments.find((s) => s.id === id);
    const state = seg && await getState(id).catch(() => null);
    if (!state) return status("Set a save point for this segment first.");
    const packed = b64url(await compress(new Uint8Array(state)));
    if (packed.length > MAX_LINK) {
        downloadPoint(seg, state);
        return status(`This save point is too big for a link (${Math.round(packed.length / 1024)} KB); it was saved as a file to share instead.`);
    }
    const url = new URL("practice.html", location.href);
    url.searchParams.set("game", game.id);
    url.searchParams.set("seg", seg.name);
    url.hash = "sp=" + packed;
    const link = url.href;
    try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: `${game.title}: ${seg.name}`, url: link });
        else { await navigator.clipboard.writeText(link); status(`Link copied (${Math.round(link.length / 1024)} KB). Anyone with the link opens ${game.title} at this save point.`); }
    } catch (e) { prompt("Copy this link:", link); }
}
function downloadPoint(seg, state) {
    const file = { format: "ejs-practice-point-1", game: game.id, title: game.title, segment: seg.name, state: b64url(new Uint8Array(state)) };
    download(`${game.title} - ${seg.name}.savepoint.json`.replace(/[\\/:*?"<>|]+/g, "_"), JSON.stringify(file), "application/json");
}
async function addPoint(name, bytes) {
    const d = data();
    const seg = { id: uid(), name: name || "Shared save point", hasState: true, stateBytes: bytes.length };
    d.segments.push(seg);
    saveData(d);
    await putState(seg.id, bytes);
    selected = seg.id;
    return seg;
}
async function takeSharedPoint() {
    const m = location.hash.match(/sp=([\w-]+)/);
    if (!m) return false;
    try {
        const bytes = await decompress(fromB64url(m[1]));
        const seg = await addPoint(params.get("seg") ? "Shared: " + params.get("seg") : "Shared save point", bytes);
        history.replaceState(null, "", location.pathname + location.search);
        status(`Added the shared save point "${seg.name}". Press Practise to play from it.`);
    } catch (e) { status("The shared save point in this link could not be read."); }
    return true;
}
function download(name, text, type) {
    const a = el("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- panels ----------
function setMode(m) {
    mode = m;
    for (const b of document.querySelectorAll(".pr-modes button")) { b.classList.toggle("on", b.dataset.mode === m); b.setAttribute("aria-selected", String(b.dataset.mode === m)); }
    $("prPracticePanel").hidden = m !== "practice";
    $("prRunPanel").hidden = m !== "run";
    $("prRacePanel").hidden = m !== "race";
    $("prStages").classList.toggle("race", m === "race");
    for (const [i, p] of players.entries()) if (p) { applyRaceInput(p); if (i > 0) p.stage.hidden = m !== "race"; }
    for (const id of ["prSplit", "prUndo", "prSkip"]) $(id).hidden = m === "race";
    $("prAgain").textContent = m === "race" ? "Start race" : m === "run" ? "Reset run" : "Again";
    $("prKeys").innerHTML = m === "race" ? "Player 1: <kbd>W A S D</kbd> move, <kbd>F</kbd> = A, <kbd>G</kbd> = B, <kbd>T</kbd> = Start, <kbd>R</kbd> = Select, <kbd>Q</kbd> = finish · Player 2: arrows move, <kbd>L</kbd> = A, <kbd>K</kbd> = B, <kbd>O</kbd> = Start, <kbd>I</kbd> = Select, <kbd>P</kbd> = finish · Controllers 1 and 2 work too (Select + Start = finish)." : "In the game: <kbd>.</kbd> split · <kbd>'</kbd> again · <kbd>;</kbd> skip. The timer counts the console's own frames, so it is exact and stops while the game is paused.";
    if (m !== "race") { for (const p of players.slice(1)) if (p) p.emu.pause(); raceOn = false; if (players[0]) players[0].emu.play(); }
    if (m === "race") prepareRace();
    renderPanels();
}
for (const b of document.querySelectorAll(".pr-modes button")) b.addEventListener("click", () => setMode(b.dataset.mode));
function renderPanels() { renderPractice(); renderRun(); renderRace(); }
function button(label, fn, cls) {
    const b = el("button", cls || "", label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
}
function renderPractice() {
    const host = $("prPracticePanel");
    host.textContent = "";
    if (!game) { host.appendChild(el("p", "muted", "Load a game to start.")); return; }
    const d = data();
    host.appendChild(el("h2", null, "Segments"));
    host.appendChild(el("p", "small muted", "Play to where a segment starts, press Set start here, then Practise it as often as you like. Split (.) at its end records the attempt."));
    const list = el("ol", "pr-segs");
    const gold = golds();
    d.segments.forEach((seg, i) => {
        const li = el("li", "pr-seg-row" + (seg.id === selected ? " on" : ""));
        const name = el("input");
        name.value = seg.name;
        name.setAttribute("aria-label", "Segment name");
        name.addEventListener("change", () => { const dd = data(); dd.segments[i].name = name.value.trim() || seg.name; saveData(dd); renderPanels(); });
        const info = el("span", "small muted", `${seg.hasState ? "save point ✓" : "no save point"} · best ${fmt(gold[i])} · ${(d.attempts[seg.id] || []).length} tries`);
        const tools = el("div", "pr-seg-tools");
        tools.append(
            button("Practise", () => practise(seg.id), "primary"),
            button("Set start here", () => setPoint(seg.id)),
            button("Share", () => share(seg.id)),
            button("↑", () => { if (!i) return; const dd = data(); [dd.segments[i - 1], dd.segments[i]] = [dd.segments[i], dd.segments[i - 1]]; saveData(dd); renderPanels(); }),
            button("Delete", async () => { if (!confirm(`Delete ${seg.name} and its attempts?`)) return; const dd = data(); dd.segments.splice(i, 1); delete dd.attempts[seg.id]; saveData(dd); await delState(seg.id).catch(() => {}); if (selected === seg.id) selected = null; renderPanels(); })
        );
        li.append(name, info, tools);
        list.appendChild(li);
    });
    host.appendChild(list);
    const row = el("div", "buttons");
    row.append(
        button("Add segment", () => { const dd = data(); const seg = { id: uid(), name: "Segment " + (dd.segments.length + 1), hasState: false }; dd.segments.push(seg); saveData(dd); selected = seg.id; renderPanels(); }),
        (() => { const l = el("label", "button"); l.textContent = "Open a save point file"; const f = el("input"); f.type = "file"; f.accept = ".json"; f.hidden = true; l.appendChild(f); f.addEventListener("change", async () => { const file = f.files[0]; f.value = ""; if (!file) return; try { const j = JSON.parse(await file.text()); if (j.format !== "ejs-practice-point-1") throw new Error(); if (j.game !== game.id) banner(`This save point is for ${j.title}; it may not work with ${game.title}.`, "warn"); await addPoint(j.segment, fromB64url(j.state)); renderPanels(); status(`Added "${j.segment}".`); } catch (e) { status("That file is not a save point."); } }); return l; })()
    );
    host.appendChild(row);
    const auto = el("label", "cf-check");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = autoAgain;
    cb.addEventListener("change", () => { autoAgain = cb.checked; });
    auto.append(cb, document.createTextNode(" Start again automatically after each split"));
    host.appendChild(auto);
    const seg = currentSegment();
    if (seg) {
        const tries = d.attempts[seg.id] || [];
        host.appendChild(el("h3", null, `${seg.name}: your attempts`));
        if (!tries.length) host.appendChild(el("p", "muted small", "No attempts yet."));
        else {
            const best = Math.min(...tries.map((a) => a.ms));
            const last5 = tries.slice(-5).map((a) => a.ms);
            const first5 = tries.slice(0, 5).map((a) => a.ms);
            const avg = (l) => l.reduce((a, b) => a + b, 0) / l.length;
            const stats = el("div", "cls-stats");
            for (const [k, v] of [["Attempts", String(tries.length)], ["Best", fmt(best)], ["Last", fmt(tries[tries.length - 1].ms)], ["Average of last 5", fmt(avg(last5))], ["Improvement", tries.length >= 6 ? fmt(avg(last5) - avg(first5), true) + " vs first 5" : "after 6 tries"]]) {
                const s = el("div", "cls-stat");
                s.append(el("span", null, k), el("strong", null, v));
                stats.appendChild(s);
            }
            host.appendChild(stats);
            const c = el("canvas", "pr-chart");
            c.width = 600;
            c.height = 140;
            drawChart(c, tries.slice(-40).map((a) => a.ms), best);
            host.appendChild(c);
            const ol = el("ol", "pr-tries");
            ol.reversed = true;
            ol.start = tries.length;
            for (const a of tries.slice(-10).reverse()) {
                const li = el("li", a.ms === best ? "gold" : "");
                li.textContent = `${fmt(a.ms)}  ${a.ms === best ? "★ best" : fmt(a.ms - best, true)}`;
                ol.appendChild(li);
            }
            host.appendChild(ol);
        }
    }
    const ex = el("div", "buttons pr-export");
    ex.append(button("Export results (JSON)", exportJson), button("Export results (CSV)", exportCsv));
    host.appendChild(ex);
}
function drawChart(c, list, best) {
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, c.width, c.height);
    if (!list.length) return;
    const max = Math.max(...list) * 1.05, min = Math.min(...list) * 0.95;
    const y = (v) => c.height - 10 - (v - min) / (max - min || 1) * (c.height - 20);
    const w = c.width / Math.max(list.length, 10);
    list.forEach((v, i) => {
        ctx.fillStyle = v === best ? "#f8c84b" : "#1aafff";
        ctx.fillRect(i * w + 2, y(v), w - 4, c.height - y(v));
    });
    ctx.strokeStyle = "#f8c84b";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y(best));
    ctx.lineTo(c.width, y(best));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#c9d3dd";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("best " + fmt(best), 6, Math.max(12, y(best) - 4));
}
function renderRun() {
    const host = $("prRunPanel");
    host.textContent = "";
    if (!game) return;
    const d = data();
    const segs = d.segments;
    host.appendChild(el("h2", null, "Full run"));
    if (!segs.length) { host.appendChild(el("p", "muted", "Add segments in Practice first; the run splits on each one in order.")); return; }
    host.appendChild(button(run && !run.done ? "Reset run" : "Start run", () => again(), "primary"));
    const pb = personalBest();
    const gold = golds();
    const t = el("table", "hb-controls cls-table pr-splits");
    const h = t.createTHead().insertRow();
    for (const x of ["Segment", "Best split", "This run", "+/−", "Segment"]) h.appendChild(el("th", null, x));
    const b = t.createTBody();
    const cur = run ? segmentTimes(run.splits) : [];
    segs.forEach((seg, i) => {
        const r = b.insertRow();
        if (run && run.index === i && !run.done) r.className = "now";
        r.insertCell().textContent = seg.name;
        r.insertCell().textContent = pb ? fmt(pb.splits[i]) : "–";
        const mine = run && run.splits[i] !== undefined ? run.splits[i] : undefined;
        r.insertCell().textContent = mine === undefined ? "" : mine === null ? "skipped" : fmt(mine);
        const delta = r.insertCell();
        if (mine && pb && pb.splits[i]) { delta.textContent = fmt(mine - pb.splits[i], true); delta.className = mine <= pb.splits[i] ? "ahead" : "behind"; }
        const segCell = r.insertCell();
        if (cur[i] !== undefined && cur[i] !== null) { segCell.textContent = fmt(cur[i]) + (gold[i] !== null && cur[i] <= gold[i] + 0.5 ? " ★" : ""); if (gold[i] !== null && cur[i] <= gold[i] + 0.5) segCell.className = "gold"; }
    });
    host.appendChild(t);
    const sob = gold.every((g) => g !== null) ? gold.reduce((a, g) => a + g, 0) : null;
    const stats = el("div", "cls-stats");
    for (const [k, v] of [["Personal best", pb ? fmt(pb.splits[segs.length - 1]) : "–"], ["Sum of best segments", fmt(sob)], ["Possible time save", pb && sob !== null ? fmt(pb.splits[segs.length - 1] - sob) : "–"], ["Runs", `${d.runs.filter((r) => r.complete).length} finished, ${d.runs.filter((r) => !r.complete).length} reset`]]) {
        const s = el("div", "cls-stat");
        s.append(el("span", null, k), el("strong", null, v));
        stats.appendChild(s);
    }
    host.appendChild(stats);
    host.appendChild(el("p", "small muted", "★ marks a best segment (gold). Ahead in green, behind in red, against your personal best."));
}
function renderRace() {
    const host = $("prRacePanel");
    host.textContent = "";
    if (!game) return;
    const d = data();
    host.appendChild(el("h2", null, "Race"));
    host.appendChild(el("p", "small muted", "Two copies of the game on one screen, from the same save point. 3, 2, 1, go: first to finish wins."));
    const form = el("div", "k-form");
    for (const i of [0, 1]) {
        const l = el("label", null, `Player ${i + 1} name `);
        const inp = el("input");
        inp.type = "text";
        inp.value = raceNames[i];
        inp.maxLength = 24;
        inp.addEventListener("change", () => { raceNames[i] = inp.value.trim() || "Player " + (i + 1); });
        l.appendChild(inp);
        form.appendChild(l);
    }
    const sl = el("label", null, "Start from ");
    const sel = el("select");
    sel.add(new Option("The start of the game", ""));
    for (const s of d.segments.filter((x) => x.hasState)) sel.add(new Option(s.name, s.id));
    sel.value = raceSeg;
    sel.addEventListener("change", () => { raceSeg = sel.value; });
    sl.appendChild(sel);
    form.appendChild(sl);
    host.appendChild(form);
    const mute = el("label", "cf-check");
    const mc = el("input");
    mc.type = "checkbox";
    mc.checked = raceMute;
    mc.addEventListener("change", () => { raceMute = mc.checked; if (players[1]) players[1].emu.setVolume(raceMute ? 0 : players[0].emu.volume); });
    mute.append(mc, document.createTextNode(" Mute player 2's game (two soundtracks at once are confusing)"));
    host.appendChild(mute);
    const row = el("div", "buttons");
    row.append(button("Start race", startRace, "primary"), button("Player 1 finished", () => finish(0)), button("Player 2 finished", () => finish(1)));
    host.appendChild(row);
    if (d.races.length) {
        host.appendChild(el("h3", null, "Results"));
        const t = el("table", "hb-controls cls-table");
        const h = t.createTHead().insertRow();
        for (const x of ["When", "From", "Player 1", "Player 2", "Winner"]) h.appendChild(el("th", null, x));
        const b = t.createTBody();
        for (const r of d.races.slice(-10).reverse()) {
            const tr = b.insertRow();
            for (const v of [new Date(r.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }), r.segment, `${r.p1} ${fmt(r.p1ms)}`, `${r.p2} ${fmt(r.p2ms)}`, `${r.winner} (by ${fmt(Math.abs(r.p1ms - r.p2ms))})`]) tr.insertCell().textContent = v;
        }
        host.appendChild(t);
    }
    const ex = el("div", "buttons pr-export");
    ex.append(button("Export results (JSON)", exportJson), button("Export results (CSV)", exportCsv));
    host.appendChild(ex);
}

// ---------- export ----------
function exportJson() {
    const d = data();
    download(`${game.title} practice ${new Date().toLocaleDateString("en-CA")}.json`.replace(/[\\/:*?"<>|]+/g, "_"), JSON.stringify({ format: "ejs-practice-1", game: game.id, title: game.title, fps: fps(), segments: d.segments.map((s) => ({ name: s.name, savePoint: !!s.hasState })), attempts: Object.fromEntries(d.segments.map((s) => [s.name, (d.attempts[s.id] || [])])), runs: d.runs, races: d.races, personalBest: personalBest(), golds: golds() }, null, 2), "application/json");
}
function exportCsv() {
    const d = data();
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["type", "when", "segment or run", "time_ms", "time", "details"].join(",")];
    for (const s of d.segments) for (const a of d.attempts[s.id] || []) lines.push(["attempt", a.at, s.name, Math.round(a.ms), fmt(a.ms), ""].map(q).join(","));
    for (const r of d.runs) lines.push(["run", r.at, r.complete ? "complete" : "reset", Math.round(r.total), fmt(r.total), r.splits.map((x) => (x === null ? "skip" : fmt(x))).join(" | ")].map(q).join(","));
    for (const r of d.races) lines.push(["race", r.at, r.segment, Math.round(Math.min(r.p1ms, r.p2ms)), fmt(Math.min(r.p1ms, r.p2ms)), `${r.p1} ${fmt(r.p1ms)} vs ${r.p2} ${fmt(r.p2ms)}; winner ${r.winner}`].map(q).join(","));
    download(`${game.title} practice ${new Date().toLocaleDateString("en-CA")}.csv`.replace(/[\\/:*?"<>|]+/g, "_"), "﻿" + lines.join("\r\n") + "\r\n", "text/csv");
}

// ---------- buttons ----------
$("prSplit").addEventListener("click", () => { split(); focusGame(); });
$("prAgain").addEventListener("click", () => again());
$("prUndo").addEventListener("click", () => { undo(); focusGame(); });
$("prSkip").addEventListener("click", () => { skip(); focusGame(); });
$("prPause").addEventListener("click", () => {
    const live = players.filter(Boolean);
    if (!live.length) return;
    const pause = !live[0].emu.paused;
    for (const p of live) if (pause) p.emu.pause(); else p.emu.play();
    $("prPause").innerHTML = pause ? "&#9654; Play" : "&#10073;&#10073; Pause";
    focusGame();
});
$("prLoad").addEventListener("click", () => loadGame($("prGame").value));

async function main() {
    await loadManifest();
    catalog = (await loadCatalog()).filter((g) => isAvailable(g.system));
    const select = $("prGame");
    let group = null, last = null;
    for (const g of catalog) {
        if (g.source !== last) { group = document.createElement("optgroup"); group.label = g.source; select.appendChild(group); last = g.source; }
        group.appendChild(new Option(`${g.title} (${labelFor(g.system)})`, g.id));
    }
    const wanted = params.get("game") || "hb:sprite-lab";
    if (catalog.some((g) => g.id === wanted)) select.value = wanted;
    renderPanels();
    setupServiceWorker({ shouldReload: () => !players[0] }).catch(() => {});
    if (params.get("game") && catalog.some((g) => g.id === wanted)) loadGame(wanted);
}
main();
