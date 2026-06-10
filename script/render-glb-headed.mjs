/**
 * Renders driftwood GLB models using Puppeteer with headed Chrome
 * (non-headless) to get proper WebGL support.
 * 
 * The browser opens briefly, renders, screenshots, then closes.
 * Usage: node script/render-glb-headed.mjs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'client/public');
const OUT_DIR = path.join(ROOT, 'client/public/images/products/driftwood');

const codes = ['dw-04','dw-05','dw-06','dw-07','dw-08','dw-09','dw-10','dw-11'];

function startServer(port = 9877) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.glb': 'model/gltf-binary',
    '.webp': 'image/webp',
    '.png': 'image/png',
  };
  const server = http.createServer((req, res) => {
    const filePath = path.join(PUBLIC_DIR, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

function buildHtml(code, port) {
  const modelUrl = `http://localhost:${port}/models/driftwood/${code}/model.glb`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #0d1b2a; width: 800px; height: 800px; overflow: hidden; display:flex; align-items:center; justify-content:center; }
    model-viewer { width: 800px; height: 800px; background-color: #0d1b2a; --progress-bar-color: transparent; }
  </style>
  <script type="module" src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script>
</head>
<body>
  <model-viewer
    id="mv"
    src="${modelUrl}"
    environment-image="neutral"
    exposure="1.3"
    shadow-intensity="0.8"
    shadow-softness="1"
    camera-orbit="30deg 65deg 2.5m"
    auto-rotate
    rotation-per-second="0deg"
  ></model-viewer>
  <script>
    document.getElementById('mv').addEventListener('load', () => { window.__modelLoaded = true; });
    document.getElementById('mv').addEventListener('error', e => {
      console.error('model-viewer error:', e);
      window.__modelError = JSON.stringify(e.detail || e.message || 'unknown');
    });
  </script>
</body>
</html>`;
}

async function main() {
  console.log('🎨 Starting GLB poster renderer (headed mode)...\n');

  const PORT = 9877;
  const server = await startServer(PORT);
  console.log(`📡 Server: http://localhost:${PORT}\n`);

  // Launch headed (not headless) for WebGL support
  const browser = await puppeteer.launch({
    headless: false,  // headed for real WebGL
    executablePath: 'C:\\Users\\jaafa\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe',
    defaultViewport: { width: 800, height: 800 },
    args: [
      '--no-sandbox',
      '--window-size=800,800',
      '--disable-infobars',
    ],
  });

  for (const code of codes) {
    const glbPath = path.join(PUBLIC_DIR, 'models/driftwood', code, 'model.glb');
    if (!fs.existsSync(glbPath)) {
      console.log(`  ⏭️  MISSING: ${code}`);
      continue;
    }

    console.log(`  🔄 ${code}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 800 });

    try {
      await page.setContent(buildHtml(code, PORT), { waitUntil: 'networkidle2', timeout: 20000 });

      // Wait for model-viewer load event
      await page.waitForFunction(
        () => window.__modelLoaded === true || window.__modelError != null,
        { timeout: 30000, polling: 500 }
      );

      const err = await page.evaluate(() => window.__modelError);
      if (err) {
        console.error(`  ❌ Error: ${err}`);
        await page.close();
        continue;
      }

      // Extra settle time for GPU rendering
      await new Promise(r => setTimeout(r, 3500));

      const outPath = path.join(OUT_DIR, `${code}.webp`);
      await page.screenshot({
        path: outPath,
        type: 'webp',
        quality: 92,
        clip: { x: 0, y: 0, width: 800, height: 800 }
      });
      console.log(`  ✅ Saved → ${path.basename(outPath)}`);
    } catch (e) {
      console.error(`  ❌ Failed: ${e.message}`);
    }

    await page.close();
    // Brief pause between renders
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();
  server.close();
  console.log('\n✅ All renders complete!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
