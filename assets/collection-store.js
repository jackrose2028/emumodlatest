// My Collection (use case 1): your own game backups kept in this browser, with their details, so the whole
// collection is one tap away on any device you set it up on, and can be carried to another with one file.
//   IndexedDB "EJS-collection": store "games" (details, keyPath id) and store "files" (ROM bytes and cover pictures).
const DB_NAME = "EJS-collection";
let dbPromise = null;

function db() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const d = request.result;
                if (!d.objectStoreNames.contains("games")) d.createObjectStore("games", { keyPath: "id" });
                if (!d.objectStoreNames.contains("files")) d.createObjectStore("files");
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("This browser does not allow storing games."));
        });
    }
    return dbPromise;
}
async function run(stores, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
        const t = d.transaction(stores, mode);
        let result;
        Promise.resolve(fn(t, (r) => { result = r; })).catch(reject);
        t.oncomplete = () => resolve(result);
        t.onerror = t.onabort = () => reject(t.error || new Error("Storage error (the browser may be out of space)."));
    });
}
const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

/** A stable id for a file: same name and size means the same game (re-adding it updates instead of duplicating). */
export const idFor = (name, size) => "c|" + name + "|" + size;
export const titleFor = (name) => name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

export async function list() {
    return run(["games"], "readonly", async (t, done) => done(await req(t.objectStore("games").getAll())));
}
export async function get(id) {
    return run(["games"], "readonly", async (t, done) => done(await req(t.objectStore("games").get(id))));
}
/** SHA-1 of a file (hex), or null when the browser can't (no secure context) or the file is very large. */
export async function sha1Of(blob) {
    if (!window.crypto || !crypto.subtle || blob.size > 512 * 1024 * 1024) return null;
    try {
        const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
        return null;
    }
}
/** Adds (or replaces) a game with its file. Returns the stored record. */
export async function add({ file, name = file.name, system, core = null, title, added, lastPlayed = null, favorite = false, playSeconds = 0, sessions = 0, sha1, shelves = [], status = "", notes = "", source = "" }) {
    const record = {
        id: idFor(name, file.size), name, title: title || titleFor(name), system, core, size: file.size,
        added: added || Date.now(), lastPlayed, favorite, playSeconds, sessions, hasCover: false, customCover: false,
        sha1: sha1 === undefined ? await sha1Of(file) : sha1, shelves: [...new Set(shelves)], status, notes, source
    };
    const existing = await get(record.id).catch(() => null);
    if (existing) {
        // Keep what the player built up; take the new system / core choice
        Object.assign(record, {
            added: existing.added, lastPlayed: existing.lastPlayed || lastPlayed, favorite: existing.favorite || favorite,
            playSeconds: Math.max(existing.playSeconds || 0, playSeconds), sessions: Math.max(existing.sessions || 0, sessions),
            hasCover: existing.hasCover, customCover: existing.customCover || false, title: title || existing.title,
            shelves: [...new Set([...(existing.shelves || []), ...shelves])], status: status || existing.status || "",
            notes: notes || existing.notes || "", sha1: record.sha1 || existing.sha1 || null, source: source || existing.source || ""
        });
    }
    const blob = file instanceof Blob ? file : new Blob([file]);
    await run(["games", "files"], "readwrite", (t) => {
        t.objectStore("files").put(blob, record.id);
        t.objectStore("games").put(record);
    });
    return record;
}
/** Games with this SHA-1 (the same file under any name). */
export async function findBySha1(sha1) {
    if (!sha1) return [];
    return (await list()).filter((g) => g.sha1 === sha1);
}
export async function update(id, changes) {
    return run(["games"], "readwrite", async (t, done) => {
        const store = t.objectStore("games");
        const record = await req(store.get(id));
        if (!record) return done(null);
        Object.assign(record, changes);
        store.put(record);
        done(record);
    });
}
export async function remove(id) {
    await run(["games", "files"], "readwrite", (t) => {
        t.objectStore("games").delete(id);
        t.objectStore("files").delete(id);
        t.objectStore("files").delete(id + "#cover");
    });
}
export async function file(id) {
    return run(["files"], "readonly", async (t, done) => done(await req(t.objectStore("files").get(id))));
}
export async function cover(id) {
    return run(["files"], "readonly", async (t, done) => done(await req(t.objectStore("files").get(id + "#cover"))));
}
/** Stores a cover picture. Pictures taken from the game (auto) never replace one the player chose. */
export async function setCover(id, blob, { custom = false, auto = true } = {}) {
    await run(["files", "games"], "readwrite", async (t) => {
        const games = t.objectStore("games");
        const record = await req(games.get(id));
        if (!record || (auto && !custom && record.customCover)) return;
        t.objectStore("files").put(blob, id + "#cover");
        record.hasCover = true;
        record.customCover = !!custom;
        games.put(record);
    });
}
export async function removeCover(id) {
    await run(["files", "games"], "readwrite", async (t) => {
        t.objectStore("files").delete(id + "#cover");
        const games = t.objectStore("games");
        const record = await req(games.get(id));
        if (record) {
            record.hasCover = false;
            record.customCover = false;
            games.put(record);
        }
    });
}
/** Marks a game played now and adds the seconds played since the last call; newSession counts a new play session. */
export async function played(id, seconds = 0, newSession = false) {
    return run(["games"], "readwrite", async (t, done) => {
        const store = t.objectStore("games");
        const record = await req(store.get(id));
        if (!record) return done(null);
        record.lastPlayed = Date.now();
        record.playSeconds = (record.playSeconds || 0) + Math.max(0, Math.round(seconds));
        if (newSession) record.sessions = (record.sessions || 0) + 1;
        store.put(record);
        done(record);
    });
}
export async function clear() {
    await run(["games", "files"], "readwrite", (t) => {
        t.objectStore("games").clear();
        t.objectStore("files").clear();
    });
}
