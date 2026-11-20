// Use case 6, Preservation archive: playable catalogue records for public-domain and rights-cleared software.
//   archive.html               the catalogue: search, filters, verify every file, identify a file, export
//   archive.html?id=ejsa-0001  a record (its permanent link): metadata, provenance, licence, checksums checked in
//                              this browser, media, attachments, citation, and the game playable in place
// Records come from archive/index.json, built by tools/generate-archive-index.mjs from archive/<folder>/record.json.
import { $, banner, loadManifest, isAvailable, siteAllows, setupServiceWorker } from "./common.js";
import { labelFor } from "./detect.js";
import { playUrl } from "./folders.js";
import { initDevice } from "./mobile.js";
import { checksums } from "./hashes.js";

initDevice();
const params = new URLSearchParams(location.search);
let records = [];
const results = new Map();   // id -> { state: "ok" | "bad" | "error", actual, message }

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}
const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(2) + " MB" : (n / 1024).toFixed(1) + " KB") + ` (${n.toLocaleString()} bytes)`;
const permalink = (r) => new URL("archive.html?id=" + encodeURIComponent(r.id), location.href).href;
const decade = (y) => (y ? Math.floor(Number(y) / 10) * 10 + "s" : "");

// ---------- verifying ----------
async function verify(r, onProgress) {
    try {
        const response = await fetch(r.file.path, { cache: "no-cache" });
        if (!response.ok) throw new Error("the file could not be downloaded (" + response.status + ")");
        const actual = await checksums(await response.blob(), onProgress);
        const keys = ["size", "crc32", "md5", "sha1"].filter((k) => actual[k] !== null);
        const bad = keys.filter((k) => String(actual[k]).toLowerCase() !== String(r.file[k]).toLowerCase());
        const res = { state: bad.length ? "bad" : "ok", actual, bad, unchecked: ["size", "crc32", "md5", "sha1"].filter((k) => actual[k] === null) };
        results.set(r.id, res);
        return res;
    } catch (e) {
        const res = { state: "error", message: e.message };
        results.set(r.id, res);
        return res;
    }
}
function badge(r) {
    const res = results.get(r.id);
    const b = el("span", "arc-badge " + (res ? res.state : "todo"), !res ? "not checked" : res.state === "ok" ? "✓ verified" : res.state === "bad" ? "✗ does not match" : "could not check");
    if (res && res.state === "bad") b.title = "Different: " + res.bad.join(", ");
    return b;
}

// ---------- the catalogue ----------
function fillFilters() {
    const add = (select, values, label) => {
        for (const v of [...new Set(values)].filter(Boolean).sort()) select.add(new Option(label(v), v));
    };
    add($("arcPlatform"), records.map((r) => r.platform), labelFor);
    add($("arcLicence"), records.map((r) => r.licence.id), (v) => v);
    add($("arcDecade"), records.map((r) => decade(r.year)), (v) => v);
    for (const id of ["arcSearch", "arcPlatform", "arcLicence", "arcDecade", "arcSort"]) $(id).addEventListener("input", renderList);
}
function shown() {
    const words = $("arcSearch").value.toLowerCase().split(/\s+/).filter(Boolean);
    const p = $("arcPlatform").value, l = $("arcLicence").value, d = $("arcDecade").value, sort = $("arcSort").value;
    return records.filter((r) => (!p || r.platform === p) && (!l || r.licence.id === l) && (!d || decade(r.year) === d) &&
        words.every((w) => [r.id, r.title, r.creator, r.publisher, r.description, ...(r.subjects || []), ...(r.notes || []), ...(r.alternateTitles || [])].join(" ").toLowerCase().includes(w)))
        .sort((a, b) => (sort === "year" ? (a.year || 0) - (b.year || 0) : sort === "title" ? a.title.localeCompare(b.title) : a.id.localeCompare(b.id)));
}
function renderList() {
    const list = shown();
    const t = $("arcTable");
    t.textContent = "";
    const head = t.createTHead().insertRow();
    for (const h of ["No.", "Title", "Creator", "Year", "Platform", "Licence", "File"]) head.appendChild(el("th", null, h));
    const body = t.createTBody();
    for (const r of list) {
        const row = body.insertRow();
        row.insertCell().appendChild(el("code", null, r.id));
        const a = el("a", null, r.title);
        a.href = "archive.html?id=" + encodeURIComponent(r.id);
        row.insertCell().appendChild(a);
        row.insertCell().textContent = r.creator;
        row.insertCell().textContent = r.year || "–";
        row.insertCell().textContent = labelFor(r.platform);
        row.insertCell().textContent = r.licence.id;
        row.insertCell().appendChild(badge(r));
    }
    if (!list.length) {
        const row = body.insertRow();
        const c = row.insertCell();
        c.colSpan = 7;
        c.textContent = records.length ? "No record matches." : "The catalogue is empty.";
    }
    $("arcSummary").textContent = `${records.length} record${records.length === 1 ? "" : "s"} of public-domain and rights-cleared software. Every file is checked in your browser against the checksums in its record before you play it.`;
}

// ---------- a record ----------
async function showRecord(r) {
    $("arcList").hidden = true;
    const box = $("arcRecord");
    box.hidden = false;
    box.textContent = "";
    document.title = `${r.title} (${r.id}) – Preservation archive`;
    $("arcTitle").textContent = r.title;
    $("arcBack").textContent = "← Catalogue";
    $("arcBack").href = "archive.html";
    $("arcSummary").textContent = [r.creator, r.year, labelFor(r.platform), r.id].filter(Boolean).join(" · ");
    try { sessionStorage.setItem("ejs-home", "archive.html?id=" + r.id); } catch (e) { /* storage blocked */ }

    // Player (in place) and the checksum check, side by side
    const top = el("div", "arc-top");
    const player = el("section", "card arc-player");
    const stage = el("div", "arc-stage");
    if (r.media && r.media[0]) stage.style.backgroundImage = `url("${r.media[0].path}")`;
    const play = el("button", "primary arc-play", "▶ Play here");
    play.type = "button";
    const playable = isAvailable(r.platform);
    if (!playable) { play.disabled = true; play.textContent = labelFor(r.platform) + " core not installed"; }
    play.addEventListener("click", () => {
        const frame = el("iframe");
        frame.title = r.title;
        frame.setAttribute("allow", "autoplay; fullscreen; gamepad; cross-origin-isolated");
        frame.src = "play.html?" + new URLSearchParams({ embed: "1", engine: "emulatorjs", url: r.file.path, core: r.core || r.platform }).toString();
        stage.textContent = "";
        stage.style.backgroundImage = "";
        stage.appendChild(frame);
        frame.addEventListener("load", () => { try { frame.contentWindow.focus(); } catch (e) { /* not ready */ } });
    });
    stage.appendChild(play);
    const links = el("p", "small arc-player-links");
    const full = el("a", null, "Open in the full player");
    full.href = playUrl({ url: r.file.path, core: r.core || r.platform });
    const dl = el("a", null, "Download the file");
    dl.href = r.file.path;
    dl.download = r.file.path.split("/").pop();
    links.append(full, document.createTextNode(" · "), dl);
    player.append(stage, links);

    const check = el("section", "card arc-check");
    check.appendChild(el("h2", null, "Checksums"));
    const status = el("p", "arc-status", "Checking the file in your browser…");
    const table = el("table", "hb-controls arc-sums");
    const wrap = el("div", "table-wrap");
    wrap.appendChild(table);
    check.append(status, wrap, el("p", "small muted", "Recorded: the fingerprint written in the catalogue when the file was catalogued. This browser: computed just now from the file you would play. If they match, it is the same file, byte for byte."));
    top.append(player, check);
    box.appendChild(top);

    // Description, metadata and licence
    const cols = el("div", "arc-cols");
    const about = el("section", "card");
    about.appendChild(el("h2", null, "Description"));
    about.appendChild(el("p", null, r.description || ""));
    if (r.notes && r.notes.length) {
        about.appendChild(el("h3", null, "Notes"));
        const ul = el("ul");
        for (const n of r.notes) ul.appendChild(el("li", null, n));
        about.appendChild(ul);
    }
    if (r.subjects && r.subjects.length) {
        const tags = el("p", "chips");
        for (const s of r.subjects) {
            const a = el("a", "chip", s);
            a.href = "archive.html?q=" + encodeURIComponent(s);
            tags.appendChild(a);
        }
        about.appendChild(tags);
    }
    const meta = el("section", "card");
    meta.appendChild(el("h2", null, "Record"));
    const dlist = el("dl", "hb-facts");
    const fact = (k, v) => { if (v === undefined || v === null || v === "") return; dlist.appendChild(el("dt", null, k)); dlist.appendChild(el("dd", null, String(v))); };
    fact("Catalogue number", r.id);
    fact("Title", r.title);
    fact("Other titles", (r.alternateTitles || []).join("; "));
    fact("Creator", r.creator);
    fact("Publisher", r.publisher);
    fact("Year", r.year);
    fact("Platform", labelFor(r.platform));
    fact("Format", r.format);
    fact("Region", r.region);
    fact("Version", r.version);
    fact("File", r.file.path.split("/").pop());
    fact("Catalogued", [r.catalogued, r.cataloguer].filter(Boolean).join(" by "));
    meta.appendChild(dlist);
    const lic = el("section", "card arc-licence");
    lic.appendChild(el("h2", null, "Licence"));
    const ln = el("p");
    ln.appendChild(el("strong", null, r.licence.name || r.licence.id));
    if (r.licence.url) {
        ln.appendChild(document.createTextNode(" · "));
        const a = el("a", null, "licence text");
        a.href = r.licence.url;
        a.target = "_blank";
        a.rel = "noopener";
        ln.appendChild(a);
    }
    lic.appendChild(ln);
    if (r.licence.statement) lic.appendChild(el("p", null, r.licence.statement));
    if (r.licence.evidence) lic.appendChild(el("p", "small muted", "Permission recorded: " + r.licence.evidence));
    cols.append(about, meta);
    box.appendChild(cols);
    box.appendChild(lic);

    // Provenance timeline
    const prov = el("section", "card");
    prov.appendChild(el("h2", null, "Provenance"));
    const ol = el("ol", "arc-prov");
    for (const p of r.provenance) {
        const li = el("li");
        li.appendChild(el("span", "arc-date", p.date || "undated"));
        const body = el("div");
        body.appendChild(el("strong", null, p.event + (p.by ? " · " + p.by : "")));
        if (p.details) body.appendChild(el("p", null, p.details));
        li.appendChild(body);
        ol.appendChild(li);
    }
    prov.appendChild(ol);
    box.appendChild(prov);

    // Media and attachments
    if ((r.media && r.media.length) || (r.attachments && r.attachments.length)) {
        const media = el("section", "card");
        media.appendChild(el("h2", null, "Media and attachments"));
        const grid = el("div", "arc-media");
        for (const m of r.media || []) {
            const fig = el("figure");
            const img = el("img");
            img.src = m.path;
            img.alt = m.caption || m.kind;
            img.loading = "lazy";
            fig.append(img, el("figcaption", "small", `${m.kind}${m.caption ? ": " + m.caption : ""}`));
            grid.appendChild(fig);
        }
        media.appendChild(grid);
        if (r.attachments && r.attachments.length) {
            const ul = el("ul");
            for (const a of r.attachments) {
                const li = el("li");
                const link = el("a", null, a.label || a.path);
                link.href = a.path;
                li.append(document.createTextNode(a.kind + ": "), link);
                ul.appendChild(li);
            }
            media.appendChild(ul);
        }
        box.appendChild(media);
    }

    // Citation, permanent link, related, export
    const cite = el("section", "card arc-cite");
    cite.appendChild(el("h2", null, "Cite or link to this record"));
    const text = `${r.creator}. (${r.year}). ${r.title}${r.version ? " (version " + r.version + ")" : ""} [${labelFor(r.platform)} software]. ${r.publisher ? r.publisher + ". " : ""}Preservation archive record ${r.id}. SHA-1 ${r.file.sha1}. ${permalink(r)}`;
    const pre = el("p", "arc-citation", text);
    const row = el("div", "buttons");
    for (const [label, value] of [["Copy permanent link", permalink(r)], ["Copy citation", text]]) {
        const b = el("button", null, label);
        b.type = "button";
        b.addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(value); banner("Copied.", "ok"); } catch (e) { prompt("Copy:", value); }
        });
        row.appendChild(b);
    }
    const exp = el("button", null, "Download this record (JSON)");
    exp.type = "button";
    exp.addEventListener("click", () => download(r.id + ".json", JSON.stringify(stripLocal(r), null, 2), "application/json"));
    row.appendChild(exp);
    cite.append(pre, row);
    const rel = (r.related || []).map((id) => records.find((x) => x.id === id)).filter(Boolean);
    if (rel.length) {
        cite.appendChild(el("h3", null, "Related records"));
        const ul = el("ul");
        for (const x of rel) {
            const li = el("li");
            const a = el("a", null, `${x.title} (${x.id})`);
            a.href = "archive.html?id=" + encodeURIComponent(x.id);
            li.appendChild(a);
            ul.appendChild(li);
        }
        cite.appendChild(ul);
    }
    box.appendChild(cite);

    // Check the file now
    const res = await verify(r, (f) => { status.textContent = `Checking the file in your browser… ${Math.round(f * 100)} %`; });
    renderSums(table, r, res);
    status.className = "arc-status " + res.state;
    status.textContent = res.state === "ok" ? `✓ Verified: the file matches its record${res.unchecked.length ? " (SHA-1 needs a secure connection and was not checked)" : ""}.` :
        res.state === "bad" ? `✗ The file does not match its record (${res.bad.join(", ")}). It has changed or is damaged; it is not the catalogued copy.` :
            `The file could not be checked: ${res.message}.`;
}
function renderSums(table, r, res) {
    table.textContent = "";
    const head = table.createTHead().insertRow();
    for (const h of ["", "Recorded", "This browser", ""]) head.appendChild(el("th", null, h));
    const body = table.createTBody();
    for (const [k, label] of [["size", "Size"], ["crc32", "CRC32"], ["md5", "MD5"], ["sha1", "SHA-1"]]) {
        const row = body.insertRow();
        row.insertCell().textContent = label;
        const rec = k === "size" ? kb(r.file.size) : r.file[k];
        const got = res.actual ? (res.actual[k] === null ? "not available" : k === "size" ? kb(res.actual.size) : res.actual[k]) : "–";
        row.insertCell().appendChild(el("code", null, rec));
        row.insertCell().appendChild(el("code", null, got));
        const ok = res.actual && res.actual[k] !== null && String(res.actual[k]).toLowerCase() === String(r.file[k]).toLowerCase();
        row.insertCell().appendChild(el("span", "arc-tick " + (res.actual && res.actual[k] !== null ? (ok ? "ok" : "bad") : ""), res.actual && res.actual[k] !== null ? (ok ? "✓" : "✗") : ""));
    }
}

// ---------- tools ----------
$("arcVerifyAll").addEventListener("click", async () => {
    const list = shown();
    let ok = 0, bad = 0, err = 0;
    for (let i = 0; i < list.length; i++) {
        $("arcMsg").textContent = `Checking ${i + 1} of ${list.length}: ${list[i].title}…`;
        const res = await verify(list[i]);
        if (res.state === "ok") ok++; else if (res.state === "bad") bad++; else err++;
        renderList();
    }
    $("arcMsg").textContent = `${ok} verified${bad ? `, ${bad} do not match` : ""}${err ? `, ${err} could not be checked` : ""}.`;
});
$("arcIdentify").addEventListener("change", async () => {
    const file = $("arcIdentify").files[0];
    $("arcIdentify").value = "";
    if (!file) return;
    $("arcMsg").textContent = `Computing the checksums of ${file.name}…`;
    const sums = await checksums(file, (f) => { $("arcMsg").textContent = `Computing the checksums of ${file.name}… ${Math.round(f * 100)} %`; });
    const match = records.find((r) => (sums.sha1 && r.file.sha1 === sums.sha1) || (r.file.md5 === sums.md5 && r.file.crc32 === sums.crc32 && r.file.size === sums.size));
    const msg = $("arcMsg");
    msg.textContent = "";
    if (match) {
        msg.append(`✓ ${file.name} is `);
        const a = el("a", null, `${match.title} (${match.id})`);
        a.href = "archive.html?id=" + encodeURIComponent(match.id);
        msg.append(a, ", byte for byte.");
    } else {
        msg.textContent = `${file.name} is not in this catalogue. CRC32 ${sums.crc32} · MD5 ${sums.md5}${sums.sha1 ? " · SHA-1 " + sums.sha1 : ""} · ${sums.size.toLocaleString()} bytes`;
    }
});
const stripLocal = (r) => { const c = Object.assign({}, r); delete c.folder; return c; };
function download(name, text, type) {
    const a = el("a");
    a.href = URL.createObjectURL(text instanceof Blob ? text : new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const today = () => new Date().toLocaleDateString("en-CA");
$("arcExportJson").addEventListener("click", () => download(`archive-catalogue-${today()}.json`, JSON.stringify({ format: "ejs-archive-1", exported: new Date().toISOString(), records: records.map(stripLocal) }, null, 2), "application/json"));
$("arcExportCsv").addEventListener("click", () => {
    const cols = ["id", "title", "creator", "publisher", "year", "platform", "format", "region", "version", "licence", "file", "size", "crc32", "md5", "sha1", "permalink"];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [cols.join(",")];
    for (const r of records) lines.push([r.id, r.title, r.creator, r.publisher, r.year, r.platform, r.format, r.region, r.version, r.licence.id, r.file.path, r.file.size, r.file.crc32, r.file.md5, r.file.sha1, permalink(r)].map(q).join(","));
    download(`archive-catalogue-${today()}.csv`, "﻿" + lines.join("\r\n") + "\r\n", "text/csv");
});
$("arcExportZip").addEventListener("click", async () => {
    $("arcMsg").textContent = "Collecting the records and their files…";
    try {
        const JSZip = (await import("./vendor/jszip.js")).default;
        const zip = new JSZip();
        zip.file("catalogue.json", JSON.stringify({ format: "ejs-archive-1", exported: new Date().toISOString(), records: records.map(stripLocal) }, null, 2));
        const paths = new Set();
        for (const r of records) {
            zip.file(`records/${r.id}.json`, JSON.stringify(stripLocal(r), null, 2));
            paths.add(r.file.path);
            for (const m of [...(r.media || []), ...(r.attachments || [])]) paths.add(m.path);
        }
        let n = 0;
        for (const p of paths) {
            $("arcMsg").textContent = `Adding file ${++n} of ${paths.size}…`;
            const res = await fetch(p);
            if (res.ok) zip.file("files/" + p, await res.blob(), { binary: true });
        }
        zip.file("README.txt", "Preservation archive export.\r\ncatalogue.json lists every record; records/ has one file per record; files/ has each record's file, media and attachments at their site paths.\r\nCheck any file against its record's crc32, md5 and sha1.\r\n");
        const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        download(`archive-${today()}.zip`, blob);
        $("arcMsg").textContent = `Exported ${records.length} records and ${paths.size} files.`;
    } catch (e) {
        $("arcMsg").textContent = "Export failed: " + e.message;
    }
});

async function main() {
    await loadManifest();
    try {
        records = (((await (await fetch("archive/index.json", { cache: "no-cache" })).json()).records) || []).filter((r) => siteAllows(r.platform));
    } catch (e) {
        records = [];
    }
    const id = params.get("id");
    const r = id && records.find((x) => x.id === id);
    if (r) {
        showRecord(r);
    } else {
        try { sessionStorage.setItem("ejs-home", "archive.html"); } catch (e) { /* storage blocked */ }
        fillFilters();
        if (params.get("q")) $("arcSearch").value = params.get("q");
        renderList();
        if (id) banner(`There is no record ${id} in this catalogue.`, "warn");
    }
    setupServiceWorker({ shouldReload: () => true }).catch(() => {});
}
main();
