#!/usr/bin/env node
/**
 * Verifies that candidate web fonts contain real glyphs for every Central
 * Kurdish (Sorani) letter that is absent from plain Arabic, plus the Arabic
 * and Latin basics the storefront needs. Downloads the TTF that Google Fonts
 * serves to non-browser clients and reads its cmap table directly, so the
 * result reflects the exact build the site would load.
 *
 * Usage: node TOOLS/i18n/check-font-coverage.mjs [FamilyName ...]
 */
const FAMILIES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["Cairo", "Noto Sans Arabic", "Vazirmatn", "Noto Naskh Arabic", "Inter"];

const REQUIRED = {
  "Sorani-only letters": "ئپچڕژڤگڵۆێە",
  "Persian/Kurdish shared": "کی",
  "Arabic core": "ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
  "Arabic-Indic & marks": "ء،؟",
  "Latin": "AZaz09",
};

async function fetchTtfUrl(family) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400&display=swap`, {
    headers: { "User-Agent": "curl/8" },
  }).then((r) => r.text());
  const m = css.match(/url\((https:[^)]+\.ttf)\)/);
  if (!m) throw new Error(`No TTF url for ${family}: ${css.slice(0, 200)}`);
  return m[1];
}

function parseCmap(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numTables = dv.getUint16(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(buf[rec], buf[rec + 1], buf[rec + 2], buf[rec + 3]);
    if (tag === "cmap") cmapOffset = dv.getUint32(rec + 8);
  }
  if (cmapOffset < 0) throw new Error("no cmap");
  const n = dv.getUint16(cmapOffset + 2);
  const covered = new Set();
  for (let i = 0; i < n; i++) {
    const sub = cmapOffset + 4 + i * 8;
    const off = cmapOffset + dv.getUint32(sub + 4);
    const format = dv.getUint16(off);
    if (format === 4) {
      const segX2 = dv.getUint16(off + 6);
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = dv.getUint16(ends + s * 2), start = dv.getUint16(starts + s * 2);
        const delta = dv.getInt16(deltas + s * 2), rangeOff = dv.getUint16(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph;
          if (rangeOff === 0) glyph = (c + delta) & 0xffff;
          else {
            const addr = ranges + s * 2 + rangeOff + (c - start) * 2;
            glyph = dv.getUint16(addr);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) covered.add(c);
        }
      }
    } else if (format === 12) {
      const groups = dv.getUint32(off + 12);
      for (let g = 0; g < groups; g++) {
        const p = off + 16 + g * 12;
        const start = dv.getUint32(p), end = dv.getUint32(p + 4);
        for (let c = start; c <= end; c++) covered.add(c);
      }
    }
  }
  return covered;
}

let failed = false;
for (const family of FAMILIES) {
  try {
    const url = await fetchTtfUrl(family);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const cmap = parseCmap(buf);
    console.log(`\n${family}`);
    for (const [label, chars] of Object.entries(REQUIRED)) {
      const missing = [...chars].filter((ch) => !cmap.has(ch.codePointAt(0)));
      const ok = missing.length === 0;
      if (!ok && label !== "Latin") failed = true;
      console.log(`  ${ok ? "OK " : "MISSING"} ${label}${ok ? "" : ": " + missing.map((c) => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase()})`).join(" ")}`);
    }
  } catch (err) {
    console.log(`\n${family}: ERROR ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
