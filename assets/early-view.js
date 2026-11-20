// Sets the phone-view classes before the page is first drawn, so phones never flash the desktop layout.
// assets/mobile.js keeps them up to date afterwards (same rules).
(function () {
    try {
        var h = document.documentElement, ua = navigator.userAgent;
        var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        var android = /Android/.test(ua);
        var touch = matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && (ios || android));
        var view = new URLSearchParams(location.search).get("view");
        if (view !== "phone" && view !== "desktop") {
            var mode = (JSON.parse(localStorage.getItem("ejs-launcher-options") || "{}").mode) || "";
            view = mode === "mobile" ? "phone" : mode === "desktop" ? "desktop" : "auto";
        }
        var phone = view === "phone" || (view === "auto" && touch && Math.min(screen.width, screen.height) <= 820);
        var portrait = innerHeight >= innerWidth;
        var add = function (name, on) { if (on) h.classList.add(name); };
        add("m-touch", touch); add("m-phone", phone); add("m-ios", ios); add("m-iphone", /iPhone|iPod/.test(ua));
        add("m-android", android); add("m-standalone", navigator.standalone === true || matchMedia("(display-mode: standalone)").matches);
        add(portrait ? "m-portrait" : "m-landscape", true);
    } catch (e) { /* mobile.js sets them later */ }
})();

// Site branding (use case 10, "Build your own arcade"): site.json next to the pages sets the name, colours, logo,
// which use cases and systems are shown, and featured games. The last copy is kept in localStorage so the colours
// apply before the first paint; the file is then fetched fresh (window.EJS_SITE_READY resolves with it).
// The kit page previews a design with ?site=<base64url JSON>, which applies to that page load only.
(function () {
    var h = document.documentElement;
    var VARS = { accent: "--accent", primary: "--primary", background: "--bg", card: "--card", text: "--text", muted: "--muted", line: "--line" };
    var PAGES = { "basic.html": "basic", "collection.html": "collection", "homebrew.html": "homebrew", "kiosk.html": "kiosk", "classroom.html": "classroom",
        "devtour.html": "devtour", "archive.html": "archive", "comfort.html": "comfort", "community.html": "community", "practice.html": "practice" };
    var HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
    function apply(s) {
        if (!s || typeof s !== "object") return;
        window.EJS_SITE = s;
        var c = s.colors || {};
        for (var k in VARS) if (HEX.test(c[k] || "")) h.style.setProperty(VARS[k], c[k]); else h.style.removeProperty(VARS[k]);
    }
    function page() { var p = location.pathname.split("/").pop() || "index.html"; return p; }
    function dom() {
        var s = window.EJS_SITE;
        if (!s) return;
        var name = s.name && String(s.name).slice(0, 60);
        if (name) document.title = document.title.replace(/EmulatorJS/g, name);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta && s.colors && HEX.test(s.colors.background || "")) meta.setAttribute("content", s.colors.background);
        var am = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (am && name && am.getAttribute("content") === "EmulatorJS") am.setAttribute("content", name);
        if (s.favicon) { var link = document.querySelector('link[rel="icon"]'); if (link) { link.href = s.favicon; link.removeAttribute("type"); link.removeAttribute("sizes"); } }
        // With a single start use case, "All uses" links lead back to it
        if (s.startPage && s.startPage !== "index") for (var a of document.querySelectorAll("a.back-start")) if (/^index\.html$/.test(a.getAttribute("href") || "")) a.setAttribute("href", "index.html?home=1");
    }
    function gate() {
        var s = window.EJS_SITE;
        if (!s || !Array.isArray(s.uses) || !s.uses.length) return;
        var id = PAGES[page()];
        if (id && s.uses.indexOf(id) < 0 && !/[?&]site=/.test(location.search) && window.top === window) location.replace("index.html?home=1");
    }
    try {
        var q = new URLSearchParams(location.search).get("site");
        if (q) {
            var json = decodeURIComponent(escape(atob(q.replace(/-/g, "+").replace(/_/g, "/"))));
            apply(JSON.parse(json));
            window.EJS_SITE_PREVIEW = true;
            window.EJS_SITE_READY = Promise.resolve(window.EJS_SITE);
        } else {
            try { apply(JSON.parse(localStorage.getItem("ejs-site") || "null")); } catch (e) { /* none yet */ }
            gate();
            window.EJS_SITE_READY = Promise.race([
                fetch("site.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
                    try { if (s) localStorage.setItem("ejs-site", JSON.stringify(s)); else localStorage.removeItem("ejs-site"); } catch (e) { /* storage blocked */ }
                    if (s) { apply(s); gate(); } else if (window.EJS_SITE) { window.EJS_SITE = null; for (var k in VARS) h.style.removeProperty(VARS[k]); }
                    if (document.readyState !== "loading") dom();
                    window.dispatchEvent(new CustomEvent("ejs-site", { detail: s }));
                    return s;
                }).catch(function () { return window.EJS_SITE || null; }),
                new Promise(function (r) { setTimeout(function () { r(window.EJS_SITE || null); }, 2000); })
            ]);
        }
    } catch (e) { window.EJS_SITE_READY = Promise.resolve(null); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", dom); else dom();
})();
