// Every game this site can offer a page that picks games (kiosk, classroom): the Homebrew showcase, the game
// library folders in data/ and My Collection on this device. Only systems with an installed core are listed.
import { isAvailable } from "./common.js";
import { loadFolders, romUrl, gameTitle } from "./folders.js";
import * as collection from "./collection-store.js";

export function firstSentences(text, max = 160) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
    return end > 40 ? cut.slice(0, end + 1) : cut.replace(/\s\S*$/, "") + "…";
}

/** "Up/Down/Left/Right: Move · A: Jump": buttons that do the same thing share one entry */
export function controlsText(controls) {
    const byAction = new Map();
    for (const [button, action] of Object.entries(controls || {})) byAction.set(action, [...(byAction.get(action) || []), button]);
    return [...byAction].map(([action, buttons]) => `${buttons.join("/")}: ${action}`).join(" · ");
}

/** [{ id, source, title, system, core, url | cid, image, caption, controls? }] */
export async function loadCatalog() {
    const items = [];
    try {
        const hb = await (await fetch("homebrew/index.json", { cache: "no-cache" })).json();
        for (const g of hb.games || []) {
            items.push({
                id: "hb:" + g.folder, source: "Homebrew showcase", title: g.title, system: g.system, core: g.core || null,
                url: `homebrew/${g.folder}/${g.rom}`, image: g.screenshots && g.screenshots[0] ? `homebrew/${g.folder}/${g.screenshots[0]}` : null,
                caption: firstSentences(g.description) + (g.author ? ` By ${g.author}.` : ""),
                controls: controlsText(g.controls)
            });
        }
    } catch (e) { /* no showcase */ }
    try {
        for (const f of await loadFolders(isAvailable)) {
            for (const file of f.files) items.push({ id: "lib:" + f.folder + "/" + file.name, source: "Library: data/" + f.folder, title: gameTitle(file.name), system: f.system, core: null, url: romUrl(f.folder, file.name), image: null, caption: "" });
        }
    } catch (e) { /* no folders */ }
    try {
        for (const r of await collection.list()) items.push({ id: "col:" + r.id, source: "My Collection (this device)", title: r.title, system: r.system, core: r.core || null, cid: r.id, image: null, caption: "" });
    } catch (e) { /* no collection */ }
    return items.filter((i) => isAvailable(i.system));
}
