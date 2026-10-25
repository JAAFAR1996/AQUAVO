import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
if (process.env.CONTEXT !== 'deploy-preview') throw new Error('Disposable harness only runs in deploy-preview context');
// Pass no deployment credentials or production API configuration to the client build.
const env = Object.fromEntries(['PATH','HOME','TMPDIR'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
env.NODE_ENV = 'production';
// Build-only provider substitution. The tracked production source is restored even on failure.
const cartPath = 'client/src/contexts/cart-context.tsx';
const cartSource = readFileSync(cartPath, 'utf8');
const providerStart = cartSource.indexOf('    <CartContext.Provider\n      value={{');
const providerEnd = cartSource.indexOf('      }}', providerStart);
if (providerStart < 0 || providerEnd < 0) throw new Error('Cart provider contract changed; refusing unsafe preview');
const replacement = `    <CartContext.Provider
      value={{
        items: [], isReady: true,
        addItem: async () => false, addItems: async () => 0,
        removeItem: () => {}, updateQuantity: () => {}, clearCart: () => {},
        refetchCart: async () => [], totalItems: 0, totalPrice: 0,
`;
let status;
try {
  writeFileSync(cartPath, cartSource.slice(0, providerStart) + replacement + cartSource.slice(providerEnd));
  status = spawnSync(process.execPath, ['--max-old-space-size=4096', 'node_modules/vite/bin/vite.js', 'build'], { env, stdio: 'inherit' }).status;
} finally { writeFileSync(cartPath, cartSource); }
if (status !== 0) process.exit(status || 1);
const out = 'dist/public';
mkdirSync(`${out}/preview-data`, { recursive: true });
copyFileSync('preview/catalogue.json', `${out}/preview-data/catalogue.json`);
copyFileSync('preview/guard.js', `${out}/preview-guard.js`);
let html = readFileSync(`${out}/index.html`, 'utf8');
html = html.replace('<head>', '<head><meta name="robots" content="noindex,nofollow"><script src="/preview-guard.js"></script>');
writeFileSync(`${out}/index.html`, html);
writeFileSync(`${out}/preview-data/unavailable.json`, JSON.stringify({error:'Read-only visual preview. This API is unavailable.'}));
writeFileSync(`${out}/_redirects`, '/api/* /preview-data/unavailable.json 404\n/* /index.html 200\n');
writeFileSync(`${out}/_headers`, `/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'
`);
console.log('READ-ONLY DEPLOY-PREVIEW: public snapshot, no backend, mutations blocked.');
