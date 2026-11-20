// Use case 5, Web development case study: the site itself as a teaching example.
// Each tour stop explains one technique, shows the real code that does it (read live from the site's own files,
// so it can never go out of date), measures the live value on this device, and links to the reference docs.
// Exercises change the site; most have a "Check my work" that looks at the running site to see if it worked.
// Progress: localStorage "ejs-devtour" ({ seen, done, quiz: first-try answers, swBase: the sw.js version when the
// "Ship an update" exercise was first opened }).
// Second pass: stops on iframes and postMessage, checksums, one-file branding and accessibility; exercises for a
// kiosk language and branding; code excerpts with colours, Copy and Show more; quiz scores; Start over; a printable
// exercise handout; ← and → between pages; links to the source when a file has no reference doc yet.
import { $, banner, loadManifest, setupServiceWorker } from "./common.js";
import { checksums } from "./hashes.js";
import { initDevice, device, isPhoneView } from "./mobile.js";
import { detectSystem, labelFor, SYSTEMS } from "./detect.js";

initDevice();
const params = new URLSearchParams(location.search);
const KEY = "ejs-devtour";
const progress = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } })();
progress.seen = progress.seen || {};
progress.done = progress.done || {};
progress.quiz = progress.quiz || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* storage blocked */ } };
// What ships with the site, so the exercises can tell the learner's additions apart
const SHIPPED = {
    homebrew: ["palette-explorer", "button-check", "sprite-lab"],
    lessons: ["palettes", "sprites", "tiles", "sound", "memory", "frames", "numbers"],
    kioskLangs: ["en", "es", "fr", "de", "it", "pt"],
    name: "EmulatorJS",
    accent: "#1aafff"
};
const swVersion = async () => ((await (await fetch("sw.js", { cache: "no-cache" })).text()).match(/const VERSION = "([^"]+)"/) || [])[1] || null;

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}
const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
const yes = (v) => (v ? "yes" : "no");

// ---------- reference docs and source files ----------
let refFiles = null;
async function refIndex() {
    if (!refFiles) {
        try { refFiles = new Set(((await (await fetch("reference-docs/files.json")).json()).files || []).map((f) => f.path)); } catch (e) { refFiles = new Set(); }
    }
    return refFiles;
}
const sources = new Map();
async function source(file) {
    if (!sources.has(file)) sources.set(file, fetch(file, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => ""));
    return sources.get(file);
}
async function excerpt(file, from, count) {
    const text = await source(file);
    const lines = text.split("\n");
    const re = new RegExp(from);
    const start = lines.findIndex((l) => re.test(l));
    if (start < 0) return null;
    return { start: start + 1, lines: lines.slice(start, start + count) };
}

// ---------- the tour ----------
const STOPS = [
    {
        id: "static",
        title: "A whole app from plain files",
        summary: "There is no build step and no server code. Every page is an HTML file that loads JavaScript modules straight from the folder, so the site runs from GitHub Pages, a USB stick with a tiny local server, or any static host.",
        points: [
            "Each page (index.html, play.html, kiosk.html …) has one <script type=\"module\">; modules import each other with relative paths.",
            "Shared code lives in assets/common.js (settings, engines, service worker) and assets/mobile.js (phone layout).",
            "The emulator engine is the EmulatorJS 4.3 source in data/src/, also loaded as modules.",
            "Run it locally with python3 serve.py (or start-windows.bat): browsers block modules and service workers on file:// pages."
        ],
        code: [{ file: "assets/start.js", from: "^import", count: 6 }],
        live: async () => {
            const res = performance.getEntriesByType("resource");
            const js = res.filter((r) => /\.m?js(\?|$)/.test(r.name));
            const bytes = js.reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0);
            return [
                ["Scripts this page loaded", String(js.length)],
                ["Their size (as transferred)", bytes ? kb(bytes) : "from cache (0 bytes over the network)"],
                ["Served from", location.protocol + "//" + location.host],
                ["Page", location.pathname.split("/").pop() || "index.html"]
            ];
        },
        tryIt: "Open the browser's developer tools (F12 or Cmd+Option+I), Network tab, reload: every file is a plain request, no bundle.",
        docs: ["00-PROJECT-OVERVIEW.md", "serve.py.md", "assets/common.js.md"],
        quiz: { q: "Why must the site be opened through a web server, even a local one?", options: ["The emulator needs PHP", "Browsers block modules and service workers on file:// pages", "GitHub requires it"], answer: 1, why: "A file:// page has no origin of its own, so the browser keeps those features off." }
    },
    {
        id: "sw",
        title: "Service worker: offline and instant",
        summary: "sw.js sits between every page and the network. It keeps the site's files in Cache Storage, so pages open instantly and keep working offline, and it decides per file whether to use the network or the cache.",
        points: [
            "Pages and game lists: network first (fresh), cache when offline.",
            "Site files: stale-while-revalidate (answer from cache, refresh in the background).",
            "Emulator cores: cache first, at most 12 kept, because each is several MB.",
            "Changing VERSION makes a new cache; the old ones are deleted when the new worker activates."
        ],
        code: [{ file: "sw.js", from: "^async function handle", count: 22 }],
        live: async () => {
            const rows = [["Service workers supported", yes("serviceWorker" in navigator)], ["This page is controlled", yes(navigator.serviceWorker && navigator.serviceWorker.controller)]];
            if ("caches" in window) {
                const names = await caches.keys();
                rows.push(["Caches", names.join(", ") || "none yet"]);
                let files = 0;
                for (const n of names) files += (await (await caches.open(n)).keys()).length;
                rows.push(["Files kept", String(files)]);
            }
            if (navigator.storage && navigator.storage.estimate) {
                const e = await navigator.storage.estimate();
                rows.push(["Storage used by the site", kb(e.usage || 0) + " of " + kb(e.quota || 0) + " allowed"]);
            }
            return rows;
        },
        tryIt: "Developer tools → Application → Service workers: tick Offline and reload this page. It still works.",
        docs: ["sw.js.md", "docs/CACHING.md.md"],
        quiz: { q: "Why are cores cached 'cache first' and limited to 12?", options: ["They never change and are large", "They are secret", "Browsers forbid more"], answer: 0, why: "A new core gets a new version in the manifest, so the cache never serves a stale one." }
    },
    {
        id: "coi",
        title: "Cross-origin isolation and threads",
        summary: "Some cores (PSP, N64 threaded, Dreamcast) run on several threads that share memory. Browsers only allow shared memory (SharedArrayBuffer) on pages that are cross-origin isolated, which needs two HTTP headers. GitHub Pages cannot send headers, so the service worker adds them.",
        points: [
            "Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.",
            "The worker adds them to every same-origin response; on the very first visit the page reloads once so the worker controls it.",
            "With isolation, window.crossOriginIsolated is true and SharedArrayBuffer exists.",
            "Side effect: the page can no longer embed files from other sites unless they allow it, which suits a site that keeps everything local."
        ],
        code: [{ file: "sw.js", from: "^function isolate", count: 9 }],
        live: async () => {
            let headers = "–";
            try {
                const r = await fetch(location.href, { cache: "no-cache" });
                headers = ["cross-origin-opener-policy", "cross-origin-embedder-policy"].map((h) => h + ": " + (r.headers.get(h) || "missing")).join(" · ");
            } catch (e) { /* offline */ }
            return [
                ["crossOriginIsolated", yes(window.crossOriginIsolated)],
                ["SharedArrayBuffer available", yes(typeof SharedArrayBuffer !== "undefined")],
                ["Processor threads", String(navigator.hardwareConcurrency || "unknown")],
                ["Headers on this page", headers]
            ];
        },
        tryIt: "In the developer tools console type crossOriginIsolated and typeof SharedArrayBuffer. Then Application → Service workers → Unregister, reload once without the worker, and type them again.",
        docs: ["sw.js.md", "data/src/emulator.js.md"],
        quiz: { q: "Who adds the isolation headers on GitHub Pages?", options: ["GitHub", "The service worker", "The emulator core"], answer: 1, why: "GitHub Pages can't set headers, but a service worker can add them to every response." }
    },
    {
        id: "wasm",
        title: "WebAssembly cores",
        summary: "Each console is emulated by a RetroArch 'core' written in C or C++ and compiled to WebAssembly. Cores ship as .7z archives in data/cores/; the engine downloads one, unpacks it in a worker, and runs it at near-native speed.",
        points: [
            "data/cores/manifest.json lists the installed cores and a version for each file, so caches know when a core changed.",
            "A core comes in up to four builds: with or without threads, WebGL 2 or legacy WebGL.",
            "The engine picks the build for this browser (assets/common.js coreFileFor shows the rule).",
            "The core talks to JavaScript through a few exported functions: simulate_input, get_video_dimensions, save states …"
        ],
        code: [{ file: "assets/common.js", from: "^export function coreFileFor", count: 13 }],
        live: async () => {
            let cores = "–", files = "–";
            try {
                const m = await (await fetch("data/cores/manifest.json")).json();
                cores = String(Object.keys(m.cores || {}).length);
                files = String(Object.keys(m.files || {}).length);
            } catch (e) { /* none */ }
            return [
                ["WebAssembly", yes(typeof WebAssembly === "object")],
                ["Streaming compile", yes(typeof WebAssembly === "object" && !!WebAssembly.instantiateStreaming)],
                ["Cores installed", cores],
                ["Core files (all builds)", files],
                ["NES core this browser would load", (await import("./common.js")).coreFileFor("nes", "emulatorjs", {}) || "not installed"]
            ];
        },
        tryIt: "Start a game, then Network tab: find the core .7z and its size. Reload: it now comes from the service worker.",
        docs: ["data/src/emulator.js.md", "assets/common.js.md", "data/src/GameManager.js.md"],
        quiz: { q: "Why are there threaded and non-threaded builds of a core?", options: ["Threads need cross-origin isolation, which not every browser or host has", "Threaded cores are for phones only", "Licensing"], answer: 0, why: "Without isolation there is no SharedArrayBuffer, so the single-threaded build is used." }
    },
    {
        id: "webgl",
        title: "The WebGL picture pipeline",
        summary: "The core draws each frame into a WebGL canvas. This edition sizes that canvas to the game picture at a whole-number scale and lets CSS do the last step, so fewer pixels are drawn and pixel art stays sharp.",
        points: [
            "Picture-sized buffer: a 256 × 224 NES picture is drawn at 3× (768 × 672), not at the full window size.",
            "image-rendering: pixelated keeps edges crisp when the browser scales it the rest of the way.",
            "Lean surface: the canvas is opaque and 2D cores get no depth or stencil buffer, which saves memory and compositing.",
            "Devices with high pixel density (phones) need the buffer measured in device pixels, which performance.js does."
        ],
        code: [{ file: "data/src/performance.js", from: "contextAttributes\\(requested\\)", count: 16 }],
        live: async () => {
            const c = document.createElement("canvas");
            const gl = c.getContext("webgl2") || c.getContext("webgl");
            let renderer = "unknown";
            if (gl) {
                const ext = gl.getExtension("WEBGL_debug_renderer_info");
                renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
            }
            return [
                ["WebGL 2", yes(!!document.createElement("canvas").getContext("webgl2"))],
                ["Graphics", String(renderer)],
                ["Largest texture", gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) + " px" : "–"],
                ["Device pixel ratio", String(window.devicePixelRatio)],
                ["NES picture at 3× in device pixels", `${768} × ${672} (${Math.round(768 / devicePixelRatio)} × ${Math.round(672 / devicePixelRatio)} CSS px)`]
            ];
        },
        demo: (host) => {
            host.appendChild(el("p", "small muted", "The same 16 × 16 sprite scaled 8×: left with smoothing (blurry), right pixelated (what the player uses)."));
            const row = el("div", "dev-demo-row");
            const art = ["0000011111100000", "0001122222211000", "0012222222222100", "0122332222332210", "0122332222332210", "1222222222222221", "1222222222222221", "1223222222223221", "1222322222232221", "0122233333322210", "0122222222222210", "0012222222222100", "0001122222211000", "0000011111100000", "0000000000000000", "0000000000000000"];
            const pal = ["#00000000", "#1a1a2e", "#f8b800", "#ffffff"];
            const src = document.createElement("canvas");
            src.width = src.height = 16;
            const sctx = src.getContext("2d");
            art.forEach((r, y) => [...r].forEach((v, x) => { if (v !== "0") { sctx.fillStyle = pal[v]; sctx.fillRect(x, y, 1, 1); } }));
            for (const smooth of [true, false]) {
                const c = document.createElement("canvas");
                c.width = c.height = 16;
                c.getContext("2d").drawImage(src, 0, 0);
                c.className = "dev-scale" + (smooth ? " smooth" : "");
                row.appendChild(c);
            }
            host.appendChild(row);
        },
        tryIt: "Start a game and press Shift+F10 for the performance stats, or open the F1 panel: it shows the buffer size and how many pixels a frame costs.",
        docs: ["data/src/performance.js.md", "data/src/frontend.js.md"],
        quiz: { q: "What does image-rendering: pixelated do?", options: ["Adds scanlines", "Scales without smoothing, so pixels stay square", "Makes the canvas smaller"], answer: 1, why: "Each console pixel becomes a sharp block instead of a blur." }
    },
    {
        id: "audio",
        title: "Web Audio and the autoplay rules",
        summary: "The core produces sound samples; the browser plays them through an AudioContext. Browsers only allow sound after a tap or key press, and phones interrupt audio for calls, so the player resumes it carefully and switches it off while a game is paused.",
        points: [
            "An AudioContext starts 'suspended' until the user interacts with the page.",
            "Idle audio suspension: while a game is paused or hidden, the context is suspended so the sound thread stops using the processor.",
            "On iPhone, audio may be 'interrupted' by a call or Siri; the player resumes on the next touch.",
            "The Classroom taps the sound with an AnalyserNode to draw waveforms."
        ],
        code: [{ file: "data/src/performance.js", from: "^    updateAudioPower\\(\\)", count: 14 }],
        live: async () => {
            const AC = window.AudioContext || window.webkitAudioContext;
            let rate = "–", state = "–";
            if (AC) {
                const ctx = new AC();
                rate = ctx.sampleRate + " Hz";
                state = ctx.state;
                ctx.close();
            }
            return [
                ["Web Audio", yes(!!AC)],
                ["Sample rate of this device", rate],
                ["A new context starts", state + (state === "suspended" ? " (needs a tap first)" : "")],
                ["Autoplay policy", navigator.getAutoplayPolicy ? navigator.getAutoplayPolicy("audiocontext") : "not reported by this browser"]
            ];
        },
        tryIt: "Start a game, pause it (F5) and watch the processor use in the browser's task manager drop.",
        docs: ["data/src/performance.js.md"],
        quiz: { q: "Why does a new AudioContext often start suspended?", options: ["To save battery", "Browsers block sound until the user interacts", "The core is not loaded"], answer: 1, why: "Autoplay rules stop pages from making noise nobody asked for." }
    },
    {
        id: "storage",
        title: "Saving: IndexedDB, Cache Storage and localStorage",
        summary: "Games, save states, in-game saves and settings all stay in the browser. Each kind of data uses the storage that fits it.",
        points: [
            "IndexedDB for big binary data: recent games (EJS-library), My Collection (EJS-collection), save states (EmulatorJS-states), in-game saves (/data/saves), speedrun save points (EJS-practice) and Classroom moments (EJS-classroom).",
            "Cache Storage for files fetched by URL: site files, cores, the kiosk's offline games.",
            "localStorage for small settings: engine choice, options, preferred cores, kiosk settings.",
            "navigator.storage.persist() asks the browser not to clear the data (Safari otherwise may after weeks without a visit)."
        ],
        code: [{ file: "assets/collection-store.js", from: "^function db\\(\\)", count: 15 }],
        live: async () => {
            const rows = [];
            if (indexedDB.databases) {
                const dbs = await indexedDB.databases();
                rows.push(["IndexedDB databases", dbs.map((d) => d.name).join(", ") || "none yet"]);
            } else rows.push(["IndexedDB", "available (this browser can't list databases)"]);
            const keys = [];
            try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) { /* blocked */ }
            rows.push(["Settings in localStorage", keys.filter((k) => /^ejs/.test(k)).join(", ") || "none yet"]);
            if (navigator.storage && navigator.storage.persisted) rows.push(["Storage kept (persisted)", yes(await navigator.storage.persisted())]);
            return rows;
        },
        tryIt: "Developer tools → Application → IndexedDB: open EJS-collection after adding a game in My Collection.",
        docs: ["assets/library.js.md", "data/src/storage.js.md", "assets/backup.js.md"],
        quiz: { q: "Where would you keep a 4 MB game file?", options: ["localStorage", "IndexedDB", "A cookie"], answer: 1, why: "IndexedDB stores binary data and large sizes; localStorage holds a few MB of text." }
    },
    {
        id: "input",
        title: "Keyboard, controllers and touch",
        summary: "Input arrives from three browser APIs and ends in one place: the core's simulate_input(player, button, value). Keyboard events, the Gamepad API (polled every frame) and touch events on the on-screen pad.",
        points: [
            "Keyboard: key codes are mapped to RetroPad buttons (arrows, Z, X, Enter …) in the controls settings.",
            "Gamepad API: navigator.getGamepads() is read on every animation frame; there are no events for button presses.",
            "Touch: the virtual gamepad uses pointer and touch events; nipplejs draws the stick.",
            "Try it below: press keys or a controller button."
        ],
        code: [{ file: "data/src/GameManager.js", from: "^    simulateInput\\(player", count: 6 }],
        live: async () => [
            ["Pointer", matchMedia("(pointer: coarse)").matches ? "coarse (touch)" : "fine (mouse or pen)"],
            ["Touch points", String(navigator.maxTouchPoints || 0)],
            ["Gamepad API", yes(!!navigator.getGamepads)],
            ["Controllers connected", String(navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean).length : 0) + " (press a button to wake one)"]
        ],
        demo: (host) => {
            const out = el("p", "dev-live-input", "Press a key or a controller button…");
            host.appendChild(out);
            const onKey = (e) => { out.textContent = `key "${e.key}" · code ${e.code}${e.repeat ? " (repeat)" : ""}`; };
            window.addEventListener("keydown", onKey);
            let raf = 0;
            const poll = () => {
                const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
                for (const p of pads) {
                    const pressed = p.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0);
                    if (pressed.length) out.textContent = `${p.id.slice(0, 40)} · buttons ${pressed.join(", ")} · stick ${p.axes.slice(0, 2).map((a) => a.toFixed(2)).join(", ")}`;
                }
                raf = requestAnimationFrame(poll);
            };
            raf = requestAnimationFrame(poll);
            return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); };
        },
        tryIt: "The Classroom's Input view shows every press with the frame it reached the game in.",
        docs: ["data/src/gamepad.js.md", "data/src/GameManager.js.md"],
        quiz: { q: "How does a page learn that a controller button was pressed?", options: ["A 'gamepadbutton' event", "By reading navigator.getGamepads() every frame", "Through the keyboard"], answer: 1, why: "The Gamepad API has connect events, but buttons must be polled." }
    },
    {
        id: "responsive",
        title: "Responsive phone layout",
        summary: "One set of pages adapts to phones, tablets and computers. A small script runs before the page draws and tags the <html> element (m-phone, m-touch, m-ios, m-portrait …), so CSS can switch layouts without a flash.",
        points: [
            "assets/early-view.js runs in <head>, before the CSS applies, and sets the classes.",
            "--app-h holds the real visible height; 100vh is wrong on phones whose address bar shows and hides.",
            "env(safe-area-inset-*) keeps controls clear of the notch and the home indicator.",
            "The game page turns its bar into a menu sheet on phones and follows rotation."
        ],
        code: [{ file: "assets/mobile.js", from: "^export const device", count: 9 }],
        live: async () => {
            const probe = el("div");
            probe.style.cssText = "position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);left:env(safe-area-inset-left);right:env(safe-area-inset-right);visibility:hidden";
            document.body.appendChild(probe);
            const r = probe.getBoundingClientRect();
            const de = document.documentElement;
            const insets = [r.top, de.clientHeight - r.bottom, r.left, de.clientWidth - r.right].map(Math.round).join(" / ");
            probe.remove();
            return [
                ["Window", `${innerWidth} × ${innerHeight} CSS px`],
                ["Phone view", yes(isPhoneView())],
                ["Classes on <html>", [...document.documentElement.classList].filter((c) => c.startsWith("m-")).join(" ") || "none"],
                ["Orientation", matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape"],
                ["Safe area (top / bottom / left / right)", insets + " px"],
                ["Installed as an app", yes(device.standalone)]
            ];
        },
        tryIt: "Developer tools → device toolbar (Ctrl+Shift+M): pick an iPhone and rotate it on the game page.",
        docs: ["assets/app.css.md", "play.html.md"],
        quiz: { q: "Why run early-view.js before the stylesheet?", options: ["It is faster to download", "So the right layout applies on the first paint, with no flash", "Browsers require it"], answer: 1, why: "Classes set after the first paint would make phones show the desktop layout for a moment." }
    },
    {
        id: "detect",
        title: "Recognising a game file",
        summary: "When you open a file, the site works out the console from the bytes at the start of the file (its 'magic number') and, for zips, from what is inside. Try it: choose any game file; nothing is uploaded.",
        points: [
            "NES files start with the bytes 4E 45 53 1A ('NES' and an end-of-file mark).",
            "Game Boy, SNES, Mega Drive and N64 games have headers at known places.",
            "Zip files are read from their central directory, and the largest file is decompressed with the browser's DecompressionStream.",
            "When the bytes can't decide, the site asks, instead of guessing wrong."
        ],
        code: [{ file: "assets/detect.js", from: "^export function sniffHeader", count: 14 }],
        live: async () => [["Systems the site knows", String(SYSTEMS.length)], ["DecompressionStream (zips)", yes(typeof DecompressionStream !== "undefined")]],
        demo: (host) => {
            const label = el("label", "button", "Choose a file to inspect");
            const input = el("input");
            input.type = "file";
            input.hidden = true;
            label.appendChild(input);
            const out = el("pre", "dev-hex", "");
            host.append(label, out);
            input.addEventListener("change", async () => {
                const f = input.files[0];
                if (!f) return;
                const head = new Uint8Array(await f.slice(0, 32).arrayBuffer());
                const hex = [...head].map((b) => b.toString(16).padStart(2, "0")).join(" ");
                const ascii = [...head].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
                const r = await detectSystem(f, SYSTEMS);
                out.textContent = `${f.name} (${kb(f.size)})\nFirst 32 bytes: ${hex}\nAs text:        ${ascii}\nDetected: ${r.system ? labelFor(r.system) : "not sure"}${r.reason ? " (" + r.reason + ")" : ""}`;
            });
        },
        tryIt: "Open a .zip of a game here and compare with what the Basic page's Load game dialog says.",
        docs: ["assets/detect.js.md"],
        quiz: { q: "What are the first four bytes of an iNES (NES) file?", options: ["50 4B 03 04", "4E 45 53 1A", "FF D8 FF E0"], answer: 1, why: "\"NES\" and an end-of-file mark; 50 4B is a zip and FF D8 a JPEG." }
    },
    {
        id: "hashes",
        title: "Checksums in the browser",
        summary: "The Preservation archive and the Homebrew showcase prove that a game file is exactly the one that was published, by computing its CRC32, MD5 and SHA-1 right in the browser. Nothing is uploaded.",
        points: [
            "SHA-1 comes from the Web Crypto API (crypto.subtle.digest), which runs in native code but only in a secure context (https or localhost).",
            "Web Crypto has no CRC32 or MD5, so assets/hashes.js writes them out in JavaScript. Preservation catalogues such as No-Intro and Redump list all three.",
            "Big files are read in 4 MB slices with blob.slice(), so memory stays low and a progress bar can move.",
            "The index builders in tools/ compute the same checksums in Node, so the site and the published list always agree."
        ],
        code: [{ file: "assets/hashes.js", from: "^export async function checksums", count: 18 }],
        live: async () => {
            let abc = "–";
            if (window.crypto && crypto.subtle) {
                const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode("abc"));
                abc = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
            }
            const t0 = performance.now();
            const r = await checksums(new Blob([new Uint8Array(1048576)]));
            const ms = performance.now() - t0;
            return [
                ["Web Crypto (crypto.subtle)", yes(!!(window.crypto && crypto.subtle))],
                ["Secure context", yes(window.isSecureContext)],
                ["SHA-1 of \"abc\"", abc],
                ["All three checksums of 1 MB", `${Math.round(ms)} ms (CRC32 ${r.crc32})`]
            ];
        },
        demo: (host) => {
            host.appendChild(el("p", "small muted", "Choose any file: its checksums are worked out on this device. Compare them with a record in the Preservation archive."));
            const label = el("label", "button", "Choose a file");
            const input = el("input");
            input.type = "file";
            input.hidden = true;
            label.appendChild(input);
            const out = el("pre", "dev-hex", "");
            host.append(label, out);
            input.addEventListener("change", async () => {
                const f = input.files[0];
                if (!f) return;
                const t0 = performance.now();
                out.textContent = "Reading…";
                const r = await checksums(f, (p) => { out.textContent = `Reading… ${Math.round(p * 100)} %`; });
                const s = (performance.now() - t0) / 1000;
                out.textContent = `${f.name} (${kb(f.size)})\nCRC32  ${r.crc32}\nMD5    ${r.md5}\nSHA-1  ${r.sha1 || "needs a secure context"}\nTime   ${s.toFixed(2)} s (${kb(f.size / Math.max(s, 0.001))} per second)`;
            });
        },
        tryIt: "Open archive.html, press Verify every file, and watch the same code check each record.",
        docs: ["assets/hashes.js.md", "assets/archive.js.md", "tools/generate-archive-index.mjs.md"],
        quiz: { q: "Why are CRC32 and MD5 written in JavaScript in this site?", options: ["Web Crypto doesn't offer them", "They are faster in JavaScript", "SHA-1 is not allowed on GitHub Pages"], answer: 0, why: "crypto.subtle.digest only knows the SHA family." }
    },
    {
        id: "frames",
        title: "Pages inside pages: iframes and postMessage",
        summary: "The kiosk, the Classroom, the speedrun races, Comfort play and the Homebrew 'Play here' button all run the player (play.html) inside an iframe. The two pages talk through postMessage, and because they share an origin the outer page can also read the running emulator directly.",
        points: [
            "play.html?embed=1 hides the site bar; ?kiosk=1 also locks the player down and reports to the outer page: started, error, activity, exit.",
            "Messages carry a source field (\"ejs-kiosk\", \"ejs-kiosk-frame\") and are only trusted when e.origin is this site and e.source is the expected frame.",
            "Same-origin frames can be reached directly: the Classroom reads frame.contentWindow.EJS_emulator to draw its live views.",
            "A fresh iframe for each kiosk visitor throws away all of the previous game's memory at once."
        ],
        code: [{ file: "assets/play.js", from: "^function kioskPost", count: 4 }, { file: "assets/kiosk.js", from: "^window.addEventListener\\(\"message\"", count: 12 }],
        live: async () => [
            ["This page is inside a frame", yes(window.top !== window)],
            ["Frames on this page", String(document.querySelectorAll("iframe").length)],
            ["Origin messages must come from", location.origin],
            ["Embedded player address", "play.html?embed=1&url=homebrew/sprite-lab/sprite-lab.nes&core=nes"]
        ],
        demo: (host) => {
            host.appendChild(el("p", "small muted", "A tiny page in a frame below answers every message it gets. Send it one and watch both sides. (The frame checks self.origin: a srcdoc frame's location.origin is \"null\", though it shares this page's origin.)"));
            const frame = el("iframe", "dev-frame");
            frame.title = "Message demo";
            frame.srcdoc = `<!DOCTYPE html><body style="font:14px system-ui;color:#e6e9ed;background:#0b0f14;margin:8px"><b>Inside the frame</b><div id="log">Waiting for a message…</div><script>
addEventListener("message", (e) => {
  if (e.origin !== self.origin || !e.data || e.data.source !== "ejs-devtour") return;
  document.getElementById("log").textContent = "Got: " + e.data.text;
  parent.postMessage({ source: "ejs-devtour-frame", text: "Thanks! I got " + e.data.text.length + " letters." }, self.origin);
});<\/script>`;
            const row = el("div", "cls-row");
            const input = el("input");
            input.value = "Hello, frame";
            input.setAttribute("aria-label", "Message to send");
            const send = el("button", "primary", "Send");
            send.type = "button";
            row.append(input, send);
            const out = el("p", "dev-live-input", "Replies appear here.");
            host.append(frame, row, out);
            send.addEventListener("click", () => frame.contentWindow.postMessage({ source: "ejs-devtour", text: input.value }, location.origin));
            const onMessage = (e) => {
                if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || e.data.source !== "ejs-devtour-frame") return;
                out.textContent = "Frame replied: " + e.data.text;
            };
            window.addEventListener("message", onMessage);
            return () => window.removeEventListener("message", onMessage);
        },
        tryIt: "Open kiosk.html, then in the console of the game frame type parent.postMessage({ source: \"ejs-kiosk-frame\", type: \"exit\" }, location.origin): the kiosk goes back to its game list.",
        docs: ["assets/play.js.md", "assets/kiosk.js.md", "assets/classroom.js.md"],
        quiz: { q: "Why does the kiosk check e.origin and e.source before trusting a message?", options: ["Any page holding a reference to the window can send it messages, including other sites", "postMessage is slow", "Browsers require a check"], answer: 0, why: "A message is only as trustworthy as its sender." }
    },
    {
        id: "brand",
        title: "One file brands every page",
        summary: "site.json holds the site's name, logo, colours and which parts it offers. A tiny script in every page's <head>, assets/early-view.js, applies the colours as CSS custom properties before the first paint, from the copy it kept last time, then fetches the file fresh.",
        points: [
            "Colours become variables such as --accent and --bg on <html>; the stylesheet uses var(--accent) everywhere, so one change recolours every page.",
            "Applying them in <head>, before the stylesheet draws anything, avoids a flash of the default colours.",
            "?site=… previews another design for one page load without saving anything: the Site kit's live preview uses it.",
            "A page that site.json turns off sends the visitor to the start page, so a branded copy only shows what it offers."
        ],
        code: [{ file: "assets/early-view.js", from: "var VARS = ", count: 12 }],
        live: async () => {
            const css = getComputedStyle(document.documentElement);
            const rows = [["Site name", (window.EJS_SITE && window.EJS_SITE.name) || "EmulatorJS (default)"]];
            for (const v of ["--accent", "--primary", "--bg", "--card", "--text"]) rows.push([v, css.getPropertyValue(v).trim() || "–"]);
            return rows;
        },
        demo: (host) => {
            host.appendChild(el("p", "small muted", "Pick a colour: it is set as --accent on this page only, and everything drawn with var(--accent) follows. Nothing is saved."));
            const row = el("div", "cls-row");
            const pick = el("input");
            pick.type = "color";
            pick.value = (getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#1aafff").slice(0, 7);
            pick.setAttribute("aria-label", "Accent colour");
            const reset = el("button", null, "Put it back");
            reset.type = "button";
            const before = document.documentElement.style.getPropertyValue("--accent");
            const restore = () => { if (before) document.documentElement.style.setProperty("--accent", before); else document.documentElement.style.removeProperty("--accent"); };
            pick.addEventListener("input", () => document.documentElement.style.setProperty("--accent", pick.value));
            reset.addEventListener("click", restore);
            row.append(pick, reset);
            host.appendChild(row);
            return restore;
        },
        tryIt: "Open kit.html, change the accent colour and watch the preview of the real pages follow it.",
        docs: ["assets/early-view.js.md", "site.json.md", "assets/kit.js.md"],
        quiz: { q: "Why are the colours applied by a script in <head> instead of after the page loads?", options: ["So the very first paint already has the right colours", "Scripts in <head> download faster", "CSS can't read JSON"], answer: 0, why: "Otherwise the page would flash the default colours first." }
    },
    {
        id: "a11y",
        title: "Accessibility built in",
        summary: "Every page works with a keyboard and a screen reader and follows the visitor's system settings. Comfort play then adds options inside the game itself: speed, rewind, captions for sounds and one-switch play.",
        points: [
            "Status messages go into an aria-live region (the banners box), so screen readers announce them without moving the focus.",
            "@media (prefers-reduced-motion: reduce) switches off pulsing and sliding animations.",
            "Controls are real <button> and <label> elements; buttons that only show a symbol get an aria-label.",
            "Focus moves on purpose: the kiosk focuses the first game tile, a dialog focuses its first button, and :focus-visible keeps the outline for keyboard users."
        ],
        code: [{ file: "assets/common.js", from: "^export function banner", count: 12 }],
        live: async () => [
            ["Reduce motion", matchMedia("(prefers-reduced-motion: reduce)").matches ? "on" : "off"],
            ["More contrast", matchMedia("(prefers-contrast: more)").matches ? "on" : "off"],
            ["Forced colours (Windows high contrast)", matchMedia("(forced-colors: active)").matches ? "on" : "off"],
            ["Colour scheme", matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"],
            ["aria-live regions on this page", String(document.querySelectorAll("[aria-live]").length)]
        ],
        demo: (host) => {
            host.appendChild(el("p", "small muted", "With a screen reader on, press the button: the message is read out while the focus stays here."));
            const b = el("button", null, "Announce a message");
            b.type = "button";
            b.addEventListener("click", () => banner("This message was announced through an aria-live region.", "ok"));
            host.appendChild(b);
        },
        tryIt: "Turn on Reduce motion in your system settings (or emulate it in the developer tools' Rendering panel) and open kiosk.html: the pulsing stops.",
        docs: ["assets/app.css.md", "assets/common.js.md", "assets/comfort.js.md"],
        quiz: { q: "How does a screen reader learn about a status message without the focus moving?", options: ["It reads the whole page again", "The message is placed in an aria-live region", "Through an alert() box"], answer: 1, why: "aria-live regions are announced when their content changes." }
    },
    {
        id: "deploy",
        title: "Publishing with GitHub Pages and a workflow",
        summary: "Pushing to GitHub publishes the site. A GitHub Actions workflow rebuilds the lists the pages read (game folders, homebrew games, reference docs) whenever those files change, so nobody edits JSON by hand.",
        points: [
            ".github/workflows/update-indexes.yml runs the generators in tools/ (game lists, cores, reference docs, homebrew, archive) and commits the results.",
            "tools/generate-core-manifest.mjs lists the cores and their versions for caching.",
            "tools/generate-homebrew-index.mjs checks every homebrew folder and fails on a broken one.",
            "HTTPS on github.io gives a secure context, which service workers and crypto need."
        ],
        code: [{ file: ".github/workflows/update-indexes.yml", from: "^on:", count: 14 }],
        live: async () => [
            ["Secure context (https or localhost)", yes(window.isSecureContext)],
            ["Host", location.host],
            ["Site files cache version", (await (async () => { try { return (await caches.keys()).find((n) => n.endsWith("-shell")) || "–"; } catch (e) { return "–"; } })())]
        ],
        tryIt: "Fork the repository, enable Pages (Settings → Pages → Deploy from branch), and open your-name.github.io/repository.",
        docs: ["README.md.md", "tools/generate-core-manifest.mjs.md", "package.json.md"],
        quiz: { q: "Why does the workflow rebuild homebrew/index.json instead of people editing it?", options: ["JSON can't be edited", "So the list always matches the folders, with every entry checked", "GitHub needs it"], answer: 1, why: "A hand-edited list drifts; a generated one can't." }
    }
];

// ---------- exercises ----------
const EXERCISES = [
    {
        id: "hotkey",
        title: "Add a hotkey",
        goal: "Make Shift+F7 in a running game show the message HELLO FROM ME.",
        files: ["data/src/enhancements.js"],
        hints: [
            "Find bindHotkeys() in data/src/enhancements.js. The actions object maps a key name to a function.",
            "F7 is already there: F7: () => this.toggleSetting(...). Change it to check e.shiftKey, like F2 does.",
            "F7: (e) => (e.shiftKey ? this.message(\"HELLO FROM ME\") : this.toggleSetting(\"slowMotion\", \"isSlowMotion\", \"SLOW MOTION\")),"
        ],
        check: async () => /HELLO FROM ME/.test(await (await fetch("data/src/enhancements.js", { cache: "no-cache" })).text()) ? [true, "Found your message in enhancements.js. Start a game and press Shift+F7."] : [false, "The message is not in data/src/enhancements.js yet (save the file and reload)."]
    },
    {
        id: "platform",
        title: "Add a platform folder",
        goal: "Add a Game Boy Advance folder, data/GBA/, so its games appear in the game library.",
        files: ["data/platforms.json", "data/GBA/index.json"],
        hints: [
            "data/platforms.json lists the folders. Copy an entry and change folder, label, system and short.",
            "The system id for Game Boy Advance is gba (see assets/detect.js, SYSTEMS).",
            "Create data/GBA/ with your game and an index.json: { \"files\": [{ \"name\": \"mygame.gba\" }] } (or run node tools/generate-rom-index.mjs)."
        ],
        check: async () => {
            const p = await (await fetch("data/platforms.json", { cache: "no-cache" })).json();
            const gba = (p.platforms || []).find((x) => x.system === "gba");
            if (!gba) return [false, "No platform with system \"gba\" in data/platforms.json yet."];
            const r = await fetch(`data/${gba.folder}/index.json`, { cache: "no-cache" });
            return r.ok ? [true, `Folder data/${gba.folder}/ is listed. Open play.html to see it in the Platform menu.`] : [false, `The platform is listed; now add data/${gba.folder}/index.json.`];
        }
    },
    {
        id: "homebrew",
        title: "Publish a homebrew game",
        goal: "Add a fourth game to the Homebrew showcase.",
        files: ["homebrew/<your-game>/game.json", "tools/new-homebrew.mjs"],
        hints: [
            "Use one of the included programs as your game: copy homebrew/palette-explorer/palette-explorer.nes somewhere and rename it.",
            "Run: node tools/new-homebrew.mjs mygame.nes --title \"My Game\" --author \"Me\" --license CC0-1.0",
            "The tool writes homebrew/my-game/game.json and rebuilds homebrew/index.json. Reload the showcase."
        ],
        check: async () => {
            const d = await (await fetch("homebrew/index.json", { cache: "no-cache" })).json();
            const mine = (d.games || []).filter((g) => !SHIPPED.homebrew.includes(g.folder));
            return mine.length ? [true, `Found ${mine.map((g) => g.title).join(", ")} in the showcase.`] : [false, "Only the three included games are in homebrew/index.json."];
        }
    },
    {
        id: "field",
        title: "Add a field to the game pages",
        goal: "Give homebrew games a \"difficulty\" field and show it on their pages.",
        files: ["homebrew/<game>/game.json", "tools/generate-homebrew-index.mjs", "assets/homebrew.js"],
        hints: [
            "Add \"difficulty\": \"Easy\" to a game.json.",
            "The index generator only copies the fields it knows: add difficulty where it builds each entry, then run node tools/generate-homebrew-index.mjs.",
            "In assets/homebrew.js, showGame() has fact(\"Genre\", ...) style lines: add fact(\"Difficulty\", game.difficulty)."
        ],
        check: async () => {
            const d = await (await fetch("homebrew/index.json", { cache: "no-cache" })).json();
            const g = (d.games || []).find((x) => x.difficulty);
            if (!g) return [false, "No game in homebrew/index.json has a difficulty yet (did the generator copy it?)."];
            const js = await (await fetch("assets/homebrew.js", { cache: "no-cache" })).text();
            return /difficulty/i.test(js) ? [true, `${g.title} has difficulty "${g.difficulty}" and homebrew.js shows it.`] : [false, "The index has the field; now show it in assets/homebrew.js."];
        }
    },
    {
        id: "sw",
        title: "Ship an update",
        goal: "Change the service worker version and watch every open page update.",
        files: ["sw.js"],
        hints: [
            "At the top of sw.js: const VERSION = \"ejs-local-…\". Change the number.",
            "Reload this page. Developer tools → Application → Cache Storage now shows the new names; the old caches are gone.",
            "The Live panel on the Service worker stop shows the cache names too."
        ],
        // The version when the exercise was first opened is the starting point (no number to keep in step here)
        open: async () => { if (!progress.swBase) { progress.swBase = await swVersion(); save(); } },
        check: async () => {
            const v = await swVersion();
            if (!progress.swBase) { progress.swBase = v; save(); }
            if (!v || v === progress.swBase) return [false, `sw.js still says ${v || "?"}, the version it had when you started this exercise.`];
            const names = await caches.keys();
            return names.some((n) => n.startsWith(v)) ? [true, `The new version ${v} is installed and its caches are in use.`] : [false, `sw.js says ${v}; reload the page so the new worker installs.`];
        }
    },
    {
        id: "lesson",
        title: "Write a lesson card",
        goal: "Add a new lesson to the Classroom, with an exit ticket.",
        files: ["assets/lessons.js"],
        hints: [
            "assets/lessons.js exports LESSONS, an array. Copy one lesson object (from { id: to its closing },) to the end of the array.",
            "Give it a new id and title, and make the plan minutes add up to 45.",
            "Exit tickets live in QUIZZES at the bottom of the file, keyed by lesson id: add four questions for your id, each with options, answer (counted from 0) and why.",
            "Reload classroom.html: the new card appears, and Start teaching and Print worksheet work for it straight away."
        ],
        check: async () => {
            const m = await import("./lessons.js?check=" + Date.now());
            const mine = m.LESSONS.filter((l) => !SHIPPED.lessons.includes(l.id));
            if (!mine.length) return [false, `There are still only the ${SHIPPED.lessons.length} lessons that came with the site.`];
            const bad = m.LESSONS.filter((l) => l.plan.reduce((a, p) => a + p.min, 0) !== 45).map((l) => l.title);
            if (bad.length) return [false, `Plans must add up to 45 minutes: ${bad.join(", ")}.`];
            const noQuiz = mine.filter((l) => !(l.quiz && l.quiz.length));
            if (noQuiz.length) return [false, `${noQuiz.map((l) => l.title).join(", ")} has no exit ticket yet (QUIZZES["${noQuiz[0].id}"]).`];
            const wrong = mine.flatMap((l) => l.quiz).filter((q) => !(q.answer >= 0 && q.answer < q.options.length));
            return wrong.length ? [false, `The answer number of "${wrong[0].q}" doesn't point at one of its options (count from 0).`] : [true, `Your lesson ${mine.map((l) => "\"" + l.title + "\"").join(", ")} is ready, with an exit ticket.`];
        }
    },
    {
        id: "kiosklang",
        title: "Add a language to the kiosk",
        goal: "Add a seventh language (Dutch, Polish, Japanese … any you know) to the kiosk's built-in visitor wording, so staff can choose it.",
        files: ["assets/kiosk.js"],
        hints: [
            "LANGS near the top of assets/kiosk.js has one entry per language. Copy the es: { … } line.",
            "Give it the language's two-letter code (nl, pl, ja …) and its own name, then translate every text. Keep {t} and {when} exactly as they are: they are filled in later.",
            "sound is a list of three: loud, quiet and off. Reload kiosk.html and open the settings: your language is in both Language menus."
        ],
        check: async () => {
            const text = await (await fetch("assets/kiosk.js", { cache: "no-cache" })).text();
            const lines = [...text.matchAll(/^ {4}([a-z]{2,3}): \{ name: "([^"]+)"(.*)$/gm)];
            const en = lines.find((l) => l[1] === "en");
            const mine = lines.filter((l) => !SHIPPED.kioskLangs.includes(l[1]));
            if (!mine.length) return [false, "LANGS still has only the six languages that came with the site."];
            const keys = en ? [...en[3].matchAll(/ (\w+): /g)].map((m) => m[1]) : [];
            for (const l of mine) {
                const missing = keys.filter((k) => !new RegExp(" " + k + ": ").test(l[3]));
                if (missing.length) return [false, `${l[2]} (${l[1]}) is missing: ${missing.join(", ")}.`];
                if (!/\{t\}/.test(l[3]) || !/\{when\}/.test(l[3])) return [false, `${l[2]} must keep {t} in "left" and {when} in "closedOpens".`];
            }
            return [true, `${mine.map((l) => l[2]).join(", ")} is ready. Pick it in the kiosk settings.`];
        }
    },
    {
        id: "brand",
        title: "Brand your copy",
        goal: "Give your copy of the site its own name and accent colour, and see every page follow.",
        files: ["site.json", "kit.html"],
        hints: [
            "The easy way: open kit.html, change the name and accent colour while watching the preview, then Download site.json and put it next to index.html.",
            "By hand: in site.json change \"name\" and colors.accent (a colour like #ff6a00).",
            "Reload any page: the title, the buttons and the highlights now use your values."
        ],
        check: async () => {
            const site = await (await fetch("site.json", { cache: "no-cache" })).json();
            const accent = String((site.colors || {}).accent || "").toLowerCase();
            if ((site.name || SHIPPED.name) === SHIPPED.name && (!accent || accent === SHIPPED.accent)) return [false, "site.json still has the name EmulatorJS and the accent colour #1aafff."];
            if (accent && !/^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(accent)) return [false, `${accent} is not a colour the pages can use: write it as #rrggbb.`];
            const shown = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().toLowerCase();
            if (accent && shown && shown !== accent) return [false, "site.json is changed; reload this page so it picks up the new colours."];
            return [true, `Your copy is called "${site.name}"${accent ? " with the accent " + accent : ""}.`];
        }
    }
];

// ---------- page ----------
let cleanup = null;
let currentId = null;
function renderNav(current) {
    currentId = current;
    const total = STOPS.length + EXERCISES.length;
    const done = STOPS.filter((s) => progress.seen[s.id]).length + EXERCISES.filter((e) => progress.done[e.id]).length;
    const answered = STOPS.filter((s) => s.id in progress.quiz);
    const right = answered.filter((s) => progress.quiz[s.id]).length;
    $("devProgress").textContent = `${done} of ${total} done` + (answered.length ? ` · quizzes ${right} of ${answered.length} right first time` : "");
    for (const [list, items, kind] of [[$("devStops"), STOPS, "stop"], [$("devExercises"), EXERCISES, "ex"]]) {
        list.textContent = "";
        for (const it of items) {
            const li = el("li");
            const a = el("a", (current === it.id ? "on " : "") + ((kind === "stop" ? progress.seen[it.id] : progress.done[it.id]) ? "done" : ""), it.title);
            a.href = "?" + (kind === "stop" ? "stop=" : "exercise=") + it.id;
            a.addEventListener("click", (e) => { e.preventDefault(); kind === "stop" ? showStop(it.id) : showExercise(it.id); });
            li.appendChild(a);
            list.appendChild(li);
        }
    }
    const jump = $("devJump");
    if (!jump.options.length) {
        for (const s of STOPS) jump.add(new Option("Tour: " + s.title, "stop:" + s.id));
        for (const e of EXERCISES) jump.add(new Option("Exercise: " + e.title, "ex:" + e.id));
        jump.addEventListener("change", () => {
            const [k, id] = jump.value.split(":");
            k === "stop" ? showStop(id) : showExercise(id);
        });
    }
    jump.value = (STOPS.some((s) => s.id === current) ? "stop:" : "ex:") + current;
}
// A small highlighter: comments, strings, keywords and numbers (enough to read the excerpts, not a parser)
const KEYWORDS = /^(const|let|var|function|async|await|return|if|else|for|while|of|in|new|import|export|from|class|this|try|catch|throw|typeof|true|false|null|undefined|on|jobs|steps|uses|run|name)$/;
function highlight(line, file) {
    const frag = document.createDocumentFragment();
    const yaml = /\.ya?ml$/.test(file);
    const re = yaml
        ? /(#[^\n]*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][\w-]*(?=:)|\b\d+\b)/g
        : /(\/\/.*$|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b)/g;
    let at = 0;
    for (const m of line.matchAll(re)) {
        const t = m[0];
        let cls = null;
        if (/^(\/\/|\/\*|#)/.test(t)) cls = "c";
        else if (/^["'`]/.test(t)) cls = "s";
        else if (/^\d/.test(t)) cls = "n";
        else if (yaml ? true : KEYWORDS.test(t)) cls = "k";
        if (!cls) continue;
        if (m.index > at) frag.append(line.slice(at, m.index));
        frag.appendChild(el("span", "dev-" + cls, t));
        at = m.index + t.length;
    }
    if (at < line.length) frag.append(line.slice(at));
    return frag;
}
async function codeBlock(spec) {
    const fig = el("figure", "dev-code");
    let count = spec.count;
    const draw = async () => {
        const ex = await excerpt(spec.file, spec.from, count);
        fig.textContent = "";
        const cap = el("figcaption");
        const a = el("a", null, spec.file);
        a.href = spec.file;
        a.target = "_blank";
        cap.append(a, document.createTextNode(ex ? `, lines ${ex.start} to ${ex.start + ex.lines.length - 1} (read live from the file)` : ""));
        const pre = el("pre");
        if (ex) {
            ex.lines.forEach((l, i) => {
                pre.appendChild(el("span", "dev-ln", String(ex.start + i).padStart(4) + "  "));
                pre.appendChild(highlight(l, spec.file));
                if (i < ex.lines.length - 1) pre.append("\n");
            });
        } else pre.textContent = "This part of the file has changed since the tour was written; open the file to find it.";
        const tools = el("div", "dev-code-tools");
        if (ex) {
            const copy = el("button", null, "Copy");
            copy.type = "button";
            copy.addEventListener("click", async () => {
                try { await navigator.clipboard.writeText(ex.lines.join("\n")); copy.textContent = "Copied"; } catch (e) { copy.textContent = "Select the code to copy it"; }
                setTimeout(() => { copy.textContent = "Copy"; }, 2000);
            });
            const more = el("button", null, "Show 10 more lines");
            more.type = "button";
            more.disabled = ex.lines.length < count;
            more.addEventListener("click", () => { count += 10; draw(); });
            tools.append(copy, more);
        }
        fig.append(cap, pre, tools);
    };
    await draw();
    return fig;
}
async function docLinks(list) {
    const have = await refIndex();
    const box = el("p", "dev-docs");
    box.appendChild(el("strong", null, "Reference docs: "));
    let any = false;
    for (const d of list) {
        const a = el("a", null, d.replace(/\.md$/, ""));
        if (have.has(d)) a.href = "reference.html?doc=" + encodeURIComponent(d);
        else if (/\.[a-z]+\.md$/i.test(d)) {
            // No reference doc for this file yet: link the file itself
            a.href = d.replace(/\.md$/, "");
            a.target = "_blank";
            a.textContent += " (source)";
        } else continue;
        box.appendChild(a);
        box.appendChild(document.createTextNode(" "));
        any = true;
    }
    if (!any) box.appendChild(el("span", "muted", "see reference.html"));
    return box;
}
async function liveTable(stop, host) {
    host.textContent = "";
    try {
        const rows = await stop.live();
        const t = el("table", "hb-controls cls-table dev-live");
        const b = t.createTBody();
        for (const [k, v] of rows) { const r = b.insertRow(); r.insertCell().textContent = k; r.insertCell().textContent = v; }
        host.appendChild(t);
    } catch (e) {
        host.appendChild(el("p", "muted small", "Could not measure this here: " + e.message));
    }
}
async function showStop(id) {
    const i = STOPS.findIndex((s) => s.id === id);
    const stop = STOPS[i] || STOPS[0];
    if (cleanup) { cleanup(); cleanup = null; }
    history.replaceState(null, "", "?stop=" + stop.id);
    progress.seen[stop.id] = true;
    save();
    renderNav(stop.id);
    const main = $("devMain");
    main.textContent = "";
    main.appendChild(el("p", "dev-kicker", `Stop ${STOPS.indexOf(stop) + 1} of ${STOPS.length}`));
    main.appendChild(el("h2", null, stop.title));
    main.appendChild(el("p", "dev-summary", stop.summary));
    const ul = el("ul", "dev-points");
    for (const p of stop.points) ul.appendChild(el("li", null, p));
    main.appendChild(ul);
    const live = el("section", "card dev-panel");
    const lh = el("div", "dev-panel-head");
    lh.appendChild(el("h3", null, "Live on this device"));
    const again = el("button", null, "Measure again");
    again.type = "button";
    lh.appendChild(again);
    const lb = el("div");
    live.append(lh, lb);
    again.addEventListener("click", () => liveTable(stop, lb));
    main.appendChild(live);
    if (stop.demo) {
        const demo = el("section", "card dev-panel");
        demo.appendChild(el("h3", null, "Try it here"));
        main.appendChild(demo);
        cleanup = stop.demo(demo) || null;
    }
    main.appendChild(el("h3", null, "The code that does it"));
    for (const c of stop.code) main.appendChild(await codeBlock(c));
    main.appendChild(el("p", "dev-try", "Explore: " + stop.tryIt));
    main.appendChild(await docLinks(stop.docs));
    if (stop.quiz) main.appendChild(quiz(stop.quiz, stop.id));
    const nav = el("div", "buttons dev-next");
    if (i > 0) nav.appendChild(navButton("← " + STOPS[i - 1].title, () => showStop(STOPS[i - 1].id)));
    if (i < STOPS.length - 1) nav.appendChild(navButton(STOPS[i + 1].title + " →", () => showStop(STOPS[i + 1].id), true));
    else nav.appendChild(navButton("Start the exercises →", () => showExercise(EXERCISES[0].id), true));
    main.appendChild(nav);
    liveTable(stop, lb);
    if (matchMedia("(max-width: 900px)").matches) main.scrollIntoView({ block: "start" });
}
function navButton(label, fn, primary) {
    const b = el("button", primary ? "primary" : "", label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
}
function quiz(q, id) {
    const box = el("section", "card dev-quiz");
    box.appendChild(el("h3", null, "Check yourself"));
    box.appendChild(el("p", null, q.q));
    const out = el("p", "dev-quiz-out");
    if (id in progress.quiz) out.textContent = progress.quiz[id] ? "You got this right first time earlier." : "Answered earlier; try it again.";
    q.options.forEach((o, i) => {
        const b = el("button", null, o);
        b.type = "button";
        b.addEventListener("click", () => {
            for (const x of box.querySelectorAll("button")) x.classList.remove("right", "wrong");
            const right = i === q.answer;
            b.classList.add(right ? "right" : "wrong");
            out.textContent = right ? "Right. " + (q.why || "") : "Not quite: try again.";
            // Only the first answer counts towards the score
            if (!(id in progress.quiz)) {
                progress.quiz[id] = right;
                save();
                renderNav(id);
            }
        });
        box.appendChild(b);
    });
    box.appendChild(out);
    return box;
}
function showExercise(id) {
    const i = EXERCISES.findIndex((e) => e.id === id);
    const ex = EXERCISES[i] || EXERCISES[0];
    if (cleanup) { cleanup(); cleanup = null; }
    history.replaceState(null, "", "?exercise=" + ex.id);
    renderNav(ex.id);
    if (ex.open) ex.open().catch(() => {});
    const main = $("devMain");
    main.textContent = "";
    main.appendChild(el("p", "dev-kicker", `Exercise ${EXERCISES.indexOf(ex) + 1} of ${EXERCISES.length}`));
    main.appendChild(el("h2", null, ex.title));
    main.appendChild(el("p", "dev-summary", ex.goal));
    const files = el("p", "small");
    files.appendChild(el("strong", null, "Files: "));
    for (const f of ex.files) {
        if (f.includes("<")) files.appendChild(el("code", null, f));
        else { const a = el("a", null, f); a.href = f; a.target = "_blank"; files.appendChild(a); }
        files.appendChild(document.createTextNode(" "));
    }
    main.appendChild(files);
    main.appendChild(el("p", "small muted", "Edit the files in your copy of the site (any text editor), save, and reload. Work on a local copy (python3 serve.py) or a fork on GitHub."));
    const hints = el("section", "card dev-panel");
    hints.appendChild(el("h3", null, "Hints"));
    let shown = 0;
    const list = el("ol", "dev-hints");
    const more = el("button", null, "Show a hint");
    more.type = "button";
    more.addEventListener("click", () => {
        if (shown < ex.hints.length) list.appendChild(el("li", null, ex.hints[shown++]));
        more.textContent = shown < ex.hints.length ? "Show the next hint" : "No more hints";
        more.disabled = shown >= ex.hints.length;
    });
    hints.append(list, more);
    main.appendChild(hints);
    const checkBox = el("section", "card dev-panel");
    checkBox.appendChild(el("h3", null, "Check my work"));
    const result = el("p", "dev-check" + (progress.done[ex.id] ? " ok" : ""), progress.done[ex.id] ? "Done earlier on this device." : "");
    const go = el("button", "primary", "Check my work");
    go.type = "button";
    go.addEventListener("click", async () => {
        result.className = "dev-check";
        result.textContent = "Checking…";
        try {
            const [ok, msg] = await ex.check();
            result.textContent = (ok ? "✓ " : "Not yet: ") + msg;
            result.classList.add(ok ? "ok" : "no");
            if (ok) { progress.done[ex.id] = true; save(); renderNav(ex.id); }
        } catch (e) {
            result.textContent = "Could not check: " + e.message;
            result.classList.add("no");
        }
    });
    checkBox.append(go, result);
    main.appendChild(checkBox);
    const nav = el("div", "buttons dev-next");
    if (i > 0) nav.appendChild(navButton("← " + EXERCISES[i - 1].title, () => showExercise(EXERCISES[i - 1].id)));
    else nav.appendChild(navButton("← Back to the tour", () => showStop(STOPS[STOPS.length - 1].id)));
    if (i < EXERCISES.length - 1) nav.appendChild(navButton(EXERCISES[i + 1].title + " →", () => showExercise(EXERCISES[i + 1].id), true));
    main.appendChild(nav);
}

// ← and → move between pages (not while typing, and not on the stop whose demo shows key presses)
const ORDER = () => [...STOPS.map((s) => ["stop", s.id]), ...EXERCISES.map((e) => ["ex", e.id])];
document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    if (e.target.closest("input, select, textarea, [contenteditable]") || currentId === "input") return;
    const list = ORDER();
    const i = list.findIndex(([, id]) => id === currentId);
    const next = list[i + (e.key === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    next[0] === "stop" ? showStop(next[1]) : showExercise(next[1]);
});
// Start over, and a printed handout of the exercises for a class
$("devReset").addEventListener("click", () => {
    if (!confirm("Forget which stops you have seen, your quiz answers and your finished exercises on this device?")) return;
    for (const k of ["seen", "done", "quiz"]) progress[k] = {};
    delete progress.swBase;
    save();
    showStop(STOPS[0].id);
});
$("devPrint").addEventListener("click", () => {
    const p = $("devPrintArea");
    p.textContent = "";
    p.appendChild(el("h1", null, "Web development case study: exercises"));
    p.appendChild(el("p", null, "Work on your own copy of the site (python3 serve.py, or a fork on GitHub). Each exercise has a Check my work button on devtour.html."));
    EXERCISES.forEach((ex, n) => {
        const sec = el("section", "dev-print-ex");
        sec.appendChild(el("h2", null, `${n + 1}. ${ex.title}`));
        sec.appendChild(el("p", null, ex.goal));
        sec.appendChild(el("p", "dev-print-files", "Files: " + ex.files.join(", ")));
        const ol = el("ol");
        for (const h of ex.hints) ol.appendChild(el("li", null, h));
        sec.append(el("p", null, "Hints (try without them first):"), ol, el("p", "dev-print-done", "☐ Checked on devtour.html"));
        p.appendChild(sec);
    });
    document.body.classList.add("dev-printing");
    const done = () => { document.body.classList.remove("dev-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 50);
});

async function main() {
    await loadManifest();
    if (params.get("exercise") && EXERCISES.some((e) => e.id === params.get("exercise"))) showExercise(params.get("exercise"));
    else showStop(params.get("stop") || STOPS[0].id);
    setupServiceWorker({ shouldReload: () => true }).catch(() => {});
}
main();
