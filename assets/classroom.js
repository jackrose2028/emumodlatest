// Use case 4, Classroom: how retro games work.
// The game runs in a frame (play.html?embed=1&frame=1&analyser=1, same origin), and this page reads the running
// emulator directly: the picture (kept between frames for pausing and stepping), the frame counter, every button
// press (through the emulator's input function) and the sound output (an AnalyserNode). For NES games it also
// reads the console's own memory from a save state taken in memory 4 times a second: the palette RAM, the sprite
// list (OAM), the background maps (nametables), the scroll registers, the sound registers and the 2 KB of RAM.
// The cartridge file gives the tile drawings (pattern tables) and the cartridge sizes.
// Second pass: a presenter that walks through a lesson step by step with timers, saved moments (IndexedDB
// "EJS-classroom"), a byte finder, watched bytes and changing a byte (written into a save state and loaded back),
// tile bit planes, how long each button was held, pictures saved as PNG, exit-ticket quizzes and a copy-link button.
import { $, banner, loadManifest, isAvailable, setupServiceWorker } from "./common.js";
import { labelFor } from "./detect.js";
import { loadCatalog } from "./catalog.js";
import * as collection from "./collection-store.js";
import { initDevice } from "./mobile.js";
import { LESSONS } from "./lessons.js";

initDevice();
const params = new URLSearchParams(location.search);

// A standard NES palette (2C02 PPU); real televisions varied a little.
const NES_RGB = [
    0x7C7C7C, 0x0000FC, 0x0000BC, 0x4428BC, 0x940084, 0xA80020, 0xA81000, 0x881400, 0x503000, 0x007800, 0x006800, 0x005800, 0x004058, 0x000000, 0x000000, 0x000000,
    0xBCBCBC, 0x0078F8, 0x0058F8, 0x6844FC, 0xD800CC, 0xE40058, 0xF83800, 0xE45C10, 0xAC7C00, 0x00B800, 0x00A800, 0x00A844, 0x008888, 0x000000, 0x000000, 0x000000,
    0xF8F8F8, 0x3CBCFC, 0x6888FC, 0x9878F8, 0xF878F8, 0xF85898, 0xF87858, 0xFCA044, 0xF8B800, 0xB8F818, 0x58D854, 0x58F898, 0x00E8D8, 0x787878, 0x000000, 0x000000,
    0xFCFCFC, 0xA4E4FC, 0xB8B8F8, 0xD8B8F8, 0xF8B8F8, 0xF8A4C0, 0xF0D0B0, 0xFCE0A8, 0xF8D878, 0xD8F878, 0xB8F8B8, 0xB8F8D8, 0x00FCFC, 0xF8D8F8, 0x000000, 0x000000
];
const hex2 = (n) => "$" + n.toString(16).toUpperCase().padStart(2, "0");
const hex4 = (n) => "$" + n.toString(16).toUpperCase().padStart(4, "0");
const rgbHex = (v) => "#" + v.toString(16).padStart(6, "0");
const CPU_HZ = 1789773;
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
function noteName(f) {
    if (!(f > 20 && f < 20000)) return "";
    const n = Math.round(12 * Math.log2(f / 440) + 69);
    return NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
}
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

// ---------- the running game ----------
let catalog = [];
let game = null;          // catalog entry
let win = null;           // the frame's window
let emu = null;           // EJS_emulator once started
let rom = null;           // { bytes, nes: { prg, chr, mapper, vertical, chrData } }
let nes = null;           // last parsed NES state
let slow = false;
const input = { pressed: new Map(), log: [], downAt: new Map(), shortest: null };
const memTools = { snapshot: null, candidates: null, watch: [] };   // byte finder and watched bytes
const timing = { last: -1, stamps: [], intervals: [] };
let ramPrev = null;
const heat = new Float32Array(2048);
const changes = new Uint32Array(2048);
let lastPicture = null;   // ImageData of the console picture

function frameSrc(g) {
    const q = new URLSearchParams({ embed: "1", frame: "1", analyser: "1", engine: "emulatorjs" });
    if (g.cid) q.set("cid", g.cid);
    else {
        q.set("url", g.url);
        q.set("core", g.core || g.system);
    }
    return "play.html?" + q.toString();
}
async function loadGame(id) {
    const g = catalog.find((c) => c.id === id);
    if (!g) return banner("That game is not available here.", "warn");
    game = g;
    $("clsGame").value = g.id;
    emu = null;
    win = null;
    nes = null;
    rom = null;
    ramPrev = null;
    heat.fill(0);
    changes.fill(0);
    input.pressed.clear();
    input.log = [];
    input.downAt.clear();
    input.shortest = null;
    memTools.snapshot = null;
    memTools.candidates = null;
    memTools.watch = [];
    timing.last = -1;
    timing.stamps = [];
    timing.intervals = [];
    lastPicture = null;
    slow = false;
    $("clsSlow").setAttribute("aria-pressed", "false");
    const url = new URL(location.href);
    url.searchParams.set("game", g.id);
    history.replaceState(null, "", url);
    // A new frame each time: nothing of the previous game is left behind
    const old = $("clsFrame");
    const frame = document.createElement("iframe");
    frame.id = "clsFrame";
    frame.title = "Game: " + g.title;
    frame.setAttribute("allow", old.getAttribute("allow"));
    old.replaceWith(frame);
    $("clsWait").hidden = false;
    $("clsWait").textContent = "Starting " + g.title + "…";
    frame.src = frameSrc(g);
    loadRom(g).catch(() => {});
    const started = await new Promise((resolve) => {
        const t0 = Date.now();
        const check = setInterval(() => {
            if (frame !== $("clsFrame")) { clearInterval(check); return resolve(false); }
            const w = frame.contentWindow;
            const E = w && w.EJS_emulator;
            if (E && E.started) { clearInterval(check); resolve(true); }
            else if ((E && E.failedToStart) || Date.now() - t0 > 90000) { clearInterval(check); resolve(false); }
        }, 250);
    });
    if (!started) {
        $("clsWait").textContent = g.title + " could not start.";
        return;
    }
    $("clsWait").hidden = true;
    win = frame.contentWindow;
    emu = win.EJS_emulator;
    hookInput();
    hookKeys();
    updateTransport();
    if (view === "memory" || view === "tiles") buildPanel();
    render(true);
    renderMoments();
}
async function loadRom(g) {
    let blob = null;
    if (g.cid) blob = await collection.file(g.cid);
    else blob = await (await fetch(g.url)).blob();
    let bytes = new Uint8Array(await blob.arrayBuffer());
    // A zipped game: the largest file inside
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
        const JSZip = (await import("./vendor/jszip.js")).default;
        const zip = await JSZip.loadAsync(bytes);
        const files = Object.values(zip.files).filter((f) => !f.dir);
        let best = null;
        for (const f of files) {
            const data = await f.async("uint8array");
            if (!best || data.length > best.length) best = data;
        }
        if (best) bytes = best;
    }
    rom = { bytes, size: blob.size, nes: null };
    if (bytes[0] === 0x4E && bytes[1] === 0x45 && bytes[2] === 0x53 && bytes[3] === 0x1A) {
        const prg = bytes[4] * 16384;
        const chr = bytes[5] * 8192;
        const trainer = bytes[6] & 4 ? 512 : 0;
        const mapper = (bytes[6] >> 4) | (bytes[7] & 0xF0);
        const start = 16 + trainer + prg;
        rom.nes = { prg, chr, mapper, vertical: !!(bytes[6] & 1), four: !!(bytes[6] & 8), chrData: chr ? bytes.slice(start, start + Math.min(chr, 8192)) : null };
    }
}

// ---------- reading the console (NES) from an in-memory save state ----------
function findTag(bytes, text, name, size) {
    let from = 0;
    while (true) {
        const i = text.indexOf(name, from);
        if (i < 0) return null;
        const n = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
        if (size === undefined ? n > 0 && n < 1 << 20 : n === size) return bytes.subarray(i + 8, i + 8 + n);
        from = i + 1;
    }
}
function readNes() {
    if (!emu || !game || game.system !== "nes") return null;
    let state;
    try { state = emu.gameManager.getState(); } catch (e) { return null; }
    if (!state || !state.length) return null;
    const text = new TextDecoder("latin1").decode(state);
    const get = (name, size) => findTag(state, text, name, size);
    const pram = get("PRAM", 32);
    const oam = get("SPRA", 256);
    if (!pram || !oam) return null;
    const ppur = get("PPUR", 4) || new Uint8Array(4);
    const tadd = get("TADD", 2);
    const t = tadd ? tadd[0] | (tadd[1] << 8) : 0;
    const xoff = get("XOFF", 1);
    const len = [0, 1, 2, 3].map((k) => { const b = get("LEN" + k, 4); return b ? b[0] | (b[1] << 8) : 0; });
    const ench = get("ENCH", 1);
    return {
        size: state.length,
        pram: Uint8Array.from(pram, (v) => v & 0x3F),
        oam: Uint8Array.from(oam),
        ntar: Uint8Array.from(get("NTAR", 2048) || new Uint8Array(2048)),
        ram: Uint8Array.from(get("RAM\0", 2048) || new Uint8Array(2048)),
        chrRam: rom && rom.nes && !rom.nes.chrData ? (get("CHRR") ? Uint8Array.from(get("CHRR").subarray(0, 8192)) : null) : null,
        ctrl: ppur[0], mask: ppur[1],
        scrollX: ((t & 31) << 3) | ((xoff ? xoff[0] : 0) & 7) | (t & 0x400 ? 256 : 0),
        scrollY: (((t >> 5) & 31) << 3) | ((t >> 12) & 7) | (t & 0x800 ? 240 : 0),
        psg: Uint8Array.from(get("PSG\0", 16) || new Uint8Array(16)),
        ench: ench ? ench[0] : 0,
        len
    };
}

// ---------- the console picture, read from the game canvas (kept between frames) ----------
function readPicture() {
    if (!emu) return null;
    try {
        const canvas = emu.frontend.canvas;
        const gm = emu.gameManager;
        const w = gm.getVideoDimensions("width") || 256;
        const h = gm.getVideoDimensions("height") || 224;
        if (!canvas.width || !canvas.height) return lastPicture;
        // The game picture fills the canvas at a whole-number scale (picture-sized buffer); allow for borders
        const scale = Math.max(1, Math.min(Math.round(canvas.width / w), Math.round(canvas.height / h)));
        const sw = Math.min(canvas.width, w * scale), sh = Math.min(canvas.height, h * scale);
        const ox = Math.floor((canvas.width - sw) / 2), oy = Math.floor((canvas.height - sh) / 2);
        const c = readPicture.canvas || (readPicture.canvas = document.createElement("canvas"));
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, ox, oy, sw, sh, 0, 0, w, h);
        lastPicture = ctx.getImageData(0, 0, w, h);
        lastPicture.displayed = { cssW: canvas.clientWidth, cssH: canvas.clientHeight, bufW: canvas.width, bufH: canvas.height, scale };
        return lastPicture;
    } catch (e) {
        return lastPicture;
    }
}
function countColours(img) {
    const counts = new Map();
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
function nearestNes(v) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < 64; i++) {
        if ((i & 15) >= 14 && i !== 0x0F) continue;
        const c = NES_RGB[i];
        const d = (((c >> 16) & 255) - ((v >> 16) & 255)) ** 2 + (((c >> 8) & 255) - ((v >> 8) & 255)) ** 2 + ((c & 255) - (v & 255)) ** 2;
        if (d < bestD) { bestD = d; best = i; }
    }
    return best;
}
function uniqueBlocks(img) {
    const seen = new Set();
    const d = img.data;
    const cols = Math.floor(img.width / 8), rows = Math.floor(img.height / 8);
    for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        let h = 2166136261;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            const i = ((ty * 8 + y) * img.width + tx * 8 + x) * 4;
            h = Math.imul(h ^ ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]), 16777619);
        }
        seen.add(h >>> 0);
    }
    return { unique: seen.size, total: cols * rows };
}

// ---------- input: every button press goes through the emulator's input function ----------
const PAD = ["B", "Y", "Select", "Start", "Up", "Down", "Left", "Right", "A", "X", "L", "R", "L2", "R2", "L3", "R3"];
const SYSTEM_NAMES = {
    nes: { 8: "A", 0: "B" }, gb: { 8: "A", 0: "B" }, gba: { 8: "A", 0: "B" },
    segaMD: { 1: "A", 0: "B", 8: "C" }, segaMS: { 0: "1", 8: "2" }, segaGG: { 0: "1", 8: "2" }, atari2600: { 0: "Fire" },
    n64: { 0: "A", 1: "B", 12: "Z" }
};
function buttonName(index) {
    const names = SYSTEM_NAMES[game && game.system] || {};
    return names[index] || PAD[index] || "Input " + index;
}
function hookInput() {
    const fns = emu.gameManager.functions;
    if (!fns || fns.__classroom) return;
    const original = fns.simulateInput;
    fns.simulateInput = (player, index, value) => {
        try {
            if (player === 0 && index < 16) {
                const down = value !== 0;
                if (down !== !!input.pressed.get(index)) {
                    input.pressed.set(index, down);
                    const frame = safeFrame();
                    let held = null;
                    if (down) input.downAt.set(index, frame);
                    else if (input.downAt.has(index)) {
                        held = Math.max(0, frame - input.downAt.get(index));
                        if (input.shortest === null || held < input.shortest) input.shortest = held;
                    }
                    input.log.unshift({ frame, name: buttonName(index), down, held });
                    input.log.length = Math.min(input.log.length, 14);
                }
            }
        } catch (e) { /* never block input */ }
        return original(player, index, value);
    };
    fns.__classroom = true;
}
function hookKeys() {
    win.addEventListener("keydown", (e) => {
        if (e.key === "." && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); step(1, true); }
        else if (e.key === "," && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); togglePlay(true); }
        else if (run && (e.key === "PageDown" || e.key === "PageUp")) { e.preventDefault(); e.stopImmediatePropagation(); gotoStep(run.i + (e.key === "PageDown" ? 1 : -1), true); }
    }, true);
}
const safeFrame = () => { try { return emu.gameManager.getFrameNum(); } catch (e) { return 0; } };

// ---------- pause, step, slow motion ----------
function updateTransport() {
    const paused = !emu || emu.paused;
    $("clsPlay").innerHTML = paused ? "&#9654; Play" : "&#10073;&#10073; Pause";
    for (const id of ["clsPlay", "clsStep", "clsStep10", "clsSlow", "clsRestart"]) $(id).disabled = !emu;
}
function focusGame() { try { win && win.focus(); } catch (e) { /* frame gone */ } }
function togglePlay(keepFocus) {
    if (!emu) return;
    if (emu.paused) emu.play(); else emu.pause();
    updateTransport();
    render(true);
    if (!keepFocus) focusGame();
}
let stepping = false;
async function step(n, keepFocus) {
    if (!emu || stepping) return;
    stepping = true;
    if (!emu.paused) emu.pause();
    updateTransport();
    // Run, then pause again as soon as the frame counter has moved on. (Playing properly, not just restarting the
    // main loop, keeps the sound running: the emulator waits for the sound to drain, and stops if it can't.)
    const gm = emu.gameManager;
    const start = gm.getFrameNum();
    emu.play(true);
    await new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => {
            if (gm.getFrameNum() >= start + n || performance.now() - t0 > 4000) {
                emu.pause(true);
                resolve();
            } else win.requestAnimationFrame(tick);
        };
        win.requestAnimationFrame(tick);
    });
    emu.frontend.updatePlayPauseButtons(true);
    stepping = false;
    render(true);
    if (!keepFocus) focusGame();
}
$("clsPlay").addEventListener("click", () => togglePlay());
$("clsStep").addEventListener("click", () => step(1));
$("clsStep10").addEventListener("click", () => step(10));
$("clsSlow").addEventListener("click", () => {
    if (!emu) return;
    slow = !slow;
    try {
        emu.gameManager.setSlowMotionRatio(4);
        emu.gameManager.toggleSlowMotion(slow ? 1 : 0);
    } catch (e) { /* core without slow motion */ }
    $("clsSlow").setAttribute("aria-pressed", String(slow));
    focusGame();
});
$("clsRestart").addEventListener("click", () => {
    if (!emu) return;
    emu.gameManager.restart();
    if (emu.paused) emu.play();
    updateTransport();
    focusGame();
});
$("clsLoad").addEventListener("click", () => loadGame($("clsGame").value));
$("clsProjector").addEventListener("click", () => {
    const on = document.body.classList.toggle("cls-projector");
    $("clsProjector").setAttribute("aria-pressed", String(on));
    render(true);
});

// ---------- saved moments: the whole console at one frame, kept in this browser per game ----------
let dbp = null;
function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
        const r = indexedDB.open("EJS-classroom", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("moments", { keyPath: "id", autoIncrement: true });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
    return dbp;
}
async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
        const t = d.transaction("moments", mode);
        const req = fn(t.objectStore("moments"));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
    });
}
async function momentsFor(id) {
    const all = (await idb("readonly", (s) => s.getAll())) || [];
    return all.filter((m) => m.game === id).sort((a, b) => a.at - b.at);
}
function pictureCanvas() {
    if (!lastPicture) return null;
    const c = document.createElement("canvas");
    c.width = lastPicture.width;
    c.height = lastPicture.height;
    c.getContext("2d").putImageData(lastPicture, 0, 0);
    return c;
}
async function saveMoment() {
    if (!emu) return;
    let state;
    try { state = emu.gameManager.getState(); } catch (e) { state = null; }
    if (!state || !state.length) return banner("This game can't save moments.", "warn");
    readPicture();
    const c = pictureCanvas();
    const thumb = c ? await new Promise((r) => c.toBlob(r, "image/png")) : null;
    const frame = safeFrame();
    try {
        await idb("readwrite", (s) => s.add({ game: game.id, label: "Frame " + frame, frame, at: Date.now(), state: Uint8Array.from(state), thumb }));
    } catch (e) {
        return banner("Could not save the moment: " + e.message, "warn");
    }
    await renderMoments();
    banner(`Saved frame ${frame}. Press its picture under the game to come back to it.`, "ok");
}
let momentUrls = [];
async function renderMoments() {
    const host = $("clsMoments");
    for (const u of momentUrls) URL.revokeObjectURL(u);
    momentUrls = [];
    host.textContent = "";
    if (!game) return;
    const list = await momentsFor(game.id).catch(() => []);
    for (const m of list) {
        const item = el("div", "cls-moment");
        const go = el("button", "cls-moment-go");
        go.type = "button";
        go.title = "Go back to " + m.label;
        go.setAttribute("aria-label", "Go back to " + m.label);
        if (m.thumb) {
            const u = URL.createObjectURL(m.thumb);
            momentUrls.push(u);
            go.style.backgroundImage = `url("${u}")`;
        }
        go.addEventListener("click", () => restoreMoment(m));
        const name = el("input", "cls-moment-name");
        name.value = m.label;
        name.maxLength = 40;
        name.setAttribute("aria-label", "Name of this moment");
        name.addEventListener("change", () => {
            m.label = name.value.trim() || m.label;
            idb("readwrite", (s) => s.put(m)).catch(() => {});
        });
        const del = el("button", "cls-moment-del", "✕");
        del.type = "button";
        del.setAttribute("aria-label", "Delete " + m.label);
        del.addEventListener("click", async () => { await idb("readwrite", (s) => s.delete(m.id)); renderMoments(); });
        item.append(go, name, del);
        host.appendChild(item);
    }
}
async function restoreMoment(m) {
    if (!emu) return;
    const paused = emu.paused;
    try { emu.gameManager.loadState(Uint8Array.from(m.state)); } catch (e) { return banner("Could not go back to that moment: " + e.message, "warn"); }
    ramPrev = null;
    // A paused game shows the moment after one frame has run
    if (paused) await step(1, true);
    else render(true);
    focusGame();
}
$("clsMoment").addEventListener("click", saveMoment);

// ---------- changing one byte of working memory (NES): written into a save state, then loaded back ----------
function poke(addr, value) {
    if (!emu || !isNes()) return false;
    let state;
    try { state = emu.gameManager.getState(); } catch (e) { return false; }
    const text = new TextDecoder("latin1").decode(state);
    const ram = findTag(state, text, "RAM\0", 2048);
    if (!ram) return false;
    ram[addr] = value & 255;
    emu.gameManager.loadState(state);
    nes = readNes() || nes;
    return true;
}
// ---------- the byte finder and watched bytes ----------
function addWatch(addr) {
    addr = Math.max(0, Math.min(2047, addr | 0));
    if (!memTools.watch.some((w) => w.addr === addr)) memTools.watch.push({ addr, history: [] });
    if (panel && panel.watch) buildWatch();
}
function findStart() {
    if (!nes) return banner("Load an NES game first.", "warn");
    memTools.snapshot = Uint8Array.from(nes.ram);
    memTools.candidates = [...Array(2048).keys()];
    renderFound("Search started: all 2,048 bytes could be it. Now change something in the game, then say how the number changed.");
}
function findStep(kind, value) {
    if (!nes) return;
    if (!memTools.snapshot) return findStart();
    const now = readNes() || nes;
    nes = now;
    const before = memTools.snapshot;
    const test = {
        changed: (a) => now.ram[a] !== before[a],
        same: (a) => now.ram[a] === before[a],
        up: (a) => now.ram[a] > before[a],
        down: (a) => now.ram[a] < before[a],
        eq: (a) => now.ram[a] === value
    }[kind];
    memTools.candidates = memTools.candidates.filter(test);
    memTools.snapshot = Uint8Array.from(now.ram);
    renderFound();
}
function renderFound(message) {
    const box = panel && panel.found;
    if (!box) return;
    box.textContent = "";
    const list = memTools.candidates;
    if (message) box.appendChild(el("p", null, message));
    if (!list) return;
    if (!message) box.appendChild(el("p", null, list.length ? `${list.length} byte${list.length === 1 ? "" : "s"} could be it.` : "None left: start a new search."));
    if (list.length && list.length <= 24) {
        const row = el("div", "cls-found-list");
        for (const a of list) {
            const b = el("button", null, `${hex4(a)} = ${nes.ram[a]}`);
            b.type = "button";
            b.title = "Watch this byte";
            b.addEventListener("click", () => addWatch(a));
            row.appendChild(b);
        }
        box.appendChild(row);
    }
}
const bin8 = (v) => v.toString(2).padStart(8, "0").replace(/(\d{4})(\d{4})/, "$1 $2");
function buildWatch() {
    const host = panel.watch;
    host.textContent = "";
    if (!memTools.watch.length) {
        host.appendChild(el("p", "small muted", "No bytes watched yet. Point at the memory map and click a square, or use Find a byte."));
        return;
    }
    const t = el("table", "hb-controls cls-table cls-watch");
    const head = t.createTHead().insertRow();
    for (const h of ["Address", "Value", "Hex", "Binary", "Last values", "Change to", ""]) head.appendChild(el("th", null, h));
    const body = t.createTBody();
    for (const w of memTools.watch) {
        const r = body.insertRow();
        r.insertCell().textContent = hex4(w.addr);
        w.cells = { dec: r.insertCell(), hex: r.insertCell(), bin: r.insertCell(), hist: r.insertCell() };
        w.cells.bin.className = "cls-mono";
        const set = r.insertCell();
        const input = el("input", "cls-num");
        input.type = "number";
        input.min = 0;
        input.max = 255;
        input.setAttribute("aria-label", "New value for " + hex4(w.addr));
        const go = el("button", null, "Set");
        go.type = "button";
        const apply = async () => {
            const v = Number(input.value);
            if (!(v >= 0 && v <= 255)) return banner("A byte holds a whole number from 0 to 255.", "warn");
            if (!poke(w.addr, Math.round(v))) return banner("This game's memory can't be changed here.", "warn");
            if (emu.paused) await step(1, true);
            render(true);
        };
        go.addEventListener("click", apply);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") apply(); });
        set.append(input, go);
        const del = el("button", null, "✕");
        del.type = "button";
        del.setAttribute("aria-label", "Stop watching " + hex4(w.addr));
        del.addEventListener("click", () => { memTools.watch = memTools.watch.filter((x) => x !== w); buildWatch(); });
        r.insertCell().appendChild(del);
    }
    host.appendChild(t);
    updateWatch();
}
function updateWatch() {
    if (!nes) return;
    for (const w of memTools.watch) {
        if (!w.cells) continue;
        const v = nes.ram[w.addr];
        if (w.history[w.history.length - 1] !== v) {
            w.history.push(v);
            if (w.history.length > 8) w.history.shift();
        }
        w.cells.dec.textContent = String(v);
        w.cells.hex.textContent = hex2(v);
        w.cells.bin.textContent = bin8(v);
        w.cells.hist.textContent = w.history.join(", ");
    }
}

// ---------- pictures as PNG files ----------
function savePng(canvas, what) {
    if (!canvas || !canvas.width) return;
    const name = `${(game ? game.title : "game").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${what}-frame-${emu ? safeFrame() : 0}.png`;
    canvas.toBlob((blob) => {
        if (!blob) return;
        const a = el("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
}
function pngButton(getCanvas, what) {
    const b = el("button", "cls-png", "Save picture (PNG)");
    b.type = "button";
    b.title = "Save this picture at the console's own size, for a worksheet or slides";
    b.addEventListener("click", () => savePng(getCanvas(), what));
    return b;
}

// ---------- tile detail: one 8 × 8 drawing, its pixel numbers and its two bit planes ----------
function tileDetail() {
    const host = panel && panel.detail;
    const sel = panel && panel.tile;
    const chr = chrBytes();
    if (!host || !sel || !chr) return;
    const base = sel.table * 4096 + sel.n * 16;
    const pal = paletteRgb(panel.palSel.value);
    const key = sel.table + ":" + sel.n + ":" + panel.palSel.value + ":" + Array.from(chr.subarray(base, base + 16)).join(",") + ":" + pal.join(",");
    if (host.dataset.key === key) return;
    host.dataset.key = key;
    host.textContent = "";
    host.appendChild(el("h3", null, `Tile ${hex2(sel.n)} of pattern table ${sel.table}: 16 bytes at ${hex4(base)}`));
    const wrap = el("div", "cls-tile-wrap");
    const grid = el("table", "cls-tile-grid");
    const gb = grid.createTBody();
    const rows = el("table", "hb-controls cls-table cls-planes");
    const head = rows.createTHead().insertRow();
    for (const h of ["Row", "Low byte (plane 0)", "High byte (plane 1)", "Pixel numbers"]) head.appendChild(el("th", null, h));
    const rb = rows.createTBody();
    for (let y = 0; y < 8; y++) {
        const lo = chr[base + y], hi = chr[base + y + 8];
        const tr = gb.insertRow();
        const nums = [];
        for (let x = 0; x < 8; x++) {
            const v = ((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1);
            nums.push(v);
            const td = tr.insertCell();
            td.textContent = String(v);
            td.style.background = rgbHex(pal[v]);
            if (((pal[v] >> 16) + ((pal[v] >> 8) & 255) + (pal[v] & 255)) > 380) td.classList.add("light");
        }
        const r = rb.insertRow();
        for (const v of [String(y), `${lo.toString(2).padStart(8, "0")} (${hex2(lo)})`, `${hi.toString(2).padStart(8, "0")} (${hex2(hi)})`, nums.join("")]) {
            const td = r.insertCell();
            td.textContent = v;
            td.className = "cls-mono";
        }
    }
    wrap.append(grid, rows);
    host.appendChild(wrap);
    host.appendChild(el("p", "small muted", "Each pixel's number = its bit in the high byte × 2 + its bit in the low byte. The first 8 bytes are the low plane, the next 8 the high plane."));
}

// ---------- the views ----------
const VIEWS = [
    { id: "screen", label: "Screen" },
    { id: "palette", label: "Palette" },
    { id: "sprites", label: "Sprites" },
    { id: "background", label: "Background" },
    { id: "tiles", label: "Tiles" },
    { id: "sound", label: "Sound" },
    { id: "memory", label: "Memory" },
    { id: "timing", label: "Timing" },
    { id: "input", label: "Input" }
];
let view = params.get("view") && VIEWS.some((v) => v.id === params.get("view")) ? params.get("view") : "screen";
const overlays = { grid: false, sprites: false };
let panel = null;  // elements of the current view
for (const v of VIEWS) {
    const b = el("button", "cls-tab", v.label);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.view = v.id;
    b.addEventListener("click", () => setView(v.id));
    $("clsTabs").appendChild(b);
}
function setView(id) {
    view = id;
    for (const b of $("clsTabs").children) {
        b.setAttribute("aria-selected", String(b.dataset.view === id));
        b.classList.toggle("on", b.dataset.view === id);
    }
    buildPanel();
    render(true);
}
const isNes = () => game && game.system === "nes";
function nesOnly(box, what) {
    box.appendChild(el("p", "muted small", `${what} is read from the console's own memory for NES games. ${game ? labelFor(game.system) + " games" : "Other systems"} show the picture-based views (Screen, Palette colours, Tiles count, Sound, Timing, Input).`));
}
function canvasBox(cls, w, h) {
    const c = el("canvas", "cls-canvas " + (cls || ""));
    c.width = w;
    c.height = h;
    return c;
}
function check(label, key) {
    const l = el("label", "cls-check");
    const i = el("input");
    i.type = "checkbox";
    i.checked = overlays[key];
    i.addEventListener("change", () => { overlays[key] = i.checked; render(true); });
    l.append(i, document.createTextNode(" " + label));
    return l;
}
function buildPanel() {
    const box = $("clsPanel");
    box.textContent = "";
    panel = { box };
    if (view === "screen") {
        panel.info = el("p", "cls-info");
        const wrap = el("div", "cls-screen-wrap");
        panel.canvas = canvasBox("cls-pixel", 256, 224);
        panel.over = canvasBox("cls-over", 768, 672);
        wrap.append(panel.canvas, panel.over);
        panel.inspect = el("p", "cls-inspect small", "Point at the picture to read a pixel.");
        const row = el("div", "cls-row");
        row.append(check("8 × 8 grid (tiles)", "grid"), check("Sprite boxes (NES)", "sprites"));
        row.appendChild(pngButton(() => pictureCanvas(), "screen"));
        box.append(panel.info, row, wrap, panel.inspect);
        wrap.addEventListener("pointermove", (e) => inspect(e, wrap));
        box.appendChild(el("p", "small muted", "This is the picture at the console's own resolution, one square per console pixel. The game on the left is the same picture scaled up for your screen."));
    } else if (view === "palette") {
        panel.pals = el("div", "cls-pals");
        panel.master = el("div", "cls-master");
        panel.onscreen = el("div", "cls-swatches");
        panel.info = el("p", "cls-info");
        box.append(el("h3", null, "Palettes in use"), panel.pals, el("h3", null, "The NES master palette (64 codes)"), panel.master, el("h3", null, "Colours in the picture now"), panel.info, panel.onscreen);
        box.appendChild(el("p", "small muted", "Colours are shown with a standard NES palette; televisions of the time varied a little. Codes marked with a ring are in the palettes right now."));
    } else if (view === "sprites") {
        panel.info = el("div", "cls-stats");
        const wrap = el("div", "cls-screen-wrap");
        panel.canvas = canvasBox("cls-pixel", 256, 224);
        panel.over = canvasBox("cls-over", 768, 672);
        wrap.append(panel.canvas, panel.over);
        panel.table = el("div", "table-wrap");
        box.append(panel.info, wrap, el("p", "small muted", "Boxes: every sprite in the sprite list. Red boxes are sprites the console could not draw completely, because their line already had 8 sprites."), panel.table);
    } else if (view === "background") {
        panel.info = el("div", "cls-stats");
        panel.canvas = canvasBox("cls-pixel cls-map", 512, 240);
        box.append(panel.info, panel.canvas, pngButton(() => panel.canvas, "background"), el("p", "small muted", "The console's background memory holds two screens of tiles. The white frame is the part shown on the TV (the scroll position); it moves as the game scrolls. Games with a status bar change the scroll part-way down the screen, so the frame shows where the top of the screen starts."));
    } else if (view === "tiles") {
        panel.info = el("div", "cls-stats");
        const row = el("div", "cls-row");
        panel.palSel = el("select");
        for (const [v, t] of [["g", "Greys"], ["0", "Background palette 0"], ["1", "Background palette 1"], ["2", "Background palette 2"], ["3", "Background palette 3"], ["4", "Sprite palette 0"], ["5", "Sprite palette 1"], ["6", "Sprite palette 2"], ["7", "Sprite palette 3"]]) panel.palSel.add(new Option(t, v));
        panel.palSel.value = "0";
        panel.palSel.addEventListener("change", () => render(true));
        const lab = el("label", "cls-check", "Colour the tiles with ");
        lab.appendChild(panel.palSel);
        row.appendChild(lab);
        row.appendChild(pngButton(() => panel.canvas, "tiles"));
        panel.canvas = canvasBox("cls-pixel cls-chr", 256, 128);
        panel.hover = el("p", "cls-inspect small", "Point at a tile to see its number; click it to see how it is stored.");
        const tileAt = (e) => {
            const r = panel.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - r.left) / r.width * 256), y = Math.floor((e.clientY - r.top) / r.height * 128);
            return { table: x >= 128 ? 1 : 0, n: Math.max(0, Math.min(255, Math.floor(y / 8) * 16 + Math.floor((x % 128) / 8))) };
        };
        panel.canvas.addEventListener("pointermove", (e) => {
            const { table, n } = tileAt(e);
            panel.hover.textContent = `Pattern table ${table} (${table ? "$1000" : "$0000"}), tile ${hex2(n)}: 16 bytes at ${hex4(table * 4096 + n * 16)}`;
        });
        panel.canvas.addEventListener("click", (e) => {
            panel.tile = tileAt(e);
            render(true);
            if (panel.detail) panel.detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        panel.detail = el("div", "cls-tile-detail");
        box.append(panel.info, row, panel.canvas, panel.hover, el("p", "small muted", "Every 8 × 8 drawing in the cartridge's graphics, 256 per table. Each pixel is a number 0 to 3; the palette gives it a colour. Outlined tiles are used by the background on screen."), panel.detail);
    } else if (view === "sound") {
        panel.wave = canvasBox("cls-wave", 600, 120);
        panel.spec = canvasBox("cls-wave", 600, 90);
        panel.channels = el("div", "table-wrap");
        const hear = el("div", "cls-row cls-hear");
        hear.appendChild(el("strong", null, "Hear each channel: "));
        for (const [label, kind] of [["Pulse 12.5 %", 0.125], ["Pulse 25 %", 0.25], ["Pulse 50 %", 0.5], ["Triangle", "tri"], ["Noise", "noise"]]) {
            const b = el("button", null, label);
            b.type = "button";
            b.addEventListener("click", () => playVoice(kind));
            hear.appendChild(b);
        }
        box.append(el("h3", null, "The sound coming out"), panel.wave, panel.spec, el("p", "small muted", "Top: the wave itself (a few hundredths of a second). Bottom: low notes on the left, high on the right."), el("h3", null, "The five NES channels"), panel.channels, hear);
    } else if (view === "memory") {
        panel.info = el("div", "cls-stats");
        panel.canvas = canvasBox("cls-heat", 512, 256);
        panel.hover = el("p", "cls-inspect small", "Point at a square to read that byte.");
        panel.canvas.addEventListener("pointermove", (e) => {
            if (!nes) return;
            const r = panel.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - r.left) / r.width * 64), y = Math.floor((e.clientY - r.top) / r.height * 32);
            const a = Math.max(0, Math.min(2047, y * 64 + x));
            const area = a < 0x100 ? "zero page (fast variables)" : a < 0x200 ? "stack" : a < 0x300 ? "often the sprite list" : "work memory";
            panel.hover.textContent = `Address ${hex4(a)} = ${nes.ram[a]} (${hex2(nes.ram[a])}) · changed ${changes[a]} times · ${area}`;
        });
        panel.canvas.addEventListener("click", (e) => {
            const r = panel.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - r.left) / r.width * 64), y = Math.floor((e.clientY - r.top) / r.height * 32);
            addWatch(y * 64 + x);
        });
        panel.facts = el("div", "table-wrap");
        // Find a byte: narrow 2,048 bytes down to the one that holds a number in the game
        const find = el("div", "cls-row cls-find");
        const fbtn = (label, fn, title) => {
            const b = el("button", null, label);
            b.type = "button";
            if (title) b.title = title;
            b.addEventListener("click", fn);
            find.appendChild(b);
        };
        fbtn("Start a search", findStart, "Remember every byte as it is now");
        fbtn("Changed", () => findStep("changed"));
        fbtn("Didn't change", () => findStep("same"));
        fbtn("Went up", () => findStep("up"));
        fbtn("Went down", () => findStep("down"));
        const eq = el("input", "cls-num");
        eq.type = "number";
        eq.min = 0;
        eq.max = 255;
        eq.setAttribute("aria-label", "Value to look for");
        find.appendChild(eq);
        fbtn("Equals", () => findStep("eq", Number(eq.value)), "Keep only bytes that hold this number now");
        panel.found = el("div", "cls-found small");
        panel.watch = el("div", "table-wrap");
        box.append(panel.info, el("h3", null, "Watched bytes"), panel.watch,
            el("h3", null, "All working memory"), panel.canvas, panel.hover, el("p", "small muted", "All 2,048 bytes of NES working memory, 64 per row. Brightness is the value; red means it just changed. Click a square to watch that byte."),
            el("h3", null, "Find a byte"), el("p", "small muted", "Start a search, change something in the game (move, score, lose a life), then press how the number changed. Repeat until only a few bytes are left."), find, panel.found,
            el("h3", null, "Sizes"), panel.facts);
        buildWatch();
        renderFound();
    } else if (view === "timing") {
        panel.info = el("div", "cls-stats");
        panel.canvas = canvasBox("cls-wave", 600, 140);
        box.append(panel.info, panel.canvas, el("p", "small muted", "Each bar is the time between two frames, measured in this browser. The line is the NES's budget: about 16.7 ms per frame, 60 frames each second. When the game is paused, nothing moves until you step."));
    } else if (view === "input") {
        panel.pad = el("div", "cls-pad");
        panel.log = el("ol", "cls-log");
        panel.held = el("p", "cls-info");
        box.append(panel.pad, el("h3", null, "Presses, with the frame they happened in"), panel.held, panel.log, el("p", "small muted", "Keyboard, controller and on-screen buttons all arrive here. The game reads them once per frame."));
    }
}

function inspect(e, wrap) {
    if (!lastPicture) return;
    const r = wrap.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * lastPicture.width);
    const y = Math.floor((e.clientY - r.top) / r.height * lastPicture.height);
    if (x < 0 || y < 0 || x >= lastPicture.width || y >= lastPicture.height) return;
    const i = (y * lastPicture.width + x) * 4;
    const d = lastPicture.data;
    const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let text = `Pixel ${x}, ${y} · colour ${rgbHex(v)} · tile column ${Math.floor(x / 8)}, row ${Math.floor(y / 8)}`;
    if (isNes()) text += ` · nearest NES code ${hex2(nearestNes(v))}`;
    panel.inspect.textContent = text;
}

// ---------- drawing ----------
function drawPicture(canvas) {
    if (!lastPicture) return;
    canvas.width = lastPicture.width;
    canvas.height = lastPicture.height;
    canvas.getContext("2d").putImageData(lastPicture, 0, 0);
}
function overlayCtx(over, w, h, k = 3) {
    over.width = w * k;
    over.height = h * k;
    const ctx = over.getContext("2d");
    ctx.clearRect(0, 0, over.width, over.height);
    return ctx;
}
const cropTop = () => (lastPicture ? Math.max(0, Math.round((240 - lastPicture.height) / 2)) : 8);
function spriteBoxes() {
    if (!nes) return [];
    const tall = nes.ctrl & 0x20 ? 16 : 8;
    const perLine = new Uint8Array(256);
    const boxes = [];
    for (let i = 0; i < 64; i++) {
        const y = nes.oam[i * 4] + 1;
        if (nes.oam[i * 4] >= 0xEF) continue;
        let cut = false;
        for (let line = y; line < y + tall && line < 240; line++) {
            if (perLine[line] >= 8) cut = true; else perLine[line]++;
        }
        boxes.push({ i, x: nes.oam[i * 4 + 3], y, tile: nes.oam[i * 4 + 1], attr: nes.oam[i * 4 + 2], tall, cut });
    }
    let busiest = 0, line = 0;
    const counts = new Uint8Array(256);
    for (const b of boxes) for (let l = b.y; l < b.y + b.tall && l < 240; l++) counts[l]++;
    for (let l = 0; l < 240; l++) if (counts[l] > busiest) { busiest = counts[l]; line = l; }
    boxes.busiest = busiest;
    boxes.line = line;
    return boxes;
}
function drawOverlays(over, showGrid, showSprites) {
    if (!lastPicture) return;
    const w = lastPicture.width, h = lastPicture.height, k = 3;
    const ctx = overlayCtx(over, w, h, k);
    if (showGrid) {
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) { ctx.moveTo(x * k + 0.5, 0); ctx.lineTo(x * k + 0.5, h * k); }
        const off = isNes() ? (8 - cropTop() % 8) % 8 : 0;
        for (let y = off; y <= h; y += 8) { ctx.moveTo(0, y * k + 0.5); ctx.lineTo(w * k, y * k + 0.5); }
        ctx.stroke();
    }
    if (showSprites && nes) {
        const top = cropTop();
        ctx.font = "bold 18px system-ui, sans-serif";
        for (const b of spriteBoxes()) {
            ctx.strokeStyle = b.cut ? "#ff4040" : "#ffe14d";
            ctx.setLineDash(b.cut ? [6, 4] : []);
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x * k + 1, (b.y - top) * k + 1, 8 * k - 2, b.tall * k - 2);
            ctx.fillStyle = b.cut ? "#ff4040" : "#ffe14d";
            ctx.fillText(String(b.i), b.x * k + 2, (b.y - top) * k - 3);
        }
        ctx.setLineDash([]);
    }
}
function stat(box, label, value, warn) {
    const d = el("div", "cls-stat" + (warn ? " warn" : ""));
    d.append(el("span", null, label), el("strong", null, value));
    box.appendChild(d);
}
function chrBytes() {
    if (!rom || !rom.nes) return null;
    return rom.nes.chrData || (nes && nes.chrRam) || null;
}
function tileRow(chr, table, tile, y) {
    const base = table * 4096 + tile * 16;
    return [chr[base + y], chr[base + y + 8]];
}
function paletteRgb(sel) {
    if (sel === "g" || !nes) return [0x000000, 0x555555, 0xAAAAAA, 0xFFFFFF];
    const p = Number(sel);
    return [0, 1, 2, 3].map((c) => NES_RGB[nes.pram[c === 0 ? 0 : p * 4 + c]]);
}
function drawBackground(canvas) {
    const chr = chrBytes();
    const vertical = rom && rom.nes ? rom.nes.vertical : true;
    const W = vertical ? 512 : 256, H = vertical ? 240 : 480;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const table = nes.ctrl & 0x10 ? 1 : 0;
    for (let n = 0; n < 2; n++) {
        const nt = nes.ntar.subarray(n * 1024, n * 1024 + 1024);
        const ox = vertical ? n * 256 : 0, oy = vertical ? 0 : n * 240;
        for (let ty = 0; ty < 30; ty++) for (let tx = 0; tx < 32; tx++) {
            const tile = nt[ty * 32 + tx];
            const attr = nt[960 + (ty >> 2) * 8 + (tx >> 2)];
            const shift = ((ty & 2) << 1) | (tx & 2);
            const pal = (attr >> shift) & 3;
            for (let y = 0; y < 8; y++) {
                const [lo, hi] = chr ? tileRow(chr, table, tile, y) : [0, 0];
                for (let x = 0; x < 8; x++) {
                    const v = ((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1);
                    const c = NES_RGB[nes.pram[v === 0 ? 0 : pal * 4 + v]];
                    const i = ((oy + ty * 8 + y) * W + ox + tx * 8 + x) * 4;
                    img.data[i] = c >> 16; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255; img.data[i + 3] = 255;
                }
            }
        }
    }
    ctx.putImageData(img, 0, 0);
    // The screen window (wraps around the two screens)
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    const sx = nes.scrollX % W, sy = nes.scrollY % H;
    for (const dx of [0, -W]) for (const dy of [0, -H]) ctx.strokeRect(sx + dx + 1, sy + dy + 1, 254, 238);
    return { W, H, table };
}
function drawChr(canvas, sel, usedTiles, picked) {
    const chr = chrBytes();
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(256, 128);
    const pal = paletteRgb(sel);
    if (chr) for (let t = 0; t < 2; t++) for (let n = 0; n < 256; n++) {
        for (let y = 0; y < 8; y++) {
            const [lo, hi] = tileRow(chr, t, n, y);
            for (let x = 0; x < 8; x++) {
                const v = ((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1);
                const c = pal[v];
                const i = (((n >> 4) * 8 + y) * 256 + t * 128 + (n & 15) * 8 + x) * 4;
                img.data[i] = c >> 16; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255; img.data[i + 3] = 255;
            }
        }
    }
    ctx.putImageData(img, 0, 0);
    if (usedTiles) {
        ctx.strokeStyle = "rgba(255,225,77,.9)";
        ctx.lineWidth = 1;
        for (const n of usedTiles.tiles) ctx.strokeRect(usedTiles.table * 128 + (n & 15) * 8 + 0.5, (n >> 4) * 8 + 0.5, 7, 7);
    }
    if (picked) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(picked.table * 128 + (picked.n & 15) * 8, (picked.n >> 4) * 8, 8, 8);
    }
}

// ---------- sound ----------
let voiceCtx = null;
function playVoice(kind) {
    voiceCtx = voiceCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = voiceCtx;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.setValueAtTime(0.18, t + 0.8);
    gain.gain.linearRampToValueAtTime(0, t + 1);
    gain.connect(ctx.destination);
    let src;
    if (kind === "noise") {
        const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lfsr = 1;
        const every = Math.round(ctx.sampleRate / 4000);
        let v = 1;
        for (let i = 0; i < data.length; i++) {
            if (i % every === 0) {
                const bit = (lfsr ^ (lfsr >> 1)) & 1;
                lfsr = (lfsr >> 1) | (bit << 14);
                v = lfsr & 1 ? 1 : -1;
            }
            data[i] = v * 0.7;
        }
        src = ctx.createBufferSource();
        src.buffer = buffer;
    } else {
        src = ctx.createOscillator();
        src.frequency.value = 220;
        const n = 64;
        const real = new Float32Array(n), imag = new Float32Array(n);
        for (let k = 1; k < n; k++) {
            if (kind === "tri") imag[k] = k % 2 ? 8 / (Math.PI * Math.PI * k * k) * (((k - 1) / 2) % 2 ? -1 : 1) : 0;
            else imag[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * kind);
        }
        src.setPeriodicWave(ctx.createPeriodicWave(real, imag));
    }
    src.connect(gain);
    src.start(t);
    src.stop(t + 1);
}
function apuChannels() {
    const r = nes.psg;
    const on = (bit) => !!(nes.ench & (1 << bit));
    const duty = ["12.5 %", "25 %", "50 %", "75 %"];
    const pulse = (o, k) => {
        const period = r[o + 2] | ((r[o + 3] & 7) << 8);
        const f = period >= 8 ? CPU_HZ / (16 * (period + 1)) : 0;
        return { name: "Pulse " + (k + 1), active: on(k) && nes.len[k] > 0 && period >= 8, wave: "Square, duty " + duty[r[o] >> 6], volume: r[o] & 0x10 ? String(r[o] & 15) + " of 15" : "fading (envelope)", freq: f, use: "Melody, harmony" };
    };
    const tp = r[10] | ((r[11] & 7) << 8);
    const tf = tp > 1 ? CPU_HZ / (32 * (tp + 1)) : 0;
    return [
        pulse(0, 0), pulse(4, 1),
        { name: "Triangle", active: on(2) && nes.len[2] > 0 && tp > 1, wave: "Triangle", volume: "on or off only", freq: tf, use: "Bass line" },
        { name: "Noise", active: on(3) && nes.len[3] > 0, wave: (r[14] & 0x80 ? "Metallic" : "Hiss") + ", speed " + (15 - (r[14] & 15)) + " of 15", volume: r[12] & 0x10 ? String(r[12] & 15) + " of 15" : "fading (envelope)", freq: 0, use: "Drums, effects" },
        { name: "DMC (samples)", active: on(4), wave: "Recorded sound", volume: "–", freq: 0, use: "Voices, drums" }
    ];
}
function drawWave(canvas, spec) {
    const a = win && win.EJS_analyser;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!a) {
        ctx.fillStyle = "#8b95a1";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText("The sound appears here once the game plays sound.", 12, 26);
        return;
    }
    if (!spec) {
        const data = new Uint8Array(a.fftSize);
        a.getByteTimeDomainData(data);
        ctx.strokeStyle = "#1aafff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const x = i / data.length * canvas.width, y = data[i] / 255 * canvas.height;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
    } else {
        const data = new Uint8Array(a.frequencyBinCount);
        a.getByteFrequencyData(data);
        const bars = 120;
        const used = Math.floor(data.length / 4);
        for (let b = 0; b < bars; b++) {
            const v = data[Math.floor(b / bars * used)] / 255;
            ctx.fillStyle = `hsl(${200 - v * 160}, 80%, ${30 + v * 35}%)`;
            ctx.fillRect(b * canvas.width / bars, canvas.height * (1 - v), canvas.width / bars - 1, canvas.height * v);
        }
    }
}

// ---------- render: called on a timer while running, and right after pause / step ----------
function render(full) {
    if (!panel) return;
    if (!emu) {
        if (view !== "sound") return;
    }
    if (emu && (full || !emu.paused)) {
        readPicture();
        nes = readNes() || nes;
        if (nes) trackRam();
    }
    const box = panel;
    if (view === "screen") {
        drawPicture(box.canvas);
        drawOverlays(box.over, overlays.grid, overlays.sprites);
        if (lastPicture) {
            const d = lastPicture.displayed || {};
            const colours = countColours(lastPicture).length;
            box.info.textContent = `Console picture ${lastPicture.width} × ${lastPicture.height} = ${(lastPicture.width * lastPicture.height).toLocaleString()} pixels · ${colours} colours · on your screen it is ${d.cssW || "?"} × ${d.cssH || "?"} points (each console pixel ≈ ${d.cssW ? (d.cssW / lastPicture.width).toFixed(1) : "?"} × ${d.cssH ? (d.cssH / lastPicture.height).toFixed(1) : "?"})`;
        }
    } else if (view === "palette") {
        box.pals.textContent = "";
        if (isNes() && nes) {
            for (let p = 0; p < 8; p++) {
                const row = el("div", "cls-pal");
                row.appendChild(el("span", "cls-pal-name", (p < 4 ? "Background " : "Sprite ") + (p % 4)));
                for (let c = 0; c < 4; c++) {
                    const code = nes.pram[c === 0 ? 0 : p * 4 + c];
                    const s = el("span", "cls-sw" + (c === 0 ? " shared" : ""));
                    s.style.background = rgbHex(NES_RGB[code]);
                    s.title = c === 0 ? "Colour 0: the shared backdrop (transparent for sprites)" : "Colour " + c;
                    s.appendChild(el("b", null, hex2(code)));
                    row.appendChild(s);
                }
                box.pals.appendChild(row);
            }
            box.pals.appendChild(el("p", "small muted", "8 palettes × 4 = 32 bytes. Colour 0 (dashed) is shared by all, so at most 1 + 8 × 3 = 25 colours are on screen at once."));
        } else nesOnly(box.pals, "The palette memory");
        box.master.textContent = "";
        const used = new Set(nes && isNes() ? [...nes.pram] : []);
        for (let i = 0; i < 64; i++) {
            const s = el("span", "cls-msw" + (used.has(i) ? " used" : ""));
            s.style.background = rgbHex(NES_RGB[i]);
            s.title = hex2(i);
            s.appendChild(el("b", null, (i).toString(16).toUpperCase().padStart(2, "0")));
            if (((NES_RGB[i] >> 16) + ((NES_RGB[i] >> 8) & 255) + (NES_RGB[i] & 255)) > 380) s.classList.add("light");
            box.master.appendChild(s);
        }
        if (lastPicture) {
            const colours = countColours(lastPicture);
            const total = lastPicture.width * lastPicture.height;
            box.info.textContent = `${colours.length} different colours in this picture.`;
            box.onscreen.textContent = "";
            for (const [v, n] of colours.slice(0, 48)) {
                const s = el("span", "cls-sw small");
                s.style.background = rgbHex(v);
                s.title = `${rgbHex(v)}: ${(n / total * 100).toFixed(1)} % of the picture`;
                s.appendChild(el("b", null, isNes() ? hex2(nearestNes(v)) : (n / total * 100).toFixed(0) + "%"));
                box.onscreen.appendChild(s);
            }
        }
    } else if (view === "sprites") {
        box.info.textContent = "";
        if (!isNes()) { nesOnly(box.info, "The sprite list"); return; }
        if (!nes) return;
        const boxes = spriteBoxes();
        stat(box.info, "Sprites on screen", `${boxes.length} of 64`);
        stat(box.info, "Sprite size", nes.ctrl & 0x20 ? "8 × 16" : "8 × 8");
        stat(box.info, "Busiest line", boxes.busiest ? `${boxes.busiest} sprites on line ${boxes.line}` : "–", boxes.busiest > 8);
        stat(box.info, "Not drawn", boxes.busiest > 8 ? `${boxes.filter((b) => b.cut).length} sprites cut (limit 8 per line)` : "none", boxes.busiest > 8);
        drawPicture(box.canvas);
        drawOverlays(box.over, false, true);
        const t = el("table", "hb-controls cls-table");
        const head = t.createTHead().insertRow();
        for (const h of ["#", "X", "Y", "Tile", "Palette", "Flip", "Behind", "Drawn"]) head.appendChild(el("th", null, h));
        const body = t.createTBody();
        for (const b of boxes) {
            const r = body.insertRow();
            for (const v of [b.i, b.x, b.y - 1, hex2(b.tile), b.attr & 3, (b.attr & 0x40 ? "↔" : "") + (b.attr & 0x80 ? "↕" : "") || "–", b.attr & 0x20 ? "yes" : "–", b.cut ? "partly" : "yes"]) r.insertCell().textContent = String(v);
            if (b.cut) r.classList.add("cut");
        }
        box.table.textContent = "";
        box.table.appendChild(t);
    } else if (view === "background") {
        box.info.textContent = "";
        if (!isNes()) { nesOnly(box.info, "The background map"); return; }
        if (!nes) return;
        const res = drawBackground(box.canvas);
        const used = new Set();
        for (let n = 0; n < 2; n++) for (let i = 0; i < 960; i++) used.add(nes.ntar[n * 1024 + i]);
        stat(box.info, "Layout", rom && rom.nes ? (rom.nes.vertical ? "2 screens side by side" : "2 screens one above the other") : "–");
        stat(box.info, "Scroll", `X ${nes.scrollX}, Y ${nes.scrollY}`);
        stat(box.info, "Different tiles", `${used.size} of 256`);
        stat(box.info, "Tile drawings", res.table ? "pattern table 1 ($1000)" : "pattern table 0 ($0000)");
        if (!chrBytes()) box.info.appendChild(el("p", "small muted", "This cartridge's tile drawings could not be read, so tiles show as plain colour."));
        if (rom && rom.nes && rom.nes.chr > 8192) box.info.appendChild(el("p", "small muted", "This cartridge switches between several sets of tile drawings (mapper " + rom.nes.mapper + "); the first set is shown, so some tiles may look wrong."));
    } else if (view === "tiles") {
        box.info.textContent = "";
        if (lastPicture) {
            const u = uniqueBlocks(lastPicture);
            stat(box.info, "8 × 8 squares on screen", String(u.total));
            stat(box.info, "Different squares", `${u.unique} (${Math.round((1 - u.unique / u.total) * 100)} % are repeats)`);
        }
        if (!isNes()) { nesOnly(box.info, "The tile drawings"); return; }
        if (!nes) return;
        const used = new Set();
        for (let i = 0; i < 960; i++) used.add(nes.ntar[i]);
        drawChr(box.canvas, box.palSel.value, { table: nes.ctrl & 0x10 ? 1 : 0, tiles: used }, box.tile);
        tileDetail();
        if (rom && rom.nes) stat(box.info, "Graphics in cartridge", rom.nes.chr ? `${rom.nes.chr / 1024} KB (${rom.nes.chr / 16} tiles)` : "drawn by the program (CHR RAM)");
        if (!chrBytes()) box.info.appendChild(el("p", "small muted", "This cartridge's tile drawings could not be read."));
    } else if (view === "sound") {
        drawWave(box.wave, false);
        drawWave(box.spec, true);
        box.channels.textContent = "";
        if (isNes() && nes) {
            const t = el("table", "hb-controls cls-table");
            const head = t.createTHead().insertRow();
            for (const h of ["Channel", "Playing", "Sound", "Volume", "Pitch", "Usually"]) head.appendChild(el("th", null, h));
            const body = t.createTBody();
            for (const c of apuChannels()) {
                const r = body.insertRow();
                r.insertCell().textContent = c.name;
                const p = r.insertCell();
                p.appendChild(el("span", "cls-led" + (c.active ? " on" : ""), c.active ? "on" : "off"));
                r.insertCell().textContent = c.wave;
                r.insertCell().textContent = c.active ? c.volume : "–";
                r.insertCell().textContent = c.freq && c.active ? `${Math.round(c.freq)} Hz ${noteName(c.freq)}` : "–";
                r.insertCell().textContent = c.use;
            }
            box.channels.appendChild(t);
        } else nesOnly(box.channels, "The channel list");
    } else if (view === "memory") {
        box.info.textContent = "";
        box.facts.textContent = "";
        const rows = [];
        if (isNes() && nes) {
            drawHeat(box.canvas);
            const recent = heat.reduce((n, v) => n + (v > 0.3 ? 1 : 0), 0);
            stat(box.info, "Working memory", "2,048 bytes");
            stat(box.info, "Bytes changing now", String(recent));
            stat(box.info, "Save state size", (nes.size / 1024).toFixed(1) + " KB");
            updateWatch();
            rows.push(["Working memory (RAM)", "2 KB", "Everything the game remembers"], ["Video memory", "2 KB", "Two screens of tile numbers"], ["Sprite memory", "256 bytes", "64 sprites × 4 bytes"], ["Palette memory", "32 bytes", "8 palettes × 4 colours"]);
            if (rom && rom.nes) rows.push(["Cartridge program", rom.nes.prg / 1024 + " KB", "Code and data (PRG ROM)"], ["Cartridge graphics", rom.nes.chr ? rom.nes.chr / 1024 + " KB" : "none (CHR RAM)", "Tile drawings (CHR)"], ["Cartridge type", "mapper " + rom.nes.mapper, rom.nes.mapper === 0 ? "NROM: no extra chips" : "extra chips switch in more memory"]);
        } else nesOnly(box.info, "The memory map");
        if (rom) rows.push(["This game file", (rom.size / 1024).toFixed(1) + " KB", `${Math.round(3 * 1024 * 1024 / rom.size)} copies fit in one 3 MB phone photo`]);
        if (rows.length) {
            const t = el("table", "hb-controls cls-table");
            const body = t.createTBody();
            for (const r of rows) { const tr = body.insertRow(); for (const v of r) tr.insertCell().textContent = v; }
            box.facts.appendChild(t);
        }
    } else if (view === "timing") {
        box.info.textContent = "";
        const fps = measuredFps();
        stat(box.info, "Frame", emu ? String(safeFrame()) : "–");
        stat(box.info, "Frames per second", emu ? (emu.paused ? "paused" : fps.toFixed(1)) : "–");
        stat(box.info, "Budget per frame", game && /^(nes|snes|gb|gbc|gba|segaMD|segaMS|segaGG|atari2600|n64)$/.test(game.system) ? "16.7 ms (60 per second)" : "about 16.7 ms");
        stat(box.info, "Speed", slow ? "slow motion (¼)" : "normal");
        drawTiming(box.canvas);
    } else if (view === "input") {
        drawPad(box.pad);
        box.log.textContent = "";
        for (const e of input.log) box.log.appendChild(el("li", e.down ? "down" : "up", `Frame ${e.frame} · ${e.name} ${e.down ? "pressed" : e.held === null ? "released" : e.held === 0 ? "released in the same frame (the game may have missed it)" : `released after ${e.held} frame${e.held === 1 ? "" : "s"} (${Math.round(e.held * 16.7)} ms)`}`));
        box.held.textContent = input.shortest === null ? "Press and release a button as fast as you can." : `Shortest press so far: ${input.shortest} frame${input.shortest === 1 ? "" : "s"} (about ${Math.round(input.shortest * 16.7)} ms).`;
        if (!input.log.length) box.log.appendChild(el("li", "muted", "Press a button in the game."));
    }
}
function trackRam() {
    if (ramPrev) {
        for (let i = 0; i < 2048; i++) {
            heat[i] *= 0.55;
            if (nes.ram[i] !== ramPrev[i]) { heat[i] = 1; changes[i]++; }
        }
    }
    ramPrev = nes.ram;
}
function drawHeat(canvas) {
    const ctx = canvas.getContext("2d");
    const cw = canvas.width / 64, ch = canvas.height / 32;
    for (let a = 0; a < 2048; a++) {
        const v = nes.ram[a] / 255;
        const h = heat[a];
        const r = Math.round(20 + v * 90 + h * 200), g = Math.round(26 + v * 110 - h * 20), b = Math.round(40 + v * 140 - h * 60);
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.max(0, g)},${Math.max(0, b)})`;
        ctx.fillRect((a % 64) * cw, Math.floor(a / 64) * ch, cw - 1, ch - 1);
    }
}
function measuredFps() {
    const s = timing.stamps;
    if (s.length < 2) return 0;
    const span = (s[s.length - 1].t - s[0].t) / 1000;
    const frames = s[s.length - 1].f - s[0].f;
    return span > 0 ? frames / span : 0;
}
function drawTiming(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const max = 50;
    const y = (ms) => canvas.height - Math.min(ms, max) / max * canvas.height;
    const list = timing.intervals.slice(-120);
    const bw = canvas.width / 120;
    list.forEach((ms, i) => {
        ctx.fillStyle = ms > 20 ? "#e8a33d" : "#1aafff";
        ctx.fillRect(i * bw, y(ms), bw - 1, canvas.height - y(ms));
    });
    ctx.strokeStyle = "#fff";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y(16.7));
    ctx.lineTo(canvas.width, y(16.7));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fff";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("16.7 ms", 6, y(16.7) - 4);
}
const PAD_LAYOUT = {
    nes: [["Up", 4], ["Down", 5], ["Left", 6], ["Right", 7], ["Select", 2], ["Start", 3], ["B", 0], ["A", 8]],
    snes: [["Up", 4], ["Down", 5], ["Left", 6], ["Right", 7], ["Select", 2], ["Start", 3], ["Y", 1], ["X", 9], ["B", 0], ["A", 8], ["L", 10], ["R", 11]]
};
function drawPad(host) {
    const layout = PAD_LAYOUT[game && game.system] || PAD_LAYOUT[game && /^(gb|gbc|gba)$/.test(game.system) ? "nes" : "snes"];
    if (!host.dataset.built || host.dataset.built !== (game ? game.system : "")) {
        host.textContent = "";
        for (const [name, index] of layout) {
            const b = el("span", "cls-btn cls-btn-" + name.toLowerCase(), name);
            b.dataset.index = index;
            host.appendChild(b);
        }
        host.dataset.built = game ? game.system : "";
    }
    for (const b of host.children) b.classList.toggle("on", !!input.pressed.get(Number(b.dataset.index)));
}

// ---------- loops ----------
function frameLoop(now) {
    if (emu) {
        const f = safeFrame();
        if (f !== timing.last) {
            if (timing.last >= 0 && timing.stamps.length) {
                const prev = timing.stamps[timing.stamps.length - 1];
                const df = f - prev.f;
                if (df > 0 && df < 10) for (let k = 0; k < df; k++) timing.intervals.push((now - prev.t) / df);
            }
            timing.stamps.push({ f, t: now });
            while (timing.stamps.length > 1 && now - timing.stamps[0].t > 1000) timing.stamps.shift();
            if (timing.intervals.length > 240) timing.intervals.splice(0, timing.intervals.length - 240);
            timing.last = f;
            $("clsFrameNo").textContent = "Frame " + f;
        }
        if (view === "input" && panel) drawPad(panel.pad);
        if (view === "sound" && panel && panel.wave) { drawWave(panel.wave, false); drawWave(panel.spec, true); }
        if (emu.paused !== frameLoop.paused) { frameLoop.paused = emu.paused; updateTransport(); }
    }
    requestAnimationFrame(frameLoop);
}
requestAnimationFrame(frameLoop);
setInterval(() => { if (emu && !emu.paused && !document.hidden) render(false); }, 250);

// ---------- lessons ----------
function renderCards() {
    const host = $("clsCards");
    host.textContent = "";
    for (const l of LESSONS) {
        const li = el("li", "card cls-card");
        li.appendChild(el("h3", null, l.title));
        li.appendChild(el("p", "small muted", l.age + " · 45 minutes"));
        li.appendChild(el("p", null, l.summary));
        const row = el("div", "buttons");
        const open = el("button", "primary", "Teach this lesson");
        open.type = "button";
        open.addEventListener("click", () => openLesson(l.id));
        const ws = el("button", null, "Print worksheet");
        ws.type = "button";
        ws.addEventListener("click", () => printWorksheet(l, false));
        row.append(open, ws);
        li.appendChild(row);
        host.appendChild(li);
    }
}
function openLesson(id) {
    const l = LESSONS.find((x) => x.id === id);
    if (!l) return;
    const box = $("clsLesson");
    box.hidden = false;
    box.textContent = "";
    const head = el("div", "cls-lesson-head");
    head.appendChild(el("h2", null, l.title));
    const tools = el("div", "buttons");
    for (const [label, fn] of [["▶ Start teaching", () => startTeaching(l)], ["Print worksheet", () => printWorksheet(l, false)], ["Print answer key and plan", () => printWorksheet(l, true)], ["Close", () => { endTeaching(); box.hidden = true; history.replaceState(null, "", withParam("lesson", null)); }]]) {
        const b = el("button", label === "▶ Start teaching" ? "primary" : "", label);
        b.type = "button";
        b.addEventListener("click", fn);
        tools.appendChild(b);
    }
    head.appendChild(tools);
    box.appendChild(head);
    box.appendChild(el("p", null, l.summary));
    const plan = el("ol", "cls-plan");
    let at = 0;
    for (const s of l.plan) {
        const li = el("li");
        li.appendChild(el("span", "cls-time", `${at}–${at + s.min} min`));
        at += s.min;
        const body = el("div");
        body.appendChild(el("strong", null, s.title));
        body.appendChild(el("p", null, s.text));
        if (s.show) {
            const b = el("button", "cls-show", "Show me");
            b.type = "button";
            b.addEventListener("click", () => showStep(s.show));
            body.appendChild(b);
        }
        li.appendChild(body);
        plan.appendChild(li);
    }
    box.appendChild(el("h3", null, "Plan for 45 minutes"));
    box.appendChild(plan);
    const cols = el("div", "cls-two");
    const facts = el("div");
    facts.appendChild(el("h3", null, "Key facts"));
    const fl = el("ul");
    for (const f of l.facts) fl.appendChild(el("li", null, f));
    facts.appendChild(fl);
    const qs = el("div");
    qs.appendChild(el("h3", null, "Questions to discuss"));
    const ql = el("ul");
    for (const q of l.questions) ql.appendChild(el("li", null, q));
    qs.appendChild(ql);
    cols.append(facts, qs);
    box.appendChild(cols);
    if (l.quiz && l.quiz.length) box.appendChild(quizBox(l));
    history.replaceState(null, "", withParam("lesson", l.id));
    box.scrollIntoView({ behavior: "smooth", block: "start" });
}
function withParam(key, value) {
    const url = new URL(location.href);
    if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value);
    return url;
}
async function showStep(show) {
    if (show.view) setView(show.view);
    if (show.overlay) { overlays[show.overlay] = true; buildPanel(); }
    if (show.game && (!game || game.id !== show.game || !emu)) {
        $("cls").querySelector(".cls-stage").scrollIntoView({ behavior: "smooth", block: "start" });
        await loadGame(show.game);
    }
    // After loading: a new game starts with an empty watch list
    if (show.watch) for (const a of show.watch) addWatch(a);
    if (emu && show.pause && !emu.paused) togglePlay();
    if (emu && show.play && emu.paused) togglePlay();
    render(true);
    $("cls").querySelector(".cls-stage").scrollIntoView({ behavior: "smooth", block: "start" });
    focusGame();
}
function printWorksheet(l, teacher) {
    const p = $("clsPrint");
    p.textContent = "";
    const sheet = el("article", "ws");
    const top = el("div", "ws-top");
    for (const f of ["Name", "Class", "Date"]) top.appendChild(el("span", null, f + ": ________________"));
    if (!teacher) sheet.appendChild(top);
    sheet.appendChild(el("h1", null, l.title + (teacher ? " (answer key)" : "")));
    sheet.appendChild(el("p", "ws-intro", l.worksheet.intro + (teacher ? "" : " Write your answers in the spaces.")));
    const list = el("ol", "ws-items");
    for (const item of l.worksheet.items) {
        const li = el("li");
        li.appendChild(el("p", "ws-q", item.q));
        if (item.table) {
            const t = el("table", "ws-table");
            const hr = t.createTHead().insertRow();
            for (const h of item.table.head) hr.appendChild(el("th", null, h));
            const b = t.createTBody();
            for (const row of item.table.rows) { const tr = b.insertRow(); for (const c of row) tr.insertCell().textContent = c; }
            li.appendChild(t);
        } else if (item.grid && !teacher) {
            const g = el("table", "ws-grid ws-grid-" + item.grid);
            const b = g.createTBody();
            for (let y = 0; y < item.grid; y++) { const tr = b.insertRow(); for (let x = 0; x < item.grid; x++) tr.insertCell(); }
            li.appendChild(g);
        } else if (!teacher) {
            for (let i = 0; i < (item.lines || 1); i++) li.appendChild(el("div", "ws-line"));
        }
        if (teacher) li.appendChild(el("p", "ws-answer", "Answer: " + item.answer));
        list.appendChild(li);
    }
    sheet.appendChild(list);
    if (l.quiz && l.quiz.length) {
        sheet.appendChild(el("h2", null, teacher ? "Exit ticket answers" : "Exit ticket: circle one answer for each"));
        const q = el("ol", "ws-quiz");
        for (const item of l.quiz) {
            const li = el("li");
            li.appendChild(el("p", "ws-q", item.q));
            if (teacher) li.appendChild(el("p", "ws-answer", `Answer: ${"ABCD"[item.answer]}. ${item.options[item.answer]}${item.why ? " · " + item.why : ""}`));
            else li.appendChild(el("p", "ws-options", item.options.map((o, i) => `${"ABCD"[i]}. ${o}`).join("     ")));
            q.appendChild(li);
        }
        sheet.appendChild(q);
    }
    if (teacher) {
        sheet.appendChild(el("h2", null, "Plan for 45 minutes"));
        const plan = el("ol", "ws-plan");
        let at = 0;
        for (const s of l.plan) { plan.appendChild(el("li", null, `${at}–${at + s.min} min · ${s.title}: ${s.text}`)); at += s.min; }
        sheet.appendChild(plan);
        sheet.appendChild(el("h2", null, "Key facts"));
        const fl = el("ul");
        for (const f of l.facts) fl.appendChild(el("li", null, f));
        sheet.appendChild(fl);
        sheet.appendChild(el("h2", null, "Questions to discuss"));
        const ql = el("ul");
        for (const q of l.questions) ql.appendChild(el("li", null, q));
        sheet.appendChild(ql);
    }
    sheet.appendChild(el("p", "ws-foot", "EmulatorJS local edition · Classroom: how retro games work · " + location.host));
    p.appendChild(sheet);
    document.body.classList.add("cls-printing");
    const done = () => { document.body.classList.remove("cls-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 50);
}

// ---------- exit ticket: a short quiz with instant answers ----------
function quizBox(l) {
    const box = el("section", "cls-quiz");
    box.appendChild(el("h3", null, "Exit ticket"));
    box.appendChild(el("p", "small muted", "A quick check at the end of the lesson: read each question out, or let students take turns at the screen. It is also on the printed worksheet."));
    const score = el("p", "cls-quiz-score");
    const answered = new Map();
    const update = () => { score.textContent = answered.size ? `${[...answered.values()].filter(Boolean).length} of ${answered.size} right so far (${l.quiz.length} questions).` : ""; };
    l.quiz.forEach((item, qi) => {
        const q = el("div", "cls-quiz-q");
        q.appendChild(el("p", "cls-quiz-text", `${qi + 1}. ${item.q}`));
        const opts = el("div", "cls-quiz-opts");
        const why = el("p", "small cls-quiz-why");
        item.options.forEach((o, oi) => {
            const b = el("button", null, `${"ABCD"[oi]}. ${o}`);
            b.type = "button";
            b.addEventListener("click", () => {
                if (answered.has(qi)) return;
                const right = oi === item.answer;
                answered.set(qi, right);
                b.classList.add(right ? "right" : "wrong");
                if (!right) opts.children[item.answer].classList.add("right");
                for (const x of opts.children) x.disabled = true;
                why.textContent = (right ? "Right. " : `Not quite: it's ${"ABCD"[item.answer]}. `) + (item.why || "");
                update();
            });
            opts.appendChild(b);
        });
        q.append(opts, why);
        box.appendChild(q);
    });
    const again = el("button", null, "Start again");
    again.type = "button";
    again.addEventListener("click", () => box.replaceWith(quizBox(l)));
    box.append(score, again);
    return box;
}

// ---------- presenter: one step at a time, with a clock for the step and the lesson ----------
let run = null;    // { l, i, startAt, stepAt, timer }
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
let wakeLock = null;
function startTeaching(l) {
    endTeaching();
    run = { l, i: -1, startAt: Date.now(), stepAt: Date.now() };
    $("clsPresenter").hidden = false;
    document.body.classList.add("cls-presenting");
    run.timer = setInterval(updatePresenter, 1000);
    try { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then((w) => { wakeLock = w; }).catch(() => {}); } catch (e) { /* not allowed */ }
    gotoStep(0);
}
function endTeaching(finished) {
    if (!run) return;
    clearInterval(run.timer);
    if (finished) banner(`Lesson finished in ${mmss((Date.now() - run.startAt) / 1000)} (planned ${run.l.plan.reduce((n, s) => n + s.min, 0)} minutes).`, "ok");
    run = null;
    $("clsPresenter").hidden = true;
    document.body.classList.remove("cls-presenting");
    for (const li of document.querySelectorAll("#clsLesson .cls-plan > li")) li.classList.remove("on");
    try { if (wakeLock) wakeLock.release(); } catch (e) { /* gone */ }
    wakeLock = null;
}
function gotoStep(i, fromGame) {
    if (!run) return;
    if (i >= run.l.plan.length) return endTeaching(true);
    run.i = Math.max(0, i);
    run.stepAt = Date.now();
    const s = run.l.plan[run.i];
    const items = document.querySelectorAll("#clsLesson .cls-plan > li");
    items.forEach((li, k) => li.classList.toggle("on", k === run.i));
    $("clsPresShow").hidden = !s.show;
    $("clsPresPrev").disabled = run.i === 0;
    $("clsPresNext").textContent = run.i === run.l.plan.length - 1 ? "Finish" : "Next →";
    updatePresenter();
    if (s.show) showStep(s.show);
    else if (items[run.i]) items[run.i].scrollIntoView({ behavior: "smooth", block: "center" });
    if (!fromGame) $("clsPresNext").focus({ preventScroll: true });
}
function updatePresenter() {
    if (!run) return;
    const s = run.l.plan[run.i];
    const total = run.l.plan.reduce((n, x) => n + x.min, 0);
    const stepSec = (Date.now() - run.stepAt) / 1000;
    $("clsPresStep").textContent = `${run.l.title.split(":")[0]} · step ${run.i + 1} of ${run.l.plan.length}: ${s.title}`;
    $("clsPresNote").textContent = s.text;
    $("clsPresClock").textContent = `${mmss(stepSec)} of ${s.min}:00 · lesson ${mmss((Date.now() - run.startAt) / 1000)} of ${total}:00`;
    $("clsPresClock").classList.toggle("over", stepSec > s.min * 60);
}
$("clsPresNext").addEventListener("click", () => run && gotoStep(run.i + 1));
$("clsPresPrev").addEventListener("click", () => run && gotoStep(run.i - 1));
$("clsPresShow").addEventListener("click", () => { if (run && run.l.plan[run.i].show) showStep(run.l.plan[run.i].show); });
$("clsPresEnd").addEventListener("click", () => endTeaching());
document.addEventListener("keydown", (e) => {
    if (!run || e.target.closest("input, select, textarea")) return;
    // Presentation clickers send Page Down and Page Up
    if (e.key === "PageDown") { e.preventDefault(); gotoStep(run.i + 1); }
    else if (e.key === "PageUp") { e.preventDefault(); gotoStep(run.i - 1); }
});

// ---------- a link to this game, view and lesson ----------
$("clsLink").addEventListener("click", async () => {
    const url = new URL("classroom.html", location.href);
    if (game) url.searchParams.set("game", game.id);
    url.searchParams.set("view", view);
    const lesson = new URL(location.href).searchParams.get("lesson");
    if (lesson && !$("clsLesson").hidden) url.searchParams.set("lesson", lesson);
    try {
        await navigator.clipboard.writeText(url.href);
        banner("Link copied: it opens this game, view and lesson.", "ok");
    } catch (e) {
        banner("Copy this link: " + url.href, "ok");
    }
});

// ---------- start ----------
async function main() {
    renderCards();
    setView(view);
    updateTransport();
    await loadManifest();
    catalog = await loadCatalog();
    const select = $("clsGame");
    let group = null, last = null;
    for (const g of catalog) {
        if (g.source !== last) {
            group = document.createElement("optgroup");
            group.label = g.source;
            select.appendChild(group);
            last = g.source;
        }
        group.appendChild(new Option(`${g.title} (${labelFor(g.system)})`, g.id));
    }
    if (!catalog.length) {
        $("clsWait").textContent = "No games found. Add games to the Homebrew showcase, the data/ library folders or My Collection.";
        $("clsLoad").disabled = true;
    }
    const wanted = params.get("game") || "hb:sprite-lab";
    if (catalog.some((g) => g.id === wanted)) select.value = wanted;
    if (params.get("lesson")) openLesson(params.get("lesson"));
    setupServiceWorker({ shouldReload: () => !emu }).catch(() => {});
    if (params.get("game") && catalog.some((g) => g.id === wanted && isAvailable(g.system))) loadGame(wanted);
}
main();
