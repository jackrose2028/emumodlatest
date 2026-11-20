// Use case 3, Museum and exhibit kiosk: unattended public screens.
//   Attract loop (rotating games with captions) -> game list (big tiles) -> a timed game in a frame
//   (play.html?kiosk=1) -> back to the attract loop when time is up or the player walks away.
//   Staff: five quick taps in the top-left corner (or Ctrl+Shift+K) and a PIN open the settings.
//   Settings: localStorage "ejs-kiosk" (or kiosk.json next to this page on a new screen; with "managed" on, the
//   screen keeps following that file). Visitor numbers: localStorage "ejs-kiosk-stats2" (60 days, per game).
//   Second pass: visitor languages, opening hours, dimming, How to play, a visitor sound button, game order,
//   a check of every game, a return from settings left open, and visitor numbers per game and day.
//   Games and cores for offline use: Cache Storage "ejs-kiosk-files" (served by sw.js), which also keeps the
//   pictures taken of each game for the attract loop under kiosk-shots/.
import { $, banner, loadManifest, isAvailable, setupServiceWorker, coreFileFor, preferredCore, readOptions } from "./common.js";
import { labelFor } from "./detect.js";
import { loadCatalog } from "./catalog.js";
import { initDevice } from "./mobile.js";

initDevice();
const params = new URLSearchParams(location.search);
const CONFIG_KEY = "ejs-kiosk";
const STATS_KEY = "ejs-kiosk-stats";     // before the second pass: today's totals only (read once, then left)
const STATS2_KEY = "ejs-kiosk-stats2";
const FILES = "ejs-kiosk-files";
const SHOT_PREFIX = "kiosk-shots/";
const DEFAULTS = {
    version: 1,
    title: "",             // empty: the built-in wording of the language
    welcome: "",
    lang: "en",
    lang2: "",             // second language visitors can switch to ("" = none)
    title2: "",
    welcome2: "",
    games: [],             // { id, title, caption, caption2, controls, controls2, system, core, url | cid, image }
    sessionMinutes: 10,
    idleSeconds: 90,
    warnSeconds: 15,
    slideSeconds: 8,
    volume: 0.5,
    reloadHour: 4,         // -1 = never
    fullscreen: true,
    allowQuit: true,
    attractShots: true,
    visitorVolume: true,   // a sound button for visitors (down or off, never louder than volume)
    dimMinutes: 30,        // dim the attract loop after this long without visitors (0 = never)
    hours: [],             // [{ days: [0..6], from: "09:00", to: "17:00" }]; none = always open
    managed: false,        // follow the site's kiosk.json
    pinHash: null
};
// Built-in wording for visitors, per language
const LANGS = {
    en: { name: "English", call: "Touch the screen or press any button to play", choose: "Choose a game", hint: "Touch a game, or use the controller and press A", quit: "✕ Other games", starting: "Starting", left: "{t} left", stillTitle: "Still playing?", stillText: "Touch the screen or press any button to keep playing.", keep: "Keep playing", timeTitle: "Time's up!", timeText: "Thanks for playing. It's the next visitor's turn.", errTitle: "Sorry, this game is resting", errText: "It could not start. Please choose another one.", outTitle: "Out of order", outText: "No game can be played on this screen right now. Please tell a member of staff.", closedTitle: "Closed", closedOpens: "Open again {when}", closingText: "We're closing now. Thanks for playing!", oneMinute: "One minute left", howTo: "How to play", back: "Back to the game", sound: ["Sound: loud", "Sound: quiet", "Sound: off"] },
    es: { name: "Español", call: "Toca la pantalla o pulsa cualquier botón para jugar", choose: "Elige un juego", hint: "Toca un juego, o usa el mando y pulsa A", quit: "✕ Otros juegos", starting: "Cargando", left: "Quedan {t}", stillTitle: "¿Sigues jugando?", stillText: "Toca la pantalla o pulsa cualquier botón para seguir jugando.", keep: "Seguir jugando", timeTitle: "¡Se acabó el tiempo!", timeText: "Gracias por jugar. Ahora le toca al siguiente visitante.", errTitle: "Lo sentimos, este juego está descansando", errText: "No se pudo iniciar. Elige otro, por favor.", outTitle: "Fuera de servicio", outText: "Ahora mismo no se puede jugar en esta pantalla. Avisa a un miembro del personal.", closedTitle: "Cerrado", closedOpens: "Abre de nuevo: {when}", closingText: "Estamos cerrando. ¡Gracias por jugar!", oneMinute: "Queda un minuto", howTo: "Cómo se juega", back: "Volver al juego", sound: ["Sonido: alto", "Sonido: bajo", "Sonido: apagado"] },
    fr: { name: "Français", call: "Touchez l'écran ou appuyez sur un bouton pour jouer", choose: "Choisissez un jeu", hint: "Touchez un jeu, ou utilisez la manette et appuyez sur A", quit: "✕ Autres jeux", starting: "Lancement de", left: "Il reste {t}", stillTitle: "Vous jouez toujours ?", stillText: "Touchez l'écran ou appuyez sur un bouton pour continuer.", keep: "Continuer", timeTitle: "Temps écoulé !", timeText: "Merci d'avoir joué. C'est au tour du visiteur suivant.", errTitle: "Désolé, ce jeu se repose", errText: "Il n'a pas pu démarrer. Choisissez-en un autre.", outTitle: "Hors service", outText: "Aucun jeu ne peut être lancé sur cet écran pour le moment. Prévenez un membre du personnel.", closedTitle: "Fermé", closedOpens: "Réouverture : {when}", closingText: "Nous fermons. Merci d'avoir joué !", oneMinute: "Plus qu'une minute", howTo: "Comment jouer", back: "Retour au jeu", sound: ["Son : fort", "Son : faible", "Son : coupé"] },
    de: { name: "Deutsch", call: "Bildschirm berühren oder eine Taste drücken zum Spielen", choose: "Wähle ein Spiel", hint: "Tippe auf ein Spiel oder nutze den Controller und drücke A", quit: "✕ Andere Spiele", starting: "Starte", left: "Noch {t}", stillTitle: "Spielst du noch?", stillText: "Berühre den Bildschirm oder drücke eine Taste, um weiterzuspielen.", keep: "Weiterspielen", timeTitle: "Die Zeit ist um!", timeText: "Danke fürs Spielen. Jetzt ist der Nächste dran.", errTitle: "Dieses Spiel macht gerade Pause", errText: "Es konnte nicht starten. Bitte wähle ein anderes.", outTitle: "Außer Betrieb", outText: "Auf diesem Bildschirm kann gerade nicht gespielt werden. Bitte sag dem Personal Bescheid.", closedTitle: "Geschlossen", closedOpens: "Wieder geöffnet: {when}", closingText: "Wir schließen jetzt. Danke fürs Spielen!", oneMinute: "Noch eine Minute", howTo: "So wird gespielt", back: "Zurück zum Spiel", sound: ["Ton: laut", "Ton: leise", "Ton: aus"] },
    it: { name: "Italiano", call: "Tocca lo schermo o premi un tasto per giocare", choose: "Scegli un gioco", hint: "Tocca un gioco, oppure usa il controller e premi A", quit: "✕ Altri giochi", starting: "Avvio di", left: "Mancano {t}", stillTitle: "Stai ancora giocando?", stillText: "Tocca lo schermo o premi un tasto per continuare a giocare.", keep: "Continua a giocare", timeTitle: "Tempo scaduto!", timeText: "Grazie per aver giocato. Ora tocca al prossimo visitatore.", errTitle: "Spiacenti, questo gioco è in pausa", errText: "Non è stato possibile avviarlo. Scegline un altro.", outTitle: "Fuori servizio", outText: "Al momento non si può giocare su questo schermo. Avvisa il personale.", closedTitle: "Chiuso", closedOpens: "Riapre: {when}", closingText: "Stiamo chiudendo. Grazie per aver giocato!", oneMinute: "Manca un minuto", howTo: "Come si gioca", back: "Torna al gioco", sound: ["Audio: alto", "Audio: basso", "Audio: spento"] },
    pt: { name: "Português", call: "Toque na tela ou aperte qualquer botão para jogar", choose: "Escolha um jogo", hint: "Toque em um jogo, ou use o controle e aperte A", quit: "✕ Outros jogos", starting: "Iniciando", left: "Faltam {t}", stillTitle: "Ainda está jogando?", stillText: "Toque na tela ou aperte qualquer botão para continuar jogando.", keep: "Continuar jogando", timeTitle: "O tempo acabou!", timeText: "Obrigado por jogar. Agora é a vez do próximo visitante.", errTitle: "Desculpe, este jogo está descansando", errText: "Não foi possível iniciá-lo. Escolha outro, por favor.", outTitle: "Fora de serviço", outText: "No momento não é possível jogar nesta tela. Avise um funcionário.", closedTitle: "Fechado", closedOpens: "Abre novamente: {when}", closingText: "Estamos fechando. Obrigado por jogar!", oneMinute: "Falta um minuto", howTo: "Como jogar", back: "Voltar ao jogo", sound: ["Som: alto", "Som: baixo", "Som: desligado"] }
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT = { nes: "NES", snes: "SNES", gb: "Game Boy", gbc: "Game Boy Color", gba: "Game Boy Advance", segaMD: "Mega Drive", segaMS: "Master System", segaGG: "Game Gear", atari2600: "Atari 2600", n64: "Nintendo 64" };
const shortSystem = (s) => SHORT[s] || labelFor(s);

let config = null;
let mode = "boot";          // setup | attract | menu | play
let catalog = [];
const shots = new Map();     // game id -> object URL of the picture taken while it was played
const failures = new Map();  // game id -> failed starts since the page loaded
const bootedAt = Date.now();
let lastActivity = Date.now();
let pendingReload = null;

// ---------- small helpers ----------
const now = () => Date.now();
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}
function show(id) {
    for (const s of ["kAttract", "kMenu", "kPlay", "kSetup", "kClosed"]) $(s).hidden = s !== id;
    $("kHot").hidden = id === "kSetup";
    document.documentElement.classList.toggle("k-running", id !== "kSetup");
}
function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
}
function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
const today = () => new Date().toLocaleDateString("en-CA");

// ---------- visitor numbers: per day (60 days kept), per game and per hour ----------
function statsAll() {
    let all = readJSON(STATS2_KEY);
    if (!all || !all.days) {
        all = { days: {} };
        const old = readJSON(STATS_KEY);
        if (old && old.day) {
            const { day, ...rest } = old;
            all.days[day] = rest;
        }
    }
    return all;
}
function dayRecord(all, day = today()) {
    const d = all.days[day] || (all.days[day] = {});
    for (const k of ["sessions", "seconds", "errors", "reloads", "timeUps", "idleResets"]) d[k] = d[k] || 0;
    if (!Array.isArray(d.hours)) d.hours = new Array(24).fill(0);
    d.games = d.games || {};
    return d;
}
function saveStats(all) {
    const keep = new Set(Object.keys(all.days).sort().slice(-60));
    for (const k of Object.keys(all.days)) if (!keep.has(k)) delete all.days[k];
    writeJSON(STATS2_KEY, all);
}
function stats() { return dayRecord(statsAll()); }
function bump(field, amount = 1) {
    const all = statsAll();
    dayRecord(all)[field] += amount;
    saveStats(all);
}
function recordSession(g, seconds) {
    const all = statsAll();
    const d = dayRecord(all);
    d.sessions++;
    d.seconds += seconds;
    d.hours[new Date().getHours()]++;
    const row = d.games[g.id] || (d.games[g.id] = { title: g.title, sessions: 0, seconds: 0 });
    row.title = g.title;
    row.sessions++;
    row.seconds += seconds;
    saveStats(all);
}
function statsCsv() {
    const all = statsAll();
    const rows = [["date", "game", "sessions", "minutes played", "time limits reached", "players walked away", "failed starts", "automatic restarts"]];
    for (const day of Object.keys(all.days).sort()) {
        const d = dayRecord(all, day);
        rows.push([day, "(all games)", d.sessions, Math.round(d.seconds / 60), d.timeUps, d.idleResets, d.errors, d.reloads]);
        for (const g of Object.values(d.games)) rows.push([day, g.title, g.sessions, Math.round(g.seconds / 60), "", "", "", ""]);
    }
    const cell = (c) => (/[",\r\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c));
    return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

// ---------- visitor languages ----------
let lang = "en";
function tr(key, vars) {
    let v = (LANGS[lang] && LANGS[lang][key]) || LANGS.en[key];
    if (vars) for (const [k, x] of Object.entries(vars)) v = v.replace("{" + k + "}", x);
    return v;
}
const inSecond = () => !!config.lang2 && lang === config.lang2 && config.lang2 !== config.lang;
function screenText(field, key) {
    const v = inSecond() ? config[field + "2"] : config[field];
    // Settings saved before languages existed hold the English wording, which means "the built-in wording"
    if (v && !(lang !== "en" && v === LANGS.en[key])) return v;
    return tr(key);
}
const captionOf = (g) => (inSecond() && g.caption2) || g.caption || "";
const howOf = (g) => (inSecond() && g.controls2) || g.controls || "";
const otherLang = () => (config.lang2 && config.lang2 !== config.lang ? (lang === config.lang2 ? config.lang : config.lang2) : "");
function setLang(code) {
    lang = LANGS[code] ? code : "en";
    document.documentElement.lang = lang;
    const other = otherLang();
    for (const id of ["kLangA", "kLangM"]) {
        $(id).hidden = !other;
        if (other) {
            $(id).textContent = "🌐 " + LANGS[other].name;
            $(id).lang = other;
        }
    }
    $("kMenuHint").textContent = tr("hint");
    $("kHowTitle").textContent = tr("howTo");
    $("kHowBack").textContent = tr("back");
    // On narrow screens only the symbol shows; the full name stays for screen readers
    const pill = (id, symbol, text) => {
        $(id).textContent = symbol + " ";
        $(id).appendChild(el("span", "k-lbl", text));
        $(id).setAttribute("aria-label", text);
    };
    pill("kHelp", "?", tr("howTo"));
    pill("kQuit", "✕", tr("quit").replace(/^✕\s*/, ""));
    $("kLoadingWord").textContent = tr("starting");
}
function whenText(d) {
    if (!d) return "";
    try { return new Intl.DateTimeFormat(lang, { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(d); } catch (e) { return d.toLocaleString(); }
}

// ---------- opening hours ----------
const minutesOf = (hhmm) => { const [h, m] = String(hhmm || "").split(":").map(Number); return h * 60 + (m || 0); };
function inRange(day, mins, row) {
    const from = minutesOf(row.from), to = row.to === "23:59" ? 1440 : minutesOf(row.to);
    if (from === to) return row.days.includes(day);
    if (from < to) return row.days.includes(day) && mins >= from && mins < to;
    // Overnight (e.g. 20:00 to 02:00): the evening belongs to the start day, the early hours to the day after
    return (row.days.includes(day) && mins >= from) || (row.days.includes((day + 6) % 7) && mins < to);
}
function openNow(d = new Date(), hours = config.hours) {
    const rows = (hours || []).filter((r) => r.days && r.days.length && r.from && r.to);
    if (!rows.length) return true;
    return rows.some((r) => inRange(d.getDay(), d.getHours() * 60 + d.getMinutes(), r));
}
function nextChange(d = new Date()) {
    // Steps through the next 8 days minute by minute until the open/closed state changes
    const start = openNow(d);
    const t = new Date(d);
    t.setSeconds(0, 0);
    for (let i = 1; i <= 8 * 24 * 60; i++) {
        t.setMinutes(t.getMinutes() + 1);
        if (openNow(t) !== start) return new Date(t);
    }
    return null;
}
// Burn-in protection for the dim and closed screens: the text moves now and then
function drift(node) {
    node.style.transform = `translate(${Math.round((Math.random() - 0.5) * 50)}vw, ${Math.round((Math.random() - 0.5) * 50)}vh)`;
}
function reloadPage(reason) {
    try { sessionStorage.setItem("ejs-kiosk-reload", reason); } catch (e) { /* storage blocked */ }
    location.reload();
}

// ---------- PIN ----------
async function hashPin(pin) {
    const text = "ejs-kiosk:" + pin;
    if (window.crypto && crypto.subtle) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return "sha256:" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Pages opened without https (no crypto.subtle): a plain FNV-1a hash, still never the PIN itself
    let h = 0x811c9dc5;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
    return "fnv:" + h.toString(16);
}

// ---------- settings ----------
function hashText(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(16) + ":" + text.length;
}
async function fetchSiteConfig() {
    try {
        const r = await fetch("kiosk.json", { cache: "no-cache" });
        if (!r.ok) return null;
        const text = await r.text();
        const data = JSON.parse(text);
        return data && Array.isArray(data.games) ? { data, stamp: hashText(text) } : null;
    } catch (e) {
        return null;
    }
}
function fromSite(local, site) {
    // A managed screen takes everything from the file; the file's PIN wins when it has one
    const { managedStamp, ...data } = site.data;
    return Object.assign({}, DEFAULTS, data, { managed: true, managedStamp: site.stamp, pinHash: data.pinHash || (local && local.pinHash) || null });
}
async function loadConfig() {
    let c = readJSON(CONFIG_KEY);
    if (!c) {
        // A new screen starts with the site's kiosk.json, when the site has one
        const site = await fetchSiteConfig();
        if (site) c = site.data.managed ? fromSite(null, site) : site.data;
    } else if (c.managed && navigator.onLine) {
        const site = await fetchSiteConfig();
        if (site && site.stamp !== c.managedStamp) {
            c = fromSite(c, site);
            writeJSON(CONFIG_KEY, c);
            writeJSON(CONFIG_KEY + "-managed", { at: new Date().toISOString() });
        }
    }
    return Object.assign({}, DEFAULTS, c || {});
}
let lastSiteCheck = Date.now();
async function followSite() {
    lastSiteCheck = now();
    const site = await fetchSiteConfig();
    if (!site || site.stamp === config.managedStamp || !config.managed) return;
    if (mode !== "attract" && mode !== "closed") return;     // never in the middle of a visit; the next check applies it
    config = fromSite(config, site);
    writeJSON(CONFIG_KEY, config);
    writeJSON(CONFIG_KEY + "-managed", { at: new Date().toISOString() });
    await loadShots();
    prepareOffline().catch(() => {});
    if (mode === "attract") attract();
    else closed();
}
const ready = (c) => c && Array.isArray(c.games) && c.games.length > 0 && !!c.pinHash;
function playable() {
    return config.games.filter((g) => isAvailable(g.system) && (failures.get(g.id) || 0) < 2);
}

// ---------- pictures for the attract loop ----------
async function loadShots() {
    try {
        if (!(await caches.has(FILES))) return;
        const cache = await caches.open(FILES);
        for (const g of config.games) {
            if (shots.has(g.id)) continue;
            const r = await cache.match(SHOT_PREFIX + encodeURIComponent(g.id));
            if (r) shots.set(g.id, URL.createObjectURL(await r.blob()));
        }
    } catch (e) { /* no cache storage */ }
}
async function storeShot(id, blob) {
    if (!blob || !id) return;
    try {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(640, bitmap.width * 2);
        canvas.height = Math.round(canvas.width * bitmap.height / bitmap.width);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const jpeg = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
        if (!jpeg) return;
        const cache = await caches.open(FILES);
        await cache.put(SHOT_PREFIX + encodeURIComponent(id), new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } }));
        if (shots.has(id)) URL.revokeObjectURL(shots.get(id));
        shots.set(id, URL.createObjectURL(jpeg));
    } catch (e) { /* picture skipped */ }
}
const pictureOf = (g) => shots.get(g.id) || g.image || null;

// ---------- offline: every approved game and its core in the kiosk cache ----------
function coreUrl(g) {
    return coreFileFor(g.system, "emulatorjs", readOptions(), g.core || preferredCore(g.system));
}
async function prepareOffline(report = () => {}) {
    if (!("caches" in window)) throw new Error("This browser has no offline storage.");
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const cache = await caches.open(FILES);
    const wanted = new Set();
    const list = [];
    for (const g of config.games) {
        if (g.url) list.push(new URL(g.url, location.href).href);
        if (g.image) list.push(new URL(g.image, location.href).href);
        const core = coreUrl(g);
        if (core) list.push(new URL(core, location.href).href);
    }
    const unique = [...new Set(list)];
    let done = 0;
    let failed = 0;
    for (const url of unique) {
        wanted.add(url);
        report(`Downloading ${done + 1} of ${unique.length}…`);
        try {
            if (!(await cache.match(url))) {
                const r = await fetch(url, { cache: "no-cache" });
                if (!r.ok) throw new Error(r.status);
                await cache.put(url, r);
            }
        } catch (e) {
            failed++;
        }
        done++;
    }
    // Drop games and cores that are no longer on the list (pictures stay)
    for (const request of await cache.keys()) {
        if (!request.url.includes("/" + SHOT_PREFIX) && !wanted.has(request.url)) await cache.delete(request);
    }
    const result = { at: new Date().toISOString(), files: unique.length, failed };
    writeJSON(CONFIG_KEY + "-offline", result);
    report(failed ? `${unique.length - failed} of ${unique.length} files are ready offline; ${failed} could not be downloaded.` : `All ${unique.length} files (games, pictures and cores) are ready offline.`);
    return result;
}

// ---------- attract loop ----------
let slideIndex = -1;
let slideCount = 0;
let slideTimer = null;
let dimmed = false;
function attract() {
    if (pendingReload) return reloadPage(pendingReload);
    if (!openNow()) return closed();
    mode = "attract";
    setLang(config.lang);
    dimmed = false;
    $("kAttract").classList.remove("k-dim");
    $("kCall").style.transform = "";
    show("kAttract");
    $("kCall").textContent = screenText("welcome", "call");
    const games = playable();
    const dots = $("kDots");
    dots.textContent = "";
    for (let i = 0; i < games.length && games.length > 1; i++) dots.appendChild(el("span"));
    clearInterval(slideTimer);
    nextSlide();
    slideTimer = setInterval(nextSlide, Math.max(2, Number(config.slideSeconds) || 8) * 1000);
}
function nextSlide() {
    const games = playable();
    // With two languages the slides take turns; a visitor who wakes the screen gets the language on show
    slideCount++;
    if (otherLang()) setLang(slideCount % 2 ? config.lang : config.lang2);
    $("kCall").textContent = screenText("welcome", "call");
    if (!games.length) {
        $("kSlideTitle").textContent = tr("outTitle");
        $("kSlideCaption").textContent = tr("outText");
        $("kKicker").textContent = "";
        $("kSlidePic").style.backgroundImage = "";
        $("kSlidePic").dataset.system = "";
        return;
    }
    slideIndex = (slideIndex + 1) % games.length;
    const g = games[slideIndex];
    const slide = $("kSlide");
    slide.classList.remove("k-in");
    void slide.offsetWidth;
    slide.classList.add("k-in");
    $("kKicker").textContent = shortSystem(g.system);
    $("kSlideTitle").textContent = g.title;
    $("kSlideCaption").textContent = captionOf(g);
    const pic = pictureOf(g);
    $("kSlidePic").style.backgroundImage = pic ? `url("${pic}")` : "";
    $("kSlidePic").dataset.system = shortSystem(g.system);
    [...$("kDots").children].forEach((d, i) => d.classList.toggle("on", i === slideIndex));
}

// Dim: after a long time without visitors only the call to action stays, dark and moving
function dim() {
    if (dimmed) return;
    dimmed = true;
    clearInterval(slideTimer);
    $("kAttract").classList.add("k-dim");
    drift($("kCall"));
    slideTimer = setInterval(() => drift($("kCall")), 30000);
}
// Closed: outside opening hours
function closed() {
    clearInterval(slideTimer);
    mode = "closed";
    setLang(config.lang);
    show("kClosed");
    $("kClosedTitle").textContent = tr("closedTitle");
    const next = nextChange();
    $("kClosedText").textContent = next ? tr("closedOpens", { when: whenText(next) }) : "";
    drift($("kClosedBox"));
    slideTimer = setInterval(() => drift($("kClosedBox")), 60000);
}

// ---------- game list ----------
let menuShownAt = 0;
function menu(focusId) {
    if (pendingReload) return reloadPage(pendingReload);
    const games = playable();
    if (games.length === 1) return startGame(games[0]);
    if (!games.length) return attract();
    clearInterval(slideTimer);
    mode = "menu";
    lastActivity = now();
    menuShownAt = now();
    show("kMenu");
    setLang(lang);
    $("kMenuTitle").textContent = screenText("title", "choose");
    const tiles = $("kTiles");
    tiles.textContent = "";
    for (const g of games) {
        const li = el("li");
        const b = el("button", "k-tile");
        b.type = "button";
        b.dataset.id = g.id;
        const pic = el("span", "k-tile-pic");
        const url = pictureOf(g);
        if (url) pic.style.backgroundImage = `url("${url}")`;
        pic.dataset.system = shortSystem(g.system);
        const text = el("span", "k-tile-text");
        text.appendChild(el("strong", null, g.title));
        if (captionOf(g)) text.appendChild(el("span", null, captionOf(g)));
        b.append(pic, text);
        // The touch that woke the attract loop must not also start the game under the finger
        b.addEventListener("click", () => { if (now() - menuShownAt > 450) startGame(g); });
        li.appendChild(b);
        tiles.appendChild(li);
    }
    const focus = (focusId && tiles.querySelector(`[data-id="${CSS.escape(focusId)}"]`)) || tiles.querySelector("button");
    if (focus) focus.focus({ preventScroll: false });
}
function moveFocus(dx, dy) {
    const tiles = [...$("kTiles").querySelectorAll("button")];
    if (!tiles.length) return;
    let i = tiles.indexOf(document.activeElement);
    if (i < 0) return tiles[0].focus();
    const top = tiles[0].getBoundingClientRect().top;
    const cols = Math.max(1, tiles.filter((t) => Math.abs(t.getBoundingClientRect().top - top) < 4).length);
    i = Math.min(tiles.length - 1, Math.max(0, i + dx + dy * cols));
    tiles[i].focus();
    tiles[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ---------- playing ----------
let current = null;        // { game, started, startedAt, playedMs, frame }
let notice = null;         // { kind, ends, done }
function playSrc(g, volume = config.volume) {
    const q = new URLSearchParams({ kiosk: "1", engine: "emulatorjs", volume: String(Math.max(0, Math.min(1, Number(volume) || 0))) });
    if (g.cid) q.set("cid", g.cid);
    else {
        q.set("url", g.url);
        q.set("core", g.core || g.system);
    }
    return "play.html?" + q.toString();
}
function freshFrame() {
    // A new frame for every visitor: the previous game, its memory and any stuck state are thrown away whole
    const old = $("kFrame");
    const frame = document.createElement("iframe");
    frame.id = "kFrame";
    frame.title = "Game";
    frame.setAttribute("allow", "autoplay; fullscreen; gamepad; cross-origin-isolated");
    old.replaceWith(frame);
    return frame;
}
function startGame(g) {
    clearInterval(slideTimer);
    hideNotice();
    mode = "play";
    show("kPlay");
    goFullscreen();
    $("kQuit").hidden = !config.allowQuit || playable().length < 2;
    $("kTime").hidden = true;
    $("kToast").hidden = true;
    $("kHow").hidden = true;
    $("kLoading").hidden = false;
    $("kLoadingTitle").textContent = g.title;
    const how = howOf(g);
    $("kLoadingHow").hidden = !how;
    $("kLoadingHow").textContent = how;
    $("kHelp").hidden = !how;
    $("kVol").hidden = !config.visitorVolume || !(Number(config.volume) > 0);
    const frame = freshFrame();
    current = { game: g, started: false, startedAt: 0, playedMs: 0, frame, shotTaken: false, deadline: now() + 90000, volLevel: 0, warned: false };
    renderVol();
    lastActivity = now();
    frame.src = playSrc(g);
    frame.addEventListener("load", () => { try { frame.contentWindow.focus(); } catch (e) { /* not ready */ } });
}
function endSession(next) {
    if (current) {
        if (current.started) recordSession(current.game, Math.round(elapsed() / 1000));
        const frame = current.frame;
        current = null;
        try { frame.src = "about:blank"; } catch (e) { /* gone */ }
        freshFrame();
    }
    hideNotice();
    sessionsSinceLoad++;
    // Long-running screens start afresh now and then, between visitors
    if (sessionsSinceLoad >= 100) return reloadPage("after 100 sessions");
    if (next === "menu") menu();
    else attract();
}
let sessionsSinceLoad = 0;
function elapsed() {
    if (!current || !current.started) return 0;
    return current.playedMs + (current.paused ? 0 : now() - current.startedAt);
}
function postFrame(type, extra) {
    try { current.frame.contentWindow.postMessage(Object.assign({ source: "ejs-kiosk", type }, extra || {}), location.origin); } catch (e) { /* frame gone */ }
}
function pauseGame() {
    if (!current || !current.started || current.paused) return;
    current.playedMs += now() - current.startedAt;
    current.paused = true;
    postFrame("pause");
}
function resumeGame() {
    if (!current || !current.started || !current.paused) return;
    current.paused = false;
    current.startedAt = now();
    postFrame("resume");
    try { current.frame.contentWindow.focus(); } catch (e) { /* frame gone */ }
}
function failGame(message) {
    if (!current) return;
    const g = current.game;
    failures.set(g.id, (failures.get(g.id) || 0) + 1);
    bump("errors");
    console.warn("Kiosk: " + g.title + " failed: " + message);
    showNotice("error", tr("errTitle"), tr("errText"), 6, () => endSession(playable().length > 1 ? "menu" : "attract"));
}

// ---------- notices: still playing?, time's up, errors ----------
function showNotice(kind, title, text, seconds, done, button) {
    notice = { kind, ends: now() + seconds * 1000, done };
    $("kNotice").hidden = false;
    $("kNotice").dataset.kind = kind;
    $("kNoticeTitle").textContent = title;
    $("kNoticeText").textContent = text;
    $("kNoticeBtn").hidden = !button;
    if (button) $("kNoticeBtn").textContent = button;
    updateNotice();
}
function hideNotice() {
    notice = null;
    $("kNotice").hidden = true;
}
function updateNotice() {
    if (!notice) return;
    const left = Math.max(0, Math.ceil((notice.ends - now()) / 1000));
    $("kNoticeCount").textContent = left > 0 ? String(left) : "";
    if (left <= 0) {
        const done = notice.done;
        hideNotice();
        done();
    }
}
// How to play: pauses the game (and its clock) while it is read
function openHow() {
    if (!current) return;
    $("kHowText").textContent = howOf(current.game);
    $("kHow").hidden = false;
    if (current.started && !current.paused) {
        pauseGame();
        current.howPaused = true;
    }
    $("kHowBack").focus();
}
function closeHow(resume = true) {
    if ($("kHow").hidden) return;
    $("kHow").hidden = true;
    if (current && current.howPaused) {
        current.howPaused = false;
        if (resume) resumeGame();
    }
}
// Sound: loud (the staff volume), quiet, off
const VOL_STEPS = [1, 0.35, 0];
function renderVol() {
    const i = current ? current.volLevel : 0;
    $("kVol").textContent = ["🔊", "🔉", "🔇"][i];
    $("kVol").setAttribute("aria-label", tr("sound")[i]);
    $("kVol").title = tr("sound")[i];
}
function nextVolume() {
    if (!current) return;
    current.volLevel = (current.volLevel + 1) % VOL_STEPS.length;
    postFrame("volume", { volume: Math.max(0, Math.min(1, Number(config.volume))) * VOL_STEPS[current.volLevel] });
    renderVol();
    toast(tr("sound")[current.volLevel]);
}
let toastTimer = null;
function toast(text) {
    $("kToast").textContent = text;
    $("kToast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("kToast").hidden = true; }, 4000);
}
function stillThere() {
    if (notice && notice.kind === "idle") {
        hideNotice();
        resumeGame();
    }
}

// ---------- the clock: time limits, idle players, start watchdog, nightly restart ----------
const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
function tick() {
    updateNotice();
    const t = now();
    if (mode === "play" && current) {
        if (!current.started) {
            if (t > current.deadline && !notice) failGame("did not start within 90 seconds");
        } else {
            const limit = Number(config.sessionMinutes) * 60000;
            if (limit > 0) {
                const left = limit - elapsed();
                $("kTime").hidden = false;
                $("kTime").textContent = tr("left", { t: fmt(left) });
                $("kTime").classList.toggle("warn", left <= 60000);
                if (limit > 120000 && left <= 60000 && left > 0 && !current.warned) {
                    current.warned = true;
                    toast(tr("oneMinute"));
                }
                if (left <= 0 && !notice) {
                    closeHow(false);
                    pauseGame();
                    bump("timeUps");
                    showNotice("timeup", tr("timeTitle"), tr("timeText"), 8, () => endSession("attract"));
                }
            }
            if (!notice && !openNow()) {
                // Closing time: the visitor gets a goodbye, then the screen closes
                closeHow(false);
                pauseGame();
                showNotice("timeup", tr("closedTitle"), tr("closingText"), 8, () => endSession("attract"));
            }
            const idle = Math.max(1, Number(config.idleSeconds) || 90) * 1000;
            if (!notice && t - lastActivity > idle) {
                closeHow(false);
                pauseGame();
                showNotice("idle", tr("stillTitle"), tr("stillText"), Math.max(3, Number(config.warnSeconds) || 15), () => {
                    bump("idleResets");
                    endSession("attract");
                }, tr("keep"));
            }
            // One picture per game for the attract loop, after 25 seconds of play (title screens are over by then)
            if (config.attractShots && !current.shotTaken && elapsed() > 25000) {
                current.shotTaken = true;
                postFrame("shot", { id: current.game.id });
            }
        }
    } else if (mode === "menu") {
        if (!openNow()) closed();
        else if (t - lastActivity > Math.max(1, Number(config.idleSeconds) || 90) * 1000) attract();
    } else if (mode === "attract") {
        if (!openNow()) closed();
        else if (!dimmed && Number(config.dimMinutes) > 0 && t - lastActivity > Number(config.dimMinutes) * 60000) dim();
    } else if (mode === "closed") {
        if (openNow()) attract();
    } else if (mode === "setup") {
        // Settings left open by staff: back to the saved kiosk after five minutes without a touch
        if (!checker && t - setupSeen > SETUP_TIMEOUT) {
            const saved = readJSON(CONFIG_KEY);
            if (ready(saved)) resumeSaved(saved);
        }
    }
    if (config.managed && navigator.onLine && (mode === "attract" || mode === "closed") && t - lastSiteCheck > 30 * 60000) followSite().catch(() => {});
    if (mode === "attract" || mode === "menu" || mode === "closed") {
        const hour = Number(config.reloadHour);
        if (hour >= 0 && new Date().getHours() === hour && t - bootedAt > 2 * 3600000) reloadPage("nightly restart");
    }
}

// ---------- input: touch, keyboard and controllers ----------
function activity() {
    lastActivity = now();
    if (mode === "attract") {
        goFullscreen();
        const games = playable();
        const shown = games[slideIndex];
        menu(shown && shown.id);
    } else if (mode === "play") {
        stillThere();
    }
}
window.addEventListener("pointerdown", (e) => {
    if (mode === "setup" || mode === "closed" || e.target.closest("#kPin") || e.target.closest("#kHot")) return;
    // The language button on the attract loop wakes the screen in the other language
    if (mode === "attract" && e.target.closest(".k-lang") && otherLang()) setLang(otherLang());
    activity();
}, true);
window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        return openPin();
    }
    if (mode === "setup" || mode === "closed" || !$("kPin").hidden) return;
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    if (mode === "play" && !$("kHow").hidden) {
        lastActivity = now();
        if (["Escape", "Enter", " ", "z", "x"].includes(e.key)) {
            e.preventDefault();
            closeHow();
        }
        return;
    }
    if (mode === "menu") {
        const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (moves[e.key]) {
            e.preventDefault();
            moveFocus(...moves[e.key]);
        }
        if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "x") {
            e.preventDefault();
            const tile = document.activeElement && document.activeElement.classList.contains("k-tile") ? document.activeElement : $("kTiles").querySelector("button");
            if (tile && !e.repeat) tile.click();
        }
        if (e.key === "Escape") attract();
        lastActivity = now();
        return;
    }
    if (mode === "attract") e.preventDefault();
    activity();
});
// Controllers on the kiosk page itself (attract loop and game list); in a game the frame reports them
const padState = new Map();
function pollPads() {
    const howOpen = mode === "play" && !$("kHow").hidden;
    if (mode !== "attract" && mode !== "menu" && !(mode === "play" && notice && notice.kind === "idle") && !howOpen) return;
    if (!$("kPin").hidden) return;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    for (const pad of pads) {
        const prev = padState.get(pad.index) || { buttons: [], dir: "" };
        const pressed = pad.buttons.map((b) => b.pressed);
        const x = pad.axes[0] || 0;
        const y = pad.axes[1] || 0;
        const dir = pressed[14] || x < -0.6 ? "L" : pressed[15] || x > 0.6 ? "R" : pressed[12] || y < -0.6 ? "U" : pressed[13] || y > 0.6 ? "D" : "";
        const newly = pressed.map((p, i) => p && !prev.buttons[i]);
        padState.set(pad.index, { buttons: pressed, dir });
        if (howOpen) {
            lastActivity = now();
            if (newly.some(Boolean)) closeHow();
        } else if (mode === "menu") {
            if (dir && dir !== prev.dir) {
                lastActivity = now();
                moveFocus(dir === "L" ? -1 : dir === "R" ? 1 : 0, dir === "U" ? -1 : dir === "D" ? 1 : 0);
            }
            if (newly[0] || newly[9]) {
                lastActivity = now();
                if (document.activeElement && document.activeElement.classList.contains("k-tile")) document.activeElement.click();
            } else if (newly[1]) {
                lastActivity = now();
            }
        } else if (newly.some(Boolean) || (dir && dir !== prev.dir)) {
            activity();
        }
    }
}
setInterval(pollPads, 100);
window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.source !== "ejs-kiosk-frame") return;
    const { type } = e.data;
    if (checker && e.source === checker.frame.contentWindow) {
        if (type === "started") checker.done({ ok: true });
        else if (type === "error") checker.done({ ok: false, why: e.data.message || "error" });
        return;
    }
    if (!current || e.source !== current.frame.contentWindow) return;
    if (type === "activity") {
        lastActivity = now();
        stillThere();
    } else if (type === "started") {
        if (current.started) return;
        current.started = true;
        current.startedAt = now();
        lastActivity = now();
        $("kLoading").hidden = true;
        failures.delete(current.game.id);
        try { current.frame.contentWindow.focus(); } catch (err) { /* frame gone */ }
    } else if (type === "error") {
        // Errors before the game runs mean it can't start; later ones are logged by the game page itself
        if (!current.started && !notice) failGame(e.data.message || "error");
    } else if (type === "exit") {
        endSession(playable().length > 1 ? "menu" : "attract");
    } else if (type === "staff") {
        openPin();
    } else if (type === "shot") {
        storeShot(e.data.id, e.data.blob);
    }
});
$("kQuit").addEventListener("click", () => endSession("menu"));
$("kHelp").addEventListener("click", openHow);
$("kHowBack").addEventListener("click", () => closeHow());
$("kVol").addEventListener("click", nextVolume);
$("kLangM").addEventListener("click", () => {
    if (!otherLang()) return;
    const focused = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.id;
    setLang(otherLang());
    menu(focused);
});
$("kNoticeBtn").addEventListener("click", stillThere);

// ---------- staff gesture and PIN pad ----------
let taps = [];
$("kHot").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const t = now();
    taps = taps.filter((x) => t - x < 3000);
    taps.push(t);
    if (taps.length >= 5) {
        taps = [];
        openPin();
    }
});
let pinEntry = "";
let pinTimer = null;
let pinWrong = 0;
let pinLockedUntil = 0;
let pinPausedGame = false;
function openPin() {
    if (mode === "setup") return;
    if (!config.pinHash) return openSetup();
    pinEntry = "";
    $("kPin").hidden = false;
    $("kPinMsg").textContent = "";
    renderPin();
    $("kPinPad").firstChild.focus();
    if (mode === "play" && current && current.started && !current.paused) {
        pauseGame();
        pinPausedGame = true;
    }
    armPinTimer();
}
function armPinTimer() {
    clearTimeout(pinTimer);
    pinTimer = setTimeout(closePin, 20000);
}
function closePin() {
    clearTimeout(pinTimer);
    $("kPin").hidden = true;
    lastActivity = now();
    if (pinPausedGame) {
        pinPausedGame = false;
        resumeGame();
    }
}
function renderPin() {
    $("kPinShow").textContent = pinEntry ? "●".repeat(pinEntry.length) : "Enter the PIN";
}
async function pinKey(k) {
    armPinTimer();
    if (now() < pinLockedUntil) {
        $("kPinMsg").textContent = `Too many wrong PINs. Try again in ${Math.ceil((pinLockedUntil - now()) / 1000)} seconds.`;
        return;
    }
    if (k === "cancel") return closePin();
    if (k === "back") pinEntry = pinEntry.slice(0, -1);
    else if (k === "ok") {
        if ((await hashPin(pinEntry)) === config.pinHash) {
            pinWrong = 0;
            pinPausedGame = false;
            $("kPin").hidden = true;
            clearTimeout(pinTimer);
            return openSetup();
        }
        pinWrong++;
        pinEntry = "";
        $("kPinMsg").textContent = "Wrong PIN.";
        if (pinWrong >= 5) {
            pinWrong = 0;
            pinLockedUntil = now() + 60000;
            $("kPinMsg").textContent = "Too many wrong PINs. Try again in a minute.";
        }
    } else if (pinEntry.length < 8) pinEntry += k;
    renderPin();
}
{
    const pad = $("kPinPad");
    for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"]) {
        const b = el("button", "k-pin-key" + (k === "ok" ? " primary" : ""), k === "back" ? "⌫" : k === "ok" ? "OK" : k);
        b.type = "button";
        b.addEventListener("click", () => pinKey(k));
        pad.appendChild(b);
    }
    const cancel = el("button", "k-pin-cancel", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => pinKey("cancel"));
    pad.after(cancel);
    $("kPin").addEventListener("keydown", (e) => {
        if (/^[0-9]$/.test(e.key)) pinKey(e.key);
        else if (e.key === "Backspace") pinKey("back");
        else if (e.key === "Enter") pinKey("ok");
        else if (e.key === "Escape") pinKey("cancel");
        else return;
        e.preventDefault();
        e.stopPropagation();
    });
}

// ---------- staff settings ----------
let selected = new Map();   // id -> game entry (with captions), in the order visitors see them
let hoursRows = [];
let checker = null;         // { frame, done } while "Check every game" runs
let setupSeen = Date.now();
const SETUP_TIMEOUT = Math.max(5, Number(params.get("setupTimeout")) || 300) * 1000;   // ?setupTimeout= (seconds) for testing
["pointerdown", "keydown", "input"].forEach((type) => window.addEventListener(type, () => { if (mode === "setup") setupSeen = now(); }, true));
function resumeSaved(saved) {
    config = Object.assign({}, DEFAULTS, saved);
    loadShots().catch(() => {});
    attract();
    keepAwake();
}
async function openSetup() {
    if (current) endSessionQuiet();
    clearInterval(slideTimer);
    mode = "setup";
    setupSeen = now();
    setLang("en");
    show("kSetup");
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* not in full screen */ }
    $("kTitle").value = config.title;
    $("kWelcome").value = config.welcome;
    $("kSession").value = config.sessionMinutes;
    $("kIdle").value = config.idleSeconds;
    $("kSlideSec").value = config.slideSeconds;
    $("kVolume").value = Math.round(Number(config.volume) * 100);
    $("kFull").checked = !!config.fullscreen;
    $("kQuitOk").checked = !!config.allowQuit;
    $("kAttractShots").checked = !!config.attractShots;
    $("kVisVol").checked = config.visitorVolume !== false;
    $("kManaged").checked = !!config.managed;
    $("kDim").value = config.dimMinutes;
    for (const id of ["kLang1", "kLang2"]) {
        const sel = $(id);
        if (!sel.options.length) {
            if (id === "kLang2") sel.add(new Option("None", ""));
            for (const [code, l] of Object.entries(LANGS)) sel.add(new Option(l.name, code));
        }
    }
    $("kLang1").value = LANGS[config.lang] ? config.lang : "en";
    $("kLang2").value = LANGS[config.lang2] ? config.lang2 : "";
    $("kTitle2").value = config.title2 || "";
    $("kWelcome2").value = config.welcome2 || "";
    langFields();
    hoursRows = JSON.parse(JSON.stringify(config.hours || []));
    renderHours();
    const saved = readJSON(CONFIG_KEY);
    $("kAutoNote").hidden = !ready(saved);
    $("kAutoNote").textContent = "Left open for five minutes without a touch, these settings close and the kiosk goes back to the attract loop with the saved settings (changes not saved with Start kiosk are dropped).";
    const reload = $("kReload");
    if (!reload.options.length) {
        reload.add(new Option("Never", "-1"));
        for (let h = 0; h < 24; h++) reload.add(new Option(String(h).padStart(2, "0") + ":00", String(h)));
    }
    reload.value = String(config.reloadHour);
    $("kPin1").value = $("kPin2").value = "";
    $("kPinNote").textContent = config.pinHash ? "A PIN is set. Leave these empty to keep it." : "Choose the PIN staff will use to open these settings. It is required before the kiosk can start.";
    selected = new Map(config.games.map((g) => [g.id, Object.assign({}, g)]));
    renderStatus();
    renderOrder();
    $("kGames").textContent = "Looking for games…";
    catalog = await loadCatalog();
    // Approved showcase games saved before "How to play" existed pick it up from the showcase
    for (const g of selected.values()) {
        const c = catalog.find((x) => x.id === g.id);
        if (c && !g.controls && c.controls) g.controls = c.controls;
    }
    renderOrder();
    renderGames();
    renderCheck(readJSON(CONFIG_KEY + "-check"));
}
function langFields() {
    const two = !!$("kLang2").value && $("kLang2").value !== $("kLang1").value;
    for (const l of document.querySelectorAll(".k-l2")) l.hidden = !two;
}
for (const id of ["kLang1", "kLang2"]) $(id).addEventListener("change", () => { langFields(); renderOrder(); });
function renderHours() {
    const host = $("kHoursRows");
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
        const time = (key, label) => {
            const t = el("input");
            t.type = "time";
            t.value = row[key];
            t.setAttribute("aria-label", label);
            t.addEventListener("change", () => { row[key] = t.value; });
            return t;
        };
        const del = el("button", "", "Remove");
        del.type = "button";
        del.addEventListener("click", () => { hoursRows.splice(i, 1); renderHours(); });
        const times = el("div", "cm-hours-times");
        times.append(el("span", null, "from"), time("from", "Opens at"), el("span", null, "to"), time("to", "Closes at"), del);
        r.append(days, times);
        host.appendChild(r);
    });
}
$("kAddHours").addEventListener("click", () => { hoursRows.push({ days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" }); renderHours(); });
function renderOrder() {
    const host = $("kOrder");
    host.textContent = "";
    const second = $("kLang2").value && $("kLang2").value !== $("kLang1").value ? LANGS[$("kLang2").value] : null;
    const list = [...selected.values()];
    if (!list.length) {
        host.appendChild(el("li", "muted small", "No games ticked yet: tick them in All games below."));
        return;
    }
    list.forEach((g, i) => {
        const li = el("li", "k-order-row");
        const head = el("div", "k-order-head");
        const name = el("span");
        name.appendChild(el("strong", null, g.title));
        name.appendChild(el("span", "small muted", " · " + shortSystem(g.system)));
        const buttons = el("span", "k-order-btns");
        const button = (label, aria, fn, disabled) => {
            const b = el("button", "", label);
            b.type = "button";
            b.setAttribute("aria-label", aria + ": " + g.title);
            b.disabled = !!disabled;
            b.addEventListener("click", fn);
            buttons.appendChild(b);
        };
        button("↑", "Move up", () => moveGame(i, -1), i === 0);
        button("↓", "Move down", () => moveGame(i, 1), i === list.length - 1);
        button("✕", "Take off this screen", () => { selected.delete(g.id); renderOrder(); renderGames(); });
        head.append(name, buttons);
        li.appendChild(head);
        const field = (key, placeholder, max) => {
            const input = el("input", "k-caption");
            input.type = "text";
            input.maxLength = max;
            input.placeholder = placeholder;
            input.value = g[key] || "";
            input.setAttribute("aria-label", placeholder + ": " + g.title);
            input.addEventListener("input", () => { g[key] = input.value; });
            li.appendChild(input);
        };
        field("caption", "Caption for the attract loop (optional)", 200);
        field("controls", "How to play, e.g. Left and Right: walk · A: jump (optional)", 240);
        if (second) {
            field("caption2", `Caption in ${second.name} (optional)`, 200);
            field("controls2", `How to play in ${second.name} (optional)`, 240);
        }
        host.appendChild(li);
    });
}
function moveGame(i, d) {
    const list = [...selected.entries()];
    const [item] = list.splice(i, 1);
    list.splice(i + d, 0, item);
    selected = new Map(list);
    renderOrder();
    const buttons = $("kOrder").children[i + d] && $("kOrder").children[i + d].querySelectorAll(".k-order-btns button");
    if (buttons) (d < 0 ? buttons[0] : buttons[1]).focus();
}
function endSessionQuiet() {
    const frame = current.frame;
    current = null;
    try { frame.src = "about:blank"; } catch (e) { /* gone */ }
    freshFrame();
    hideNotice();
}
function renderStatus() {
    const s = stats();
    const offline = readJSON(CONFIG_KEY + "-offline");
    const box = $("kStatus");
    box.textContent = "";
    box.appendChild(el("h2", null, "Today on this screen"));
    const dl = el("dl", "hb-facts");
    const fact = (k, v) => { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); };
    fact("Games", config.games.length ? String(config.games.length) + " approved" : "none yet");
    fact("Visitors", `${s.sessions} sessions, ${Math.round(s.seconds / 60)} minutes played`);
    fact("Resets", `${s.timeUps} time limits reached, ${s.idleResets} players walked away`);
    fact("Recovered", `${s.errors} games that failed to start, ${s.reloads} automatic restarts`);
    const up = Math.floor((now() - bootedAt) / 60000);
    fact("Running for", up >= 60 ? `${Math.floor(up / 60)} h ${up % 60} min` : `${up} min`);
    fact("Network", navigator.onLine ? "online" : "offline");
    fact("Offline copy", offline ? `${offline.files - offline.failed} of ${offline.files} files, ${new Date(offline.at).toLocaleString()}` : "not prepared yet");
    fact("Threads", window.crossOriginIsolated ? "available" : "not available (threaded cores won't run)");
    if ((config.hours || []).length) {
        const next = nextChange();
        fact("Opening hours", (openNow() ? "open now" : "closed now") + (next ? `, ${openNow() ? "closes" : "opens"} ${next.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : ""));
    }
    const managed = readJSON(CONFIG_KEY + "-managed");
    fact("Settings", config.managed ? "follow the site's kiosk.json" + (managed ? ` (last change taken ${new Date(managed.at).toLocaleString()})` : "") : "kept on this screen");
    const busiest = s.hours.indexOf(Math.max(...s.hours));
    if (s.sessions) fact("Busiest hour today", `${String(busiest).padStart(2, "0")}:00 (${s.hours[busiest]} sessions)`);
    box.appendChild(dl);
    // The last 14 days, and the games played most in them
    const all = statsAll();
    const days = Object.keys(all.days).sort().slice(-14);
    if (days.some((d) => dayRecord(all, d).sessions)) {
        const more = el("details", "k-stats");
        more.appendChild(el("summary", null, "Visitors, last 14 days"));
        const wrap = el("div", "table-wrap");
        const table = el("table", "k-stats-table");
        const head = table.createTHead().insertRow();
        for (const h of ["Day", "Sessions", "Minutes", "Walked away", "Time ups"]) head.appendChild(el("th", null, h));
        const body = table.createTBody();
        const games = new Map();
        for (const day of days.slice().reverse()) {
            const d = dayRecord(all, day);
            const row = body.insertRow();
            for (const v of [day, d.sessions, Math.round(d.seconds / 60), d.idleResets, d.timeUps]) row.appendChild(el("td", null, String(v)));
            for (const [id, g] of Object.entries(d.games)) {
                const t = games.get(id) || { title: g.title, sessions: 0, seconds: 0 };
                t.sessions += g.sessions;
                t.seconds += g.seconds;
                games.set(id, t);
            }
        }
        wrap.appendChild(table);
        more.appendChild(wrap);
        const top = [...games.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 10);
        if (top.length) {
            more.appendChild(el("h3", "k-sub", "Most played"));
            const ol = el("ol", "k-top");
            for (const g of top) ol.appendChild(el("li", null, `${g.title}: ${g.sessions} session${g.sessions === 1 ? "" : "s"}, ${Math.round(g.seconds / 60)} min`));
            more.appendChild(ol);
        }
        box.appendChild(more);
    }
    const csv = el("button", "", "Download visitor numbers (CSV)");
    csv.type = "button";
    csv.addEventListener("click", () => download(new Blob([statsCsv()], { type: "text/csv" }), `kiosk-visitors-${today()}.csv`));
    box.appendChild(csv);
}
function download(blob, name) {
    const a = el("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function renderGames() {
    const host = $("kGames");
    host.textContent = "";
    const find = $("kFind").value.toLowerCase().trim();
    // Approved games missing from this device's list (another screen's settings) still show
    const all = catalog.slice();
    for (const g of selected.values()) if (!all.some((c) => c.id === g.id)) all.push(Object.assign({ source: "From imported settings" }, g));
    if (!all.length) {
        host.appendChild(el("p", "muted", "No games found. Add games to the Homebrew showcase, the data/ library folders, or My Collection on this device."));
        return;
    }
    let lastSource = null;
    for (const g of all) {
        if (find && !(g.title + " " + g.source + " " + shortSystem(g.system)).toLowerCase().includes(find)) continue;
        if (g.source !== lastSource) {
            host.appendChild(el("h3", "k-source", g.source));
            lastSource = g.source;
        }
        const row = el("div", "k-game-row");
        const label = el("label", "k-game-pick");
        const box = el("input");
        box.type = "checkbox";
        box.checked = selected.has(g.id);
        box.dataset.id = g.id;
        const name = el("span");
        name.appendChild(el("strong", null, g.title));
        name.appendChild(el("span", "small muted", " · " + shortSystem(g.system)));
        label.append(box, name);
        box.addEventListener("change", () => {
            if (box.checked && !selected.has(g.id)) selected.set(g.id, Object.assign({}, g));
            else if (!box.checked) selected.delete(g.id);
            renderOrder();
        });
        row.append(label);
        host.appendChild(row);
    }
}
$("kFind").addEventListener("input", renderGames);
$("kAll").addEventListener("click", () => {
    for (const box of $("kGames").querySelectorAll("input[type=checkbox]:not(:checked)")) {
        box.checked = true;
        box.dispatchEvent(new Event("change"));
    }
});
$("kNone").addEventListener("click", () => {
    selected.clear();
    renderGames();
    renderOrder();
});
async function collectSettings() {
    const pin1 = $("kPin1").value.trim();
    const pin2 = $("kPin2").value.trim();
    if (pin1 || pin2) {
        if (!/^\d{4,8}$/.test(pin1)) throw new Error("The PIN must be 4 to 8 digits.");
        if (pin1 !== pin2) throw new Error("The two PINs are not the same.");
    }
    const text = (v) => String(v || "").trim();
    const keep = (g) => ({ id: g.id, title: g.title, caption: text(g.caption), caption2: text(g.caption2), controls: text(g.controls), controls2: text(g.controls2), system: g.system, core: g.core || null, url: g.url || null, cid: g.cid || null, image: g.image || null });
    // In the order chosen under "On this screen"
    const games = [...selected.values()].map(keep);
    for (const r of hoursRows) if (!r.days.length || !r.from || !r.to) throw new Error("Each opening-hours row needs at least one day and both times.");
    const lang1 = $("kLang1").value;
    const lang2 = $("kLang2").value === lang1 ? "" : $("kLang2").value;
    const number = (id, min, max, fallback) => {
        const v = Number($(id).value);
        return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
    };
    return Object.assign({}, config, {
        title: $("kTitle").value.trim(),
        welcome: $("kWelcome").value.trim(),
        lang: lang1,
        lang2,
        title2: lang2 ? $("kTitle2").value.trim() : "",
        welcome2: lang2 ? $("kWelcome2").value.trim() : "",
        dimMinutes: number("kDim", 0, 600, DEFAULTS.dimMinutes),
        hours: JSON.parse(JSON.stringify(hoursRows)),
        visitorVolume: $("kVisVol").checked,
        managed: $("kManaged").checked,
        sessionMinutes: number("kSession", 0, 240, DEFAULTS.sessionMinutes),
        idleSeconds: number("kIdle", 15, 3600, DEFAULTS.idleSeconds),
        slideSeconds: number("kSlideSec", 3, 120, DEFAULTS.slideSeconds),
        volume: number("kVolume", 0, 100, 50) / 100,
        reloadHour: Number($("kReload").value),
        fullscreen: $("kFull").checked,
        allowQuit: $("kQuitOk").checked,
        attractShots: $("kAttractShots").checked,
        games,
        pinHash: pin1 ? await hashPin(pin1) : config.pinHash
    });
}
$("kStart").addEventListener("click", async () => {
    const msg = $("kSetupMsg");
    try {
        const next = await collectSettings();
        if (!next.games.length) throw new Error("Tick at least one game.");
        if (!next.pinHash) throw new Error("Choose a staff PIN first, so the settings can be reached again.");
        config = next;
        if (!writeJSON(CONFIG_KEY, config)) throw new Error("This browser would not save the settings (private browsing?).");
        msg.textContent = "";
        await loadShots();
        if (navigator.onLine) prepareOffline().catch(() => {});
        goFullscreen();
        attract();
        keepAwake();
    } catch (e) {
        msg.textContent = e.message;
    }
});
$("kOffline").addEventListener("click", async () => {
    try {
        const next = await collectSettings();
        if (!next.games.length) throw new Error("Tick at least one game first.");
        config = Object.assign(config, { games: next.games });
        writeJSON(CONFIG_KEY, Object.assign({}, readJSON(CONFIG_KEY) || {}, { games: next.games }));
        await prepareOffline((t) => { $("kOfflineMsg").textContent = t; });
        renderStatus();
    } catch (e) {
        $("kOfflineMsg").textContent = e.message;
    }
});
// ---------- check every game: each starts once in a hidden, silent player ----------
async function checkGames(games, report) {
    const results = [];
    for (const g of games) {
        report(results, g);
        const t0 = now();
        const frame = document.createElement("iframe");
        frame.className = "k-check-frame";
        frame.setAttribute("aria-hidden", "true");
        frame.tabIndex = -1;
        frame.setAttribute("allow", "autoplay; gamepad; cross-origin-isolated");
        document.body.appendChild(frame);
        const result = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve({ ok: false, why: "did not start within 60 seconds" }), 60000);
            checker = { frame, done: (r) => { clearTimeout(timer); resolve(r); } };
            frame.src = playSrc(g, 0);
        });
        checker = null;
        try { frame.src = "about:blank"; } catch (e) { /* gone */ }
        frame.remove();
        setupSeen = now();
        if (result.ok) failures.delete(g.id);
        results.push({ title: g.title, ok: result.ok, why: result.why || "", seconds: Math.round((now() - t0) / 100) / 10 });
    }
    const summary = { at: new Date().toISOString(), results };
    writeJSON(CONFIG_KEY + "-check", summary);
    report(results, null);
    return summary;
}
function renderCheck(summary, running) {
    const out = $("kCheckOut");
    out.textContent = "";
    if (!summary) return;
    const ok = summary.results.filter((r) => r.ok).length;
    out.appendChild(el("p", "small", running ? `Checking ${running.title}… (${summary.results.length + 1} of ${summary.total})` : `Checked ${new Date(summary.at).toLocaleString()}: ${ok} of ${summary.results.length} games started.`));
    const ul = el("ul", "k-check-list");
    for (const r of summary.results) ul.appendChild(el("li", r.ok ? "ok" : "bad", r.ok ? `✓ ${r.title}: started in ${r.seconds} s` : `✗ ${r.title}: ${r.why}`));
    out.appendChild(ul);
}
$("kCheck").addEventListener("click", async () => {
    const games = [...selected.values()];
    if (!games.length) { $("kOfflineMsg").textContent = "Tick at least one game first."; return; }
    $("kCheck").disabled = true;
    try {
        await checkGames(games, (results, next) => renderCheck({ at: new Date().toISOString(), results, total: games.length }, next));
        renderCheck(readJSON(CONFIG_KEY + "-check"));
    } finally {
        $("kCheck").disabled = false;
    }
});

$("kExport").addEventListener("click", async () => {
    try {
        const { managedStamp, ...data } = await collectSettings();
        download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "kiosk.json");
    } catch (e) {
        $("kSetupMsg").textContent = e.message;
    }
});
$("kImport").addEventListener("change", async () => {
    const file = $("kImport").files[0];
    $("kImport").value = "";
    if (!file) return;
    try {
        const data = JSON.parse(await file.text());
        if (!data || !Array.isArray(data.games)) throw new Error("This is not a kiosk settings file.");
        // The PIN comes along only when this screen has none yet
        const { managedStamp, ...rest } = data;
        config = Object.assign({}, DEFAULTS, rest, { pinHash: config.pinHash || data.pinHash || null });
        await openSetup();
        banner(`Imported ${data.games.length} games and the screen settings. Check them, then Start kiosk.`, "ok");
    } catch (e) {
        $("kSetupMsg").textContent = "Import failed: " + e.message;
    }
});
$("kForget").addEventListener("click", async () => {
    if (!confirm("Remove the kiosk settings, PIN, offline games and pictures from this device?")) return;
    try {
        localStorage.removeItem(CONFIG_KEY);
        localStorage.removeItem(CONFIG_KEY + "-offline");
        localStorage.removeItem(STATS_KEY);
        for (const k of [STATS2_KEY, CONFIG_KEY + "-check", CONFIG_KEY + "-managed"]) localStorage.removeItem(k);
        await caches.delete(FILES);
    } catch (e) { /* storage blocked */ }
    location.href = "index.html";
});
$("kLeave").addEventListener("click", () => { try { sessionStorage.setItem("ejs-home", "index.html"); } catch (e) { /* storage blocked */ } });

// ---------- full screen, screen awake, no way out for visitors ----------
function goFullscreen() {
    if (!config || !config.fullscreen || document.fullscreenElement || mode === "setup") return;
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (request) {
        try {
            const p = request.call(root, { navigationUI: "hide" });
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* needs a touch first */ }
    }
}
let wakeLock = null;
async function keepAwake() {
    try {
        if ("wakeLock" in navigator && !wakeLock && document.visibilityState === "visible") {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => { wakeLock = null; });
        }
    } catch (e) { /* not allowed */ }
}
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && mode !== "setup") keepAwake();
});
history.pushState({ kiosk: 1 }, "");
window.addEventListener("popstate", () => {
    if (mode !== "setup") history.pushState({ kiosk: 1 }, "");
});
window.addEventListener("contextmenu", (e) => { if (mode !== "setup") e.preventDefault(); });
document.addEventListener("gesturestart", (e) => { if (mode !== "setup") e.preventDefault(); });
// Errors in the kiosk page itself: several in a minute between visitors and the page restarts
let pageErrors = [];
function pageError() {
    const t = now();
    pageErrors = pageErrors.filter((x) => t - x < 60000);
    pageErrors.push(t);
    if (pageErrors.length >= 5 && mode !== "play" && mode !== "setup") reloadPage("page errors");
}
window.addEventListener("error", pageError);
window.addEventListener("unhandledrejection", pageError);
window.addEventListener("online", () => { if (config && ready(config) && mode !== "setup") prepareOffline().catch(() => {}); });
// Cursor hides when the mouse rests
let cursorTimer = null;
window.addEventListener("mousemove", () => {
    document.documentElement.classList.remove("k-nocursor");
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => { if (mode !== "setup") document.documentElement.classList.add("k-nocursor"); }, 3000);
}, { passive: true });

// ---------- start ----------
async function main() {
    try {
        const reason = sessionStorage.getItem("ejs-kiosk-reload");
        if (reason) {
            sessionStorage.removeItem("ejs-kiosk-reload");
            bump("reloads");
            console.info("Kiosk restarted: " + reason);
        }
    } catch (e) { /* storage blocked */ }
    await loadManifest();
    config = await loadConfig();
    setupServiceWorker({ shouldReload: () => mode !== "play", onUpdate: () => { pendingReload = "site update"; if (mode === "attract" || mode === "closed") reloadPage(pendingReload); } }).catch(() => {});
    setInterval(tick, 1000);
    if (ready(config) && params.get("setup") !== "1") {
        await loadShots();
        attract();
        keepAwake();
        if (navigator.onLine) prepareOffline().catch(() => {});
    } else if (ready(config)) {
        attract();
        openPin();
    } else {
        openSetup();
    }
}
main().catch((e) => {
    console.error(e);
    // A kiosk never stays on an error: try again in half a minute
    setTimeout(() => reloadPage("start failed"), 30000);
});
