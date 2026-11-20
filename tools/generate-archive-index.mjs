// Writes archive/index.json from every archive/<folder>/record.json (the Preservation archive, use case 6).
// Each record's file is checked against its recorded checksums (CRC32, MD5, SHA-1 and size). Records without
// checksums are reported; --write records them (the first, trusted catalogue pass). A mismatch is always an error.
//   node tools/generate-archive-index.mjs            warn about problems; records with problems are left out
//   node tools/generate-archive-index.mjs --write    also fill in missing checksums in record.json
//   node tools/generate-archive-index.mjs --strict   fail on any problem (for CI)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "archive");
const write = process.argv.includes("--write");
const strict = process.argv.includes("--strict");
const REQUIRED = ["id", "title", "creator", "year", "platform", "licence", "provenance", "file"];
// Only software that may be shared: public domain, free licences, or written permission (licence.evidence)
const FREE = /^(CC0-1\.0|CC-BY(-SA)?-[34]\.0|MIT|BSD-[23]-Clause|Zlib|Unlicense|GPL-[23]\.0(-only|-or-later)?|LGPL-[23]\.[01](-only|-or-later)?|public-domain|permission)$/;

const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
})();
function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");
}
const inSite = (p) => {
    const full = path.resolve(root, p);
    return full.startsWith(root + path.sep) ? full : null;
};

const records = [];
const problems = [];
const ids = new Map();
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const file = path.join(dir, folder, "record.json");
    if (!fs.existsSync(file)) continue;
    let rec;
    try {
        rec = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        problems.push(`${folder}/record.json is not valid JSON: ${e.message}`);
        continue;
    }
    const missing = REQUIRED.filter((k) => rec[k] === undefined || rec[k] === "" || (Array.isArray(rec[k]) && !rec[k].length));
    if (missing.length) { problems.push(`${folder}: missing ${missing.join(", ")}`); continue; }
    if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(rec.id)) { problems.push(`${folder}: id "${rec.id}" must be lower-case letters, digits and dashes`); continue; }
    if (ids.has(rec.id)) { problems.push(`${folder}: id ${rec.id} is already used by ${ids.get(rec.id)}`); continue; }
    ids.set(rec.id, folder);
    if (!rec.licence.id || !FREE.test(rec.licence.id)) { problems.push(`${folder}: licence "${rec.licence.id}" is not a public-domain or free licence (use "permission" with licence.evidence for written permission)`); continue; }
    if (rec.licence.id === "permission" && !rec.licence.evidence) { problems.push(`${folder}: licence "permission" needs licence.evidence (where the permission is recorded)`); continue; }
    const target = rec.file && rec.file.path && inSite(rec.file.path);
    if (!target || !fs.existsSync(target)) { problems.push(`${folder}: file "${rec.file && rec.file.path}" not found`); continue; }
    const bytes = fs.readFileSync(target);
    const actual = {
        size: bytes.length,
        crc32: crc32(bytes),
        md5: crypto.createHash("md5").update(bytes).digest("hex"),
        sha1: crypto.createHash("sha1").update(bytes).digest("hex")
    };
    const recorded = ["size", "crc32", "md5", "sha1"].filter((k) => rec.file[k] !== undefined);
    if (recorded.length < 4) {
        if (write) {
            rec.file = Object.assign({ path: rec.file.path }, actual, rec.file);
            fs.writeFileSync(file, JSON.stringify(rec, null, 4) + "\n");
            console.log(`${folder}: recorded checksums`);
        } else {
            problems.push(`${folder}: checksums not recorded yet (run with --write once you trust the file)`);
            continue;
        }
    }
    const bad = ["size", "crc32", "md5", "sha1"].filter((k) => String(rec.file[k]).toLowerCase() !== String(actual[k]));
    if (bad.length) { problems.push(`${folder}: file does not match its record (${bad.join(", ")}); the file changed or is damaged`); continue; }
    const exists = (p) => !!(p && inSite(p) && fs.existsSync(inSite(p)));
    const media = (rec.media || []).filter((m) => exists(m.path) || (problems.push(`${folder}: media "${m.path}" not found (left out)`), false));
    const attachments = (rec.attachments || []).filter((m) => exists(m.path) || (problems.push(`${folder}: attachment "${m.path}" not found (left out)`), false));
    records.push(Object.assign({}, rec, { folder, media, attachments, updated: rec.updated || rec.catalogued || null }));
}
for (const r of records) for (const rel of r.related || []) if (!ids.has(rel)) problems.push(`${r.folder}: related record ${rel} does not exist`);
records.sort((a, b) => a.id.localeCompare(b.id));
for (const p of problems) console.warn("warning: " + p);
const out = path.join(dir, "index.json");
const text = JSON.stringify({ format: "ejs-archive-1", records }, null, 1) + "\n";
if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== text) {
    fs.writeFileSync(out, text);
    console.log(`Wrote archive/index.json (${records.length} records).`);
} else {
    console.log("Archive index already up to date.");
}
if (strict && problems.length) process.exit(1);
