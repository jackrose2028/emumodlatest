// Start page: choose one of the use cases (or Basic). The last choice is offered as "Continue".
import { $, setupServiceWorker } from "./common.js";
import { initDevice } from "./mobile.js";

const params = new URLSearchParams(location.search);
// Old links (index.html?rom=..., ?engine=...) belonged to the Basic page
if (params.get("rom")) location.replace("basic.html" + location.search);
initDevice();
try { sessionStorage.setItem("ejs-home", "index.html"); } catch (e) { /* storage blocked */ }

const names = {};
for (const link of document.querySelectorAll("a[data-use]")) {
    names[link.dataset.use] = { href: link.getAttribute("href"), title: link.querySelector("strong").textContent };
    link.addEventListener("click", () => {
        try { localStorage.setItem("ejs-last-use", link.dataset.use); } catch (e) { /* storage blocked */ }
    });
}
let last = null;
try { last = localStorage.getItem("ejs-last-use"); } catch (e) { /* storage blocked */ }
if (last && names[last]) {
    const p = document.getElementById("continue");
    const a = document.createElement("a");
    a.className = "button";
    a.href = names[last].href;
    a.textContent = "Continue: " + names[last].title + " →";
    p.appendChild(a);
    p.hidden = false;
}
// ---------- site branding (site.json, use case 10) ----------
const USE_PAGES = { basic: "basic.html", collection: "collection.html", homebrew: "homebrew.html", kiosk: "kiosk.html", classroom: "classroom.html",
    devtour: "devtour.html", archive: "archive.html", comfort: "comfort.html", community: "community.html", practice: "practice.html", kit: "kit.html" };
function brand(site) {
    const h = document.querySelector(".start-head");
    if (!site) return;
    // One chosen start page: the site opens straight there (index.html?home=1 still shows the list)
    if (site.startPage && USE_PAGES[site.startPage] && !params.get("home") && !window.EJS_SITE_PREVIEW) {
        location.replace(USE_PAGES[site.startPage]);
        return;
    }
    if (site.name) h.querySelector("h1").textContent = site.name;
    if (site.tagline) h.querySelector("p.muted").textContent = site.tagline;
    if (site.logo) { const img = h.querySelector("img.logo"); img.src = site.logo; img.alt = site.name || ""; }
    if (Array.isArray(site.uses) && site.uses.length) {
        for (const link of document.querySelectorAll("a[data-use]")) {
            const hide = !site.uses.includes(link.dataset.use);
            (link.closest("li") || link).hidden = hide;
        }
        const anyListed = [...document.querySelectorAll(".uses a[data-use]")].some((a) => !a.closest("li").hidden);
        document.querySelector(".start-sub:not(#featured .start-sub)").hidden = !anyListed;
        if (site.usesTitle) document.querySelector(".start-sub:not(#featured .start-sub)").textContent = site.usesTitle;
    }
    if (site.hidePlanLinks) $("stdFoot").hidden = true;
    const foot = $("siteFoot");
    foot.textContent = "";
    if (site.footer) foot.appendChild(document.createTextNode(site.footer + " "));
    for (const l of Array.isArray(site.links) ? site.links : []) {
        if (!l || !l.url || !/^(https?:\/\/|[\w./?=&#%-]+$)/.test(l.url)) continue;
        const a = document.createElement("a");
        a.href = l.url;
        a.textContent = l.label || l.url;
        if (/^https?:/.test(l.url)) { a.target = "_blank"; a.rel = "noopener"; }
        foot.append(a, document.createTextNode(" · "));
    }
    if (foot.lastChild && foot.lastChild.nodeType === 3 && foot.lastChild.textContent === " · ") foot.lastChild.remove();
    foot.hidden = !foot.childNodes.length;
    featured(site.featured);
}
let featuredRun = 0;
async function featured(list) {
    const run = ++featuredRun;
    const box = $("featured");
    const ul = document.createElement("ul");
    ul.className = "start-feat";
    ul.id = "featuredList";
    if (!Array.isArray(list) || !list.length) { box.hidden = true; $("featuredList").textContent = ""; return; }
    let hb = [], arc = [];
    try { hb = (await (await fetch("homebrew/index.json")).json()).games || []; } catch (e) { /* none */ }
    try { arc = (await (await fetch("archive/index.json")).json()).records || []; } catch (e) { /* none */ }
    for (const f of list.slice(0, 12)) {
        let item = null;
        if (typeof f === "object" && f && f.url) item = { title: f.title || f.url, url: f.url, image: f.image || null, sub: f.subtitle || "" };
        else if (typeof f === "string" && f.startsWith("hb:")) {
            const g = hb.find((x) => x.folder === f.slice(3));
            if (g) item = { title: g.title, url: "homebrew.html?game=" + encodeURIComponent(g.folder), image: g.screenshots[0] ? `homebrew/${g.folder}/${g.screenshots[0]}` : null, sub: g.author };
        } else if (typeof f === "string" && f.startsWith("arc:")) {
            const r = arc.find((x) => x.id === f.slice(4));
            if (r) item = { title: r.title, url: "archive.html?id=" + encodeURIComponent(r.id), image: r.media && r.media[0] ? r.media[0].path : null, sub: r.creator + " · " + r.year };
        } else if (typeof f === "string" && f.startsWith("lib:")) {
            const [folder, ...rest] = f.slice(4).split("/");
            const file = rest.join("/");
            item = { title: file.replace(/\.[^.]+$/, ""), url: "play.html?" + new URLSearchParams({ folder, file }).toString(), image: null, sub: folder };
        }
        if (!item) continue;
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "start-feat-card";
        a.href = item.url;
        const pic = document.createElement("span");
        pic.className = "col-cover";
        pic.dataset.system = item.title;
        if (item.image) pic.style.backgroundImage = `url("${item.image}")`;
        const t = document.createElement("strong");
        t.textContent = item.title;
        const sub = document.createElement("span");
        sub.textContent = item.sub || "";
        a.append(pic, t, sub);
        li.appendChild(a);
        ul.appendChild(li);
    }
    if (run !== featuredRun) return; // a newer call (fresh site.json) replaces this one
    $("featuredList").replaceWith(ul);
    box.hidden = !ul.children.length;
}
brand(window.EJS_SITE);
if (window.EJS_SITE_READY) window.EJS_SITE_READY.then((s) => { if (s !== undefined) brand(s); });

// Registered here too, so the site works offline and threads are ready whichever page is opened next
setupServiceWorker({ shouldReload: () => false }).catch(() => {});
