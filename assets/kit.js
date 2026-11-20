// Use case 10, Build your own arcade: writes site.json (name, colours, logo, which use cases and systems to show,
// featured games, footer) with a live preview of the real pages, a branding pack (site.json, logo, manifest) and a
// guide for publishing on GitHub Pages. The pages read site.json through assets/early-view.js.
import { $, banner, loadManifest, installedCores } from "./common.js";
import { SYSTEMS, labelFor } from "./detect.js";
import { initDevice } from "./mobile.js";

initDevice();
const USES = [
    ["basic", "Basic player"], ["collection", "My Collection"], ["homebrew", "Homebrew showcase"], ["kiosk", "Museum kiosk"],
    ["classroom", "Classroom"], ["devtour", "Web development case study"], ["archive", "Preservation archive"],
    ["comfort", "Accessible and comfort play"], ["community", "Community spaces"], ["practice", "Speedrun practice"], ["kit", "Build your own arcade"]
];
const COLOURS = [["background", "Background"], ["card", "Cards"], ["text", "Text"], ["muted", "Quiet text"], ["line", "Lines"], ["accent", "Accent (links, highlights)"], ["primary", "Main buttons"]];
const BASE = {
    format: "ejs-site-1", name: "EmulatorJS", url: "", tagline: "Retro games in the browser, running from this site's own files. What would you like to do?",
    logo: "docs/Logo-light.png", favicon: "",
    colors: { accent: "#1aafff", primary: "#1a7fd0", background: "#111418", card: "#1b2027", text: "#e6e9ed", muted: "#8b95a1", line: "#2d353f" },
    uses: USES.map(([id]) => id), usesTitle: "Use cases", startPage: "", systems: [], featured: [], footer: "", links: [], hidePlanLinks: false
};
const PRESETS = {
    current: { label: "This site as it is", make: () => clone(published || BASE) },
    jam: { label: "Game jam", make: () => Object.assign(clone(BASE), { name: "Game Jam Arcade", tagline: "Every entry from this year's jam, playable in your browser.", colors: { accent: "#c18cff", primary: "#7b3fe4", background: "#120e1a", card: "#1d1728", text: "#f1ecfa", muted: "#a497b8", line: "#352b45" }, uses: ["homebrew", "practice", "kit"], usesTitle: "More", startPage: "", hidePlanLinks: true, footer: "Made by the jam's entrants. Games are shared under the licences on their pages." }) },
    creator: { label: "Creator's games page", make: () => Object.assign(clone(BASE), { name: "My Retro Games", tagline: "Homebrew games I made for old consoles. Play them right here.", colors: { accent: "#ffb347", primary: "#d9731a", background: "#16120d", card: "#221b14", text: "#f4ede4", muted: "#b3a493", line: "#3a2f24" }, uses: ["homebrew", "archive"], usesTitle: "Also here", startPage: "homebrew", hidePlanLinks: true }) },
    classroom: { label: "Class project", make: () => Object.assign(clone(BASE), { name: "Retro Computing Class", tagline: "How old games work: lessons, a guided tour of this site, and games made in class.", colors: { accent: "#4fd1c5", primary: "#1f8f84", background: "#0e1615", card: "#16211f", text: "#e6f2f0", muted: "#8fa8a4", line: "#28403c" }, uses: ["classroom", "devtour", "homebrew", "comfort"], usesTitle: "This term", startPage: "", hidePlanLinks: true }) },
    museum: { label: "Museum or library", make: () => Object.assign(clone(BASE), { name: "Games Gallery", tagline: "Playable history: catalogued, rights-cleared software from our collection.", colors: { accent: "#e8c170", primary: "#b0862f", background: "#121110", card: "#1d1b18", text: "#f2eee6", muted: "#a59e90", line: "#3a352d" }, uses: ["archive", "kiosk", "community", "comfort"], usesTitle: "Visit", startPage: "", hidePlanLinks: true }) }
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
let site = clone(BASE);
let published = null;
let logoFile = null, logoData = null;
let options = { homebrew: [], archive: [] };

// ---------- form <-> site ----------
function fill() {
    $("kitName").value = site.name || "";
    $("kitTagline").value = site.tagline || "";
    $("kitUrl").value = site.url || "";
    $("kitLogo").value = site.logo || "";
    $("kitUsesTitle").value = site.usesTitle || "";
    $("kitFooter").value = site.footer || "";
    $("kitHidePlan").checked = !!site.hidePlanLinks;
    const cols = $("kitColours");
    cols.textContent = "";
    for (const [k, label] of COLOURS) {
        const l = el("label", "kit-colour");
        const i = el("input");
        i.type = "color";
        i.value = (site.colors && site.colors[k]) || BASE.colors[k];
        i.addEventListener("input", () => { site.colors[k] = i.value; changed(); });
        l.append(i, el("span", null, label));
        cols.appendChild(l);
    }
    const uses = $("kitUses");
    uses.textContent = "";
    for (const [id, label] of USES) uses.appendChild(chip(label, site.uses.includes(id), (on) => { site.uses = USES.map(([u]) => u).filter((u) => (u === id ? on : site.uses.includes(u))); fillStart(); changed(); }));
    fillStart();
    const sys = $("kitSystems");
    sys.textContent = "";
    for (const [id] of SYSTEMS) {
        if (!installedCores(id).length) continue;
        sys.appendChild(chip(labelFor(id), site.systems.includes(id), (on) => { site.systems = on ? [...site.systems, id] : site.systems.filter((s) => s !== id); changed(); }));
    }
    const feat = $("kitFeatured");
    feat.textContent = "";
    const all = [...options.homebrew.map((g) => ["hb:" + g.folder, g.title + " (homebrew)"]), ...options.archive.map((r) => ["arc:" + r.id, r.title + " (archive " + r.id + ")"])];
    if (!all.length) feat.appendChild(el("p", "small muted", "No homebrew games or archive records yet."));
    for (const [id, label] of all) feat.appendChild(chip(label, site.featured.includes(id), (on) => { site.featured = on ? [...site.featured, id] : site.featured.filter((f) => f !== id); changed(); }));
    fillLinks();
}
function chip(label, on, change) {
    const l = el("label", "cf-chip");
    const c = el("input");
    c.type = "checkbox";
    c.checked = on;
    c.addEventListener("change", () => change(c.checked));
    l.append(c, document.createTextNode(" " + label));
    return l;
}
function fillStart() {
    const s = $("kitStart");
    s.textContent = "";
    s.add(new Option("The start page (all the parts)", ""));
    for (const [id, label] of USES) if (site.uses.includes(id)) s.add(new Option(label, id));
    s.value = site.uses.includes(site.startPage) ? site.startPage : "";
    site.startPage = s.value;
}
function fillLinks() {
    const host = $("kitLinks");
    host.textContent = "";
    site.links.forEach((link, i) => {
        const row = el("div", "kit-link-row");
        const label = el("input");
        label.placeholder = "Label";
        label.value = link.label || "";
        label.addEventListener("input", () => { link.label = label.value; changed(); });
        const url = el("input");
        url.placeholder = "https://… or a page on the site";
        url.value = link.url || "";
        url.addEventListener("input", () => { link.url = url.value.trim(); changed(); });
        const del = el("button", "", "Remove");
        del.type = "button";
        del.addEventListener("click", () => { site.links.splice(i, 1); fillLinks(); changed(); });
        row.append(label, url, del);
        host.appendChild(row);
    });
}
for (const [id, key] of [["kitName", "name"], ["kitTagline", "tagline"], ["kitUrl", "url"], ["kitLogo", "logo"], ["kitUsesTitle", "usesTitle"], ["kitFooter", "footer"]]) {
    $(id).addEventListener("input", () => { site[key] = $(id).value; if (key === "logo") { logoFile = null; logoData = null; } changed(); });
}
$("kitStart").addEventListener("change", () => { site.startPage = $("kitStart").value; changed(); });
$("kitHidePlan").addEventListener("change", () => { site.hidePlanLinks = $("kitHidePlan").checked; changed(); });
$("kitAddLink").addEventListener("click", () => { site.links.push({ label: "", url: "" }); fillLinks(); changed(); });
$("kitLogoFile").addEventListener("change", () => {
    const f = $("kitLogoFile").files[0];
    $("kitLogoFile").value = "";
    if (!f) return;
    if (f.size > 400 * 1024) return banner("Please choose a logo under 400 KB (a 256 × 256 PNG or an SVG is plenty).", "warn");
    logoFile = f;
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    site.logo = "assets/brand/logo." + ext;
    $("kitLogo").value = site.logo;
    const r = new FileReader();
    r.onload = () => { logoData = r.result; changed(); };
    r.readAsDataURL(f);
});

// ---------- checks ----------
function lum(hex) {
    const v = hex.replace("#", "");
    const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
    const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function validate(s) {
    const problems = [];
    const known = new Set(USES.map(([u]) => u));
    if (!s || typeof s !== "object") return ["The file is not a JSON object."];
    if (!s.name || typeof s.name !== "string") problems.push("A site name is needed.");
    if (s.url && !/^https:\/\/[^\s]+$/.test(s.url)) problems.push("The public address must start with https://.");
    for (const [k] of COLOURS) if (s.colors && s.colors[k] && !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s.colors[k])) problems.push(`colors.${k} must look like #12abef.`);
    for (const u of s.uses || []) if (!known.has(u)) problems.push(`"${u}" in uses is not a part of the site (${[...known].join(", ")}).`);
    if (s.startPage && !known.has(s.startPage)) problems.push(`startPage "${s.startPage}" is not a part of the site.`);
    if (s.startPage && Array.isArray(s.uses) && s.uses.length && !s.uses.includes(s.startPage)) problems.push("startPage must be one of the parts in uses.");
    const ids = new Set(SYSTEMS.map(([id]) => id));
    for (const x of s.systems || []) if (!ids.has(x)) problems.push(`Unknown system "${x}".`);
    for (const f of s.featured || []) {
        if (typeof f === "string" && f.startsWith("hb:") && !options.homebrew.some((g) => "hb:" + g.folder === f)) problems.push(`Featured ${f} is not in the Homebrew showcase.`);
        if (typeof f === "string" && f.startsWith("arc:") && !options.archive.some((r) => "arc:" + r.id === f)) problems.push(`Featured ${f} is not in the archive.`);
    }
    for (const l of s.links || []) if (l.url && !/^(https?:\/\/|[\w./?=&#%-]+$)/.test(l.url)) problems.push(`The link "${l.url}" is not a web address or a page of the site.`);
    return problems;
}
function output() {
    const s = clone(site);
    s.links = s.links.filter((l) => l.url);
    for (const k of Object.keys(s.colors)) s.colors[k] = s.colors[k].toLowerCase();
    return s;
}

// ---------- preview and output ----------
let timer = null;
function b64url(text) {
    return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function changed() {
    const s = output();
    $("kitJson").textContent = JSON.stringify(s, null, 2);
    const problems = validate(s);
    const c = s.colors;
    const tc = contrast(c.text, c.background), bc = contrast("#ffffff", c.primary), ac = contrast(c.accent, c.background);
    $("kitContrast").textContent = `Contrast: text ${tc.toFixed(1)}:1${tc < 4.5 ? " (too low; aim for 4.5 or more)" : " ✓"} · button text ${bc.toFixed(1)}:1${bc < 4.5 ? " (white text is hard to read on this button colour)" : " ✓"} · accent ${ac.toFixed(1)}:1${ac < 3 ? " (links may be hard to see)" : " ✓"}`;
    $("kitCheck").textContent = problems.length ? "To fix: " + problems.join(" ") : "✓ Ready to publish.";
    $("kitCheck").className = "small " + (problems.length ? "kit-bad" : "kit-ok");
    clearTimeout(timer);
    timer = setTimeout(preview, 350);
}
function preview() {
    const s = output();
    if (logoData) s.logo = logoData;
    const page = $("kitPage").value;
    $("kitPreview").src = page + (page.includes("?") ? "&" : "?") + "site=" + b64url(JSON.stringify(s));
}
$("kitPage").addEventListener("change", preview);
function download(name, data, type) {
    const a = el("a");
    a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
$("kitDownload").addEventListener("click", () => download("site.json", JSON.stringify(output(), null, 4) + "\n", "application/json"));
$("kitCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(output(), null, 4)); banner("site.json copied.", "ok"); } catch (e) { banner("Copy failed: select the text and copy it.", "warn"); }
});
function manifestFor(s) {
    const icon = /\.(png|svg|webp)$/i.test(s.logo || "") ? s.logo : "docs/Logo.png";
    const type = /\.svg$/i.test(icon) ? "image/svg+xml" : /\.webp$/i.test(icon) ? "image/webp" : "image/png";
    return {
        id: "./", name: s.name, short_name: s.name.length > 12 ? s.name.split(/\s+/)[0].slice(0, 12) : s.name,
        description: s.tagline || "", start_url: "./", scope: "./", display: "standalone", orientation: "any",
        background_color: s.colors.background, theme_color: s.colors.background,
        icons: [{ src: icon, sizes: type === "image/svg+xml" ? "any" : "512x512", type, purpose: "any" }]
    };
}
$("kitPack").addEventListener("click", async () => {
    const s = output();
    const problems = validate(s);
    if (problems.length) return banner("Fix these first: " + problems.join(" "), "warn");
    const JSZip = (await import("./vendor/jszip.js")).default;
    const zip = new JSZip();
    zip.file("site.json", JSON.stringify(s, null, 4) + "\n");
    zip.file("manifest.webmanifest", JSON.stringify(manifestFor(s), null, 4) + "\n");
    if (logoFile) zip.file(s.logo, logoFile);
    zip.file("README-BRANDING.txt", `Branding pack for ${s.name}\r\n\r\nCopy these files over the site's own (same folders):\r\n  site.json             the name, colours, parts, systems and featured games\r\n  manifest.webmanifest  the name and colours of the installed app (optional)\r\n${logoFile ? "  " + s.logo + "  your logo\r\n" : ""}\r\nThen push to GitHub; GitHub Pages publishes the change in about a minute.\r\nOpen kit.html on the published site and press "Check the published site.json".\r\n`);
    download(`${s.name.replace(/[^\w-]+/g, "-").toLowerCase()}-branding.zip`, await zip.generateAsync({ type: "blob" }));
});
$("kitOpen").addEventListener("change", async () => {
    const f = $("kitOpen").files[0];
    $("kitOpen").value = "";
    if (!f) return;
    try {
        const s = JSON.parse(await f.text());
        site = Object.assign(clone(BASE), s, { colors: Object.assign({}, BASE.colors, s.colors || {}) });
        logoFile = logoData = null;
        fill();
        changed();
        banner("Opened " + f.name + ".", "ok");
    } catch (e) { banner("That file is not valid JSON: " + e.message, "warn"); }
});
$("kitVerify").addEventListener("click", async () => {
    const out = $("kitVerifyOut");
    try {
        const r = await fetch("site.json", { cache: "no-cache" });
        if (!r.ok) { out.textContent = "There is no site.json on this site yet (HTTP " + r.status + "); the pages use the standard look."; return; }
        let s;
        try { s = await r.json(); } catch (e) { out.textContent = "site.json is not valid JSON: " + e.message + ". The pages use the standard look until it is fixed."; out.className = "small kit-bad"; return; }
        const problems = validate(s);
        const logo = s.logo ? await fetch(s.logo, { method: "HEAD" }).then((x) => x.ok).catch(() => false) : true;
        if (!logo) problems.push(`The logo "${s.logo}" is not on the site.`);
        out.textContent = problems.length ? "Published site.json needs fixing: " + problems.join(" ") : `✓ The published site.json is valid: "${s.name}", ${(s.uses || []).length || "all"} parts, ${(s.systems || []).length || "all"} systems, ${(s.featured || []).length} featured games.`;
        out.className = "small " + (problems.length ? "kit-bad" : "kit-ok");
    } catch (e) { out.textContent = "Could not check: " + e.message; }
});

async function main() {
    await loadManifest();
    try { const r = await fetch("site.json", { cache: "no-cache" }); if (r.ok) published = await r.json(); } catch (e) { /* none */ }
    try { options.homebrew = (await (await fetch("homebrew/index.json")).json()).games || []; } catch (e) { /* none */ }
    try { options.archive = (await (await fetch("archive/index.json")).json()).records || []; } catch (e) { /* none */ }
    site = Object.assign(clone(BASE), published || {}, { colors: Object.assign({}, BASE.colors, (published && published.colors) || {}) });
    for (const k of ["uses", "systems", "featured", "links"]) if (!Array.isArray(site[k])) site[k] = clone(BASE[k]);
    const box = $("kitPresets");
    for (const [id, p] of Object.entries(PRESETS)) {
        const b = el("button", "cf-preset", p.label);
        b.type = "button";
        b.addEventListener("click", () => {
            site = p.make();
            logoFile = logoData = null;
            for (const x of box.children) x.classList.toggle("on", x === b);
            fill();
            changed();
        });
        box.appendChild(b);
    }
    box.firstChild.classList.add("on");
    fill();
    changed();
}
main();
