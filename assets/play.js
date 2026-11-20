// Game page: runs one game and offers navigation to another game or platform.
//   play.html?folder=NES&file=Game.nes   game from a data/<FOLDER> library folder
//   play.html?id=<recent-game id>        file opened on the home page (stored in this browser)
//   play.html?url=roms/game.nes&core=nes any URL on this site
//   play.html  /  play.html?folder=NES     game library: every ROM and zip in the data/<FOLDER> folders,
//                                          listed once the engine and cores are loaded (&autoplay=1 starts the first)
import { SYSTEMS, extensionOf, labelFor, detectSystem } from "./detect.js";
import * as library from "./library.js";
import * as collection from "./collection-store.js";
import { loadFolders, romUrl, gameTitle, playUrl } from "./folders.js";
import { $, params, flag, needsThreads, isAvailable, loadManifest, readOptions, setupServiceWorker, ENGINES, getEngine, setEngine, prefetchCore, preferredCore, coreInstalled, coreNeedsThreads } from "./common.js";
import { cores as CORE_TABLE } from "../data/src/consts.js";
import { initDevice, onOrientation, device } from "./mobile.js";

const RECENT = "__recent";

// ---------- kiosk frame: play.html?kiosk=1 inside kiosk.html (museum and exhibit screens) ----------
// The kiosk page owns the screen; this page only runs the game, with every site menu hidden, and reports to it:
// "activity" (keys, touches, controller input), "started", "error", "exit" and a "shot" (a picture for the
// attract loop). It obeys "pause", "resume" and "shot" messages from the kiosk page.
const kiosk = flag("kiosk") && window.parent !== window;
// Embedded player (play.html?embed=1 inside another page of this site, e.g. the classroom): site bar and menus
// hidden, the game and its EmulatorJS bar only; the page around it reads the emulator directly (same origin).
const embed = (kiosk || flag("embed")) && window.parent !== window;
if (embed) {
    document.documentElement.classList.add("embed");
    // &analyser=1: every sound the game makes also passes an AnalyserNode (window.EJS_analyser), for live waveforms
    if (flag("analyser") && window.AudioNode) {
        const connect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function (target, ...rest) {
            if (window.AudioDestinationNode && target instanceof AudioDestinationNode) {
                const ctx = target.context;
                if (!ctx.__ejsAnalyser) {
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 2048;
                    analyser.smoothingTimeConstant = 0.6;
                    connect.call(analyser, target);
                    ctx.__ejsAnalyser = analyser;
                    window.EJS_analyser = analyser;
                }
                if (this !== ctx.__ejsAnalyser) return connect.call(this, ctx.__ejsAnalyser, ...rest);
            }
            return connect.call(this, target, ...rest);
        };
    }
    // &frame=1: the last picture stays readable while the game is paused (frame-by-frame views)
    if (flag("frame")) window.EJS_preserveFrame = true;
    // &lowpower=1: performance mode and the power saver for this run (old or donated devices)
    if (flag("lowpower")) window.EJS_perfOverride = { performanceMode: true, powerSaver: true, runAhead: false, renderScale: 1 };
    // &rewind=1: rewind is switched on for this game (it must be set before the core starts)
    if (flag("rewind")) window.EJS_forceSettings = Object.assign(window.EJS_forceSettings || {}, { rewindEnabled: "enabled" });
}
function kioskPost(type, data) {
    if (!kiosk) return;
    try { window.parent.postMessage(Object.assign({ source: "ejs-kiosk-frame", type }, data || {}), location.origin); } catch (e) { /* parent gone */ }
}
function setupKioskFrame() {
    document.documentElement.classList.add("kiosk");
    document.body.classList.add("kiosk");
    let last = 0;
    const ping = () => {
        const now = Date.now();
        if (now - last > 1000) {
            last = now;
            kioskPost("activity");
        }
    };
    for (const type of ["keydown", "pointerdown", "touchstart", "wheel"]) window.addEventListener(type, ping, { capture: true, passive: true });
    // Controllers: any change in buttons or sticks counts as someone playing
    let signature = "";
    setInterval(() => {
        const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
        const now = pads.map((p) => p.buttons.map((b) => (b.pressed ? 1 : 0)).join("") + p.axes.map((a) => Math.round(a * 2)).join(",")).join("|");
        if (signature && now !== signature) ping();
        signature = now;
    }, 250);
    // Staff shortcut: Ctrl+Shift+K opens the kiosk PIN pad even while a game has the keyboard
    window.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
            e.preventDefault();
            e.stopImmediatePropagation();
            kioskPost("staff");
        }
    }, true);
    window.addEventListener("contextmenu", (e) => e.preventDefault(), true);
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    window.addEventListener("error", (e) => kioskPost("error", { message: String(e.message || "Script error") }));
    window.addEventListener("unhandledrejection", (e) => kioskPost("error", { message: String((e.reason && e.reason.message) || e.reason || "Error") }));
    // The cursor hides after three seconds without mouse movement
    let cursorTimer = null;
    window.addEventListener("mousemove", () => {
        document.documentElement.classList.remove("k-nocursor");
        clearTimeout(cursorTimer);
        cursorTimer = setTimeout(() => document.documentElement.classList.add("k-nocursor"), 3000);
    }, { passive: true });
    document.documentElement.classList.add("k-nocursor");
    // Started / failed, checked twice a second
    const watch = setInterval(() => {
        const E = window.EJS_emulator;
        if ((E && E.started) || (window.NostalgistMod_instance)) {
            clearInterval(watch);
            kioskPost("started");
        } else if (E && E.failedToStart) {
            clearInterval(watch);
            kioskPost("error", { message: "The game could not start." });
        }
    }, 500);
    window.addEventListener("message", (e) => {
        if (e.origin !== location.origin || !e.data || e.data.source !== "ejs-kiosk") return;
        if (e.data.type === "pause") pauseForMenu();
        else if (e.data.type === "resume") resumeAfterMenu();
        else if (e.data.type === "shot") gameScreenshot().then((blob) => kioskPost("shot", { blob, id: e.data.id }));
        else if (e.data.type === "volume") {
            // The visitor's sound button (never above the staff's volume, which the kiosk page enforces)
            const v = Math.max(0, Math.min(1, Number(e.data.volume)));
            const E = window.EJS_emulator;
            if (E && E.setVolume && Number.isFinite(v)) { E.volume = v; E.setVolume(v); }
        }
    });
}
let started = false;
let folders = [];
let current = { platform: null, game: null };

function engineSwitchUrl(id) {
    const query = new URLSearchParams(location.search);
    query.set("engine", id);
    return "play.html?" + query.toString();
}

function fillEngines(current) {
    const select = $("engineSelect");
    select.textContent = "";
    for (const engine of Object.values(ENGINES)) {
        const option = document.createElement("option");
        option.value = engine.id;
        option.textContent = engine.name;
        option.title = engine.tagline;
        select.appendChild(option);
    }
    select.value = current;
    select.addEventListener("change", () => {
        setEngine(select.value);
        location.href = engineSwitchUrl(select.value);
    });
}

function showError(message, action) {
    kioskPost("error", { message });
    $("title").textContent = "Can't start this game";
    const box = document.createElement("div");
    box.className = "play-error";
    const p = document.createElement("p");
    p.textContent = message;
    const home = document.createElement("a");
    home.className = "button";
    home.href = homePage();
    home.textContent = "Back to home";
    box.append(p);
    if (action) {
        const extra = document.createElement("a");
        extra.className = "button";
        extra.href = action.href;
        extra.textContent = action.label;
        box.append(extra, document.createTextNode(" "));
    }
    box.append(home);
    $("display").textContent = "";
    $("display").appendChild(box);
}

// ---------- dropdowns ----------
function fillPlatforms() {
    const select = $("platformSelect");
    select.textContent = "";
    const recent = library.listRecent();
    const add = (value, label) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    };
    for (const folder of folders) {
        if (folder.files.length) add(folder.folder, `${folder.short || folder.label} (${folder.files.length})`);
    }
    if (recent.length) add(RECENT, `Recent games (${recent.length})`);
    if (!select.options.length) add("", "No games yet");
    select.value = current.platform && [...select.options].some((o) => o.value === current.platform) ? current.platform : select.options[0].value;
}

function fillGames() {
    const platform = $("platformSelect").value;
    const select = $("gameSelect");
    select.textContent = "";
    const add = (value, label, title) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        if (title) option.title = title;
        select.appendChild(option);
    };
    const onCurrentPlatform = platform === current.platform;
    if (!onCurrentPlatform) add("", "Choose a game…");
    if (platform === RECENT) {
        for (const entry of library.listRecent()) add("id:" + entry.id, gameTitle(entry.name) + " · " + labelFor(entry.system), entry.name);
    } else {
        const folder = folders.find((f) => f.folder === platform);
        for (const file of folder ? folder.files : []) add("file:" + file.name, gameTitle(file.name), file.name);
    }
    if (onCurrentPlatform && current.game) select.value = current.game;
    select.disabled = select.options.length === 0;
}

let libraryMode = false;
function bindDropdowns() {
    $("platformSelect").addEventListener("change", () => {
        // In the library view a platform choice narrows the list instead of waiting for a game choice
        const value = $("platformSelect").value;
        if (libraryMode && value && value !== RECENT) location.href = playUrl({ folder: value });
        else fillGames();
    });
    $("gameSelect").addEventListener("change", () => {
        const value = $("gameSelect").value;
        if (!value || value === current.game) return;
        const platform = $("platformSelect").value;
        location.href = value.startsWith("id:")
            ? playUrl({ id: value.slice(3) })
            : playUrl({ folder: platform, file: value.slice(5) });
    });
}

// ---------- where "Home" goes: the page the game was started from (start page, Basic, My Collection, Homebrew showcase, archive record) ----------
function homePage() {
    let page = null;
    try { page = sessionStorage.getItem("ejs-home"); } catch (e) { /* storage blocked */ }
    return /^((index|basic|collection)\.html|homebrew\.html(\?game=[\w-]+)?|archive\.html(\?id=[\w-]+)?)$/.test(page || "") ? page : "index.html";
}
for (const link of document.querySelectorAll('a[href="index.html"]')) link.href = homePage();

// ---------- My Collection: play time, last played and a cover picture taken from the game ----------
function trackCollection(id) {
    let last = performance.now();
    const flush = () => {
        const now = performance.now();
        const paused = (window.EJS_emulator && window.EJS_emulator.paused) || document.hidden;
        const seconds = paused ? 0 : (now - last) / 1000;
        last = now;
        collection.played(id, seconds).catch(() => {});
    };
    collection.played(id, 0, true).catch(() => {});
    setInterval(flush, 30000);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); else last = performance.now(); });
    window.addEventListener("pagehide", flush);
    // The cover is the game as it looks after 25 seconds of play (title screens are past by then), renewed each session
    setTimeout(async () => {
        const blob = await gameScreenshot().catch(() => null);
        if (!blob) return;
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = Math.round(320 * bitmap.height / bitmap.width);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((jpeg) => { if (jpeg) collection.setCover(id, jpeg).catch(() => {}); }, "image/jpeg", 0.82);
    }, 25000);
}
function gameScreenshot() {
    return new Promise((resolve) => {
        const E = window.EJS_emulator;
        if (E && E.started) {
            try { E.screenshot((blob) => resolve(blob || null), "retroarch", "png", 1); } catch (e) { resolve(null); }
            setTimeout(() => resolve(null), 3000);
        } else if (window.NostalgistMod_instance) {
            window.NostalgistMod_instance.screenshot().then(resolve, () => resolve(null));
        } else {
            resolve(null);
        }
    });
}

// ---------- phone view: game menu sheet, rotation ----------
let session = null; // what the engine's launch() returned
const view = initDevice({ game: true });

function emulator() {
    const E = window.EJS_emulator;
    return E && E.started ? E : null;
}
function pauseForMenu() {
    const E = emulator();
    if (E && !E.paused) {
        E.pause();
        return true;
    }
    return !!(session && session.pause && session.pause());
}
function resumeAfterMenu() {
    const E = emulator();
    if (E) E.play();
    else if (session && session.resume) session.resume();
}

function setupPhoneMenu() {
    const sheet = $("sheet");
    let pausedByMenu = false;
    let lastFocus = null;
    if (view.phone) {
        // The bar keeps Home, the title and the menu button; pickers and engine tools move into the sheet
        for (const group of document.querySelectorAll("#bar .pickers")) $("sheetPickers").appendChild(group);
        $("sheetTools").appendChild($("engineTools"));
    }
    if (device.ios && !device.standalone && !localStorage.getItem("ejs-a2hs-dismissed")) {
        $("a2hs").hidden = false;
        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.className = "link-btn";
        dismiss.textContent = "Got it";
        dismiss.addEventListener("click", () => {
            $("a2hs").hidden = true;
            try { localStorage.setItem("ejs-a2hs-dismissed", "1"); } catch (e) { /* storage blocked */ }
        });
        $("a2hs").appendChild(dismiss);
    }
    const open = () => {
        if (!sheet.hidden) return;
        lastFocus = document.activeElement;
        pausedByMenu = pauseForMenu();
        $("sheetStatus").hidden = !pausedByMenu;
        renderControls();
        sheet.hidden = false;
        document.documentElement.classList.add("sheet-open");
        if (session && session.touchPad) session.touchPad.releaseAll();
        requestAnimationFrame(() => sheet.classList.add("open"));
        $("menuBtn").setAttribute("aria-expanded", "true");
        const first = sheet.querySelector(".sheet-head [data-close]");
        if (first) first.focus({ preventScroll: true });
    };
    const close = () => {
        if (sheet.hidden) return;
        sheet.classList.remove("open");
        $("menuBtn").setAttribute("aria-expanded", "false");
        setTimeout(() => {
            sheet.hidden = true;
            document.documentElement.classList.remove("sheet-open");
        }, 200);
        if (pausedByMenu) resumeAfterMenu();
        pausedByMenu = false;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    $("menuBtn").addEventListener("click", open);
    $("floatMenu").addEventListener("click", open);
    sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) close(); });
    // Swipe the sheet down to close it
    let startY = null;
    const panel = sheet.querySelector(".sheet-panel");
    panel.addEventListener("touchstart", (e) => { startY = panel.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    panel.addEventListener("touchend", (e) => {
        if (startY !== null && e.changedTouches[0].clientY - startY > 70) close();
        startY = null;
    });

    // NostalgistMod's toolbar works from the sheet: Pause keeps the game paused after the menu closes,
    // every other action runs and closes the menu
    $("sheetTools").addEventListener("click", (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;
        if (button.dataset.action === "pause" && pausedByMenu) {
            e.stopImmediatePropagation();
            pausedByMenu = false;
            close();
            return;
        }
        if (button.dataset.action === "pause") pausedByMenu = false;
        setTimeout(close, 250);
    }, true);

    function renderEmulatorTools() {
        const old = $("ejsTools");
        if (old) old.remove();
        const E = emulator();
        const enh = E && E.enhancements;
        if (!enh) return;
        const box = document.createElement("div");
        box.id = "ejsTools";
        box.className = "engine-tools";
        const add = (label, action, keepOpen) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.addEventListener("click", () => {
                // Actions run on the running game, so the menu closes (and the game resumes) first
                close();
                setTimeout(() => { try { action(); } catch (err) { console.warn(err); } }, keepOpen ? 0 : 260);
            });
            box.appendChild(button);
        };
        add("Save slots", () => enh.toggleSlots());
        add("Save state", () => enh.quickSave());
        add("Load state", () => enh.quickLoad());
        add("Undo load", () => enh.undoLoad());
        add("Reset", () => enh.reset());
        add("Screenshot", () => enh.screenshot());
        add("Fast forward", () => enh.toggleSetting("fastForward", "isFastForward", "FAST FORWARD"));
        $("sheetTools").appendChild(box);
    }

    function renderControls() {
        renderEmulatorTools();
        const row = $("sheetControls");
        row.textContent = "";
        const toggle = (label, on, change) => {
            const wrap = document.createElement("label");
            wrap.className = "switch";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.checked = on;
            input.addEventListener("change", () => change(input.checked));
            wrap.append(input, " " + label);
            row.appendChild(wrap);
        };
        const E = emulator();
        if (E && E.depth25) toggle("2.5D view", E.depth25.enabled, (on) => E.depth25.setEnabled(on));
        if (E) {
            toggle("On-screen controls", E.getSettingValue("virtual-gamepad") !== "disabled", (on) => E.frontend.changeSettingOption("virtual-gamepad", on ? "enabled" : "disabled"));
        } else if (session && session.touchPad) {
            toggle("On-screen controls", session.touchPad.wanted(), (on) => session.touchPad.setWanted(on));
        }
        // Android and tablets can go full screen from the page; iPhone uses Add to Home Screen instead
        if (document.fullscreenEnabled && !device.iphone && !$("sheetTools").querySelector("[data-action=fullscreen]")) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button";
            button.textContent = document.fullscreenElement ? "Leave full screen" : "Full screen";
            button.addEventListener("click", () => {
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                else document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
                close();
            });
            row.appendChild(button);
        }
    }
}

// After a rotation the player is laid out again for the new shape (iOS settles the size a moment later)
onOrientation(() => {
    const E = window.EJS_emulator;
    if (E && E.frontend) {
        try { E.frontend.handleResize(); } catch (e) { /* not ready */ }
        if (E.performance) E.performance.applyRenderScale();
    }
    if (session && session.relayout) session.relayout();
});

// ---------- game library (no game chosen) ----------
function showLibrary(engine, engineId, onlyFolder) {
    const shown = folders.filter((f) => f.files.length && (!onlyFolder || f.folder === onlyFolder));
    const total = shown.reduce((n, f) => n + f.files.length, 0);
    $("title").textContent = onlyFolder && shown.length ? shown[0].label : "Game library";
    document.title = $("title").textContent + " – EmulatorJS";
    const box = document.createElement("div");
    box.className = "library";
    const heading = document.createElement("h2");
    heading.textContent = total ? `${total} game${total === 1 ? "" : "s"} ready for ${ENGINES[engineId].name}` : "No games in the library folders yet";
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = total
        ? "Engine and cores are loaded. Choose a game to start it; pointing at one downloads its core in the background."
        : "Put ROMs or zip files in data/A2600, GB, GBC, GG, NES, SNES or N64 (and update the folder's index.json, which the GitHub workflow does for you), or open a file from the home page.";
    box.append(heading, note);
    for (const folder of shown) {
        const support = engine.supports ? engine.supports(folder.system) : { ok: true };
        const section = document.createElement("section");
        const h3 = document.createElement("h3");
        h3.textContent = folder.label;
        const count = document.createElement("span");
        count.className = "count";
        count.textContent = folder.files.length + (folder.files.length === 1 ? " game" : " games") + (support.ok ? "" : " · " + support.reason);
        h3.appendChild(count);
        const list = document.createElement("ul");
        list.className = "games";
        for (const file of folder.files) {
            const li = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            // Two files with the same title (game.nes and game.zip) show their type
            const twin = folder.files.some((other) => other !== file && gameTitle(other.name) === gameTitle(file.name));
            button.textContent = gameTitle(file.name) + (twin ? " (" + file.name.split(".").pop().toLowerCase() + ")" : "");
            button.title = file.name;
            button.disabled = !support.ok;
            button.addEventListener("click", () => { location.href = playUrl({ folder: folder.folder, file: file.name }); });
            button.addEventListener("pointerenter", () => prefetchCore(folder.system, engineId));
            button.addEventListener("focus", () => prefetchCore(folder.system, engineId));
            li.appendChild(button);
            list.appendChild(li);
        }
        section.append(h3, list);
        box.appendChild(section);
    }
    // A library with a single platform warms that core straight away
    const playable = shown.filter((f) => !engine.supports || engine.supports(f.system).ok);
    if (playable.length === 1) prefetchCore(playable[0].system, engineId);
    $("display").textContent = "";
    $("display").appendChild(box);
    const first = box.querySelector(".games button:not(:disabled)");
    if (first) first.focus({ preventScroll: true });
    $("hint").textContent = total ? "Arrow keys or Tab to move, Enter to play" : "";
}

// ---------- which game ----------
async function resolveGame() {
    if (params.get("folder") && params.get("file")) {
        const folderName = params.get("folder");
        const file = params.get("file");
        const folder = folders.find((f) => f.folder === folderName);
        if (!folder) throw new Error(`The "${folderName}" folder is not set up, or its emulator core is missing.`);
        current = { platform: folderName, game: "file:" + file };
        return { rom: romUrl(folderName, file), name: file, system: folder.system };
    }
    if (params.get("cid")) {
        // A game from My Collection
        const record = await collection.get(params.get("cid")).catch(() => null);
        const blob = record && await collection.file(record.id).catch(() => null);
        if (!record || !blob) throw new Error("This game is not in My Collection on this device. Add it there, or import your collection.");
        current = { platform: RECENT, game: null };
        return { rom: new File([blob], record.name), name: record.name, system: record.system, core: record.core || null, collectionId: record.id };
    }
    if (params.get("id")) {
        const entry = library.getEntry(params.get("id"));
        if (!entry) throw new Error("This game is no longer in this browser's recent games. Open it again from the home page.");
        const { rom, bios, patch } = await library.open(entry);
        if (!rom) throw new Error(`"${entry.name}" is no longer stored in this browser. Open the file again from the home page.`);
        current = { platform: RECENT, game: "id:" + entry.id };
        // A library-folder game reopened from Recent belongs to its folder in the dropdowns
        const match = entry.url && entry.url.match(/^data\/([^/]+)\/(.+)$/);
        if (match && folders.some((f) => f.folder === decodeURIComponent(match[1]))) {
            current = { platform: decodeURIComponent(match[1]), game: "file:" + decodeURIComponent(match[2]) };
        }
        await library.touch(entry.id);
        return { rom, name: entry.name, system: entry.system, core: entry.core || null, bios, patch, remembered: true };
    }
    if (params.get("url")) {
        const url = params.get("url");
        const name = decodeURIComponent(url.split("/").pop().split("?")[0]);
        let system = params.get("core");
        let core = null;
        // &core= may name a system (nes) or a specific core (fceumm, mupen64plus_next)
        if (system && !SYSTEMS.some(([id]) => id === system)) {
            const owner = Object.keys(CORE_TABLE).find((id) => CORE_TABLE[id].includes(system));
            if (owner) {
                core = system;
                system = owner;
            }
        }
        if (!system) {
            const available = SYSTEMS.filter(([id]) => isAvailable(id));
            const byExt = available.filter(([, , exts]) => exts.includes(extensionOf(name)));
            if (byExt.length === 1) {
                system = byExt[0][0];
            } else {
                const blob = await (await fetch(url)).blob();
                system = (await detectSystem(new File([blob], name), available)).system;
            }
        }
        if (!system) throw new Error(`Can't tell which system "${name}" is for. Add &core=<system> to the address, e.g. &core=nes.`);
        current = { platform: RECENT, game: null };
        return { rom: url, name, system, core };
    }
    throw new Error("No game was chosen. Pick one from the home page or the dropdowns above.");
}

async function main() {
    if (kiosk) setupKioskFrame();
    bindDropdowns();
    setupPhoneMenu();
    // ?engine= wins, then this session's choice; the home page asks when nothing is chosen yet.
    // Kiosk screens always use EmulatorJSMod, whose menus can be locked down.
    let engineId = embed ? "emulatorjs" : (getEngine() || "emulatorjs");
    if (!embed) setEngine(engineId);
    fillEngines(engineId);
    // Links between games keep the engine
    const query = new URLSearchParams(location.search);
    if (query.get("engine") !== engineId) {
        query.set("engine", engineId);
        history.replaceState(null, "", "play.html?" + query.toString());
    }
    const [, swState] = await Promise.all([
        loadManifest(),
        embed ? Promise.resolve("embedded") : setupServiceWorker({ shouldReload: () => !started })
    ]);
    if (swState === "reloading") return;
    folders = await loadFolders(isAvailable);

    // No game chosen: load the engine, then offer every ROM and zip found in the library folders
    if (!params.get("id") && !params.get("cid") && !params.get("url") && !params.get("file")) {
        if (embed) {
            showError("No game was given to the kiosk player.");
            return;
        }
        const onlyFolder = params.get("folder");
        let engine;
        try {
            engine = await ENGINES[engineId].load();
        } catch (e) {
            showError(`${ENGINES[engineId].name} could not be loaded: ${e.message}`);
            return;
        }
        const folder = onlyFolder && folders.find((f) => f.folder === onlyFolder);
        const supported = folder && (!engine.supports || engine.supports(folder.system).ok);
        if (folder && folder.files.length && supported && flag("autoplay")) {
            location.replace(playUrl({ folder: folder.folder, file: folder.files[0].name }));
            return;
        }
        current = { platform: folder ? folder.folder : null, game: null };
        libraryMode = true;
        fillPlatforms();
        fillGames();
        showLibrary(engine, engineId, folder ? folder.folder : null);
        return;
    }

    let game;
    try {
        game = await resolveGame();
        // The core chosen when the game was loaded, else the one chosen for every game of the system
        if (game.core && !coreInstalled(game.core)) game.core = null;
        game.core = game.core || preferredCore(game.system);
    } catch (e) {
        fillPlatforms();
        fillGames();
        showError(e.message);
        return;
    }
    if (!isAvailable(game.system)) {
        fillPlatforms();
        fillGames();
        showError(`The emulator core for ${labelFor(game.system)} is not installed in data/cores/.`);
        return;
    }
    // 2.5D is drawn by EmulatorJSMod, so NES and SNES games in 2.5D mode use it for this game
    const depth25 = (embed ? flag("depth25") : readOptions().depth25) && (game.system === "nes" || game.system === "snes");
    if (depth25 && engineId !== "emulatorjs") {
        engineId = "emulatorjs";
        fillEngines(engineId);
    }
    const engine = await ENGINES[engineId].load();
    const support = engine.supports(game.system);
    if (!support.ok) {
        fillPlatforms();
        fillGames();
        showError(support.reason, { href: engineSwitchUrl("emulatorjs"), label: "Play with EmulatorJSMod" });
        return;
    }
    if (engineId === "emulatorjs" && (game.core ? coreNeedsThreads(game.core) : needsThreads(game.system)) && !window.SharedArrayBuffer) {
        fillPlatforms();
        fillGames();
        showError(`${labelFor(game.system)} needs threads, which this browser has not enabled. Reload this page once; if that doesn't help, the browser doesn't support it.`);
        return;
    }

    const options = readOptions();
    if (kiosk) {
        // Kiosk: locked-down player, no recent-games entry, the volume chosen by staff
        options.kiosk = true;
        options.depth25 = depth25;
        const volume = parseFloat(params.get("volume"));
        if (volume >= 0 && volume <= 1) options.kioskVolume = volume;
    }
    // A BIOS or patch chosen on the home page applies to the next game opened from a folder link
    if (!game.remembered && !embed) {
        const pending = await library.takePending();
        game.bios = game.bios || pending.bios;
        game.patch = game.patch || pending.patch;
        await library.remember({ rom: game.rom, name: game.name, system: game.system, bios: game.bios, patch: game.patch, keep: options.library }).catch(() => {});
    }
    fillPlatforms();
    fillGames();
    $("title").textContent = gameTitle(game.name);
    $("title").title = game.name + " · " + labelFor(game.system) + (game.patch ? " · patched" : "");
    started = true;
    document.body.classList.add("playing");
    try {
        const result = await engine.launch({
            container: "#game",
            game,
            options,
            toolbar: $("engineTools"),
            onExit: () => { if (kiosk) kioskPost("exit"); else if (!embed) location.href = homePage(); }
        });
        session = result || null;
        if (game.collectionId && !embed) trackCollection(game.collectionId, !!result);
        // Ask the browser to keep saves (Safari otherwise clears site data after weeks without a visit)
        if (!embed && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        $("hint").innerHTML = "";
        $("hint").textContent = (depth25 ? "2.5D mode · Shift+F8 toggles · " : "") + ((result && result.hints) || "");
        $("hint").title = (result && result.hintsTitle) || "";
    } catch (e) {
        console.error(e);
        showError(`${ENGINES[engineId].name} could not start this game: ${e.message}`,
            engineId === "nostalgist" ? { href: engineSwitchUrl("emulatorjs"), label: "Try EmulatorJSMod" } : null);
    }
}

main().catch((e) => {
    console.error(e);
    showError("Something went wrong: " + e.message);
});
