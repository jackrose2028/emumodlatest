// Checksums for the Preservation archive, computed in the browser: CRC32, MD5 and SHA-1 (the three that game
// preservation catalogues such as No-Intro and Redump publish). SHA-1 uses the browser's own crypto; CRC32 and
// MD5 are written out here because Web Crypto does not offer them. Files are read in 4 MB pieces.

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

export function crc32Start() { return 0xFFFFFFFF; }
export function crc32Update(crc, bytes) {
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return crc;
}
export const crc32End = (crc) => ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");

// ---------- MD5 (RFC 1321), streaming ----------
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = new Int32Array(64);
for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;

export class MD5 {
    constructor() {
        this.h = new Int32Array([0x67452301, 0xEFCDAB89 | 0, 0x98BADCFE | 0, 0x10325476]);
        this.buf = new Uint8Array(64);
        this.used = 0;
        this.length = 0;
        this.w = new Int32Array(16);
    }
    block(b, o) {
        const w = this.w;
        for (let i = 0; i < 16; i++) w[i] = b[o + i * 4] | (b[o + i * 4 + 1] << 8) | (b[o + i * 4 + 2] << 16) | (b[o + i * 4 + 3] << 24);
        let [a, bb, c, d] = this.h;
        for (let i = 0; i < 64; i++) {
            let f, g;
            if (i < 16) { f = (bb & c) | (~bb & d); g = i; }
            else if (i < 32) { f = (d & bb) | (~d & c); g = (5 * i + 1) & 15; }
            else if (i < 48) { f = bb ^ c ^ d; g = (3 * i + 5) & 15; }
            else { f = c ^ (bb | ~d); g = (7 * i) & 15; }
            const t = d;
            d = c;
            c = bb;
            const x = (a + f + K[i] + w[g]) | 0;
            bb = (bb + ((x << S[i]) | (x >>> (32 - S[i])))) | 0;
            a = t;
        }
        this.h[0] = (this.h[0] + a) | 0;
        this.h[1] = (this.h[1] + bb) | 0;
        this.h[2] = (this.h[2] + c) | 0;
        this.h[3] = (this.h[3] + d) | 0;
    }
    update(bytes) {
        this.length += bytes.length;
        let i = 0;
        if (this.used) {
            const take = Math.min(64 - this.used, bytes.length);
            this.buf.set(bytes.subarray(0, take), this.used);
            this.used += take;
            i = take;
            if (this.used === 64) { this.block(this.buf, 0); this.used = 0; }
        }
        for (; i + 64 <= bytes.length; i += 64) this.block(bytes, i);
        if (i < bytes.length) { this.buf.set(bytes.subarray(i), 0); this.used = bytes.length - i; }
        return this;
    }
    hex() {
        const bits = this.length * 8;
        const pad = new Uint8Array(((this.used < 56 ? 56 : 120) - this.used) + 8);
        pad[0] = 0x80;
        const lo = bits >>> 0, hi = Math.floor(bits / 4294967296) >>> 0;
        const n = pad.length;
        for (let k = 0; k < 4; k++) { pad[n - 8 + k] = (lo >>> (8 * k)) & 255; pad[n - 4 + k] = (hi >>> (8 * k)) & 255; }
        this.update(pad);
        let out = "";
        for (const v of this.h) for (let k = 0; k < 4; k++) out += ((v >>> (8 * k)) & 255).toString(16).padStart(2, "0");
        return out;
    }
}

/** { size, crc32, md5, sha1 } of a Blob or File; onProgress(fraction) while large files are read. */
export async function checksums(blob, onProgress) {
    const piece = 4 * 1024 * 1024;
    let crc = crc32Start();
    const md5 = new MD5();
    const parts = [];
    for (let at = 0; at < blob.size; at += piece) {
        const bytes = new Uint8Array(await blob.slice(at, at + piece).arrayBuffer());
        crc = crc32Update(crc, bytes);
        md5.update(bytes);
        parts.push(bytes);
        if (onProgress) onProgress(Math.min(1, (at + piece) / blob.size));
    }
    let sha1 = null;
    if (window.crypto && crypto.subtle) {
        const all = new Uint8Array(blob.size);
        let o = 0;
        for (const p of parts) { all.set(p, o); o += p.length; }
        const digest = await crypto.subtle.digest("SHA-1", all);
        sha1 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return { size: blob.size, crc32: crc32End(crc), md5: md5.hex(), sha1 };
}
