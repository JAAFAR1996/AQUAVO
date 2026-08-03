import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const preview = (process.env.PREVIEW_URL || "").replace(/\/$/, "");
const production = (process.env.PRODUCTION_URL || "https://www.aquavoiq.com").replace(/\/$/, "");
if (!preview) throw new Error("PREVIEW_URL is required");

const outputDir = path.resolve("artifacts/visual-parity");
await fs.mkdir(outputDir, { recursive: true });

const routes = ["/", "/products", "/faq"];
const hardFailureRatio = Number(process.env.VISUAL_DIFF_HARD_LIMIT || "0.08");
const warningRatio = Number(process.env.VISUAL_DIFF_WARNING_LIMIT || "0.03");
const reports = [];
const failures = [];

const browser = await chromium.launch();

async function capture(origin, route, label) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: "ar-IQ",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("aq_init", "1");
      localStorage.setItem("aquavo_tours_dismissed", "1");
    } catch {
      // Storage may be unavailable before an origin is established.
    }
  });
  const page = await context.newPage();
  await page.goto(`${origin}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
    }
    [data-testid="first-dive-intro"], .first-dive-intro,
    [role="dialog"][data-onboarding], [data-sonner-toaster] {
      display: none !important;
    }
  ` });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  const name = route === "/" ? "home" : route.slice(1).replace(/[^a-zA-Z0-9_-]+/g, "-");
  const file = path.join(outputDir, `${name}-${label}.png`);
  const buffer = await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  await context.close();
  return { buffer, file, url: `${origin}${route}` };
}

async function compareImages(left, right, route) {
  const leftImage = sharp(left).ensureAlpha();
  const rightImage = sharp(right).ensureAlpha();
  const leftMeta = await leftImage.metadata();
  const rightMeta = await rightImage.metadata();
  const width = Math.min(leftMeta.width || 0, rightMeta.width || 0);
  const height = Math.min(leftMeta.height || 0, rightMeta.height || 0);
  if (!width || !height) throw new Error(`Unable to read screenshots for ${route}`);

  const a = await leftImage.resize(width, height, { fit: "fill" }).raw().toBuffer();
  const b = await rightImage.resize(width, height, { fit: "fill" }).raw().toBuffer();
  const diff = Buffer.alloc(a.length);
  let changedPixels = 0;
  const channelThreshold = 35;

  for (let i = 0; i < a.length; i += 4) {
    const dr = Math.abs(a[i] - b[i]);
    const dg = Math.abs(a[i + 1] - b[i + 1]);
    const db = Math.abs(a[i + 2] - b[i + 2]);
    const changed = Math.max(dr, dg, db) > channelThreshold;
    if (changed) changedPixels += 1;
    diff[i] = dr;
    diff[i + 1] = dg;
    diff[i + 2] = db;
    diff[i + 3] = 255;
  }

  const totalPixels = width * height;
  const ratio = changedPixels / totalPixels;
  const name = route === "/" ? "home" : route.slice(1).replace(/[^a-zA-Z0-9_-]+/g, "-");
  const diffFile = path.join(outputDir, `${name}-diff.png`);
  await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(diffFile);
  return { width, height, changedPixels, totalPixels, ratio, diffFile };
}

try {
  for (const route of routes) {
    const productionCapture = await capture(production, route, "production");
    const previewCapture = await capture(preview, route, "preview");
    const comparison = await compareImages(productionCapture.buffer, previewCapture.buffer, route);
    const level = comparison.ratio > hardFailureRatio
      ? "error"
      : comparison.ratio > warningRatio
        ? "warning"
        : "pass";
    reports.push({
      route,
      level,
      productionUrl: productionCapture.url,
      previewUrl: previewCapture.url,
      diffRatio: comparison.ratio,
      ...comparison,
    });
    if (level === "error") {
      failures.push(`${route} visual difference ${(comparison.ratio * 100).toFixed(2)}% exceeds ${(hardFailureRatio * 100).toFixed(2)}%`);
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(
  path.join(outputDir, "report.json"),
  JSON.stringify({ preview, production, warningRatio, hardFailureRatio, reports, failures }, null, 2),
);

for (const report of reports) {
  console.log(`${report.level.toUpperCase()} ${report.route}: ${(report.diffRatio * 100).toFixed(2)}% changed pixels`);
}
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
