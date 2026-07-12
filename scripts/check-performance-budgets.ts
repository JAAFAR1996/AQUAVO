import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

type Budget = { pattern: RegExp; maxGzipKb: number; label: string };

const publicDir = resolve(process.cwd(), "dist/public");
const files = [
  ...readdirSync(resolve(publicDir, "entries")).map((name) => `entries/${name}`),
  ...readdirSync(resolve(publicDir, "assets")).map((name) => `assets/${name}`),
  ...readdirSync(resolve(publicDir, "chunks")).map((name) => `chunks/${name}`),
];
const budgets: Budget[] = [
  { pattern: /^entries\/index-.*\.js$/, maxGzipKb: 60, label: "public entry JavaScript" },
  { pattern: /^assets\/index-.*\.css$/, maxGzipKb: 50, label: "public CSS" },
  { pattern: /^chunks\/product-details-.*\.js$/, maxGzipKb: 25, label: "product route JavaScript" },
  { pattern: /^chunks\/model-viewer-.*\.js$/, maxGzipKb: 300, label: "deferred 3D viewer" },
];

for (const budget of budgets) {
  const file = files.find((candidate) => budget.pattern.test(candidate));
  if (!file) throw new Error(`Missing build artifact for ${budget.label}`);
  const absolute = resolve(publicDir, file);
  if (!statSync(absolute).isFile()) throw new Error(`Invalid artifact for ${budget.label}`);
  const gzipKb = gzipSync(readFileSync(absolute)).byteLength / 1024;
  if (gzipKb > budget.maxGzipKb) {
    throw new Error(`${budget.label} is ${gzipKb.toFixed(2)} kB gzip; budget is ${budget.maxGzipKb} kB`);
  }
  console.log(`${budget.label}: ${gzipKb.toFixed(2)} kB gzip / ${budget.maxGzipKb} kB`);
}

const html = readFileSync(resolve(process.cwd(), "dist/ssr-template/index.html"), "utf8");
if (/model-viewer-[^"']+\.js/.test(html)) {
  throw new Error("Deferred 3D viewer leaked into initial HTML");
}
console.log("Initial HTML does not preload the 3D viewer chunk.");
