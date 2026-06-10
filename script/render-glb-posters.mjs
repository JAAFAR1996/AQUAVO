/**
 * Renders each driftwood GLB into a product poster using
 * Puppeteer + model-viewer via a local static server.
 *
 * Usage: node script/render-glb-posters.mjs
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

// ─── Simple static file server ────────────────────────────────────────────────
function startServer(port = 9876) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.glb':  'model/gltf-binary',
    '.webp': 'image/webp',
    '.png':  'image/png',
  };

  const server = http.createServer((req, res) => {
    const filePath = path.join(PUBLIC_DIR, req.url.split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

// ─── Build HTML page for a given code ────────────────────────────────────────
function buildHtml(code, port) {
  const modelUrl = `http://localhost:${port}/models/driftwood/${code}/model.glb`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d1b2a; width: 800px; height: 800px; overflow: hidden; }
    model-viewer {
      width: 800px; height: 800px;
      background-color: #0d1b2a;
      --progress-bar-color: transparent;
    }
  </style>
  <script type="module" src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script>
</head>
<body>
  <model-viewer
    id="mv"
    src="${modelUrl}"
    camera-controls
    environment-image="neutral"
    exposure="1.2"
    shadow-intensity="0.5"
    shadow-softness="1"
    camera-orbit="25deg 70deg 2.5m"
  ></model-viewer>
  <script>
    document.getElementById('mv').addEventListener('load', () => { window.__modelLoaded = true; });
    document.getElementById('mv').addEventListener('error', e => { window.__modelError = String(e.detail || e); });
  </script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎨 Starting GLB poster renderer...\n');

  const PORT = 9876;
  const server = await startServer(PORT);
  console.log(`📡 Static server running on http://localhost:${PORT}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Users\\jaafa\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--enable-accelerated-2d-canvas',
    ],
  });

  for (const code of codes) {
    const glbPath = path.join(PUBLIC_DIR, 'models/driftwood', code, 'model.glb');
    if (!fs.existsSync(glbPath)) {
      console.log(`  ⏭️  MISSING GLB for ${code}`);
      continue;
    }

    console.log(`  🔄 Rendering ${code}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 800 });

    try {
      await page.setContent(buildHtml(code, PORT), { waitUntil: 'networkidle2', timeout: 15000 });

      // Wait for model to load (max 25s)
      await page.waitForFunction(
        () => window.__modelLoaded === true || window.__modelError != null,
        { timeout: 25000, polling: 500 }
      );

      const err = await page.evaluate(() => window.__modelError);
      if (err) {
        console.error(`  ❌ Model error for ${code}: ${err}`);
        await page.close();
        continue;
      }

      // Wait for render to settle
      await new Promise(r => setTimeout(r, 3000));

      const outPath = path.join(OUT_DIR, `${code}.webp`);
      await page.screenshot({ path: outPath, type: 'webp', quality: 92, clip: { x: 0, y: 0, width: 800, height: 800 } });
      console.log(`  ✅ Saved → ${outPath}`);
    } catch (e) {
      console.error(`  ❌ Failed ${code}: ${e.message}`);
    }

    await page.close();
  }

  await browser.close();
  server.close();
  console.log('\n✅ All done!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
