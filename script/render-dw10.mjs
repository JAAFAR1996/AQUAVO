import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'client/public');
const OUT_DIR = path.join(ROOT, 'client/public/images/products/driftwood');

function startServer(port = 9878) {
  const server = http.createServer((req, res) => {
    const filePath = path.join(PUBLIC_DIR, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

async function main() {
  const PORT = 9878;
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Users\\jaafa\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe',
    defaultViewport: { width: 800, height: 800 },
    args: ['--no-sandbox', '--window-size=800,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800 });
  await page.setContent(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;}body{background:#0d1b2a;width:800px;height:800px;overflow:hidden;}</style>
  <script type="module" src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script></head>
  <body><model-viewer id="mv" src="http://localhost:${PORT}/models/driftwood/dw-10/model.glb" style="width:800px;height:800px;background:#0d1b2a" environment-image="neutral" exposure="1.3" shadow-intensity="0.8" camera-orbit="30deg 65deg 2.5m"></model-viewer>
  <script>document.getElementById('mv').addEventListener('load',()=>{window.__ok=true});document.getElementById('mv').addEventListener('error',e=>{window.__err=String(e.detail||'err')});</script></body></html>`,
    { waitUntil: 'networkidle2', timeout: 20000 });
  try {
    await page.waitForFunction(() => window.__ok || window.__err, { timeout: 45000, polling: 500 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(OUT_DIR, 'dw-10.webp'), type: 'webp', quality: 92, clip: { x: 0, y: 0, width: 800, height: 800 } });
    console.log('✅ dw-10.webp saved');
  } catch(e) { console.error('❌', e.message); }
  await browser.close();
  server.close();
}
main().catch(console.error);
