// Use case 7, Accessible and comfort play: one place for options that make games playable for more people.
// The game runs in an embedded player (play.html?embed=1&analyser=1, same origin). This page sits on the
// emulator's input function, so every press from the keyboard, a controller, the touch pad or the switch passes
// through the comfort rules (hold-to-toggle, auto-fire, one-switch) before the game sees it.
// Settings: localStorage "ejs-comfort" = { last: {preset, settings}, games: { <game id>: {preset, settings} } }.
import { $, banner, loadManifest, isAvailable, setupServiceWorker } from "./common.js";
import { labelFor } from "./detect.js";
import { loadCatalog } from "./catalog.js";
import { initDevice, device } from "./mobile.js";

initDevice();
const params = new URLSearchParams(location.search);
const STORE = "ejs-comfort";

// RetroPad buttons
const BTN = { b: 0, y: 1, select: 2, start: 3, up: 4, down: 5, left: 6, right: 7, a: 8, x: 9, l: 10, r: 11 };
const BTN_NAME = { 0: "B", 1: "Y", 2: "Select", 3: "Start", 4: "Up", 5: "Down", 6: "Left", 7: "Right", 8: "A", 9: "X", 10: "L", 11: "R" };
const DEFAULTS = {
    speed: 1, rewind: false, autosave: 0,
    turbo: [], turboRate: 10, toggle: [], hand: "none",
    pad: "auto", padSize: 1.3, padOpacity: 0.8, padPos: { dpad: [3, 55], face: [72, 55], mid: [40, 84] },
    filter: "none", brightness: 1, contrast: 1, bigUi: false,
    captions: false, flash: false,
    scan: false, scanSeconds: 1.5, latch: true, holdMs: 300, anyKey: false,
    scanActions: ["right", "left", "up", "down", "a", "b", "start", "pause"]
};
const PRESETS = {
    standard: { label: "Standard", note: "The game as it was made.", set: {} },
    relaxed: { label: "Relaxed", note: "Three-quarter speed, rewind, an automatic save every 2 minutes and sound captions.", set: { speed: 0.75, rewind: true, autosave: 2, captions: true } },
    lowVision: { label: "Low vision", note: "High contrast, brighter picture, larger controls and text, captions and a flash for sounds.", set: { filter: "contrast", brightness: 1.1, contrast: 1.35, bigUi: true, padSize: 1.7, captions: true, flash: true } },
    oneHand: { label: "One hand", note: "Run (B) stays held after one press, A fires on its own while held, and every key or touch button sits under one hand.", set: { toggle: [0], turbo: [8], hand: "left", padPos: { dpad: [58, 18], face: [64, 68], mid: [56, 3] }, padSize: 1.2, rewind: true } },
    oneSwitch: { label: "One switch", note: "One button plays the whole game: the highlight moves through the actions and a press chooses one. Directions stay held until the next press. Slower speed and rewind help.", set: { scan: true, speed: 0.6, rewind: true, autosave: 1, pad: "never" } }
};
const SCAN_ACTIONS = {
    right: { label: "→ Right", index: BTN.right, dir: true }, left: { label: "← Left", index: BTN.left, dir: true },
    up: { label: "↑ Up", index: BTN.up, dir: true }, down: { label: "↓ Down", index: BTN.down, dir: true },
    a: { label: "A", index: BTN.a }, b: { label: "B", index: BTN.b }, x: { label: "X", index: BTN.x }, y: { label: "Y", index: BTN.y },
    l: { label: "L", index: BTN.l }, r: { label: "R", index: BTN.r }, start: { label: "Start", index: BTN.start }, select: { label: "Select", index: BTN.select },
    pause: { label: "⏸ Pause", special: "pause" }, rewind: { label: "⏪ Rewind 2 s", special: "rewind" }, save: { label: "💾 Save", special: "save" }
};
const HAND_KEYS = {
    left: { KeyW: BTN.up, KeyS: BTN.down, KeyA: BTN.left, KeyD: BTN.right, Space: BTN.a, ShiftLeft: BTN.b, KeyQ: BTN.select, KeyE: BTN.start, KeyR: "rewind", KeyF: "save", KeyV: "load" },
    right: { ArrowUp: BTN.up, ArrowDown: BTN.down, ArrowLeft: BTN.left, ArrowRight: BTN.right, Enter: BTN.a, ShiftRight: BTN.b, Slash: BTN.select, Backslash: BTN.start, Quote: "rewind", BracketRight: "save", BracketLeft: "load" }
};
const HAND_HELP = {
    left: "W A S D move · Space = A · Left Shift = B · Q = Select · E = Start · R = rewind (hold) · F = save · V = load save",
    right: "Arrow keys move · Enter = A · Right Shift = B · / = Select · \\ = Start · ' = rewind (hold) · ] = save · [ = load save"
};

const clone = (o) => JSON.parse(JSON.stringify(o));
function readStore() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; } }
function writeStore(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* storage blocked */ } }
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

let catalog = [];
let game = null;
let win = null, emu = null, fns = null, original = null;
let preset = "standard";
let settings = Object.assign(clone(DEFAULTS), clone(PRESETS.standard.set));
const status = (t) => { $("cfStatus").textContent = t; };

function presetSettings(id) {
    return Object.assign(clone(DEFAULTS), clone(PRESETS[id].set));
}
function remember() {
    const s = readStore();
    s.last = { preset, settings };
    if (game) { s.games = s.games || {}; s.games[game.id] = { preset, settings }; }
    writeStore(s);
}
function recall(id) {
    const s = readStore();
    const saved = (s.games && s.games[id]) || s.last;
    if (saved && saved.settings) {
        preset = saved.preset || "custom";
        settings = Object.assign(clone(DEFAULTS), saved.settings);
    }
}

// ---------- the game ----------
function frameSrc(g) {
    const q = new URLSearchParams({ embed: "1", analyser: "1", engine: "emulatorjs" });
    if (settings.rewind) q.set("rewind", "1");
    if (g.cid) q.set("cid", g.cid);
    else { q.set("url", g.url); q.set("core", g.core || g.system); }
    return "play.html?" + q.toString();
}
async function loadGame(id, keepSettings) {
    const g = catalog.find((c) => c.id === id);
    if (!g) return;
    stopEverything();
    game = g;
    $("cfGame").value = g.id;
    if (!keepSettings) { recall(g.id); renderPresets(); renderSettings(); }
    const url = new URL(location.href);
    url.searchParams.set("game", g.id);
    history.replaceState(null, "", url);
    emu = win = fns = original = null;
    const old = $("cfFrame");
    const frame = document.createElement("iframe");
    frame.id = "cfFrame";
    frame.title = "Game: " + g.title;
    frame.setAttribute("allow", old.getAttribute("allow"));
    old.replaceWith(frame);
    $("cfWait").hidden = false;
    $("cfWait").textContent = "Starting " + g.title + "…";
    applyVisual();
    frame.src = frameSrc(g);
    const started = await new Promise((resolve) => {
        const t0 = Date.now();
        const check = setInterval(() => {
            if (frame !== $("cfFrame")) { clearInterval(check); return resolve(false); }
            const E = frame.contentWindow && frame.contentWindow.EJS_emulator;
            if (E && E.started) { clearInterval(check); resolve(true); }
            else if ((E && E.failedToStart) || Date.now() - t0 > 90000) { clearInterval(check); resolve(false); }
        }, 250);
    });
    if (!started) { $("cfWait").textContent = g.title + " could not start."; return; }
    $("cfWait").hidden = true;
    win = frame.contentWindow;
    emu = win.EJS_emulator;
    hookInput();
    hookKeys();
    applyAll();
    status(`${g.title} is running with the ${preset === "custom" ? "custom" : PRESETS[preset].label} settings.`);
    if (!settings.scan) try { win.focus(); } catch (e) { /* frame gone */ }
}
function stopEverything() {
    stopScan();
    clearInterval(autosaveTimer);
    for (const t of turboTimers.values()) clearInterval(t);
    turboTimers.clear();
    raw.clear();
    held.clear();
    latched = null;
}

// ---------- input: hold-to-toggle, auto-fire, one switch ----------
const raw = new Map();
const held = new Map();
const turboTimers = new Map();
let injecting = false;
function hookInput() {
    fns = emu.gameManager.functions;
    original = fns.simulateInput;
    fns.simulateInput = (player, index, value) => {
        if (player !== 0 || index >= 16) return original(player, index, value);
        // One switch: only the switch drives the game, so stray keys or a controller can't interfere
        if (settings.scan && !injecting) return;
        const down = value !== 0;
        const was = !!raw.get(index);
        raw.set(index, down);
        if (settings.toggle.includes(index)) {
            if (down && !was) {
                const now = !held.get(index);
                held.set(index, now);
                status(`${BTN_NAME[index]} is ${now ? "held down" : "released"}.`);
                return original(player, index, now ? 1 : 0);
            }
            return;
        }
        if (settings.turbo.includes(index)) {
            if (down && !was) startTurbo(index);
            else if (!down && was) stopTurbo(index);
            return;
        }
        return original(player, index, value);
    };
}
function send(index, down) {
    if (!fns) return;
    injecting = true;
    try { fns.simulateInput(0, index, down ? 1 : 0); } finally { injecting = false; }
}
function startTurbo(index) {
    if (turboTimers.has(index)) return;
    let on = true;
    original(0, index, 1);
    turboTimers.set(index, setInterval(() => {
        on = !on;
        original(0, index, on ? 1 : 0);
    }, Math.max(25, 500 / Math.max(1, settings.turboRate))));
}
function stopTurbo(index) {
    clearInterval(turboTimers.get(index));
    turboTimers.delete(index);
    original(0, index, 0);
}
function rewind(down) {
    if (!emu) return;
    if (!emu.rewindEnabled) {
        if (down) status("Rewind is off for this game: switch it on under Speed and time (the game restarts).");
        return;
    }
    emu.gameManager.simulateInput(0, 28, down ? 1 : 0);
    if (down) status("Rewinding… let go to carry on.");
}
function hookKeys() {
    const map = () => HAND_KEYS[settings.hand] || null;
    const onKey = (e) => {
        const down = e.type === "keydown";
        if (down && e.ctrlKey && (e.key === "m" || e.key === "M")) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $("cfPanel").focus();
            return;
        }
        const m = map();
        const target = m ? m[e.code] : undefined;
        if (target !== undefined) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.repeat) return;
            if (target === "rewind") rewind(down);
            else if (target === "save") { if (down) saveNow(); }
            else if (target === "load") { if (down) loadSave(); }
            else send(target, down);
            return;
        }
        if (e.code === "Backspace") {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!e.repeat) rewind(down);
            return;
        }
        if (down && !e.repeat && (e.key === "-" || e.key === "=" || e.key === "+")) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const steps = [0.25, 0.5, 0.6, 0.75, 0.85, 1];
            let i = steps.findIndex((s) => s >= settings.speed - 0.001);
            i = Math.max(0, Math.min(steps.length - 1, i + (e.key === "-" ? -1 : 1)));
            change("speed", steps[i]);
            renderSettings();
        }
    };
    win.addEventListener("keydown", onKey, true);
    win.addEventListener("keyup", onKey, true);
}

// ---------- saving ----------
let autosaveTimer = null;
function saveNow(slot = "7", quiet) {
    if (!emu) return;
    try {
        const ok = emu.gameManager.quickSave(slot);
        if (!quiet) status(ok === false ? "This game can't be saved here." : "Saved.");
        if (!quiet) emu.frontend.displayMessage("SAVED");
    } catch (e) { status("Saving failed: " + e.message); }
}
function loadSave(slot = "7") {
    if (!emu) return;
    try {
        const ok = emu.gameManager.quickLoad(slot);
        status(ok === false ? "There is no save yet." : slot === "8" ? "Back to the automatic save." : "Back to your save.");
    } catch (e) { status("Loading failed: " + e.message); }
}
function applyAutosave() {
    clearInterval(autosaveTimer);
    if (emu && settings.autosave > 0) autosaveTimer = setInterval(() => {
        if (emu && !emu.paused && !document.hidden) { saveNow("8", true); status("Saved automatically at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "."); }
    }, settings.autosave * 60000);
}

// ---------- applying settings ----------
function applySpeed() {
    if (!emu) return;
    try {
        const gm = emu.gameManager;
        // Rewind in small steps (every 2 frames) so holding it goes back about as fast as the game went forward
        if (emu.rewindEnabled) gm.setRewindGranularity(2);
        if (settings.speed < 0.999) {
            gm.setSlowMotionRatio(1 / settings.speed);
            gm.toggleSlowMotion(1);
            emu.isSlowMotion = true;
        } else {
            gm.toggleSlowMotion(0);
            emu.isSlowMotion = false;
        }
    } catch (e) { /* core without slow motion */ }
}
function applyVisual() {
    const f = [];
    if (settings.filter === "contrast") f.push("contrast(1.5)", "saturate(1.35)");
    else if (settings.filter === "grey") f.push("grayscale(1)", "contrast(1.25)");
    else if (settings.filter === "invert") f.push("invert(1)", "hue-rotate(180deg)");
    else if (["protan", "deutan", "tritan"].includes(settings.filter)) f.push(`url(#cf-${settings.filter})`);
    if (settings.brightness !== 1) f.push(`brightness(${settings.brightness})`);
    if (settings.contrast !== 1 && settings.filter !== "contrast") f.push(`contrast(${settings.contrast})`);
    $("cfFrame").style.filter = f.join(" ");
    document.body.classList.toggle("cf-big", !!settings.bigUi);
}
function padWanted() {
    return !settings.scan && (settings.pad === "always" || (settings.pad === "auto" && device.touch));
}
function applyPad() {
    const pad = $("cfPad");
    const show = padWanted();
    pad.hidden = !show;
    // The player's own touch controls hide while the comfort pad is on
    try {
        const doc = win && win.document;
        if (doc) {
            let st = doc.getElementById("cf-style");
            if (!st) { st = doc.createElement("style"); st.id = "cf-style"; doc.head.appendChild(st); }
            st.textContent = show || settings.scan ? ".ejs_virtualGamepad_parent { display: none !important; }" : "";
        }
    } catch (e) { /* frame gone */ }
    if (!show) return;
    pad.style.setProperty("--cf-size", settings.padSize);
    pad.style.opacity = settings.padOpacity;
    if (!pad.dataset.built || pad.dataset.built !== (game ? game.system : "")) buildPad(pad);
    const stage = $("cfStage").getBoundingClientRect();
    for (const g of pad.querySelectorAll(".cf-group")) {
        const [x, y] = settings.padPos[g.dataset.group] || DEFAULTS.padPos[g.dataset.group];
        g.style.left = x + "%";
        g.style.top = y + "%";
        // Keep every group on the screen whatever its size and the screen's size
        const r = g.getBoundingClientRect();
        if (stage.width && r.right > stage.right) g.style.left = Math.max(0, (stage.width - r.width) / stage.width * 100) + "%";
        if (stage.height && r.bottom > stage.bottom) g.style.top = Math.max(0, (stage.height - r.height) / stage.height * 100) + "%";
    }
}
let moving = false;
window.addEventListener("resize", () => { if (!$("cfPad").hidden) applyPad(); });
function buildPad(pad) {
    pad.textContent = "";
    const snes = game && /^(snes|gba)$/.test(game.system);
    const groups = {
        dpad: [["up", "▲", BTN.up], ["left", "◀", BTN.left], ["right", "▶", BTN.right], ["down", "▼", BTN.down]],
        face: snes ? [["x", "X", BTN.x], ["y", "Y", BTN.y], ["a", "A", BTN.a], ["b", "B", BTN.b]] : [["b", "B", BTN.b], ["a", "A", BTN.a]],
        mid: [["select", "Select", BTN.select], ["start", "Start", BTN.start]]
    };
    for (const [name, buttons] of Object.entries(groups)) {
        const g = el("div", "cf-group cf-" + name + (snes && name === "face" ? " four" : ""));
        g.dataset.group = name;
        for (const [id, label, index] of buttons) {
            const b = el("button", "cf-pb cf-pb-" + id, label);
            b.type = "button";
            b.tabIndex = -1;
            b.setAttribute("aria-label", BTN_NAME[index]);
            const up = (e) => { if (moving) return; e.preventDefault(); b.classList.remove("on"); send(index, false); };
            b.addEventListener("pointerdown", (e) => {
                if (moving) return;
                e.preventDefault();
                b.setPointerCapture(e.pointerId);
                b.classList.add("on");
                send(index, true);
            });
            b.addEventListener("pointerup", up);
            b.addEventListener("pointercancel", up);
            b.addEventListener("contextmenu", (e) => e.preventDefault());
            g.appendChild(b);
        }
        // Drag a group to move it (only while "Move the touch controls" is on)
        g.addEventListener("pointerdown", (e) => {
            if (!moving) return;
            e.preventDefault();
            const stage = $("cfStage").getBoundingClientRect();
            const start = g.getBoundingClientRect();
            const dx = e.clientX - start.left, dy = e.clientY - start.top;
            g.setPointerCapture(e.pointerId);
            const move = (ev) => {
                const x = Math.max(0, Math.min(90, (ev.clientX - dx - stage.left) / stage.width * 100));
                const y = Math.max(0, Math.min(92, (ev.clientY - dy - stage.top) / stage.height * 100));
                g.style.left = x + "%";
                g.style.top = y + "%";
                settings.padPos = Object.assign({}, settings.padPos, { [name]: [Math.round(x), Math.round(y)] });
            };
            const end = () => { g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", end); markCustom(); remember(); };
            g.addEventListener("pointermove", move);
            g.addEventListener("pointerup", end);
        });
        pad.appendChild(g);
    }
    pad.dataset.built = game ? game.system : "";
}
function applyAll() {
    applySpeed();
    applyVisual();
    applyPad();
    applyAutosave();
    applyScan();
    applyCaptions();
    // Hold-to-toggle and auto-fire buttons that were just switched off are let go
    for (const [i, on] of held) if (on && !settings.toggle.includes(i)) { held.set(i, false); original && original(0, i, 0); }
    for (const i of [...turboTimers.keys()]) if (!settings.turbo.includes(i)) stopTurbo(i);
}

// ---------- one switch ----------
let scanIndex = 0, scanTimer = null, latched = null, lastSwitch = 0;
const scanList = () => settings.scanActions.filter((a) => SCAN_ACTIONS[a]);
function applyScan() {
    const on = !!settings.scan && !!emu;
    $("cfScan").hidden = !on;
    $("cfSwitchArea").hidden = !on;
    const frame = $("cfFrame");
    frame.style.pointerEvents = on ? "none" : "";
    frame.tabIndex = on ? -1 : 0;
    if (!on) { stopScan(); if (latched !== null) { send(latched, false); latched = null; } return; }
    renderScan();
    if (document.activeElement === frame) document.activeElement.blur();
    startScan();
}
function renderScan() {
    const bar = $("cfScan");
    bar.textContent = "";
    scanList().forEach((id, i) => {
        const t = el("span", "cf-scan-item" + (i === scanIndex ? " on" : ""), SCAN_ACTIONS[id].label);
        if (latched !== null && SCAN_ACTIONS[id].index === latched) t.classList.add("held");
        bar.appendChild(t);
    });
    const hint = el("span", "cf-scan-hint", latched !== null ? "Holding " + BTN_NAME[latched] + ": press the switch to let go" : "Press the switch (Space, Enter, a tap or any controller button) when your action lights up");
    bar.appendChild(hint);
}
function startScan() {
    stopScan();
    scanTimer = setInterval(() => {
        const n = scanList().length;
        if (!n) return;
        scanIndex = (scanIndex + 1) % n;
        renderScan();
    }, Math.max(0.4, settings.scanSeconds) * 1000);
}
function stopScan() { clearInterval(scanTimer); scanTimer = null; }
function switchPress() {
    if (!settings.scan || !emu) return;
    const t = performance.now();
    if (t - lastSwitch < 250) return; // a bouncing switch counts once
    lastSwitch = t;
    if (latched !== null) {
        send(latched, false);
        latched = null;
        renderScan();
        startScan();
        return;
    }
    const id = scanList()[scanIndex];
    const act = SCAN_ACTIONS[id];
    if (!act) return;
    if (act.special === "pause") togglePause();
    else if (act.special === "save") saveNow();
    else if (act.special === "rewind") { rewind(true); setTimeout(() => rewind(false), 2000); }
    else if (act.dir && settings.latch) {
        send(act.index, true);
        latched = act.index;
        stopScan();
    } else {
        send(act.index, true);
        setTimeout(() => send(act.index, false), settings.holdMs);
    }
    renderScan();
    if (latched === null) startScan();
}
window.addEventListener("keydown", (e) => {
    if (!settings.scan || !emu) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.target && e.target.closest && e.target.closest(".cf-panel") && !settings.anyKey) return;
    if (e.code === "Space" || e.code === "Enter" || (settings.anyKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== "Tab")) {
        e.preventDefault();
        if (!e.repeat) switchPress();
    }
});
$("cfSwitchArea").addEventListener("pointerdown", (e) => { e.preventDefault(); switchPress(); });
const padPrev = new Map();
setInterval(() => {
    if (!settings.scan || !emu || !navigator.getGamepads) return;
    for (const p of navigator.getGamepads()) {
        if (!p) continue;
        const pressed = p.buttons.some((b) => b.pressed);
        if (pressed && !padPrev.get(p.index)) switchPress();
        padPrev.set(p.index, pressed);
    }
}, 50);

// ---------- captions and flashes for sounds ----------
let captionTimer = null;
const audio = { avg: 0, loudSince: 0, music: false, quietSince: 0, last: 0, prevNes: null };
function applyCaptions() {
    clearInterval(captionTimer);
    $("cfCaptions").hidden = !settings.captions;
    if (!emu || (!settings.captions && !settings.flash)) return;
    captionTimer = setInterval(listen, 100);
}
function caption(text) {
    if (settings.flash) {
        const f = $("cfFlash");
        f.classList.remove("on");
        void f.offsetWidth;
        f.classList.add("on");
    }
    if (!settings.captions) return;
    const box = $("cfCaptions");
    const line = el("p", null, text);
    box.appendChild(line);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => line.remove(), 4000);
}
function nesChannels() {
    try {
        const s = emu.gameManager.getState();
        const t = new TextDecoder("latin1").decode(s);
        const get = (name, size) => {
            let i = t.indexOf(name);
            while (i >= 0) {
                const n = s[i + 4] | (s[i + 5] << 8) | (s[i + 6] << 16) | (s[i + 7] << 24);
                if (n === size) return s.subarray(i + 8, i + 8 + n);
                i = t.indexOf(name, i + 1);
            }
            return null;
        };
        const ench = get("ENCH", 1);
        const len = [0, 1, 2, 3].map((k) => { const b = get("LEN" + k, 4); return b ? b[0] | (b[1] << 8) : 0; });
        if (!ench) return null;
        return [0, 1, 2, 3].map((k) => !!(ench[0] & (1 << k)) && len[k] > 0).concat([!!(ench[0] & 16)]);
    } catch (e) { return null; }
}
let nesTick = 0;
function listen() {
    if (!emu || emu.paused) return;
    // NES: the sound chip says which channel just started
    if (game && game.system === "nes" && ++nesTick % 2 === 0) {
        const ch = nesChannels();
        if (ch && audio.prevNes) {
            const names = ["♪ Beep or melody note", "♪ Second melody note", "♪ Bass note", "💥 Drum, crash or noise", "🔊 Recorded sound"];
            ch.forEach((on, k) => { if (on && !audio.prevNes[k]) caption(names[k]); });
        }
        if (ch) { audio.prevNes = ch; return; }
    }
    // Any system: the loudness and pitch of the sound coming out
    const a = win && win.EJS_analyser;
    if (!a) return;
    const data = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += v * v;
    const rms = Math.sqrt(sum / data.length);
    const now = performance.now();
    if (rms > Math.max(0.04, audio.avg * 2.5) && now - audio.last > 500) {
        const spec = new Uint8Array(a.frequencyBinCount);
        a.getByteFrequencyData(spec);
        let w = 0, total = 0;
        for (let i = 0; i < spec.length; i++) { w += i * spec[i]; total += spec[i]; }
        const hz = total ? (w / total) * (a.context.sampleRate / 2) / spec.length : 0;
        caption(hz < 350 ? "💥 Low thud or rumble" : hz > 2500 ? "🔔 High beep or chime" : "🔊 Sound effect");
        audio.last = now;
    }
    if (rms > 0.015) {
        audio.quietSince = 0;
        if (!audio.loudSince) audio.loudSince = now;
        if (!audio.music && now - audio.loudSince > 3000) { audio.music = true; caption("♪ Music playing"); }
    } else {
        audio.loudSince = 0;
        if (!audio.quietSince) audio.quietSince = now;
        if (audio.music && now - audio.quietSince > 2000) { audio.music = false; caption("Music stopped"); }
    }
    audio.avg = audio.avg * 0.9 + rms * 0.1;
}

// ---------- buttons under the game ----------
function togglePause() {
    if (!emu) return;
    if (emu.paused) emu.play(); else emu.pause();
    $("cfPause").innerHTML = emu.paused ? "&#9654; Play" : "&#10073;&#10073; Pause";
    status(emu.paused ? "Paused." : "Playing.");
}
$("cfPause").addEventListener("click", togglePause);
for (const type of ["pointerdown", "keydown"]) $("cfRewind").addEventListener(type, (e) => { if (type === "keydown" && !(e.key === " " || e.key === "Enter")) return; if (e.repeat) return; rewind(true); });
for (const type of ["pointerup", "pointerleave", "keyup"]) $("cfRewind").addEventListener(type, () => rewind(false));
$("cfSave").addEventListener("click", () => saveNow());
$("cfLoadSave").addEventListener("click", () => loadSave("7"));
$("cfAuto").addEventListener("click", () => loadSave("8"));
$("cfRestart").addEventListener("click", () => { if (emu) { emu.gameManager.restart(); status("Restarted."); } });
$("cfLoad").addEventListener("click", () => loadGame($("cfGame").value));
$("cfResetGame").addEventListener("click", () => {
    const s = readStore();
    if (game && s.games) delete s.games[game.id];
    writeStore(s);
    choosePreset("standard");
    status("This game's settings are forgotten; it now uses Standard.");
});

// ---------- the settings panel ----------
function markCustom() {
    if (preset !== "custom") {
        preset = "custom";
        renderPresets();
    }
}
function change(key, value) {
    const restart = key === "rewind" && value !== settings[key];
    settings[key] = value;
    markCustom();
    remember();
    if (restart && game) {
        status("Restarting the game to switch rewind " + (value ? "on" : "off") + "…");
        loadGame(game.id, true);
    } else applyAll();
}
function choosePreset(id) {
    const restart = presetSettings(id).rewind !== settings.rewind;
    preset = id;
    settings = presetSettings(id);
    remember();
    renderPresets();
    renderSettings();
    if (restart && game && emu) loadGame(game.id, true); else applyAll();
    status(PRESETS[id].label + " preset on.");
}
function renderPresets() {
    const box = $("cfPresets");
    box.textContent = "";
    for (const [id, p] of Object.entries(PRESETS)) {
        const b = el("button", "cf-preset" + (preset === id ? " on" : ""), p.label);
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(preset === id));
        b.addEventListener("click", () => choosePreset(id));
        box.appendChild(b);
    }
    $("cfPresetNote").textContent = preset === "custom" ? "Custom: your own changes. They are remembered for this game." : PRESETS[preset].note;
}
function section(title) {
    const d = el("fieldset", "cf-section");
    d.appendChild(el("legend", null, title));
    $("cfSettings").appendChild(d);
    return d;
}
function range(box, label, key, min, max, step, fmt) {
    const l = el("label", "cf-field");
    const name = el("span", null, label);
    const val = el("output", null, fmt(settings[key]));
    const i = el("input");
    i.type = "range";
    i.min = min; i.max = max; i.step = step;
    i.value = settings[key];
    i.addEventListener("input", () => { val.textContent = fmt(Number(i.value)); });
    i.addEventListener("change", () => change(key, Number(i.value)));
    l.append(name, i, val);
    box.appendChild(l);
}
function toggle(box, label, key, note) {
    const l = el("label", "cf-check");
    const i = el("input");
    i.type = "checkbox";
    i.checked = !!settings[key];
    i.addEventListener("change", () => change(key, i.checked));
    l.append(i, document.createTextNode(" " + label));
    box.appendChild(l);
    if (note) box.appendChild(el("p", "small muted cf-note", note));
}
function choice(box, label, key, options) {
    const l = el("label", "cf-field");
    l.appendChild(el("span", null, label));
    const s = el("select");
    for (const [v, t] of options) s.add(new Option(t, v));
    s.value = String(settings[key]);
    s.addEventListener("change", () => change(key, isNaN(Number(s.value)) || s.value === "" ? s.value : Number(s.value)));
    l.appendChild(s);
    box.appendChild(l);
}
function buttonSet(box, label, key) {
    const wrap = el("div", "cf-buttonset");
    wrap.appendChild(el("span", null, label));
    const row = el("div", "cf-row");
    for (const i of [8, 0, 9, 1, 10, 11, 3, 2]) {
        const l = el("label", "cf-chip");
        const c = el("input");
        c.type = "checkbox";
        c.checked = settings[key].includes(i);
        c.addEventListener("change", () => change(key, c.checked ? [...settings[key], i] : settings[key].filter((x) => x !== i)));
        l.append(c, document.createTextNode(" " + BTN_NAME[i]));
        row.appendChild(l);
    }
    wrap.appendChild(row);
    box.appendChild(wrap);
}
function renderSettings() {
    const host = $("cfSettings");
    host.textContent = "";
    const pct = (v) => Math.round(v * 100) + " %";
    let s = section("Speed and time");
    range(s, "Game speed", "speed", 0.25, 1, 0.05, pct);
    toggle(s, "Rewind (hold the Rewind button or Backspace)", "rewind", "Switching rewind on or off restarts the game.");
    choice(s, "Save automatically", "autosave", [[0, "Off"], [1, "Every minute"], [2, "Every 2 minutes"], [5, "Every 5 minutes"], [10, "Every 10 minutes"]]);

    s = section("Buttons");
    buttonSet(s, "Hold-to-toggle: one press holds, the next lets go", "toggle");
    buttonSet(s, "Auto-fire: fires again and again while held", "turbo");
    range(s, "Auto-fire speed", "turboRate", 2, 20, 1, (v) => v + " per second");
    choice(s, "Keyboard for one hand", "hand", [["none", "Off (normal keys)"], ["left", "Left hand (W A S D)"], ["right", "Right hand (arrow keys)"]]);
    if (HAND_HELP[settings.hand]) s.appendChild(el("p", "small cf-note", HAND_HELP[settings.hand]));

    s = section("Touch controls");
    choice(s, "Show the comfort touch controls", "pad", [["auto", "On touch screens"], ["always", "Always"], ["never", "Never"]]);
    range(s, "Size", "padSize", 0.8, 2.2, 0.1, (v) => Math.round(v * 100) + " %");
    range(s, "Opacity", "padOpacity", 0.3, 1, 0.05, pct);
    const mv = el("button", "", moving ? "Done moving" : "Move the touch controls");
    mv.type = "button";
    mv.setAttribute("aria-pressed", String(moving));
    mv.addEventListener("click", () => {
        moving = !moving;
        $("cfPad").classList.toggle("moving", moving);
        mv.textContent = moving ? "Done moving" : "Move the touch controls";
        mv.setAttribute("aria-pressed", String(moving));
        if (moving && $("cfPad").hidden) { change("pad", "always"); renderSettings(); }
        status(moving ? "Drag the groups of buttons where you want them, then press Done moving." : "Positions saved.");
    });
    const rs = el("button", "", "Put them back");
    rs.type = "button";
    rs.addEventListener("click", () => change("padPos", clone(DEFAULTS.padPos)));
    const row = el("div", "buttons");
    row.append(mv, rs);
    s.appendChild(row);

    s = section("Seeing");
    choice(s, "Colour filter", "filter", [["none", "None"], ["contrast", "High contrast"], ["protan", "Red-weak (protan) friendly"], ["deutan", "Green-weak (deutan) friendly"], ["tritan", "Blue-weak (tritan) friendly"], ["grey", "Greyscale"], ["invert", "Inverted (dark becomes light)"]]);
    range(s, "Brightness", "brightness", 0.6, 1.8, 0.05, pct);
    range(s, "Contrast", "contrast", 0.6, 2, 0.05, pct);
    toggle(s, "Larger text and controls on this page", "bigUi");

    s = section("Hearing");
    toggle(s, "Captions for sounds", "captions", game && game.system === "nes" ? "NES games: read from the sound chip, so each new note, drum or effect is named." : "Worked out from the sound itself: loud effects, high beeps, low rumbles and music.");
    toggle(s, "Flash the screen edge for each sound", "flash");

    s = section("One switch");
    toggle(s, "One-switch play", "scan", "A highlight moves through the actions; press your switch (Space, Enter, a tap on the game or any controller button) to choose one. Switch-access devices that send Space or Enter work directly.");
    range(s, "Highlight moves every", "scanSeconds", 0.5, 5, 0.1, (v) => v.toFixed(1) + " s");
    toggle(s, "Directions stay held until the next press", "latch");
    range(s, "Button press length", "holdMs", 100, 1500, 50, (v) => v + " ms");
    toggle(s, "Any key counts as the switch", "anyKey");
    const acts = el("div", "cf-buttonset");
    acts.appendChild(el("span", null, "Actions in the scan"));
    const ar = el("div", "cf-row");
    for (const [id, a] of Object.entries(SCAN_ACTIONS)) {
        const l = el("label", "cf-chip");
        const c = el("input");
        c.type = "checkbox";
        c.checked = settings.scanActions.includes(id);
        c.addEventListener("change", () => {
            const next = Object.keys(SCAN_ACTIONS).filter((k) => (k === id ? c.checked : settings.scanActions.includes(k)));
            scanIndex = 0;
            change("scanActions", next);
        });
        l.append(c, document.createTextNode(" " + a.label));
        ar.appendChild(l);
    }
    acts.appendChild(ar);
    s.appendChild(acts);
}

// ---------- start ----------
async function main() {
    recall(params.get("game") || "");
    renderPresets();
    renderSettings();
    applyVisual();
    await loadManifest();
    catalog = (await loadCatalog()).filter((g) => isAvailable(g.system));
    const select = $("cfGame");
    let group = null, last = null;
    for (const g of catalog) {
        if (g.source !== last) { group = document.createElement("optgroup"); group.label = g.source; select.appendChild(group); last = g.source; }
        group.appendChild(new Option(`${g.title} (${labelFor(g.system)})`, g.id));
    }
    if (!catalog.length) { $("cfWait").textContent = "No games found. Add games to the Homebrew showcase, the data/ folders or My Collection."; $("cfLoad").disabled = true; }
    const wanted = params.get("game") || "hb:sprite-lab";
    if (catalog.some((g) => g.id === wanted)) select.value = wanted;
    setupServiceWorker({ shouldReload: () => !emu }).catch(() => {});
    if (params.get("game") && catalog.some((g) => g.id === wanted)) loadGame(wanted);
}
main();
